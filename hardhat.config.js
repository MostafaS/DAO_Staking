require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-network-helpers");
require("hardhat-gas-reporter");
// require("solidity-coverage");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

// Default to prevent errors if .env file is missing
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  settings: {
    optimizer: {
      enabled: true,
      runs: 600,
      // details: {
      //   yul: true,
      //   yulDetails: {
      //     stackAllocation: true,
      //     optimizerSteps: "dhfoDgvulfnTUtnIf",
      //   },
      // },
    },
  },
  viaIR: true,
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  gasReporter: {
    enabled: true,
    excludeAutoGeneratedGetters: true,
    trackGasDeltas: true,
    includeIntrinsicGas: true,
    reportPureAndViewMethods: true,
    // showMethodSig: true,
    onlyCalledMethods: true,
    gasPrice: 20, 
    showTimeSpent: true, 
    showMethodSig: true, 
    showGasUsed: true, 
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  sourcify: {
    // Enable Sourcify verification
    enabled: true,
  },
};
