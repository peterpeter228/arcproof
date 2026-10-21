# ArcProof private UI candidate, 2026-10-21

## Changes
- Payment link feedback is scoped to current invoice and mounted wallet session, plus monotonically increasing clipboard operation version. New review, new invoice, unmount, competing attempts and failure invalidate prior success. Clipboard failure retains a safe manual-copy alternative.
- Receipt-link retries similarly clear old success and reject late older clipboard completions.
- Stable #/demo link replaces the dashboard-only local toggle.
- Review heading receives keyboard focus; cancelling returns focus to the previous control.
- Receipt environment and conclusion precede amount/parties. Exact identity check statuses, native settlement and finality summaries precede next-step guidance. Full reason/source/read timestamps/checks/block/hash/log/policy fields remain in collapsible diagnostics, expanded by print CSS.
- Preserved verification predicate, controlled_demo caveat, unknown/provenance distinctions and canonical export values. No verifier, sending, nonce, contract, wallet or settlement algorithm changes.
- Offwhite/teal retained: enabled demo action now teal700, meaningful muted text stone600, input border stone500, 44px controls/links, mobile-safe amount/input typography and wrapped invoice rows.
- Offline export filename/content still identify fixture; amount explicitly says test USDC. Download anchor now attached and object URL revoked after a delay, matching existing live helper behavior.

## Executed evidence
- /tmp/arcproof-share-before.log: baseline TestnetScreens with new SHARE tests: 4 failed, 1 passed (15 unrelated skipped). Failures: A success carried to B, late A success polluted B, B failure retained success, older success won over newer failed attempt. Session/unmount already passed baseline due component remount.
- /tmp/arcproof-ui-after.log: post-fix 57/57 tests across testnetUi, receiptDiagnosticsUi, receiptClarity at that snapshot.
- /tmp/arcproof-integrated-tests.log: later integrated concurrent candidate 432/432 tests across 23 files, including added receipt-copy retry regression. These totals overlap, do not sum.
- Latest owned-file oxlint --type-aware and project tsc --noEmit exit 0.
- Tests use jsdom and mocked RPC/wallet/clipboard. They are not real wallet, real clipboard or browser acceptance.

## Browser attempt
Browser plugin skill absent. Local Playwright used installed /usr/bin/chromium with chromiumSandbox:true. Browser exited before navigation: process_singleton_posix.cc socket() Operation not permitted, crashpad database warning. Supported exec escalation failed before browser start: bwrap could not create /home/agent/.codex/sessions on read-only filesystem. No denied path read, sandbox relaxation, wallet or public deployment.
Cloud CUA inventory confirms Chrome type cdp on Linux cloud surface. Opening http://127.0.0.1:5173 pending as of 16:07 UTC. Vite foreground session 56272 is running at that address.

## Still required for acceptance
Actual 375/768/1440 rendered screenshots and overflow checks; real 200% browser zoom (not viewport imitation); computed text contrast >=4.5 and key control contrast >=3; keyboard/reader flow and review focus; raw receipt details print pagination/PDF; actual downloaded JSON/CSV bytes (including fixture markers and Excel/Sheets text-import caveat); browser back/forward/reload for read-only routes; console/framework overlay health; no automatic wallet/business RPC in read-only empty/demo routes. Live two-wallet acceptance and signatures are outside this UI task's authority.

Browser update, 16:10 UTC: cua.createBrowserTab('cdp', 'http://127.0.0.1:5173') returned an explicit tool timeout after 300 seconds, with no page/DOM/screenshot evidence. A read-only cua.listTabs({ browser: 'cdp' }) check is pending to determine whether the uncertain open produced a tab. No duplicate create and no security-warning bypass.

Static sRGB calculations (not computed browser measurements): white/teal700 5.473:1; white/teal800 hover 7.584:1; stone600/white 7.629:1; stone600/stone50 7.305:1; stone500 input border/white 4.798:1.

Focus follow-up: self-review identified that immediate cancel focus ran before React re-enabled its trigger and StrictMode replay could capture the heading. Fixed via cancel-only passive cleanup and replay-safe trigger capture. Added deterministic StrictMode regression; /tmp/arcproof-ui-focus.log shows 21/21 testnetUi passed with scoped type-aware lint exit 0. The previously reported 432 suite count predates this one extra test and is not a final frozen total.

## Independently verified post-Argon UI delta (16:14 UTC)
Read frozen Argon review at arcproof-review-oct21/argon-candidate/review.md without modifying the packet. Confirmed payment link retained unrelated page query parameters while receipt sharing stripped them; review and offline demo expiry used unlabeled local time. Added four regressions: query strip, review UTC, demo UTC, missing-check naming. /tmp/arcproof-argon-ui-before.log: 4 fail / 34 pass. After minimal UI-only fixes, /tmp/arcproof-argon-ui-after.log: 38/38 pass.
The review's suggested empty-every success issue is not a real bug: identityChecks maps a fixed eight-element identityIds array; undefined status compares false, so missing records cannot yield Passed. Explicit 'not recorded' labels for each missing identity check were nevertheless added for clarity. No success predicate relaxation or evidence algorithm changes. Disabled controls are exempt from normal-text contrast requirements; stone500/white already exceeds 4.5, so those claims were not used as mandatory defects.
These changes and the focus follow-up occurred after the frozen model packet; that model response is not approval of these later bytes.
