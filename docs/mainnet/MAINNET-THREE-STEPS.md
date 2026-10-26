# Mainnet three steps (A deploy → B create invoice → C pay USDC)

- Draft: 2026-10-26 Asia/Shanghai (CST)
- Chain: **Arc Mainnet `5042`** — RPC `https://rpc.mainnet.arc.io` — Explorer `https://explorer.arc.io`
- Studio: `https://studio.arc.io/app/2dbdda0d-1b70-408b-ae23-cccb8a4b8753`
- Aligns with `docs/final-delivery-20261022/OWNER_ACTION_CARDS.md`, `JUDGE_DEMO_GUIDE.md`, `PRIVATE_MAINNET_PHASE` (no fake fills)
- Clean checkout **lacks** the script files behind `deploy:self` / Foundry `script/` — prefer Studio Deploy **or** owner-run `forge create` with a reviewed artifact
- Proposed demo principal (not approval): **0.20 USDC** = `200000000000000000` native (18 decimals); lifetime proposal **24h**; cap **1 USDC**/invoice

**Irreversible.** Real funds. No private keys in repo, chat, or evidence.

This document is an owner runbook. Checking it in does not deploy, sign, publish, or submit.

---

## Shared prerequisites (before A)

| Item | Who | Notes |
| --- | --- | --- |
| Candidate freeze (tag + hashes) | Owner / authorized agent | See [FREEZE-CANDIDATE.md](../freeze/FREEZE-CANDIDATE.md) |
| Studio final-candidate sync + export compare | Owner (Studio login) | Still `not_run` |
| Reviewed initcode / runtime hash for **this** freeze | Owner | Reference testnet runtime `0xa36ede95…344c` is **not** auto-approval of a later artifact |
| Wallet A = deployer + merchant | Owner signs | Address recorded; funded for gas (native USDC on Arc) |
| Wallet B = payer | Owner or second operator | Funded for **exact** invoice principal + gas |
| Confirm wallet network = `5042` | Signer | Recheck RPC/chain id before every signature |
| Mainnet App build path | After A+manifest | Need W2 (`PRODUCTION_MANIFEST` + `writesAccepted`) and preferably `{{PUBLIC_APP_URL}}` |

---

## (A) Deploy contract to Arc mainnet 5042

### Prerequisites
- Frozen contract source (`contracts/ArcProofInvoices.sol`), solc **0.8.28** / Paris / optimizer **200** (`foundry.toml`)
- No constructor args; deploy `value=0`
- Wallet A unlocked in Studio **or** local Foundry with key **never** committed
- Authorization to spend gas only (not a blanket spend approval for B/C)

### Commands / Studio clicks (as known from docs)

**Path 1 — Arc Studio (preferred for provenance narrative)**
1. Log into Studio project `2dbdda0d-1b70-408b-ae23-cccb8a4b8753`.
2. Ensure synced candidate matches freeze SHA.
3. Use Studio’s contract Deploy flow for Arc **Mainnet** (not Testnet). Exact UI labels may change — do **not** click Publish/App hosting unless C2 is intended in the same session.
4. Confirm chain id `5042`, empty constructor, reviewed bytecode.
5. Sign deploy with Wallet A; wait for success receipt.

**Path 2 — Local Foundry (if Studio deploy unavailable)**
```sh
# Example shape only — owner supplies RPC + key via env, never files in git
forge build
forge create contracts/ArcProofInvoices.sol:ArcProofInvoices \
  --rpc-url https://rpc.mainnet.arc.io \
  --broadcast \
  --private-key "$DEPLOYER_PRIVATE_KEY"
# Then independently: cast code <address> --rpc-url … | keccak256 → runtimeCodeHash
```
Scaffold npm aliases `deploy:self` / `compass:deploy` are **missing their script files** on a clean checkout — do not invent them.

### Evidence to capture
| Evidence | Example field |
| --- | --- |
| Contract address | `{{MAINNET_CONTRACT}}` |
| Deploy tx hash | `deployment_transaction` / `{{TX_HASH}}` (deploy) |
| Block number / timestamp | `deployedAt`, `deploymentBlockNumber` |
| Runtime bytecode keccak256 | Must match frozen artifact → `runtimeCodeHash` |
| Deployer address | Wallet A |
| Explorer URL | `https://explorer.arc.io/tx/<hash>` and `/address/<contract>` |
| Screenshots | Studio/Foundry success + Explorer code tab (no secrets) |

### Who must sign
**Wallet A (deployer)** — one contract-creation signature.

