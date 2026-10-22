# ArcProof independent browser review, 2026-10-22

## Decision

Accept the **tested read-only/demo browser scope** of the revised candidate. 26 bounded checks passed, 0 failed; 2 diagnostics/device checks blocked and 4 categories not run. This does not certify real payment, full mobile, production headers, or fresh T25/T26. The baseline home-copy qualification was corrected by the parent and its rendered fix was confirmed. No additional browser blocker was observed.

## Identity and method

- Original Git HEAD: `34eb952411a5d12ddba5550185593dc6df3e5584`
- Original source snapshot: `b3bf6b038298d53619329600a084986de9e5eb386c48802513c8ff557ecd8a67`
- Revised source snapshot: `d647cc2f5249f256e944ac217a057ba0d094614913e65a25bea6721c634f2941`
- Actual cloud Chromium browser via supported CUA APIs, default managed browser configuration. No security-reducing flags launched or security restrictions bypassed. Source not edited by browser reviewer.
- Original testnet/mainnet builds served on isolated loopback ports 4196/4197; original mainnet guarded run on 4198. Revised fresh accepted testnet/mainnet builds on 4199/4200. The UI Evidence page displayed the expected snapshots.
- Actual DOM interactions, keyboard navigation, browser downloads, and independently re-read downloaded JSON/CSV. The prior acceptance script was inspected but not executed; this report has its own bounded test list.
- Test browser tabs closed, zoom restored, exec preview processes terminated, and the five dedicated native loopback servers stopped. No deploy, publication, wallet connection, signing, transaction, external state change, Studio edit, or Argon call.

## Checks

| ID | Check | Status | Observation |
| --- | --- | --- | --- |
| B01 | Original page identity and meaningful render | PASSED | Testnet home title/URL matched, nonempty content, no framework overlay. |
| B02 | Exact amount and keyboard demo creation | PASSED | 0.123456 -> 123456000000000000; Enter created visibly labelled simulated receipt. |
| B03 | JSON downloaded and independently re-read | PASSED | fixture, SIMULATED_NOT_VERIFIED, importedVerified false; payment locator/payer/time/block/log fields null. |
| B04 | CSV downloaded and independently re-read | PASSED | Matches JSON invoice ID/amount and simulated/fixture markings. |
| B05 | Seven-decimal amount rejection | PASSED | 1.0000001 displays error and disables creation. |
| B06 | Other amount boundaries | PASSED | 0, -0.1, 1.000001, 1e-6 rejected; 0.000001 and 1 accepted. |
| B07 | Expiry bound | PASSED | Typing 169 hours was clamped to 168; did not exceed seven days. |
| B08 | Repeated creation interaction | PASSED | Double click added one visible invoice, distinct nonce 1 from prior nonce 0; remained simulated. Not a payment/idempotency test. |
| B09 | Close and route-reset behavior | PASSED | Close hides receipt; leave/re-enter demo clears ephemeral example history/state, without stale receipt. |
| B10 | Malformed verification | PASSED | 0x1234 rejected with 32-byte format error; no verified state. |
| B11 | Noncanonical chain route | PASSED | Leading-zero chain fails Unsupported network, no wallet control. |
| B12 | Duplicate tx parameter route | PASSED | Duplicate tx fails Invalid transaction hash, no wallet control. |
| B13 | Unknown route | PASSED | Unavailable route rendered instead of blank page. |
| B14 | Unknown deployment route | PASSED | Unsupported deployment rendered with no wallet control. |
| B15 | Keyboard accessibility | PASSED | First Tab reveals Skip link (top=8); Enter focuses main-content; keyboard CTA navigates to demo. |
| B16 | History navigation | PASSED | Back returns demo; forward returns evidence. |
| B17 | Original mainnet create/verify gating | PASSED | Both routes show no trusted deployment; no connect/sign/pay UI. |
| B18 | Old testnet receipt in mainnet | PASSED | Known testnet link recognized but blocked in fixed-mainnet build. |
| B19 | Original mainnet build identity | PASSED | DOM shows mainnet/5042, no trusted deployment, original source hash. |
| B20 | Original narrow responsive reflow | PASSED | Overview/demo/evidence clientWidth=scrollWidth=388 at normal 300% zoom; not device emulation. |
| B21 | Application console health | PASSED | No application-origin warning/error captured; extension metadata errors preserved separately. |
| F01 | Revised home disclosure | PASSED | Rendered invoice-principal forwarding and locked pre-existing/forced balance disclosure. |
| F02 | Revised identity | PASSED | DOM source hash d647cc2f5249f256e944ac217a057ba0d094614913e65a25bea6721c634f2941. |
| F03 | Revised demo/exports | PASSED | Exact amount creation and actual JSON/CSV downloads passed independent re-read; no payment evidence. |
| F04 | Revised narrow demo | PASSED | 388 CSS px no horizontal overflow, native screenshot shows label and keyboard-focused CSV button. |
| F05 | Revised mainnet gate | PASSED | Create route remains no trusted deployment/read-only. |
| L01 | chrome://sandbox diagnostic | BLOCKED | Browser URL policy disallowed chrome: scheme; not bypassed. Existing browser used, no security-reducing flags. |
| L02 | Mobile device emulation | BLOCKED | Native DevTools says organization prohibits developer tools; not bypassed. Narrow CSS zoom tested instead. |
| L03 | Full network trace / instrumented provider call counts | NOT_RUN | Supported browser API had no network routing/CDP trace controls. Mainnet guarded server had connect-src none and no CSP violations, which is not a complete trace. |
| L04 | Real wallet, signing, payment, interrupted on-chain recovery | NOT_RUN | No wallet/signature/transaction requested or sent. Out of this read-only/demo browser scope. |
| L05 | Canned verifier harness payment states | NOT_RUN | Existing harness inspected but not used; not evidence of actual payment. |
| L06 | Existing accept.mjs 23-check suite | NOT_RUN | Inspected, not executed; independent browser interactions above are distinct. |

