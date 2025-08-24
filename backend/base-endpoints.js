/**
 * 🔴 ROJO BASE ENDPOINTS
 * REST API endpoints for Base integration
 * Designed to run on Railway
 */

const express = require('express');
const BaseIntegration = require('./base-integration');

const router = express.Router();
const baseIntegration = new BaseIntegration();

// Initialize Base Integration
baseIntegration.initialize().catch(console.error);

// Health Check
router.get('/health', async (req, res) => {
  try {
    const health = await baseIntegration.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Get Network Information
router.get('/network/:networkName', async (req, res) => {
  try {
    const { networkName } = req.params;
    const networkInfo = await baseIntegration.getNetworkInfo(networkName);
    res.json(networkInfo);
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get network info',
      message: error.message
    });
  }
});

// Get Wallet Balance
router.get('/balance/:address/:networkName?', async (req, res) => {
  try {
    const { address, networkName = 'baseSepolia' } = req.params;
    const balance = await baseIntegration.getWalletBalance(address, networkName);
    res.json(balance);
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get balance',
      message: error.message
    });
  }
});

// Deploy Contract
router.post('/deploy', async (req, res) => {
  try {
    const { contractName, constructorArgs = [], networkName = 'baseSepolia' } = req.body;
    
    if (!contractName) {
      return res.status(400).json({
        error: 'Contract name is required'
      });
    }
    
    const deployment = await baseIntegration.deployContract(contractName, constructorArgs, networkName);
    res.json(deployment);
  } catch (error) {
    res.status(500).json({
      error: 'Deployment failed',
      message: error.message
    });
  }
});

// Verify Contract
router.post('/verify', async (req, res) => {
  try {
    const { contractAddress, networkName = 'baseSepolia' } = req.body;
    
    if (!contractAddress) {
      return res.status(400).json({
        error: 'Contract address is required'
      });
    }
    
    const verification = await baseIntegration.verifyContract(contractAddress, networkName);
    res.json(verification);
  } catch (error) {
    res.status(400).json({
      error: 'Verification failed',
      message: error.message
    });
  }
});

// Get Transaction Info
router.get('/transaction/:txHash/:networkName?', async (req, res) => {
  try {
    const { txHash, networkName = 'baseSepolia' } = req.params;
    const txInfo = await baseIntegration.getTransactionInfo(txHash, networkName);
    res.json(txInfo);
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get transaction info',
      message: error.message
    });
  }
});

// Estimate Gas
router.post('/estimate-gas', async (req, res) => {
  try {
    const { contractName, functionName, args = [], networkName = 'baseSepolia' } = req.body;
    
    if (!contractName || !functionName) {
      return res.status(400).json({
        error: 'Contract name and function name are required'
      });
    }
    
    const gasEstimate = await baseIntegration.estimateGas(contractName, functionName, args, networkName);
    res.json(gasEstimate);
  } catch (error) {
    res.status(400).json({
      error: 'Gas estimation failed',
      message: error.message
    });
  }
});

// Get Available Networks
router.get('/networks', (req, res) => {
  const networks = Object.entries(baseIntegration.networks).map(([key, network]) => ({
    id: key,
    name: network.name,
    chainId: network.chainId,
    explorer: network.explorer,
    rpc: network.rpc
  }));
  
  res.json({
    networks: networks,
    default: 'baseSepolia'
  });
});

// Get Contract Status
router.get('/contracts/:networkName?', async (req, res) => {
  try {
    const { networkName = 'baseSepolia' } = req.params;
    
    // This would return deployed contracts in a real scenario
    const contracts = {
      network: networkName,
      contracts: [],
      message: 'No contracts deployed yet. Use POST /deploy to deploy contracts.'
    };
    
    res.json(contracts);
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get contracts',
      message: error.message
    });
  }
});

// Base Network Statistics
router.get('/stats/:networkName?', async (req, res) => {
  try {
    const { networkName = 'baseSepolia' } = req.params;
    const networkInfo = await baseIntegration.getNetworkInfo(networkName);
    
    const stats = {
      network: networkName,
      blockNumber: networkInfo.blockNumber,
      gasPrice: networkInfo.gasPrice,
      chainId: networkInfo.chainId,
      explorer: networkInfo.explorer,
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get network stats',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Base API Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

module.exports = router;
