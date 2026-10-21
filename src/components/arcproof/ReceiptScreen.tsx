/** Unsupported receipt links are rejected immediately; no simulated verification. */
import { UnavailableRequest, type UnavailableRequestProps } from './UnavailableRequest';
export function ReceiptScreen(props: UnavailableRequestProps) {
  return <UnavailableRequest {...props} />;
}
