/**
 * invoiceId.ts
 * Derive invoice IDs client-side for display/pagination.
 * Formula: keccak256(abi.encode(uint256 chainId, address contract, address merchant, uint256 nonce))
 * Uses abi.encode (padded), NOT abi.encodePacked (unpadded).
 */
import { keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';

export function deriveInvoiceId(
  chainId: number,
  contractAddress: `0x${string}`,
  merchant: `0x${string}`,
  nonce: bigint,
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('uint256, address, address, uint256'),
      [BigInt(chainId), contractAddress, merchant, nonce],
    ),
  );
}

/**
 * Derive all invoice IDs for a merchant from nonce range [start, end).
 * Newest-first: returns IDs for nonces end-1 down to start.
 */
export function deriveInvoiceIds(
  chainId: number,
  contractAddress: `0x${string}`,
  merchant: `0x${string}`,
  nextNonce: bigint,
  pageSize: number = 20,
  pageIndex: number = 0,
): Array<{ nonce: bigint; invoiceId: `0x${string}` }> {
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0 || !Number.isSafeInteger(pageIndex) || pageIndex < 0 || nextNonce < 0n) throw new Error('Invalid pagination');
  const startNonce = nextNonce - 1n - BigInt(pageIndex) * BigInt(pageSize);
  const results: Array<{ nonce: bigint; invoiceId: `0x${string}` }> = [];

  for (let i = 0; i < pageSize && startNonce - BigInt(i) >= 0n; i++) {
    const nonce = startNonce - BigInt(i);
    results.push({
      nonce,
      invoiceId: deriveInvoiceId(chainId, contractAddress, merchant, nonce),
    });
  }
  return results;
}
