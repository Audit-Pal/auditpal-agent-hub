// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { RewardFactory } from "../src/RewardFactory.sol";
import { RewardEscrow } from "../src/RewardEscrow.sol";
import { MockUSDC } from "../src/MockUSDC.sol";

contract RewardFactoryTest is Test {
    RewardFactory public factory;
    MockUSDC public usdc;

    address public deployer = address(0xDEAD);
    address public orgAdmin = address(0xBEEF);
    address public hunter = address(0xCAFE);

    uint256 internal hunterPrivateKey = 0xA11CE;
    address internal hunterFromPk;

    function setUp() public {
        hunterFromPk = vm.addr(hunterPrivateKey);

        vm.startPrank(deployer);
        usdc = new MockUSDC();
        factory = new RewardFactory(30 days);
        vm.stopPrank();
    }

    // ── Factory Tests ────────────────────────────────────────────────────────

    function test_deployEscrow() public {
        vm.prank(deployer);
        address escrowAddr = factory.deployEscrow(orgAdmin, address(usdc));

        assertTrue(escrowAddr != address(0), "Escrow should be deployed");
        assertEq(factory.getEscrow(orgAdmin), escrowAddr, "getEscrow should return correct address");
        assertEq(factory.totalEscrows(), 1, "totalEscrows should be 1");
    }

    function test_cannotDeployDuplicateEscrow() public {
        vm.startPrank(deployer);
        factory.deployEscrow(orgAdmin, address(usdc));

        vm.expectRevert(RewardFactory.EscrowAlreadyExists.selector);
        factory.deployEscrow(orgAdmin, address(usdc));
        vm.stopPrank();
    }

    function test_onlyOwnerCanDeploy() public {
        vm.prank(orgAdmin);
        vm.expectRevert(RewardFactory.OnlyOwner.selector);
        factory.deployEscrow(orgAdmin, address(usdc));
    }

    function test_getEscrowRevertIfNotFound() public {
        vm.expectRevert(RewardFactory.EscrowNotFound.selector);
        factory.getEscrow(address(0x999));
    }

    // ── Escrow Tests ─────────────────────────────────────────────────────────

    function test_depositAndClaimReward() public {
        // Deploy escrow
        vm.prank(deployer);
        address escrowAddr = factory.deployEscrow(orgAdmin, address(usdc));
        RewardEscrow escrow = RewardEscrow(escrowAddr);

        // Mint USDC to org admin
        usdc.mint(orgAdmin, 10_000 * 1e6);

        // Org deposits reward
        bytes32 reportId = keccak256("report-001");
        uint256 rewardAmount = 500 * 1e6; // 500 USDC

        vm.startPrank(orgAdmin);
        usdc.approve(escrowAddr, rewardAmount);
        escrow.depositReward(reportId, hunterFromPk, rewardAmount);
        vm.stopPrank();

        // Verify deposit
        RewardEscrow.Reward memory reward = escrow.getReward(reportId);
        assertEq(reward.payee, hunterFromPk);
        assertEq(reward.amount, rewardAmount);
        assertFalse(reward.claimed);
        assertEq(usdc.balanceOf(escrowAddr), rewardAmount);

        // Hunter claims with EIP-712 signature
        uint256 nonce = escrow.nonces(hunterFromPk);
        bytes32 structHash = keccak256(
            abi.encode(escrow.CLAIM_TYPEHASH(), reportId, hunterFromPk, escrowAddr, nonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(hunterPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(orgAdmin);
        escrow.approveReward(reportId);

        vm.prank(hunterFromPk);
        escrow.claimReward(reportId, signature);

        // Verify claim
        reward = escrow.getReward(reportId);
        assertTrue(reward.claimed);
        assertEq(usdc.balanceOf(hunterFromPk), rewardAmount);
        assertEq(usdc.balanceOf(escrowAddr), 0);
    }

    function test_cannotClaimTwice() public {
        vm.prank(deployer);
        address escrowAddr = factory.deployEscrow(orgAdmin, address(usdc));
        RewardEscrow escrow = RewardEscrow(escrowAddr);

        usdc.mint(orgAdmin, 10_000 * 1e6);
        bytes32 reportId = keccak256("report-002");

        vm.startPrank(orgAdmin);
        usdc.approve(escrowAddr, 100 * 1e6);
        escrow.depositReward(reportId, hunterFromPk, 100 * 1e6);
        vm.stopPrank();

        // First claim
        uint256 nonce = escrow.nonces(hunterFromPk);
        bytes32 structHash = keccak256(
            abi.encode(escrow.CLAIM_TYPEHASH(), reportId, hunterFromPk, escrowAddr, nonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(hunterPrivateKey, digest);

        vm.prank(orgAdmin);
        escrow.approveReward(reportId);

        vm.prank(hunterFromPk);
        escrow.claimReward(reportId, abi.encodePacked(r, s, v));

        // Second claim should revert
        nonce = escrow.nonces(hunterFromPk);
        structHash = keccak256(abi.encode(escrow.CLAIM_TYPEHASH(), reportId, hunterFromPk, escrowAddr, nonce));
        digest = keccak256(abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash));
        (v, r, s) = vm.sign(hunterPrivateKey, digest);

        vm.prank(hunterFromPk);
        vm.expectRevert(RewardEscrow.AlreadyClaimed.selector);
        escrow.claimReward(reportId, abi.encodePacked(r, s, v));
    }

    function test_invalidSignatureReverts() public {
        vm.prank(deployer);
        address escrowAddr = factory.deployEscrow(orgAdmin, address(usdc));
        RewardEscrow escrow = RewardEscrow(escrowAddr);

        usdc.mint(orgAdmin, 10_000 * 1e6);
        bytes32 reportId = keccak256("report-003");

        vm.startPrank(orgAdmin);
        usdc.approve(escrowAddr, 100 * 1e6);
        escrow.depositReward(reportId, hunterFromPk, 100 * 1e6);
        vm.stopPrank();

        // Sign with wrong key
        uint256 wrongKey = 0xBADBAD;
        uint256 nonce = escrow.nonces(hunterFromPk);
        bytes32 structHash = keccak256(
            abi.encode(escrow.CLAIM_TYPEHASH(), reportId, hunterFromPk, escrowAddr, nonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, digest);

        vm.prank(orgAdmin);
        escrow.approveReward(reportId);

        vm.expectRevert(RewardEscrow.InvalidSignature.selector);
        escrow.claimReward(reportId, abi.encodePacked(r, s, v));
    }

    function test_refundAfterTimeout() public {
        vm.prank(deployer);
        address escrowAddr = factory.deployEscrow(orgAdmin, address(usdc));
        RewardEscrow escrow = RewardEscrow(escrowAddr);

        usdc.mint(orgAdmin, 10_000 * 1e6);
        bytes32 reportId = keccak256("report-004");

        vm.startPrank(orgAdmin);
        usdc.approve(escrowAddr, 200 * 1e6);
        escrow.depositReward(reportId, hunterFromPk, 200 * 1e6);
        vm.stopPrank();

        uint256 adminBalanceBefore = usdc.balanceOf(orgAdmin);

        // Try refund too early
        vm.prank(orgAdmin);
        vm.expectRevert(RewardEscrow.RefundTooEarly.selector);
        escrow.refundReward(reportId);

        // Warp past refund timeout
        vm.warp(block.timestamp + 31 days);

        vm.prank(orgAdmin);
        escrow.refundReward(reportId);

        assertEq(usdc.balanceOf(orgAdmin), adminBalanceBefore + 200 * 1e6);
        assertTrue(escrow.getReward(reportId).refunded);
    }

    function test_topUpReward() public {
        vm.prank(deployer);
        address escrowAddr = factory.deployEscrow(orgAdmin, address(usdc));
        RewardEscrow escrow = RewardEscrow(escrowAddr);

        usdc.mint(orgAdmin, 10_000 * 1e6);
        bytes32 reportId = keccak256("report-topup");

        vm.startPrank(orgAdmin);
        usdc.approve(escrowAddr, 700 * 1e6);
        // Initial deposit
        escrow.depositReward(reportId, hunterFromPk, 500 * 1e6);
        // Top-up
        escrow.depositReward(reportId, hunterFromPk, 200 * 1e6);
        vm.stopPrank();

        RewardEscrow.Reward memory reward = escrow.getReward(reportId);
        assertEq(reward.amount, 700 * 1e6);
        assertEq(usdc.balanceOf(escrowAddr), 700 * 1e6);

        // Approve and claim
        vm.prank(orgAdmin);
        escrow.approveReward(reportId);

        uint256 nonce = escrow.nonces(hunterFromPk);
        bytes32 structHash = keccak256(
            abi.encode(escrow.CLAIM_TYPEHASH(), reportId, hunterFromPk, escrowAddr, nonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(hunterPrivateKey, digest);

        vm.prank(hunterFromPk);
        escrow.claimReward(reportId, abi.encodePacked(r, s, v));

        assertEq(usdc.balanceOf(hunterFromPk), 700 * 1e6);
    }

    function test_cannotClaimIfNotApproved() public {
        vm.prank(deployer);
        address escrowAddr = factory.deployEscrow(orgAdmin, address(usdc));
        RewardEscrow escrow = RewardEscrow(escrowAddr);

        usdc.mint(orgAdmin, 10_000 * 1e6);
        bytes32 reportId = keccak256("report-notapproved");

        vm.startPrank(orgAdmin);
        usdc.approve(escrowAddr, 100 * 1e6);
        escrow.depositReward(reportId, hunterFromPk, 100 * 1e6);
        vm.stopPrank();

        uint256 nonce = escrow.nonces(hunterFromPk);
        bytes32 structHash = keccak256(
            abi.encode(escrow.CLAIM_TYPEHASH(), reportId, hunterFromPk, escrowAddr, nonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(hunterPrivateKey, digest);

        vm.prank(hunterFromPk);
        vm.expectRevert(RewardEscrow.NotApproved.selector);
        escrow.claimReward(reportId, abi.encodePacked(r, s, v));
    }
}
