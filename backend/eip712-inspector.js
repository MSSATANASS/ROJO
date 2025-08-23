/**
 * ROJO EIP-712 Inspector - Validador de mensajes tipados y guardas de seguridad
 * Previene phishing y ataques de firma ciega
 */

const { ethers } = require('ethers');

class EIP712Inspector {
    constructor() {
        this.trustedContracts = new Set([
            // Contratos conocidos y seguros
            '0xa0b86a33e6441b8e8b96e3e30c9e1fb3e8de0f0c', // Ejemplo: Uniswap Router
            '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
            '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3 SwapRouter
        ]);
        
        this.suspiciousPatterns = [
            /approve.*unlimited/i,
            /setApprovalForAll.*true/i,
            /emergencyWithdraw/i,
            /backdoor/i,
            /admin.*transfer/i,
        ];
        
        this.highRiskDomains = [
            'Phishing',
            'FakeToken', 
            'ScamNFT',
            'DrainWallet'
        ];
    }

    /**
     * Inspecciona un mensaje EIP-712 antes de firmarlo
     * @param {Object} typedData - El objeto EIP-712 a firmar
     * @param {Object} options - Opciones de validación
     * @returns {Object} Resultado de la inspección
     */
    inspectTypedData(typedData, options = {}) {
        console.log('🔍 Inspeccionando mensaje EIP-712...');
        
        const result = {
            safe: true,
            warnings: [],
            errors: [],
            risk: 'low', // low, medium, high, critical
            details: {}
        };

        try {
            // Validar estructura básica
            this.validateStructure(typedData, result);
            
            // Verificar el contrato verificador  
            this.checkVerifyingContract(typedData, result);
            
            // Analizar el tipo primario
            this.analyzePrimaryType(typedData, result);
            
            // Inspeccionar el dominio
            this.inspectDomain(typedData, result);
            
            // Analizar el mensaje por patrones sospechosos
            this.analyzeMessageContent(typedData, result);
            
            // Verificar valores críticos
            this.checkCriticalValues(typedData, result);
            
            // Determinar el nivel de riesgo final
            this.calculateRiskLevel(result);
            
            console.log(`✅ Inspección completada. Riesgo: ${result.risk}`);
            
        } catch (error) {
            result.safe = false;
            result.errors.push(`Error durante inspección: ${error.message}`);
            result.risk = 'critical';
        }

        return result;
    }

    validateStructure(typedData, result) {
        if (!typedData.types) {
            result.errors.push('Estructura EIP-712 inválida: falta "types"');
            result.safe = false;
            return;
        }

        if (!typedData.primaryType) {
            result.errors.push('Estructura EIP-712 inválida: falta "primaryType"');
            result.safe = false;
            return;
        }

        if (!typedData.domain) {
            result.errors.push('Estructura EIP-712 inválida: falta "domain"');
            result.safe = false;
            return;
        }

        if (!typedData.message) {
            result.errors.push('Estructura EIP-712 inválida: falta "message"');
            result.safe = false;
            return;
        }

        result.details.structure = 'válida';
    }

    checkVerifyingContract(typedData, result) {
        const verifyingContract = typedData.domain?.verifyingContract;
        
        if (!verifyingContract) {
            result.warnings.push('No se especifica contrato verificador');
            return;
        }

        // Validar formato de dirección
        if (!ethers.isAddress(verifyingContract)) {
            result.errors.push(`Dirección de contrato verificador inválida: ${verifyingContract}`);
            result.safe = false;
            return;
        }

        result.details.verifyingContract = verifyingContract;

        // Verificar si está en la lista de confianza
        if (this.trustedContracts.has(verifyingContract.toLowerCase())) {
            result.details.contractTrusted = true;
            console.log(`✅ Contrato verificador de confianza: ${verifyingContract}`);
        } else {
            result.warnings.push(`Contrato verificador no conocido: ${verifyingContract}`);
            result.details.contractTrusted = false;
        }

        // Verificar si es un contrato conocido malicioso (simplificado)
        const suspiciousContracts = [
            '0x0000000000000000000000000000000000000000',
            '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
        ];
        
        if (suspiciousContracts.includes(verifyingContract.toLowerCase())) {
            result.errors.push(`⚠️ Contrato verificador sospechoso: ${verifyingContract}`);
            result.safe = false;
        }
    }

