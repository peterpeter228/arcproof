# Public App and mainnet sample — 2026-10-26

Checked at `2026-10-26T08:35:03Z` (Asia/Shanghai date `2026-10-26`).

## Public App

Anonymous GET `200` of https://zippy-narwhal-31f5db.netlify.app. Final URL is that same host. The HTML generator is Arc Studio. The Netlify marker is `data-nf-variant="public"`. This is the Studio→Netlify public App, not a `preview.studio.arc.io` preview.

The HTML shell does not inline chain id `5042`. Its module `/assets/index-CZTJDUib.js` (also GET `200`) contains Arc Mainnet `id:5042`, contract `0xd6b1C2A7F6C406E6BbB981F66847aff60D6600eE`, deployment id `0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa`, and `deployedAt` `2026-10-26T07:44:36Z`. The home template renders “Trusted” plus that deployment date. The module was built at `2026-10-26T08:22:57.104Z`, before `MAINNET_SAMPLE` was added in source, so the live home page does not yet link the sample. The receipt route below is the public locator.

Studio Deploy misclick testnet `0x0D54be3d3c17D73be58c1bAeDFBdBC2f79677018` is absent from that module and is not stored in any mainnet field. Details: [anonymous-get.json](anonymous-get.json).

## Sample payment

`MAINNET_SAMPLE` is only the locator `{ chainId: 5042, deploymentId, invoiceId, txHash }`. `txHash` is the pay transaction.

Read from `https://rpc.mainnet.arc.io` (chain id `5042`):

- Pay `0x94c559e0816b8e741f2cbf4fe764ed8e7dcfeab447ba8ac700f6f7e7ec4b82ce`, status `0x1`, to `0xd6b1C2A7F6C406E6BbB981F66847aff60D6600eE`, block `27936503`, timestamp `2026-10-26T08:28:30Z`
- InvoicePaid log index `6`, invoice `0xe23fad9eb20137dc97b4b54e666fcb0a90f7447c82935a0285494b77aa80d6ae`
- Payer `0x54145b97d5CeCf72b9900C702a02774171574171`
- Merchant `0xf22c752EBeB09d3eD8C6b8ba04c7F299D1C9C960`
- Amount `0.20` USDC, native `200000000000000000` (`0x02c68af0bb140000`), on both native Transfer legs and the InvoicePaid data
- Create `0x496b6a29441cd2c7af201c301d3860f34e329fb7d9ab4f7706cab74d7aa22c45` was labeled operator-reported and was re-read here: status `0x1`, same contract, same invoice, merchant sender, same amount

Receipt: https://zippy-narwhal-31f5db.netlify.app/#/receipt/5042/0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa/0xe23fad9eb20137dc97b4b54e666fcb0a90f7447c82935a0285494b77aa80d6ae?tx=0x94c559e0816b8e741f2cbf4fe764ed8e7dcfeab447ba8ac700f6f7e7ec4b82ce

This read is not an in-app VERIFIED badge, a finality acceptance run, an audit, or customer revenue. `PRODUCTION_MANIFEST` settlement and contract fields were not changed. Video URL and DoraHacks submission stay empty.

Raw receipts: [rpc-verification.json](rpc-verification.json). The earlier U1 file [../mainnet-u1-20261026/rpc-verification.json](../mainnet-u1-20261026/rpc-verification.json) still records `app_url: null` because that check was `2026-10-26T07:50:51Z`, before this App and payment.
