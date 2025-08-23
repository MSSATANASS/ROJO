/**
 * ROJO Consent Manager - Sistema de gestión de consentimiento y tracking
 * Basado en el cookie-manager de Coinbase para compliance GDPR/CCPA
 */

class RojoConsentManager {
    constructor(config = {}) {
        this.config = {
            domain: config.domain || window.location.hostname,
            region: config.region || this.detectRegion(),
            framework: config.framework || 'gdpr',
            shadowMode: config.shadowMode || false,
            cookiePrefix: config.cookiePrefix || 'rojo_',
            ...config
        };

        this.TRACKING_CATEGORIES = {
            NECESSARY: 'necessary',
            ANALYTICS: 'analytics', 
            MARKETING: 'marketing',
            PERSONALIZATION: 'personalization',
            PERFORMANCE: 'performance'
        };

        this.COOKIE_NAMES = {
            CONSENT_PREFERENCES: `${this.config.cookiePrefix}consent_preferences`,
            AD_TRACKING: `${this.config.cookiePrefix}ad_tracking_allowed`,
            BANNER_DISMISSED: `${this.config.cookiePrefix}banner_dismissed`
        };

        this.trackerConfig = this.getDefaultTrackerConfig();
        this.eventListeners = new Map();
        this.scriptQueue = new Map();
        
        this.init();
    }

    init() {
        console.log('🍪 Inicializando ROJO Consent Manager...');
        
        // Cargar preferencias guardadas
        this.loadSavedPreferences();
        
        // Configurar listeners
        this.setupEventListeners();
        
        // Comenzar monitoreo de cookies
        this.startCookieMonitoring();
        
        // Mostrar banner si es necesario
        this.checkBannerDisplay();
        
        console.log('✅ ROJO Consent Manager inicializado');
    }

    detectRegion() {
        // Simplificado: detectar región basado en idioma/timezone
        const language = navigator.language || navigator.userLanguage;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Regiones EU (requieren consentimiento explícito)
        const euCountries = ['de', 'fr', 'es', 'it', 'nl', 'pt', 'pl', 'se', 'dk', 'fi', 'no'];
        const isEU = euCountries.some(country => language.startsWith(country)) ||
                   timezone.includes('Europe/');
        
        return isEU ? 'EU' : 'US';
    }

    getDefaultTrackerConfig() {
        return {
            // Scripts de analytics
            'google-analytics': {
                type: 'script',
                category: this.TRACKING_CATEGORIES.ANALYTICS,
                url: 'https://www.googletagmanager.com/gtag/js',
                required: false
            },
            'mixpanel': {
                type: 'script', 
                category: this.TRACKING_CATEGORIES.ANALYTICS,
                url: 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js',
                required: false
            },
            
            // Scripts de marketing
            'facebook-pixel': {
                type: 'script',
                category: this.TRACKING_CATEGORIES.MARKETING,
                url: 'https://connect.facebook.net/en_US/fbevents.js',
                required: false
            },
            'twitter-pixel': {
                type: 'script',
                category: this.TRACKING_CATEGORIES.MARKETING,
                url: 'https://static.ads-twitter.com/uwt.js',
                required: false
            },
            
            // Scripts de performance
            'hotjar': {
                type: 'script',
                category: this.TRACKING_CATEGORIES.PERFORMANCE,
                url: 'https://static.hotjar.com/c/hotjar-',
                required: false
            },
            
            // Cookies necesarias
            'rojo_session': {
                type: 'cookie',
                category: this.TRACKING_CATEGORIES.NECESSARY,
                required: true,
                expiry: 30 // días
            },
            'rojo_wallet_address': {
                type: 'cookie', 
                category: this.TRACKING_CATEGORIES.NECESSARY,
                required: true,
                expiry: 365
            },
            
            // Cookies de personalización
            'rojo_theme': {
                type: 'cookie',
                category: this.TRACKING_CATEGORIES.PERSONALIZATION,
                required: false,
                expiry: 365
            },
            'rojo_language': {
                type: 'cookie',
                category: this.TRACKING_CATEGORIES.PERSONALIZATION, 
                required: false,
                expiry: 365
            }
        };
    }

