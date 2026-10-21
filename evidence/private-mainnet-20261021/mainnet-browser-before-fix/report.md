# Private mainnet browser verification

Declared source SHA: e8f83ed0b8fc9b4f621f9cef4839e5b739e529693fd925e962247dd5c3e3c626
Target: http://127.0.0.1:4174/
Browser: dot cloud browser (`cdp`), not user's computer.
Status: blocked pending server availability.

2026-10-21 23:21 UTC: cloud browser createBrowserTab returned `net::ERR_CONNECTION_REFUSED` for the target, tab 3. Local curl to the same address also failed with connection refused. This does not establish cross-environment isolation; server availability must first be established.

Attempting to observe error tab 3 was denied by browser URL policy because its current error-page protocol is not allowed. No attempt was made to bypass that denial. No screenshot captured.

Requested rendered checks remain not_run: unavailable mainnet panel, testnet-looking routes, malformed/duplicate parameters, navigation to offline demo/evidence, absence of connect/send controls. These are not recorded as passing or application failures.

No source edits, Argon calls, wallets, RPC, signatures, transactions, deployment, public tunnel, or publication were performed.

2026-10-21 23:23 UTC parent update: parent-owned Python session appeared alive despite refusal, suggesting possible per-command sandbox network isolation. Parent's attempted tool-reviewed localhost-only server launch outside the command sandbox failed before Python with a bwrap runtime read-only error. No browser retest was performed after this report. Root cause remains unconfirmed. Final outcome: blocked; all application-specific rendered checks not_run. Existing Studio coverage, if any, is separate and cannot establish this production build's rendered mainnet behavior.

## Final result after supported native Terminal recovery

The earlier blocked status above is superseded by completed bounded browser QA, not erased. At 23:24 UTC, cloud native Terminal successfully started Python http.server with --bind 127.0.0.1 against the frozen mainnet build directory. PID 39 was observed. Browser tab 4 successfully loaded the application; no public tunnel or deployment was used.

Passed observed UI checks:
- Root and /verify show the private mainnet unavailable panel, Arc Mainnet 5042, real USDC, no trusted deployment, all sends disabled, not audited.
- /invoices shows the same read-only panel, not invoice creation.
- Known testnet deployment /pay route remains unavailable and explicitly says build locked to mainnet and cannot verify testnet receipts here.
- Duplicate tx query receipt route remains unavailable.
- Non-numeric chain, malformed percent value/tx, bad invoice, and extra path component remain unavailable.
- Unknown route displays Unavailable route; its read-only verification recovery link returns to the mainnet unavailable panel.
- Evidence navigation works and visibly identifies fixed build network mainnet and the declared candidate hash matching the assigned e8f83ed0…c626 snapshot.
- Offline demo navigation works, explicitly describes fixtures/no transaction/no wallet, and labels its creation button offline demo — no signing. No fixture was created.
- No wallet connect, network-switch, payment, signature, or send control was observed on checked routes. Offline demo has its separately labeled simulation-only create control.

Observed copy issue: Evidence's Current candidate build identity simultaneously says fixed build network mainnet but Environment / chain Arc Testnet / 5042002; mainnet disabled, followed by the testnet manifest deployment identity and runtime. Footer also says Checked testnet deployment. This is potentially confusing historical/current context, not observed wallet gating failure. Source was not changed.

Artifacts: 01-mainnet-unavailable.png; 02-mainnet-evidence.png; 03-offline-demo.png; 04-invalid-route.png; route-results.json (AX snapshots, some as diffs). Screenshots contain only app status, synthetic/testnet identifiers and declared build metadata; no secrets/customer data.

Limits: UI-only bounded route/navigation QA. No network instrumentation, wallet provider probes, RPC checks, live-chain acceptance, contract deployment or financial action. Absence of observed controls is not proof of zero runtime network calls. No Argon invocation or source edit was performed.

Cleanup: at 23:25 UTC cloud Terminal displayed job PID 39 Terminated and ARC_MAINNET_SERVER_STOPPED after kill 39; wait 39. The owned local server is stopped.
