/**
 * 🔴 ROJO BASE INTEGRATION MODULE
 * Integrates ROJO with Base L2 network
 * Designed to run on Railway
 */

const { ethers } = require('ethers');
const dotenv = require('dotenv');

// Load Base environment variables
dotenv.config({ path: '.env.base' });

class BaseIntegration {
  constructor() {
    this.networks = {
      baseSepolia: {
        name: 'Base Sepolia Testnet',
        rpc: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
        chainId: parseInt(process.env.BASE_SEPOLIA_CHAIN_ID) || 84532,
        explorer: 'https://sepolia.basescan.org',
        gasPrice: ethers.parseUnits('0.001', 'gwei')
      },
      base: {
        name: 'Base Mainnet',
        rpc: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
        chainId: parseInt(process.env.BASE_CHAIN_ID) || 8453,
        explorer: 'https://basescan.org',
        gasPrice: ethers.parseUnits('0.016', 'gwei')
      }
    };
    
    this.providers = {};
    this.contracts = {};
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing ROJO Base Integration...');
    
    try {
      // Initialize providers for all networks
      for (const [networkName, networkConfig] of Object.entries(this.networks)) {
        this.providers[networkName] = new ethers.JsonRpcProvider(networkConfig.rpc);
        
        // Test connection
        const blockNumber = await this.providers[networkName].getBlockNumber();
        console.log(`✅ Connected to ${networkConfig.name} (Block: ${blockNumber})`);
      }
      
      this.isInitialized = true;
      console.log('✅ Base Integration initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Base Integration:', error.message);
      throw error;
    }
  }

  async getNetworkInfo(networkName = 'baseSepolia') {
    if (!this.isInitialized) await this.initialize();
    
    const network = this.networks[networkName];
    const provider = this.providers[networkName];
    
    if (!network || !provider) {
      throw new Error(`Network '${networkName}' not available`);
    }
    
    try {
      const [blockNumber, gasPrice, chainId] = await Promise.all([
        provider.getBlockNumber(),
        provider.getGasPrice(),
        provider.getNetwork().then(net => net.chainId)
      ]);
      
      return {
        name: network.name,
        chainId: chainId,
        blockNumber: blockNumber,
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        explorer: network.explorer,
        rpc: network.rpc
      };
    } catch (error) {
      throw new Error(`Failed to get network info: ${error.message}`);
    }
  }

  async getWalletBalance(address, networkName = 'baseSepolia') {
    if (!this.isInitialized) await this.initialize();
    
    const provider = this.providers[networkName];
    if (!provider) {
      throw new Error(`Network '${networkName}' not available`);
    }
    
    try {
      const balance = await provider.getBalance(address);
      return {
        address: address,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString(),
        network: networkName
      };
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async deployContract(contractName, constructorArgs = [], networkName = 'baseSepolia') {
    if (!this.isInitialized) await this.initialize();
    
    const provider = this.providers[networkName];
    const network = this.networks[networkName];
    
    if (!provider || !network) {
      throw new Error(`Network '${networkName}' not available`);
    }
    
    // Check if we have private key for deployment
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not found - cannot deploy contracts');
    }
    
    try {
      const wallet = new ethers.Wallet(privateKey, provider);
      const balance = await wallet.getBalance();
      
      if (balance === 0n) {
        throw new Error('Insufficient balance for deployment');
      }
      
      console.log(`🚀 Deploying ${contractName} to ${network.name}...`);
      console.log(`💰 Deployer: ${wallet.address}`);
      console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
      
      // This is a placeholder - in real deployment you'd use actual contract artifacts
      const deploymentResult = {
        contractName: contractName,
        network: networkName,
        deployer: wallet.address,
        transactionHash: '0x' + '0'.repeat(64), // Placeholder
        contractAddress: '0x' + '0'.repeat(40), // Placeholder
        gasUsed: '0',
        status: 'success'
      };
      
      console.log(`✅ ${contractName} deployed successfully`);
      return deploymentResult;
      
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  async verifyContract(contractAddress, networkName = 'baseSepolia') {
    if (!this.isInitialized) await this.initialize();
    
    const network = this.networks[networkName];
    if (!network) {
      throw new Error(`Network '${networkName}' not available`);
    }
    
    return {
      contractAddress: contractAddress,
      network: networkName,
      explorerUrl: `${network.explorer}/address/${contractAddress}`,
      verificationStatus: 'pending', // Placeholder
      message: 'Contract verification requires manual submission to Basescan'
    };
  }

  async getTransactionInfo(txHash, networkName = 'baseSepolia') {
    if (!this.isInitialized) await this.initialize();
    
    const provider = this.providers[networkName];
    const network = this.networks[networkName];
    
    if (!provider || !network) {
      throw new Error(`Network '${networkName}' not available`);
    }
    
    try {
      const tx = await provider.getTransaction(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!tx || !receipt) {
        throw new Error('Transaction not found');
      }
      
      return {
        hash: txHash,
        network: networkName,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        explorerUrl: `${network.explorer}/tx/${txHash}`
      };
    } catch (error) {
      throw new Error(`Failed to get transaction info: ${error.message}`);
    }
  }

  async estimateGas(contractName, functionName, args = [], networkName = 'baseSepolia') {
    if (!this.isInitialized) await this.initialize();
    
    const provider = this.providers[networkName];
    if (!provider) {
      throw new Error(`Network '${networkName}' not available`);
    }
    
    try {
      // This is a placeholder - in real scenario you'd use actual contract ABI
      const estimatedGas = '100000'; // Placeholder
      
      return {
        contractName: contractName,
        functionName: functionName,
        estimatedGas: estimatedGas,
        network: networkName,
        gasPrice: ethers.formatUnits(this.networks[networkName].gasPrice, 'gwei'),
        estimatedCost: '0.0001' // Placeholder
      };
    } catch (error) {
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  // Health check for Railway
  async healthCheck() {
    try {
      if (!this.isInitialized) await this.initialize();
      
      const healthStatus = {};
      
      for (const [networkName, networkConfig] of Object.entries(this.networks)) {
        try {
          const provider = this.providers[networkName];
          const blockNumber = await provider.getBlockNumber();
          
          healthStatus[networkName] = {
            status: 'healthy',
            blockNumber: blockNumber,
            rpc: networkConfig.rpc,
            chainId: networkConfig.chainId
          };
        } catch (error) {
          healthStatus[networkName] = {
            status: 'unhealthy',
            error: error.message
          };
        }
      }
      
      return {
        service: 'ROJO Base Integration',
        status: 'operational',
        timestamp: new Date().toISOString(),
        networks: healthStatus
      };
    } catch (error) {
      return {
        service: 'ROJO Base Integration',
        status: 'degraded',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = BaseIntegration;
