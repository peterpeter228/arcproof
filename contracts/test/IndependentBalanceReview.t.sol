// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Independent balance regression authored and run by a native independent reviewer.
// Not Argon; not a professional audit. Incorporated with attribution 2026-10-20.
// Helper contracts (ForceEther, ForceSendMerchant) are defined in ArcProofInvoices.t.sol
// and reused here via the import below. Assertions are preserved verbatim from the
// reviewer's submission; only whitespace was normalised for the formatter.
import "./ArcProofInvoices.t.sol";

contract IndependentBalanceReview is Test {
    function test_independentForcedBalanceRevertsExactlyAndRollsBack() public {
        ArcProofInvoices c = new ArcProofInvoices();
        ForceEther f = new ForceEther{value: 1 ether}();
        ForceSendMerchant m = new ForceSendMerchant(c);
        m.setForcer(payable(address(f)));
        vm.warp(10000); vm.roll(123);
        vm.deal(address(c), 7 ether);
        vm.prank(address(m));
        bytes32 id = c.createInvoice(0.2 ether, 20000, bytes32(uint256(9)));
        address payer = address(0x123456);
        vm.deal(payer, 2 ether);
        vm.prank(payer);
        vm.expectRevert(ArcProofInvoices.BALANCE_MISMATCH.selector);
        c.payInvoice{value: 0.2 ether}(id);
        ArcProofInvoices.Invoice memory inv = c.getInvoice(id);
        assertFalse(inv.paid); assertEq(inv.payer, address(0)); assertEq(inv.paidAt, 0); assertEq(inv.paidBlockNumber, 0);
        assertEq(inv.merchant, address(m)); assertEq(inv.amountNative, 0.2 ether); assertEq(inv.expiresAt, 20000); assertEq(inv.termsHash, bytes32(uint256(9)));
        assertEq(address(c).balance, 7 ether); assertEq(payer.balance, 2 ether); assertEq(address(m).balance, 0); assertEq(address(f).balance, 1 ether);
    }
}
