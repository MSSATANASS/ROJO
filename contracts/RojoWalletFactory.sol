// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./RojoSmartWallet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RojoWalletFactory
 * @dev Factory para crear y gestionar ROJO Smart Wallets
 * @author ROJO Organization
 */
contract RojoWalletFactory is Ownable, ReentrancyGuard {
    // 🔴 EVENTS
    event WalletDeployed(address indexed wallet, address indexed owner, uint256 indexed walletId);
    event WalletUpgraded(address indexed oldWallet, address indexed newWallet, address indexed owner);
    event FactoryPaused(address indexed pauser);
    event FactoryResumed(address indexed resumer);

    // 🔴 STATE VARIABLES
    RojoSmartWallet public immutable walletImplementation;
    mapping(address => address[]) public userWallets;
    mapping(address => bool) public authorizedDeployers;
    bool public isPaused;
    
    uint256 public totalWalletsDeployed;
    uint256 public deploymentFee = 0.001 ether; // Fee para crear wallet
    
    // 🔴 MODIFIERS
    modifier onlyAuthorizedDeployer() {
        require(authorizedDeployers[msg.sender] || msg.sender == owner(), "ROJO: Not authorized deployer");
        _;
    }

    modifier whenNotPaused() {
        require(!isPaused, "ROJO: Factory is paused");
        _;
    }

    // 🔴 CONSTRUCTOR
    constructor() {
        walletImplementation = new RojoSmartWallet();
        authorizedDeployers[msg.sender] = true;
    }

    // 🔴 CORE FUNCTIONS

    /**
     * @dev Deploy a new smart wallet for user
     * @param user Address del usuario que recibirá el wallet
     */
    function deployWallet(address user) external payable whenNotPaused nonReentrant returns (address) {
        require(user != address(0), "ROJO: Invalid user address");
        require(msg.value >= deploymentFee, "ROJO: Insufficient deployment fee");
        
        // Crear proxy contract
        RojoSmartWallet wallet = new RojoSmartWallet();
        
        // Inicializar el wallet
        wallet.createWallet(user);
        
        // Registrar en mappings
        userWallets[user].push(address(wallet));
        totalWalletsDeployed++;
        
        emit WalletDeployed(address(wallet), user, totalWalletsDeployed);
        
        return address(wallet);
    }

    /**
     * @dev Deploy multiple wallets in batch
     * @param users Array de direcciones de usuarios
     */
    function deployWalletsBatch(address[] calldata users) external payable whenNotPaused nonReentrant returns (address[] memory) {
        require(users.length > 0, "ROJO: Empty users array");
        require(msg.value >= deploymentFee * users.length, "ROJO: Insufficient deployment fee");
        
        address[] memory deployedWallets = new address[](users.length);
        
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "ROJO: Invalid user address");
            
            RojoSmartWallet wallet = new RojoSmartWallet();
            wallet.createWallet(users[i]);
            
            userWallets[users[i]].push(address(wallet));
            deployedWallets[i] = address(wallet);
            totalWalletsDeployed++;
            
            emit WalletDeployed(address(wallet), users[i], totalWalletsDeployed);
        }
        
        return deployedWallets;
    }

    /**
     * @dev Upgrade wallet implementation (emergency)
     * @param oldWallet Address del wallet viejo
     * @param newWallet Address del wallet nuevo
     */
    function upgradeWallet(address oldWallet, address newWallet) external onlyOwner {
        require(oldWallet != address(0), "ROJO: Invalid old wallet");
        require(newWallet != address(0), "ROJO: Invalid new wallet");
        require(oldWallet != newWallet, "ROJO: Same wallet address");
        
        // Aquí se implementaría la lógica de upgrade
        // Por ahora solo emitimos el evento
        emit WalletUpgraded(oldWallet, newWallet, msg.sender);
    }

    // 🔴 VIEW FUNCTIONS

    /**
     * @dev Get all wallets for a user
     * @param user Address del usuario
     */
    function getUserWallets(address user) external view returns (address[] memory) {
        return userWallets[user];
    }

    /**
     * @dev Get wallet count for a user
     * @param user Address del usuario
     */
    function getUserWalletCount(address user) external view returns (uint256) {
        return userWallets[user].length;
    }

    /**
     * @dev Check if user has wallets
     * @param user Address del usuario
     */
    function userHasWallets(address user) external view returns (bool) {
        return userWallets[user].length > 0;
    }

    /**
     * @dev Get factory statistics
     */
    function getFactoryStats() external view returns (
        uint256 totalWallets,
        uint256 fee,
        bool paused
    ) {
        return (totalWalletsDeployed, deploymentFee, isPaused);
    }

    // 🔴 ADMIN FUNCTIONS

    /**
     * @dev Add authorized deployer
     * @param deployer Address del deployer
     */
    function addAuthorizedDeployer(address deployer) external onlyOwner {
        require(deployer != address(0), "ROJO: Invalid deployer");
        authorizedDeployers[deployer] = true;
    }

    /**
     * @dev Remove authorized deployer
     * @param deployer Address del deployer
     */
    function removeAuthorizedDeployer(address deployer) external onlyOwner {
        require(deployer != address(0), "ROJO: Invalid deployer");
        authorizedDeployers[deployer] = false;
    }

    /**
     * @dev Update deployment fee
     * @param newFee Nueva fee en wei
     */
    function updateDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
    }

    /**
     * @dev Pause factory
     */
    function pauseFactory() external onlyOwner {
        isPaused = true;
        emit FactoryPaused(msg.sender);
    }

    /**
     * @dev Resume factory
     */
    function resumeFactory() external onlyOwner {
        isPaused = false;
        emit FactoryResumed(msg.sender);
    }

    /**
     * @dev Withdraw collected fees
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "ROJO: No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "ROJO: Fee withdrawal failed");
    }

    /**
     * @dev Emergency withdraw (if needed)
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "ROJO: No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "ROJO: Emergency withdrawal failed");
    }

    // 🔴 RECEIVE FUNCTION
    receive() external payable {
        // Allow receiving ETH for fees
    }
}
