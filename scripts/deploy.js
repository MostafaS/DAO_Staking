// We require the Hardhat Runtime Environment explicitly here.
const { ethers, network, run } = require("hardhat");

async function main() {
  console.log("Deploying DAO Ecosystem contracts...");

  // Deploy GovToken
  const GovToken = await ethers.getContractFactory("GovToken");
  const govToken = await GovToken.deploy();
  await govToken.waitForDeployment();
  const govTokenAddress = await govToken.getAddress();
  console.log("GovToken deployed to:", govTokenAddress);

  // Define reward rate - 1 GOV token per ETH staked per day
  // Assuming 86400 seconds in a day, this gives approximately 1.15e-5 tokens per second
  const rewardRate = ethers.parseEther("0.0000115");

  // Deploy Staking contract (now accepts ETH directly)
  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(govTokenAddress, rewardRate);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("Staking contract deployed to:", stakingAddress);

  // Set staking contract in GovToken
  const setStakingTx = await govToken.setStakingContract(stakingAddress);
  await setStakingTx.wait();
  console.log("Staking contract set in GovToken");

  // Deploy DAO Governance contract
  const DAOGovernance = await ethers.getContractFactory("DAOGovernance");
  const daoGovernance = await DAOGovernance.deploy(govTokenAddress);
  await daoGovernance.waitForDeployment();
  const daoGovernanceAddress = await daoGovernance.getAddress();
  console.log("DAO Governance contract deployed to:", daoGovernanceAddress);

  console.log("All contracts deployed successfully!");

  // Output all contract addresses for easy reference
  console.log("\nContract Addresses:");
  console.log("-------------------");
  console.log("GovToken:", govTokenAddress);
  console.log("Staking:", stakingAddress);
  console.log("DAO Governance:", daoGovernanceAddress);

  // Verify contracts on Etherscan if not on a local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nVerifying contracts on Etherscan...");
    
    // Give Etherscan some time to index the contracts
    console.log("Waiting for 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Verify GovToken
    console.log("Verifying GovToken...");
    try {
      await run("verify:verify", {
        address: govTokenAddress,
        constructorArguments: []
      });
      console.log("GovToken verified successfully ✅");
    } catch (error) {
      console.log("Failed to verify GovToken:", error.message);
    }
    
    // Verify Staking Contract
    console.log("Verifying Staking contract...");
    try {
      await run("verify:verify", {
        address: stakingAddress,
        constructorArguments: [govTokenAddress, rewardRate]
      });
      console.log("Staking contract verified successfully ✅");
    } catch (error) {
      console.log("Failed to verify Staking contract:", error.message);
    }
    
    // Verify DAO Governance Contract
    console.log("Verifying DAO Governance contract...");
    try {
      await run("verify:verify", {
        address: daoGovernanceAddress,
        constructorArguments: [govTokenAddress]
      });
      console.log("DAO Governance contract verified successfully ✅");
    } catch (error) {
      console.log("Failed to verify DAO Governance contract:", error.message);
    }
    
    console.log("Contract verification process completed!");
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 