### After A (still gated)
1. Compute `deploymentId` (same scheme as testnet: `keccak256(abi.encode(uint256(5042), address))`).
2. Authorized code change: append `DeploymentRecord` to `PRODUCTION_MANIFEST`; set `MAINNET_RELEASE_POLICY`; update `evidence/deployments.json` + `release-status.json`.
3. Rebuild: `VITE_ARCPROOF_NETWORK=mainnet bun x vite build`.
4. Do **not** proceed to B until writes stage is intentionally **W2**.

---

## (B) Create invoice via App

### Prerequisites
- (A) complete; App points at trusted mainnet deployment (W2)
- Prefer hosted `{{PUBLIC_APP_URL}}`; localhost mainnet build acceptable for operator demo if later disclosed
- Wallet A connected as **merchant**
- Agreed `amountNative` (e.g. `200000000000000000`), `expiresAt` (absolute; within `MAX_LIFETIME` 7d), `termsHash` (prototype often zero `bytes32`)

### Commands / UI (from OWNER_ACTION_CARDS + JUDGE_DEMO)
1. Open mainnet App → `#/invoices` (or equivalent create flow).
2. Connect Wallet A (EOA).
3. Enter amount / lifetime; review card (amount, contract, fee cap, atomic forward).
4. Confirm `createInvoice(amountNative, expiresAt, termsHash)` with `value=0`.
5. Approve in wallet; wait for receipt; copy **invoiceId** + create tx hash.
6. Do **not** retry blindly if wallet result uncertain — read-only investigate first.

Callable shape (human summary — use frozen ABI for calldata):

```text
createInvoice(uint256 amountNative, uint64 expiresAt, bytes32 termsHash)
```

### Evidence to capture
| Evidence | Field |
| --- | --- |
| Invoice id (`bytes32`) | `invoice_id` |
| Creation tx hash | `creation_transaction_hash` |
| Merchant / amount / expiry | screenshot + export |
| Explorer link | create tx |
| App build identity | `payment_initiating_app_commit` (if this build also pays) or record create-build separately |

### Who must sign
**Wallet A (merchant)** — `createInvoice` transaction.

---

## (C) Pay with real USDC

### Prerequisites
- Unpaid, unexpired invoice from (B) on same contract
- Wallet B ≠ claim of “customer revenue” if operator-controlled — label **operator-controlled demonstration** when true
- Wallet B holds **exact** `amountNative` + gas; wrong amount reverts (`WRONG_AMOUNT`)
- Fresh read: invoice state, trusted runtime code, prepared payment checks in App

### Commands / UI
1. Open **pay** link from App (invoice URL) in Wallet B session.
2. Review prepared payment (contract, amount, merchant forward).
3. `payInvoice(invoiceId)` sending **exact** native USDC `value=amountNative`.
4. Sign; wait for success; open receipt route **without** requiring payer wallet for verify.
5. Confirm Explorer: `InvoicePaid` event + native Transfer legs (payer→contract→merchant) + finalized block per settlement policy.

### Evidence to capture
| Evidence | Field |
| --- | --- |
| Payment tx hash | `payment_transaction` / `{{TX_HASH}}` (pay) |
| Receipt URL (public) | `receipt_url` / `#/receipt/5042/<deploymentId>/<invoiceId>?tx=…` |
| Verification status + UTC time | `verification_status`, `verified_at_utc` |
| Amount | `payment_amount_usdc` (e.g. `"0.20"`) |
| Operator-controlled? / distinct addresses? | honest booleans |
| Video segment | Explorer + live verify (per VIDEO_OUTLINE) — no mock |
| Optional JSON/CSV export | Must not upgrade simulated fields |

Then set `MAINNET_SAMPLE = { chainId: 5042, deploymentId, invoiceId, txHash }` in an authorized PR.

### Who must sign
**Wallet B (payer)** — `payInvoice` with exact native value.
(If A and B are the same person/operator, disclosure is mandatory; same-wallet self-pay is weaker than two-address demo.)

---

## End-state checklist (gates 2–4)

| Gate | Done when |
| --- | --- |
| 2 Mainnet deploy | Explorer contract + runtime hash match + manifest filled |
| 3 Public App | Anonymous `{{PUBLIC_APP_URL}}` mainnet build calling that contract |
| 4 Real USDC | Pay tx + Verified receipt via App, recorded in submission-state |

Studio sync (gate 1 narrative) and video / DoraHacks submit remain separate owner actions.

---

## Stop / do-not

- No testnet screenshots as mainnet proof
- No filling nulls with projected hashes
- No second deploy/pay “to clean the record” while a prior request may still broadcast
- No secrets in evidence repos or docs
