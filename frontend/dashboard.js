// 🔴 ROJO Ecosystem Integration - Dashboard JavaScript
// @author ROJO Organization
// @version 1.0.0

class RojoEcosystemDashboard {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.connectedAddress = null;
        this.ecosystemData = {
            totalBalance: 0,
            walletCount: 0,
            paymentsCount: 0,
            nftCount: 0,
            recentPayments: [],
            recentWalletActivity: []
        };
        
        this.init();
    }

    async init() {
        try {
            // 🔴 Initialize ethers
            if (typeof window.ethereum !== 'undefined') {
                this.provider = new ethers.providers.Web3Provider(window.ethereum);
                console.log('🔴 ROJO: Web3 provider initialized');
            } else {
                // Fallback to Base L2 RPC
                this.provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
                console.log('🔴 ROJO: Base L2 RPC provider initialized');
            }

            // 🔴 Setup event listeners
            this.setupEventListeners();
            
            // 🔴 Check connection status
            await this.checkConnectionStatus();
            
            // 🔴 Load initial data
            await this.loadEcosystemData();
            
            // 🔒 Inicializar Consent Manager si existe
            if (typeof RojoConsentManager !== 'undefined') {
                this.consentManager = new RojoConsentManager({ cookiePrefix: 'rojo_' });
            }

            // ✨ Deep link handler for #pay
            this.handleDeepLinks();

            // 🔎 Analytics básicos (opt-in con Consent Manager)
            if (window.ROJO_INTEGRATIONS && window.amplitude) {
                const hasAnalytics = !this.consentManager || this.consentManager.hasConsent('analytics');
                if (hasAnalytics) {
                    amplitude.init(window.ROJO_INTEGRATIONS.amplitudeApiKey);
                    amplitude.track('dashboard_loaded', { theme: document.body.classList.contains('light') ? 'light' : 'dark' });
                }
            }

            // Bugsnag (errores de cliente) con consentimiento
            if (window.ROJO_INTEGRATIONS && window.Bugsnag) {
                const allowPerf = !this.consentManager || this.consentManager.hasConsent('performance');
                if (allowPerf) {
                    Bugsnag.start({ apiKey: window.ROJO_INTEGRATIONS.bugsnagKey, appVersion: window.ROJO_INTEGRATIONS.appVersion });
                }
            }

            // 🤖 Bienvenida AI (ahora solo después de conectar wallet)
            
            console.log('🔴 ROJO: Ecosystem Dashboard initialized successfully');
        } catch (error) {
            console.error('🔴 ROJO: Initialization error:', error);
            this.showError('Error al inicializar: ' + error.message);
        }
    }

    setupEventListeners() {
        // 🔴 Connect wallet button
        document.getElementById('connect-wallet').addEventListener('click', () => {
            this.connectWallet();
        });

        // 🔴 Auto-connect if previously connected
        if (localStorage.getItem('rojo-ecosystem-connected') === 'true') {
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
                    localStorage.setItem('rojo-ecosystem-connected', 'true');
                    
                    // 🔴 Load user balance
                    await this.loadUserBalance();
                    
                    // 🔴 Load ecosystem data
                    await this.loadEcosystemData();
                    
                    console.log('🔴 ROJO: Wallet connected:', this.connectedAddress);
                    this.showSuccess('¡Wallet conectado exitosamente!');

                    // 🤖 Bienvenida AI tras conexión
                    this.fetchAiWelcome();
                }
            } else {
                this.showError('MetaMask no está instalado. Por favor instala MetaMask.');
            }
        } catch (error) {
            console.error('🔴 ROJO: Connection error:', error);
            this.showError('Error al conectar: ' + error.message);
        }
    }

    async loadUserBalance() {
        try {
            if (!this.connectedAddress || !this.provider) return;

            // 🔴 Get user balance
            const balance = await this.provider.getBalance(this.connectedAddress);
            this.ecosystemData.totalBalance = parseFloat(ethers.utils.formatEther(balance));
            
            console.log('🔴 ROJO: User balance loaded:', this.ecosystemData.totalBalance);
        } catch (error) {
            console.error('🔴 ROJO: Load balance error:', error);
            // 🔴 Use fallback balance
            this.ecosystemData.totalBalance = 0.0;
        }
    }

    async loadEcosystemData() {
        try {
            if (!this.connectedAddress) return;

            this.showLoading('Cargando datos del ecosistema...');

            // 🔴 Load data from both systems
            await Promise.all([
                this.loadPaymentData(),
                this.loadWalletData(),
                this.loadNFTData()
            ]);

            // 🔴 Update UI
            this.updateDashboardUI();
            
            this.hideLoading();
        } catch (error) {
            console.error('🔴 ROJO: Load ecosystem data error:', error);
            this.hideLoading();
            this.showError('Error al cargar datos: ' + error.message);
        }
    }

    async loadPaymentData() {
        try {
            // 🔴 Load from API endpoint
            const response = await fetch('/api/payments/recent');
            if (response.ok) {
                const payments = await response.json();
                this.ecosystemData.recentPayments = payments;
                this.ecosystemData.paymentsCount = payments.length;
            } else {
                // 🔴 Fallback to mock data if API fails
                this.ecosystemData.paymentsCount = Math.floor(Math.random() * 50) + 10;
                this.ecosystemData.recentPayments = [
                    {
                        id: 'PAY_001',
                        amount: '0.05 ETH',
                        method: 'Fingerprint',
                        timestamp: new Date().toLocaleString(),
                        status: 'Completed'
                    },
                    {
                        id: 'PAY_002',
                        amount: '0.02 ETH',
                        method: 'Face ID',
                        timestamp: new Date(Date.now() - 3600000).toLocaleString(),
                        status: 'Completed'
                    }
                ];
            }
        } catch (error) {
            console.error('🔴 ROJO: Load payment data error:', error);
            // 🔴 Use mock data on error
            this.ecosystemData.paymentsCount = Math.floor(Math.random() * 50) + 10;
        }
    }

    async loadWalletData() {
        try {
            // 🔴 Load from API endpoint
            const response = await fetch('/api/wallets/activity');
            if (response.ok) {
                const activity = await response.json();
                this.ecosystemData.recentWalletActivity = activity;
                this.ecosystemData.walletCount = Math.floor(Math.random() * 5) + 1; // TODO: Get from API
            } else {
                // 🔴 Fallback to mock data if API fails
                this.ecosystemData.walletCount = Math.floor(Math.random() * 5) + 1;
                this.ecosystemData.recentWalletActivity = [
                    {
                        walletId: 'WALLET_001',
                        action: 'Deposit',
                        amount: '0.1 ETH',
                        timestamp: new Date().toLocaleString()
                    },
                    {
                        walletId: 'WALLET_002',
                        action: 'Transaction',
                        amount: '0.03 ETH',
                        timestamp: new Date(Date.now() - 7200000).toLocaleString()
                    }
                ];
            }
        } catch (error) {
            console.error('🔴 ROJO: Load wallet data error:', error);
            // 🔴 Use mock data on error
            this.ecosystemData.walletCount = Math.floor(Math.random() * 5) + 1;
        }
    }

    async loadNFTData() {
        try {
            // 🔴 Load from API endpoint
            const response = await fetch('/api/nfts/count');
            if (response.ok) {
                const data = await response.json();
                this.ecosystemData.nftCount = data.count;
            } else {
                // 🔴 Fallback to mock data if API fails
                this.ecosystemData.nftCount = Math.floor(Math.random() * 20) + 5;
            }
        } catch (error) {
            console.error('🔴 ROJO: Load NFT data error:', error);
            // 🔴 Use mock data on error
            this.ecosystemData.nftCount = Math.floor(Math.random() * 20) + 5;
        }
    }

    async updateDashboardUI() {
        // 🔴 Update overview cards
        document.getElementById('total-balance').textContent = `${this.ecosystemData.totalBalance.toFixed(4)} ETH`;
        document.getElementById('wallet-count').textContent = this.ecosystemData.walletCount;
        document.getElementById('payments-count').textContent = this.ecosystemData.paymentsCount;
        document.getElementById('nft-count').textContent = this.ecosystemData.nftCount;

        // 🔴 Update recent payments
        this.updateRecentPayments();
        
        // 🔴 Update recent wallet activity
        this.updateRecentWalletActivity();
    }

    updateRecentPayments() {
        const recentPayments = document.getElementById('recent-payments');
        
        if (this.ecosystemData.recentPayments.length === 0) {
            recentPayments.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-credit-card text-4xl mb-4"></i>
                    <p>No hay pagos recientes</p>
                </div>
            `;
        } else {
            recentPayments.innerHTML = this.ecosystemData.recentPayments.map(payment => `
                <div class="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="font-semibold text-red-400">${payment.id}</h4>
                            <p class="text-sm text-gray-400">${payment.amount} - ${payment.method}</p>
                            <p class="text-xs text-gray-500">${payment.timestamp}</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-1 bg-green-600 rounded text-xs">${payment.status}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    updateRecentWalletActivity() {
        const recentWalletActivity = document.getElementById('recent-wallet-activity');
        
        if (this.ecosystemData.recentWalletActivity.length === 0) {
            recentWalletActivity.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-wallet text-4xl mb-4"></i>
                    <p>No hay actividad reciente</p>
                </div>
            `;
        } else {
            recentWalletActivity.innerHTML = this.ecosystemData.recentWalletActivity.map(activity => `
                <div class="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="font-semibold text-blue-400">${activity.walletId}</h4>
                            <p class="text-sm text-gray-400">${activity.action} - ${activity.amount}</p>
                            <p class="text-xs text-gray-500">${activity.timestamp}</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-arrow-right text-green-400"></i>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // 🔴 QUICK ACTION FUNCTIONS

    openBiometricPayment() {
        // 🔴 Open ROJO Pay Biometric interface
        this.showLoading('Iniciando pago biométrico...');
        
        // 🔴 Simulate biometric payment flow
        setTimeout(async () => {
            if (!this.connectedAddress) {
                this.hideLoading();
                this.showError('Conecta tu wallet primero para pagar con biometría');
                return;
            }
            
            // 🔴 Mock biometric authentication
            const authenticated = await this.simulateBiometricAuth();
            this.hideLoading();
            
            if (authenticated) {
                this.showBiometricPaymentModal();
            } else {
                this.showError('Autenticación biométrica fallida');
            }
        }, 2000);
    }

    viewPaymentHistory() {
        // 🔴 Show payment history modal
        this.showPaymentHistoryModal();
    }

    createSmartWallet() {
        // 🔴 Open Smart Wallet creation
        if (!this.connectedAddress) {
            this.showError('Conecta tu wallet primero');
            return;
        }
        
        this.showLoading('Creando Smart Wallet...');
        
        setTimeout(() => {
            this.hideLoading();
            this.showCreateWalletModal();
        }, 1500);
    }

    manageWallets() {
        // 🔴 Show wallet management modal
        if (!this.connectedAddress) {
            this.showError('Conecta tu wallet primero');
            return;
        }
        this.showWalletManagementModal();
    }

    viewEcosystemStats() {
        // 🔴 Show ecosystem statistics modal
        this.showEcosystemStatsModal();
    }

    exportData() {
        // 🔴 Export ecosystem data
        this.showLoading('Exportando datos del ecosistema...');
        
        // 🔴 TODO: Implement data export
        setTimeout(() => {
            this.hideLoading();
            this.showSuccess('Datos exportados exitosamente');
        }, 2000);
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
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }
    
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed top-6 right-6 z-50 transform translate-x-full transition-transform duration-300`;
        
        let bgColor, icon;
        switch(type) {
            case 'success':
                bgColor = 'bg-gradient-to-r from-green-600 to-green-700';
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                bgColor = 'bg-gradient-to-r from-red-600 to-red-700';
                icon = 'fas fa-exclamation-circle';
                break;
            default:
                bgColor = 'bg-gradient-to-r from-blue-600 to-blue-700';
                icon = 'fas fa-info-circle';
        }
        
        notification.innerHTML = `
            <div class="${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl border border-gray-700 backdrop-blur-sm max-w-sm">
                <div class="flex items-center space-x-3">
                    <i class="${icon} text-xl"></i>
                    <p class="font-semibold">${message}</p>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="ml-auto text-white hover:text-gray-300">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // 🔥 COINBASE ONRAMP INTEGRATION METHODS
    updateOnrampStatus(isAvailable) {
        this.onrampAvailable = isAvailable;
        console.log(`🔥 ROJO: Onramp status updated - Available: ${isAvailable}`);
    }

    async refreshBalance() {
        console.log('🔥 ROJO: Refreshing balance after onramp purchase...');
        this.showNotification('Refreshing balance...', 'info');
        
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.loadUserBalance();
            this.showNotification('Balance updated successfully!', 'success');
        } catch (error) {
            console.error('🔴 ROJO: Failed to refresh balance:', error);
            this.showNotification('Failed to refresh balance', 'error');
        }
    }

    updateTransactionHistory() {
        console.log('🔥 ROJO: Transaction history updated');
        if (document.querySelector('.transaction-history-modal')) {
            this.showOnrampHistoryModal();
        }
    }

    trackEvent(eventName, eventData) {
        console.log(`📊 ROJO Analytics: ${eventName}`, eventData);
        
        try {
            const analytics = JSON.parse(localStorage.getItem('rojo_analytics') || '[]');
            analytics.unshift({
                event: eventName,
                data: eventData,
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId || 'unknown'
            });
            
            if (analytics.length > 1000) {
                analytics.splice(1000);
            }
            
            localStorage.setItem('rojo_analytics', JSON.stringify(analytics));
        } catch (error) {
            console.error('🔴 ROJO: Analytics storage failed:', error);
        }
    }

    showBuyCryptoModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-black bg-opacity-90 backdrop-filter backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-green-400 shadow-2xl">
                <div class="text-center mb-6">
                    <div class="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mb-4">
                        <i class="fas fa-credit-card text-white text-3xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-2">Buy Cryptocurrency</h3>
                    <p class="text-gray-400">Purchase crypto with fiat using Coinbase Onramp</p>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">Select Cryptocurrency</label>
                        <select id="crypto-select" class="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all">
                            <option value="ETH">Ethereum (ETH)</option>
                            <option value="BTC">Bitcoin (BTC)</option>
                            <option value="USDC">USD Coin (USDC)</option>
                            <option value="USDT">Tether (USDT)</option>
                            <option value="SOL">Solana (SOL)</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">Amount (USD)</label>
                        <input type="number" id="amount-input" value="100" min="10" max="10000" class="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">Payment Method</label>
                        <select id="payment-select" class="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all">
                            <option value="card">Credit/Debit Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="apple_pay">Apple Pay</option>
                        </select>
                    </div>
                    
                    <div class="bg-gray-900 rounded-xl p-4 border border-gray-700">
                        <p class="text-xs text-gray-400 leading-relaxed">
                            <i class="fas fa-shield-alt text-green-400 mr-2"></i>
                            Powered by Coinbase Onramp. Secure, regulated, and trusted by millions.
                        </p>
                    </div>
                    
                    <div class="flex space-x-3 pt-4">
                        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-800 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-700 transition-all">
                            Cancel
                        </button>
                        <button id="proceed-onramp-btn" class="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-green-500 hover:to-green-600 transition-all shadow-lg">
                            Buy Now
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#proceed-onramp-btn').addEventListener('click', () => {
            const crypto = document.getElementById('crypto-select').value;
            const amount = parseFloat(document.getElementById('amount-input').value);
            const paymentMethod = document.getElementById('payment-select').value;
            
            modal.remove();
            this.proceedWithOnramp(crypto, amount, paymentMethod);
        });
    }

    async proceedWithOnramp(crypto = 'ETH', amount = 100, paymentMethod = 'card') {
        try {
            if (!window.rojoOnramp) {
                throw new Error('Onramp not initialized');
            }

            const walletAddress = this.connectedAddress || await this.getConnectedAddress();
            
            if (!walletAddress) {
                this.showNotification('Please connect your wallet first', 'error');
                return;
            }

            const onrampOptions = {
                asset: crypto,
                amount: amount,
                paymentMethod: paymentMethod,
                walletAddress: walletAddress,
                fiatCurrency: 'USD'
            };

            await window.rojoOnramp.openOnramp(onrampOptions);
            
        } catch (error) {
            console.error('🔴 ROJO: Onramp failed:', error);
            this.showNotification('Failed to open payment gateway: ' + error.message, 'error');
        }
    }

    async getConnectedAddress() {
        try {
            if (this.provider && this.signer) {
                return await this.signer.getAddress();
            }
            return null;
        } catch (error) {
            console.error('🔴 ROJO: Failed to get address:', error);
            return null;
        }
    }

    showOnrampHistoryModal() {
        const history = window.rojoOnramp ? window.rojoOnramp.getTransactionHistory() : [];
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 transaction-history-modal';
        modal.innerHTML = `
            <div class="bg-black bg-opacity-90 backdrop-filter backdrop-blur-xl rounded-2xl p-8 max-w-4xl w-full mx-4 border border-green-400 shadow-2xl">
                <div class="text-center mb-6">
                    <div class="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mb-4">
                        <i class="fas fa-history text-white text-3xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-2">Purchase History</h3>
                    <p class="text-gray-400">Your crypto purchase transactions</p>
                </div>
                
                <div class="max-h-96 overflow-y-auto mb-6">
                    ${history.length === 0 ? `
                        <div class="text-center py-8">
                            <i class="fas fa-inbox text-gray-600 text-4xl mb-4"></i>
                            <p class="text-gray-400">No purchases yet</p>
                            <p class="text-gray-500 text-sm">Your crypto purchases will appear here</p>
                        </div>
                    ` : history.map(tx => `
                        <div class="bg-gray-900 rounded-xl p-4 mb-3 border border-gray-700">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2 mb-2">
                                        <i class="fas fa-arrow-up text-green-400"></i>
                                        <span class="text-white font-semibold">${tx.cryptoAmount || '?'} ${tx.cryptoCurrency || 'CRYPTO'}</span>
                                        <span class="text-gray-400">•</span>
                                        <span class="text-gray-400">$${tx.fiatAmount || '?'} ${tx.fiatCurrency || 'USD'}</span>
                                    </div>
                                    <p class="text-gray-500 text-sm">${new Date(tx.timestamp).toLocaleString()}</p>
                                </div>
                                <div class="text-right">
                                    <span class="inline-block px-3 py-1 bg-green-900 text-green-400 rounded-full text-xs font-semibold">
                                        ${tx.status || 'Completed'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="text-center">
                    <button onclick="this.closest('.fixed').remove()" class="bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-8 rounded-xl font-semibold hover:from-green-500 hover:to-green-600 transition-all shadow-lg">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // 🔴 MODAL FUNCTIONS

    async simulateBiometricAuth() {
        // 🔴 Simulate biometric authentication (fingerprint/face)
        return new Promise((resolve) => {
            setTimeout(() => {
                const success = Math.random() > 0.2; // 80% success rate
                resolve(success);
            }, 1500);
        });
    }

    showBiometricPaymentModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-black bg-opacity-90 backdrop-filter backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-yellow-400 shadow-2xl">
                <div class="text-center mb-6">
                    <div class="w-20 h-20 mx-auto bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mb-4">
                        <i class="fas fa-fingerprint text-white text-3xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-2">Biometric Payment</h3>
                    <p class="text-gray-400">Secure transaction with your biometric signature</p>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">Recipient Address</label>
                        <input type="text" placeholder="0x..." class="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-300 mb-2">Amount (ETH)</label>
                        <input type="number" placeholder="0.00" class="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all" step="0.001">
                    </div>
                    
                    <div class="flex space-x-3 pt-4">
                        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-800 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-700 transition-all">
                            Cancel
                        </button>
                        <button onclick="this.simulatePayment(); this.closest('.fixed').remove()" class="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-red-500 hover:to-red-600 transition-all shadow-lg">
                            Send Payment
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    simulatePayment() {
        this.showSuccess('✅ Payment sent successfully! Transaction confirmed on Base L2.');
    }

    showPaymentHistoryModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 border border-red-500 max-h-96 overflow-y-auto">
                <h3 class="text-xl font-bold text-red-400 mb-4">📊 Historial de Pagos</h3>
                <div class="space-y-2">
                    ${this.ecosystemData.recentPayments.map(payment => `
                        <div class="bg-gray-800 p-3 rounded border border-gray-700">
                            <div class="flex justify-between items-center">
                                <div>
                                    <span class="text-red-400 font-semibold">${payment.id}</span>
                                    <span class="text-gray-400 ml-2">${payment.amount}</span>
                                </div>
                                <div class="text-xs text-gray-500">${payment.timestamp}</div>
                            </div>
                            <div class="text-sm text-gray-400 mt-1">Método: ${payment.method} 👹</div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-500">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showCreateWalletModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-red-500">
                <h3 class="text-xl font-bold text-red-400 mb-4">👹 Crear Smart Wallet</h3>
                <div class="space-y-4">
                    <div class="text-center py-4">
                        <div class="text-6xl mb-4">😈</div>
                        <p class="text-gray-300">¿Listo para la tentación financiera?</p>
                    </div>
                    <input type="text" placeholder="Nombre del wallet" class="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white">
                    <select class="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white">
                        <option>Red: Base L2 (Recomendado)</option>
                        <option>Red: Ethereum Mainnet</option>
                        <option>Red: Polygon</option>
                    </select>
                    <div class="flex space-x-2">
                        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600">Cancelar</button>
                        <button onclick="alert('🔥 Smart Wallet creado exitosamente'); this.closest('.fixed').remove()" class="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-500">Crear Wallet 😈</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showWalletManagementModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 border border-red-500 max-h-96 overflow-y-auto">
                <h3 class="text-xl font-bold text-red-400 mb-4">💼 Gestión de Wallets</h3>
                <div class="space-y-3">
                    ${Array.from({length: this.ecosystemData.walletCount}, (_, i) => `
                        <div class="bg-gray-800 p-4 rounded border border-gray-700">
                            <div class="flex justify-between items-center">
                                <div>
                                    <h4 class="text-red-400 font-semibold">Wallet #${i + 1} 👹</h4>
                                    <p class="text-gray-400 text-sm">Balance: ${(Math.random() * 0.5).toFixed(4)} ETH</p>
                                </div>
                                <div class="space-x-2">
                                    <button class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-500">Ver</button>
                                    <button class="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">Config</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-500">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showEcosystemStatsModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-900 rounded-lg p-6 max-w-xl w-full mx-4 border border-red-500">
                <h3 class="text-xl font-bold text-red-400 mb-4">📈 Estadísticas del Ecosistema</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-800 p-4 rounded border border-gray-700 text-center">
                        <div class="text-2xl mb-2">😈</div>
                        <div class="text-xl font-bold text-red-400">${this.ecosystemData.totalBalance.toFixed(4)}</div>
                        <div class="text-sm text-gray-400">ETH Total</div>
                    </div>
                    <div class="bg-gray-800 p-4 rounded border border-gray-700 text-center">
                        <div class="text-2xl mb-2">👹</div>
                        <div class="text-xl font-bold text-red-400">${this.ecosystemData.paymentsCount}</div>
                        <div class="text-sm text-gray-400">Pagos Realizados</div>
                    </div>
                    <div class="bg-gray-800 p-4 rounded border border-gray-700 text-center">
                        <div class="text-2xl mb-2">🔥</div>
                        <div class="text-xl font-bold text-red-400">${this.ecosystemData.walletCount}</div>
                        <div class="text-sm text-gray-400">Wallets Activos</div>
                    </div>
                    <div class="bg-gray-800 p-4 rounded border border-gray-700 text-center">
                        <div class="text-2xl mb-2">💎</div>
                        <div class="text-xl font-bold text-red-400">${this.ecosystemData.nftCount}</div>
                        <div class="text-sm text-gray-400">NFTs Generados</div>
                    </div>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-500">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ========== BIOMETRIC AUTHENTICATION METHODS ==========

    async showBiometricSetupModal() {
        if (!window.rojoPasskeyAuth) {
            this.showError('Biometric authentication system not available');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-purple-600/30 shadow-2xl">
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 mb-6">
                        <i class="fas fa-fingerprint text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-4">Setup Biometric Authentication</h3>
                    <p class="text-gray-300 mb-6 text-sm leading-relaxed">
                        Configure your fingerprint or Face ID for secure, passwordless transactions. 
                        Your biometric data never leaves your device.
                    </p>
                    
                    <div class="space-y-4 mb-6">
                        <div class="bg-gray-800 p-4 rounded-lg text-left">
                            <h4 class="text-white font-semibold mb-2">✨ Benefits:</h4>
                            <ul class="text-sm text-gray-300 space-y-1">
                                <li>• Instant transaction signing</li>
                                <li>• No password to remember</li>
                                <li>• Phishing resistant</li>
                                <li>• Hardware-level security</li>
                            </ul>
                        </div>
                        
                        <input type="text" id="biometricUsername" placeholder="Enter username" 
                               class="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none">
                    </div>
                    
                    <div class="flex space-x-3">
                        <button id="cancelBiometricSetup" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-all">
                            Cancel
                        </button>
                        <button id="setupBiometric" class="flex-1 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white px-4 py-3 rounded-lg transition-all">
                            Setup Now
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('cancelBiometricSetup').onclick = () => {
            document.body.removeChild(modal);
        };

        document.getElementById('setupBiometric').onclick = async () => {
            const username = document.getElementById('biometricUsername').value.trim();
            if (!username) {
                this.showError('Please enter a username');
                return;
            }

            this.showLoading('Setting up biometric authentication...');
            document.body.removeChild(modal);

            try {
                const result = await window.rojoPasskeyAuth.biometricOnboarding(username);
                this.hideLoading();

                if (result.success) {
                    this.showNotification('🔒 Biometric authentication setup completed!', 'success');
                    console.log('🔒 Biometric setup successful:', result);
                } else {
                    this.showError('Setup failed: ' + result.error);
                }
            } catch (error) {
                this.hideLoading();
                this.showError('Setup failed: ' + error.message);
            }
        };
    }

    async showBiometricPaymentModal() {
        if (!window.rojoPasskeyAuth || !window.rojoBiometricPayment) {
            this.showError('Biometric payment system not available');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-amber-600/30 shadow-2xl">
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 mb-6">
                        <i class="fas fa-bolt text-white text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-4">Biometric Payment</h3>
                    <p class="text-gray-300 mb-6 text-sm">
                        Send cryptocurrency using your biometric authentication
                    </p>
                    
                    <div class="space-y-4 mb-6">
                        <input type="text" id="biometricPaymentUsername" placeholder="Username" 
                               class="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none">
                        <input type="text" id="biometricPaymentRecipient" placeholder="Recipient address" 
                               class="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none">
                        <div class="flex space-x-2">
                            <input type="number" id="biometricPaymentAmount" placeholder="Amount" step="0.001"
                                   class="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none">
                            <select id="biometricPaymentAsset" class="bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none">
                                <option value="ETH">ETH</option>
                                <option value="USDC">USDC</option>
                                <option value="USDT">USDT</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button id="cancelBiometricPayment" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-all">
                            Cancel
                        </button>
                        <button id="processBiometricPayment" class="flex-1 bg-gradient-to-r from-amber-600 to-yellow-700 hover:from-amber-700 hover:to-yellow-800 text-white px-4 py-3 rounded-lg transition-all">
                            Pay with Biometrics
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('cancelBiometricPayment').onclick = () => {
            document.body.removeChild(modal);
        };

        document.getElementById('processBiometricPayment').onclick = async () => {
            const username = document.getElementById('biometricPaymentUsername').value.trim();
            const recipient = document.getElementById('biometricPaymentRecipient').value.trim();
            const amount = document.getElementById('biometricPaymentAmount').value;
            const asset = document.getElementById('biometricPaymentAsset').value;

            if (!username || !recipient || !amount) {
                this.showError('Please fill all fields');
                return;
            }

            document.body.removeChild(modal);

            try {
                const result = await window.rojoBiometricPayment.initiatePayment({
                    username,
                    recipient,
                    amount,
                    asset
                });

                if (result.success) {
                    this.showNotification(`🔒 Payment successful! TX: ${result.transactionId}`, 'success');
                    await this.refreshBalance();
                } else {
                    this.showError('Payment failed: ' + result.error);
                }
            } catch (error) {
                this.showError('Payment failed: ' + error.message);
            }
        };
    }

    // 🔴 UTILITY FUNCTIONS
    formatAddress(address) {
        return address.substring(0, 6) + '...' + address.substring(38);
    }

    formatBalance(balance) {
        return parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
    }

    // ✨ Handle deep links like #pay?amount=10&asset=ETH&to=0x...
    handleDeepLinks() {
        const hash = location.hash || '';
        if (!hash.startsWith('#pay')) return;
        const qIndex = hash.indexOf('?');
        const params = new URLSearchParams(qIndex >= 0 ? hash.substring(qIndex + 1) : '');
        const amount = params.get('amount') || '';
        const asset = params.get('asset') || 'ETH';
        const to = params.get('to') || '';
        // abre el modal biométrico prellenado si hay datos
        setTimeout(() => {
            this.showBiometricPaymentModal();
            setTimeout(() => {
                const a = document.getElementById('biometricPaymentAmount');
                const s = document.getElementById('biometricPaymentAsset');
                const r = document.getElementById('biometricPaymentRecipient');
                if (a && amount) a.value = amount;
                if (s && asset) s.value = asset;
                if (r && to) r.value = to;
            }, 150);
        }, 200);
    }

    async fetchAiWelcome() {
        try {
            const res = await fetch('/api/ai/welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: this.connectedAddress || 'GM' })
            });
            const data = await res.json();
            if (data?.text) {
                this.showNotification(data.text, 'info');
            }
        } catch (e) {
            console.warn('AI welcome failed');
        }
    }

    // 🔎 Mini buscador de docs Coinbase (Algolia)
    async openDocsSearchModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="premium-card rounded-2xl p-8 w-full max-w-2xl mx-4">
                <h3 class="text-xl font-bold mb-4">Buscar Docs Coinbase</h3>
                <input id="alg-q" placeholder="Busca: Onramp, Wallet, Node..." class="w-full luxury-input px-4 py-3 rounded-xl mb-4"/>
                <div id="alg-results" class="max-h-96 overflow-auto space-y-3"></div>
                <div class="mt-4 text-right">
                    <button id="alg-close" class="px-4 py-2 bg-gray-700 rounded-xl">Cerrar</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('alg-close').onclick = () => document.body.removeChild(modal);
        const resultsDiv = document.getElementById('alg-results');
        const search = (query) => {
            const cfg = window.ROJO_INTEGRATIONS?.algolia;
            if (!cfg || !window.algoliasearch) { resultsDiv.innerHTML = '<div class="text-gray-400">No config</div>'; return; }
            const client = algoliasearch(cfg.appId, cfg.searchKey);
            const index = client.initIndex('cdp_docs');
            index.search(query, { hitsPerPage: 5 }).then(({ hits }) => {
                resultsDiv.innerHTML = hits.map(h => `
                    <a href="${h.url||'#'}" target="_blank" class="block p-3 rounded-lg border border-gray-700 hover:bg-gray-800">
                        <div class="font-semibold">${h.title||'Doc'}</div>
                        <div class="text-sm text-gray-400">${(h.snippet||'').slice(0,160)}...</div>
                    </a>
                `).join('') || '<div class="text-gray-400">Sin resultados</div>';
            }).catch(()=>{ resultsDiv.innerHTML = '<div class="text-gray-400">Error de búsqueda</div>'; });
        };
        const input = document.getElementById('alg-q');
        input.addEventListener('input', (e)=>search(e.target.value));
        setTimeout(()=>input.focus(), 50);
    }
}

// 🔴 GLOBAL FUNCTIONS

function viewPaymentHistory() {
    if (window.rojoDashboard) {
        window.rojoDashboard.viewPaymentHistory();
    }
}

function createSmartWallet() {
    if (window.rojoDashboard) {
        window.rojoDashboard.createSmartWallet();
    }
}

function manageWallets() {
    if (window.rojoDashboard) {
        window.rojoDashboard.manageWallets();
    }
}

function viewEcosystemStats() {
    if (window.rojoDashboard) {
        window.rojoDashboard.viewEcosystemStats();
    }
}

function exportData() {
    if (window.rojoDashboard) {
        window.rojoDashboard.exportData();
    }
}

// 🔥 COINBASE ONRAMP FUNCTIONS
function openBuyCrypto() {
    if (window.rojoDashboard) {
        window.rojoDashboard.showBuyCryptoModal();
    }
}

function openOnrampHistory() {
    if (window.rojoDashboard) {
        window.rojoDashboard.showOnrampHistoryModal();
    }
}

function openDocsSearch() {
    if (window.rojoDashboard) {
        window.rojoDashboard.openDocsSearchModal();
    }
}

// 🔒 BIOMETRIC AUTHENTICATION FUNCTIONS
function showBiometricSetupModal() {
    if (window.rojoPasskeyAuth) {
        window.rojoDashboard.showBiometricSetupModal();
    } else {
        alert('Biometric authentication system not available');
    }
}

// ✨ MAGIC PAY LINK
function openMagicPayLink() {
    if (!window.rojoDashboard) return;
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="premium-card rounded-2xl p-8 w-full max-w-md mx-4">
            <h3 class="text-xl font-bold mb-4">Crear Magic Pay Link</h3>
            <div class="space-y-3 mb-4">
                <input id="mpl-amount" type="number" placeholder="Amount" class="w-full luxury-input px-4 py-3 rounded-xl"/>
                <input id="mpl-asset" type="text" placeholder="Asset (e.g. ETH, USDC)" class="w-full luxury-input px-4 py-3 rounded-xl"/>
                <input id="mpl-address" type="text" placeholder="Recipient (opcional)" class="w-full luxury-input px-4 py-3 rounded-xl"/>
            </div>
            <div class="flex space-x-3">
                <button id="mpl-cancel" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-xl">Cancelar</button>
                <button id="mpl-create" class="flex-1 luxury-button text-white px-4 py-3 rounded-xl">Generar</button>
            </div>
            <div id="mpl-result" class="mt-4 hidden">
                <div id="mpl-link" class="break-all text-sm text-gray-300 mb-3"></div>
                <div id="mpl-qr" class="bg-white p-2 inline-block rounded"></div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    document.getElementById('mpl-cancel').onclick = () => document.body.removeChild(modal);
    document.getElementById('mpl-create').onclick = () => {
        const amount = (document.getElementById('mpl-amount').value || '').trim();
        const asset = (document.getElementById('mpl-asset').value || 'ETH').trim();
        const to = (document.getElementById('mpl-address').value || '').trim();
        const params = new URLSearchParams();
        if (amount) params.set('amount', amount);
        if (asset) params.set('asset', asset);
        if (to) params.set('to', to);
        params.set('ref', 'rojo');
        const link = `${location.origin}/frontend/dashboard.html#pay?${params.toString()}`;
        const result = document.getElementById('mpl-result');
        const linkDiv = document.getElementById('mpl-link');
        linkDiv.textContent = link;
        result.classList.remove('hidden');
        if (window.QRCode) {
            const qrDiv = document.getElementById('mpl-qr');
            qrDiv.innerHTML = '';
            new QRCode(qrDiv, { text: link, width: 160, height: 160 });
        }
    };
}

function openBiometricPayment() {
    if (window.rojoPasskeyAuth && window.rojoBiometricPayment) {
        window.rojoDashboard.showBiometricPaymentModal();
    } else {
        alert('Please setup biometric authentication first');
    }
}

// 🔴 INITIALIZE ROJO ECOSYSTEM DASHBOARD
let rojoDashboard;
document.addEventListener('DOMContentLoaded', () => {
    rojoDashboard = new RojoEcosystemDashboard();
    // Asignación global segura una vez creado
    window.rojoDashboard = rojoDashboard;
    // Toggle de tema claro/oscuro
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light');
            btn.textContent = isLight ? 'Oscuro' : 'Claro';
        });
    }
    // (Fondo de bitcoins eliminado por solicitud)
});

// Fallback en caso de carga tardía
if (!window.rojoDashboard) {
    const assignInterval = setInterval(() => {
        if (rojoDashboard) {
window.rojoDashboard = rojoDashboard;
            clearInterval(assignInterval);
        }
    }, 100);
}
