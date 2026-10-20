// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ArcProofInvoices
 * @notice Immutable invoice-bound native-USDC payment prototype on Arc Testnet.
 *
 * Arc Testnet uses native USDC with 18 decimals as the gas token.
 * Amount is in native USDC units (18 decimals), e.g. 0.20 USDC = 200000000000000000.
 *
 * This is a minimal prototype, not an audited or production-ready payment processor.
 * It performs atomic forwarding: msg.value is received and forwarded to the merchant
 * in the same transaction. The contract does not hold funds in escrow.
 *
 * termsHash is an opaque bytes32 field preserved verbatim. The contract never
 * interprets or gates on its value — that is a UI-layer concern.
 *
 * GRANT STATUS: Free prototype development is authorized for testnet/local scope
 * per owner directive 2026-10-20. Grant eligibility: HOLD (independent of this scope).
 * Do not claim grant eligibility has been established.
 */
contract ArcProofInvoices is ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Maximum invoice amount: 1 USDC in native 18-decimal units.
    uint256 public constant MAX_INVOICE_AMOUNT = 1e18;

    /// @notice Amounts must be a multiple of 1e12 (expressible in 6-decimal microUSDC).
    uint256 public constant AMOUNT_QUANTUM = 1e12;

    /// @notice Maximum lifetime of an invoice: 7 days in seconds.
    uint64 public constant MAX_LIFETIME = 7 days;

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @notice Next unused nonce per merchant address.
    /// @dev Nonces begin at 0. Created invoices cover [0, nextNonce(merchant)).
    mapping(address => uint256) public nextNonce;

    struct Invoice {
        address merchant;
        uint256 amountNative;
        uint64 expiresAt;
        bytes32 termsHash;
        bool paid;
        address payer;
        uint64 paidAt;
        uint256 paidBlockNumber;
    }

    /// @notice Invoice storage keyed by invoice ID.
    mapping(bytes32 => Invoice) private _invoices;

    // -------------------------------------------------------------------------
    // Custom errors
    // -------------------------------------------------------------------------

    error ZERO_AMOUNT();
    error AMOUNT_TOO_LARGE();
    error AMOUNT_NOT_DIVISIBLE();
    error EXPIRY_IN_PAST();
    error EXPIRY_TOO_FAR();
    error UNKNOWN_INVOICE();
    error ALREADY_PAID();
    error EXPIRED();
    error WRONG_AMOUNT();
    error MERCHANT_CALL_FAILED();
    error BALANCE_MISMATCH();

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        address indexed merchant,
        uint256 merchantNonce,
        uint256 amountNative,
        uint64 expiresAt,
        bytes32 termsHash
    );

    event InvoicePaid(
        bytes32 indexed invoiceId,
        address indexed payer,
        address indexed merchant,
        uint256 amountNative
    );

    // -------------------------------------------------------------------------
    // Write functions
    // -------------------------------------------------------------------------

    /**
     * @notice Create a new invoice. The caller becomes the merchant.
     * @param amountNative Amount in native 18-decimal USDC units.
     *                     Must be > 0, <= MAX_INVOICE_AMOUNT, and divisible by AMOUNT_QUANTUM.
     * @param expiresAt    Unix timestamp of expiry. Must be > block.timestamp
     *                     and <= block.timestamp + MAX_LIFETIME.
     * @param termsHash    Opaque commitment hash. Stored verbatim; never interpreted here.
     * @return invoiceId   The canonical invoice ID.
     */
    function createInvoice(
        uint256 amountNative,
        uint64 expiresAt,
        bytes32 termsHash
    ) external nonReentrant returns (bytes32 invoiceId) {
        // --- Validate amount ---
        if (amountNative == 0) revert ZERO_AMOUNT();
        if (amountNative > MAX_INVOICE_AMOUNT) revert AMOUNT_TOO_LARGE();
        if (amountNative % AMOUNT_QUANTUM != 0) revert AMOUNT_NOT_DIVISIBLE();

        // --- Validate expiry ---
        if (expiresAt <= block.timestamp) revert EXPIRY_IN_PAST();
        if (expiresAt > block.timestamp + MAX_LIFETIME) revert EXPIRY_TOO_FAR();

        // --- Derive ID ---
        uint256 nonce = nextNonce[msg.sender];
        invoiceId = keccak256(
            abi.encode(block.chainid, address(this), msg.sender, nonce)
        );

        // --- Store ---
        _invoices[invoiceId] = Invoice({
            merchant: msg.sender,
            amountNative: amountNative,
            expiresAt: expiresAt,
            termsHash: termsHash,
            paid: false,
            payer: address(0),
            paidAt: 0,
            paidBlockNumber: 0
        });

        // --- Increment nonce ---
        nextNonce[msg.sender] = nonce + 1;

        emit InvoiceCreated(invoiceId, msg.sender, nonce, amountNative, expiresAt, termsHash);
    }

    /**
     * @notice Pay an invoice. Caller sends exact msg.value equal to amountNative.
     * @dev Checks-effects-interactions pattern with balance integrity check.
     *      Forwards msg.value to merchant atomically. Emits InvoicePaid only on success.
     *      termsHash is opaque; any value (including nonzero) is accepted here.
     *      UI-layer enforcement of termsHash semantics is the caller's responsibility.
     * @param invoiceId The invoice ID to pay.
     */
    function payInvoice(bytes32 invoiceId) external payable nonReentrant {
        Invoice storage inv = _invoices[invoiceId];

        // --- Existence check ---
        if (inv.merchant == address(0)) revert UNKNOWN_INVOICE();

        // --- State checks ---
        if (inv.paid) revert ALREADY_PAID();
        if (block.timestamp >= inv.expiresAt) revert EXPIRED();

        // --- Amount check ---
        if (msg.value != inv.amountNative) revert WRONG_AMOUNT();

        // --- Record balance before forwarding ---
        // address(this).balance includes msg.value at this point.
        // balanceBefore is the balance that must exist AFTER forwarding msg.value.
        uint256 balanceBefore = address(this).balance - msg.value;

        // --- Effects: mark paid before external call (checks-effects-interactions) ---
        inv.paid = true;
        inv.payer = msg.sender;
        inv.paidAt = uint64(block.timestamp);
        inv.paidBlockNumber = block.number;

        // --- Interactions: forward to merchant ---
        address merchant = inv.merchant;
        (bool success, ) = merchant.call{value: msg.value}("");
        if (!success) revert MERCHANT_CALL_FAILED();

        // --- Balance integrity check: must be back to balanceBefore ---
        if (address(this).balance != balanceBefore) revert BALANCE_MISMATCH();

        emit InvoicePaid(invoiceId, msg.sender, merchant, msg.value);
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    /**
     * @notice Read a stored invoice. Reverts with UNKNOWN_INVOICE for missing IDs.
     * @param invoiceId The invoice ID to look up.
     * @return The Invoice struct.
     */
    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        Invoice memory inv = _invoices[invoiceId];
        if (inv.merchant == address(0)) revert UNKNOWN_INVOICE();
        return inv;
    }

    // -------------------------------------------------------------------------
    // No receive() or fallback() defined.
    // Solidity's default behaviour rejects any direct ETH transfer or unknown
    // selector without these functions present.
    // -------------------------------------------------------------------------
}
