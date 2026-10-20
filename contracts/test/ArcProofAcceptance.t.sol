// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title ArcProofAcceptance — I01–I09 Acceptance Tests
 *
 * Coverage map vs. spec acceptance criteria (I-prefix = integration/acceptance):
 *
 *   I01  Happy-path end-to-end: create → pay → read paid state, all fields correct
 *   I02  Once-only: paid invoice rejects second payer (ALREADY_PAID), state unchanged
 *   I03  Failed forwarding call preserves all state and balances (rejecting merchant)
 *   I04  Failed forwarding call preserves all state and balances (gas-exhausting merchant)
 *   I05  Immutable terms: termsHash stored verbatim, nonzero hash pays fine, field read-back
 *   I06  Two deployments on one mock chain produce independent IDs and state
 *   I07  Nonce-paginated history: N invoices → IDs [0..N-1] reconstructable from nonce
 *   I08  Expired invoice: creation ok, payment at/after expiry fails EXPIRED
 *   I09  Contract balance invariant across mixed paid/failed sequences; never leaks
 *
 * Test matrix limitations (honest L1 mock vs. Arc L3):
 *   - All tests run on Foundry's local EVM (chain ID 31337 by default), not Arc Testnet.
 *   - "Native USDC" is represented as plain native ETH in these tests; the Arc-specific
 *     system Transfer event at the 18-decimal USDC emitter is NOT validated here.
 *     Real Arc native-USDC system log behaviour requires a real Arc Testnet deployment.
 *   - Gas dynamics (EIP-1559, Arc fee model, block time) are not replicated.
 *   - Arc committed-block finality is not tested; Foundry has no confirmation threshold.
 *   - Receipt verification (tx.to/from/input/value, log index, committed block hash)
 *     requires a real chain RPC and is out of scope for local unit tests.
 *   - Selfdestruct (Paris) balance-transfer semantics are replicated faithfully here
 *     (EIP-6780 deferral does not apply to Paris EVM target).
 *
 * These tests verify the contract's P0 acceptance criteria in isolation.
 * They are NOT a substitute for testnet integration tests (G2 scope).
 */

import "forge-std/Test.sol";
import "../ArcProofInvoices.sol";

// Simple EOA-like merchant that accepts ETH
contract I_AcceptingMerchant {
    uint256 public received;
    receive() external payable { received += msg.value; }
}

// Merchant that always reverts
contract I_RejectingMerchant {
    receive() external payable { revert("rejected"); }
}

// Merchant that exhausts forwarded gas
contract I_GasLoopMerchant {
    receive() external payable { uint256 x; while (true) { x++; } }
}

