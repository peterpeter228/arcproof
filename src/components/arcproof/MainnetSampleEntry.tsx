import { mainnetSampleHref } from '../../arcproof/mainnetSample';
export function MainnetSampleEntry() {
  const href = mainnetSampleHref();
  return <div className="space-y-2" aria-label="Mainnet sample">
    {href ? <a className="ap-btn-secondary" href={href}>Re-verify a mainnet sample</a>
      : <button type="button" className="ap-btn-secondary" disabled>Re-verify a mainnet sample</button>}
    <p className="text-xs text-stone-600">{href
      ? 'This opens a read-only verification from trusted Arc RPC data, not a cached VERIFIED badge. Operator-controlled demonstrations are not customer revenue.'
      : 'Unavailable: no actual mainnet application payment is published in this build. The offline demo is not mainnet evidence.'}</p>
  </div>;
}
