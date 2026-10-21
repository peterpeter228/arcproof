# Fresh dependency and contract recheck, 2026-10-21 UTC

Baseline: 94a84c44b02d52a827bed42fc9f9a5d414619b7d. Evidence-only work in isolated arcproof-baseline. No runtime changes, dependency upgrades, overrides, wallet, deployment or remote mutation.

## Contract verification

Installed existing tools/g1-review/package-lock.json with npm ci --ignore-scripts --no-audit --no-fund. Reviewed package manifests: @foundry-rs/forge has a postinstall binary selector, which was disabled; invoked the official @foundry-rs/forge-linux-amd64 binary directly. Forge 1.7.1 commit4072e48705af9d93e3c0f6e29e93b5e9a40caed8 matches .foundry-version. Compiler solc-js0.8.28 matches foundry.toml. Existing wrapper only accepts --version/--standard-json and compiles stdin; an executable copy was used. Test source inspection found no ffi, fork or environment-secret calls.

Command: tools/g1-review/node_modules/@foundry-rs/forge-linux-amd64/bin/forge test --offline --use ./tools/g1-review/solc-wrapper-run.cjs

Result:73 passed,0 failed,0 skipped across5 suites,26 files compiled. A selfdestruct deprecation warning belongs to the force-balance test fixture. This is local EVM testing, not an Arc deployed-bytecode or mainnet acceptance claim. Full log and exit code: foundry-tests.log / foundry-tests.exit.

## Fresh dependency scope

Fresh bun audit returns the same five advisory families. Fresh production build records every Rollup chunk module in rendered-modules.json. Separate modules for braces, selector-parser, elliptic, decode-uri-component, query-string and uuid are absent. WalletConnect68 and Reown318 module records remain; prebundled dependency internals prevent inferring complete absence from module-name filtering alone. These counts are not runtime execution counts.

1. braces3.0.3, high: recursive brace-pattern processing can exhaust stack depth. Installed parents are Tailwind3.4.19 -> chokidar3.6.0 (~3.0.2) and micromatch4.0.8 (^3.0.3). Build-time glob input, not invoice/payment text, is the observed path. No browser module. Official advisory lists no patched version, so a blind patch bump is not a fix. Keep build patterns trusted and review upstream remediation. Source: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm

2. postcss-selector-parser6.1.4, moderate: long flat selectors can cause quadratic parsing work. Tailwind3.4.19 (^6.1.2) and postcss-nested6.2.0 (^6.1.1) require6.x; input is repository CSS/config, not runtime receipt fields. Official fix7.1.6 lies outside both parent ranges. Fresh registry shows latest Tailwind3 remains3.4.19 with6.x requirement. Updating to Tailwind4 or overriding parser7 requires a separate compatibility/visual migration, not a safe no-op. Source: https://github.com/advisories/GHSA-rj75-hqrm-r3gf

3. elliptic6.6.1, low: ECDSA nonce handling can create incorrect signatures and expose signing secrets. Installed through node-stdlib-browser crypto-browserify dependencies; current polyfill allowlist is buffer/process, no crypto alias, no elliptic rendered module, and app wallet signing is delegated. No reachable elliptic signing path established. Advisory lists no patched version. Removing the broad polyfill plugin in favor of proven narrow globals is a potential later build migration, not performed. Source: https://github.com/advisories/GHSA-848j-6mx2-7j84

4. decode-uri-component0.2.2, moderate: crafted malformed encoded text can cause excessive decoding work. Installed via WalletConnect utils -> query-string7.1.3 (^0.2.2). Source-map inspection adds a useful correction: installed WalletConnect parseUri uses URLSearchParams, not query-string; no query-string import found in inspected utils source map. App config instantiates only injected(), not WalletConnect. No concrete malicious payment-link path into this decoder found, but broad prebundled wallet code remains, so this is not an absolute unreachable proof. Fixed0.5.0 is outside parent range; newer WalletConnect2 releases exist, but verifying their full parent graph was blocked by registry403/cancelled network approval. No retry or alternate-route bypass. Source: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr

5. uuid8.3.2/9.0.1, moderate: advisory applies to v3/v5/v6 APIs with externally supplied output buffers/offsets, not every UUID call. Inspected MetaMask SDK/communication-layer source maps import v4 for anonymous/channel IDs and validate for checking; @metamask/utils filesystem helper uses v4. No vulnerable supplied-buffer call found in inspected parents, and no separate MetaMask/uuid rendered module. This narrows but does not prove absence across every opaque bundle. Fixed11.1.1 is outside existing8/9 major requirements. Fresh registry shows latest @metamask/utils11 remains11.12.1 requiring uuid9; a forced uuid override is inappropriate. Source: https://github.com/advisories/GHSA-w5hq-g745-h8pq

## Scope and unresolved work

No exploit demonstrated against this app. No zero-vulnerability claim. Build-source trust, advisory tracking and wallet bundle debt remain. Exact newer-wallet parent upgrade path is unverified because the final metadata requests failed403 and network approval was cancelled; requests were not repeated. Contract gates are now fresh, but browser, real wallet and deployed version acceptance are separate.

Supporting artifacts: current-audit.json, dependency-rendered-summary.json, rendered-modules.json, dependency-import-sites.json, dependency-call-sites.json, tailwind3-registry.json, metamask11-registry.json, walletconnect2-registry.json. These are findings against unchanged baseline, not automatic verification of subsequent source edits.
