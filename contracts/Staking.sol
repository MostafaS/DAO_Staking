// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./GovToken.sol";

/**
 * @title Staking
 * @dev Contract for staking ETH and earning GovToken rewards.
 */
contract Staking is Ownable {

    // The governance token earned as rewards
    GovToken public govToken;

    // Reward rate: how many GovTokens per ETH staked per second
    uint256 public rewardRate;
    // Last time the reward calculation was updated
    uint256 public lastUpdateTime;
    // Accumulated rewards per token
    uint256 public rewardPerTokenStored;
    // Total staked ETH
    uint256 public totalStaked;

    // Mapping of user address to staked amount
    mapping(address user => uint256 stakedAmount) public stakedBalance;
    // Mapping of user address to earned but unclaimed rewards
    mapping(address user => uint256 unclaimedAmount) public unclaimedRewards;
    // Mapping of user address to the reward per token at their last update
    mapping(address user => uint256 userRewardPerTokenPaid) public userRewardPerTokenPaid;
 

    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardPerTokenUpdated(uint256 rewardPerToken);
    event RewardRateChanged(uint256 oldRate, uint256 newRate);

    // Errors
    error InvalidGovTokenAddress(address _govToken);
    error InvalidRewardRate(uint256 _rewardRate);
    error InvalidStakeAmount(uint256 _amount);
    error NoRewardsAvailable();
    error ETHTransferFailed();
    error NotEnoughStaked(uint256 _amount);

    /**
     * @dev Constructor sets the gov token address and reward rate in wei.
     * @param _govToken The address of the governance token given as rewards.
     * @param _rewardRate The number of gov tokens earned per ETH staked per second in wei.
     */
    constructor(
        address _govToken,
        uint256 _rewardRate
    ) Ownable(msg.sender) {
        if (_govToken == address(0)) revert InvalidGovTokenAddress(_govToken);
        if (_rewardRate == 0) revert InvalidRewardRate(_rewardRate);
        govToken = GovToken(_govToken);
        rewardRate = _rewardRate;
        lastUpdateTime = block.timestamp;
    }

    /**
     * @dev Calculates the current reward per token.
     * @return The current accumulated reward per token.
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        return rewardPerTokenStored + 
            (timeElapsed * rewardRate * 1e18) / totalStaked;
    }

    /**
     * @dev Calculates the amount of rewards earned by a user but not yet claimed.
     * @param _user The address of the user.
     * @return The pending reward amount.
     */
    function earned(address _user) public view returns (uint256) {
        return (
            (stakedBalance[_user] * 
                (rewardPerToken() - userRewardPerTokenPaid[_user])) / 1e18
        ) + unclaimedRewards[_user];
    }

    /**
     * @dev Updates the reward metrics when state changes.
     */
    function updateRewardMetrics() internal {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        emit RewardPerTokenUpdated(rewardPerTokenStored);
    }

    /**
     * @dev Updates a user's rewards and reward per token paid.
     * @param _user The address of the user.
     */
    function updateReward(address _user) internal {
        updateRewardMetrics();
        
        if (_user != address(0)) {
            unclaimedRewards[_user] = earned(_user);
            userRewardPerTokenPaid[_user] = rewardPerTokenStored;
        }
    }

    /**
     * @dev Allows users to stake ETH.
     */
    function stake() public payable {
        if (msg.value == 0) revert InvalidStakeAmount(msg.value);
        
        // Update rewards before changing state
        updateReward(msg.sender);
        
        // Update state
        stakedBalance[msg.sender] += msg.value;
        totalStaked += msg.value;
        
        emit Staked(msg.sender, msg.value);
    }

    /**
     * @dev Allows users to unstake their ETH.
     * @param _amount The amount of ETH to unstake.
     */
    function unstake(uint256 _amount) external {
        if (_amount == 0) revert InvalidStakeAmount(_amount);
        if (stakedBalance[msg.sender] < _amount) revert NotEnoughStaked(_amount);
        
        // Update rewards before changing state
        updateReward(msg.sender);
        
        // Update state
        stakedBalance[msg.sender] -= _amount;
        totalStaked -= _amount;
        
        // Transfer ETH back to user
        (bool success, ) = msg.sender.call{value: _amount}("");
        if (!success) revert ETHTransferFailed();
        
        emit Unstaked(msg.sender, _amount);
    }

    /**
     * @dev Allows users to claim their earned GovToken rewards.
     */
    function claimGovToken() external {
        // Update rewards before claiming
        updateReward(msg.sender);
        
        uint256 reward = unclaimedRewards[msg.sender];
        if (reward == 0) revert NoRewardsAvailable();
        
        // Reset unclaimed rewards
        unclaimedRewards[msg.sender] = 0;
        
        // Mint governance tokens to the user
        govToken.mint(msg.sender, reward);
        
        emit RewardClaimed(msg.sender, reward);
    }

    /**
     * @dev Returns the amount of unclaimed rewards for a user.
     * @param _user The address of the user.
     * @return The amount of unclaimed rewards.
     */
    function getUnclaimedRewards(address _user) external view returns (uint256) {
        return earned(_user);
    }

    /**
     * @dev Updates the reward rate.
     * @param _rewardRate The new reward rate.
     */
    function setRewardRate(uint256 _rewardRate) external onlyOwner {
        if (_rewardRate == 0) revert InvalidRewardRate(_rewardRate);
        
        // Update rewards with old rate before changing
        updateRewardMetrics();
        
        uint256 oldRate = rewardRate;
        rewardRate = _rewardRate;
        
        emit RewardRateChanged(oldRate, _rewardRate);
    }

    /**
     * @dev Fallback function to accept ETH
     */
    receive() external payable {
        if (msg.value > 0) {
            stake();
        }
    }
} 