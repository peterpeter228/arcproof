// @vitest-environment jsdom
/* eslint-disable typescript/require-await -- Promise-returning offline RPC stubs. */
// Regressions for the 2026-10-22 final review findings. Each case reproduced on 8f748d3.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { keccak256, type Hex } from 'viem';
import { ReceiptFacts } from '../../components/arcproof/ReceiptFacts';
import { buildReceiptExport, type ReceiptExportRecord } from '../exportUtils';
import { MAINNET_CONTEXT, TESTNET_CONTEXT, assertWritesEnabled, assertWritesEnabledFor } from '../networkPolicy';
import { parseHash } from '../routes';
import { TESTNET_DEPLOYMENT } from '../testnet';
import type { DeploymentRecord } from '../manifest';
import { verifyReceipt, type VerificationResult } from '../receiptVerifier';
import { testnetService } from '../testnetClient';

const id: Hex = `0x${'a'.repeat(64)}`;
const tx: Hex = `0x${'b'.repeat(64)}`;
const finalizedHash: Hex = `0x${'c'.repeat(64)}`;

describe('FR-01 wallet writes are limited to the fixed build network', () => {
  it('rejects testnet writes when the build network is mainnet, even with a trusted testnet context', () => {
    expect(() => assertWritesEnabledFor(TESTNET_CONTEXT, MAINNET_CONTEXT)).toThrow(/build network/);
    expect(() => assertWritesEnabledFor(MAINNET_CONTEXT, MAINNET_CONTEXT)).toThrow(/disabled/);
  });
  it('keeps testnet writes available in the testnet build', () => {
    expect(() => assertWritesEnabledFor(TESTNET_CONTEXT, TESTNET_CONTEXT)).not.toThrow();
    expect(() => assertWritesEnabled(TESTNET_CONTEXT)).not.toThrow();
  });
});

describe('FR-02 untrusted deployments never export verified settlement evidence', () => {
  const untrusted: DeploymentRecord = { ...TESTNET_DEPLOYMENT, contractAddress: `0x${'9'.repeat(40)}` };
  const evidence = { policyId: 'arc-testnet-native-eip7708-finalized-v1', nativeEmitter: '0xfffffffffffffffffffffffffffffffffffffffe' as Hex,
    decimals: 18 as const, payerToContractLogIndex: 0, contractToMerchantLogIndex: 1, finalizedBlockNumber: '10', finalizedBlockHash: finalizedHash, controlled_demo: false };
  const result: VerificationResult = { status: 'VERIFIED', verified: true, message: 'ok', paymentLogIndex: 2, blockHash: `0x${'d'.repeat(64)}`, verifiedAt: 1,
    reasonCode: 'VERIFIED', checks: [], readStartedAt: 1, readCompletedAt: 2, source: { kind: 'rpc', label: 'x' },
    observationScope: { chainId: untrusted.chainId, deploymentId: untrusted.deploymentId, contract: untrusted.contractAddress, invoiceId: id, transactionHash: tx },
    observedReceipt: null, observedInvoice: null, settlementEvidence: evidence };

  it('downgrades a VERIFIED result for an unregistered contract to UNKNOWN_DEPLOYMENT without evidence', () => {
    const record = buildReceiptExport(untrusted, id, tx, null, null, null, null, null, result, false);
    expect(record.mode).toBe('unknown');
    expect(record.verificationVerified).toBe(false);
    expect(record.verifiedEvidence).toBeNull();
    expect(record.settlementEvidence).toBeUndefined();
    expect(record.verificationStatus).toBe('UNKNOWN_DEPLOYMENT');
    const html = renderToStaticMarkup(<ReceiptFacts record={record} />);
    expect(html).toContain('Not verified; two transfer legs are not established.');
    expect(html).not.toContain('checked finalized block 10');
  });
  it('still exports evidence for the trusted testnet deployment', () => {
    const trustedResult = { ...result, observationScope: { ...result.observationScope!, contract: TESTNET_DEPLOYMENT.contractAddress } };
    const record = buildReceiptExport(TESTNET_DEPLOYMENT, id, tx, null, null, null, null, null, trustedResult, false);
    expect(record.mode).toBe('testnet');
    expect(record.verificationVerified).toBe(true);
    expect(record.verificationStatus).toBe('VERIFIED');
  });
});

