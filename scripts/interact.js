// This script can be used to interact with the deployed contracts
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting with contracts as:", deployer.address);

  // Replace these addresses with your deployed contract addresses on .env file or you can use the default ones that i already set
  const govTokenAddress = process.env.GOV_TOKEN_ADDRESS;
  const stakingAddress = process.env.STAKING_ADDRESS;
  const daoGovAddress = process.env.DAO_GOV_ADDRESS;

  if (!govTokenAddress || !stakingAddress || !daoGovAddress) {
    console.error("Please set the contract addresses in your .env file");
    return;
  }

  // Connect to deployed contracts
  const govToken = await ethers.getContractAt("GovToken", govTokenAddress);
  const staking = await ethers.getContractAt("Staking", stakingAddress);
  const daoGovernance = await ethers.getContractAt("DAOGovernance", daoGovAddress);

  // Display contract information
  console.log("\nContract Information:");
  console.log("---------------------");
  console.log("GovToken:", await govToken.getAddress());
  console.log("Staking:", await staking.getAddress());
  console.log("DAO Governance:", await daoGovernance.getAddress());

  // Get deployer ETH (Native token) balance
  const ethBalance = await ethers.provider.getBalance(deployer.address);

  console.log("\nUser Balances:");
  console.log("ETH Balance:", ethers.formatEther(ethBalance));
  console.log("GovToken:", ethers.formatEther(await govToken.balanceOf(deployer.address)));
  
  console.log("\nStaking Info:");
  console.log("User staked amount:", ethers.formatEther(await staking.stakedBalance(deployer.address)));
  console.log("Total staked amount:", ethers.formatEther(await staking.totalStaked()));
  console.log("Unclaimed rewards:", ethers.formatEther(await staking.getUnclaimedRewards(deployer.address)));

  console.log("\nDAO Info:");
  const proposalCount = await daoGovernance.proposalCount();
  console.log("Proposal count:", proposalCount);

  // If there are proposals, displaying details for each one
  if (proposalCount > 0) {
    console.log("\nProposal Details:");
    console.log("----------------");
    
    for (let i = 0; i < proposalCount; i++) {
      // Getting proposal details
      const proposal = await daoGovernance.getProposalStatus(i);
      
      // Format timestamp to readable date - converting BigInt to Number first
      const votingEndTimestamp = Number(proposal.voteDeadline);
      const votingEndTime = new Date(votingEndTimestamp * 1000);
      const isActive = votingEndTimestamp > Math.floor(Date.now() / 1000);
      
      console.log(`\nProposal #${i}:`);
      console.log(`Description: ${proposal.description}`);
      console.log(`Voting Ends: ${votingEndTime.toLocaleString()}`);
      console.log(`Status: ${isActive ? "Active" : proposal.executed ? "Executed" : "Ended (not executed)"}`);
      console.log(`Yes Votes: ${ethers.formatEther(proposal.yesVotes)}`);
      console.log(`No Votes: ${ethers.formatEther(proposal.noVotes)}`);
      
      // Calculating result if voting has ended
      if (!isActive) {
        const totalVotes = BigInt(proposal.yesVotes) + BigInt(proposal.noVotes);
        if (totalVotes > 0n) {
          const yesPercentage = (Number(ethers.formatEther(proposal.yesVotes)) / 
                               Number(ethers.formatEther(totalVotes)) * 100).toFixed(2);
          console.log(`Result: ${yesPercentage}% in favor`);
          console.log(`Outcome: ${BigInt(proposal.yesVotes) > BigInt(proposal.noVotes) ? "Passed" : "Rejected"}`);
        } else {
          console.log("No votes were cast");
        }
      }
      
      // Checking if current user has voted
      const hasVoted = await daoGovernance.hasVoted(i, deployer.address);
      if (hasVoted) {
        console.log("You have voted on this proposal");
      } else if (isActive) {
        console.log("You have not voted on this proposal yet");
      }
    }
  }

  // Example operations (Uncomment to use)
  
  // 1. Staking 1 ETH
  // console.log("\nStaking 1 ETH...");
  // await staking.stake({ value: ethers.parseEther("1.0") });

  // 2. Checking staked amount
  // console.log("\nStaked amount:", ethers.formatEther(await staking.stakedBalance(deployer.address)));
  
  // 3. Unstaking 0.5 ETH
  // console.log("\nUnstaking 0.5 ETH...");
  // await staking.unstake(ethers.parseEther("0.5"));
  // console.log("\nNew Staked amount:", ethers.formatEther(await staking.stakedBalance(deployer.address)));
  
  // 4. Claiming rewards
  // console.log("\nClaiming rewards...");
  // await staking.claimGovToken();
  
  // 5. Creating a proposal
  // console.log("\nCreating a proposal...");
  // const desc = "Proposal to add a new feature";
  // const votingPeriod = 1 * 24 * 60 * 60; // 1 day in seconds
  // await daoGovernance.createProposal(desc, votingPeriod);
  // console.log("\nProposal created successfully");
  
  // 6. Voting on a proposal
  // console.log("\nVoting on proposal...");
  // const proposalId = 0;
  // await daoGovernance.vote(proposalId, true); // true for yes, false for no
  // console.log("\nVoted successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 