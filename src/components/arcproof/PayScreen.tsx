/** Unsupported payment links never invite a wallet connection or network switch. */
import { UnavailableRequest, type UnavailableRequestProps } from './UnavailableRequest';
export function PayScreen(props: UnavailableRequestProps) {
  return <UnavailableRequest {...props} />;
}
