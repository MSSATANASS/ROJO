/**
 * ROJO Script Loader - Carga dinámica de scripts con estado y cleanup
 * Basado en react-sync-script de Coinbase para manejo avanzado de scripts
 */

class RojoScriptLoader {
    constructor() {
        this.scriptMap = new Map();
        this.idCounter = 0;
        this.globalObserver = null;
        
        this.init();
    }

    init() {
        console.log('📜 Inicializando ROJO Script Loader...');
        
        // Configurar observer global para scripts dinámicos
        this.setupGlobalObserver();
        
        console.log('✅ ROJO Script Loader inicializado');
    }

    setupGlobalObserver() {
        if (typeof window === 'undefined' || !window.MutationObserver) return;

        this.globalObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'SCRIPT' && node.src) {
                        this.registerExistingScript(node);
                    }
                });
            });
        });

        this.globalObserver.observe(document.head, { childList: true });
        this.globalObserver.observe(document.body, { childList: true });
    }

    registerExistingScript(scriptElement) {
        const url = scriptElement.src;
        if (this.scriptMap.has(url)) {
            const entry = this.scriptMap.get(url);
            entry.element = scriptElement;
            console.log(`📋 Script existente registrado: ${url}`);
        }
    }

    /**
     * Carga un script de forma asíncrona con manejo de estado
     * @param {string} url - URL del script a cargar
     * @param {Object} options - Opciones de configuración
     * @returns {Promise} Promise que resuelve cuando el script se carga
     */
    loadScript(url, options = {}) {
        return new Promise((resolve, reject) => {
            const config = {
                globalName: options.globalName,
                callbackName: options.callbackName,
                attributes: options.attributes || {},
                removeOnUnmount: options.removeOnUnmount || false,
                timeout: options.timeout || 30000,
                retries: options.retries || 2,
                ...options
            };

            console.log(`⬇️ Cargando script: ${url}`);

            // Verificar si ya existe en window
            if (config.globalName && typeof window[config.globalName] !== 'undefined') {
                console.log(`✅ Script ya disponible globalmente: ${config.globalName}`);
                this.scriptMap.set(url, {
                    loaded: true,
                    error: null,
                    element: null,
                    observers: new Map(),
                    config
                });
                resolve({ loaded: true, global: window[config.globalName] });
                return;
            }

            // Verificar si ya está cargando o cargado
            if (this.scriptMap.has(url)) {
                const entry = this.scriptMap.get(url);
                
                if (entry.loaded) {
                    console.log(`✅ Script ya cargado: ${url}`);
                    resolve({ 
                        loaded: true, 
                        global: config.globalName ? window[config.globalName] : undefined 
                    });
                    return;
                }

                if (entry.error) {
                    console.log(`❌ Script falló previamente: ${url}`);
                    reject(entry.error);
                    return;
                }

                // Ya está cargando, agregar a observers
                const observerId = this.generateObserverId();
                entry.observers.set(observerId, { resolve, reject, config });
                console.log(`⏳ Agregado a cola de observadores: ${url}`);
                return;
            }

            // Iniciar nueva carga
            this.startScriptLoad(url, config, resolve, reject);
        });
    }

    startScriptLoad(url, config, resolve, reject) {
        const observerId = this.generateObserverId();
        const observers = new Map();
        observers.set(observerId, { resolve, reject, config });

        // Crear entrada en el mapa
        const entry = {
            loaded: false,
            error: null,
            element: null,
            observers,
            config,
            startTime: Date.now()
        };
        
        this.scriptMap.set(url, entry);

        // Crear elemento script
        const script = this.createScriptElement(url, config);
        entry.element = script;

        // Configurar timeout
        const timeoutId = setTimeout(() => {
            const error = new Error(`Timeout cargando script: ${url}`);
            this.handleScriptError(url, error);
        }, config.timeout);

        // Configurar callbacks del script
        script.onload = () => {
            clearTimeout(timeoutId);
            this.handleScriptLoad(url, config);
        };

        script.onerror = () => {
            clearTimeout(timeoutId);
            const error = new Error(`Error cargando script: ${url}`);
            this.handleScriptError(url, error);
        };

        // Agregar al DOM
        document.head.appendChild(script);
        console.log(`📄 Script agregado al DOM: ${url}`);
    }

    createScriptElement(url, config) {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;

        // Agregar atributos personalizados
        Object.entries(config.attributes).forEach(([key, value]) => {
            script.setAttribute(key, value);
        });

        // ID personalizado si se especifica
        if (config.scriptId) {
            script.id = config.scriptId;
        }

        return script;
    }

    handleScriptLoad(url, config) {
        const entry = this.scriptMap.get(url);
        if (!entry) return;

        console.log(`✅ Script cargado exitosamente: ${url}`);
        
        entry.loaded = true;
        entry.loadTime = Date.now() - entry.startTime;

        // Si hay callback global, configurarlo
        if (config.callbackName && typeof window !== 'undefined') {
            window[config.callbackName] = () => {
                console.log(`🔔 Callback ejecutado: ${config.callbackName}`);
                this.notifyObservers(url, { 
                    loaded: true, 
                    global: config.globalName ? window[config.globalName] : undefined 
                });
            };
        } else {
            // Notificar inmediatamente
            this.notifyObservers(url, { 
                loaded: true, 
                global: config.globalName ? window[config.globalName] : undefined 
            });
        }
    }

    handleScriptError(url, error) {
        const entry = this.scriptMap.get(url);
        if (!entry) return;

        console.error(`❌ Error cargando script: ${url}`, error);
        
        entry.error = error;

        // Intentar retry si está configurado
        if (entry.config.retries > 0) {
            entry.config.retries--;
            console.log(`🔄 Reintentando carga de script: ${url} (${entry.config.retries} intentos restantes)`);
            
            // Remover script fallido
            if (entry.element) {
                entry.element.remove();
            }
            
            // Reiniciar carga después de un delay
            setTimeout(() => {
                entry.loaded = false;
                entry.error = null;
                this.startScriptLoad(url, entry.config, 
                    entry.observers.values().next().value.resolve,
                    entry.observers.values().next().value.reject
                );
            }, 1000);
            
            return;
        }

        // Notificar error a todos los observers
        entry.observers.forEach(({ reject }) => {
            reject(error);
        });

        entry.observers.clear();
    }

    notifyObservers(url, result) {
        const entry = this.scriptMap.get(url);
        if (!entry) return;

        entry.observers.forEach(({ resolve }) => {
            resolve(result);
        });

        entry.observers.clear();
    }

    /**
     * Remueve un script del DOM y limpia referencias
     * @param {string} url - URL del script a remover
     */
    removeScript(url) {
        const entry = this.scriptMap.get(url);
        if (!entry) {
            console.warn(`⚠️ Script no encontrado para remover: ${url}`);
            return false;
        }

        console.log(`🗑️ Removiendo script: ${url}`);

        // Remover elemento del DOM
        if (entry.element && entry.element.parentNode) {
            entry.element.parentNode.removeChild(entry.element);
        }

        // Buscar y remover otros elementos con la misma URL
        const allScripts = document.getElementsByTagName('script');
        for (let i = allScripts.length - 1; i >= 0; i--) {
            if (allScripts[i].src.includes(url)) {
                if (allScripts[i].parentNode) {
                    allScripts[i].parentNode.removeChild(allScripts[i]);
                }
            }
        }

        // Limpiar callback global si existe
        if (entry.config.callbackName && typeof window !== 'undefined') {
            delete window[entry.config.callbackName];
        }

        // Remover del mapa
        this.scriptMap.delete(url);

        return true;
    }

    /**
     * Carga múltiples scripts de forma paralela
     * @param {Array} scriptConfigs - Array de configuraciones de script
     * @returns {Promise} Promise que resuelve cuando todos los scripts se cargan
     */
    loadMultipleScripts(scriptConfigs) {
        console.log(`📚 Cargando ${scriptConfigs.length} scripts en paralelo...`);
        
        const promises = scriptConfigs.map(config => {
            if (typeof config === 'string') {
                return this.loadScript(config);
            } else {
                return this.loadScript(config.url, config);
            }
        });

        return Promise.all(promises);
    }

    /**
     * Carga scripts de forma secuencial (uno después del otro)
     * @param {Array} scriptConfigs - Array de configuraciones de script
     * @returns {Promise} Promise que resuelve cuando todos los scripts se cargan
     */
    async loadSequentialScripts(scriptConfigs) {
        console.log(`📑 Cargando ${scriptConfigs.length} scripts secuencialmente...`);
        
        const results = [];
        
        for (const config of scriptConfigs) {
            try {
                let result;
                if (typeof config === 'string') {
                    result = await this.loadScript(config);
                } else {
                    result = await this.loadScript(config.url, config);
                }
                results.push(result);
            } catch (error) {
                console.error('Error en carga secuencial:', error);
                throw error;
            }
        }

        return results;
    }

    /**
     * Verifica si un script está cargado
     * @param {string} url - URL del script
     * @returns {boolean} True si está cargado
     */
    isScriptLoaded(url) {
        const entry = this.scriptMap.get(url);
        return entry ? entry.loaded : false;
    }

    /**
     * Obtiene el estado de un script
     * @param {string} url - URL del script
     * @returns {Object} Estado del script
     */
    getScriptStatus(url) {
        const entry = this.scriptMap.get(url);
        if (!entry) {
            return { status: 'not_found' };
        }

        return {
            status: entry.loaded ? 'loaded' : (entry.error ? 'error' : 'loading'),
            loaded: entry.loaded,
            error: entry.error,
            loadTime: entry.loadTime,
            observerCount: entry.observers.size
        };
    }

    /**
     * Lista todos los scripts cargados
     * @returns {Array} Lista de scripts con sus estados
     */
    getAllScripts() {
        const scripts = [];
        
        this.scriptMap.forEach((entry, url) => {
            scripts.push({
                url,
                status: this.getScriptStatus(url),
                config: entry.config
            });
        });

        return scripts;
    }

    /**
     * Limpia todos los scripts cargados
     */
    cleanup() {
        console.log('🧹 Limpiando Script Loader...');
        
        const urls = Array.from(this.scriptMap.keys());
        urls.forEach(url => {
            const entry = this.scriptMap.get(url);
            if (entry.config.removeOnUnmount) {
                this.removeScript(url);
            }
        });

        if (this.globalObserver) {
            this.globalObserver.disconnect();
        }
    }

    generateObserverId() {
        return `observer-${++this.idCounter}`;
    }

    // Métodos de conveniencia para scripts comunes

    loadGoogleAnalytics(trackingId, options = {}) {
        return this.loadScript(`https://www.googletagmanager.com/gtag/js?id=${trackingId}`, {
            globalName: 'gtag',
            ...options
        }).then(() => {
            // Configurar gtag
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', trackingId);
            
            console.log(`📊 Google Analytics configurado: ${trackingId}`);
            return { loaded: true, trackingId };
        });
    }

    loadWeb3Provider(providerUrl, options = {}) {
        return this.loadScript(providerUrl, {
            globalName: 'Web3',
            timeout: 15000,
            ...options
        });
    }

    loadWalletConnect(options = {}) {
        return this.loadScript('https://unpkg.com/@walletconnect/web3-provider@latest/dist/umd/index.min.js', {
            globalName: 'WalletConnectProvider',
            ...options
        });
    }

    loadMixpanel(token, options = {}) {
        return this.loadScript('https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js', {
            globalName: 'mixpanel',
            ...options
        }).then(() => {
            if (window.mixpanel && token) {
                window.mixpanel.init(token);
                console.log(`📈 Mixpanel configurado: ${token}`);
            }
            return { loaded: true, token };
        });
    }
}

// Crear instancia global
const rojoScriptLoader = new RojoScriptLoader();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.RojoScriptLoader = RojoScriptLoader;
    window.rojoScriptLoader = rojoScriptLoader;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RojoScriptLoader, rojoScriptLoader };
}
