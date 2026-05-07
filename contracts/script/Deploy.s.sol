// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import { RewardFactory } from "../src/RewardFactory.sol";
import { MockUSDC } from "../src/MockUSDC.sol";

/**
 * @title DeployBaseSepolia
 * @notice Deploys RewardFactory + MockUSDC on Base Sepolia.
 *
 *  Usage:
 *   source contracts/.env
 *   forge script script/Deploy.s.sol:DeployBaseSepolia \
 *       --rpc-url $BASE_SEPOLIA_RPC_URL \
 *       --private-key $DEPLOYER_PRIVATE_KEY \
 *       --broadcast \
 *       --verify
 */
contract DeployBaseSepolia is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        // 1. Deploy MockUSDC (testnet only)
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // 2. Deploy RewardFactory (30-day refund timeout)
        uint256 thirtyDays = 30 days;
        RewardFactory factory = new RewardFactory(thirtyDays);
        console.log("RewardFactory deployed at:", address(factory));

        // 3. Mint some testnet USDC to deployer for testing
        usdc.mint(deployer, 1_000_000 * 1e6); // 1M USDC
        console.log("Minted 1,000,000 USDC to deployer");

        vm.stopBroadcast();

        // Log deployment summary
        console.log("");
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Base Sepolia (84532)");
        console.log("MockUSDC:", address(usdc));
        console.log("RewardFactory:", address(factory));
        console.log("");
        console.log("Next steps:");
        console.log("  1. Copy addresses to server .env");
        console.log("  2. Set REWARD_FACTORY_ADDRESS and MOCK_USDC_ADDRESS");
    }
}