contract ArcProofAcceptanceTest is Test {
    ArcProofInvoices public c;

    address public merchant = address(0xAA01);
    address public payer    = address(0xBB01);
    address public payer2   = address(0xCC01);

    uint256 constant AMT  = 500_000_000_000_000_000; // 0.5 USDC-native (18 dec, divisible by 1e12)
    uint256 constant AMT2 = 200_000_000_000_000_000; // 0.2 USDC-native

    function setUp() public {
        c = new ArcProofInvoices();
        vm.deal(merchant, 0);
        vm.deal(payer,    100 ether);
        vm.deal(payer2,   100 ether);
    }

    function _expiry(uint256 ahead) internal view returns (uint64) {
        return uint64(block.timestamp + ahead);
    }

    // -----------------------------------------------------------------------
    // I01 — Happy-path end-to-end
    // -----------------------------------------------------------------------

    /// @dev Create an invoice, pay it exactly, read all eight fields back.
    ///      Verifies: ID formula, InvoiceCreated event, InvoicePaid event,
    ///      all paid fields set, merchant received funds, contract balance zero.
    function test_I01_happyPathEndToEnd() public {
        I_AcceptingMerchant am = new I_AcceptingMerchant();
        uint64 exp = _expiry(1 days);

        bytes32 expectedId = keccak256(abi.encode(block.chainid, address(c), address(am), uint256(0)));

        vm.expectEmit(true, true, false, true);
        emit ArcProofInvoices.InvoiceCreated(expectedId, address(am), 0, AMT, exp, bytes32(0));
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMT, exp, bytes32(0));
        assertEq(id, expectedId, "I01: ID matches formula");

        uint256 mBefore = address(am).balance;
        uint256 pBefore = payer.balance;

        vm.expectEmit(true, true, true, true);
        emit ArcProofInvoices.InvoicePaid(id, payer, address(am), AMT);
        vm.prank(payer);
        c.payInvoice{value: AMT}(id);

        ArcProofInvoices.Invoice memory inv = c.getInvoice(id);
        assertTrue(inv.paid,                         "I01: paid");
        assertEq(inv.payer,           payer,          "I01: payer");
        assertEq(inv.paidAt,          block.timestamp,"I01: paidAt");
        assertEq(inv.paidBlockNumber, block.number,   "I01: paidBlockNumber");
        assertEq(inv.merchant,        address(am),    "I01: merchant");
        assertEq(inv.amountNative,    AMT,            "I01: amountNative");
        assertEq(inv.expiresAt,       exp,            "I01: expiresAt");
        assertEq(inv.termsHash,       bytes32(0),     "I01: termsHash");

        assertEq(address(am).balance, mBefore + AMT,  "I01: merchant received");
        assertEq(payer.balance,       pBefore - AMT,  "I01: payer sent");
        assertEq(address(c).balance,  0,              "I01: contract holds nothing");
    }

    // -----------------------------------------------------------------------
    // I02 — Once-only payment
    // -----------------------------------------------------------------------

    /// @dev First payment succeeds; second from same payer reverts ALREADY_PAID.
    ///      Paid state and original payer must be unchanged after the second attempt.
    function test_I02_onceOnlyPayment_samePayer() public {
        I_AcceptingMerchant am = new I_AcceptingMerchant();
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMT, _expiry(1 days), bytes32(0));

        vm.prank(payer);
        c.payInvoice{value: AMT}(id);

        ArcProofInvoices.Invoice memory snap = c.getInvoice(id);

        vm.prank(payer);
        vm.expectRevert(ArcProofInvoices.ALREADY_PAID.selector);
        c.payInvoice{value: AMT}(id);

        ArcProofInvoices.Invoice memory after_ = c.getInvoice(id);
        assertTrue(after_.paid,                       "I02: still paid");
        assertEq(after_.payer,     snap.payer,        "I02: payer unchanged");
        assertEq(after_.paidAt,    snap.paidAt,       "I02: paidAt unchanged");
        assertEq(after_.paidBlockNumber, snap.paidBlockNumber, "I02: block unchanged");
    }

    /// @dev Second payment from a different payer also reverts ALREADY_PAID.
    function test_I02_onceOnlyPayment_differentPayer() public {
        I_AcceptingMerchant am = new I_AcceptingMerchant();
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMT, _expiry(1 days), bytes32(0));
        vm.prank(payer);
        c.payInvoice{value: AMT}(id);

        vm.prank(payer2);
        vm.expectRevert(ArcProofInvoices.ALREADY_PAID.selector);
        c.payInvoice{value: AMT}(id);
        assertEq(c.getInvoice(id).payer, payer, "I02: original payer preserved");
    }

    // -----------------------------------------------------------------------
    // I03 — Rejecting merchant: all state and balances preserved
    // -----------------------------------------------------------------------

    function test_I03_rejectingMerchantPreservesState() public {
        I_RejectingMerchant rm = new I_RejectingMerchant();
        vm.prank(address(rm));
        bytes32 id = c.createInvoice(AMT, _expiry(1 days), bytes32(0));

        ArcProofInvoices.Invoice memory snap = c.getInvoice(id);
        uint256 cBefore = address(c).balance;
        uint256 pBefore = payer.balance;

        vm.prank(payer);
        vm.expectRevert(ArcProofInvoices.MERCHANT_CALL_FAILED.selector);
        c.payInvoice{value: AMT}(id);

        ArcProofInvoices.Invoice memory after_ = c.getInvoice(id);
        assertFalse(after_.paid,                      "I03: not paid");
        assertEq(after_.payer,     address(0),        "I03: payer zero");
        assertEq(after_.paidAt,    0,                 "I03: paidAt zero");
        assertEq(after_.paidBlockNumber, 0,           "I03: paidBlockNumber zero");
        assertEq(after_.merchant,  snap.merchant,     "I03: merchant unchanged");
        assertEq(after_.amountNative, snap.amountNative, "I03: amount unchanged");
        assertEq(after_.termsHash, snap.termsHash,    "I03: termsHash unchanged");
        assertEq(address(c).balance, cBefore,         "I03: contract balance unchanged");
        assertEq(payer.balance,      pBefore,         "I03: payer balance unchanged");
    }

    // -----------------------------------------------------------------------
    // I04 — Gas-exhausting merchant: exact error + full rollback
    // -----------------------------------------------------------------------

    /// @dev MOCK LIMIT: Foundry fixed-gas semantics; real Arc gas dynamics differ.
    function test_I04_gasExhaustingMerchantPreservesState() public {
        I_GasLoopMerchant gm = new I_GasLoopMerchant();
        vm.prank(address(gm));
        bytes32 id = c.createInvoice(AMT, _expiry(1 days), bytes32(0));

        ArcProofInvoices.Invoice memory snap = c.getInvoice(id);
        uint256 cBefore = address(c).balance;
        uint256 pBefore = payer.balance;

        vm.prank(payer);
        vm.expectRevert(ArcProofInvoices.MERCHANT_CALL_FAILED.selector);
        c.payInvoice{value: AMT, gas: 500_000}(id);

        ArcProofInvoices.Invoice memory after_ = c.getInvoice(id);
        assertFalse(after_.paid,                      "I04: not paid");
        assertEq(after_.payer,          address(0),   "I04: payer zero");
        assertEq(after_.paidAt,         0,            "I04: paidAt zero");
        assertEq(after_.paidBlockNumber, 0,           "I04: paidBlockNumber zero");
        assertEq(after_.merchant,  snap.merchant,     "I04: merchant unchanged");
        assertEq(after_.amountNative, snap.amountNative, "I04: amount unchanged");
        assertEq(after_.termsHash, snap.termsHash,    "I04: termsHash unchanged");
        assertEq(address(c).balance, cBefore,         "I04: contract unchanged");
        assertEq(payer.balance,      pBefore,         "I04: payer unchanged");
    }

    // -----------------------------------------------------------------------
    // I05 — Immutable terms: nonzero termsHash stored verbatim, payment succeeds
    // -----------------------------------------------------------------------

    function test_I05_nonzeroTermsHashStoredAndPayable() public {
        bytes32 hash_ = keccak256("terms-document-v1");
        I_AcceptingMerchant am = new I_AcceptingMerchant();
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMT, _expiry(1 days), hash_);

        assertEq(c.getInvoice(id).termsHash, hash_, "I05: termsHash stored");

        vm.prank(payer);
        c.payInvoice{value: AMT}(id);

        assertEq(c.getInvoice(id).termsHash, hash_, "I05: termsHash preserved post-payment");
        assertTrue(c.getInvoice(id).paid,            "I05: payment succeeded");
    }

    // -----------------------------------------------------------------------
    // I06 — Two deployments: independent IDs and independent paid state
    // -----------------------------------------------------------------------

    function test_I06_twoDeploymentsIndependentState() public {
        ArcProofInvoices c2 = new ArcProofInvoices();
        I_AcceptingMerchant am = new I_AcceptingMerchant();

        vm.prank(address(am));
        bytes32 id1 = c.createInvoice(AMT, _expiry(1 days), bytes32(0));
        vm.prank(address(am));
        bytes32 id2 = c2.createInvoice(AMT, _expiry(1 days), bytes32(0));

        assertTrue(id1 != id2, "I06: IDs differ across deployments");

        // Pay on c; c2 invoice must stay unpaid
        vm.prank(payer);
        c.payInvoice{value: AMT}(id1);
        assertTrue(c.getInvoice(id1).paid,   "I06: c invoice paid");

        // id2 exists only on c2 — c does not know it
        vm.expectRevert(ArcProofInvoices.UNKNOWN_INVOICE.selector);
        c.getInvoice(id2);

        // Pay on c2
        vm.prank(payer2);
        c2.payInvoice{value: AMT}(id2);
        assertTrue(c2.getInvoice(id2).paid,  "I06: c2 invoice paid");
    }

    // -----------------------------------------------------------------------
    // I07 — Nonce-paginated history: N invoices reconstructable backwards
    // -----------------------------------------------------------------------

    function test_I07_noncePaginatedHistory() public {
        uint256 N = 5;
        uint64 exp = _expiry(1 days);
        bytes32[] memory ids = new bytes32[](N);

        for (uint256 i = 0; i < N; i++) {
            vm.prank(merchant);
            ids[i] = c.createInvoice(AMT2, exp, bytes32(0));
        }
        assertEq(c.nextNonce(merchant), N, "I07: nonce == N");

        // Reconstruct IDs from nonce backwards (as UI would: N-1 down to 0)
        for (uint256 i = 0; i < N; i++) {
            uint256 nonce = N - 1 - i;
            bytes32 expected = keccak256(abi.encode(block.chainid, address(c), merchant, nonce));
            assertEq(ids[nonce], expected, "I07: reconstructed ID matches");
            assertEq(c.getInvoice(ids[nonce]).amountNative, AMT2, "I07: invoice readable");
        }
    }

    // -----------------------------------------------------------------------
    // I08 — Expiry: creation ok, payment at/after expiry reverts EXPIRED
    // -----------------------------------------------------------------------

    function test_I08_expiryBoundary() public {
        uint64 exp = uint64(block.timestamp + 2);
        vm.prank(merchant);
        bytes32 id = c.createInvoice(AMT, exp, bytes32(0));

        // At expiry - 1: accepted
        I_AcceptingMerchant am = new I_AcceptingMerchant();
        uint64 expB = uint64(block.timestamp + 3);
        vm.prank(address(am));
        bytes32 idB = c.createInvoice(AMT, expB, bytes32(0));
        vm.warp(expB - 1);
        vm.prank(payer);
        c.payInvoice{value: AMT}(idB);
        assertTrue(c.getInvoice(idB).paid, "I08: paid before expiry");

        // At exact expiry: rejected
        vm.warp(exp);
        vm.prank(payer2);
        vm.expectRevert(ArcProofInvoices.EXPIRED.selector);
        c.payInvoice{value: AMT}(id);
        assertFalse(c.getInvoice(id).paid, "I08: not paid at expiry");

        // After expiry: rejected
        vm.warp(exp + 100);
        vm.prank(payer2);
        vm.expectRevert(ArcProofInvoices.EXPIRED.selector);
        c.payInvoice{value: AMT}(id);
    }

    // -----------------------------------------------------------------------
    // I09 — Contract balance invariant across mixed paid/failed sequences
    // -----------------------------------------------------------------------

    /// @dev Run a sequence of successful payments, failed payments, and failed
    ///      forwards; assert the contract balance is zero throughout.
    ///      Pre-funded balance is preserved; successful payment does not retain any.
    function test_I09_contractBalanceInvariantMixedSequence() public {
        // Pre-fund the contract
        vm.deal(address(c), 3 ether);
        uint256 prefunded = address(c).balance;

        I_AcceptingMerchant am = new I_AcceptingMerchant();
        I_RejectingMerchant rm = new I_RejectingMerchant();

        vm.prank(address(am));
        bytes32 idOk = c.createInvoice(AMT, _expiry(1 days), bytes32(0));
        vm.prank(address(rm));
        bytes32 idFail = c.createInvoice(AMT2, _expiry(1 days), bytes32(0));

        // Wrong amount on idOk: no balance change
        vm.prank(payer);
        vm.expectRevert(ArcProofInvoices.WRONG_AMOUNT.selector);
        c.payInvoice{value: AMT - 1}(idOk);
        assertEq(address(c).balance, prefunded, "I09: balance after wrong amount");

        // Rejecting merchant on idFail: no balance change
        vm.prank(payer);
        vm.expectRevert(ArcProofInvoices.MERCHANT_CALL_FAILED.selector);
        c.payInvoice{value: AMT2}(idFail);
        assertEq(address(c).balance, prefunded, "I09: balance after rejected forward");

        // Successful payment on idOk: balance returns to prefunded (not accumulated)
        vm.prank(payer);
        c.payInvoice{value: AMT}(idOk);
        assertEq(address(c).balance, prefunded, "I09: balance after successful payment");

        // Verify idFail is still unpaid and idOk is paid
        assertTrue(c.getInvoice(idOk).paid,   "I09: idOk paid");
        assertFalse(c.getInvoice(idFail).paid, "I09: idFail still unpaid");

        // Create a second invoice on am and pay it: still no accumulation
        vm.prank(address(am));
        bytes32 idOk2 = c.createInvoice(AMT2, _expiry(1 days), bytes32(0));
        vm.prank(payer2);
        c.payInvoice{value: AMT2}(idOk2);
        assertEq(address(c).balance, prefunded, "I09: balance after second payment");
    }
}
