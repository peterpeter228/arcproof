import { describe, expect, it, vi } from 'vitest';
import { toHex, type Hex, type PublicClient } from 'viem';
import { observedPaymentFixture } from './fixtures/observedPayment';
import { verifyReceipt, type RawLog, type RawBlock, type RpcProvider } from '../receiptVerifier';
import { receiptRpc } from '../testnetClient';
import { buildReceiptExport, exportReceiptsCsv, exportReceiptsJson } from '../exportUtils';

type Fixture = ReturnType<typeof observedPaymentFixture>;
const verify = (f: Fixture) => verifyReceipt(f.txHash, f.invoiceId, f.deployment, 5042002, f.rpc);
const otherHash: Hex = `0x${'ab'.repeat(32)}`;
const otherAddress: Hex = `0x${'ab'.repeat(20)}`;
const addressTopic = (address: Hex): Hex => `0x${address.slice(2).padStart(64, '0')}`;

describe('Native settlement: reconstructed observed self-demo fixture, NOT live RPC acceptance', () => {
  it('verifies both exact 0.20 native18 legs and explicit same-height finalized header', async () => {
    const f = observedPaymentFixture(), result = await verify(f);
    expect(f.classification).toBe('reconstructed_fixture_not_raw_rpc');
    expect(result).toMatchObject({ status: 'VERIFIED', verified: true, paymentLogIndex: 8,
      settlementEvidence: { payerToContractLogIndex: 6, contractToMerchantLogIndex: 7,
        finalizedBlockNumber: '68212829', controlled_demo: true, decimals: 18 } });
  });
  it('matches content and source logIndex, never array offsets or fixed 6/7/8 positions', async () => {
    const f = observedPaymentFixture();
    f.receipt.logs[0].logIndex = 12; f.receipt.logs[1].logIndex = 29; f.receipt.logs[2].logIndex = 31;
    f.receipt.logs.reverse();
    const r = await verify(f);
    expect(r.verified).toBe(true);
    expect(r.settlementEvidence).toMatchObject({ payerToContractLogIndex: 12, contractToMerchantLogIndex: 29 });
  });
  it('supports a distinct merchant in a synthetic fixture without marking it a self-demo', async () => {
    const f = observedPaymentFixture(); f.invoice.merchant = otherAddress;
    f.receipt.logs[1].topics[2] = addressTopic(otherAddress); f.receipt.logs[2].topics[3] = addressTopic(otherAddress);
    expect((await verify(f)).settlementEvidence?.controlled_demo).toBe(false);
  });
  it('does not count an additional ERC-20 six-decimal stream or gas as another payment', async () => {
    const f = observedPaymentFixture(); f.receipt.logs.push({ ...f.receipt.logs[0], logIndex: 20,
      address: '0x3600000000000000000000000000000000000000', data: toHex(200000n, { size: 32 }) });
    expect((await verify(f)).verified).toBe(true);
  });
  it.each([
    ['missing incoming', (f: Fixture) => { f.receipt.logs.splice(0, 1); }],
    ['missing outgoing', (f: Fixture) => { f.receipt.logs.splice(1, 1); }],
    ['duplicate incoming with unique identity', (f: Fixture) => { f.receipt.logs.push({ ...f.receipt.logs[0], logIndex: 5 }); }],
    ['duplicate outgoing with unique identity', (f: Fixture) => { f.receipt.logs.push({ ...f.receipt.logs[1], logIndex: 5 }); }],
    ['wrong native emitter', (f: Fixture) => { f.receipt.logs[0].address = otherAddress; }],
    ['ERC-20 emitter substituted', (f: Fixture) => { f.receipt.logs[1].address = '0x3600000000000000000000000000000000000000'; }],
    ['wrong incoming payer', (f: Fixture) => { f.receipt.logs[0].topics[1] = addressTopic(otherAddress); }],
    ['wrong incoming destination', (f: Fixture) => { f.receipt.logs[0].topics[2] = addressTopic(otherAddress); }],
    ['wrong outgoing source', (f: Fixture) => { f.receipt.logs[1].topics[1] = addressTopic(otherAddress); }],
    ['wrong merchant', (f: Fixture) => { f.receipt.logs[1].topics[2] = addressTopic(otherAddress); }],
    ['six-decimal amount at native emitter', (f: Fixture) => { f.receipt.logs[0].data = toHex(200000n, { size: 32 }); }],
    ['incorrect outgoing amount', (f: Fixture) => { f.receipt.logs[1].data = toHex(f.amount + 1n, { size: 32 }); }],
    ['zero native amount', (f: Fixture) => { f.receipt.logs[1].data = toHex(0n, { size: 32 }); }],
    ['reversed direction', (f: Fixture) => { f.receipt.logs[0].topics.reverse(); }],
    ['wrong signature', (f: Fixture) => { f.receipt.logs[0].topics[0] = otherHash; }],
    ['missing topic', (f: Fixture) => { f.receipt.logs[0].topics.pop(); }],
    ['extra topic', (f: Fixture) => { f.receipt.logs[0].topics.push(otherHash); }],
    ['noncanonical address padding', (f: Fixture) => { f.receipt.logs[0].topics[1] = `0x01${f.receipt.logs[0].topics[1].slice(4)}`; }],
    ['short address topic', (f: Fixture) => { f.receipt.logs[0].topics[1] = f.payer; }],
    ['short uint256 data', (f: Fixture) => { f.receipt.logs[0].data = '0x01'; }],
    ['extra data word', (f: Fixture) => { f.receipt.logs[0].data += '0'.repeat(64); }],
    ['malformed hex data', (f: Fixture) => { f.receipt.logs[0].data = `0x${'z'.repeat(64)}`; }],
    ['incoming after outgoing', (f: Fixture) => { f.receipt.logs[0].logIndex = 9; }],
    ['outgoing after InvoicePaid', (f: Fixture) => { f.receipt.logs[1].logIndex = 9; }],
    ['split amounts must not be summed', (f: Fixture) => { f.receipt.logs[0].data = toHex(f.amount / 2n, { size: 32 }); f.receipt.logs.push({ ...f.receipt.logs[0], logIndex: 5 }); }],
  ])('rejects %s', async (_label, mutate) => {
    const f = observedPaymentFixture(); mutate(f); const r = await verify(f);
    expect(r.status).toBe('INVALID_NATIVE_TRANSFER'); expect(r.verified).toBe(false);
  });
  it.each([0, 1, 2])('rejects missing, removed or foreign provenance for log %s', async index => {
    const mutations: ((log: RawLog) => void)[] = [
      l => { delete l.removed; }, l => { l.removed = true; }, l => { delete l.blockHash; },
      l => { l.blockHash = otherHash; }, l => { delete l.blockNumber; }, l => { l.blockNumber = 1n; },
      l => { l.transactionHash = otherHash; }, l => { delete l.transactionIndex; }, l => { l.transactionIndex = 2; },
      l => { l.logIndex = -1; }, l => { l.logIndex = 1.5; }, l => { l.logIndex = Number.MAX_SAFE_INTEGER + 1; },
    ];
    for (const mutate of mutations) { const f = observedPaymentFixture(); mutate(f.receipt.logs[index]); expect((await verify(f)).verified).toBe(false); }
  });
  it('rejects duplicate log indices even across different emitters', async () => {
    const f = observedPaymentFixture(); f.receipt.logs[0].logIndex = f.receipt.logs[2].logIndex;
    expect((await verify(f)).status).toBe('INVALID_LOG_PROVENANCE');
  });
  it('rejects a duplicate InvoicePaid', async () => {
    const f = observedPaymentFixture(); f.receipt.logs.push({ ...f.receipt.logs[2], logIndex: 9 });
    expect((await verify(f)).status).toBe('NO_MATCHING_EVENT');
  });
  it('rejects appended calldata rather than only comparing selector prefix', async () => {
    const f = observedPaymentFixture(); f.tx.input += '00'; expect((await verify(f)).status).toBe('WRONG_SELECTOR');
  });
  it('keeps absent and altered settlement policies unverified', async () => {
    const f = observedPaymentFixture(); delete (f.deployment as { settlementPolicy?: unknown }).settlementPolicy;
    expect((await verify(f)).status).toBe('UNVERIFIED_ARC_EVIDENCE');
    const altered = observedPaymentFixture();
    (altered.deployment.settlementPolicy as unknown as { decimals: number }).decimals = 6;
    expect((await verify(altered)).status).toBe('UNVERIFIED_ARC_EVIDENCE');
  });
});

