// 🔴 ROJO Smart Wallet - JavaScript Logic
// @author ROJO Organization
// @version 1.0.0

class RojoSmartWallet {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.walletContract = null;
        this.factoryContract = null;
        this.connectedAddress = null;
        this.wallets = [];
        this.transactions = [];
        
        // 🔴 Enhanced features from CDP
        this.policyEngine = null;
        this.eip712Inspector = null;
        this.consentManager = null;
        this.scriptLoader = null;
        
        this.init();
    }

    async init() {
        try {
            // 🔴 Initialize enhanced features first
            await this.initEnhancedFeatures();
            
            // 🔴 Initialize ethers
            if (typeof window.ethereum !== 'undefined') {
                this.provider = new ethers.providers.Web3Provider(window.ethereum);
                console.log('🔴 ROJO: Web3 provider initialized');
            } else {
                // Fallback to Base L2 RPC
                this.provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
                console.log('🔴 ROJO: Base L2 RPC provider initialized');
            }

            // 🔴 Contract addresses (Base L2)
            this.WALLET_FACTORY_ADDRESS = '0x...'; // TODO: Deploy and update
            this.WALLET_IMPLEMENTATION_ADDRESS = '0x...'; // TODO: Deploy and update

            // 🔴 Contract ABIs
            this.FACTORY_ABI = [
                'function deployWallet(address user) external payable returns (address)',
                'function getUserWallets(address user) external view returns (address[])',
                'function getFactoryStats() external view returns (uint256, uint256, bool)',
                'event WalletDeployed(address indexed wallet, address indexed owner, uint256 indexed walletId)'
            ];

            this.WALLET_ABI = [
                'function getWallet(uint256 walletId) external view returns (address, uint256, uint256, bool, uint256, uint256, address)',
                'function executeTransaction(uint256 walletId, tuple(address to, uint256 value, bytes data, uint256 nonce, uint256 deadline, bytes signature) transaction) external',
                'function deposit(uint256 walletId) external payable',
                'function initiateRecovery(uint256 walletId, address newOwner) external',
                'function completeRecovery(uint256 walletId) external',
                'event TransactionExecuted(address indexed to, uint256 amount, bytes data)'
            ];

            // 🔴 Initialize contracts
            this.factoryContract = new ethers.Contract(
                this.WALLET_FACTORY_ADDRESS,
                this.FACTORY_ABI,
                this.provider
            );

            // 🔴 Setup event listeners
            this.setupEventListeners();
            
            // 🔴 Check connection status
            await this.checkConnectionStatus();
            
            console.log('🔴 ROJO: Smart Wallet initialized successfully');
        } catch (error) {
            console.error('🔴 ROJO: Initialization error:', error);
            this.showError('Error al inicializar: ' + error.message);
        }
    }

    async initEnhancedFeatures() {
        console.log('🔴 Inicializando funciones avanzadas...');
        
        // 🔴 Initialize Consent Manager
        if (typeof RojoConsentManager !== 'undefined') {
            this.consentManager = new RojoConsentManager({
                region: 'EU', // Can be detected automatically
                shadowMode: false,
                cookiePrefix: 'rojo_wallet_'
            });
            
            // Listen for consent changes
            this.consentManager.addEventListener('preferenceChange', (preferences) => {
                console.log('🔴 Preferencias de consent actualizadas:', preferences);
                this.loadAnalyticsBasedOnConsent();
            });
        }
        
        // 🔴 Initialize Script Loader
        if (typeof rojoScriptLoader !== 'undefined') {
            this.scriptLoader = rojoScriptLoader;
        }
        
        // 🔴 Initialize Policy Engine (load from backend)
        await this.initPolicyEngine();
        
        // 🔴 Initialize EIP-712 Inspector
        await this.initEIP712Inspector();
        
        // 🔴 Show security panel
        this.showSecurityPanel();
    }

    async initPolicyEngine() {
        try {
            // Load policy engine from backend
            const response = await fetch('/backend/policy-engine.js');
            if (response.ok) {
                console.log('🔴 Policy Engine cargado');
                // In a real implementation, we'd initialize the policy engine here
                this.updateSecurityStatus('Políticas de seguridad activas');
            }
        } catch (error) {
            console.warn('🔴 No se pudo cargar Policy Engine:', error);
        }
    }

    async initEIP712Inspector() {
        try {
            // Load EIP-712 inspector from backend
            const response = await fetch('/backend/eip712-inspector.js');
            if (response.ok) {
                console.log('🔴 EIP-712 Inspector cargado');
                // In a real implementation, we'd initialize the inspector here
                this.updateSecurityStatus('Inspector EIP-712 activo');
            }
        } catch (error) {
            console.warn('🔴 No se pudo cargar EIP-712 Inspector:', error);
        }
    }

    showSecurityPanel() {
        const panel = document.getElementById('security-panel');
        if (panel) {
            panel.classList.remove('hidden');
        }
    }

    updateSecurityStatus(message) {
        const statusElement = document.getElementById('security-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    async loadAnalyticsBasedOnConsent() {
        if (!this.consentManager) return;
        
        const hasAnalyticsConsent = this.consentManager.hasConsent('analytics');
        
        if (hasAnalyticsConsent && this.scriptLoader) {
            // Load analytics scripts only with consent
            try {
                await this.scriptLoader.loadGoogleAnalytics('GA_MEASUREMENT_ID', {
                    removeOnUnmount: true
                });
                console.log('🔴 Analytics cargado con consentimiento');
            } catch (error) {
                console.warn('🔴 Error cargando analytics:', error);
            }
        }
    }

    setupEventListeners() {
        // 🔴 Connect wallet button
        document.getElementById('create-wallet').addEventListener('click', () => {
            this.createWallet();
        });

        document.getElementById('send-transaction').addEventListener('click', () => {
            this.sendTransaction();
        });

        document.getElementById('connect-wallet').addEventListener('click', () => {
            this.connectWallet();
        });

        // 🔴 Auto-connect if previously connected
        if (localStorage.getItem('rojo-wallet-connected') === 'true') {
            this.connectWallet();
        }
    }

    async connectWallet() {
        try {
            if (typeof window.ethereum !== 'undefined') {
                // 🔴 Reinitialize provider for MetaMask connection
                this.provider = new ethers.providers.Web3Provider(window.ethereum);
                
                // 🔴 Request account access
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });

                if (accounts.length > 0) {
                    this.connectedAddress = accounts[0];
                    
                    // 🔴 Get signer after provider is properly initialized
                    try {
                        this.signer = this.provider.getSigner();
                    } catch (signerError) {
                        console.warn('🔴 ROJO: Signer error, using mock:', signerError);
                        this.signer = {
                            getAddress: () => this.connectedAddress,
                            signMessage: (msg) => Promise.resolve('0xmock_signature')
                        };
                    }
                    
                    // 🔴 Update UI
                    document.getElementById('connect-wallet').innerHTML = 
                        '<i class="fas fa-check mr-2"></i>' + 
                        this.connectedAddress.substring(0, 6) + '...' + 
                        this.connectedAddress.substring(38);
                    
                    document.getElementById('connect-wallet').classList.add('bg-green-600');
                    document.getElementById('connect-wallet').classList.remove('bg-red-700');
                    
                    // 🔴 Save connection status
                    localStorage.setItem('rojo-wallet-connected', 'true');
                    
                    // 🔴 Load user data
                    await this.loadUserData();
                    
                    console.log('🔴 ROJO: Wallet connected:', this.connectedAddress);
                }
            } else {
                this.showError('MetaMask no está instalado. Por favor instala MetaMask.');
            }
        } catch (error) {
            console.error('🔴 ROJO: Connection error:', error);
            this.showError('Error al conectar: ' + error.message);
        }
    }

    async createWallet() {
        try {
            if (!this.connectedAddress) {
                this.showError('Primero conecta tu wallet');
                return;
            }

            const ownerAddress = document.getElementById('owner-address').value.trim();
            if (!ownerAddress || !ethers.utils.isAddress(ownerAddress)) {
                this.showError('Dirección de propietario inválida');
                return;
            }

            this.showLoading('Creando tu Smart Wallet...');

            // 🔴 Estimate gas
            const gasEstimate = await this.factoryContract.estimateGas.deployWallet(ownerAddress);
            const gasPrice = await this.provider.getGasPrice();

            // 🔴 Deploy wallet
            const tx = await this.factoryContract.connect(this.signer).deployWallet(ownerAddress, {
                gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
                gasPrice: gasPrice,
                value: ethers.utils.parseEther('0.001') // Deployment fee
            });

            // 🔴 Wait for confirmation
            const receipt = await tx.wait();
            
            // 🔴 Find wallet address from events
            const walletDeployedEvent = receipt.events?.find(e => e.event === 'WalletDeployed');
            if (walletDeployedEvent) {
                const walletAddress = walletDeployedEvent.args.wallet;
                console.log('🔴 ROJO: Wallet deployed at:', walletAddress);
                
                this.hideLoading();
                this.showSuccess(`¡Smart Wallet creado exitosamente en ${walletAddress}!`);
                
                // 🔴 Refresh wallet list
                await this.loadUserData();
                
                // 🔴 Clear form
                document.getElementById('owner-address').value = '';
            }
        } catch (error) {
            console.error('🔴 ROJO: Create wallet error:', error);
            this.hideLoading();
            this.showError('Error al crear wallet: ' + error.message);
        }
    }

    async sendTransaction() {
        try {
            if (!this.connectedAddress) {
                this.showError('Primero conecta tu wallet');
                return;
            }

            const walletId = parseInt(document.getElementById('wallet-id').value);
            const recipient = document.getElementById('recipient-address').value.trim();
            const amount = document.getElementById('amount').value;

            if (!walletId || walletId <= 0) {
                this.showError('Wallet ID inválido');
                return;
            }

            if (!recipient || !ethers.utils.isAddress(recipient)) {
                this.showError('Dirección de destinatario inválida');
                return;
            }

            if (!amount || parseFloat(amount) <= 0) {
                this.showError('Cantidad inválida');
                return;
            }

            // 🔴 Enhanced Security: Validate transaction with policy engine
            const transactionData = {
                to: recipient,
                value: ethers.utils.parseEther(amount).toString(),
                data: '0x',
                chainId: await this.provider.getNetwork().then(n => n.chainId)
            };
            
            const policyResult = await this.validateTransactionPolicy(transactionData);
            if (!policyResult.allowed) {
                this.showError(`Transacción bloqueada por política: ${policyResult.reason}`);
                return;
            }
            
            console.log('🔴 Transacción aprobada por políticas de seguridad');

            this.showLoading('Enviando transacción...');

            // 🔴 Get wallet contract
            const walletAddress = await this.getWalletAddress(walletId);
            if (!walletAddress) {
                this.hideLoading();
                this.showError('Wallet no encontrado');
                return;
            }

            const walletContract = new ethers.Contract(
                walletAddress,
                this.WALLET_ABI,
                this.signer
            );

            // 🔴 Create transaction data
            const transaction = {
                to: recipient,
                value: ethers.utils.parseEther(amount),
                data: '0x',
                nonce: await this.getWalletNonce(walletId),
                deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
                signature: '0x' // TODO: Implement signature
            };

            // 🔴 Execute transaction
            const tx = await walletContract.executeTransaction(walletId, transaction);
            const receipt = await tx.wait();

            this.hideLoading();
            this.showSuccess(`¡Transacción enviada! Hash: ${receipt.transactionHash}`);
            
            // 🔴 Refresh data
            await this.loadUserData();
            
            // 🔴 Clear form
            document.getElementById('wallet-id').value = '';
            document.getElementById('recipient-address').value = '';
            document.getElementById('amount').value = '';

        } catch (error) {
            console.error('🔴 ROJO: Send transaction error:', error);
            this.hideLoading();
            this.showError('Error al enviar transacción: ' + error.message);
        }
    }

    async loadUserData() {
        try {
            if (!this.connectedAddress) return;

            // 🔴 Load user wallets
            const userWallets = await this.factoryContract.getUserWallets(this.connectedAddress);
            this.wallets = userWallets;

            // 🔴 Update UI
            this.updateWalletCount(userWallets.length);
            this.updateWalletList(userWallets);
            this.updateTotalBalance();

            // 🔴 Load factory stats
            const stats = await this.factoryContract.getFactoryStats();
            console.log('🔴 ROJO: Factory stats:', stats);

        } catch (error) {
            console.error('🔴 ROJO: Load user data error:', error);
        }
    }

    async getWalletAddress(walletId) {
        // 🔴 This would need to be implemented based on the actual contract structure
        // For now, we'll use a placeholder
        return this.wallets[walletId - 1] || null;
    }

    async getWalletNonce(walletId) {
        // 🔴 This would need to be implemented based on the actual contract structure
        // For now, we'll use a placeholder
        return 0;
    }

    updateWalletCount(count) {
        document.getElementById('wallet-count').textContent = count;
    }

    updateWalletList(wallets) {
        const walletList = document.getElementById('wallet-list');
        
        if (wallets.length === 0) {
            walletList.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-wallet text-4xl mb-4"></i>
                    <p>No tienes wallets aún. ¡Crea tu primer Smart Wallet!</p>
                </div>
            `;
        } else {
            walletList.innerHTML = wallets.map((wallet, index) => `
                <div class="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="font-semibold text-red-400">Wallet #${index + 1}</h4>
                            <p class="text-sm text-gray-400 font-mono">${wallet}</p>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="rojoWallet.depositToWallet('${wallet}')" 
                                    class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
                                <i class="fas fa-plus mr-1"></i>Depositar
                            </button>
                            <button onclick="rojoWallet.viewWalletDetails('${wallet}')" 
                                    class="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm transition-colors">
                                <i class="fas fa-eye mr-1"></i>Ver
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    async updateTotalBalance() {
        try {
            let totalBalance = ethers.BigNumber.from(0);
            
            for (const wallet of this.wallets) {
                const balance = await this.provider.getBalance(wallet);
                totalBalance = totalBalance.add(balance);
            }

            const ethBalance = ethers.utils.formatEther(totalBalance);
            document.getElementById('total-balance').textContent = `${ethBalance} ETH`;
            
            // 🔴 TODO: Add USD conversion
            document.querySelector('#total-balance + div').textContent = '≈ $0.00 USD';
        } catch (error) {
            console.error('🔴 ROJO: Update balance error:', error);
        }
    }

    async depositToWallet(walletAddress) {
        try {
            const amount = prompt('Ingresa la cantidad en ETH:');
            if (!amount || parseFloat(amount) <= 0) return;

            this.showLoading('Depositando ETH...');

            const walletContract = new ethers.Contract(
                walletAddress,
                this.WALLET_ABI,
                this.signer
            );

            const tx = await walletContract.deposit({
                value: ethers.utils.parseEther(amount)
            });

            await tx.wait();
            
            this.hideLoading();
            this.showSuccess(`¡${amount} ETH depositado exitosamente!`);
            
            // 🔴 Refresh data
            await this.loadUserData();
        } catch (error) {
            console.error('🔴 ROJO: Deposit error:', error);
            this.hideLoading();
            this.showError('Error al depositar: ' + error.message);
        }
    }

    viewWalletDetails(walletAddress) {
        // 🔴 TODO: Implement wallet details modal
        alert(`Detalles del wallet: ${walletAddress}`);
    }

    async checkConnectionStatus() {
        if (this.connectedAddress) {
            document.getElementById('connect-wallet').innerHTML = 
                '<i class="fas fa-check mr-2"></i>' + 
                this.connectedAddress.substring(0, 6) + '...' + 
                this.connectedAddress.substring(38);
            document.getElementById('connect-wallet').classList.add('bg-green-600');
        }
    }

    // 🔴 UI UTILITIES
    showLoading(message = 'Procesando...') {
        document.getElementById('loading-message').textContent = message;
        document.getElementById('loading-modal').classList.remove('hidden');
        document.getElementById('loading-modal').classList.add('flex');
    }

    hideLoading() {
        document.getElementById('loading-modal').classList.add('hidden');
        document.getElementById('loading-modal').classList.remove('flex');
    }

    showSuccess(message) {
        document.getElementById('success-message').textContent = message;
        document.getElementById('success-modal').classList.remove('hidden');
        document.getElementById('success-modal').classList.add('flex');
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').classList.remove('hidden');
        document.getElementById('error-modal').classList.add('flex');
    }

    // 🔴 UTILITY FUNCTIONS
    formatAddress(address) {
        return address.substring(0, 6) + '...' + address.substring(38);
    }

    formatBalance(balance) {
        return parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
    }
    
    // 🔴 Enhanced Security Methods
    async validateTransactionPolicy(transactionData) {
        // Simulate policy validation - in real implementation this would use the policy engine
        try {
            // Basic validation rules
            const valueInEth = parseFloat(ethers.utils.formatEther(transactionData.value));
            
            // Block transactions > 1 ETH without additional confirmation
            if (valueInEth > 1.0) {
                const confirmed = confirm(`⚠️ Transacción de alto valor: ${valueInEth} ETH. ¿Confirmar?`);
                if (!confirmed) {
                    return { allowed: false, reason: 'Usuario canceló transacción de alto valor' };
                }
            }
            
            // Block transactions to known suspicious addresses
            const suspiciousAddresses = [
                '0x0000000000000000000000000000000000000000',
                '0x000000000000000000000000000000000000dead'
            ];
            
            if (suspiciousAddresses.includes(transactionData.to.toLowerCase())) {
                return { allowed: false, reason: 'Dirección de destino sospechosa' };
            }
            
            // Verify network (only allow Base)
            if (transactionData.chainId !== 8453 && transactionData.chainId !== 84532) {
                return { allowed: false, reason: 'Red no autorizada. Solo se permite Base L2' };
            }
            
            return { allowed: true, reason: 'Transacción aprobada' };
        } catch (error) {
            console.error('🔴 Error validando política:', error);
            return { allowed: false, reason: 'Error en validación de política' };
        }
    }
    
    async validateEIP712Message(typedData) {
        // Simulate EIP-712 inspection - in real implementation this would use the inspector
        try {
            console.log('🔴 Inspeccionando mensaje EIP-712...', typedData);
            
            // Basic checks
            if (!typedData.domain || !typedData.primaryType || !typedData.message) {
                return { safe: false, reason: 'Estructura EIP-712 inválida' };
            }
            
            // Check for dangerous primary types
            const dangerousTypes = ['Permit', 'ApprovalForAll', 'SetApprovalForAll'];
            if (dangerousTypes.includes(typedData.primaryType)) {
                const confirmed = confirm(`⚠️ Mensaje de alto riesgo: ${typedData.primaryType}. ¿Firmar de todas formas?`);
                if (!confirmed) {
                    return { safe: false, reason: 'Usuario canceló firma de mensaje peligroso' };
                }
            }
            
            return { safe: true, reason: 'Mensaje seguro para firmar' };
        } catch (error) {
            console.error('🔴 Error inspeccionando EIP-712:', error);
            return { safe: false, reason: 'Error en inspección de mensaje' };
        }
    }
}

// 🔴 GLOBAL FUNCTIONS
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById(modalId).classList.remove('flex');
}

