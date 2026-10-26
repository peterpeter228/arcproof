/** Reviewed release policy, not a URL, storage value, imported receipt, or build flag.
 * Writes are accepted only for the verified Arc mainnet U1 deployment below.
 * MAINNET_SAMPLE stays unset until a real createInvoice and payInvoice exist.
 */
export const MAINNET_RELEASE_POLICY = Object.freeze({
  activeDeploymentId: '0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa',
  writesAccepted: true,
});
