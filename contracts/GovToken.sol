// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GovToken
 * @dev ERC20 token that can only be minted by the staking contract.
 * Token holders have proportional voting power in DAO governance.
 */
contract GovToken is ERC20, Ownable {
    address public stakingContract;

    // Custom errors
    error InvalidStakingContractAddress(address provided);
    error OnlyStakingContractCanMint(address sender, address stakingContract);

    constructor() ERC20("GovToken", "GOV") Ownable(msg.sender) {}

    /**
     * @dev Sets the address of the staking contract that is allowed to mint tokens.
     * @param _stakingContract The address of the staking contract.
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        if (_stakingContract == address(0)) revert InvalidStakingContractAddress(_stakingContract);
        stakingContract = _stakingContract;
    }

    /**
     * @dev Mints new tokens. Can only be called by the staking contract.
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external {
        if (msg.sender != stakingContract) revert OnlyStakingContractCanMint(msg.sender, stakingContract);
        _mint(to, amount);
    }
} 