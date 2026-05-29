// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "lib/forge-std/src/interfaces/IERC20.sol";

/**
 * @title RewardEscrow
 * @notice Per-organisation escrow contract for AuditPal bounty rewards.
 *
 *  Lifecycle:
 *   1. Organisation (admin) deposits a reward via `depositReward`.
 *   2. The hunter triggers `claimReward`, providing an EIP-712 signature
 *      that proves ownership of the payee address recorded at deposit time.
 *   3. The escrow verifies the signature and transfers the token to the payee.
 *
 *  The admin can also refund unclaimed rewards after a configurable timeout.
 */
contract RewardEscrow {
    // ── Types ────────────────────────────────────────────────────────────────
    struct Reward {
        address payee;
        uint256 amount;
        bool claimed;
        bool refunded;
        bool approved;
        uint256 depositedAt;
    }

    // ── EIP-712 ──────────────────────────────────────────────────────────────
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("ClaimReward(bytes32 reportId,address payee,address escrow,uint256 nonce)");

    bytes32 public immutable DOMAIN_SEPARATOR;

    // ── State ────────────────────────────────────────────────────────────────
    address public admin; // organisation wallet
    address public factory; // deploying factory
    IERC20 public token; // payout token (USDC)
    uint256 public refundTimeout; // seconds before admin can reclaim
    uint256 public totalAllocated;

    mapping(bytes32 => Reward) public rewards;
    mapping(address => uint256) public nonces; // replay protection per payee
    bytes32[] public rewardIds;

    // ── Events ───────────────────────────────────────────────────────────────
    event EscrowInitialized(address admin, address token);
    event ProgramFunded(address indexed admin, uint256 amount);
    event RewardDeposited(bytes32 indexed reportId, address indexed payee, uint256 amount);
    event RewardClaimed(bytes32 indexed reportId, address indexed payee, uint256 amount);
    event RewardRefunded(bytes32 indexed reportId, uint256 amount);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    event RewardApproved(bytes32 indexed reportId);

    // ── Errors ───────────────────────────────────────────────────────────────
    error OnlyAdmin();
    error OnlyAdminOrFactory();
    error RewardNotFound();
    error AlreadyClaimed();
    error AlreadyRefunded();
    error InvalidSignature();
    error RefundTooEarly();
    error TransferFailed();
    error NotApproved();
    error PayeeMismatch();

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    modifier onlyAdminOrFactory() {
        if (msg.sender != admin && msg.sender != factory) revert OnlyAdminOrFactory();
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(address _admin, address _token, uint256 _refundTimeout) {
        admin = _admin;
        factory = msg.sender;
        token = IERC20(_token);
        refundTimeout = _refundTimeout;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("AuditPalEscrow"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    // ── Admin ────────────────────────────────────────────────────────────────
    function transferAdmin(address newAdmin) external onlyAdmin {
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    // ── Deposit ──────────────────────────────────────────────────────────────
    /**
     * @notice Allows the organization to pre-fund the escrow with USDC.
     */
    function fundProgram(uint256 amount) external {
        if (amount == 0) revert RewardNotFound();
        bool ok = token.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();
        emit ProgramFunded(msg.sender, amount);
    }

    /**
     * @notice Deposit a reward for a specific report + payee.
     * @dev Caller must have approved this contract for `amount` of `token` if the contract lacks unallocated funds.
     */
    function depositReward(bytes32 reportId, address payee, uint256 amount) external onlyAdminOrFactory {
        if (amount == 0) revert RewardNotFound(); // reuse error — zero amount

        Reward storage r = rewards[reportId];
        if (r.claimed) revert AlreadyClaimed();
        if (r.refunded) revert AlreadyRefunded();

        if (r.amount == 0) {
            rewards[reportId] = Reward({
                payee: payee,
                amount: amount,
                claimed: false,
                refunded: false,
                approved: false,
                depositedAt: block.timestamp
            });
            rewardIds.push(reportId);
        } else {
            if (r.payee != payee) revert PayeeMismatch();
            r.amount += amount;
        }

        uint256 unallocated = token.balanceOf(address(this)) - totalAllocated;
        if (unallocated < amount) {
            uint256 needed = amount - unallocated;
            bool ok = token.transferFrom(msg.sender, address(this), needed);
            if (!ok) revert TransferFailed();
        }

        totalAllocated += amount;

        emit RewardDeposited(reportId, payee, amount);
    }

    // ── Approval ─────────────────────────────────────────────────────────────
    /**
     * @notice Approve a reward so it can be claimed by the hunter.
     */
    function approveReward(bytes32 reportId) external onlyAdmin {
        Reward storage r = rewards[reportId];
        if (r.amount == 0) revert RewardNotFound();
        if (r.claimed) revert AlreadyClaimed();
        if (r.refunded) revert AlreadyRefunded();

        r.approved = true;
        emit RewardApproved(reportId);
    }

    // ── Claim ────────────────────────────────────────────────────────────────
    /**
     * @notice Hunter claims their reward by providing an EIP-712 signature.
     *
     *  The signed message is: ClaimReward(reportId, payee, escrow, nonce)
     *  where `payee` was set during deposit and `nonce` is the payee's
     *  current nonce in this contract (prevents replays).
     */
    function claimReward(bytes32 reportId, bytes calldata signature) external {
        Reward storage r = rewards[reportId];
        if (r.amount == 0) revert RewardNotFound();
        if (!r.approved) revert NotApproved();
        if (r.claimed) revert AlreadyClaimed();
        if (r.refunded) revert AlreadyRefunded();

        // Build EIP-712 digest
        uint256 currentNonce = nonces[r.payee];
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, reportId, r.payee, address(this), currentNonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        // Recover signer
        address signer = _recover(digest, signature);
        if (signer != r.payee) revert InvalidSignature();

        // Effects
        r.claimed = true;
        nonces[r.payee] = currentNonce + 1;
        totalAllocated -= r.amount;

        // Transfer
        bool ok = token.transfer(r.payee, r.amount);
        if (!ok) revert TransferFailed();

        emit RewardClaimed(reportId, r.payee, r.amount);
    }

    // ── Refund ───────────────────────────────────────────────────────────────
    function refundReward(bytes32 reportId) external onlyAdmin {
        Reward storage r = rewards[reportId];
        if (r.amount == 0) revert RewardNotFound();
        if (r.claimed) revert AlreadyClaimed();
        if (r.refunded) revert AlreadyRefunded();
        if (block.timestamp < r.depositedAt + refundTimeout) revert RefundTooEarly();

        r.refunded = true;
        totalAllocated -= r.amount;

        bool ok = token.transfer(admin, r.amount);
        if (!ok) revert TransferFailed();

        emit RewardRefunded(reportId, r.amount);
    }

    // ── View ─────────────────────────────────────────────────────────────────
    function getReward(bytes32 reportId) external view returns (Reward memory) {
        return rewards[reportId];
    }

    function totalRewards() external view returns (uint256) {
        return rewardIds.length;
    }

    // ── Internal ─────────────────────────────────────────────────────────────
    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "invalid sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }
}
