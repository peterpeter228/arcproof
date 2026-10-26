# Arc mainnet U1 — 2026-10-26

Operator JSON: [operator-deploy.json](operator-deploy.json). Independent RPC read: [rpc-verification.json](rpc-verification.json).

The creation transaction `0x3e94bdb67dcf28a12c224ab693b863220a2744766607136a0d88c7683124d503` succeeded on Arc mainnet chain `5042`. The contract is `0xd6b1C2A7F6C406E6BbB981F66847aff60D6600eE`. Block `27931307` is timestamp `2026-10-26T07:44:36Z`. Runtime bytecode matches `evidence/g1/ArcProofInvoices.artifact.json` (2296 bytes, keccak256 `0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c`). That hash also matches the historical testnet artifact because the bytecode is the same. It does not make the testnet address a mainnet contract.

`deploymentId` `0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa` is `keccak256(abi.encode(uint256(5042), address))`.

Code stage is **W2**: `PRODUCTION_MANIFEST` contains this deployment and `writesAccepted` is true. The operator stage name is **U1_deployed**. `createInvoice` and `payInvoice` have not run. `MAINNET_SAMPLE`, the payment transaction, the public App URL, and the video URL stay null.

Studio Deploy misclick testnet `0x0D54be3d3c17D73be58c1bAeDFBdBC2f79677018` is **not** mainnet. It is not the contract address in `PRODUCTION_MANIFEST`, `evidence/deployments.json` network `5042`, or `evidence/release-status.json` `mainnet.contract_address`. Historical testnet `0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30` stays on chain `5042002`.

Next gates: public App → `createInvoice(0.20 USDC)` → `payInvoice` → video. This directory does not publish, sign, or submit.