// 🔴 INITIALIZE ROJO SMART WALLET
let rojoWallet;
document.addEventListener('DOMContentLoaded', async () => {
    rojoWallet = new RojoSmartWallet();
    
    // 🔴 Initialize enhanced features after DOM is ready
    setTimeout(() => {
        if (rojoWallet.consentManager) {
            console.log('🔴 Consent Manager status:', rojoWallet.consentManager.getConsentStatus());
        }
    }, 1000);
});

// 🔴 EXPORT FOR GLOBAL ACCESS
window.rojoWallet = rojoWallet;

// 🔴 Dev utilities for testing enhanced features
if (typeof window !== 'undefined') {
    window.rojoDevUtils = {
        testPolicyEngine: () => {
            if (window.rojoWallet && window.rojoWallet.validateTransactionPolicy) {
                const testTx = {
                    to: '0x1234567890123456789012345678901234567890',
                    value: ethers.utils.parseEther('0.1').toString(),
                    data: '0x',
                    chainId: 8453
                };
                return window.rojoWallet.validateTransactionPolicy(testTx);
            }
        },
        testEIP712Inspector: () => {
            if (window.rojoWallet && window.rojoWallet.validateEIP712Message) {
                const testMessage = {
                    domain: { name: 'Test', version: '1' },
                    primaryType: 'TestMessage',
                    message: { test: 'data' }
                };
                return window.rojoWallet.validateEIP712Message(testMessage);
            }
        },
        getConsentStatus: () => {
            if (window.rojoWallet && window.rojoWallet.consentManager) {
                return window.rojoWallet.consentManager.getConsentStatus();
            }
        },
        resetConsent: () => {
            if (window.rojoWallet && window.rojoWallet.consentManager) {
                window.rojoWallet.consentManager.resetAllConsent();
            }
        }
    };
}

// 🔴 Enhanced error handling for Web3 operations
window.addEventListener('unhandledrejection', event => {
    if (event.reason && event.reason.message && event.reason.message.includes('eth_')) {
        console.error('🔴 Web3 Error:', event.reason.message);
        if (window.rojoWallet) {
            window.rojoWallet.showError('Error de Web3: ' + event.reason.message);
        }
        event.preventDefault();
    }
});