    loadSavedPreferences() {
        const saved = this.getCookie(this.COOKIE_NAMES.CONSENT_PREFERENCES);
        
        if (saved) {
            try {
                this.preferences = JSON.parse(saved);
                console.log('📋 Preferencias cargadas:', this.preferences);
            } catch (e) {
                console.warn('⚠️ Error al cargar preferencias guardadas');
                this.preferences = this.getDefaultPreferences();
            }
        } else {
            this.preferences = this.getDefaultPreferences();
        }
    }

    getDefaultPreferences() {
        const defaults = {
            region: this.config.region,
            consent: [this.TRACKING_CATEGORIES.NECESSARY], // Solo necesarias por defecto
            timestamp: Date.now()
        };

        // En región US, opt-in por defecto
        if (this.config.region === 'US') {
            defaults.consent = Object.values(this.TRACKING_CATEGORIES);
        }

        return defaults;
    }

    setupEventListeners() {
        // Escuchar cambios en el DOM para scripts dinámicos
        if (typeof window !== 'undefined' && window.MutationObserver) {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'SCRIPT' && node.src) {
                            this.validateScript(node);
                        }
                    });
                });
            });

            observer.observe(document.head, { childList: true });
            observer.observe(document.body, { childList: true });
        }
    }

    startCookieMonitoring() {
        if (typeof window === 'undefined') return;

        // Monitorear cookies cada 500ms
        const pollInterval = 500;
        
        setInterval(() => {
            this.auditAndCleanCookies();
        }, pollInterval);
    }

    auditAndCleanCookies() {
        const allCookies = this.getAllCookies();
        const cookiesToRemove = [];

        Object.keys(allCookies).forEach(cookieName => {
            // Excluir cookies del propio consent manager
            if (cookieName.startsWith(this.config.cookiePrefix)) {
                return;
            }

            const trackerInfo = this.trackerConfig[cookieName];
            
            if (!trackerInfo) {
                // Cookie no configurada - remover por seguridad
                if (!this.config.shadowMode) {
                    cookiesToRemove.push(cookieName);
                }
                return;
            }

            // Verificar si tiene consentimiento
            if (!this.hasConsent(trackerInfo.category) && !trackerInfo.required) {
                cookiesToRemove.push(cookieName);
            }
        });

        // Remover cookies sin consentimiento
        cookiesToRemove.forEach(cookieName => {
            this.removeCookie(cookieName);
            console.log(`🗑️ Cookie removida por falta de consentimiento: ${cookieName}`);
        });
    }

    validateScript(scriptElement) {
        const src = scriptElement.src;
        
        // Buscar configuración del tracker
        const trackerKey = Object.keys(this.trackerConfig).find(key => {
            const config = this.trackerConfig[key];
            return config.type === 'script' && src.includes(config.url);
        });

        if (trackerKey) {
            const config = this.trackerConfig[trackerKey];
            
            if (!this.hasConsent(config.category) && !config.required) {
                console.log(`🚫 Script bloqueado por falta de consentimiento: ${src}`);
                scriptElement.remove();
                return false;
            }
        }

        return true;
    }

    hasConsent(category) {
        if (!this.preferences || !this.preferences.consent) {
            return false;
        }
        
        return this.preferences.consent.includes(category);
    }

    setTrackingPreference(categories) {
        console.log('🎯 Actualizando preferencias de tracking:', categories);
        
        this.preferences = {
            region: this.config.region,
            consent: Array.isArray(categories) ? categories : [categories],
            timestamp: Date.now()
        };

        // Guardar en cookie
        this.setCookie(
            this.COOKIE_NAMES.CONSENT_PREFERENCES,
            JSON.stringify(this.preferences),
            { expires: 365 }
        );

        // Disparar evento de cambio
        this.fireEvent('preferenceChange', this.preferences);

        // Procesar scripts en cola
        this.processScriptQueue();

        // Re-auditar cookies
        this.auditAndCleanCookies();
    }

    acceptAll() {
        const allCategories = Object.values(this.TRACKING_CATEGORIES);
        this.setTrackingPreference(allCategories);
        this.dismissBanner();
    }

    acceptNecessaryOnly() {
        this.setTrackingPreference([this.TRACKING_CATEGORIES.NECESSARY]);
        this.dismissBanner();
    }

    dismissBanner() {
        this.setCookie(this.COOKIE_NAMES.BANNER_DISMISSED, 'true', { expires: 365 });
        
        const banner = document.getElementById('rojo-consent-banner');
        if (banner) {
            banner.style.display = 'none';
        }

        this.fireEvent('bannerDismissed');
    }

    checkBannerDisplay() {
        const dismissed = this.getCookie(this.COOKIE_NAMES.BANNER_DISMISSED);
        const hasPreferences = this.getCookie(this.COOKIE_NAMES.CONSENT_PREFERENCES);
        
        // Mostrar banner si no se ha configurado antes
        if (!dismissed && !hasPreferences) {
            this.showConsentBanner();
        }
    }

    showConsentBanner() {
        // Crear banner si no existe
        if (!document.getElementById('rojo-consent-banner')) {
            this.createConsentBanner();
        }
    }

    createConsentBanner() {
        const banner = document.createElement('div');
        banner.id = 'rojo-consent-banner';
        banner.innerHTML = `
            <div style="
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #1a1a1a;
                color: white;
                padding: 20px;
                z-index: 10000;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
                font-family: system-ui, -apple-system, sans-serif;
            ">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 20px;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 8px 0; color: #ff4444;">🔒 ROJO Wallet</h3>
                        <p style="margin: 0; opacity: 0.9; font-size: 14px;">
                            Utilizamos cookies para mejorar tu experiencia y analizar el uso de nuestro wallet. 
                            Puedes elegir qué categorías aceptar.
                        </p>
                    </div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button id="rojo-accept-necessary" style="
                            background: #333;
                            border: 1px solid #555;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Solo Necesarias</button>
                        <button id="rojo-customize" style="
                            background: #444;
                            border: 1px solid #666;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Personalizar</button>
                        <button id="rojo-accept-all" style="
                            background: #ff4444;
                            border: none;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: bold;
                        ">Aceptar Todo</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Agregar event listeners
        document.getElementById('rojo-accept-necessary').onclick = () => this.acceptNecessaryOnly();
        document.getElementById('rojo-accept-all').onclick = () => this.acceptAll();
        document.getElementById('rojo-customize').onclick = () => this.showCustomizeModal();
    }

    showCustomizeModal() {
        // Crear modal de personalización
        const modal = document.createElement('div');
        modal.id = 'rojo-consent-modal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: system-ui, -apple-system, sans-serif;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                ">
                    <h2 style="margin: 0 0 20px 0; color: #333;">Personalizar Consentimiento</h2>
                    
                    <div id="consent-categories">
                        ${this.generateCategoryHTML()}
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
                        <button id="cancel-customize" style="
                            background: #f5f5f5;
                            border: 1px solid #ddd;
                            color: #333;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                        ">Cancelar</button>
                        <button id="save-preferences" style="
                            background: #ff4444;
                            border: none;
                            color: white;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: bold;
                        ">Guardar Preferencias</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners del modal
        document.getElementById('cancel-customize').onclick = () => {
            document.body.removeChild(modal);
        };

        document.getElementById('save-preferences').onclick = () => {
            this.saveCustomPreferences();
            document.body.removeChild(modal);
        };
    }

    generateCategoryHTML() {
        const categories = [
            {
                key: this.TRACKING_CATEGORIES.NECESSARY,
                name: 'Necesarias',
                description: 'Requeridas para el funcionamiento básico del wallet',
                required: true
            },
            {
                key: this.TRACKING_CATEGORIES.ANALYTICS,
                name: 'Analytics',
                description: 'Nos ayudan a entender cómo usas ROJO para mejorar la experiencia',
                required: false
            },
            {
                key: this.TRACKING_CATEGORIES.PERSONALIZATION,
                name: 'Personalización',
                description: 'Permiten recordar tus preferencias de tema, idioma, etc.',
                required: false
            },
            {
                key: this.TRACKING_CATEGORIES.PERFORMANCE,
                name: 'Rendimiento',
                description: 'Ayudan a monitorear y optimizar el rendimiento de la aplicación',
                required: false
            },
            {
                key: this.TRACKING_CATEGORIES.MARKETING,
                name: 'Marketing',
                description: 'Permiten mostrarte contenido relevante y medir campañas',
                required: false
            }
        ];

        return categories.map(category => {
            const checked = this.hasConsent(category.key) ? 'checked' : '';
            const disabled = category.required ? 'disabled' : '';
            
            return `
                <div style="margin-bottom: 16px; padding: 16px; border: 1px solid #eee; border-radius: 8px;">
                    <label style="display: flex; align-items: flex-start; cursor: ${category.required ? 'default' : 'pointer'};">
                        <input type="checkbox" value="${category.key}" ${checked} ${disabled} 
                               style="margin-right: 12px; margin-top: 2px;">
                        <div>
                            <div style="font-weight: bold; margin-bottom: 4px;">${category.name}</div>
                            <div style="color: #666; font-size: 14px;">${category.description}</div>
                            ${category.required ? '<div style="color: #ff4444; font-size: 12px; margin-top: 4px;">Requerida</div>' : ''}
                        </div>
                    </label>
                </div>
            `;
        }).join('');
    }

    saveCustomPreferences() {
        const checkboxes = document.querySelectorAll('#consent-categories input[type="checkbox"]');
        const selectedCategories = [];

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedCategories.push(checkbox.value);
            }
        });

        this.setTrackingPreference(selectedCategories);
        this.dismissBanner();
    }

    // Métodos de utilidad para scripts dinámicos
    loadScript(scriptKey, onLoad) {
        const config = this.trackerConfig[scriptKey];
        if (!config || config.type !== 'script') {
            console.warn(`Script no configurado: ${scriptKey}`);
            return;
        }

        if (!this.hasConsent(config.category) && !config.required) {
            console.log(`Script en cola por falta de consentimiento: ${scriptKey}`);
            this.scriptQueue.set(scriptKey, onLoad);
            return;
        }

        this.executeScript(config.url, onLoad);
    }

    executeScript(url, onLoad) {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = onLoad || (() => {});
        script.onerror = () => console.error(`Error cargando script: ${url}`);
        
        document.head.appendChild(script);
    }

    processScriptQueue() {
        for (const [scriptKey, onLoad] of this.scriptQueue) {
            const config = this.trackerConfig[scriptKey];
            if (this.hasConsent(config.category)) {
                this.executeScript(config.url, onLoad);
                this.scriptQueue.delete(scriptKey);
            }
        }
    }

    // Eventos
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    fireEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error en event listener ${event}:`, e);
                }
            });
        }
    }

    // Utilidades de cookies
    setCookie(name, value, options = {}) {
        let cookieString = `${name}=${encodeURIComponent(value)}`;
        
        if (options.expires) {
            const date = new Date();
            date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            cookieString += `; expires=${date.toUTCString()}`;
        }
        
        cookieString += `; path=${options.path || '/'}`;
        
        if (options.domain) {
            cookieString += `; domain=${options.domain}`;
        }
        
        if (options.secure) {
            cookieString += `; secure`;
        }
        
        if (options.sameSite) {
            cookieString += `; samesite=${options.sameSite}`;
        }

        if (!this.config.shadowMode) {
            document.cookie = cookieString;
        }
    }

    getCookie(name) {
        if (typeof document === 'undefined') return null;
        
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        
        if (parts.length === 2) {
            return decodeURIComponent(parts.pop().split(';').shift());
        }
        
        return null;
    }

    removeCookie(name) {
        if (!this.config.shadowMode) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
    }

    getAllCookies() {
        if (typeof document === 'undefined') return {};
        
        const cookies = {};
        document.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                cookies[name] = decodeURIComponent(value);
            }
        });
        
        return cookies;
    }

    // API pública
    getConsentStatus() {
        return {
            hasPreferences: !!this.getCookie(this.COOKIE_NAMES.CONSENT_PREFERENCES),
            preferences: this.preferences,
            categories: Object.values(this.TRACKING_CATEGORIES).map(category => ({
                category,
                hasConsent: this.hasConsent(category),
                required: category === this.TRACKING_CATEGORIES.NECESSARY
            }))
        };
    }

    resetAllConsent() {
        // Remover todas las cookies de consentimiento
        Object.values(this.COOKIE_NAMES).forEach(cookieName => {
            this.removeCookie(cookieName);
        });
        
        // Resetear preferencias
        this.preferences = this.getDefaultPreferences();
        
        // Mostrar banner nuevamente
        this.showConsentBanner();
        
        console.log('🔄 Consentimiento reseteado');
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.RojoConsentManager = RojoConsentManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RojoConsentManager };
}
