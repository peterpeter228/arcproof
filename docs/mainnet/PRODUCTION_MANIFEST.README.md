# PRODUCTION_MANIFEST template — field guide

Sibling file: [PRODUCTION_MANIFEST.template.json](PRODUCTION_MANIFEST.template.json)

This template is documentation. It is not imported by the app. Runtime values stay in code:

| Code / evidence | Role |
| --- | --- |
| `src/arcproof/manifest.ts` | `DeploymentRecord`, `PRODUCTION_MANIFEST` (currently `[]`) |
| `src/arcproof/networkReleasePolicy.ts` | `MAINNET_RELEASE_POLICY` |
| `src/arcproof/mainnetSample.ts` | `MAINNET_SAMPLE` locator |
| `src/arcproof/networkPolicy.ts` | `ARC_MAINNET` chain `5042`, `MAINNET_CONTEXT` |
| `src/arcproof/arcSettlement.ts` | `ARC_MAINNET_SETTLEMENT_POLICY` |
| `src/arcproof/testnet.ts` | Reference for how a **real** `DeploymentRecord` looks |
| `evidence/release-status.json` → `mainnet` | Stage U0 honesty |
| `evidence/deployments.json` → `networks["5042"]` | Reserved slot `arcproof-v1-mainnet-01` |
| `docs/final-delivery-20261022/submission-state.json` → `mainnet` / `publication` | Contest worksheet |

JSON itself cannot carry comments; explanations live here.

Real mainnet addresses in this template stay `null`. The block `known_non_mainnet_reference_DO_NOT_COPY_TO_MAINNET_FIELDS` repeats already-public testnet identity so it is not mistaken for a mainnet fill.

---

## `PRODUCTION_MANIFEST` / `DeploymentRecord`

| Field | Type | Meaning | Pre-mainnet value |
| --- | --- | --- | --- |
| `deploymentId` | string (`0x` + 64 hex recommended) | Immutable opaque id; testnet used `keccak256(abi.encode(uint256(chainId), address))` | `null` / omit entry |
| `chainId` | number | Must be `5042` for mainnet rows | `5042` in shape only |
| `contractAddress` | `0x` + 40 hex | Checksummed deployed address | `null` |
| `runtimeCodeHash` | `0x` + 64 hex | `keccak256` of **runtime** bytecode; receipt verifier binds to this | `null` |
| `label` | string | Human label only — **never** trusted for security | e.g. placeholder label |
| `deployedAt` | ISO-8601 string or `null` | Deploy timestamp; registry rejects rows without `deployedAt` when registering | `null` |
| `settlementPolicy` | object | Must equal `ARC_MAINNET_SETTLEMENT_POLICY` exactly (`id`, `emitter`, `decimals`, `finality`, `chainId`) | Use shape in template |

**Security rule (from manifest.ts):** URL / localStorage may locate an `invoiceId`, never override contract address, chainId, or merchant for that deployment.

Empty array `[]` is the correct production state until a verified on-chain deployment exists.

---

## `MAINNET_RELEASE_POLICY`

| Field | Meaning | Current |
| --- | --- | --- |
| `activeDeploymentId` | Which manifest row may become the write target | `null` |
| `writesAccepted` | Explicit release acceptance for wallet sends | `false` |

Writes enable only when: trusted context + non-null deployment + `writesAccepted` + active id matches (`networkPolicy.ts` → stage **W2**). Stages: **U0** none, **R1** trusted read-only, **W2** writes.

---

## `MAINNET_SAMPLE`

Locator only (not a saved receipt). All four fields required for `mainnetSampleHref`:

| Field | Meaning |
| --- | --- |
| `chainId` | Literal `5042` |
| `deploymentId` | Must resolve inside `PRODUCTION_MANIFEST` |
| `invoiceId` | `bytes32` invoice id |
| `txHash` | Payment transaction hash |

Add **only** after an actual application payment and separate publication approval. Current code: `null`.

---

## Evidence / submission mirrors

These are **not** TypeScript exports but must stay consistent after fill:

- `evidence/release-status.json` `mainnet.*` — stage, tx hashes, receipt_url
- `evidence/deployments.json` `networks["5042"]` — richer deploy metadata (compiler, block, deployer)
- `submission-state.json` `mainnet.*` + `publication.*` — DoraHacks worksheet; deadline recorded as 2026-11-02 12:59 Asia/Shanghai

Testnet constants in `known_non_mainnet_reference_*` are **reference only**. Copying them into mainnet fields is a disqualification risk.

---

## How to use this template later

1. Keep this file as the checklist.
2. After a real deploy and runtime verify, edit `manifest.ts`, `networkReleasePolicy.ts`, and `mainnetSample.ts` with real values. Do not load this JSON as runtime input.
3. Update evidence JSON and submission-state in the same change set.
4. Never commit explanatory wrapper text into `src/`.
