# Build provenance v2: explicit scopes, not an attestation

The source snapshot is a sorted path/SHA-256 list over declared inputs, not a Git HEAD string and not a fixed number of files. sourceCommit stays null for a materialized/modified candidate. verifiedBaseCommit, when supplied, identifies only the separately verified base. Source changes produce a new snapshot; historical Stage B records are not overwritten.

Declared scopes:

- Application: src, public and frontend/tool configuration plus package.json and bun.lock. Studio console-capture.ts and tracing.ts count whenever present, even if added only in Studio.
- Contract build and tests: contracts (including contracts/script), checked-in lib/forge-std, foundry.toml, remappings.txt and root ABI.
- Build and deployment tools: scripts and tools, including wrappers and their dependency locks. Deployment helpers are not dismissed as cache.
- Imported test evidence: the two explicitly required fixture/reference artifacts imported by tests, not every historical report or log.

Only configured generated paths out, cache, dist, contracts/out and contracts/cache are excluded. Installed dependency/VCS/cache directory names node_modules, .git and .vite are excluded from the common source input scope. An application file under src/cache or an asset under public/dist remains an input. Symlinks fail closed rather than silently omitting their target.

The checked-in historical contract artifact has a separate reference record: compiler's full version, EVM/optimizer/remappings/compilation target/metadata settings and source paths are taken from its actual metadata. Current bytes of the referenced sources and installed OpenZeppelin dependencies are fingerprinted separately; missing inputs are reported. This does not assert that the historical artifact was freshly compiled from current inputs. Fresh compilation, tests and runtime agreement need separate version-bound command evidence. Locally available Node, Bun, Vite, Forge and solc-js versions are recorded; unavailable tools remain null and toolchain binaries are not attested.

Compare approved input records with the Studio export using compareInputRecords: missing, modified and additional files are reported separately. A matching shared scope does not imply that all Studio workspace files match. Extra workspace inputs must be reviewed, included where used, or explicitly described as unused differences. This code does not claim Studio synchronization occurred.

After Vite writes final output, all actual output files are SHA-256 hashed, including copied/nested public assets. Only root build-provenance.json excludes itself. Remote delivery acceptance must retrieve index, JS, CSS, assets and provenance from the actual host and compare those bytes with the published build. A local output manifest or matching source hash alone cannot prove CDN bytes, tests, deployment or payment.
