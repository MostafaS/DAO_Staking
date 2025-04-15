# DAO Ecosystem with ETH Staking, Token-Based Governance, and Proposal Voting

This project implements a minimal DAO ecosystem with the following components:

1. **GovToken**: An ERC-20 governance token that can only be minted through staking contract as the reward for staking ETH (Native token)
2. **Staking Contract**: Allows users to stake ETH to earn GovToken rewards
3. **DAO Governance**: Enables token-based voting on proposals

## Environment Setup

### Prerequisites

- Node.js (v16+)
- Yarn package manager
-  Private key of your wallet with testnet ETH for deployment and testing on-chain (sepolia testnet already used for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MostafaS/DAO_Staking.git
cd DAO_Staking
```

2. Install dependencies:
```bash
yarn install
```

3. Create a `.env` file in the root directory based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your own values:
**make sure to add 0x at the begining if you get the private key from metamask**
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
PRIVATE_KEY=your-metamask-private-key
# Required to verify contracts on etherscan 
ETHERSCAN_API_KEY=your-etherscan-api-key

# Already deployed contract addresses on sepolia testnet. 
# You can change these to use your deployed addresses if needed.
GOV_TOKEN_ADDRESS=0x3833C3c2591eCA64eF678DfF0F61039F1a689C51
STAKING_ADDRESS=0xDE02f4c448c41Da0b3c7a119002277574E08dA12
DAO_GOV_ADDRESS=0x24f312E4A688AE2fAc623f50c295701F6A6eBb82
```

## Smart Contracts

All contracts in this project use custom error types instead of string messages for gas efficiency and better error handling. Each error includes relevant parameters to help diagnose issues.

### GovToken

- ERC-20 standard token
- Name: "GovToken", Symbol: "GOV"
- Can only be minted by the Staking Contract
- Provides proportional voting power in DAO governance
- Custom errors for validation and state checks

### Staking Contract

- Accepts staking of native ETH
- Mints GovToken rewards based on staking amount and duration
- Uses a "reward per token" accumulator approach for accurate reward distribution
- Handles reward rate changes fairly for all stakers
- Functions:
  - `stake()`: Stake ETH (payable function)
  - `unstake(amount)`: Withdraw staked ETH
  - `claimGovToken()`: Claim earned GovToken rewards
  - `getUnclaimedRewards(user)`: Check pending rewards for a user
  - `rewardPerToken()`: Get the current accumulated reward per token
  - `setRewardRate(newRate)`: Admin function to update the reward rate
- Custom errors for validation and state checks
- Also includes a receive function to accept ETH directly

### DAO Governance

- Manages proposals and voting
- Each proposal includes a description and voting deadline
- Voting power is based on GovToken balance
- Functions:
  - `createProposal(description, votingPeriod)`: Create a new proposal
  - `vote(proposalId, support)`: Vote yes/no on a proposal
  - `executeProposal(proposalId)`: Finalize a proposal after voting ends
  - `getProposalStatus(proposalId)`: Get details about a proposal
- Custom errors with descriptive parameters for validation failures

## How to Deploy

### Local Deployment

Run the local Hardhat node:
```bash
npx hardhat node
```

In a separate terminal, deploy the contracts to the local network:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Testnet Deployment (Sepolia)

Make sure your `.env` file is properly configured, then deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

When deploying to a testnet like Sepolia, the script will automatically verify all contracts on Etherscan after deployment, making the contract source code publicly viewable and verifiable. This process takes about 30 seconds after deployment to allow Etherscan to index the contracts.

## How to Test

### Running All Tests

To run all tests for all contracts (GovToken, Staking, and DAOGovernance):
```bash
npx hardhat test
```

This will execute all tests across all three test files, testing all functionality of the entire DAO ecosystem.

### Running Individual Test Files

You can also run specific test files separately:

```bash

npx hardhat test test/GovToken.test.js

npx hardhat test test/Staking.test.js 

npx hardhat test test/DAOGovernance.test.js
```



## Staking Reward Mechanism

The staking contract uses a "reward per token" accumulator approach:

1. **Global reward accounting**: 
   - Tracks a global `rewardPerTokenStored` that accumulates reward per staked token over time
   - This value increases proportionally to time elapsed and the current reward rate

2. **User-specific accounting**:
   - Each user has a `userRewardPerTokenPaid` value that records the last point at which they collected rewards
   - When users stake, unstake, or claim, their rewards are calculated as: 
     ```
     (stakedBalance * (rewardPerToken - userRewardPerTokenPaid)) + unclaimedRewards
     ```

3. **Reward rate changes**:
   - When the reward rate changes, all accumulated rewards are properly calculated and stored
   - Users receive the correct reward amount based on:
     - The old rate for the time before the change
     - The new rate for the time after the change

This approach ensures fair distribution of rewards regardless of when users stake or when reward rates change.

## Error Handling

Each contract uses custom error types that:
- Are more gas efficient than string error messages
- Provide specific information about what caused the error
- Include relevant parameters to help with debugging
- Allow front-end applications to handle errors more effectively

For example, instead of `require(condition, "Not enough staked ETH")`, the contracts use:
```solidity
if (stakedBalance[msg.sender] < _amount) revert NotEnoughStaked(_amount);
```

This approach is compatible with Solidity 0.8.26+ and provides better developer experience.

## Contract Addresses (Sepolia Testnet)

After deploying to the Sepolia testnet, the contract addresses will be:

- GovToken: `0x3833C3c2591eCA64eF678DfF0F61039F1a689C51`
- Staking: `0xDE02f4c448c41Da0b3c7a119002277574E08dA12`
- DAO Governance: `0x24f312E4A688AE2fAc623f50c295701F6A6eBb82`

## How to Interact with Deployed Contracts

The project includes an interaction script that can be used to interact with deployed contracts:
```bash
npx hardhat run scripts/interact.js --network sepolia
```
To use any specific function, uncomment the corresponding section and run the prompt above. 
Make sure to update the `.env` file with your deployed contract addresses or use the mentioned contract addresses which are also set in the .env.example file

## Limitations and Assumptions

- There's no timelock or multisig mechanism for proposal execution
- No upgrade mechanism is implemented for the contracts
- The minimum voting period is set to 1 day by default
