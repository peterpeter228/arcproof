/**
 * EvidenceScreen.tsx — Provenance, test results, and limitations.
 * Shows actual G1 data: 69 tests passing, independent review pending.
 * Never claims all 28 acceptance IDs passed; never claims Arc-specific
 * tests (T25/T26) have run. Honest about HOLD status.
 */
import React from 'react';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, DEPLOYMENT_TX, explorerTx } from '../../arcproof/testnet';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface TestRow {
  id: string;
  description: string;
  status: 'pass' | 'pending' | 'not_run';
  note?: string;
}

const FORGE_TESTS: TestRow[] = [
  { id: 'T01', description: 'Valid creation and emitted data', status: 'pass' },
  { id: 'T02', description: 'Amount validation (zero/min/max/over-cap/precision)', status: 'pass' },
  { id: 'T03', description: 'Expiry boundaries (past/equal/future/7d/over 7d)', status: 'pass' },
  { id: 'T04', description: 'ID derivation (nonce0/multi-merchant/two deployments/chain IDs)', status: 'pass' },
  { id: 'T05', description: 'Immutable fields, no setter/cancel/edit ABI', status: 'pass' },
  { id: 'T06', description: 'Unknown ID: getInvoice reverts, payInvoice reverts', status: 'pass' },
  { id: 'T07', description: 'Exact payment: paidAt/paidBlockNumber/event/balances', status: 'pass' },
  { id: 'T08', description: 'Wrong amounts and prefunded contract balance', status: 'pass' },
  { id: 'T09', description: 'Expiry boundary for payment (expiresAt-1/exact/+1)', status: 'pass' },
  { id: 'T10', description: 'Repeat payments (same/different payer)', status: 'pass' },
  { id: 'T11', description: 'Same-invoice reentry (caught and uncaught)', status: 'pass' },
  { id: 'T12', description: 'Cross-invoice, createInvoice reentry, shared guard, selector', status: 'pass' },
  { id: 'T13', description: 'Rejecting/gas-exhausting receiver: exact error + full rollback', status: 'pass' },
  { id: 'T14', description: 'Direct value/wrong selector/value-on-create reject', status: 'pass' },
  { id: 'T15', description: 'Prefunded balances untouched; forced balance mutation reverts BALANCE_MISMATCH', status: 'pass' },
  { id: 'T16', description: 'Fuzz: values/time/actors/adversarial sequences/multi-merchant', status: 'pass', note: '5 fuzz tests, 256 runs each' },
  { id: 'T17', description: 'Callable surface / OZ version evidence / dependency inspection', status: 'pass' },
  { id: 'I01–I09', description: 'Acceptance tests (end-to-end, once-only, failed calls, independence)', status: 'pass', note: '10 tests in ArcProofAcceptance.t.sol' },
  { id: 'T18', description: 'Amount parser: exact boundaries and invalid strings (Vitest)', status: 'pass' },
  { id: 'T19', description: 'Manifest: tampering, unknown deployment, isolation, terms gate (Vitest)', status: 'pass' },
  { id: 'T20', description: 'PreparedPayment: explicit fields, context validation (Vitest)', status: 'pass' },
  { id: 'T21', description: 'Wallet rejection, timeout, and no auto-rebroadcast', status: 'not_run', note: 'Dedicated adapter and lifecycle guards implemented; real-wallet acceptance is still not run.' },
  { id: 'T22', description: 'Receipt verifier: forged receipts, wrong chain/contract/emitter (Vitest)', status: 'pass' },
  { id: 'T23', description: 'Receipt recovery and RPC conflict handling', status: 'not_run', note: 'Paid-block hash recovery and saved-transaction reconciliation implemented. Real-chain recovery and second-endpoint conflict acceptance remain not run.' },
  { id: 'T24', description: 'Nonce pagination, integer strings, export dedupe, untrusted flags (Vitest)', status: 'pass' },
  { id: 'T25', description: 'Arc native-USDC system Transfer event at official emitter', status: 'not_run', note: 'Official native emitter reference identified; genuine payment receipt evidence is still required. Anvil does not prove Arc log behaviour.' },
  { id: 'T26', description: 'Arc committed-block finality and receipt verification on real chain', status: 'not_run', note: 'Deployment checked; genuine payment/finality acceptance not run.' },
];

