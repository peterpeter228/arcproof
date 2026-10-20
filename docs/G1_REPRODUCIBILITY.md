# G1 local contract checkpoint

This persists the stable Studio export captured at 2026-10-20 04:27:55 UTC, not the changing G2 workspace. Source contract and exported tests remain byte-identical. Two supplementary native review suites add four tests, making 73 rather than the exported 69. Studio AGENTS is archived for provenance only; root AGENTS.md remains authoritative.

## Verified result

Independent local execution: 73 passed, 0 failed, 0 skipped across five suites, seed 0x1234, fuzz 256 cases. See evidence/g1/independent/REVIEW.md and final-forge.log. ABI, creation bytecode and runtime bytecode equal the clean independent build; see artifact-coherence.json. This is a narrow local contract gate, not an audit, UI acceptance, Arc-network test or deployment.

Compiler 0.8.28, Paris target, optimizer 200; Foundry 1.7.1; OpenZeppelin 5.1.0. forge-std source and licenses are vendored from the exact export; its file hashes are in the snapshot manifest. No install scripts or deployment scripts are required to run the contract tests.

## Local reproduction

The original review used the absolute paths recorded in REVIEW.md. For a fresh Linux x86_64 checkout, a portable adaptation of the same compiler wrapper is included under tools/g1-review. The following relocation recipe is documented but has not been re-run after repository relocation:

1. npm ci --prefix tools/g1-review --ignore-scripts
2. mkdir -p node_modules && ln -s ../tools/g1-review/node_modules/@openzeppelin node_modules/@openzeppelin
3. chmod +x tools/g1-review/solc-wrapper.cjs
4. tools/g1-review/node_modules/@foundry-rs/forge-linux-amd64/bin/forge test --offline --use ./tools/g1-review/solc-wrapper.cjs --fuzz-seed 0x1234 -vv

Only create the symlink in a fresh checkout with no conflicting existing @openzeppelin path. The contract source remapping remains unchanged. Standard installed Foundry 1.7.1 and solc 0.8.28 can alternatively run forge test after the pinned OpenZeppelin dependency is present.

## Export boundaries

Studio package.json, bun.lock and Vite scaffold are preserved as source provenance, not evidence that G2 frontend is complete. Some Studio package scripts reference deployment/check helpers intentionally excluded from this safe G1 snapshot; do not execute those scripts or treat them as supported instructions. The frontend scaffold may include Studio RPC/tracing instrumentation and is not approved for production. G2 must independently review/replace it before publishing or signing.

Excluded: node_modules, .env and account data, caches, unrelated generated artifacts, deployment scripts and private logs. Retained generated artifact is evidence only under evidence/g1, not a live deployment configuration. No real network transactions occurred. Root AGENTS and original docs/source are preserved.
