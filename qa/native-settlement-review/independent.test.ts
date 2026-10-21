/** Independent synthetic adversarial cases. No recorded live receipt or network calls. */
import { describe, expect, it, vi } from 'vitest';
import { encodeEventTopics, encodeFunctionData, keccak256, toHex, type Hex, type PublicClient } from 'viem';
import { ARCPROOF_ABI } from '../../src/arcproof/arcproofAbi';
import { ARC_TESTNET_SETTLEMENT_POLICY, NATIVE_TRANSFER_ABI } from '../../src/arcproof/arcSettlement';
import { verifyReceipt, type RawLog, type RawBlock, type RpcProvider, type VerificationResult } from '../../src/arcproof/receiptVerifier';
import { receiptRpc } from '../../src/arcproof/testnetClient';
import { buildReceiptExport, exportReceiptsJson, exportReceiptsCsv } from '../../src/arcproof/exportUtils';

const address = (v: string): Hex => `0x${v.repeat(40)}`;
const hash = (v: string): Hex => `0x${v.repeat(64)}`;
// Deliberate malformed-source injection without claiming the input satisfies production types.
const mutable = (value: object): Record<string, unknown> => value as unknown as Record<string, unknown>;
const topicAddress = (v: Hex): Hex => `0x${'0'.repeat(24)}${v.slice(2)}`;
function fixture() {
  const payer = address('1'), contract = address('2'), merchant = address('3');
  const txHash = hash('4'), invoiceId = hash('5'), blockHash = hash('6'), code: Hex = '0x6000';
  const amount = 200000000000000000n;
  const deployment = { chainId: 5042002, deploymentId: 'independent-review-fixture', contractAddress: contract,
    runtimeCodeHash: keccak256(code), deployedAt: null, label: 'synthetic reviewer fixture', settlementPolicy: { ...ARC_TESTNET_SETTLEMENT_POLICY } };
  const block: RawBlock = { number: 101n, hash: blockHash, timestamp: 2000n };
  const provenance = { blockNumber: block.number, blockHash, transactionHash: txHash, transactionIndex: 2, removed: false };
  const transfer = (from: Hex, to: Hex, logIndex: number, value = amount): RawLog => ({ ...provenance,
    address: ARC_TESTNET_SETTLEMENT_POLICY.emitter, topics: encodeEventTopics({ abi: NATIVE_TRANSFER_ABI, eventName: 'Transfer', args: { from, to } }) as Hex[],
    data: toHex(value, { size: 32 }), logIndex });
  const receipt = { ...provenance, status: 'success' as const, from: payer, to: contract, logs: [transfer(payer, contract, 17), transfer(contract, merchant, 18), {
    ...provenance, address: contract, logIndex: 19, topics: encodeEventTopics({ abi: ARCPROOF_ABI, eventName: 'InvoicePaid', args: { invoiceId, payer, merchant } }) as Hex[], data: toHex(amount, { size: 32 }),
  }] };
  const tx = { hash: txHash, from: payer, to: contract, input: encodeFunctionData({ abi: ARCPROOF_ABI, functionName: 'payInvoice', args: [invoiceId] }),
    value: amount, chainId: 5042002, blockNumber: block.number, blockHash, transactionIndex: 2 };
  const invoice = { payer, merchant, amountNative: amount, expiresAt: 3000n, termsHash: hash('0'), paid: true, paidAt: block.timestamp, paidBlockNumber: block.number };
  const rpc: RpcProvider = { getChainId: async () => 5042002, getContractCode: async () => code,
    getTransactionReceipt: async () => receipt, getTransaction: async () => tx, getInvoice: async () => invoice,
    getBlock: async () => block, getFinalizedBlock: async () => block };
  return { payer, merchant, contract, txHash, invoiceId, code, amount, deployment, block, receipt, tx, invoice, rpc, transfer };
}
type F = ReturnType<typeof fixture>;
const check = (f: F) => verifyReceipt(f.txHash, f.invoiceId, f.deployment, 5042002, f.rpc);
const reject = async (f: F) => expect((await check(f)).verified).toBe(false);

it('independent complete synthetic control reaches VERIFIED with exact leg metadata', async () => {
 const r = await check(fixture()); expect(r).toMatchObject({ verified: true, status: 'VERIFIED', paymentLogIndex: 19,
 settlementEvidence: { payerToContractLogIndex: 17, contractToMerchantLogIndex: 18, finalizedBlockNumber: '101', controlled_demo: false } });
});

