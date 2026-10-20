# ArcProof

> Built with Arc Studio — invoice-bound native-USDC payment prototype, Arc Testnet only.

---

## Status

- **G1 complete**: contract written, tests passing, ABI exported. NOT deployed.
- **Grant status**: G0 pre-development restriction remains in effect. This prototype is authorized for testnet/local use only per owner directive 2026-10-20. Grant eligibility: HOLD. Do not claim G0 passed.
- **No mainnet activity**. No API keys created. No wallet secrets requested.

## What This App Does

ArcProofInvoices: an immutable, no-custody invoice contract for Arc Testnet native USDC (18 decimals).
Merchants create invoices; payers send the exact amount; the contract forwards atomically to the merchant.
No escrow, no admin, no upgrades, no fees.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS (NOT YET BUILT)
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry + OpenZeppelin 5.1.0 (paris EVM)
- Chain: Arc Testnet (Chain ID: 5042002)
- Token: native USDC, 18 decimals (Arc Testnet native gas token)

## Key Files

- `contracts/ArcProofInvoices.sol` — main contract
- `contracts/test/ArcProofInvoices.t.sol` — 51 unit + fuzz tests (T01–T17)
- `contracts/out/ArcProofInvoices.sol/ArcProofInvoices.json` — compiled artifact + ABI

## Contract Addresses

- Arc Testnet: NOT DEPLOYED YET
- Mainnet: none (prohibited)

## Reproducible Build

```bash
# Install dependencies (already in node_modules via bun)
bun install

# Build contract
bun run contracts:build   # forge build

# Run all tests
bun run contracts:test    # forge test
```

Toolchain pin:
- solc 0.8.28 (auto_detect_solc = false in foundry.toml)
- evm_version = paris
- @openzeppelin/contracts = 5.1.0 (package.json pinned)
- forge-std via lib/forge-std

## ABI Surface (state-changing)

- `createInvoice(uint256 amountNative, uint64 expiresAt, bytes32 termsHash) → bytes32 invoiceId`
- `payInvoice(bytes32 invoiceId) payable`

Read-only:
- `getInvoice(bytes32) → Invoice` — reverts UNKNOWN_INVOICE for missing IDs
- `nextNonce(address) → uint256`
- `MAX_INVOICE_AMOUNT() → uint256` (= 1e18)
- `AMOUNT_QUANTUM() → uint256` (= 1e12)
- `MAX_LIFETIME() → uint64` (= 604800)

## Invoice ID Formula

```
keccak256(abi.encode(uint256 chainId, address contractAddress, address merchant, uint256 nonce))
```
nonce starts at 0; nextNonce(address) returns next unused nonce.

## Amount Rules

- 18-decimal native USDC on Arc Testnet
- Must be > 0, <= 1e18 (MAX_INVOICE_AMOUNT), and divisible by 1e12 (AMOUNT_QUANTUM)
- 0.20 USDC = 200000000000000000 (18 dec)
- UI converts: decimal string → microUSDC integer (6 dec) × 1e12

## termsHash

Opaque bytes32 field. Stored verbatim; contract never gates on its value.
UI-layer enforcement of nonzero hash semantics is the caller's responsibility.
P0 UI always sends bytes32(0). Payment with any hash value is accepted by the contract.

## G1 Quality Gate Corrections Applied (2026-10-20)

- T15 force-send test: exact BALANCE_MISMATCH required, all invoice fields + nonce + payer balance asserted, false deferred-selfdestruct comment removed (Paris EVM transfers immediately)
- T15 prefund: separate test verifies prefunded balance preserved on successful payment
- T17 ozVersionPinned: tautology replaced with embedded lock-file + sha256 evidence (see evidence/g1-test-results.txt)
- Fuzz T16 revertOnWrongAmount: wrongAmount bounded BEFORE vm.assume
- T12: caught createInvoice reentry added (MERCHANT_CALL_FAILED path), uncaught path (nonce unchanged); guard selector 0x3ee5aeb5 asserted; rollback-of-merchant-flags caveat documented
- Grant comment corrected in ArcProofInvoices.sol: "free prototype development authorized, grant eligibility HOLD"

## G1 Spec Corrections Applied (2026-10-20)

1. `MAX_AMOUNT` → `MAX_INVOICE_AMOUNT`
2. `AMOUNT_PRECISION` → `AMOUNT_QUANTUM`
3. `payInvoice` no longer gates on termsHash (UNSUPPORTED_TERMS removed)
4. `getInvoice` reverts UNKNOWN_INVOICE for missing IDs (no longer returns zero struct)
5. Explicit `receive()`/`fallback()` removed; Solidity default rejection is sufficient

## To Run

```bash
bun install
bun run dev
```