describe('Explicit Arc finalized-header policy with no latest fallback', () => {
  it.each(['missing method', 'null', 'throw', 'older', 'same-height wrong hash', 'same-height wrong timestamp', 'malformed hash', 'negative number'])('fails closed: %s', async scenario => {
    const f = observedPaymentFixture(); let final: RawBlock | null = { ...f.block };
    if (scenario === 'missing method') delete f.rpc.getFinalizedBlock;
    else {
      if (scenario === 'null') final = null;
      if (scenario === 'older') final!.number--;
      if (scenario === 'same-height wrong hash') final!.hash = otherHash;
      if (scenario === 'same-height wrong timestamp') final!.timestamp++;
      if (scenario === 'malformed hash') final!.hash = '0xabc';
      if (scenario === 'negative number') final!.number = -1n;
      f.rpc.getFinalizedBlock = () => scenario === 'throw' ? Promise.reject(Error('unsupported finalized tag')) : Promise.resolve(final);
    }
    const r = await verify(f); expect(r.status).toBe('UNVERIFIED_FINALITY'); expect(r.verified).toBe(false);
  });
  it('accepts a later finalized head only when its numbered lookup also matches', async () => {
    const f = observedPaymentFixture(), head = { ...f.block, number: f.block.number + 10n, timestamp: f.block.timestamp + 5n, hash: otherHash };
    f.rpc.getFinalizedBlock = () => Promise.resolve(head);
    f.rpc.getBlock = number => Promise.resolve(number === head.number ? head : f.block);
    expect((await verify(f)).verified).toBe(true);
  });
  it.each(['absent', 'wrong hash', 'wrong number', 'wrong timestamp'])('rejects %s numbered finalized header', async scenario => {
    const f = observedPaymentFixture(), head = { ...f.block, number: f.block.number + 1n, timestamp: f.block.timestamp + 1n, hash: otherHash };
    const numbered = { ...head };
    if (scenario === 'wrong hash') numbered.hash = f.block.hash;
    if (scenario === 'wrong number') numbered.number++;
    if (scenario === 'wrong timestamp') numbered.timestamp++;
    f.rpc.getFinalizedBlock = () => Promise.resolve(head);
    f.rpc.getBlock = number => Promise.resolve(number === head.number ? scenario === 'absent' ? null : numbered : f.block);
    expect((await verify(f)).status).toBe('UNVERIFIED_FINALITY');
  });
  it('rechecks payment block after finality and rejects changed or missing evidence', async () => {
    for (const block of [null, { ...observedPaymentFixture().block, hash: otherHash }]) {
      const f = observedPaymentFixture(); let reads = 0;
      f.rpc.getBlock = () => Promise.resolve(++reads === 1 ? f.block : block);
      expect((await verify(f)).status).toBe('UNVERIFIED_FINALITY');
    }
  });
});

