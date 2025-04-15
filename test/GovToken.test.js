const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovToken", function () {
  let GovToken;
  let govToken;
  let owner;
  let staker;
  let stakingContract;

  beforeEach(async function () {
    // Get signers
    [owner, staker, stakingContract] = await ethers.getSigners();

    // Deploy GovToken
    GovToken = await ethers.getContractFactory("GovToken");
    govToken = await GovToken.deploy();
    await govToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await govToken.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await govToken.name()).to.equal("GovToken");
      expect(await govToken.symbol()).to.equal("GOV");
    });

    it("Should have 0 initial supply", async function () {
      expect(await govToken.totalSupply()).to.equal(0);
    });
  });

  describe("Staking Contract Setting", function () {
    it("Should set the staking contract address", async function () {
      await govToken.setStakingContract(stakingContract.address);
      expect(await govToken.stakingContract()).to.equal(stakingContract.address);
    });

    it("Should not allow non-owner to set staking contract", async function () {
      await expect(
        govToken.connect(staker).setStakingContract(stakingContract.address)
      ).to.be.revertedWithCustomError(govToken, "OwnableUnauthorizedAccount");
    });

    it("Should revert if staking contract address is zero", async function () {
      await expect(
        govToken.setStakingContract(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(govToken, "InvalidStakingContractAddress")
      .withArgs(ethers.ZeroAddress);
    });
  });

  describe("Token Minting", function () {
    beforeEach(async function () {
      // Set staking contract
      await govToken.setStakingContract(stakingContract.address);
    });

    it("Should allow staking contract to mint tokens", async function () {
      const mintAmount = ethers.parseEther("100");
      
      // Mock staking contract minting tokens
      await govToken.connect(stakingContract).mint(staker.address, mintAmount);
      
      expect(await govToken.balanceOf(staker.address)).to.equal(mintAmount);
      expect(await govToken.totalSupply()).to.equal(mintAmount);
    });

    it("Should not allow non-staking-contract to mint tokens", async function () {
      const mintAmount = ethers.parseEther("100");
      
      // Try to mint from another address (not staking contract)
      await expect(
        govToken.connect(owner).mint(staker.address, mintAmount)
      ).to.be.revertedWithCustomError(govToken, "OnlyStakingContractCanMint")
      .withArgs(owner.address, stakingContract.address);
      
      // Try to mint from random account
      await expect(
        govToken.connect(staker).mint(staker.address, mintAmount)
      ).to.be.revertedWithCustomError(govToken, "OnlyStakingContractCanMint")
      .withArgs(staker.address, stakingContract.address);
    });
  });
}); 