const mutationCases: [string, (f: F) => void][] = [
 ['missing incoming', f => { f.receipt.logs.splice(0, 1); }], ['missing outgoing', f => { f.receipt.logs.splice(1, 1); }],
 ['same-emitter unrelated transfer cannot replace incoming', f => { f.receipt.logs[0] = f.transfer(address('7'), address('8'), 17); }],
 ['wrong payer leg source', f => { f.receipt.logs[0].topics[1] = topicAddress(address('7')); }],
 ['merchant-to-contract wrong outgoing direction', f => { f.receipt.logs[1] = f.transfer(f.merchant, f.contract, 18); }],
 ['direct payer-to-merchant is not atomic path', f => { f.receipt.logs[0] = f.transfer(f.payer, f.merchant, 17); }],
 ['incoming fake emitter', f => { f.receipt.logs[0].address = address('7'); }],
 ['outgoing ERC20 emitter at native18 amount', f => { f.receipt.logs[1].address = '0x3600000000000000000000000000000000000000'; }],
 ['incoming microUSDC units', f => { f.receipt.logs[0].data = toHex(200000n, {size: 32}); }],
 ['outgoing amount one unit under', f => { f.receipt.logs[1].data = toHex(f.amount-1n, {size: 32}); }],
 ['outgoing amount one unit over', f => { f.receipt.logs[1].data = toHex(f.amount+1n, {size: 32}); }],
 ['duplicate exact incoming unique index', f => { f.receipt.logs.push(f.transfer(f.payer, f.contract, 16)); }],
 ['duplicate wrong-amount incoming unique index', f => { f.receipt.logs.push(f.transfer(f.payer, f.contract, 16, 1n)); }],
 ['duplicate wrong-amount outgoing unique index', f => { f.receipt.logs.push(f.transfer(f.contract, f.merchant, 16, 1n)); }],
 ['unexpected contract-to-other movement', f => { f.receipt.logs.push(f.transfer(f.contract, address('7'), 16)); }],
 ['split incoming totals not proof', f => { f.receipt.logs[0] = f.transfer(f.payer, f.contract, 17, f.amount/2n); f.receipt.logs.push(f.transfer(f.payer, f.contract, 16, f.amount/2n)); }],
 ['malformed uint missing word', f => { f.receipt.logs[0].data = '0x'; }],
 ['malformed uint short word', f => { f.receipt.logs[1].data = toHex(f.amount); }],
 ['malformed uint long word', f => { f.receipt.logs[1].data += '00'; }],
 ['noncanonical address high bits', f => { f.receipt.logs[0].topics[1] = `0x${'f'.repeat(24)}${f.payer.slice(2)}`; }],
 ['native missing source topic', f => { f.receipt.logs[0].topics.splice(1,1); }],
 ['native extra topic', f => { f.receipt.logs[1].topics.push(hash('8')); }],
 ['native wrong signature', f => { f.receipt.logs[1].topics[0] = hash('8'); }],
 ['duplicate InvoicePaid', f => { f.receipt.logs.push({...f.receipt.logs[2],logIndex:20}); }],
 ['wrong InvoicePaid issuer', f => { f.receipt.logs[2].address = address('8'); }],
 ['wrong InvoicePaid ID', f => { f.receipt.logs[2].topics[1] = hash('8'); }],
 ['incoming after outgoing index', f => { f.receipt.logs[0].logIndex = 20; }],
 ['outgoing after business event', f => { f.receipt.logs[1].logIndex = 20; }],
 ['wrong policy emitter', f => { f.deployment.settlementPolicy.emitter = address('8'); }],
 ['wrong policy decimal', f => { mutable(f.deployment.settlementPolicy).decimals = 6; }],
 ['unapproved policy ID', f => { mutable(f.deployment.settlementPolicy).id = 'unapproved'; }],
 ['unknown policy chain', f => { mutable(f.deployment.settlementPolicy).chainId = 5042; }],
 ['wrong native tx value', f => { f.tx.value--; }],
 ['calldata trailing bytes', f => { f.tx.input += '00'; }],
];
describe('independent native event adversaries', () => {
 for(const [name,mutate] of mutationCases) it(name, async () => {const f=fixture();mutate(f);await reject(f);});
 it('ignores valid unrelated movement but still validates its provenance', async () => {const f=fixture(); f.receipt.logs.push(f.transfer(address('7'),address('8'),20));expect((await check(f)).verified).toBe(true);});
 it('does not depend on array position', async () => {const f=fixture();f.receipt.logs.reverse();expect((await check(f)).verified).toBe(true);});
});