    analyzePrimaryType(typedData, result) {
        const primaryType = typedData.primaryType;
        result.details.primaryType = primaryType;

        // Tipos de alto riesgo
        const highRiskTypes = [
            'Permit',
            'ApprovalForAll', 
            'SetApprovalForAll',
            'EmergencyWithdraw',
            'AdminTransfer'
        ];

        if (highRiskTypes.includes(primaryType)) {
            result.warnings.push(`Tipo de mensaje de alto riesgo: ${primaryType}`);
            result.details.highRiskType = true;
        }

        // Tipos comunes y seguros
        const safeTypes = [
            'Mail',
            'Person',
            'Order',
            'Bid'
        ];

        if (safeTypes.includes(primaryType)) {
            result.details.commonSafeType = true;
        }
    }

    inspectDomain(typedData, result) {
        const domain = typedData.domain;
        result.details.domain = domain;

        // Verificar nombre del dominio
        if (domain.name) {
            const domainName = domain.name;
            
            if (this.highRiskDomains.some(risk => domainName.includes(risk))) {
                result.errors.push(`⚠️ Nombre de dominio sospechoso: ${domainName}`);
                result.safe = false;
            }

            // Verificar si simula dominios conocidos
            const legitDomains = ['Uniswap', 'OpenSea', 'CoinbaseWallet', 'ROJO'];
            const suspiciousPatterns = [
                /un[il]swap/i,     // uniswap -> unoswap, unicwap
                /open[s5]ea/i,     // opensea -> open5ea
                /c[o0]inbase/i     // coinbase -> c0inbase
            ];

            suspiciousPatterns.forEach(pattern => {
                if (pattern.test(domainName) && !legitDomains.includes(domainName)) {
                    result.warnings.push(`Posible phishing de dominio: ${domainName}`);
                }
            });
        }

        // Verificar versión
        if (domain.version && domain.version !== '1') {
            result.warnings.push(`Versión de dominio inusual: ${domain.version}`);
        }

        // Verificar chainId
        if (domain.chainId) {
            const supportedChains = [1, 8453, 84532, 137]; // Ethereum, Base, Base Sepolia, Polygon
            if (!supportedChains.includes(Number(domain.chainId))) {
                result.warnings.push(`Chain ID no soportado: ${domain.chainId}`);
            }
            result.details.chainId = domain.chainId;
        }
    }

    analyzeMessageContent(typedData, result) {
        const message = typedData.message;
        const messageStr = JSON.stringify(message).toLowerCase();

        // Buscar patrones sospechosos
        this.suspiciousPatterns.forEach(pattern => {
            if (pattern.test(messageStr)) {
                result.warnings.push(`Patrón sospechoso detectado: ${pattern.source}`);
            }
        });

        // Verificar valores de permiso peligrosos
        if (message.value && typeof message.value === 'string') {
            const value = message.value;
            
            // Verificar approve con cantidad máxima
            if (value.includes('ffffffff') || value === '0x' + 'f'.repeat(64)) {
                result.warnings.push('⚠️ Permiso con cantidad máxima detectado');
                result.details.unlimitedApproval = true;
            }
            
            // Verificar valores extremadamente altos
            try {
                const valueBigInt = BigInt(value);
                const threshold = BigInt('1000000000000000000000'); // 1000 tokens con 18 decimales
                
                if (valueBigInt > threshold) {
                    result.warnings.push(`Valor muy alto detectado: ${valueBigInt.toString()}`);
                }
            } catch (e) {
                // Ignorar si no es convertible a BigInt
            }
        }

        // Verificar campos críticos
        this.checkCriticalFields(message, result);
    }

    checkCriticalFields(message, result) {
        const criticalFields = ['owner', 'spender', 'to', 'approved', 'operator'];
        
        criticalFields.forEach(field => {
            if (message[field]) {
                const address = message[field];
                
                if (typeof address === 'string' && ethers.isAddress(address)) {
                    // Verificar direcciones burn o sospechosas
                    const suspiciousAddresses = [
                        '0x0000000000000000000000000000000000000000',
                        '0x000000000000000000000000000000000000dead',
                        '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
                    ];
                    
                    if (suspiciousAddresses.includes(address.toLowerCase())) {
                        result.warnings.push(`Campo ${field} apunta a dirección sospechosa: ${address}`);
                    }
                    
                    result.details[`${field}Address`] = address;
                }
            }
        });
    }

