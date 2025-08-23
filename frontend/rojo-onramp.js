/**
 * 🔥 ROJO ONRAMP INTEGRATION
 * Coinbase Onramp integration for fiat-to-crypto purchases
 * 
 * @author VERGASEC PRO
 * @version 1.0.0
 */

class RojoOnramp {
    constructor() {
        this.apiKey = null;
        this.projectId = null;
        this.isInitialized = false;
        this.onrampInstance = null;
        this.supportedCurrencies = [
            'ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'MATIC', 'SOL'
        ];
        this.supportedPaymentMethods = [
            'card', 'bank_transfer', 'apple_pay', 'google_pay'
        ];
        
        this.initializeOnramp();
    }

    /**
     * Initialize Coinbase Onramp
     */
    async initializeOnramp() {
        try {
            // Configurar cliente de Coinbase con configuración real
            this.coinbaseConfig = {
                apiHost: 'https://www.coinbase.com/api',
                graphqlHost: 'https://graphql.coinbase.com',
                clientId: '258660e1-9cfe-4202-9eda-d3beedb3e118',
                amplitudeKey: '132e62b5953ce8d568137d5887b6b7ab'
            };
            
            // Load Coinbase Onramp SDK
            if (!window.CoinbaseOnrampSDK) {
                await this.loadOnrampSDK();
            }

            // Configure with real configuration
            this.apiKey = this.coinbaseConfig.clientId;
            this.projectId = 'rojo_ecosystem_production';

            // Verificar estado del MCP Server
            try {
                const mcpStatus = await fetch('/api/mcp/status').then(r => r.json());
                console.log('🔥 MCP Status:', mcpStatus);
                this.mcpEnabled = mcpStatus.mcp?.enabled || false;
            } catch (error) {
                console.warn('⚠️ MCP Server not available, using demo mode');
                this.mcpEnabled = false;
            }

            console.log('🔥 ROJO: Coinbase Onramp initialized with real configuration!');
            this.isInitialized = true;
            
            // Notify dashboard
            if (window.rojoApp && window.rojoApp.updateOnrampStatus) {
                window.rojoApp.updateOnrampStatus(true);
            }

        } catch (error) {
            console.error('🔴 ROJO: Failed to initialize Onramp:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Load Coinbase Onramp SDK dynamically
     */
    async loadOnrampSDK() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.coinbase.com/onramp/v1.js';
            script.onload = () => {
                console.log('🔥 ROJO: Coinbase Onramp SDK loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('🔴 ROJO: Failed to load Onramp SDK');
                reject(new Error('Failed to load Onramp SDK'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Create onramp configuration
     */
    createOnrampConfig(options = {}) {
        const defaultConfig = {
            appId: this.projectId,
            widgetParameters: {
                destinationWallets: [{
                    address: options.walletAddress || '',
                    blockchains: ['ethereum', 'base', 'polygon', 'solana']
                }],
                defaultAsset: options.asset || 'ETH',
                defaultNetwork: options.network || 'ethereum',
                defaultPaymentMethod: options.paymentMethod || 'card',
                defaultFiatAmount: options.amount || 100,
                fiatCurrency: options.fiatCurrency || 'USD',
                
                // ROJO Branding
                theme: 'dark',
                primaryColor: '#c55036',
                secondaryColor: '#ffd700',
                
                // Experience settings
                experiences: ['buy'],
                handlingRequestedUrls: true
            },
            
            // Event callbacks
            onSuccess: (data) => this.handleOnrampSuccess(data),
            onExit: (error) => this.handleOnrampExit(error),
            onEvent: (event) => this.handleOnrampEvent(event),
            
            closeOnExit: true,
            closeOnSuccess: true
        };

        return { ...defaultConfig, ...options };
    }

    /**
     * Open Onramp widget
     */
    async openOnramp(options = {}) {
        if (!this.isInitialized) {
            await this.initializeOnramp();
        }

        if (!window.CoinbaseOnrampSDK) {
            throw new Error('Coinbase Onramp SDK not available');
        }

        try {
            const config = this.createOnrampConfig(options);
            
            // Show loading notification
            this.showNotification('Opening secure payment gateway...', 'info');
            
            // Create and open onramp instance
            this.onrampInstance = window.CoinbaseOnrampSDK.createOnrampWidget(config);
            this.onrampInstance.open();

            // Track analytics
            this.trackOnrampEvent('onramp_opened', {
                asset: options.asset || 'ETH',
                amount: options.amount || 100,
                paymentMethod: options.paymentMethod || 'card'
            });

        } catch (error) {
            console.error('🔴 ROJO: Failed to open Onramp:', error);
            this.showNotification('Failed to open payment gateway', 'error');
            throw error;
        }
    }

    /**
     * Handle successful purchase
     */
    handleOnrampSuccess(data) {
        console.log('🔥 ROJO: Onramp purchase successful:', data);
        
        // Show success notification
        this.showNotification(
            `Successfully purchased ${data.purchaseData?.cryptoAmount || '?'} ${data.purchaseData?.cryptoCurrency || 'crypto'}!`, 
            'success'
        );

        // Update user balance if dashboard is available
        if (window.rojoApp && window.rojoApp.refreshBalance) {
            setTimeout(() => {
                window.rojoApp.refreshBalance();
            }, 3000); // Wait for blockchain confirmation
        }

        // Track analytics
        this.trackOnrampEvent('onramp_success', {
            transactionId: data.transactionId,
            cryptoAmount: data.purchaseData?.cryptoAmount,
            cryptoCurrency: data.purchaseData?.cryptoCurrency,
            fiatAmount: data.purchaseData?.fiatAmount,
            fiatCurrency: data.purchaseData?.fiatCurrency
        });

        // Store transaction for history
        this.saveTransactionHistory(data);
    }

    /**
     * Handle onramp exit/error
     */
    handleOnrampExit(error) {
        if (error) {
            console.error('🔴 ROJO: Onramp error:', error);
            this.showNotification('Payment cancelled or failed', 'warning');
            
            // Track error
            this.trackOnrampEvent('onramp_error', {
                error: error.message || 'Unknown error',
                errorCode: error.code || 'UNKNOWN'
            });
        } else {
            console.log('🔥 ROJO: Onramp closed by user');
            this.showNotification('Payment cancelled', 'info');
            
            // Track cancellation
            this.trackOnrampEvent('onramp_cancelled', {});
        }
    }

    /**
     * Handle onramp events
     */
    handleOnrampEvent(event) {
        console.log('🔥 ROJO: Onramp event:', event);
        
        // Handle specific events
        switch (event.eventName) {
            case 'request_open_url':
                // Handle external URL requests
                if (event.url) {
                    window.open(event.url, '_blank');
                }
                break;
                
            case 'request_close':
                // Handle close requests
                if (this.onrampInstance) {
                    this.onrampInstance.destroy();
                }
                break;
                
            default:
                // Track all events for analytics
                this.trackOnrampEvent(`onramp_${event.eventName}`, event.metadata || {});
        }
    }

    /**
     * Save transaction to local history
     */
    saveTransactionHistory(data) {
        try {
            const transactions = JSON.parse(localStorage.getItem('rojo_onramp_history') || '[]');
            const transaction = {
                id: data.transactionId || Date.now().toString(),
                timestamp: new Date().toISOString(),
                type: 'onramp_purchase',
                cryptoAmount: data.purchaseData?.cryptoAmount,
                cryptoCurrency: data.purchaseData?.cryptoCurrency,
                fiatAmount: data.purchaseData?.fiatAmount,
                fiatCurrency: data.purchaseData?.fiatCurrency,
                status: 'completed',
                walletAddress: data.walletAddress
            };
            
            transactions.unshift(transaction);
            
            // Keep only last 100 transactions
            if (transactions.length > 100) {
                transactions.splice(100);
            }
            
            localStorage.setItem('rojo_onramp_history', JSON.stringify(transactions));
            
            // Notify dashboard to update history
            if (window.rojoApp && window.rojoApp.updateTransactionHistory) {
                window.rojoApp.updateTransactionHistory();
            }
            
        } catch (error) {
            console.error('🔴 ROJO: Failed to save transaction history:', error);
        }
    }

    /**
     * Get transaction history
     */
    getTransactionHistory() {
        try {
            return JSON.parse(localStorage.getItem('rojo_onramp_history') || '[]');
        } catch (error) {
            console.error('🔴 ROJO: Failed to get transaction history:', error);
            return [];
        }
    }

    /**
     * Get supported assets for onramp
     */
    getSupportedAssets() {
        return this.supportedCurrencies.map(currency => ({
            symbol: currency,
            name: this.getCurrencyName(currency),
            networks: this.getSupportedNetworks(currency)
        }));
    }

    /**
     * Get currency display name
     */
    getCurrencyName(symbol) {
        const names = {
            'ETH': 'Ethereum',
            'BTC': 'Bitcoin',
            'USDC': 'USD Coin',
            'USDT': 'Tether',
            'DAI': 'Dai Stablecoin',
            'MATIC': 'Polygon',
            'SOL': 'Solana'
        };
        return names[symbol] || symbol;
    }

    /**
     * Get supported networks for currency
     */
    getSupportedNetworks(currency) {
        const networks = {
            'ETH': ['ethereum', 'base', 'polygon'],
            'BTC': ['bitcoin'],
            'USDC': ['ethereum', 'base', 'polygon', 'solana'],
            'USDT': ['ethereum', 'polygon'],
            'DAI': ['ethereum', 'polygon'],
            'MATIC': ['polygon'],
            'SOL': ['solana']
        };
        return networks[currency] || ['ethereum'];
    }

    /**
     * Track analytics events
     */
    trackOnrampEvent(eventName, eventData = {}) {
        try {
            // Send to analytics if available
            if (window.gtag) {
                window.gtag('event', eventName, {
                    event_category: 'onramp',
                    event_label: 'coinbase_onramp',
                    custom_map: eventData
                });
            }

            // Send to internal analytics
            if (window.rojoApp && window.rojoApp.trackEvent) {
                window.rojoApp.trackEvent(eventName, {
                    category: 'onramp',
                    provider: 'coinbase',
                    ...eventData
                });
            }

            console.log(`📊 ROJO Analytics: ${eventName}`, eventData);
            
        } catch (error) {
            console.error('🔴 ROJO: Analytics tracking failed:', error);
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Try to use dashboard notification system
        if (window.rojoApp && window.rojoApp.showNotification) {
            window.rojoApp.showNotification(message, type);
            return;
        }

        // Fallback notification
        const notification = document.createElement('div');
        notification.className = `rojo-notification rojo-notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 400px;
            font-family: 'Inter', sans-serif;
            font-weight: 500;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Create onramp button for integration
     */
    createOnrampButton(container, options = {}) {
        const button = document.createElement('button');
        button.className = 'rojo-onramp-button';
        button.innerHTML = `
            <i class="fas fa-credit-card"></i>
            <span>Buy Crypto</span>
        `;
        
        button.style.cssText = `
            background: linear-gradient(135deg, #c55036, #ffd700);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: transform 0.2s, box-shadow 0.2s;
        `;

        // Hover effects
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 8px 25px rgba(197, 80, 54, 0.3)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        });

        // Click handler
        button.addEventListener('click', () => {
            this.openOnramp(options);
        });

        // Add to container
        if (typeof container === 'string') {
            const element = document.querySelector(container);
            if (element) {
                element.appendChild(button);
            }
        } else if (container && container.appendChild) {
            container.appendChild(button);
        }

        return button;
    }

    /**
     * Destroy onramp instance
     */
    destroy() {
        if (this.onrampInstance) {
            this.onrampInstance.destroy();
            this.onrampInstance = null;
        }
        
        this.isInitialized = false;
        console.log('🔥 ROJO: Onramp destroyed');
    }
}

// Export for use in other modules
window.RojoOnramp = RojoOnramp;

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.rojoOnramp = new RojoOnramp();
    });
} else {
    window.rojoOnramp = new RojoOnramp();
}

export default RojoOnramp;
