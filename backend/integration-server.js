// 🔴 ROJO Ecosystem Integration Server
// @author ROJO Organization
// @version 1.0.0

const express = require('express');
const cors = require('cors');
const path = require('path');
const pino = require('pino');
const pinoHttp = require('pino-http');
const bodyParser = require('body-parser');
const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

// 🔴 Enhanced features from CDP analysis
const { RojoPolicyEngine } = require('./policy-engine');
const { EIP712Inspector } = require('./eip712-inspector');
const RojoMCPServer = require('./mcp-server');

// 🔴 Base Integration
const BaseIntegration = require('./base-integration');

// 🔴 Initialize logger
const logger = pino({ level: 'info' });
const httpLogger = pinoHttp({ logger });

// 🔴 Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// 🔴 Railway deployment configuration
const isProduction = process.env.NODE_ENV === 'production';
const CORS_ORIGIN = process.env.CORS_ORIGIN || (isProduction ? '*' : 'http://localhost:3002');

// 🔴 Initialize enhanced features
const policyEngine = new RojoPolicyEngine();
const eip712Inspector = new EIP712Inspector();
const mcpServer = new RojoMCPServer();

// 🔴 Initialize Base Integration
const baseIntegration = new BaseIntegration();

// 🔴 Middleware
app.use(httpLogger);
app.use(cors({
    origin: CORS_ORIGIN,
    credentials: !isProduction, // Disable credentials in production for security
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🔒 Correlation ID en todas las respuestas (confianza/transparencia)
app.use((req, res, next) => {
    const requestId = req.id || Math.random().toString(36).slice(2);
    res.setHeader('X-Request-Id', requestId);
    req.requestId = requestId;
    next();
});

// 🔴 Serve static files
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
// Servir assets oficiales del logo y recursos de marca
app.use('/assets', express.static(path.join(__dirname, '../ROJO_Ecosystem/assets')));

// 🔴 Routes
app.get('/', (req, res) => {
    res.redirect('/frontend/dashboard.html');
});

// 🔴 Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'ROJO Ecosystem Integration',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// ========== AI WELCOME ENDPOINT ==========
// Cache y rate limit simples en memoria
const aiCache = new Map(); // ip -> { ts, text }
let aiDaily = { day: new Date().toDateString(), count: 0 };
const AI_WELCOME_TTL_MS = (parseInt(process.env.AI_WELCOME_TTL_SECONDS || '300', 10)) * 1000; // 5 min por defecto
const AI_DAILY_MAX = parseInt(process.env.AI_DAILY_MAX_CALLS || '500', 10);
const AI_DAILY_WARN = parseInt(process.env.AI_DAILY_WARN_AT || '250', 10);

app.post('/api/ai/welcome', async (req, res) => {
    try {
        // reset diario
        const today = new Date().toDateString();
        if (aiDaily.day !== today) { aiDaily = { day: today, count: 0 }; }

        // límite diario
        if (aiDaily.count >= AI_DAILY_MAX) {
            res.status(429).json({ success: false, error: 'AI daily limit reached' });
            return;
        }

        const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
        const now = Date.now();
        const cached = aiCache.get(ip);
        if (cached && (now - cached.ts) < AI_WELCOME_TTL_MS) {
            res.setHeader('X-Cache', 'HIT');
            res.json({ success: true, text: cached.text, cached: true });
            return;
        }

        const provider = (process.env.AI_PROVIDER || 'OPENROUTER').toUpperCase();
        const model = process.env.AI_MODEL || (provider === 'GROQ' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini');
        const userName = req.body?.name || 'GM';
        const sysPrompt = `Eres ROJO Assist: tono motivador, elegante, ambicioso. Da la bienvenida breve (máx 2 frases), resalta seguridad y compra cripto fácil. Si hay wallet conectada, invítalo a probar Magic Pay Link u Onramp.`;

        // Si no hay API key configurada, responder estático (sin costo)
        const hasOpenAI = !!process.env.OPENAI_API_KEY;
        const hasGroq = !!process.env.GROQ_API_KEY;
        const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
        const keyMissing = (provider === 'OPENAI' && !hasOpenAI) || (provider === 'GROQ' && !hasGroq) || (provider === 'OPENROUTER' && !hasOpenRouter);
        if (keyMissing) {
            const text = `Bienvenido a ROJO. Seguridad de nivel enterprise y compras cripto fáciles. Conecta tu wallet y prueba Magic Pay Link u Onramp.`;
            res.setHeader('X-AI-Mode', 'DISABLED');
            res.json({ success: true, text, cached: false });
            return;
        }

        let url, headers;
        if (provider === 'OPENAI') {
            url = 'https://api.openai.com/v1/chat/completions';
            headers = { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' };
        } else if (provider === 'GROQ') {
            url = 'https://api.groq.com/openai/v1/chat/completions';
            headers = { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' };
        } else {
            url = 'https://openrouter.ai/api/v1/chat/completions';
            headers = { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' };
        }

        const payload = {
            model,
            messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: `Usuario: ${userName}. Da bienvenida.` }
            ],
            temperature: 0.6,
            max_tokens: 120
        };

        const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        const j = await r.json();
        const text = j?.choices?.[0]?.message?.content || 'Bienvenido a ROJO.';

        // actualizar métricas y cachear
        aiDaily.count += 1;
        if (aiDaily.count === AI_DAILY_WARN) {
            logger.warn(`AI usage reached warn threshold: ${AI_DAILY_WARN}/${AI_DAILY_MAX}`);
        }
        aiCache.set(ip, { ts: now, text });
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-AI-Remaining', Math.max(AI_DAILY_MAX - aiDaily.count, 0));
        res.json({ success: true, text });
    } catch (e) {
        logger.error('AI welcome error', e);
        res.status(500).json({ success: false, error: 'AI error' });
    }
});

// 🔴 Mock API endpoints for testing
app.get('/api/ecosystem/stats', (req, res) => {
    const mockStats = {
        totalBalance: 0.1234,
        walletCount: 3,
        paymentsCount: 15,
        nftCount: 8,
        recentPayments: [
            {
                id: 'PAY_001',
                amount: '0.05 ETH',
                method: 'Fingerprint',
                timestamp: new Date().toISOString(),
                status: 'Completed'
            },
            {
                id: 'PAY_002',
                amount: '0.02 ETH',
                method: 'Face ID',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                status: 'Completed'
            }
        ],
        recentWalletActivity: [
            {
                walletId: 'WALLET_001',
                action: 'Deposit',
                amount: '0.1 ETH',
                timestamp: new Date().toISOString()
            },
            {
                walletId: 'WALLET_002',
                action: 'Transaction',
                amount: '0.03 ETH',
                timestamp: new Date(Date.now() - 7200000).toISOString()
            }
        ]
    };
    
    res.json(mockStats);
});

// 🔴 Mock payment data
app.get('/api/payments/recent', (req, res) => {
    const mockPayments = [
        {
            id: 'PAY_001',
            amount: '0.05 ETH',
            method: 'Fingerprint',
            timestamp: new Date().toISOString(),
            status: 'Completed'
        },
        {
            id: 'PAY_002',
            amount: '0.02 ETH',
            method: 'Face ID',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'Completed'
        }
    ];
    
    res.json(mockPayments);
});

// 🔴 Mock wallet data
app.get('/api/wallets/activity', (req, res) => {
    const mockActivity = [
        {
            walletId: 'WALLET_001',
            action: 'Deposit',
            amount: '0.1 ETH',
            timestamp: new Date().toISOString()
        },
        {
            walletId: 'WALLET_002',
            action: 'Transaction',
            amount: '0.03 ETH',
            timestamp: new Date(Date.now() - 7200000).toISOString()
        }
    ];
    
    res.json(mockActivity);
});

// 🔴 Mock NFT data
app.get('/api/nfts/count', (req, res) => {
    res.json({ count: 8 });
});

// 🔴 Enhanced Security APIs

// Policy Engine endpoints
app.get('/api/policies', (req, res) => {
    try {
        const policies = policyEngine.listPolicies();
        res.json({ success: true, policies });
    } catch (error) {
        logger.error('Error listing policies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/policies', (req, res) => {
    try {
        const { policyId, policy } = req.body;
        const result = policyEngine.addPolicy(policyId, policy);
        
        if (result.success) {
            logger.info(`Policy added: ${policyId}`);
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        logger.error('Error adding policy:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/policies/evaluate', (req, res) => {
    try {
        const { policyId, transaction } = req.body;
        const result = policyEngine.evaluateTransaction(policyId, transaction);
        
        logger.info(`Policy evaluation: ${result.allowed ? 'ALLOWED' : 'BLOCKED'} - ${result.reason}`);
        res.json({ success: true, evaluation: result });
    } catch (error) {
        logger.error('Error evaluating transaction:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// EIP-712 Inspector endpoints
app.post('/api/eip712/inspect', (req, res) => {
    try {
        const { typedData, options } = req.body;
        const result = eip712Inspector.inspectTypedData(typedData, options);
        
        logger.info(`EIP-712 inspection: ${result.safe ? 'SAFE' : 'UNSAFE'} - Risk: ${result.risk}`);
        res.json({ success: true, inspection: result });
    } catch (error) {
        logger.error('Error inspecting EIP-712 message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/eip712/trusted-contracts', (req, res) => {
    try {
        const contracts = eip712Inspector.getTrustedContracts();
        res.json({ success: true, contracts });
    } catch (error) {
        logger.error('Error getting trusted contracts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/eip712/trusted-contracts', (req, res) => {
    try {
        const { address } = req.body;
        const result = eip712Inspector.addTrustedContract(address);
        
        if (result) {
            logger.info(`Trusted contract added: ${address}`);
            res.json({ success: true, message: 'Contract added to trusted list' });
        } else {
            res.status(400).json({ success: false, error: 'Invalid address format' });
        }
    } catch (error) {
        logger.error('Error adding trusted contract:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Enhanced wallet transaction validation
app.post('/api/wallet/validate-transaction', (req, res) => {
    try {
        const { transaction, policyId = 'default' } = req.body;
        
        // Validate with policy engine
        const policyResult = policyEngine.evaluateTransaction(policyId, transaction);
        
        // Additional security checks
        const securityChecks = {
            networkAllowed: transaction.chainId === 8453 || transaction.chainId === 84532, // Base networks
            amountReasonable: parseFloat(transaction.value || '0') < 10, // < 10 ETH
            addressValid: /^0x[a-fA-F0-9]{40}$/.test(transaction.to)
        };
        
        const allChecksPassed = Object.values(securityChecks).every(check => check);
        
        const result = {
            allowed: policyResult.allowed && allChecksPassed,
            policyResult,
            securityChecks,
            recommendation: policyResult.allowed && allChecksPassed ? 'APPROVE' : 'REJECT'
        };
        
        logger.info(`Transaction validation: ${result.recommendation}`);
        res.json({ success: true, validation: result });
    } catch (error) {
        logger.error('Error validating transaction:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Analytics and tracking management
app.get('/api/analytics/consent-status', (req, res) => {
    // This would integrate with the frontend consent manager
    res.json({
        success: true,
        status: {
            region: 'EU',
            hasConsent: false,
            categories: {
                necessary: true,
                analytics: false,
                marketing: false,
                personalization: false
            },
            lastUpdated: new Date().toISOString()
        }
    });
});

// Script loading status
app.get('/api/scripts/status', (req, res) => {
    res.json({
        success: true,
        scripts: {
            analytics: { loaded: false, consent: false },
            marketing: { loaded: false, consent: false },
            web3: { loaded: true, consent: true }
        }
    });
});

// 🔴 MCP Server status and interaction
app.get('/api/mcp/status', (req, res) => {
    res.json({
        success: true,
        mcp: {
            enabled: process.env.MCP_SERVER_ENABLED === 'true',
            port: process.env.MCP_PORT || 8081,
            tools: mcpServer ? Object.keys(mcpServer.tools) : [],
            clients: mcpServer ? mcpServer.clients.size : 0
        }
    });
});

app.post('/api/mcp/execute', async (req, res) => {
    try {
        const { tool, args } = req.body;
        
        if (!mcpServer || !mcpServer.tools[tool]) {
            return res.status(400).json({
                success: false,
                error: `Tool ${tool} not available`
            });
        }
        
        const result = await mcpServer.tools[tool](args);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('Error executing MCP tool:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔥 Test Coinbase real connection
app.get('/api/coinbase/test', async (req, res) => {
    try {
        const testResult = {
            success: true,
            config: {
                apiHost: process.env.COINBASE_PUBLIC_API_HOST || 'Not configured',
                graphqlHost: process.env.COINBASE_PUBLIC_GRAPHQL_HOST || 'Not configured',
                domain: process.env.COINBASE_PUBLIC_DOMAIN || 'Not configured',
                clientId: process.env.COINBASE_PUBLIC_OAUTH_CLIENT_ID ? 'Configured' : 'Not configured',
                amplitudeKey: process.env.COINBASE_PUBLIC_AMPLITUDE_API_KEY ? 'Configured' : 'Not configured'
            },
            mcp: {
                enabled: process.env.MCP_SERVER_ENABLED === 'true',
                port: process.env.MCP_PORT || 8081,
                hasRealKeys: !!(process.env.COINBASE_API_KEY_NAME && process.env.COINBASE_API_PRIVATE_KEY)
            },
            timestamp: new Date().toISOString()
        };
        
        logger.info('🔥 Coinbase configuration test requested');
        res.json(testResult);
    } catch (error) {
        logger.error('Error testing Coinbase connection:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== BASE INTEGRATION ENDPOINTS ==========
// 🔴 Base Health Check
app.get('/api/base/health', async (req, res) => {
    try {
        const health = await baseIntegration.healthCheck();
        res.json(health);
    } catch (error) {
        logger.error('Base health check failed:', error);
        res.status(500).json({
            error: 'Health check failed',
            message: error.message
        });
    }
});

// 🔴 Get Base Networks
app.get('/api/base/networks', (req, res) => {
    try {
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
    } catch (error) {
        logger.error('Failed to get Base networks:', error);
        res.status(500).json({
            error: 'Failed to get networks',
            message: error.message
        });
    }
});

// 🔴 Get Base Network Info
app.get('/api/base/network/:networkName', async (req, res) => {
    try {
        const { networkName } = req.params;
        const networkInfo = await baseIntegration.getNetworkInfo(networkName);
        res.json(networkInfo);
    } catch (error) {
        logger.error('Failed to get Base network info:', error);
        res.status(400).json({
            error: 'Failed to get network info',
            message: error.message
        });
    }
});

// 🔴 Get Wallet Balance on Base
app.get('/api/base/balance/:address/:networkName?', async (req, res) => {
    try {
        const { address, networkName = 'baseSepolia' } = req.params;
        const balance = await baseIntegration.getWalletBalance(address, networkName);
        res.json(balance);
    } catch (error) {
        logger.error('Failed to get Base balance:', error);
        res.status(400).json({
            error: 'Failed to get balance',
            message: error.message
        });
    }
});

// 🔴 Deploy Contract on Base
app.post('/api/base/deploy', async (req, res) => {
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
        logger.error('Base deployment failed:', error);
        res.status(500).json({
            error: 'Deployment failed',
            message: error.message
        });
    }
});

// 🔴 Get Base Network Stats
app.get('/api/base/stats/:networkName?', async (req, res) => {
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
        logger.error('Failed to get Base stats:', error);
        res.status(400).json({
            error: 'Failed to get network stats',
            message: error.message
        });
    }
});

// 🔴 Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        requestId: req.requestId,
        cfRay: req.headers['cf-ray'] || null
    });
});

// 🔴 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'Route not found'
    });
});

// 🔴 Start server
app.listen(PORT, async () => {
    logger.info(`🔴 ROJO Ecosystem Integration Server running on port ${PORT}`);
    logger.info(`🔴 Dashboard available at: http://localhost:${PORT}/frontend/dashboard.html`);
    logger.info(`🔴 Wallet available at: http://localhost:${PORT}/frontend/wallet.html`);
    logger.info(`🔴 Health check: http://localhost:${PORT}/health`);
    logger.info(`🔴 Enhanced features initialized:`);
    logger.info(`   - Policy Engine: ${policyEngine.listPolicies().length} policies loaded`);
    logger.info(`   - EIP-712 Inspector: ${eip712Inspector.getTrustedContracts().length} trusted contracts`);
    logger.info(`   - Security APIs available at /api/policies and /api/eip712`);
    logger.info(`   - Base Integration: Connected to Base Mainnet and Sepolia`);
    logger.info(`   - Base APIs available at /api/base/*`);
    
    // 🔴 Initialize and start MCP Server if enabled
    if (process.env.MCP_SERVER_ENABLED === 'true') {
        try {
            await mcpServer.initialize();
            mcpServer.start();
            logger.info(`🔴 MCP Server initialized and running on port ${mcpServer.port}`);
        } catch (error) {
            logger.error(`❌ Failed to start MCP Server:`, error);
        }
    }
});

module.exports = app;
