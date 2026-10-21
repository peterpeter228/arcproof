# UI-02 manual acceptance remaining

Status: NOT_RUN. This environment's browser launch was already blocked with socket Operation not permitted. No retry, alternative flags or alternate browser route was attempted in this task.

DOM/jsdom assertions and CSS inspection do not establish actual layout, focus appearance, screen-reader behavior, downloads or printed output.

When an authorized browser environment is available, check the integrated production build:

1. At 375 × 812 and 200% browser zoom, open the create form, payment page, verified and unverified receipt, unknown-deployment fallback, and offline simulation. Confirm no horizontal scrolling or obscured inputs/actions. Attribution must remain in the footer, never over content.
2. Tab through skip link, navigation, wallet control, fields, review and cancellation. Focus must be visible and unobscured. Skip link must focus main without replacing the payment/receipt hash route. Current navigation must be announced.
3. Submit create form with Enter. Disconnected/incorrect-chain/disabled/busy/review-open states must not bypass guards. A valid Enter submit opens review only, not the wallet. Wallet approval remains an explicit separate action. Verify receipt Enter submission remains read-only.
4. Confirm pending/recovery warnings remain visible, self-demo stays controlled_demo, unknown or conflicting evidence never becomes green success, and account/route changes retain existing safety invalidation.
5. Inspect screen-reader announcements for creation success, payment state, receipt result and errors. Check field descriptions link to the active errors. DOM role assertions are not an assistive-technology test.
6. Print both verified and incomplete receipts. Network/testnet truth, observed facts, reason/source/read timing, transaction identity and Studio attribution must remain readable. Forms, navigation, saved-wallet sidebar and ordinary footer metadata should not crowd the receipt. Confirm no clipping or fixed overlays; raw-details print behavior must be checked in the actual browser.
7. Compare displayed fee/block/reason/source/read timestamps with downloaded JSON on a failed-finality/native-transfer attempt. JSON preserves integer strings. CSV requires explicit Text import and real Excel/Sheets round-trip remains NOT_RUN.

Implemented palette spot checks exceed 4.5:1 for selected foreground/background pairs only. No full WCAG conformance claim is made. The 44px control height is a design target, not an assertion that WCAG AA universally requires 44px.