describe('independent provenance adversaries', () => {
 const cases:[string,(l:RawLog)=>void][] = [ ['removed omitted', l=>delete l.removed], ['removed true',l=>{l.removed=true;}],
 ['blockHash omitted',l=>delete l.blockHash],['wrong blockHash',l=>{l.blockHash=hash('8');}], ['blockNumber omitted',l=>delete l.blockNumber],['wrong blockNumber',l=>{l.blockNumber=100n;}],
 ['txIndex omitted',l=>delete l.transactionIndex],['wrong txIndex',l=>{l.transactionIndex=3;}], ['wrong txHash',l=>{l.transactionHash=hash('8');}], ['negative logIndex',l=>{l.logIndex=-1;}],
 ['fractional logIndex',l=>{l.logIndex=1.5;}], ['unsafe logIndex',l=>{l.logIndex=2**53;}], ['NaN logIndex',l=>{l.logIndex=NaN;}], ['infinite logIndex',l=>{l.logIndex=Infinity;}] ];
 for(let i=0;i<3;i++)for(const [name,mutate] of cases)it(`log ${i}: ${name}`,async()=>{const f=fixture();mutate(f.receipt.logs[i]);await reject(f);});
 it('duplicate identity across ignored emitter is rejected',async()=>{const f=fixture();f.receipt.logs.push({...f.transfer(address('7'),address('8'),17),address:address('9')});await reject(f);});
 it('ignored emitter missing provenance is rejected',async()=>{const f=fixture();f.receipt.logs.push({...f.transfer(address('7'),address('8'),20),address:address('9'),removed:undefined});await reject(f);});
});

describe('independent finalized-header adversaries',()=>{
 const cases:[string,(b:RawBlock)=>void][]=[['zero hash',b=>{b.hash=hash('0');}],['short hash',b=>{b.hash='0x00';}],['malformed hash',b=>{b.hash=`0x${'z'.repeat(64)}`;}],['zero timestamp',b=>{b.timestamp=0n;}],['negative number',b=>{b.number=-1n;}],['lower height',b=>{b.number=100n;}],['earlier timestamp',b=>{b.timestamp=1999n;}],['same-height conflicting hash',b=>{b.hash=hash('9');}],['same-height conflicting timestamp',b=>{b.timestamp=2001n;}],['larger height same hash',b=>{b.number=102n;}]];
 for(const[name,mutate]of cases)it(name,async()=>{const f=fixture(),head={...f.block};mutate(head);f.rpc.getFinalizedBlock=async()=>head;await reject(f);});
 it('missing method',async()=>{const f=fixture();delete f.rpc.getFinalizedBlock;await reject(f);});
 it('null response',async()=>{const f=fixture();f.rpc.getFinalizedBlock=async()=>null;await reject(f);});
 it('RPC error does not trigger latest fallback',async()=>{const f=fixture();f.rpc.getFinalizedBlock=vi.fn(async()=>{throw Error('unsupported');});await reject(f);expect(f.rpc.getFinalizedBlock).toHaveBeenCalledOnce();});
 it('later finalized height requires matching canonical numbered header',async()=>{const f=fixture();f.rpc.getFinalizedBlock=async()=>({...f.block,hash:hash('8'),number:102n,timestamp:2001n});await reject(f);});
 it('payment header disappearing after finality prevents verification',async()=>{const f=fixture();let n=0;f.rpc.getBlock=async()=>++n===1?f.block:null;await reject(f);});
 it('payment timestamp change after finality prevents verification',async()=>{const f=fixture();let n=0;f.rpc.getBlock=async()=>++n===1?f.block:{...f.block,timestamp:2001n};await reject(f);});
 it('later consistent finalized height succeeds with two payment lookups',async()=>{const f=fixture();const head={...f.block,hash:hash('8'),number:102n,timestamp:2001n};f.rpc.getFinalizedBlock=async()=>head;f.rpc.getBlock=vi.fn(async n=>n===102n?head:f.block);expect((await check(f)).verified).toBe(true);expect(f.rpc.getBlock).toHaveBeenCalledTimes(3);});
});

