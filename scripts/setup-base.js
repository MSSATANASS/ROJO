#!/usr/bin/env node

/**
 * 🔴 ROJO + BASE Setup Script
 * Configuración automática del entorno Base para ROJO
 * @author M$$_ALI
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Colores para la consola
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Función para imprimir con colores
function print(color, text) {
    console.log(`${colors[color]}${text}${colors.reset}`);
}

// Banner ROJO
function showBanner() {
    print('red', `
    🔴 ROJO + BASE INTEGRATION SETUP 🔴
    ======================================
    Configurando el ecosistema ROJO en Base
    @author VERGASEC PRO
    ======================================
    `);
}

// Verificar dependencias
function checkDependencies() {
    print('blue', '🔍 Verificando dependencias...');
    
    try {
        require('ethers');
        print('green', '✅ ethers.js encontrado');
    } catch (error) {
        print('red', '❌ ethers.js no encontrado. Ejecuta: npm install ethers');
        process.exit(1);
    }
    
    try {
        require('dotenv');
        print('green', '✅ dotenv encontrado');
    } catch (error) {
        print('red', '❌ dotenv no encontrado. Ejecuta: npm install dotenv');
        process.exit(1);
    }
    
    print('green', '✅ Todas las dependencias están instaladas');
}

// Configurar variables de entorno
function setupEnvironment() {
    print('blue', '🔧 Configurando variables de entorno...');
    
    // Cargar .env.base si existe
    const envPath = path.join(process.cwd(), '.env.base');
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        print('green', '✅ Archivo .env.base cargado');
    } else {
        print('yellow', '⚠️  Archivo .env.base no encontrado, usando valores por defecto');
    }
    
    // Verificar variables críticas
    const requiredVars = [
        'BASE_RPC_URL',
        'BASE_SEPOLIA_RPC_URL',
        'BASE_CHAIN_ID',
        'BASE_SEPOLIA_CHAIN_ID'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        print('red', `❌ Variables faltantes: ${missingVars.join(', ')}`);
        print('yellow', '💡 Crea un archivo .env.base con las variables necesarias');
        return false;
    }
    
    print('green', '✅ Variables de entorno configuradas correctamente');
    return true;
}

// Test de conexión a Base
async function testBaseConnection() {
    print('blue', '🔗 Probando conexión a Base...');
    
    try {
        // Test Base Mainnet
        const baseProvider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        const baseBlock = await baseProvider.getBlockNumber();
        print('green', `✅ Base Mainnet conectado - Block: ${baseBlock}`);
        
        // Test Base Sepolia
        const baseSepoliaProvider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
        const baseSepoliaBlock = await baseSepoliaProvider.getBlockNumber();
        print('green', `✅ Base Sepolia conectado - Block: ${baseSepoliaBlock}`);
        
        // Test de gas price
        const gasPrice = await baseProvider.getFeeData();
        print('cyan', `💰 Gas Price Base: ${ethers.formatUnits(gasPrice.gasPrice, 'gwei')} gwei`);
        
        return true;
    } catch (error) {
        print('red', `❌ Error conectando a Base: ${error.message}`);
        return false;
    }
}

// Verificar contratos existentes
function checkExistingContracts() {
    print('blue', '📋 Verificando contratos existentes...');
    
    const contractsDir = path.join(process.cwd(), 'contracts');
    if (!fs.existsSync(contractsDir)) {
        print('red', '❌ Directorio contracts no encontrado');
        return false;
    }
    
    const contracts = fs.readdirSync(contractsDir).filter(file => file.endsWith('.sol'));
    
    if (contracts.length === 0) {
        print('red', '❌ No se encontraron contratos Solidity');
        return false;
    }
    
    print('green', `✅ Encontrados ${contracts.length} contratos:`);
    contracts.forEach(contract => {
        print('cyan', `   📄 ${contract}`);
    });
    
    return true;
}

// Crear configuración de Foundry (para cuando se instale)
function createFoundryConfig() {
    print('blue', '🔧 Creando configuración de Foundry...');
    
    const foundryConfig = `[profile.default]
src = "contracts"
out = "out"
libs = ["lib"]
solc_version = "0.8.19"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
base = "${process.env.BASE_RPC_URL}"
base-sepolia = "${process.env.BASE_SEPOLIA_RPC_URL}"

[etherscan]
base = { key = "${process.env.BASESCAN_API_KEY || 'YOUR_API_KEY'}" }
base-sepolia = { key = "${process.env.BASESCAN_API_KEY || 'YOUR_API_KEY'}" }

# Configuración específica para Base
[profile.base]
src = "contracts"
out = "out"
libs = ["lib"]
solc_version = "0.8.19"
optimizer = true
optimizer_runs = 200
via_ir = true
`;

    const configPath = path.join(process.cwd(), 'foundry.toml');
    fs.writeFileSync(configPath, foundryConfig);
    print('green', '✅ foundry.toml creado');
}

// Crear script de deploy
function createDeployScript() {
    print('blue', '📜 Creando script de deploy...');
    
    const deployScript = `// SPDX-License-Identifier: MIT
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
            "Deployment completed!\\n",
            "RojoSmartWallet: ", vm.toString(address(walletImpl)), "\\n",
            "RojoWalletFactory: ", vm.toString(address(factory)), "\\n"
        );
        
        console.log(deploymentInfo);
    }
}
`;

    const scriptsDir = path.join(process.cwd(), 'script');
    if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
    }
    
    const scriptPath = path.join(scriptsDir, 'DeployRojoBase.s.sol');
    fs.writeFileSync(scriptPath, deployScript);
    print('green', '✅ Script de deploy creado en script/DeployRojoBase.s.sol');
}

// Función principal
async function main() {
    showBanner();
    
    print('blue', '🚀 Iniciando configuración de ROJO + BASE...\n');
    
    // Verificar dependencias
    checkDependencies();
    print('');
    
    // Configurar entorno
    if (!setupEnvironment()) {
        print('red', '❌ Configuración de entorno falló');
        process.exit(1);
    }
    print('');
    
    // Verificar contratos
    if (!checkExistingContracts()) {
        print('red', '❌ Verificación de contratos falló');
        process.exit(1);
    }
    print('');
    
    // Test de conexión
    if (!await testBaseConnection()) {
        print('red', '❌ Test de conexión falló');
        process.exit(1);
    }
    print('');
    
    // Crear configuraciones
    createFoundryConfig();
    createDeployScript();
    print('');
    
    // Resumen final
    print('green', '🎉 ¡Configuración de ROJO + BASE completada exitosamente!');
    print('cyan', '\n📋 Próximos pasos:');
    print('white', '   1. Instalar Foundry: curl -L https://foundry.paradigm.xyz | bash');
    print('white', '   2. Ejecutar: foundryup');
    print('white', '   3. Compilar: forge build');
    print('white', '   4. Deploy: forge script script/DeployRojoBase.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast');
    print('white', '   5. Verificar: forge verify-contract <ADDRESS> contracts/RojoSmartWallet.sol --chain base-sepolia');
    
    print('cyan', '\n🔗 Recursos útiles:');
    print('white', '   • Base Explorer: https://basescan.org');
    print('white', '   • Base Sepolia: https://sepolia.basescan.org');
    print('white', '   • Base Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet');
    
    print('red', '\n🔴 ¡VAMOS A HACER HISTORIA EN BASE! 🔴');
}

// Manejar errores
process.on('unhandledRejection', (error) => {
    print('red', `❌ Error no manejado: ${error.message}`);
    process.exit(1);
});

// Ejecutar script
if (require.main === module) {
    main().catch((error) => {
        print('red', `❌ Error en el script: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { main, testBaseConnection, setupEnvironment };
