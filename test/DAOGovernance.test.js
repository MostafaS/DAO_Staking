const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAOGovernance", function () {
  let govToken;
  let daoGovernance;
  let owner;
  let voter1;
  let voter2;
  let voter3;
  let nonVoter;

  beforeEach(async function () {
    // Get signers
    [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();

    // Deploy GovToken
    const GovToken = await ethers.getContractFactory("GovToken");
    govToken = await GovToken.deploy();
    await govToken.waitForDeployment();

    // Set a mock staking contract (using owner for simplicity in tests)
    await govToken.setStakingContract(owner.address);

    // Mint some governance tokens to voters
    await govToken.mint(voter1.address, ethers.parseEther("100"));
    await govToken.mint(voter2.address, ethers.parseEther("200"));
    await govToken.mint(voter3.address, ethers.parseEther("300"));

    // Deploy DAOGovernance
    const DAOGovernance = await ethers.getContractFactory("DAOGovernance");
    daoGovernance = await DAOGovernance.deploy(await govToken.getAddress());
    await daoGovernance.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await daoGovernance.owner()).to.equal(owner.address);
    });

    it("Should set the governance token correctly", async function () {
      expect(await daoGovernance.govToken()).to.equal(await govToken.getAddress());
    });

    it("Should have no proposals initially", async function () {
      expect(await daoGovernance.proposalCount()).to.equal(0);
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow token holders to create proposals", async function () {
      const description = "Test Proposal";
      const votingPeriod = 7 * 24 * 60 * 60; // 7 days
      
      const tx = await daoGovernance.connect(voter1).createProposal(description, votingPeriod);
      const receipt = await tx.wait();
      
      // Get proposal ID from event
      const event = receipt.logs.find(log => {
        try {
          const decoded = daoGovernance.interface.parseLog({ topics: log.topics, data: log.data });
          return decoded.name === "ProposalCreated";
        } catch (e) {
          return false;
        }
      });
      
      const proposalId = event ? event.args[0] : 0;
      
      expect(proposalId).to.equal(0);
      expect(await daoGovernance.proposalCount()).to.equal(1);
      
      // Get proposal details
      const proposal = await daoGovernance.getProposalStatus(proposalId);
      expect(proposal.description).to.equal(description);
      
      // Check deadline is approximately now + votingPeriod (setting small variation due to block times)
      const expectedDeadline = (await ethers.provider.getBlock("latest")).timestamp + votingPeriod;
      expect(Number(proposal.voteDeadline)).to.be.closeTo(expectedDeadline, 10);
    });

    it("Should not allow non-token holders to create proposals", async function () {
      const description = "Bad Proposal";
      const votingPeriod = 7 * 24 * 60 * 60; // 7 days
      
      await expect(
        daoGovernance.connect(nonVoter).createProposal(description, votingPeriod)
      ).to.be.revertedWithCustomError(daoGovernance, "NoGovTokensHeld")
      .withArgs(nonVoter.address);
    });

    it("Should not allow proposals with too short voting periods", async function () {
      const description = "Short Proposal";
      const tooShortPeriod = 1; // 1 second
      const minimumPeriod = await daoGovernance.minimumVotingPeriod();
      
      await expect(
        daoGovernance.connect(voter1).createProposal(description, tooShortPeriod)
      ).to.be.revertedWithCustomError(daoGovernance, "VotingPeriodTooShort")
      .withArgs(tooShortPeriod, minimumPeriod);
    });
  });

  describe("Voting", function () {
    let proposalId;

    beforeEach(async function () {
      // Create a proposal
      const description = "Test Proposal for Voting";
      const votingPeriod = 7 * 24 * 60 * 60; // 7 days
      
      const tx = await daoGovernance.connect(voter1).createProposal(description, votingPeriod);
      const receipt = await tx.wait();
      
      // Get proposal ID from event
      const event = receipt.logs.find(log => {
        try {
          const decoded = daoGovernance.interface.parseLog({ topics: log.topics, data: log.data });
          return decoded.name === "ProposalCreated";
        } catch (e) {
          return false;
        }
      });
      
      proposalId = event ? event.args[0] : 0;
    });

    it("Should allow token holders to vote", async function () {
      // Vote yes
      await daoGovernance.connect(voter1).vote(proposalId, true);
      
      // Check vote was recorded
      expect(await daoGovernance.hasVoted(proposalId, voter1.address)).to.be.true;
      
      // Check vote counts
      const proposal = await daoGovernance.getProposalStatus(proposalId);
      expect(proposal.yesVotes).to.equal(ethers.parseEther("100")); // voter1 has 100 tokens
      expect(proposal.noVotes).to.equal(0);
    });

    it("Should weigh votes by token balance", async function () {
      // voter1 (100 tokens) votes yes
      await daoGovernance.connect(voter1).vote(proposalId, true);
      
      // voter2 (200 tokens) votes no
      await daoGovernance.connect(voter2).vote(proposalId, false);
      
      // Check vote counts
      const proposal = await daoGovernance.getProposalStatus(proposalId);
      expect(proposal.yesVotes).to.equal(ethers.parseEther("100"));
      expect(proposal.noVotes).to.equal(ethers.parseEther("200"));
    });

    it("Should not allow voting twice", async function () {
      // First vote
      await daoGovernance.connect(voter1).vote(proposalId, true);
      
      // Try to vote again
      await expect(
        daoGovernance.connect(voter1).vote(proposalId, false)
      ).to.be.revertedWithCustomError(daoGovernance, "AlreadyVoted")
      .withArgs(voter1.address, proposalId);
    });

    it("Should not allow voting on non-existent proposals", async function () {
      const nonExistentProposalId = 99;
      await expect(
        daoGovernance.connect(voter1).vote(nonExistentProposalId, true)
      ).to.be.revertedWithCustomError(daoGovernance, "ProposalDoesNotExist")
      .withArgs(nonExistentProposalId);
    });

    it("Should not allow voting if you have no tokens", async function () {
      await expect(
        daoGovernance.connect(nonVoter).vote(proposalId, true)
      ).to.be.revertedWithCustomError(daoGovernance, "NoVotingPower")
      .withArgs(nonVoter.address);
    });
  });

  describe("Proposal Execution", function () {
    let proposalId;

    beforeEach(async function () {
      // Set a shorter minimum voting period for testing
      await daoGovernance.setMinimumVotingPeriod(5); // 5 seconds is sufficient for tests
      
      // Create a proposal with short voting period for testing
      const description = "Test Proposal for Execution";
      const votingPeriod = 10; // 10 seconds
      
      const tx = await daoGovernance.connect(voter1).createProposal(description, votingPeriod);
      const receipt = await tx.wait();
      
      // Get proposal ID from event
      const event = receipt.logs.find(log => {
        try {
          const decoded = daoGovernance.interface.parseLog({ topics: log.topics, data: log.data });
          return decoded.name === "ProposalCreated";
        } catch (e) {
          return false;
        }
      });
      
      proposalId = event ? event.args[0] : 0;
      
      // Cast some votes
      await daoGovernance.connect(voter1).vote(proposalId, true);  // 100 yes
      await daoGovernance.connect(voter2).vote(proposalId, false); // 200 no
    });

    it("Should not allow execution before voting period ends", async function () {
      await expect(
        daoGovernance.executeProposal(proposalId)
      ).to.be.revertedWithCustomError(daoGovernance, "VotingPeriodNotEnded");
    });

    it("Should mark proposal as executed and determine outcome", async function () {
      // Advance time to end voting period
      await ethers.provider.send("evm_increaseTime", [15]); // Add 15 seconds
      await ethers.provider.send("evm_mine");
      
      // Execute proposal
      await daoGovernance.executeProposal(proposalId);
      
      // Check proposal status
      const proposal = await daoGovernance.getProposalStatus(proposalId);
      expect(proposal.executed).to.be.true;
      expect(proposal.passed).to.be.false; // Should fail as there were more no votes (200) than yes votes (100)
    });

    it("Should emit ProposalExecuted event", async function () {
      // Increasing time to end voting period
      await ethers.provider.send("evm_increaseTime", [15]); // Add 15 seconds
      await ethers.provider.send("evm_mine");
      
      // Execute proposal and check event
      await expect(daoGovernance.executeProposal(proposalId))
        .to.emit(daoGovernance, "ProposalExecuted")
        .withArgs(proposalId, false);
    });

    it("Should not allow executing the same proposal twice", async function () {
      // Increasing time to end voting period
      await ethers.provider.send("evm_increaseTime", [15]); // Add 15 seconds
      await ethers.provider.send("evm_mine");
      
      // Execute proposal
      await daoGovernance.executeProposal(proposalId);
      
      // Try to execute again
      await expect(
        daoGovernance.executeProposal(proposalId)
      ).to.be.revertedWithCustomError(daoGovernance, "ProposalAlreadyExecuted")
      .withArgs(proposalId);
    });

    it("Should correctly determine a passed proposal", async function () {
      // Let voter3 (300 tokens) vote yes, which should make the proposal pass
      await daoGovernance.connect(voter3).vote(proposalId, true);
      
      // Increasing time to end voting period
      await ethers.provider.send("evm_increaseTime", [15]); // Add 15 seconds
      await ethers.provider.send("evm_mine");
      
      // Execute proposal
      await daoGovernance.executeProposal(proposalId);
      
      // Check proposal status
      const proposal = await daoGovernance.getProposalStatus(proposalId);
      expect(proposal.executed).to.be.true;
      expect(proposal.passed).to.be.true; // Should pass as yes votes (400) > no votes (200)
    });
  });
}); 