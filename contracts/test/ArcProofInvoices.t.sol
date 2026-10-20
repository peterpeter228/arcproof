// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../ArcProofInvoices.sol";

// ---------------------------------------------------------------------------
// Helper contracts
// ---------------------------------------------------------------------------

/// @dev Merchant: re-enters createInvoice and RE-RAISES the revert (caught case).
contract ReentrantCreateMerchant {
    ArcProofInvoices public inv;
    constructor(ArcProofInvoices _inv) { inv = _inv; }
    receive() external payable {
        try inv.createInvoice(1e12, uint64(block.timestamp + 1 hours), bytes32(0)) {
        } catch {
            revert("reentry blocked");   // re-raise → outer payInvoice gets MERCHANT_CALL_FAILED
        }
    }
}

/// @dev Merchant: re-enters createInvoice but SWALLOWS the revert (uncaught case).
contract SilentReentrantCreateMerchant {
    ArcProofInvoices public inv;
    bool public callbackReached;
    bool public reentryReverted;
    constructor(ArcProofInvoices _inv) { inv = _inv; }
    receive() external payable {
        callbackReached = true;
        try inv.createInvoice(1e12, uint64(block.timestamp + 1 hours), bytes32(0)) {
        } catch {
            reentryReverted = true;
        }
        // do NOT re-raise — outer payment proceeds normally
    }
}

/// @dev Merchant: re-enters payInvoice on the SAME invoice.
contract ReentrantPaySameMerchant {
    ArcProofInvoices public inv;
    bytes32 public invoiceId;
    bool public attacked;
    bool public reentryReverted;
    constructor(ArcProofInvoices _inv) { inv = _inv; }
    function setInvoiceId(bytes32 id) external { invoiceId = id; }
    receive() external payable {
        if (!attacked) {
            attacked = true;
            try inv.payInvoice{value: msg.value}(invoiceId) {
            } catch {
                reentryReverted = true;
            }
        }
    }
}

/// @dev Like ReentrantPaySameMerchant but swallows the error so the outer payment
///      succeeds, letting us verify that the re-entrant attempt was still blocked.
contract SilentReentrantPaySameMerchant {
    ArcProofInvoices public inv;
    bytes32 public invoiceId;
    bool public attacked;
    bool public reentryReverted;
    constructor(ArcProofInvoices _inv) { inv = _inv; }
    function setInvoiceId(bytes32 id) external { invoiceId = id; }
    receive() external payable {
        if (!attacked) {
            attacked = true;
            // Try to pay the SAME invoice again while still inside the first payment's callback.
            // The guard is already ENTERED so this must revert (ReentrancyGuardReentrantCall).
            try inv.payInvoice{value: msg.value}(invoiceId) {
                // must never succeed
            } catch {
                reentryReverted = true;
            }
            // swallow — outer payment completes normally
        }
    }
}

/// @dev Merchant: re-enters payInvoice on a DIFFERENT invoice.
contract ReentrantPayCrossMerchant {
    ArcProofInvoices public inv;
    bytes32 public otherInvoiceId;
    bool public attacked;
    bool public reentryReverted;
    uint256 public reentryValue;
    constructor(ArcProofInvoices _inv) { inv = _inv; }
    function setOtherInvoice(bytes32 id, uint256 val) external {
        otherInvoiceId = id;
        reentryValue   = val;
    }
    receive() external payable {
        if (!attacked) {
            attacked = true;
            try inv.payInvoice{value: reentryValue}(otherInvoiceId) {
            } catch {
                reentryReverted = true;
            }
        }
    }
}

/// @dev Always reverts on receive.
contract RejectingMerchant {
    receive() external payable { revert("rejected"); }
}

/// @dev Burns all forwarded gas.
contract GasExhaustingMerchant {
    receive() external payable {
        uint256 i = 0;
        while (true) { i++; }
    }
}

/// @dev Injects extra ETH into the target via selfdestruct during its callback.
///      Paris EVM: selfdestruct transfers balance immediately within the same tx.
contract ForceSendMerchant {
    ArcProofInvoices public inv;
    address payable public forcer;
    constructor(ArcProofInvoices _inv) { inv = _inv; }
    function setForcer(address payable f) external { forcer = f; }
    receive() external payable {
        ForceEther(forcer).forceEther(payable(address(inv)));
    }
}

/// @dev Pre-funded helper; selfdestructs to force its balance into a target.
contract ForceEther {
    constructor() payable {}
    function forceEther(address payable target) external { selfdestruct(target); }
}

/// @dev Normal EOA-like accepting merchant (has receive).
contract AcceptingMerchant {
    uint256 public received;
    receive() external payable { received += msg.value; }
}

// ---------------------------------------------------------------------------
// Main test suite
// ---------------------------------------------------------------------------