describe('adapter evidence boundaries',()=>{
 it('retains missing removed rather than fabricating false',async()=>{const f=fixture();delete f.receipt.logs[0].removed;const adapter=receiptRpc({getTransactionReceipt:async()=>f.receipt}as unknown as PublicClient);f.rpc.getTransactionReceipt=adapter.getTransactionReceipt;await reject(f);});
 it('retains missing transactionIndex rather than fabricating receipt value',async()=>{const f=fixture();delete f.receipt.logs[0].transactionIndex;const adapter=receiptRpc({getTransactionReceipt:async()=>f.receipt}as unknown as PublicClient);f.rpc.getTransactionReceipt=adapter.getTransactionReceipt;await reject(f);});
 it('requests finalized explicitly once',async()=>{const f=fixture();const getBlock=vi.fn(async()=>f.block);await receiptRpc({getBlock}as unknown as PublicClient).getFinalizedBlock!();expect(getBlock).toHaveBeenCalledWith({blockTag:'finalized'});expect(getBlock).toHaveBeenCalledOnce();});
});

const exported = (f:F,r:VerificationResult,isFixture=false) => buildReceiptExport(f.deployment,f.invoiceId,f.txHash,f.amount,f.payer,f.merchant,f.invoice.paidAt,f.invoice.paidBlockNumber,r,isFixture);
describe('export boundaries',()=>{
 it('decimal amount and block strings preserve precision',async()=>{const f=fixture(),record=exported(f,await check(f));const json=JSON.parse(exportReceiptsJson([record]))[0];expect(json.amountNative).toBe('200000000000000000');expect(json.paidBlockNumber).toBe('101');expect(json.settlementEvidence.finalizedBlockNumber).toBe('101');expect(json.importedVerified).toBe(false);});
 it('fixture indicator remains fixture',async()=>{const f=fixture();expect(exported(f,await check(f),true).mode).toBe('fixture');});
 it('failed result cannot retain stale settlementEvidence',async()=>{const f=fixture(),r=await check(f);r.status='UNVERIFIED_FINALITY';r.verified=false;expect(exported(f,r).settlementEvidence).toBeUndefined();});
 it('JSON overwrites importedVerified true',async()=>{const f=fixture(),r={...exported(f,await check(f)),importedVerified:true};expect(JSON.parse(exportReceiptsJson([r]))[0].importedVerified).toBe(false);});
 it('CSV neutralizes malicious evidence policy strings',async()=>{const f=fixture(),r=await check(f);r.settlementEvidence!.policyId='=HYPERLINK("https://invalid.test")';const csv=exportReceiptsCsv([exported(f,r)]);expect(csv).toContain('"\t=HYPERLINK');});
});

describe('review findings: contradictory transaction inclusion metadata',()=>{
 for(const [field,value]of [['blockHash',hash('9')],['blockNumber',100n],['transactionIndex',3],['blockHash',null],['blockNumber',null],['transactionIndex',null]]as const)
 it(`must reject tx ${field}=${String(value)}`,async()=>{const f=fixture();mutable(f.tx)[field]=value;const adapter=receiptRpc({getTransaction:async()=>f.tx}as unknown as PublicClient);f.rpc.getTransaction=adapter.getTransaction;await reject(f);});
});

describe('additional impossible invoice/native evidence consistency',()=>{
 it('must reject payment exactly at expiry',async()=>{const f=fixture();f.invoice.expiresAt=f.invoice.paidAt;await reject(f);});
 it('must reject payment after expiry',async()=>{const f=fixture();f.invoice.expiresAt=f.invoice.paidAt-1n;await reject(f);});
 it('must reject zero merchant with otherwise matching native event',async()=>{const f=fixture();f.invoice.merchant=address('0');f.receipt.logs[1].topics[2]=topicAddress(address('0'));f.receipt.logs[2].topics[3]=topicAddress(address('0'));await reject(f);});
 it('must reject a contract-to-itself native transfer claimed as merchant payment',async()=>{const f=fixture();f.invoice.merchant=f.contract;f.receipt.logs[1].topics[2]=topicAddress(f.contract);f.receipt.logs[2].topics[3]=topicAddress(f.contract);await reject(f);});
 it('must reject zero payer with otherwise matching transaction/event',async()=>{const f=fixture();f.invoice.payer=address('0');f.tx.from=address('0');f.receipt.from=address('0');f.receipt.logs[0].topics[1]=topicAddress(address('0'));f.receipt.logs[2].topics[2]=topicAddress(address('0'));await reject(f);});
});