describe('FR-03 route chain IDs must be canonical', () => {
  it.each(['0005042002', '05042002', '0'])('rejects chain segment %s', (chain) => {
    expect(parseHash(`#/pay/${chain}/${TESTNET_DEPLOYMENT.deploymentId}/${id}`).chainId).toBeUndefined();
    expect(parseHash(`#/receipt/${chain}/${TESTNET_DEPLOYMENT.deploymentId}/${id}`).chainId).toBeUndefined();
  });
  it('accepts the canonical testnet chain ID', () => {
    expect(parseHash(`#/pay/5042002/${TESTNET_DEPLOYMENT.deploymentId}/${id}`).chainId).toBe(5042002);
  });
});

describe('FR-04 conflicting receipt log provenance is reported as such, not as "not found"', () => {
  it('maps the adapter conflict to INVALID_LOG_PROVENANCE', async () => {
    const fakeClient = {
      getTransactionReceipt: async () => ({ transactionHash: tx, blockHash: `0x${'1'.repeat(64)}`, blockNumber: 5n, status: 'success',
        from: `0x${'2'.repeat(40)}`, to: TESTNET_DEPLOYMENT.contractAddress, transactionIndex: 0,
        logs: [{ removed: true, blockHash: `0x${'1'.repeat(64)}`, blockNumber: 5n, transactionHash: tx, address: TESTNET_DEPLOYMENT.contractAddress, topics: [], data: '0x', logIndex: 0, transactionIndex: 0 }] }),
    };
    const adapter = testnetService.receiptRpc(fakeClient as never);
    const code = '0x6000' as Hex;
    const rpc = { ...adapter, getChainId: async () => 5042002, getContractCode: async () => code };
    const outcome = await verifyReceipt(tx, id, { ...TESTNET_DEPLOYMENT, runtimeCodeHash: keccak256(code) }, 5042002, rpc);
    expect(outcome.verified).toBe(false);
    expect(outcome.status).toBe('INVALID_LOG_PROVENANCE');
    expect(outcome.message).not.toMatch(/not found/);
  });
  it('still reports a genuinely missing receipt as PENDING', async () => {
    const adapter = testnetService.receiptRpc({ getTransactionReceipt: async () => { throw new Error('Transaction receipt could not be found'); } } as never);
    const code = '0x6000' as Hex;
    const rpc = { ...adapter, getChainId: async () => 5042002, getContractCode: async () => code };
    const outcome = await verifyReceipt(tx, id, { ...TESTNET_DEPLOYMENT, runtimeCodeHash: keccak256(code) }, 5042002, rpc);
    expect(outcome.status).toBe('PENDING');
  });
});

describe('FR-05 receipt currency wording follows the record network', () => {
  const base: ReceiptExportRecord = {
    schemaVersion: '1.2', chainId: 5042, deploymentId: 'future-mainnet', contract: `0x${'1'.repeat(40)}`,
    invoiceId: id, transactionHash: tx, paymentLogIndex: 3, amountNative: '200000000000000000', amountDisplay: '0.20',
    payer: null, merchant: null, paidAt: null, paidBlockNumber: null, blockHash: null, verificationStatus: 'PENDING', mode: 'unknown', gasFeeNative: '21000',
  };
  it('never prints "test USDC" for an Arc Mainnet record', () => {
    const html = renderToStaticMarkup(<ReceiptFacts record={base} />);
    expect(html).not.toContain('test USDC');
    expect(html).toContain('0.20 USDC (untrusted deployment)');
  });
  it('keeps "test USDC" for Arc Testnet records', () => {
    const html = renderToStaticMarkup(<ReceiptFacts record={{ ...base, chainId: 5042002, mode: 'testnet' }} />);
    expect(html.match(/test USDC/g)).toHaveLength(2);
  });
});