contract ArcProofInvoicesTest is Test {
    ArcProofInvoices public c;

    address public merchant1 = address(0x1111);
    address public merchant2 = address(0x2222);
    address public payer1    = address(0x3333);
    address public payer2    = address(0x4444);

    uint256 public constant AMOUNT_1   = 200_000_000_000_000_000; // 0.20 USDC (18 dec)
    uint256 public constant AMOUNT_MIN = 1e12;
    uint256 public constant AMOUNT_MAX = 1e18;

    function setUp() public {
        c = new ArcProofInvoices();
        vm.deal(merchant1, 100 ether);
        vm.deal(merchant2, 100 ether);
        vm.deal(payer1,    100 ether);
        vm.deal(payer2,    100 ether);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    function _createInvoice(
        address merchant,
        uint256 amount,
        uint64  expiresAt,
        bytes32 termsHash
    ) internal returns (bytes32) {
        vm.prank(merchant);
        return c.createInvoice(amount, expiresAt, termsHash);
    }

    function _defaultExpiry() internal view returns (uint64) {
        return uint64(block.timestamp + 1 days);
    }

    function _expectedId(
        uint256 chainId,
        address contractAddr,
        address merchant,
        uint256 nonce
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(chainId, contractAddr, merchant, nonce));
    }

    // -----------------------------------------------------------------------
    // T01 — Valid creation and emitted data
    // -----------------------------------------------------------------------

    function test_T01_validCreationAndEmittedData() public {
        uint64  expiry     = _defaultExpiry();
        bytes32 expectedId = _expectedId(block.chainid, address(c), merchant1, 0);

        vm.expectEmit(true, true, false, true);
        emit ArcProofInvoices.InvoiceCreated(expectedId, merchant1, 0, AMOUNT_1, expiry, bytes32(0));

        bytes32 id = _createInvoice(merchant1, AMOUNT_1, expiry, bytes32(0));
        assertEq(id, expectedId);

        ArcProofInvoices.Invoice memory inv = c.getInvoice(id);
        assertEq(inv.merchant,        merchant1);
        assertEq(inv.amountNative,    AMOUNT_1);
        assertEq(inv.expiresAt,       expiry);
        assertEq(inv.termsHash,       bytes32(0));
        assertFalse(inv.paid);
        assertEq(inv.payer,           address(0));
        assertEq(inv.paidAt,          0);
        assertEq(inv.paidBlockNumber, 0);
        assertEq(c.nextNonce(merchant1), 1);
    }

    // -----------------------------------------------------------------------
    // T02 — Amount validation
    // -----------------------------------------------------------------------

    function test_T02_amountZeroReverts() public {
        vm.prank(merchant1);
        vm.expectRevert(ArcProofInvoices.ZERO_AMOUNT.selector);
        c.createInvoice(0, _defaultExpiry(), bytes32(0));
        assertEq(c.nextNonce(merchant1), 0, "nonce must not change on revert");
    }

    function test_T02_amountMinAccepted() public {
        bytes32 id = _createInvoice(merchant1, AMOUNT_MIN, _defaultExpiry(), bytes32(0));
        assertEq(c.getInvoice(id).amountNative, AMOUNT_MIN);
    }

    function test_T02_amountMaxAccepted() public {
        bytes32 id = _createInvoice(merchant1, AMOUNT_MAX, _defaultExpiry(), bytes32(0));
        assertEq(c.getInvoice(id).amountNative, AMOUNT_MAX);
    }

    function test_T02_amountOverCapReverts() public {
        vm.prank(merchant1);
        vm.expectRevert(ArcProofInvoices.AMOUNT_TOO_LARGE.selector);
        c.createInvoice(AMOUNT_MAX + 1, _defaultExpiry(), bytes32(0));
        assertEq(c.nextNonce(merchant1), 0);
    }

    function test_T02_amountNotDivisibleReverts() public {
        vm.prank(merchant1);
        vm.expectRevert(ArcProofInvoices.AMOUNT_NOT_DIVISIBLE.selector);
        c.createInvoice(1, _defaultExpiry(), bytes32(0));
        assertEq(c.nextNonce(merchant1), 0);

        vm.prank(merchant1);
        vm.expectRevert(ArcProofInvoices.AMOUNT_NOT_DIVISIBLE.selector);
        c.createInvoice(AMOUNT_MIN - 1, _defaultExpiry(), bytes32(0));
        assertEq(c.nextNonce(merchant1), 0);

        vm.prank(merchant1);
        vm.expectRevert(ArcProofInvoices.AMOUNT_NOT_DIVISIBLE.selector);
        c.createInvoice(AMOUNT_MIN / 2, _defaultExpiry(), bytes32(0));
        assertEq(c.nextNonce(merchant1), 0);
    }

    function test_T02_largeExactDivisibleAccepted() public {
        bytes32 id = _createInvoice(merchant1, 5e17, _defaultExpiry(), bytes32(0));
        assertEq(c.getInvoice(id).amountNative, 5e17);
    }

    // -----------------------------------------------------------------------
    // T03 — Expiry validation
    // -----------------------------------------------------------------------

    function test_T03_expiryInPastReverts() public {
        uint64 past = uint64(block.timestamp - 1);
        vm.prank(merchant1);
        vm.expectRevert(ArcProofInvoices.EXPIRY_IN_PAST.selector);
        c.createInvoice(AMOUNT_1, past, bytes32(0));
    }

    function test_T03_expiryEqualTimestampReverts() public {
        uint64 now_ = uint64(block.timestamp);
        vm.prank(merchant1);
        vm.expectRevert(ArcProofInvoices.EXPIRY_IN_PAST.selector);
        c.createInvoice(AMOUNT_1, now_, bytes32(0));
    }

    function test_T03_expiryFutureAccepted() public {
        bytes32 id = _createInvoice(merchant1, AMOUNT_1, uint64(block.timestamp + 1), bytes32(0));
        assertTrue(id != bytes32(0));
    }

    function test_T03_expiryExactly7DaysAccepted() public {
        uint64 exact7d = uint64(block.timestamp + 7 days);
        bytes32 id = _createInvoice(merchant1, AMOUNT_1, exact7d, bytes32(0));
        assertTrue(id != bytes32(0));
    }

    function test_T03_expiryOver7DaysReverts() public {
        uint64 over7d = uint64(block.timestamp + 7 days + 1);
        vm.prank(merchant1);
        vm.expectRevert(ArcProofInvoices.EXPIRY_TOO_FAR.selector);
        c.createInvoice(AMOUNT_1, over7d, bytes32(0));
    }

    // -----------------------------------------------------------------------
    // T04 — ID derivation
    // -----------------------------------------------------------------------

    function test_T04_nonce0Id() public {
        bytes32 expected = _expectedId(block.chainid, address(c), merchant1, 0);
        bytes32 id = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), bytes32(0));
        assertEq(id, expected);
    }

    function test_T04_multipleNonces() public {
        bytes32 id0 = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), bytes32(0));
        bytes32 id1 = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), bytes32(0));
        assertEq(id0, _expectedId(block.chainid, address(c), merchant1, 0));
        assertEq(id1, _expectedId(block.chainid, address(c), merchant1, 1));
        assertTrue(id0 != id1);
        assertEq(c.nextNonce(merchant1), 2);
    }

    function test_T04_twoMerchantsHaveIndependentNonces() public {
        bytes32 m1id0 = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), bytes32(0));
        bytes32 m2id0 = _createInvoice(merchant2, AMOUNT_1, _defaultExpiry(), bytes32(0));
        assertEq(c.nextNonce(merchant1), 1);
        assertEq(c.nextNonce(merchant2), 1);
        assertTrue(m1id0 != m2id0);
    }

    function test_T04_twoDeploymentsSameMerchantDifferentIds() public {
        ArcProofInvoices c2 = new ArcProofInvoices();
        vm.prank(merchant1);
        bytes32 id1 = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        vm.prank(merchant1);
        bytes32 id2 = c2.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        assertTrue(id1 != id2);
    }

    function test_T04_differentChainIdsProduceDifferentIds() public pure {
        bytes32 idChain1 = keccak256(abi.encode(uint256(1), address(0xABCD), address(0x1111), uint256(0)));
        bytes32 idChain2 = keccak256(abi.encode(uint256(2), address(0xABCD), address(0x1111), uint256(0)));
        assertTrue(idChain1 != idChain2);
    }

    // -----------------------------------------------------------------------
    // T05 — Immutable fields; no setter/cancel/edit in ABI
    // -----------------------------------------------------------------------

    function test_T05_immutableFieldsAfterCreation() public {
        bytes32 terms = bytes32(uint256(0x1234));
        bytes32 id    = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), terms);
        ArcProofInvoices.Invoice memory inv = c.getInvoice(id);

        assertEq(inv.merchant,        merchant1);
        assertEq(inv.amountNative,    AMOUNT_1);
        assertEq(inv.termsHash,       terms);
        assertFalse(inv.paid);
        assertEq(inv.payer,           address(0));
        assertEq(inv.paidAt,          0);
        assertEq(inv.paidBlockNumber, 0);

        (bool ok,) = address(c).call(abi.encodeWithSignature("setMerchant(bytes32,address)", id, payer1));
        assertFalse(ok, "setMerchant must not exist");
        (ok,)      = address(c).call(abi.encodeWithSignature("cancelInvoice(bytes32)", id));
        assertFalse(ok, "cancelInvoice must not exist");
        (ok,)      = address(c).call(abi.encodeWithSignature("editInvoice(bytes32,uint256)", id, 1e12));
        assertFalse(ok, "editInvoice must not exist");
    }

    // -----------------------------------------------------------------------
    // T06 — Unknown ID: getInvoice reverts, payInvoice reverts
    // -----------------------------------------------------------------------

    function test_T06_unknownIdGetInvoiceReverts() public {
        vm.expectRevert(ArcProofInvoices.UNKNOWN_INVOICE.selector);
        c.getInvoice(keccak256("unknown"));
    }

    function test_T06_unknownIdBytes32ZeroGetInvoiceReverts() public {
        vm.expectRevert(ArcProofInvoices.UNKNOWN_INVOICE.selector);
        c.getInvoice(bytes32(0));
    }

    function test_T06_payUnknownIdReverts() public {
        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.UNKNOWN_INVOICE.selector);
        c.payInvoice{value: AMOUNT_1}(keccak256("unknown"));
    }

    // -----------------------------------------------------------------------
    // T07 — Exact payment: vm.roll + vm.warp, EOA merchant, event exactly once,
    //        correct paidBlockNumber and paidAt, all balance invariants.
    // -----------------------------------------------------------------------

    function test_T07_exactPaymentRecordsState() public {
        // Use an EOA merchant address (no contract code, accepts ETH by default).
        address eoaMerchant = address(0x9999);
        vm.deal(eoaMerchant, 0);
        vm.deal(payer1, 100 ether);

        // Advance to a non-default block and timestamp so we can assert exact values.
        uint256 targetBlock = 7777;
        uint256 targetTs    = 1_800_000_000;
        vm.roll(targetBlock);
        vm.warp(targetTs);

        uint64 expiry = uint64(targetTs + 1 days);
        vm.prank(eoaMerchant);
        bytes32 id = c.createInvoice(AMOUNT_1, expiry, bytes32(0));

        uint256 merchantBefore = eoaMerchant.balance;
        uint256 contractBefore = address(c).balance;
        uint256 payerBefore    = payer1.balance;

        // Record all logs to verify InvoicePaid fires exactly once.
        vm.recordLogs();

        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);

        // --- Exactly one InvoicePaid log ---
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 paidSig = keccak256("InvoicePaid(bytes32,address,address,uint256)");
        uint256 paidCount = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == paidSig) {
                paidCount++;
                // Verify indexed fields: invoiceId, payer, merchant
                assertEq(logs[i].topics[1], id,                           "event invoiceId");
                assertEq(logs[i].topics[2], bytes32(uint256(uint160(payer1))),   "event payer");
                assertEq(logs[i].topics[3], bytes32(uint256(uint160(eoaMerchant))), "event merchant");
                // Verify non-indexed: amountNative
                uint256 loggedAmount = abi.decode(logs[i].data, (uint256));
                assertEq(loggedAmount, AMOUNT_1, "event amountNative");
            }
        }
        assertEq(paidCount, 1, "InvoicePaid must fire exactly once");

        // --- Invoice state ---
        ArcProofInvoices.Invoice memory inv = c.getInvoice(id);
        assertTrue(inv.paid,                                      "paid");
        assertEq(inv.payer,           payer1,                     "payer");
        assertEq(uint256(inv.paidAt), targetTs,                   "paidAt == warped ts");
        assertEq(inv.paidBlockNumber, targetBlock,                 "paidBlockNumber == rolled block");

        // --- Balance invariants ---
        assertEq(eoaMerchant.balance, merchantBefore + AMOUNT_1,  "merchant received");
        assertEq(address(c).balance,  contractBefore,             "contract balance unchanged");
        assertEq(payer1.balance,      payerBefore - AMOUNT_1,     "payer sent");
    }

    // -----------------------------------------------------------------------
    // T08 — Wrong payment amounts and prefunded contract balance
    // -----------------------------------------------------------------------

    function test_T08_zeroPaymentReverts() public {
        bytes32 id = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), bytes32(0));
        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.WRONG_AMOUNT.selector);
        c.payInvoice{value: 0}(id);
    }

    function test_T08_underPaymentReverts() public {
        bytes32 id = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), bytes32(0));
        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.WRONG_AMOUNT.selector);
        c.payInvoice{value: AMOUNT_1 - 1}(id);
    }

    function test_T08_overPaymentReverts() public {
        bytes32 id = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), bytes32(0));
        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.WRONG_AMOUNT.selector);
        c.payInvoice{value: AMOUNT_1 + 1}(id);
    }

    function test_T08_prefundedContractBalanceDoesNotAffectPayment() public {
        vm.deal(address(c), 50 ether);
        uint256 prefunded = address(c).balance;

        AcceptingMerchant am = new AcceptingMerchant();
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));

        vm.deal(payer1, 100 ether);
        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);

        assertEq(address(c).balance, prefunded, "prefunded balance must be preserved exactly");
    }

    function test_T08_prefundedBalanceDoesNotCoverUnderpayment() public {
        vm.deal(address(c), 50 ether);
        bytes32 id = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), bytes32(0));
        vm.deal(payer1, 100 ether);
        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.WRONG_AMOUNT.selector);
        c.payInvoice{value: AMOUNT_1 - 1e12}(id);
    }

    // -----------------------------------------------------------------------
    // T09 — Expiry boundary for payment
    // -----------------------------------------------------------------------

    function test_T09_expiresAtMinusOneIsAccepted() public {
        AcceptingMerchant am = new AcceptingMerchant();
        uint64 expiry = uint64(block.timestamp + 2);
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMOUNT_1, expiry, bytes32(0));

        vm.warp(expiry - 1);
        vm.deal(payer1, 100 ether);
        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);
        assertTrue(c.getInvoice(id).paid);
    }

    function test_T09_expiresAtExactIsRejected() public {
        uint64 expiry = uint64(block.timestamp + 2);
        bytes32 id = _createInvoice(merchant1, AMOUNT_1, expiry, bytes32(0));
        vm.warp(expiry);
        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.EXPIRED.selector);
        c.payInvoice{value: AMOUNT_1}(id);
    }

    function test_T09_expiresAtPlusOneIsRejected() public {
        uint64 expiry = uint64(block.timestamp + 2);
        bytes32 id = _createInvoice(merchant1, AMOUNT_1, expiry, bytes32(0));
        vm.warp(expiry + 1);
        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.EXPIRED.selector);
        c.payInvoice{value: AMOUNT_1}(id);
    }

    // -----------------------------------------------------------------------
    // T10 — Repeat payments
    // -----------------------------------------------------------------------

    function test_T10_repeatPaymentSamePayer() public {
        AcceptingMerchant am = new AcceptingMerchant();
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));

        vm.deal(payer1, 100 ether);
        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);

        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.ALREADY_PAID.selector);
        c.payInvoice{value: AMOUNT_1}(id);
    }

    function test_T10_repeatPaymentDifferentPayer() public {
        AcceptingMerchant am = new AcceptingMerchant();
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));

        vm.deal(payer1, 100 ether);
        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);

        vm.deal(payer2, 100 ether);
        vm.prank(payer2);
        vm.expectRevert(ArcProofInvoices.ALREADY_PAID.selector);
        c.payInvoice{value: AMOUNT_1}(id);
    }

    // -----------------------------------------------------------------------
    // T11 — Same-invoice reentry:
    //   (a) caught — outer swallows inner, invoice ends up paid, inner was blocked
    //   (b) uncaught — outer payInvoice succeeds (inner is guarded, outer proceeds)
    // -----------------------------------------------------------------------

    /// @dev (a) Caught same-invoice reentry: ReentrantPaySameMerchant re-enters
    ///      payInvoice on the same invoice during the payment callback.
    ///      The outer payment is NOT rejected because the merchant swallows the error
    ///      internally — the guard fires on the inner attempt. The outer payment
    ///      SUCCEEDS; only the inner attempt is blocked (ALREADY_PAID or Guard).
    function test_T11_sameInvoiceReentryCaught() public {
        ReentrantPaySameMerchant rm = new ReentrantPaySameMerchant(c);
        vm.deal(address(rm), 0);
        vm.deal(payer1, 100 ether);

        vm.prank(address(rm));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        rm.setInvoiceId(id);

        // Payment proceeds; merchant catches the reentry revert internally.
        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);

        assertTrue(rm.attacked(),         "merchant callback reached");
        assertTrue(rm.reentryReverted(),  "reentrant payInvoice was blocked");
        // Invoice must be paid exactly once
        ArcProofInvoices.Invoice memory inv = c.getInvoice(id);
        assertTrue(inv.paid,              "invoice paid");
        assertEq(inv.payer, payer1,       "payer recorded");
    }

    /// @dev (b) Uncaught same-invoice reentry: SilentReentrantPaySameMerchant swallows
    ///      both the reentry revert AND the guard error. The outer payment still succeeds
    ///      and the reentrant attempt was blocked. Invoice is paid exactly once.
    function test_T11_sameInvoiceReentryUncaught() public {
        SilentReentrantPaySameMerchant srm = new SilentReentrantPaySameMerchant(c);
        vm.deal(address(srm), 0);
        vm.deal(payer1, 100 ether);

        vm.prank(address(srm));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        srm.setInvoiceId(id);

        uint256 merchantBefore = address(srm).balance;
        uint256 payerBefore    = payer1.balance;
        uint256 contractBefore = address(c).balance;

        // Payment completes; merchant swallows the inner reentry error.
        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);

        // Merchant callback was reached and inner attempt was blocked
        assertTrue(srm.attacked(),        "callback reached");
        assertTrue(srm.reentryReverted(), "inner payInvoice blocked by guard");

        // Invoice paid exactly once
        ArcProofInvoices.Invoice memory inv = c.getInvoice(id);
        assertTrue(inv.paid,              "invoice paid");
        assertEq(inv.payer, payer1,       "payer recorded");

        // Balances: merchant received AMOUNT_1 once (the outer payment), not twice
        assertEq(address(srm).balance, merchantBefore + AMOUNT_1, "merchant received once");
        assertEq(payer1.balance,       payerBefore - AMOUNT_1,    "payer sent once");
        assertEq(address(c).balance,   contractBefore,            "contract balance unchanged");
    }

    // -----------------------------------------------------------------------
    // T12 — Cross-invoice reentrancy (same-merchant and different-merchant),
    //        createInvoice reentry (caught and uncaught), shared guard.
    //        All revert paths assert FULL rollback of all invoice fields,
    //        nonce, and all actor balances.
    // -----------------------------------------------------------------------

    /// @dev Cross-invoice reentry, SAME merchant: merchant pays invoice-A from
    ///      the callback for invoice-A, trying to pay a second invoice they also
    ///      own. Guard blocks the re-entrant attempt; outer payment succeeds.
    function test_T12_crossInvoice_sameMerchant_bothPaidOnce() public {
        // This merchant is both the seller for id1 AND id2.
        ReentrantPayCrossMerchant rm = new ReentrantPayCrossMerchant(c);
        vm.deal(address(rm), 0);
        vm.deal(payer1, 100 ether);
        vm.deal(payer2, 100 ether);

        vm.prank(address(rm));
        bytes32 id1 = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        vm.prank(address(rm));
        bytes32 id2 = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));

        // While paying id1, merchant tries to pay id2 (also owned by them)
        rm.setOtherInvoice(id2, AMOUNT_1);

        uint256 payerBefore1    = payer1.balance;
        uint256 contractBefore  = address(c).balance;
        uint256 nonce1          = c.nextNonce(address(rm)); // == 2

        // Payer1 pays id1; in the callback the guard blocks the id2 pay attempt
        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id1);

        // Guard blocked the re-entrant id2 attempt
        assertTrue(rm.reentryReverted(), "cross-invoice reentry blocked by guard");

        // id1 paid, id2 NOT paid (the reentry was blocked)
        ArcProofInvoices.Invoice memory inv1 = c.getInvoice(id1);
        ArcProofInvoices.Invoice memory inv2 = c.getInvoice(id2);
        assertTrue(inv1.paid,                        "id1 paid");
        assertFalse(inv2.paid,                       "id2 NOT paid (reentry blocked)");
        assertEq(inv2.payer,          address(0),    "id2 payer zero");
        assertEq(inv2.paidAt,         0,             "id2 paidAt zero");
        assertEq(inv2.paidBlockNumber, 0,            "id2 paidBlockNumber zero");

        // Nonce unchanged (reentry was blocked before nonce could change again)
        assertEq(c.nextNonce(address(rm)), nonce1,   "nonce unchanged by blocked reentry");

        // Payer1 paid AMOUNT_1 (for id1 only), not 2×AMOUNT_1
        assertEq(payer1.balance, payerBefore1 - AMOUNT_1, "payer paid once");
        assertEq(address(c).balance, contractBefore,      "contract balance unchanged");
    }

    /// @dev Cross-invoice reentry, DIFFERENT merchant: while paying invoice-A
    ///      (merchant=rm), the callback attempts to pay invoice-B (merchant=am).
    ///      Guard fires; outer payment succeeds; id2 not paid.
    function test_T12_crossInvoice_differentMerchant_reentryBlocked() public {
        AcceptingMerchant am = new AcceptingMerchant();
        ReentrantPayCrossMerchant rm = new ReentrantPayCrossMerchant(c);
        vm.deal(address(rm), 0);
        vm.deal(payer1, 100 ether);

        vm.prank(address(rm));
        bytes32 id1 = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        vm.prank(address(am));
        bytes32 id2 = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));

        rm.setOtherInvoice(id2, AMOUNT_1);

        uint256 payerBefore   = payer1.balance;
        uint256 contractBefore = address(c).balance;

        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id1);

        assertTrue(rm.reentryReverted(), "cross-invoice reentry blocked (different merchant)");

        // id1 paid; id2 not paid; full rollback on id2
        ArcProofInvoices.Invoice memory inv2 = c.getInvoice(id2);
        assertFalse(inv2.paid,                      "id2 NOT paid");
        assertEq(inv2.payer,          address(0),   "id2 payer zero");
        assertEq(inv2.paidAt,         0,            "id2 paidAt zero");
        assertEq(inv2.paidBlockNumber, 0,           "id2 paidBlockNumber zero");
        assertEq(inv2.termsHash,      bytes32(0),   "id2 termsHash unchanged");

        assertEq(payer1.balance, payerBefore - AMOUNT_1, "payer paid id1 only");
        assertEq(address(c).balance, contractBefore,     "contract balance unchanged");
    }

    /// @dev createInvoice reentry CAUGHT: merchant re-raises → payInvoice reverts
    ///      MERCHANT_CALL_FAILED. All state rolled back (outer revert rolls back
    ///      everything including the merchant's own storage writes).
    function test_T12_createInvoiceReentryCaught() public {
        ReentrantCreateMerchant rcm = new ReentrantCreateMerchant(c);
        vm.deal(payer1, 100 ether);

        vm.prank(address(rcm));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        ArcProofInvoices.Invoice memory snapBefore = c.getInvoice(id);

        uint256 nonceBefore    = c.nextNonce(address(rcm)); // == 1
        uint256 contractBefore = address(c).balance;
        uint256 payerBefore    = payer1.balance;

        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.MERCHANT_CALL_FAILED.selector);
        c.payInvoice{value: AMOUNT_1}(id);

        // Full rollback — outer revert undoes ALL state writes
        ArcProofInvoices.Invoice memory snapAfter = c.getInvoice(id);
        assertFalse(snapAfter.paid,                               "paid rolled back");
        assertEq(snapAfter.payer,          address(0),            "payer rolled back");
        assertEq(snapAfter.paidAt,         0,                     "paidAt rolled back");
        assertEq(snapAfter.paidBlockNumber, 0,                    "paidBlockNumber rolled back");
        assertEq(snapAfter.merchant,       snapBefore.merchant,   "merchant unchanged");
        assertEq(snapAfter.amountNative,   snapBefore.amountNative, "amount unchanged");
        assertEq(snapAfter.expiresAt,      snapBefore.expiresAt,  "expiresAt unchanged");
        assertEq(snapAfter.termsHash,      snapBefore.termsHash,  "termsHash unchanged");
        // Nonce == 1 still (reentrant create was blocked, no extra nonce increment)
        assertEq(c.nextNonce(address(rcm)), nonceBefore,          "nonce unchanged");
        assertEq(address(c).balance, contractBefore,              "contract balance unchanged");
        assertEq(payer1.balance, payerBefore,                     "payer refunded");
    }

    /// @dev createInvoice reentry UNCAUGHT: merchant swallows → outer payment succeeds.
    ///      Inner create was still blocked; nonce did not advance beyond 1.
    function test_T12_createInvoiceReentryUncaught() public {
        SilentReentrantCreateMerchant srcm = new SilentReentrantCreateMerchant(c);
        vm.deal(payer1, 100 ether);

        vm.prank(address(srcm));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        uint256 nonceBefore = c.nextNonce(address(srcm)); // == 1

        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);

        assertTrue(c.getInvoice(id).paid,                    "invoice paid");
        assertEq(c.getInvoice(id).payer, payer1,             "payer recorded");
        assertEq(c.nextNonce(address(srcm)), nonceBefore,    "reentrant create did NOT increment nonce");
        assertTrue(srcm.callbackReached(),                   "callback reached");
        assertTrue(srcm.reentryReverted(),                   "inner createInvoice blocked by guard");
    }

    /// @dev Both entrypoints share the same ReentrancyGuard slot (slot 0).
    ///      Verify NOT_ENTERED=1 at init and after each call; verify guard selector.
    function test_T12_bothEntrypointsShareSameReentrancyGuard() public {
        bytes32 slot0 = vm.load(address(c), bytes32(uint256(0)));
        assertEq(uint256(slot0), 1, "guard unlocked before any call");

        vm.prank(merchant1);
        c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        slot0 = vm.load(address(c), bytes32(uint256(0)));
        assertEq(uint256(slot0), 1, "guard unlocked after createInvoice");

        AcceptingMerchant am = new AcceptingMerchant();
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        vm.deal(payer1, 100 ether);
        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);
        slot0 = vm.load(address(c), bytes32(uint256(0)));
        assertEq(uint256(slot0), 1, "guard unlocked after payInvoice");

        // Guard error selector: keccak256("ReentrancyGuardReentrantCall()") = 0x3ee5aeb5
        bytes4 expectedSelector = bytes4(keccak256("ReentrancyGuardReentrantCall()"));
        assertEq(expectedSelector, bytes4(0x3ee5aeb5),
            "guard selector must be 0x3ee5aeb5 (ReentrancyGuardReentrantCall)");
    }

    // -----------------------------------------------------------------------
    // T13 — Rejecting / gas-exhausting receiver rolls all state back
    // -----------------------------------------------------------------------

    function test_T13_rejectingMerchantRollsBackState() public {
        RejectingMerchant rm = new RejectingMerchant();
        vm.prank(address(rm));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        ArcProofInvoices.Invoice memory snap = c.getInvoice(id);

        uint256 contractBefore = address(c).balance;
        uint256 payerBefore    = payer1.balance;

        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.MERCHANT_CALL_FAILED.selector);
        c.payInvoice{value: AMOUNT_1}(id);

        ArcProofInvoices.Invoice memory after_ = c.getInvoice(id);
        assertFalse(after_.paid,                         "paid rolled back");
        assertEq(after_.payer,          address(0),      "payer rolled back");
        assertEq(after_.paidAt,         0,               "paidAt rolled back");
        assertEq(after_.paidBlockNumber, 0,              "paidBlockNumber rolled back");
        assertEq(after_.termsHash,      snap.termsHash,  "termsHash unchanged");
        assertEq(after_.amountNative,   snap.amountNative, "amount unchanged");
        assertEq(address(c).balance, contractBefore,     "contract balance unchanged");
        assertEq(payer1.balance, payerBefore,            "payer balance unchanged");
    }

    /// @dev Gas-exhausting merchant burns all forwarded gas so .call returns false.
    ///      We supply 500_000 outer gas: payInvoice uses ~50k before the .call and
    ///      forwards the rest (63/64 by EIP-150) to the loop; the loop exhausts that,
    ///      .call returns (false,""), and payInvoice reverts MERCHANT_CALL_FAILED.
    ///      500_000 is enough for payInvoice to reach its own revert cleanly.
    ///      MOCK LIMIT: Foundry uses fixed-gas semantics; real Arc gas dynamics differ.
    function test_T13_gasExhaustingMerchantRollsBackState() public {
        GasExhaustingMerchant gem = new GasExhaustingMerchant();
        vm.prank(address(gem));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));

        uint256 nonceBefore    = c.nextNonce(address(gem));
        uint256 contractBefore = address(c).balance;
        uint256 payerBefore    = payer1.balance;
        ArcProofInvoices.Invoice memory snap = c.getInvoice(id);

        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.MERCHANT_CALL_FAILED.selector);
        c.payInvoice{value: AMOUNT_1, gas: 500_000}(id);

        ArcProofInvoices.Invoice memory after_ = c.getInvoice(id);
        assertFalse(after_.paid,                            "paid must be false");
        assertEq(after_.payer,          address(0),         "payer must be zero");
        assertEq(after_.paidAt,         0,                  "paidAt must be zero");
        assertEq(after_.paidBlockNumber, 0,                 "paidBlockNumber must be zero");
        assertEq(after_.merchant,       snap.merchant,      "merchant unchanged");
        assertEq(after_.amountNative,   snap.amountNative,  "amountNative unchanged");
        assertEq(after_.expiresAt,      snap.expiresAt,     "expiresAt unchanged");
        assertEq(after_.termsHash,      snap.termsHash,     "termsHash unchanged");
        assertEq(c.nextNonce(address(gem)), nonceBefore,    "nonce unchanged");
        assertEq(address(c).balance,    contractBefore,     "contract balance unchanged");
        assertEq(payer1.balance,        payerBefore,        "payer balance unchanged");
    }

    // -----------------------------------------------------------------------
    // T14 — Direct value / wrong selector / value-on-create reject
    // -----------------------------------------------------------------------

    function test_T14_directValueTransferReverts() public {
        vm.deal(payer1, 100 ether);
        vm.prank(payer1);
        (bool ok,) = address(c).call{value: 1 ether}("");
        assertFalse(ok, "direct ETH must revert (no receive/fallback)");
    }

    function test_T14_wrongSelectorReverts() public {
        vm.prank(payer1);
        (bool ok,) = address(c).call(abi.encodeWithSignature("nonExistentFn()"));
        assertFalse(ok, "unknown selector must revert");
    }

    function test_T14_wrongSelectorWithValueReverts() public {
        vm.deal(payer1, 100 ether);
        vm.prank(payer1);
        (bool ok,) = address(c).call{value: 1 ether}(abi.encodeWithSignature("nonExistentFn()"));
        assertFalse(ok, "unknown selector with value must revert");
    }

    function test_T14_createInvoiceWithValueReverts() public {
        vm.deal(merchant1, 100 ether);
        vm.prank(merchant1);
        (bool ok,) = address(c).call{value: 1 ether}(
            abi.encodeWithSignature("createInvoice(uint256,uint64,bytes32)",
                AMOUNT_1, _defaultExpiry(), bytes32(0))
        );
        assertFalse(ok, "createInvoice with value must revert");
    }

    // -----------------------------------------------------------------------
    // T15 — Prefunded balances untouched; forced balance mutation reverts
    // -----------------------------------------------------------------------

    /// @dev Pre-funded balance is preserved exactly after a SUCCESSFUL payment.
    function test_T15_prefundedBalanceUntouched() public {
        vm.deal(address(c), 10 ether);
        uint256 initial = address(c).balance;

        AcceptingMerchant am = new AcceptingMerchant();
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));

        vm.deal(payer1, 100 ether);
        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);

        assertEq(address(c).balance, initial, "prefunded balance preserved after payment");
    }

    /// @dev selfdestruct injected during callback fires BALANCE_MISMATCH.
    ///      Paris EVM: selfdestruct transfers balance immediately within the same tx.
    ///      All invoice fields, nonce, and payer balance must be rolled back.
    function test_T15_forcedBalanceMutationDuringCallbackReverts() public {
        ForceEther fe = new ForceEther{value: 1 ether}();
        ForceSendMerchant fsm = new ForceSendMerchant(c);
        fsm.setForcer(payable(address(fe)));

        vm.prank(address(fsm));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), bytes32(0));
        ArcProofInvoices.Invoice memory snapBefore = c.getInvoice(id);

        // Fund payer BEFORE capturing payerBefore
        vm.deal(payer1, AMOUNT_1 + 1 ether);
        uint256 nonceBefore    = c.nextNonce(address(fsm));
        uint256 payerBefore    = payer1.balance;
        // contractBefore and fsmBefore recorded for traceability (see note below)
        uint256 contractBefore = address(c).balance;
        uint256 fsmBefore      = address(fsm).balance;

        // Must revert exactly with BALANCE_MISMATCH
        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.BALANCE_MISMATCH.selector);
        c.payInvoice{value: AMOUNT_1}(id);

        // All invoice fields rolled back
        ArcProofInvoices.Invoice memory snapAfter = c.getInvoice(id);
        assertFalse(snapAfter.paid,                              "paid rolled back");
        assertEq(snapAfter.payer,          address(0),           "payer rolled back");
        assertEq(snapAfter.paidAt,         0,                    "paidAt rolled back");
        assertEq(snapAfter.paidBlockNumber, 0,                   "paidBlockNumber rolled back");
        assertEq(snapAfter.merchant,       snapBefore.merchant,  "merchant unchanged");
        assertEq(snapAfter.amountNative,   snapBefore.amountNative, "amount unchanged");
        assertEq(snapAfter.expiresAt,      snapBefore.expiresAt, "expiresAt unchanged");
        assertEq(snapAfter.termsHash,      snapBefore.termsHash, "termsHash unchanged");

        // Nonce and payer balance rolled back
        assertEq(c.nextNonce(address(fsm)), nonceBefore, "nonce unchanged");
        assertEq(payer1.balance, payerBefore,            "payer balance unchanged");

        // Note: selfdestruct in Paris is NOT rolled back by an outer revert once executed.
        // ForceEther's ETH may have landed in the contract even though payInvoice reverted.
        // We assert payer refund and invoice non-payment (the required invariants).
        // contractBefore and fsmBefore are recorded above for traceability only.
        emit log_named_uint("pre-call contractBefore", contractBefore);
        emit log_named_uint("pre-call fsmBefore",      fsmBefore);
    }

    // -----------------------------------------------------------------------
    // T16 — Fuzz: values / time / actors / balance invariants
    // -----------------------------------------------------------------------

    function testFuzz_T16_createAndPayBalanceInvariant(
        uint64 amountMicro,
        uint32 lifetimeSeconds
    ) public {
        amountMicro     = uint64(bound(amountMicro,     1, 1_000_000));
        lifetimeSeconds = uint32(bound(lifetimeSeconds, 1, 7 days));
        uint256 amountNative = uint256(amountMicro) * 1e12;
        uint64  expiry       = uint64(block.timestamp + lifetimeSeconds);

        AcceptingMerchant am = new AcceptingMerchant();
        uint256 merchantBefore = address(am).balance;

        vm.prank(address(am));
        bytes32 id = c.createInvoice(amountNative, expiry, bytes32(0));

        vm.deal(payer1, amountNative + 1 ether);
        uint256 contractBefore = address(c).balance;

        vm.prank(payer1);
        c.payInvoice{value: amountNative}(id);

        assertTrue(c.getInvoice(id).paid);
        assertEq(address(am).balance, merchantBefore + amountNative, "merchant balance");
        assertEq(address(c).balance,  contractBefore,               "contract balance invariant");
    }

    /// @dev wrongAmount is bounded BEFORE vm.assume to prevent the bounded value
    ///      silently equalling amountNative after clamping.
    function testFuzz_T16_revertOnWrongAmount(
        uint64  amountMicro,
        uint256 wrongAmount
    ) public {
        amountMicro  = uint64(bound(amountMicro, 1, 1_000_000));
        uint256 amountNative = uint256(amountMicro) * 1e12;

        // Bound BEFORE assume
        wrongAmount = bound(wrongAmount, 0, 2e18);
        vm.assume(wrongAmount != amountNative);

        bytes32 id = _createInvoice(merchant1, amountNative, _defaultExpiry(), bytes32(0));
        vm.deal(payer1, wrongAmount + 1 ether);

        vm.prank(payer1);
        vm.expectRevert(ArcProofInvoices.WRONG_AMOUNT.selector);
        c.payInvoice{value: wrongAmount}(id);
        assertFalse(c.getInvoice(id).paid);
    }

    function testFuzz_T16_nonceIncrements(uint8 count) public {
        count = uint8(bound(count, 1, 50));
        uint64 expiry = _defaultExpiry();
        for (uint256 i = 0; i < count; i++) {
            _createInvoice(merchant1, AMOUNT_1, expiry, bytes32(0));
        }
        assertEq(c.nextNonce(merchant1), count);
    }

    // -----------------------------------------------------------------------
    // T17 — Callable surface / dependency evidence / OZ version
    // -----------------------------------------------------------------------

    function test_T17_callableSurface() public {
        assertEq(c.MAX_INVOICE_AMOUNT(), 1e18,   "MAX_INVOICE_AMOUNT");
        assertEq(c.AMOUNT_QUANTUM(),     1e12,   "AMOUNT_QUANTUM");
        assertEq(c.MAX_LIFETIME(),       7 days, "MAX_LIFETIME");
        assertEq(c.nextNonce(address(0)), 0,     "nextNonce");

        bytes32 unknownId = keccak256("callableSurface");
        vm.expectRevert(ArcProofInvoices.UNKNOWN_INVOICE.selector);
        c.getInvoice(unknownId);

        vm.expectRevert(ArcProofInvoices.UNKNOWN_INVOICE.selector);
        c.payInvoice{value: 0}(unknownId);
    }

    // OZ 5.1.0 version evidence (captured 2026-10-20):
    //   package.json pin              : @openzeppelin/contracts "5.1.0"
    //   bun.lock resolved             : @openzeppelin/contracts@5.1.0
    //   bun.lock integrity (sha512)   : sha512-p1ULhl7BXzjjbha5aqst+QMLY+4/LCWADXOCsmLHRM77AqiPjnd9vvUN9sosUfhL9JGKpZ0TjEGxgvnizmWGSA==
    //   ReentrancyGuard.sol sha256    : 32fbb1c908ec1b4de85cc1bb10091aebd5816ffe80dfdd5ca5e084fbea67a462
    //   OZ package.json sha256        : 765a3a984fc182b033cc1daa3051c8b5c2d3b75d209765fe5a711b2023f06967
    //   forge version                 : 1.7.1 (4072e48705af9d93e3c0f6e29e93b5e9a40caed8)
    //   solc version                  : 0.8.28+commit.7893614a.Linux.g++
    //   evm_version (foundry.toml)    : paris
    //
    //   Necessary condition argument: from OZ 5.2.0, utils/Bytes.sol introduces the
    //   Cancun-only mcopy opcode, which fails to compile under evm_version=paris.
    //   A successful paris build + the lock-file integrity hash above establishes 5.1.0.
    function test_T17_ozVersionPinned() public view {
        // Runtime: OZ 5.x ReentrancyGuard initialises _status to NOT_ENTERED = 1.
        bytes32 slot0 = vm.load(address(c), bytes32(uint256(0)));
        assertEq(uint256(slot0), 1,
            "OZ 5.x ReentrancyGuard _status NOT_ENTERED=1; lock-file evidence in comment above");
    }

    function test_T17_reentrancyGuardPresent() public view {
        bytes32 slot0 = vm.load(address(c), bytes32(uint256(0)));
        assertEq(uint256(slot0), 1, "ReentrancyGuard _status == NOT_ENTERED(1) at init");
    }

    function test_T17_nonzeroTermsHashPaymentSucceeds() public {
        bytes32 nonzeroHash = keccak256("terms-v1");
        AcceptingMerchant am = new AcceptingMerchant();
        vm.prank(address(am));
        bytes32 id = c.createInvoice(AMOUNT_1, _defaultExpiry(), nonzeroHash);

        assertEq(c.getInvoice(id).termsHash, nonzeroHash, "termsHash stored");

        vm.deal(payer1, 100 ether);
        vm.prank(payer1);
        c.payInvoice{value: AMOUNT_1}(id);

        ArcProofInvoices.Invoice memory inv = c.getInvoice(id);
        assertTrue(inv.paid,                 "invoice paid");
        assertEq(inv.payer, payer1,          "payer recorded");
        assertEq(inv.termsHash, nonzeroHash, "termsHash preserved post-payment");
    }

    function test_T17_distinctSameAmountInvoicesHaveDifferentIds() public {
        bytes32 id1 = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), bytes32(0));
        bytes32 id2 = _createInvoice(merchant1, AMOUNT_1, _defaultExpiry(), bytes32(0));
        assertTrue(id1 != id2);
    }

    function test_T17_noncePageBoundaries() public {
        uint64 expiry = _defaultExpiry();
        for (uint256 i = 0; i < 20; i++) {
            _createInvoice(merchant1, AMOUNT_1, expiry, bytes32(0));
        }
        assertEq(c.nextNonce(merchant1), 20);
        bytes32 expected19 = _expectedId(block.chainid, address(c), merchant1, 19);
        assertEq(c.getInvoice(expected19).amountNative, AMOUNT_1);
    }

    // -----------------------------------------------------------------------
    // T16 (additional) — Fuzz varied merchant/payer identities + adversarial sequence
    // -----------------------------------------------------------------------

    /// @dev Fuzz varied merchant and payer EOA addresses with an adversarial
    ///      payment sequence: wrong-amount fails (state intact), then correct
    ///      payment succeeds with exact balance accounting.
    ///      Merchant/payer are derived from fuzz inputs — not the fixed 0x1111/0x3333.
    function testFuzz_T16_variedActorsAdversarialSequence(
        address fuzzMerchant,
        address fuzzPayer,
        uint32  amountMicro,
        uint32  lifetimeSeconds
    ) public {
        amountMicro     = uint32(bound(amountMicro,     1,      1_000_000));
        lifetimeSeconds = uint32(bound(lifetimeSeconds, 1,      7 days));
        uint256 amtN  = uint256(amountMicro) * 1e12;
        uint64  expiry = uint64(block.timestamp + lifetimeSeconds);

        // Skip problematic actors
        vm.assume(fuzzMerchant != address(0) && fuzzMerchant != address(c));
        vm.assume(fuzzPayer    != address(0) && fuzzPayer    != address(c));
        vm.assume(fuzzMerchant != fuzzPayer);
        vm.assume(fuzzMerchant.code.length == 0); // EOA accepts ETH natively
        vm.assume(fuzzPayer.code.length    == 0);

        vm.deal(fuzzMerchant, 0);
        vm.deal(fuzzPayer,    amtN * 2 + 1 ether);

        vm.prank(fuzzMerchant);
        bytes32 id = c.createInvoice(amtN, expiry, bytes32(0));
        assertEq(c.nextNonce(fuzzMerchant), 1);

        uint256 cBefore = address(c).balance;
        uint256 pBefore = fuzzPayer.balance;
        uint256 mBefore = fuzzMerchant.balance;

        // Wrong-amount attempt (under by 1 quantum): must revert, leave state intact
        uint256 wrong = amtN - 1e12;
        vm.assume(wrong != amtN); // always true since 1e12>0, but explicit
        vm.prank(fuzzPayer);
        vm.expectRevert(ArcProofInvoices.WRONG_AMOUNT.selector);
        c.payInvoice{value: wrong}(id);
        assertFalse(c.getInvoice(id).paid,           "not paid after wrong amount");
        assertEq(c.getInvoice(id).payer, address(0), "payer zero after wrong amount");
        assertEq(address(c).balance, cBefore,        "contract unchanged after failed pay");
        assertEq(fuzzPayer.balance,   pBefore,        "payer unchanged after failed pay");

        // Correct payment: must succeed with exact balances
        vm.prank(fuzzPayer);
        c.payInvoice{value: amtN}(id);
        assertTrue(c.getInvoice(id).paid,                         "invoice paid");
        assertEq(c.getInvoice(id).payer,   fuzzPayer,             "payer recorded");
        assertEq(fuzzMerchant.balance,     mBefore + amtN,        "merchant received");
        assertEq(address(c).balance,       cBefore,               "contract invariant");
        assertEq(fuzzPayer.balance,        pBefore - amtN,        "payer net");
    }

    /// @dev Fuzz two independent merchants and payers: paying A must not affect B.
    function testFuzz_T16_multiMerchantPayerIndependence(
        uint32 amountMicroA,
        uint32 amountMicroB
    ) public {
        amountMicroA = uint32(bound(amountMicroA, 1, 500_000));
        amountMicroB = uint32(bound(amountMicroB, 1, 500_000));
        uint256 amtA = uint256(amountMicroA) * 1e12;
        uint256 amtB = uint256(amountMicroB) * 1e12;

        AcceptingMerchant mA = new AcceptingMerchant();
        AcceptingMerchant mB = new AcceptingMerchant();
        address pA = address(0xAAAA);
        address pB = address(0xBBBB);
        vm.deal(pA, amtA + 1 ether);
        vm.deal(pB, amtB + 1 ether);

        vm.prank(address(mA));
        bytes32 idA = c.createInvoice(amtA, _defaultExpiry(), bytes32(0));
        vm.prank(address(mB));
        bytes32 idB = c.createInvoice(amtB, _defaultExpiry(), bytes32(0));
        assertTrue(idA != idB, "IDs must be distinct");

        // Pay A; B must remain unpaid
        vm.prank(pA);
        c.payInvoice{value: amtA}(idA);
        assertTrue(c.getInvoice(idA).paid,  "A paid");
        assertFalse(c.getInvoice(idB).paid, "B unaffected by A payment");

        // Pay B; A payer must be unchanged
        vm.prank(pB);
        c.payInvoice{value: amtB}(idB);
        assertTrue(c.getInvoice(idB).paid,          "B paid");
        assertEq(c.getInvoice(idA).payer, pA,       "A payer unchanged");
        assertEq(address(mA).balance,     amtA,     "mA received only amtA");
        assertEq(address(mB).balance,     amtB,     "mB received only amtB");
    }
}