describe('extra amount, account and metadata boundaries',()=>{
 it.each([1000000000000n,1000000000000000000n])('accepts valid P0 boundary %s',async amount=>{const f=fixture();f.invoice.amountNative=amount;f.tx.value=amount;for(const log of f.receipt.logs)log.data=toHex(amount,{size:32});expect((await check(f)).verified).toBe(true);});
 it.each([0n,1n,1000000000000000001n])('rejects consistent but invalid P0 amount %s',async amount=>{const f=fixture();f.invoice.amountNative=amount;f.tx.value=amount;for(const log of f.receipt.logs)log.data=toHex(amount,{size:32});await reject(f);});
 it('same external payer and merchant is allowed but explicitly marked controlled_demo',async()=>{const f=fixture();f.invoice.merchant=f.payer;f.receipt.logs[1].topics[2]=topicAddress(f.payer);f.receipt.logs[2].topics[3]=topicAddress(f.payer);const r=await check(f);expect(r.verified).toBe(true);expect(r.settlementEvidence!.controlled_demo).toBe(true);});
 it('paid transaction with one second before expiry remains valid',async()=>{const f=fixture();f.invoice.expiresAt=f.invoice.paidAt+1n;expect((await check(f)).verified).toBe(true);});
 it('legacy Arc native precompile emitter cannot replace approved current system emitter',async()=>{const f=fixture();f.receipt.logs[0].address='0x1800000000000000000000000000000000000000';await reject(f);});
 for(const field of ['blockHash','blockNumber','transactionIndex']as const)it(`missing original transaction ${field} is not reconstructed`,async()=>{const f=fixture();delete mutable(f.tx)[field];const adapter=receiptRpc({getTransaction:async()=>f.tx}as unknown as PublicClient);f.rpc.getTransaction=adapter.getTransaction;await reject(f);});
 it('contract as payer is not accepted as an ordinary EOA direct path',async()=>{const f=fixture();f.invoice.payer=f.contract;f.tx.from=f.contract;f.receipt.from=f.contract;f.receipt.logs[0].topics[1]=topicAddress(f.contract);f.receipt.logs[2].topics[2]=topicAddress(f.contract);await reject(f);});
});

describe('schema 1.2 and real-source gas export boundaries',()=>{
 it('includes minimum schema metadata and preserves aliases',async()=>{const f=fixture(),r=await check(f),record=exported(f,r);expect(record).toMatchObject({schemaVersion:'1.2',contractAddress:f.contract,txHash:f.txHash,blockNumber:'101',verifiedAt:r.verifiedAt,gasFeeNative:null});expect(typeof record.verifiedAt).toBe('number');});
 it('missing receipt gas is null, never fabricated zero',async()=>{const f=fixture(),r=await check(f);expect(r.gasFeeNative).toBeNull();expect(JSON.parse(exportReceiptsJson([exported(f,r)]))[0].gasFeeNative).toBeNull();});
 it('large exact gas fee is calculated separately from transfer amount',async()=>{const f=fixture();mutable(f.receipt).gasUsed=84487n;mutable(f.receipt).effectiveGasPrice=25000000000n;const r=await check(f),record=exported(f,r);expect(r.gasFeeNative).toBe('2112175000000000');expect(record.amountNative).toBe('200000000000000000');expect(record.gasFeeNative).toBe('2112175000000000');});
 it.each([['gasUsed',-1n],['effectiveGasPrice',-1n],['gasUsed',84487],['effectiveGasPrice',25000000000]])('invalid gas metadata %s is not used',async(field,value)=>{const f=fixture();mutable(f.receipt).gasUsed=84487n;mutable(f.receipt).effectiveGasPrice=25000000000n;mutable(f.receipt)[field]=value;const r=await check(f);expect(r.gasFeeNative).toBeNull();});
 it('schema metadata and nullable gas are represented in CSV',async()=>{const f=fixture(),record=exported(f,await check(f));const [header,row]=exportReceiptsCsv([record]).split('\n').map(s=>s.split(','));expect(header).toContain('schemaVersion');expect(row[header.indexOf('schemaVersion')]).toBe('1.2');expect(row[header.indexOf('blockNumber')]).toBe('101');expect(row[header.indexOf('gasFeeNative')]).toBe('');});
});
