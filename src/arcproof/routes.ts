/** URL state is the navigation authority; malformed requests never become a wallet entry. */
export type NavTab = 'dashboard' | 'verify' | 'evidence' | 'demo';
export interface HashRoute {
  screen: NavTab | 'pay' | 'receipt' | 'invalid';
  chainId?: number;
  deploymentId?: string;
  invoiceId?: `0x${string}`;
  txHash?: string;
}
export function parseHash(hash: string): HashRoute {
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  if (path === '' || path === '/') return { screen: 'verify' };
  if (path === '/invoices') return { screen: 'dashboard' };
  if (path === '/verify' || path === '/evidence' || path === '/demo') return { screen: path.slice(1) as NavTab };
  const question = path.indexOf('?');
  const pathname = question < 0 ? path : path.slice(0, question);
  const params = new URLSearchParams(question < 0 ? '' : path.slice(question + 1));
  const parts = pathname.split('/');
  if (parts[0] === '' && (parts[1] === 'pay' || parts[1] === 'receipt')) {
    const chainId = /^[0-9]+$/.test(parts[2] ?? '') ? Number(parts[2]) : NaN;
    return {
      screen: parts[1],
      chainId: Number.isSafeInteger(chainId) ? chainId : undefined,
      deploymentId: parts[3],
      invoiceId: (parts.length === 5 ? parts[4] : undefined) as `0x${string}` | undefined,
      txHash: params.has('tx') ? (params.getAll('tx').length === 1 ? params.get('tx')! : '') : undefined,
    };
  }
  return { screen: 'invalid' };
}
