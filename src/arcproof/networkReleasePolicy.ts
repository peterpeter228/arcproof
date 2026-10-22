/** Reviewed release policy, not runtime configuration or deployment evidence.
 * Mainnet must remain disabled until a real deployment and release acceptance exist.
 * Neither URL, storage, imported receipt nor a build environment flag can change this.
 */
export const MAINNET_RELEASE_POLICY = Object.freeze({
  activeDeploymentId: null as string | null,
  writesAccepted: false,
});
