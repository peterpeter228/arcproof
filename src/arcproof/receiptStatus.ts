/** RPC adapters may surface malformed or missing status despite static typings. */
export function receiptStatus(status: unknown): 'success' | 'reverted' | 'unknown' {
  return status === 'success' ? 'success' : status === 'reverted' ? 'reverted' : 'unknown';
}
