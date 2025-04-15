// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./GovToken.sol";

/**
 * @title DAOGovernance
 * @dev Contract for managing DAO proposals and voting.
 */
contract DAOGovernance is Ownable {
    // The governance token used for voting
    GovToken public govToken;

    // Proposal structure
    struct Proposal {
        string description;         // Description or IPFS hash
        uint256 voteDeadline;       // Timestamp when voting ends
        uint256 yesVotes;           // Number of yes votes
        uint256 noVotes;            // Number of no votes
        bool executed;              // Whether the proposal has been executed
        bool passed;                // Whether the proposal passed or failed
        mapping(address => bool) hasVoted; // Track if an address has voted
    }

    // Mapping from proposal ID to Proposal
    mapping(uint256 => Proposal) public proposals;
    // Counter for proposal IDs
    uint256 public proposalCount;
    // Minimum voting period in seconds
    uint256 public minimumVotingPeriod = 1 days;

    // Events
    event ProposalCreated(uint256 indexed proposalId, string description, uint256 voteDeadline);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 votingPower);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    // Errors
    error InvalidGovTokenAddress(address token);
    error VotingPeriodTooShort(uint256 provided, uint256 minimum);
    error NoGovTokensHeld(address user);
    error ProposalDoesNotExist(uint256 proposalId);
    error VotingPeriodEnded(uint256 deadline, uint256 currentTime);
    error VotingPeriodNotEnded(uint256 deadline, uint256 currentTime);
    error AlreadyVoted(address voter, uint256 proposalId);
    error NoVotingPower(address voter);
    error ProposalAlreadyExecuted(uint256 proposalId);

    /**
     * @dev Constructor sets the governance token.
     * @param _govToken The address of the governance token.
     */
    constructor(address _govToken) Ownable(msg.sender) {
        if (_govToken == address(0)) revert InvalidGovTokenAddress(_govToken);
        govToken = GovToken(_govToken);
    }

    /**
     * @dev Creates a new proposal.
     * @param _description The description or IPFS hash of the proposal.
     * @param _votingPeriod The voting period in seconds.
     * @return The ID of the newly created proposal.
     */
    function createProposal(string calldata _description, uint256 _votingPeriod) external returns (uint256) {
        if (_votingPeriod < minimumVotingPeriod) revert VotingPeriodTooShort(_votingPeriod, minimumVotingPeriod);
        if (govToken.balanceOf(msg.sender) == 0) revert NoGovTokensHeld(msg.sender);

        uint256 proposalId = proposalCount++;
        Proposal storage newProposal = proposals[proposalId];
        newProposal.description = _description;
        newProposal.voteDeadline = block.timestamp + _votingPeriod;
        
        emit ProposalCreated(proposalId, _description, newProposal.voteDeadline);
        
        return proposalId;
    }

    /**
     * @dev Casts a vote on a proposal.
     * @param _proposalId The ID of the proposal.
     * @param _support Whether the vote is in support (true) or against (false).
     */
    function vote(uint256 _proposalId, bool _support) external {
        if (_proposalId >= proposalCount) revert ProposalDoesNotExist(_proposalId);
        
        Proposal storage proposal = proposals[_proposalId];
        if (block.timestamp >= proposal.voteDeadline) revert VotingPeriodEnded(proposal.voteDeadline, block.timestamp);
        if (proposal.hasVoted[msg.sender]) revert AlreadyVoted(msg.sender, _proposalId);
        
        uint256 votingPower = govToken.balanceOf(msg.sender);
        if (votingPower == 0) revert NoVotingPower(msg.sender);
        
        proposal.hasVoted[msg.sender] = true;
        
        if (_support) {
            proposal.yesVotes += votingPower;
        } else {
            proposal.noVotes += votingPower;
        }
        
        emit Voted(_proposalId, msg.sender, _support, votingPower);
    }

    /**
     * @dev Executes a proposal after the voting deadline.
     * @param _proposalId The ID of the proposal.
     */
    function executeProposal(uint256 _proposalId) external {
        if (_proposalId >= proposalCount) revert ProposalDoesNotExist(_proposalId);
        
        Proposal storage proposal = proposals[_proposalId];
        if (block.timestamp < proposal.voteDeadline) revert VotingPeriodNotEnded(proposal.voteDeadline, block.timestamp);
        if (proposal.executed) revert ProposalAlreadyExecuted(_proposalId);
        
        proposal.executed = true;
        proposal.passed = proposal.yesVotes > proposal.noVotes;
        
        emit ProposalExecuted(_proposalId, proposal.passed);
    }

    /**
     * @dev Returns the status of a proposal.
     * @param _proposalId The ID of the proposal.
     * @return description The description of the proposal.
     * @return voteDeadline The deadline for voting.
     * @return yesVotes The number of yes votes.
     * @return noVotes The number of no votes.
     * @return executed Whether the proposal has been executed.
     * @return passed Whether the proposal passed.
     */
    function getProposalStatus(uint256 _proposalId) external view returns (
        string memory description,
        uint256 voteDeadline,
        uint256 yesVotes,
        uint256 noVotes,
        bool executed,
        bool passed
    ) {
        if (_proposalId >= proposalCount) revert ProposalDoesNotExist(_proposalId);
        
        Proposal storage proposal = proposals[_proposalId];
        
        return (
            proposal.description,
            proposal.voteDeadline,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.executed,
            proposal.passed
        );
    }

    /**
     * @dev Checks if an address has voted on a proposal.
     * @param _proposalId The ID of the proposal.
     * @param _voter The address to check.
     * @return Whether the address has voted.
     */
    function hasVoted(uint256 _proposalId, address _voter) external view returns (bool) {
        if (_proposalId >= proposalCount) revert ProposalDoesNotExist(_proposalId);
        return proposals[_proposalId].hasVoted[_voter];
    }

    /**
     * @dev Sets the minimum voting period.
     * @param _minimumVotingPeriod The new minimum voting period in seconds.
     */
    function setMinimumVotingPeriod(uint256 _minimumVotingPeriod) external onlyOwner {
        minimumVotingPeriod = _minimumVotingPeriod;
    }
} 