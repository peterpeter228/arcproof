# Dependency audit review, 2026-10-22

`bun audit --json` completed with exit 1 and reported five packages. The normalized result matches the existing baseline audit, and package.json/bun.lock are unchanged. This is not a clean audit, a formal security audit or proof of absence of vulnerable runtime paths. No critical advisory was reported and no critical runtime exploit path was established during this bounded review.

| Package | Installed | Official severity | Observed exposure and disposition |
|---|---|---|---|
| [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | 3.0.3 | High | Tailwind → chokidar/micromatch build globs. No invoice-input path; trusted repository inputs only. No patch listed. |
| [postcss-selector-parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | 6.1.4 | Moderate | Tailwind/postcss-nested build CSS. Trusted-source builds are excluded by the advisory's exposure statement. 7.1.6 fix lies outside parent 6.x ranges. |
| [elliptic](https://github.com/advisories/GHSA-848j-6mx2-7j84) | 6.6.1 | Low | Transitive crypto-browserify through polyfill tooling. Current Vite enables only buffer/process, not crypto; no application signing path established. No listed patch. |
| [decode-uri-component](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) | 0.2.2 | Moderate | WalletConnect/Reown/query-string transitive. Application uses injected connector and URLSearchParams. Installed utils parseUri uses URLSearchParams. No affected app input path established. 0.5.0 fix exceeds parent's ^0.2.2 range. |
| [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | 8.3.2 / 9.0.1 | Moderate | MetaMask/Coinbase transitive SDKs. Advisory affects v3/v5/v6 caller-supplied buffers; inspected calls use v4 without output buffers and validate. No affected call site found. Patched majors exceed parent ranges. |

## Evidence and limits

Installed manifests and `bun pm why` were checked. Source/source-map inspection supports the exposure assessment; absence of strings in a bundle is not proof of unreachability. Historical module-graph evidence is not presented as a new final-build graph. Raw current registry response: [dependency-audit.json](../../evidence/final-handoff-20261022/dependency-audit.json).

Do not use forced blanket major overrides to manufacture an empty audit. A dependency modernization change needs compatibility review, lint/types, all unit/security tests, both builds and actual wallet/UI regression. Keep builds confined to trusted source inputs and leave current deployment/payment restrictions in place. No dependency was upgraded in this pass.
