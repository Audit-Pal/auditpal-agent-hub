// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { RewardEscrow } from "./RewardEscrow.sol";

/**
 * @title RewardFactory
 * @notice Deploys and tracks per-organisation RewardEscrow instances.
 *
 *  Each organisation gets exactly one escrow contract bound to a specific
 *  ERC-20 token (e.g. USDC on Base). The factory owner can also deploy
 *  escrows on behalf of organisations.
 */
contract RewardFactory {
    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    uint256 public defaultRefundTimeout;

    /// orgAdmin → escrow address
    mapping(address => address) public escrows;
    address[] public allEscrows;

    // ── Events ───────────────────────────────────────────────────────────────
    event EscrowDeployed(address indexed orgAdmin, address indexed escrow, address token);
    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);

    // ── Errors ───────────────────────────────────────────────────────────────
    error OnlyOwner();
    error EscrowAlreadyExists();
    error EscrowNotFound();

    // ── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────
    /**
     * @param _defaultRefundTimeout Seconds before an org admin can reclaim
     *        an unclaimed reward (e.g. 30 days = 2_592_000).
     */
    constructor(uint256 _defaultRefundTimeout) {
        owner = msg.sender;
        defaultRefundTimeout = _defaultRefundTimeout;
    }

    // ── Deploy ───────────────────────────────────────────────────────────────
    /**
     * @notice Deploy a new RewardEscrow for the given organisation admin.
     * @param orgAdmin  The wallet that will administer the escrow.
     * @param token     The ERC-20 token used for payouts (e.g. USDC).
     */
    function deployEscrow(address orgAdmin, address token) external onlyOwner returns (address) {
        if (escrows[orgAdmin] != address(0)) revert EscrowAlreadyExists();

        RewardEscrow escrow = new RewardEscrow(orgAdmin, token, defaultRefundTimeout);
        address escrowAddr = address(escrow);

        escrows[orgAdmin] = escrowAddr;
        allEscrows.push(escrowAddr);

        emit EscrowDeployed(orgAdmin, escrowAddr, token);
        return escrowAddr;
    }

    // ── View ─────────────────────────────────────────────────────────────────
    function getEscrow(address orgAdmin) external view returns (address) {
        address esc = escrows[orgAdmin];
        if (esc == address(0)) revert EscrowNotFound();
        return esc;
    }

    function totalEscrows() external view returns (uint256) {
        return allEscrows.length;
    }

    // ── Admin ────────────────────────────────────────────────────────────────
    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setDefaultRefundTimeout(uint256 timeout) external onlyOwner {
        defaultRefundTimeout = timeout;
    }
}