    checkCriticalValues(typedData, result) {
        const message = typedData.message;

        // Verificar deadline si existe
        if (message.deadline) {
            const deadline = Number(message.deadline);
            const now = Math.floor(Date.now() / 1000);
            const oneHour = 3600;
            
            if (deadline < now) {
                result.errors.push('Deadline ya expiró');
                result.safe = false;
            } else if (deadline > now + (24 * oneHour)) {
                result.warnings.push('Deadline muy lejano (>24h)');
            }
            
            result.details.deadline = new Date(deadline * 1000).toISOString();
        }

        // Verificar nonce si existe
        if (message.nonce !== undefined) {
            result.details.nonce = message.nonce;
        }
    }

    calculateRiskLevel(result) {
        let riskScore = 0;
        
        // Errores críticos
        riskScore += result.errors.length * 10;
        
        // Advertencias
        riskScore += result.warnings.length * 3;
        
        // Factores específicos
        if (result.details.unlimitedApproval) riskScore += 5;
        if (result.details.highRiskType) riskScore += 4;
        if (!result.details.contractTrusted) riskScore += 2;
        
        // Determinar nivel
        if (riskScore >= 15) {
            result.risk = 'critical';
            result.safe = false;
        } else if (riskScore >= 10) {
            result.risk = 'high';
        } else if (riskScore >= 5) {
            result.risk = 'medium';
        } else {
            result.risk = 'low';
        }
    }

    /**
     * Agrega un contrato a la lista de confianza
     */
    addTrustedContract(address) {
        if (ethers.isAddress(address)) {
            this.trustedContracts.add(address.toLowerCase());
            console.log(`✅ Contrato agregado a lista de confianza: ${address}`);
            return true;
        }
        return false;
    }

    /**
     * Remueve un contrato de la lista de confianza
     */
    removeTrustedContract(address) {
        return this.trustedContracts.delete(address.toLowerCase());
    }

    /**
     * Lista todos los contratos de confianza
     */
    getTrustedContracts() {
        return Array.from(this.trustedContracts);
    }

    /**
     * Genera un resumen legible para el usuario
     */
    generateUserSummary(inspectionResult) {
        const { safe, risk, warnings, errors, details } = inspectionResult;
        
        let summary = `🔒 Análisis de seguridad del mensaje:\n\n`;
        
        if (!safe) {
            summary += `❌ PELIGRO: Este mensaje NO es seguro para firmar\n`;
            summary += `🚨 Nivel de riesgo: ${risk.toUpperCase()}\n\n`;
        } else {
            summary += `✅ El mensaje parece seguro\n`;
            summary += `📊 Nivel de riesgo: ${risk}\n\n`;
        }

        if (errors.length > 0) {
            summary += `🚫 Errores críticos:\n`;
            errors.forEach(error => summary += `   • ${error}\n`);
            summary += `\n`;
        }

        if (warnings.length > 0) {
            summary += `⚠️ Advertencias:\n`;
            warnings.forEach(warning => summary += `   • ${warning}\n`);
            summary += `\n`;
        }

        summary += `📋 Detalles:\n`;
        summary += `   • Tipo: ${details.primaryType}\n`;
        if (details.verifyingContract) {
            summary += `   • Contrato: ${details.verifyingContract}\n`;
            summary += `   • Confiable: ${details.contractTrusted ? 'Sí' : 'No'}\n`;
        }
        if (details.chainId) {
            summary += `   • Red: ${this.getNetworkName(details.chainId)}\n`;
        }

        return summary;
    }

    getNetworkName(chainId) {
        const networks = {
            1: 'Ethereum',
            8453: 'Base',
            84532: 'Base Sepolia',
            137: 'Polygon'
        };
        return networks[Number(chainId)] || `Chain ${chainId}`;
    }
}

module.exports = { EIP712Inspector };