function StatusIcon({ status }: { status: 'pass' | 'pending' | 'not_run' }) {
  if (status === 'pass') return <CheckCircle size={14} className="text-teal-600 shrink-0" />;
  if (status === 'not_run') return <AlertCircle size={14} className="text-stone-400 shrink-0" />;
  return <Clock size={14} className="text-amber-500 shrink-0" />;
}

export function EvidenceScreen() {
  const passCount = FORGE_TESTS.filter((t) => t.status === 'pass').length;
  const notRunCount = FORGE_TESTS.filter((t) => t.status === 'not_run').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Summary card */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-stone-900 text-base">Project evidence</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Forge tests', value: '73 (69 Studio + 4 supplemental)' },
            { label: 'Local testing', value: 'Offline unit / DOM coverage only' },
            { label: 'Deployment', value: 'Arc Testnet checked' },
            { label: 'Grant eligibility', value: 'HOLD' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-stone-50 rounded-lg p-3">
              <p className="text-xs text-stone-400 font-medium">{label}</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <div className="text-xs text-stone-500 space-y-1">
          <p><strong>Source review:</strong> Independent review in progress; frontend results are local unit coverage, not full acceptance or live-wallet evidence. G1: 69 Studio-export tests plus 4 native supplemental tests, 73 independently passed.</p>
          <p className="break-all"><strong>Checked testnet deployment:</strong> <a className="underline" href={`${ARC_TESTNET.blockExplorers.default.url}/address/${TESTNET_DEPLOYMENT.contractAddress}?tab=contract`} target="_blank" rel="noreferrer">{TESTNET_DEPLOYMENT.contractAddress}</a>. Full runtime matched the reviewed artifact. <a className="underline" href={explorerTx(DEPLOYMENT_TX)} target="_blank" rel="noreferrer">Deployment transaction</a>. Source publication and payment acceptance are not claimed.</p>
          <p><strong>Grant:</strong> Eligibility HOLD. Free prototype development authorized for testnet/local scope per 2026-10-20 directive. Do not claim grant eligibility established.</p>
          <p><strong>Atomic forwarding:</strong> The contract passes funds directly to the merchant atomically. This is not custody. It does touch funds. It is not a claim of escrow-free operation — the contract's execution touches and routes value.</p>
        </div>
      </div>

      {/* Test matrix */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-medium text-stone-800 text-sm">Test matrix</h3>
          <div className="flex gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1"><CheckCircle size={12} className="text-teal-600" /> {passCount} passed</span>
            <span className="flex items-center gap-1"><AlertCircle size={12} className="text-stone-400" /> {notRunCount} not run</span>
          </div>
        </div>
        <div className="divide-y divide-stone-100">
          {FORGE_TESTS.map((t) => (
            <div key={t.id} className="px-5 py-2.5 flex items-start gap-3">
              <StatusIcon status={t.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-stone-500 shrink-0">{t.id}</span>
                  <span className="text-xs text-stone-700">{t.description}</span>
                </div>
                {t.note && (
                  <p className="text-xs text-stone-400 mt-0.5">{t.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Limitations */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-3">
        <h3 className="font-medium text-stone-800 text-sm">Known limitations (P0)</h3>
        <ul className="text-xs text-stone-600 space-y-1.5 list-disc list-outside ml-4">
          <li>Only the checked Arc Testnet deployment is configured. Mainnet remains disabled; the user alone approves testnet wallet requests.</li>
          <li>Arc native-USDC system Transfer and finality evidence (T25/T26) are not verified against a genuine payment receipt. Official native events use 18 decimals at 0xfffffffffffffffffffffffffffffffffffffffe, not the 6-decimal ERC-20 path.</li>
          <li>Receipt verifier compares runtime keccak256 against the supplied manifest. Real network evidence is still unavailable.</li>
          <li>P0 UI only supports ordinary EOA wallets. Other account types are explicitly unsupported.</li>
          <li>No nonzero termsHash protocol in P0. Historical paid invoices with nonzero hash are readable but payment blocked in UI.</li>
          <li>Saved transaction locators and read-only status refresh are implemented. Storage is best-effort; actual browser-wallet recovery is not yet accepted.</li>
          <li>Offline fixture requests and simulated exports do not send transactions or establish chain evidence. No backend, database, login service, or LLM at runtime.</li>
        </ul>
      </div>
    </div>
  );
}