## Evidence worth reviewing

- `fixed-home.jpg`: revised principal/locked-balance disclosure.
- `fixed-demo-receipt.jpg`, `original-demo-receipt.jpg`: full desktop simulated receipt.
- `fixed-demo-narrow-top-native.jpg`, `fixed-demo-narrow-receipt-native.jpg`: actual native screenshots at 300% zoom; narrow receipt remains readable and CSV keyboard focus visible.
- `fixed-mainnet-gate.jpg` and `.txt`: mainnet create lock.
- `original-mainnet-home.jpg`, `original-mainnet-old-receipt.jpg`: baseline mainnet gate and old-testnet-link handling.
- `original-route-errors.json`, `original-verify-error.jpg`: fail-closed route/verification checks.
- `original-keyboard-history.json`: skip navigation and history observations.
- `original-responsive.json`, `fixed-responsive.json`: 388px CSS width equals document scroll width.
- `fixed-build-identity.txt`: exact revised identity observed in UI.
- `original-demo-export.{json,csv}`, `fixed-demo-export.{json,csv}`, `export-reread-validation.txt`: real browser downloads and independent semantic checks.
- `amount-results.json`, `original-mainnet-routes.json`, `browser-console.json`: structured observations.
- `browser-qa-summary.json`: machine-readable report and count.

## Limitations that must not be overstated

Original mainnet port 4198 had an extra test-only Content-Security-Policy connect-src 'none'; form-action 'none'; frame-src 'none'. No CSP violation was observed. This guard is not production configuration and is not a full request trace. Fixed mainnet port 4200 had ordinary Python static server headers.

Full-page screenshot API at 300% zoom produced cropped images. Do not use original-narrow-*.jpg or fixed-demo-narrow.jpg as visual proof. Native screenshots fixed-demo-narrow-*-native.jpg show correct visible narrow rendering; JSON metrics support no-overflow claim. The API returns JPEG bytes; screenshot files were renamed to `.jpg` to match their actual format.

The responsive method was ordinary 300% browser zoom (CSS viewport 388 x 252), not a real mobile browser, touch device, orientation change, or responsive DevTools emulation. Opening DevTools was explicitly blocked by organization policy. `chrome://sandbox` was blocked by browser URL policy, so sandbox diagnostic attestation is not available. Neither denial was bypassed.

Console retrieval includes extension-origin metadata errors. No application-origin error or warning was observed in the captured retained logs; this is not an unlimited historical log or network trace.

No receipt here demonstrates a payment. Exported mode is fixture, verification status is SIMULATED_NOT_VERIFIED, importedVerified is false, and transaction/payer/block/payment fields are null. Real wallet state changes, replacement/pending recovery, RPC outage cancellation, fresh-chain receipt verification, and reduced-motion behavior were not re-exercised.
