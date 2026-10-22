import type { VerificationCheck } from '../../arcproof/receiptVerifier';
const GROUPS = [
  { id: 'code', title: 'Contract code match', checks: ['chain', 'runtime_code'] },
  { id: 'invoice', title: 'Invoice paid state', checks: ['invoice_state'] },
  { id: 'event', title: 'Payment event binding', checks: ['receipt_identity', 'transaction_identity', 'payment_event', 'event_and_value'] },
  { id: 'transfers', title: 'Native USDC transfer legs', checks: ['settlement_policy', 'provenance', 'native_transfers'] },
  { id: 'finality', title: 'Finality and payment block', checks: ['payment_block', 'finality'] },
] as const;
function groupStatus(required: readonly string[], checks: readonly VerificationCheck[]) {
  const matched = required.map(id => checks.filter(check => check.id === id));
  if (matched.some(rows => rows.some(check => check.status === 'failed'))) return 'Failed';
  if (matched.some(rows => rows.some(check => check.status === 'unavailable'))) return 'Unavailable';
  if (matched.some(rows => rows.length !== 1)) return 'Not recorded';
  if (matched.every(rows => rows[0].status === 'passed')) return 'Passed';
  return 'Not run';
}
/** Only diagnostics determine these statuses. Overall success/imported flags cannot fill missing checks. */
export function VerificationFactGroups({ checks = [] }: { checks?: readonly VerificationCheck[] }) {
  return <ul className="space-y-2" aria-label="Five payment evidence groups">
    {GROUPS.map(group => {
      const status = groupStatus(group.checks, checks);
      return <li key={group.id} data-verification-fact={group.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1 rounded border border-stone-200 px-3 py-2">
        <span>{group.title}</span><span className={`font-semibold ${status === 'Failed' || status === 'Unavailable' ? 'text-amber-900' : 'text-stone-700'}`}>{status}</span>
      </li>;
    })}
  </ul>;
}
