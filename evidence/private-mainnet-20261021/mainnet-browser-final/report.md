# Final frozen mainnet build: actual-browser QA

Status: passed (bounded UI checks), 2026-10-21 23:35–23:36 UTC.
Declared source snapshot SHA-256: 8df6b66d77c12e99b268a19c0ed6f88f33336b24c177fb0fdda88834ba631432.
Target build: /workspace/shared/arcproof-phase2-builds/mainnet.
Environment: dot cloud browser cdp tab 7, localhost http://127.0.0.1:4174 only; no user computer or public exposure. Server started through supported native cloud Terminal; PID 44.

## Verified
- Root shows Arc Mainnet (5042), real USDC, no trusted deployment, all sends disabled; private read-only unavailable panel states creation/payment/wallet connection/receipt verification disabled.
- Evidence current candidate identity correctly shows mainnet, Arc Mainnet /5042; all wallet actions disabled; manifest None (no trusted deployment); runtime Unknown (no trusted deployment).
- Evidence candidate hash exactly matches the assigned 8df6b66d…1432 snapshot. Build UTC displayed 2026-10-21T23:27:02.757Z. Source commit SHA remains Unknown, distinctly separate from candidate snapshot and verified base.
- Historical testnet deployment and historical tests remain explicitly labeled. Current tests remain Unknown in the UI rather than claiming fresh acceptance.
- Offline demo navigation succeeds, labels fixtures and no transaction/no wallet, and has only its separately labeled offline creation control. No simulation invoice was created.
- Retested /invoices, known-testnet /pay route, duplicate-tx /receipt query, malformed chain and percent values, extra path component: all show mainnet unavailable and only four navigation buttons, no connect/send/sign controls.
- Unknown route shows Unavailable route, not a wallet entry. Exact paths and complete AX snapshots are in route-results.json.

## Artifacts
01-root.png; 02-evidence-fixed.png; 03-offline-demo.png; 04-invalid-route.png; evidence-ax.txt; demo-ax.txt; route-results.json. Screenshots contain app status/build metadata and public historical testnet identifiers, no credentials or customer data. Pre-fix evidence is preserved in ../mainnet-browser-before-fix/.

## Scope and cleanup
No source edits, Argon calls, wallet interactions, RPC operations, signatures, transactions, deployment or publication. This is rendered UI QA, not chain acceptance or a network-instrumentation proof of no runtime calls. The separate 462-test, lint, type and build records were not rerun during this browser-only verification.
At 23:36 UTC, kill 44; wait 44 returned the owned Python process as Terminated and ARC_FINAL_SERVER_STOPPED in cloud Terminal. Shutdown verified.
