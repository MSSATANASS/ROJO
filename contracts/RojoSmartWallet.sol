// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title RojoSmartWallet
 * @dev Smart Contract Wallet rebelde para ROJO
 * @author ROJO Organization
 */
contract RojoSmartWallet is ReentrancyGuard, Pausable, Ownable {
    using ECDSA for bytes32;

    // 🔴 EVENTS
    event WalletCreated(address indexed owner, uint256 indexed walletId);
    event TransactionExecuted(address indexed to, uint256 amount, bytes data);
    event RecoveryInitiated(address indexed newOwner, uint256 indexed walletId);
    event RecoveryCompleted(address indexed oldOwner, address indexed newOwner);
    event BiometricSignatureVerified(address indexed user, bytes32 indexed challenge);

    // 🔴 STRUCTS
    struct Wallet {
        address owner;
        uint256 balance;
        uint256 nonce;
        bool isActive;
        uint256 recoveryDelay;
        uint256 recoveryInitiatedAt;
        address recoveryAddress;
        mapping(bytes32 => bool) executedTransactions;
    }

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }

    // 🔴 STATE VARIABLES
    mapping(uint256 => Wallet) public wallets;
    mapping(address => uint256) public ownerToWalletId;
    mapping(address => bool) public authorizedOperators;
    
    uint256 public nextWalletId;
    uint256 public constant RECOVERY_DELAY = 24 hours;
    uint256 public constant MAX_TRANSACTION_VALUE = 10 ether;
    
    // 🔴 MODIFIERS
    modifier onlyWalletOwner(uint256 walletId) {
        require(wallets[walletId].owner == msg.sender, "ROJO: Not wallet owner");
        _;
    }

    modifier onlyActiveWallet(uint256 walletId) {
        require(wallets[walletId].isActive, "ROJO: Wallet not active");
        _;
    }

    modifier onlyAuthorizedOperator() {
        require(authorizedOperators[msg.sender] || msg.sender == owner(), "ROJO: Not authorized");
        _;
    }

    // 🔴 CONSTRUCTOR
    constructor() {
        nextWalletId = 1;
        authorizedOperators[msg.sender] = true;
    }

    // 🔴 CORE FUNCTIONS

    /**
     * @dev Create a new smart wallet
     * @param _owner Address of the wallet owner
     */
    function createWallet(address _owner) external onlyAuthorizedOperator returns (uint256) {
        require(_owner != address(0), "ROJO: Invalid owner address");
        require(ownerToWalletId[_owner] == 0, "ROJO: Owner already has wallet");

        uint256 walletId = nextWalletId++;
        
        Wallet storage wallet = wallets[walletId];
        wallet.owner = _owner;
        wallet.balance = 0;
        wallet.nonce = 0;
        wallet.isActive = true;
        wallet.recoveryDelay = RECOVERY_DELAY;
        wallet.recoveryInitiatedAt = 0;
        wallet.recoveryAddress = address(0);

        ownerToWalletId[_owner] = walletId;

        emit WalletCreated(_owner, walletId);
        return walletId;
    }

    /**
     * @dev Execute a transaction from the wallet
     * @param walletId ID of the wallet
     * @param transaction Transaction data
     */
    function executeTransaction(
        uint256 walletId,
        Transaction calldata transaction
    ) external onlyWalletOwner(walletId) onlyActiveWallet(walletId) nonReentrant {
        Wallet storage wallet = wallets[walletId];
        
        require(transaction.nonce == wallet.nonce, "ROJO: Invalid nonce");
        require(transaction.deadline > block.timestamp, "ROJO: Transaction expired");
        require(transaction.value <= wallet.balance, "ROJO: Insufficient balance");
        require(transaction.value <= MAX_TRANSACTION_VALUE, "ROJO: Value too high");

        // Verify signature
        bytes32 transactionHash = keccak256(abi.encodePacked(
            walletId,
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.nonce,
            transaction.deadline
        ));
        
        bytes32 messageHash = transactionHash.toEthSignedMessageHash();
        address signer = messageHash.recover(transaction.signature);
        require(signer == wallet.owner, "ROJO: Invalid signature");

        // Check if transaction already executed
        bytes32 txId = keccak256(abi.encodePacked(
            walletId,
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.nonce
        ));
        
        require(!wallet.executedTransactions[txId], "ROJO: Transaction already executed");
        wallet.executedTransactions[txId] = true;

        // Execute transaction
        wallet.nonce++;
        wallet.balance -= transaction.value;

        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "ROJO: Transaction failed");

        emit TransactionExecuted(transaction.to, transaction.value, transaction.data);
    }

    /**
     * @dev Deposit funds to wallet
     * @param walletId ID of the wallet
     */
    function deposit(uint256 walletId) external payable onlyActiveWallet(walletId) {
        require(msg.value > 0, "ROJO: Must send value");
        wallets[walletId].balance += msg.value;
    }

    /**
     * @dev Initiate wallet recovery
     * @param walletId ID of the wallet
     * @param newOwner New owner address
     */
    function initiateRecovery(uint256 walletId, address newOwner) external onlyWalletOwner(walletId) {
        require(newOwner != address(0), "ROJO: Invalid new owner");
        require(newOwner != wallets[walletId].owner, "ROJO: Same owner");

        Wallet storage wallet = wallets[walletId];
        wallet.recoveryAddress = newOwner;
        wallet.recoveryInitiatedAt = block.timestamp;

        emit RecoveryInitiated(newOwner, walletId);
    }

    /**
     * @dev Complete wallet recovery after delay
     * @param walletId ID of the wallet
     */
    function completeRecovery(uint256 walletId) external {
        Wallet storage wallet = wallets[walletId];
        
        require(wallet.recoveryAddress != address(0), "ROJO: No recovery initiated");
        require(block.timestamp >= wallet.recoveryInitiatedAt + wallet.recoveryDelay, "ROJO: Recovery delay not met");

        address oldOwner = wallet.owner;
        address newOwner = wallet.recoveryAddress;

        // Update wallet ownership
        wallet.owner = newOwner;
        wallet.recoveryAddress = address(0);
        wallet.recoveryInitiatedAt = 0;

        // Update mappings
        ownerToWalletId[oldOwner] = 0;
        ownerToWalletId[newOwner] = walletId;

        emit RecoveryCompleted(oldOwner, newOwner);
    }

    /**
     * @dev Cancel recovery if initiated by owner
     * @param walletId ID of the wallet
     */
    function cancelRecovery(uint256 walletId) external onlyWalletOwner(walletId) {
        Wallet storage wallet = wallets[walletId];
        require(wallet.recoveryAddress != address(0), "ROJO: No recovery initiated");

        wallet.recoveryAddress = address(0);
        wallet.recoveryInitiatedAt = 0;
    }

    /**
     * @dev Pause wallet operations (emergency)
     */
    function pauseWallet(uint256 walletId) external onlyWalletOwner(walletId) {
        wallets[walletId].isActive = false;
    }

    /**
     * @dev Resume wallet operations
     */
    function resumeWallet(uint256 walletId) external onlyWalletOwner(walletId) {
        wallets[walletId].isActive = true;
    }

    // 🔴 VIEW FUNCTIONS

    /**
     * @dev Get wallet information
     * @param walletId ID of the wallet
     */
    function getWallet(uint256 walletId) external view returns (
        address owner,
        uint256 balance,
        uint256 nonce,
        bool isActive,
        uint256 recoveryDelay,
        uint256 recoveryInitiatedAt,
        address recoveryAddress
    ) {
        Wallet storage wallet = wallets[walletId];
        return (
            wallet.owner,
            wallet.balance,
            wallet.nonce,
            wallet.isActive,
            wallet.recoveryDelay,
            wallet.recoveryInitiatedAt,
            wallet.recoveryAddress
        );
    }

    /**
     * @dev Get wallet ID by owner
     * @param _owner Owner address
     */
    function getWalletIdByOwner(address _owner) external view returns (uint256) {
        return ownerToWalletId[_owner];
    }

    /**
     * @dev Check if transaction was executed
     * @param walletId ID of the wallet
     * @param txId Transaction ID
     */
    function isTransactionExecuted(uint256 walletId, bytes32 txId) external view returns (bool) {
        return wallets[walletId].executedTransactions[txId];
    }

    // 🔴 ADMIN FUNCTIONS

    /**
     * @dev Add authorized operator
     * @param operator Address to authorize
     */
    function addAuthorizedOperator(address operator) external onlyOwner {
        require(operator != address(0), "ROJO: Invalid operator");
        authorizedOperators[operator] = true;
    }

    /**
     * @dev Remove authorized operator
     * @param operator Address to remove
     */
    function removeAuthorizedOperator(address operator) external onlyOwner {
        authorizedOperators[operator] = false;
    }

    /**
     * @dev Emergency pause all wallets
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Resume all wallets
     */
    function emergencyResume() external onlyOwner {
        _unpause();
    }

    // 🔴 RECEIVE FUNCTION
    receive() external payable {
        // Allow receiving ETH
    }
}
