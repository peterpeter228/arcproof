# ArcProof DEP-01 / DEP-02 bounded remediation

Date: 2026-10-21. Private, local only. No wallet, provider keys, Studio, deploy, network-chain operation, GitHub push or new override.

## Result

DEP-01 remedied for the configured headless test workflow. DEP-02 partially remedied: unused SDK families removed and core-polyfill aliases narrowed; broad wallet UI dependency chunks and an existing TypeScript peer mismatch remain. This is not a declaration of a vulnerability-free production app.

Base: original integrated tree verified by integration worker against all 287 Git blobs of remote main 42e9ac9d46f7769b9fa428e27511edd66e76c1c9. Isolated copy receiptVerifier SHA256 b8dc2a4ab97cb7a3abc98203093f64c322c897b5ca7c621c23fa93c03ae75d9a matches restored base. Local isolation commit is only a filesystem snapshot, not a remote commit.

Patch: ../arcproof-dependency-fix-20261021.patch. Three files only:
- package.json: remove seven unused @circle-fin SDKs and unused @vitest/ui; pin Vitest 4.1.12, Vite 6.4.4, polyfill plugin 0.24.0. Remove --fix from both lint passes, preserving source type-aware and repository-wide checks.
- bun.lock: synchronized resolution. No forced security overrides. Existing viem override retained; actual viem 2.57.5 and wagmi 2.19.5 unchanged.
- vite.config.ts: current vitest/config type reference; explicitly allow only buffer/process core aliases, preserving Buffer/process/global browser shims. Existing local Host/CORS boundary unchanged.

No source test/assertion changed, skipped, deleted, weakened or rebaselined. No application logic changed.

## Choice and primary sources

The npm registry was queried fresh, not blind latest. Metadata saved in vitest-registry.json, vite-registry.json, polyfills-registry.json.
- https://registry.npmjs.org/vitest/4.1.12 : engines ^20 || ^22 || >=24; Vite peer ^6 || ^7 || ^8. Optional UI peers need not be installed. Vitest internal packages all exactly 4.1.12.
- https://v4.vitest.dev/guide/migration.html : Vitest4 supports Vite>=6 and Node>=20; removes old Tinypool execution pool.
- https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8 : Oct16 advisory, manual mock code-injection fix explicitly backported to 4.1.12.
- https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp : Windows redirect bypass fix explicitly backported to 4.1.12.
- https://github.com/vitest-dev/vitest/security/advisories/GHSA-p458-7748-mcp3 : latest server.fs.deny issue affects v5 UI/browser/API server ranges, not this headless v4 workflow. We did not introduce UI/API servers.
- https://vitest.dev/guide/migration/ : v5 changes engines/default mock clearing; unnecessary for this minimal fix because the supported v4 backport is available.
- https://registry.npmjs.org/vite-plugin-node-polyfills/0.24.0 : Vite6 peer supported (0.22.0 only supported older Vite).
- https://github.com/davidmyersdev/vite-plugin-node-polyfills : include/global configuration documented upstream.

Verified environment: Node24.19.0, Bun1.4.3, Vite6.4.4, Vitest4.1.12. Recursive installed-package engine check: 783 manifests, zero Node engine conflicts. Bun is package installer/script launcher; Vitest executes under Node. Do not infer compatibility with arbitrary older Node or Bun.

## Validation

- Truly empty node_modules and new empty Bun cache: bun install --frozen-lockfile --ignore-scripts passed (697 packages). No lifecycle scripts were enabled. frozen-cold.log / .exit.
- 320 project assertions: passed unchanged, both initial and final config.
- 137 independent adversarial assertions: passed unchanged, both initial and final config.
- 24 independent jsdom UI/wallet assertions: passed unchanged, both initial and final config.
- TypeScript source/scripts: passed.
- Source lint and source type-aware lint: passed.
- Production build: passed. Existing large wallet chunk warnings remain, not suppressed.
- Real local development HTTP/Host/CORS/HMR + production graph + local preview security boundary: 10 passed. security.log and security/ outputs.
- Repository lint is intentionally not claimed here; parallel QA worker owns existing helper lint fixes. The lint command is now non-mutating.
- Frozen install is separate from peer completeness: npm ls --all still exits1 for pre-existing TypeScript7 vs optional Solana5 peer constraints through wagmi/connectors -> base-org/account -> coinbase/cdp-sdk. Baseline also had this plus Vitest/UI, Vite/polyfill, Solana codec and utf-8-validate conflicts. Tooling peer conflicts are removed, but whole dependency peer graph is NOT fully green. No major wallet migration or compiler downgrade attempted.

