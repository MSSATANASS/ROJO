// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/RojoSmartWallet.sol";
import "../contracts/RojoWalletFactory.sol";

contract DeployRojoBase is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("BASE_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy RojoSmartWallet implementation
        RojoSmartWallet walletImpl = new RojoSmartWallet();
        console.log("RojoSmartWallet deployed at:", address(walletImpl));
        
        // Deploy RojoWalletFactory
        RojoWalletFactory factory = new RojoWalletFactory(address(walletImpl));
        console.log("RojoWalletFactory deployed at:", address(factory));
        
        vm.stopBroadcast();
        
        // Guardar direcciones
        string memory deploymentInfo = string.concat(
            "Deployment completed!\n",
            "RojoSmartWallet: ", vm.toString(address(walletImpl)), "\n",
            "RojoWalletFactory: ", vm.toString(address(factory)), "\n"
        );
        
        console.log(deploymentInfo);
    }
}
