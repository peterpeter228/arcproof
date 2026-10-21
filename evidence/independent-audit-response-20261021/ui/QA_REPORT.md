# UI implementation and bounded browser QA

Final candidate source snapshot: `c81e72ee9e0821528f31ae2bd7212e675f97ee979d154b8b1863218b043534b5`.
Build UTC: `2026-10-21T16:29:16.767Z`. Verified base (not current commit): `94a84c44b02d52a827bed42fc9f9a5d414619b7d`.

## Outcome

SHARE-01 copy-scope fixes, receipt hierarchy/diagnostic preservation, contrast/target sizing, UTC labels, and query-stripped sharing are implemented. Final local project tests: **441/441 in 26 files**, lint/typecheck and production build exit 0. See `../final-gates/ui-followon/`. Counts overlap earlier runs and must not be added. The footer source assertion initially used a CSS loader that returned no rule; its corrected filesystem read and the actual browser measurement are both preserved. The first build command lacked `bunx`; the installed Vite binary succeeded. These were harness/environment failures, not hidden application passes.

## Browser environment and identity

Actual cloud Chromium, using documented CUA APIs and native desktop controls; no user computer, real wallet, public host, deployment, security-warning bypass, or disabled sandbox. The application was served privately by the cloud desktop terminal using installed Node and `vite preview --host 127.0.0.1 --port 5174`. Final source identity above was read from the running production Evidence page, not inferred from source. Browser inventory/recovery and initial failures are in `browser-attempts.json`.

Earlier `production-*` observations bind the previous candidate `de48e3fa8ea70e47c710acd45541ab22565f527755f307ceace5f34cbc1ecc78`, build16:15:27.065Z. `final-*` artifacts bind the final snapshot above. `verify-desktop.png` alone is development-server evidence, not production acceptance.

## Verified in the actual browser

- Correct title and nonblank read-only Verify, Evidence, and Offline demo routes, no framework overlay visible.
- Previous candidate: #/demo reload, browser back/forward, invalid chain route rejection, native keyboard Skip to main content moved focus to MAIN without changing the route.
- Final candidate: #/demo reload → Create invoice (offline) → View simulated receipt → real JSON and CSV downloads, plus #/verify reload. Simulation labels and unknown/null proof fields remained visible.
- Final actual download bytes match JSON/CSV for invoice ID, amountNative `200000000000000000`, amountDisplay, status `SIMULATED_NOT_VERIFIED`, and mode `fixture`; transactionHash and payer remain null. See `final-download-verification.json`. This is not Excel/Sheets acceptance.
- Final browser measured both footer links as44px after correcting the discovered20px build-identity anchor. Earlier demo computed controls all44px. Verify text color samples on the earlier candidate have minimum5.247958:1; those colors were unchanged by the footer-only follow-on. This is sampled contrast evidence, not a global WCAG certification.
- Ordinary OS window resizing yielded1188×761,769×760 and500×760 CSS-pixel viewports. Native window width plus150% browser zoom yielded375×507 CSS pixels, not a mobile-device emulation. Final demo at375 had scrollWidth365; final native200% at281×380 had scrollWidth274. No horizontal overflow in these measured states. Exact768 and1440 acceptance was not performed.
- Real200% browser zoom was confirmed by Chromium's native zoom bubble and devicePixelRatio2, not by substituting a smaller viewport. Native screenshots preserve the evidence.
- Captured console errors all identify the browser extension's metadata content script; no application-origin error was observed in captured logs. This does not prove complete network or wallet inactivity.

## Capture limitations and open gates

- Native DevTools shortcut displayed an explicit organization prohibition. No CDP/device-emulation workaround was used. Normal OS resize and browser zoom are independent ordinary UI controls.
- The tab fullPage screenshot API produced cropped rasters when devicePixelRatio exceeded1. Those raw files remain for transparency, but must NOT be cited as full-layout proof or misreported as app clipping. Use `production-native-*`, `final-native-*`, screenshots taken at100%, and corresponding DOM width metrics instead.
- Ctrl+P and standard browser menu attempts did not open a print dialog. No PDF exists. Print pagination and expanded live-receipt diagnostics remain NOT_RUN; no print-policy bypass attempted.
- Real payment receipt status variants, wallet confirmation/rejection, real clipboard payment sharing, full screen-reader testing, mobile-wallet flows, exact768/1440, and complete background-RPC instrumentation remain NOT_RUN. Mocked regression results do not substitute for these.
- Existing Studio project was inspected read-only after one informational AI/testnet notice acknowledgment covered by prior explicit terms/use approval. The embedded preview DOM shows the older wallet-first invoice entry and offline toggle, unlike final c81e72ee. Exact Studio source SHA remains unknown; no synchronization, prompt, edit, build, wallet action, or deployment occurred. “Stopped” is only a visible workspace label, not application/deployment status proof. A later cropped preview screenshot shows transient “Connecting to sandbox”, not rendered-app proof. See sanitized `studio-access.json` for notice and chronology; account information and preview access tokens are excluded.

## Regression evidence

`arcproof-share-before.log`: baseline fails4/5 SHARE cases; after patch the targeted suite passes. `arcproof-argon-ui-before.log`: four demonstrated pre-patch failures for query stripping, review UTC, demo UTC and naming missing checks; `arcproof-argon-ui-after.log`:38/38. `arcproof-ui-focus.log`:21/21 including StrictMode cancel-focus return. `IMPLEMENTATION.md` gives the chronological patch details. Final authoritative suite is the441-test UI-follow-on run, not the smaller historical subsets.

The external model's frozen review predates focus/query/UTC/missing-label/footer follow-ons. That model response must not be represented as review of the final bytes. The retracted empty-array identity-check claim was independently rejected; missing identity check IDs are explicitly named for clarity without changing the verification predicate.