Reproduction, from patched repository:
1. bun install --frozen-lockfile --ignore-scripts
2. node node_modules/vitest/vitest.mjs run
3. node node_modules/vitest/vitest.mjs run --config qa/native-settlement-review/vitest.config.ts
4. node node_modules/vitest/vitest.mjs run --config qa/new-independent-review/vitest.config.ts
5. node node_modules/typescript/bin/tsc --noEmit
6. node node_modules/oxlint/bin/oxlint src scripts
7. node node_modules/oxlint/bin/oxlint --type-aware src scripts
8. node node_modules/vite/bin/vite.js build
9. node --test qa/debug-security/boundary.test.mjs
10. bun audit --json ; npm ls --all --json (nonzero expected for disclosed residuals)

## Import, graph and advisory scope

Actual src/scripts/qa/config search found no @circle-fin or @vitest/ui imports, no --ui use. Circle SDK functionality was not implemented in the app; removing them removes unused SDK/Firebase/grpc/Anchor families, not the injected wallet behavior. Existing src/config.ts remains injected-only, and ConnectKit is used by main/Layout/TestnetScreens, so removing ConnectKit or changing wallet connector majors is not justified by this pass.

Fresh Rollup module inspection (bundle-modules.json) confirmed only Buffer/process/global Node shims were rendered. Thus narrowed include list retains these globals but no blanket crypto/fs/stream aliases. crypto-browserify/elliptic remain installed through the plugin but have no rendered modules in the inspected browser graph. We did not claim this physically removes all polyfill packages.

Old Vitest2, nested Vite5, esbuild0.21, Tinypool, UI package nodes are absent from final lock. Optional peer strings mentioning UI are metadata, not installed UI.

Fresh registry audit counts are package-advisory records, not unique vulnerabilities or production exploit counts:
- Baseline: 14 package names, 41 records (3 critical / 11 high / 21 moderate / 6 low).
- Candidate: 5 package names, 5 records (0 critical / 1 high / 3 moderate / 1 low).

Remaining records:
1. braces3.0.3, high GHSA-vfj7-8cjw-p6xm (https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): Tailwind -> chokidar/micromatch build-time glob path. No rendered browser module. Untrusted deeply nested build patterns are the relevant entry, not receipt payment input.
2. postcss-selector-parser6.1.4, moderate GHSA-rj75-hqrm-r3gf (https://github.com/advisories/GHSA-rj75-hqrm-r3gf): Tailwind/postcss-nested CSS build parser. No rendered browser module. Untrusted build CSS/selectors are relevant; no claim of payment-page exploitation.
3. elliptic6.6.1, low GHSA-848j-6mx2-7j84 (https://github.com/advisories/GHSA-848j-6mx2-7j84): polyfill plugin -> node-stdlib-browser -> crypto-browserify -> browserify-sign/create-ecdh. Not rendered in inspected browser graph; crypto polyfill alias disabled. Does not establish a wallet-signature weakness here.
4. decode-uri-component0.2.2, moderate GHSA-vcc3-ghjq-m6fr (https://github.com/advisories/GHSA-vcc3-ghjq-m6fr): production-class dependency wagmi/connectors -> WalletConnect utils -> query-string. No separately rendered decode-uri/query-string module in graph; WalletConnect/Reown prebundled modules ARE emitted. Cannot equate absence of standalone module with complete proof of absence from all prebundled code. Current injected-only config does not establish a reachable WalletConnect URI decode entry. Residual tracking needed if connector/URI behavior changes.
5. uuid8.3.2/9.0.1, moderate GHSA-w5hq-g745-h8pq (https://github.com/advisories/GHSA-w5hq-g745-h8pq): production-class MetaMask/Gemini/Coinbase connector dependencies. Advisory concerns v3/v5/v6 supplied-buffer calls, not every uuid call. No standalone uuid/MetaMask module rendered in inspected graph; exact vulnerable function use not established. Retained pending targeted wallet-parent migration, not forced uuid override.

WalletConnect/Reown/w3m chunks remain emitted despite injected-only app setup. Broad barrel imports/ConnectKit dependencies preserve these optional code paths. Module graph had 68 WalletConnect and318 Reown records; counts include repeated chunks and nested versions and are not runtime execution evidence. Bundle reduction beyond this needs a separately verified wallet UI/connector design, not blind dependency deletion. Real wallet interaction/signatures were not performed in this pass; synthetic UI/wallet assertions pass.

Scope conclusion: DEP-01 headless test-chain defect fixed. DEP-02 dependency hygiene improved, but wallet chunk width and TypeScript peer debt remain explicitly open. No production critical exploitation was demonstrated before or after.
