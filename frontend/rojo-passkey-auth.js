/**
 * 🔒 ROJO Passkey Authentication - Autenticación Biométrica Avanzada
 * Implementación basada en configuraciones internas de Coinbase Wallet
 * @author VERGASEC PRO
 */

class RojoPasskeyAuth {
    constructor() {
        this.rpId = window.location.hostname; // Se adaptará al dominio
        this.rpName = "ROJO Ecosystem";
        this.timeout = 180000; // 3 minutos (mismo que Coinbase)
        this.challenge = null;
        this.userCredentials = new Map();
        this.isSupported = this.checkWebAuthnSupport();
        
        console.log('🔒 ROJO Passkey Auth initialized:', {
            rpId: this.rpId,
            isSupported: this.isSupported
        });
    }

    /**
     * Verificar soporte de WebAuthn en el navegador
     */
    checkWebAuthnSupport() {
        return !!(navigator.credentials && 
                 navigator.credentials.create && 
                 navigator.credentials.get &&
                 window.PublicKeyCredential);
    }

    /**
     * Generar challenge criptográfico seguro
     */
    generateChallenge() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        this.challenge = array;
        return array;
    }

    /**
     * Convertir ArrayBuffer a Base64URL
     */
    arrayBufferToBase64Url(buffer) {
        const bytes = new Uint8Array(buffer);
        let str = '';
        for (let i = 0; i < bytes.length; i++) {
            str += String.fromCharCode(bytes[i]);
        }
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    /**
     * Convertir Base64URL a ArrayBuffer
     */
    base64UrlToArrayBuffer(base64url) {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const padLength = (4 - (base64.length % 4)) % 4;
        const padded = base64 + '='.repeat(padLength);
        const binary = atob(padded);
        const buffer = new ArrayBuffer(binary.length);
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return buffer;
    }

    /**
     * Crear nueva credencial biométrica (registro)
     */
    async createPasskey(username, userDisplayName = null) {
        if (!this.isSupported) {
            throw new Error('WebAuthn no es soportado en este navegador');
        }

        try {
            const userId = new TextEncoder().encode(username);
            const challenge = this.generateChallenge();

            const credentialCreationOptions = {
                publicKey: {
                    challenge: challenge,
                    rp: {
                        id: this.rpId,
                        name: this.rpName,
                        icon: '/assets/ROJO.png'
                    },
                    user: {
                        id: userId,
                        name: username,
                        displayName: userDisplayName || username,
                        icon: '/assets/ROJO.png'
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: "public-key" },   // ES256 (ECDSA w/ SHA-256)
                        { alg: -257, type: "public-key" }, // RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)
                        { alg: -37, type: "public-key" }   // PS256 (RSASSA-PSS w/ SHA-256)
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform", // Built-in authenticators only
                        userVerification: "required",        // Biometric required
                        residentKey: "required"              // Passwordless
                    },
                    timeout: this.timeout,
                    attestation: "direct", // Get attestation data
                    extensions: {
                        credProps: true // Get credential properties
                    }
                }
            };

            console.log('🔒 Creating passkey for user:', username);
            const credential = await navigator.credentials.create(credentialCreationOptions);

            if (!credential) {
                throw new Error('Failed to create credential');
            }

            // Procesar la credencial creada
            const credentialData = {
                id: credential.id,
                rawId: this.arrayBufferToBase64Url(credential.rawId),
                type: credential.type,
                response: {
                    clientDataJSON: this.arrayBufferToBase64Url(credential.response.clientDataJSON),
                    attestationObject: this.arrayBufferToBase64Url(credential.response.attestationObject)
                },
                authenticatorAttachment: credential.authenticatorAttachment,
                timestamp: new Date().toISOString(),
                username: username
            };

            // Guardar en localStorage (en producción usar backend seguro)
            this.userCredentials.set(username, credentialData);
            localStorage.setItem('rojoPasskeyCredentials', JSON.stringify(Array.from(this.userCredentials.entries())));

            console.log('✅ Passkey created successfully:', credentialData.id);
            return credentialData;

        } catch (error) {
            console.error('❌ Error creating passkey:', error);
            throw error;
        }
    }

    /**
     * Autenticar con passkey existente
     */
    async authenticateWithPasskey(username = null) {
        if (!this.isSupported) {
            throw new Error('WebAuthn no es soportado en este navegador');
        }

        try {
            const challenge = this.generateChallenge();
            let allowCredentials = [];

            // Si se especifica usuario, usar solo sus credenciales
            if (username && this.userCredentials.has(username)) {
                const userCred = this.userCredentials.get(username);
                allowCredentials = [{
                    id: this.base64UrlToArrayBuffer(userCred.rawId),
                    type: "public-key",
                    transports: ["internal", "hybrid"]
                }];
            }

            const credentialRequestOptions = {
                publicKey: {
                    challenge: challenge,
                    allowCredentials: allowCredentials,
                    userVerification: "required",
                    timeout: this.timeout,
                    rpId: this.rpId
                }
            };

            console.log('🔒 Authenticating with passkey...');
            const assertion = await navigator.credentials.get(credentialRequestOptions);

            if (!assertion) {
                throw new Error('Authentication failed');
            }

            // Procesar la respuesta de autenticación
            const authData = {
                id: assertion.id,
                rawId: this.arrayBufferToBase64Url(assertion.rawId),
                type: assertion.type,
                response: {
                    clientDataJSON: this.arrayBufferToBase64Url(assertion.response.clientDataJSON),
                    authenticatorData: this.arrayBufferToBase64Url(assertion.response.authenticatorData),
                    signature: this.arrayBufferToBase64Url(assertion.response.signature),
                    userHandle: assertion.response.userHandle ? 
                               this.arrayBufferToBase64Url(assertion.response.userHandle) : null
                },
                timestamp: new Date().toISOString()
            };

            console.log('✅ Authentication successful:', authData.id);
            return authData;

        } catch (error) {
            console.error('❌ Authentication failed:', error);
            throw error;
        }
    }

    /**
     * Cargar credenciales guardadas
     */
    loadStoredCredentials() {
        try {
            const stored = localStorage.getItem('rojoPasskeyCredentials');
            if (stored) {
                const credentialsArray = JSON.parse(stored);
                this.userCredentials = new Map(credentialsArray);
                console.log('📥 Loaded stored credentials:', this.userCredentials.size);
            }
        } catch (error) {
            console.error('❌ Error loading credentials:', error);
            this.userCredentials = new Map();
        }
    }

    /**
     * Verificar si el usuario tiene passkey
     */
    hasPasskey(username) {
        return this.userCredentials.has(username);
    }

    /**
     * Eliminar passkey de usuario
     */
    removePasskey(username) {
        const removed = this.userCredentials.delete(username);
        if (removed) {
            localStorage.setItem('rojoPasskeyCredentials', JSON.stringify(Array.from(this.userCredentials.entries())));
            console.log('🗑️ Passkey removed for user:', username);
        }
        return removed;
    }

    /**
     * Obtener información de todas las credenciales
     */
    getCredentialsInfo() {
        const info = [];
        for (const [username, cred] of this.userCredentials) {
            info.push({
                username: username,
                credentialId: cred.id,
                created: cred.timestamp,
                authenticatorAttachment: cred.authenticatorAttachment
            });
        }
        return info;
    }

    /**
     * Flujo completo de onboarding biométrico
     */
    async biometricOnboarding(username, userDisplayName = null) {
        try {
            // Verificar soporte
            if (!this.isSupported) {
                return {
                    success: false,
                    error: 'Este dispositivo no soporta autenticación biométrica',
                    fallback: 'traditional'
                };
            }

            // Verificar si ya tiene passkey
            if (this.hasPasskey(username)) {
                return {
                    success: false,
                    error: 'Usuario ya tiene passkey configurado',
                    existing: true
                };
            }

            // Crear passkey
            const credential = await this.createPasskey(username, userDisplayName);

            // Probar inmediatamente la autenticación
            const auth = await this.authenticateWithPasskey(username);

            return {
                success: true,
                credential: credential,
                authentication: auth,
                message: 'Autenticación biométrica configurada exitosamente'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }
}

// Clase para integración con pagos biométricos
class RojoBiometricPayment {
    constructor(passkeyAuth, dashboard) {
        this.passkeyAuth = passkeyAuth;
        this.dashboard = dashboard;
        this.isProcessing = false;
    }

    /**
     * Iniciar pago con autenticación biométrica
     */
    async initiatePayment(paymentData) {
        if (this.isProcessing) {
            throw new Error('Ya hay un pago en proceso');
        }

        this.isProcessing = true;

        try {
            const { amount, recipient, asset = 'ETH', username } = paymentData;

            // 1. Mostrar confirmación de pago
            const confirmed = await this.showPaymentConfirmation(amount, recipient, asset);
            if (!confirmed) {
                return { success: false, error: 'Pago cancelado por el usuario' };
            }

            // 2. Autenticar con biometría
            console.log('🔒 Solicitando autenticación biométrica...');
            const authResult = await this.passkeyAuth.authenticateWithPasskey(username);

            // 3. Procesar pago
            const transaction = await this.processSecurePayment({
                amount,
                recipient,
                asset,
                authSignature: authResult
            });

            return {
                success: true,
                transactionId: transaction.id,
                message: `Pago de ${amount} ${asset} enviado exitosamente`,
                authMethod: 'biometric'
            };

        } catch (error) {
            console.error('❌ Biometric payment failed:', error);
            return {
                success: false,
                error: error.message,
                authMethod: 'biometric'
            };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Mostrar modal de confirmación de pago
     */
    async showPaymentConfirmation(amount, recipient, asset) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-red-800">
                    <div class="text-center">
                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 class="text-lg font-medium text-white mb-2">Confirmar Pago Biométrico</h3>
                        <div class="space-y-2 text-sm text-gray-300 mb-6">
                            <p><span class="font-semibold">Cantidad:</span> ${amount} ${asset}</p>
                            <p><span class="font-semibold">Destinatario:</span> ${recipient}</p>
                            <p class="text-xs bg-gray-800 p-2 rounded">Se solicitará autenticación biométrica</p>
                        </div>
                        <div class="flex space-x-3">
                            <button id="cancelPayment" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md">
                                Cancelar
                            </button>
                            <button id="confirmPayment" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md">
                                Confirmar y Autenticar
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('cancelPayment').onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };

            document.getElementById('confirmPayment').onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };
        });
    }

    /**
     * Procesar pago seguro con firma biométrica
     */
    async processSecurePayment(paymentData) {
        // Simular procesamiento de pago
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
            id: `rojo_biometric_${Date.now()}`,
            amount: paymentData.amount,
            recipient: paymentData.recipient,
            asset: paymentData.asset,
            timestamp: new Date().toISOString(),
            authMethod: 'passkey',
            status: 'completed'
        };
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia global
    window.rojoPasskeyAuth = new RojoPasskeyAuth();
    window.rojoPasskeyAuth.loadStoredCredentials();

    const tryIntegrate = () => {
        if (window.rojoDashboard && !window.rojoBiometricPayment) {
            window.rojoBiometricPayment = new RojoBiometricPayment(
                window.rojoPasskeyAuth,
                window.rojoDashboard
            );
            console.log('🔒 ROJO Biometric Payment integrated with dashboard');
            return true;
        }
        return false;
    };

    // Intento inmediato
    if (!tryIntegrate()) {
        // Polling breve hasta que el dashboard esté listo
        const integrateInterval = setInterval(() => {
            if (tryIntegrate()) {
                clearInterval(integrateInterval);
            }
        }, 100);
        // Failsafe timeout
        setTimeout(() => clearInterval(integrateInterval), 10000);
    }

    console.log('🔥 ROJO Passkey Authentication system initialized');
});
