# Local debug-exposure hardening (SEC-01 / DEV-01)

This native patch changes the Arc Studio export; it is not a Studio-generated revision or a deployment. Studio attribution in the entrypoint, watermark and wallet config remains intact. No wallet, network transaction, publication, dependency upgrade, or interface redesign is part of this patch.

## Changes

- Removed `src/tracing.ts` and `src/console-capture.ts`, their entrypoint side-effect imports, and the separate `registerChain` import/call in `src/config.ts`. The latter was an independent route into the capture module: removing only the entrypoint import was insufficient.
- There is no runtime debug switch and no supported parent-frame telemetry bridge in development or production. Fetch, wallet-provider results, console messages and errors are not forwarded by these removed modules. This is not a claim that all third-party dependencies are free of network/telemetry functionality.
- Vite development and local preview explicitly bind to `127.0.0.1`, allow no additional Host names, and disable CORS. Ordinary same-origin local use and HMR remain supported. Vite's built-in localhost/IP Host handling still applies; this setting is not a firewall or authentication system.
- No trusted Studio preview origins were inferred from the Studio branding or the document referrer. Remote Studio preview access/debug capture is deliberately not enabled. A future need must establish exact legitimate hosts/origins and separately review the integration, rather than restoring `allowedHosts: true`, `cors: true`, a wildcard, or referrer-based authorization.

## Reproduce

Use the existing locked dependencies. No package or lockfile changes are required. Commands from the repository root:

```sh
node_modules/.bin/vitest run
node_modules/.bin/tsc --noEmit
node_modules/.bin/oxlint src scripts
node_modules/.bin/oxlint --type-aware src scripts
node --test qa/debug-security/boundary.test.mjs
```

The boundary suite uses Node's built-in WebSocket (Node 22+; validated here with Node 24.19.0) and the already-installed Vite. It makes synthetic requests only to its own ephemeral loopback servers. It builds fresh production output into `qa/debug-security/generated/dist`, inspects the Rollup module graph including the config path, scans every emitted file for the removed bridge's protocol/hook identifiers, and writes hashes to `generated/artifact-scan.json`. It does not merely assert a disabled runtime flag or scan an old `dist`.

The seven jsdom entrypoint cases exercise untrusted, opaque, missing, wildcard, wrong-source, Studio-looking, and same-origin parent messages, with/no referrer. They verify no capture listeners, no fetch/provider/console replacement, and no parent forwarding after synthetic activity. Dependencies and rendering are mocked; these are not real-browser wallet tests. Actual built dependency inclusion is checked independently by the production graph test.

The boundary suite checks the resolved defaults, local document and module serving, a working HMR connection, hostile Host rejection, absent CORS grants for attacker/opaque/other-loopback-port origins, and local production-preview boundaries. An intentionally vulnerable isolated mutation restoring only the original config-to-tracing path must fail the production graph/output test, even with clean entrypoint imports. The mutation is not shipped.

## Verification boundary

Local tests do not establish any live deployment's iframe policy or security headers. Before a future authorized publication, read back the actual HTTP `Content-Security-Policy` response header and verify a restrictive `frame-ancestors` policy against the real hosting/embedding requirements. A meta CSP is not a substitute for this header. No CSP deployment or actual Studio cross-origin preview acceptance is claimed here. Existing on-chain, raw RPC/finality, two-wallet, professional-audit and grant-eligibility gaps remain unchanged.