describe('Adapter and export preserve provenance and self-demo boundaries', () => {
  it('retains every original provenance field and explicitly requests finalized', async () => {
    const f = observedPaymentFixture();
    const getBlock = vi.fn(() => Promise.resolve(f.block));
    const client = { getTransactionReceipt: () => Promise.resolve(f.receipt), getBlock } as unknown as PublicClient;
    const rpc = receiptRpc(client);
    expect((await rpc.getTransactionReceipt(f.txHash))?.logs).toEqual(f.receipt.logs);
    await rpc.getFinalizedBlock!(); expect(getBlock).toHaveBeenCalledWith({ blockTag: 'finalized' });
  });
  it('does not fall back when finalized is unsupported', async () => {
    const getBlock = vi.fn(() => Promise.reject(Error('unsupported')));
    const rpc = receiptRpc({ getBlock } as unknown as PublicClient);
    await expect(rpc.getFinalizedBlock!()).rejects.toThrow('unsupported'); expect(getBlock).toHaveBeenCalledTimes(1);
  });
  it('never repairs absent original provenance from enclosing receipt fields', async () => {
    const f = observedPaymentFixture(); delete f.receipt.logs[0].removed;
    const adapted = receiptRpc({ getTransactionReceipt: () => Promise.resolve(f.receipt) } as unknown as PublicClient);
    const rpc: RpcProvider = { ...f.rpc, getTransactionReceipt: hash => adapted.getTransactionReceipt(hash) };
    expect((await verifyReceipt(f.txHash, f.invoiceId, f.deployment, 5042002, rpc)).verified).toBe(false);
  });
  it('exports exact native gas, schema and verification time without treating fee as payment', async () => {
    const f = observedPaymentFixture(); f.receipt.gasUsed = 84487n; f.receipt.effectiveGasPrice = 25000000000n;
    const r = await verify(f);
    const record = buildReceiptExport(f.deployment, f.invoiceId, f.txHash, f.amount, f.payer, f.payer, f.block.timestamp, f.block.number, r, false);
    expect(record).toMatchObject({ schemaVersion: '1.2', blockNumber: '68212829', gasFeeNative: '2112175000000000',
      amountNative: '200000000000000000', verifiedAt: r.verifiedAt, contractAddress: f.contract, txHash: f.txHash });
    const parsed = JSON.parse(exportReceiptsJson([record])) as { gasFeeNative: string }[];
    expect(parsed[0].gasFeeNative).toBe('2112175000000000');
  });
  it('leaves unavailable gas fee null rather than fabricating zero', async () => {
    const f = observedPaymentFixture(); const r = await verify(f); expect(r.verified).toBe(true); expect(r.gasFeeNative).toBeNull();
  });
  it('exports RPC evidence and controlled_demo without trusting imported verification flags', async () => {
    const f = observedPaymentFixture(), r = await verify(f);
    const record = buildReceiptExport(f.deployment, f.invoiceId, f.txHash, f.amount, f.payer, f.payer, f.block.timestamp, f.block.number, r, false);
    const json = JSON.parse(exportReceiptsJson([record])) as { importedVerified: boolean; controlled_demo: boolean; settlementEvidence: object }[];
    expect(json[0]).toMatchObject({ importedVerified: false, controlled_demo: true, settlementEvidence: { finalizedBlockNumber: '68212829' } });
    expect(exportReceiptsCsv([record])).toContain('finalizedBlockHash');
  });
});
