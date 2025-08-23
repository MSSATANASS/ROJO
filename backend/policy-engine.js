/**
 * ROJO Policy Engine - Motor de políticas on-chain para validación de transacciones
 * Basado en esquemas CDP de Coinbase para EVM y Solana
 */

const { z } = require('zod');

// Esquemas de validación adaptados de CDP
const EthValueOperatorEnum = z.enum([">", ">=", "<", "<=", "=="]);
const EvmAddressOperatorEnum = z.enum(["in", "not in"]);
const EvmNetworkOperatorEnum = z.enum(["in", "not in"]);
const ActionEnum = z.enum(["reject", "accept"]);

// Redes soportadas por ROJO
const EvmNetworkEnum = z.enum(["base", "base-sepolia", "ethereum", "polygon"]);

// Criterio de valor ETH
const EthValueCriterionSchema = z.object({
    type: z.literal("ethValue"),
    ethValue: z.string().regex(/^[0-9]+$/),
    operator: EthValueOperatorEnum,
});

// Criterio de direcciones EVM
const EvmAddressCriterionSchema = z.object({
    type: z.literal("evmAddress"),
    addresses: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).max(300),
    operator: EvmAddressOperatorEnum,
});

// Criterio de red
const EvmNetworkCriterionSchema = z.object({
    type: z.literal("evmNetwork"),
    networks: z.array(EvmNetworkEnum),
    operator: EvmNetworkOperatorEnum,
});

// Criterio de cambio neto en USD
const NetUSDChangeCriterionSchema = z.object({
    type: z.literal("netUSDChange"),
    changeCents: z.number().int().nonnegative(),
    operator: EthValueOperatorEnum,
});

// Criterio de datos EVM (funciones específicas)
const EvmDataCriterionSchema = z.object({
    type: z.literal("evmData"),
    abi: z.union([z.enum(["erc20", "erc721", "erc1155"]), z.array(z.any())]),
    conditions: z.array(z.object({
        function: z.string().min(1),
        params: z.array(z.object({
            name: z.union([z.string().min(1), z.string().regex(/^\d+$/)]),
            operator: z.enum(["in", "not in", ">", ">=", "<", "<=", "=="]),
            values: z.array(z.string()).optional(),
            value: z.string().optional(),
        })).optional(),
    })).min(1),
});

// Esquema de criterios para transacciones EVM
const SendEvmTransactionCriteriaSchema = z.array(
    z.discriminatedUnion("type", [
        EthValueCriterionSchema,
        EvmAddressCriterionSchema,
        EvmNetworkCriterionSchema,
        EvmDataCriterionSchema,
        NetUSDChangeCriterionSchema,
    ])
).max(10).min(1);

// Regla completa para transacciones EVM
const SendEvmTransactionRuleSchema = z.object({
    action: ActionEnum,
    operation: z.literal("sendEvmTransaction"),
    criteria: SendEvmTransactionCriteriaSchema,
});

// Política completa
const PolicySchema = z.object({
    scope: z.enum(["project", "account"]),
    description: z.string().regex(/^[A-Za-z0-9 ,.]{1,50}$/).optional(),
    rules: z.array(SendEvmTransactionRuleSchema).max(10).min(1),
});

class RojoPolicyEngine {
    constructor() {
        this.policies = new Map();
        this.loadDefaultPolicies();
    }

    loadDefaultPolicies() {
        // Política de seguridad básica para ROJO
        const defaultPolicy = {
            scope: "project",
            description: "Politica de seguridad base ROJO",
            rules: [
                {
                    action: "accept",
                    operation: "sendEvmTransaction", 
                    criteria: [
                        {
                            type: "evmNetwork",
                            networks: ["base", "base-sepolia"],
                            operator: "in"
                        },
                        {
                            type: "netUSDChange",
                            changeCents: 100000, // $1000 máximo
                            operator: "<="
                        }
                    ]
                },
                {
                    action: "reject",
                    operation: "sendEvmTransaction",
                    criteria: [
                        {
                            type: "ethValue", 
                            ethValue: "1000000000000000000", // 1 ETH en wei
                            operator: ">"
                        }
                    ]
                }
            ]
        };
        
        this.policies.set("default", defaultPolicy);
    }

    addPolicy(policyId, policy) {
        try {
            const validated = PolicySchema.parse(policy);
            this.policies.set(policyId, validated);
            return { success: true, policy: validated };
        } catch (error) {
            return { success: false, error: error.errors };
        }
    }

    evaluateTransaction(policyId, transaction) {
        const policy = this.policies.get(policyId || "default");
        if (!policy) {
            return { allowed: false, reason: "Política no encontrada" };
        }

        console.log(`🔍 Evaluando transacción con política: ${policyId || "default"}`);
        
        for (const rule of policy.rules) {
            const ruleResult = this.evaluateRule(rule, transaction);
            
            if (ruleResult.matches) {
                console.log(`📋 Regla aplicada: ${rule.action} - ${ruleResult.reason}`);
                return {
                    allowed: rule.action === "accept",
                    reason: ruleResult.reason,
                    rule: rule
                };
            }
        }

        // Si no coincide ninguna regla, denegar por defecto
        return { 
            allowed: false, 
            reason: "No coincide con ninguna regla de la política" 
        };
    }

    evaluateRule(rule, transaction) {
        const criteriaResults = rule.criteria.map(criterion => 
            this.evaluateCriterion(criterion, transaction)
        );

        // Todas las criterias deben cumplirse para que la regla aplique
        const allMatch = criteriaResults.every(result => result.matches);
        
        return {
            matches: allMatch,
            reason: allMatch 
                ? `Todas las criterias cumplidas`
                : `Falló: ${criteriaResults.filter(r => !r.matches).map(r => r.reason).join(", ")}`
        };
    }

    evaluateCriterion(criterion, transaction) {
        switch (criterion.type) {
            case "evmNetwork":
                return this.evaluateNetworkCriterion(criterion, transaction);
            case "ethValue":
                return this.evaluateEthValueCriterion(criterion, transaction);
            case "evmAddress":
                return this.evaluateAddressCriterion(criterion, transaction);
            case "netUSDChange":
                return this.evaluateUSDChangeCriterion(criterion, transaction);
            case "evmData":
                return this.evaluateDataCriterion(criterion, transaction);
            default:
                return { matches: false, reason: `Tipo de criterio desconocido: ${criterion.type}` };
        }
    }

    evaluateNetworkCriterion(criterion, transaction) {
        const network = transaction.chainId ? this.chainIdToNetwork(transaction.chainId) : null;
        if (!network) {
            return { matches: false, reason: "Red no identificada" };
        }

        const isInList = criterion.networks.includes(network);
        const matches = criterion.operator === "in" ? isInList : !isInList;
        
        return {
            matches,
            reason: `Red ${network} ${matches ? "permitida" : "bloqueada"}`
        };
    }

    evaluateEthValueCriterion(criterion, transaction) {
        const txValue = BigInt(transaction.value || "0");
        const criterionValue = BigInt(criterion.ethValue);
        
        let matches = false;
        switch (criterion.operator) {
            case ">": matches = txValue > criterionValue; break;
            case ">=": matches = txValue >= criterionValue; break;
            case "<": matches = txValue < criterionValue; break;
            case "<=": matches = txValue <= criterionValue; break;
            case "==": matches = txValue === criterionValue; break;
        }

        return {
            matches,
            reason: `Valor ${txValue.toString()} ${criterion.operator} ${criterionValue.toString()}`
        };
    }

    evaluateAddressCriterion(criterion, transaction) {
        const address = transaction.to?.toLowerCase();
        if (!address) {
            return { matches: false, reason: "Dirección destino no especificada" };
        }

        const isInList = criterion.addresses.some(addr => addr.toLowerCase() === address);
        const matches = criterion.operator === "in" ? isInList : !isInList;

        return {
            matches,
            reason: `Dirección ${address} ${matches ? "autorizada" : "no autorizada"}`
        };
    }

    evaluateUSDChangeCriterion(criterion, transaction) {
        // Simplificado: estimar USD basado en valor ETH
        const ethValue = BigInt(transaction.value || "0");
        const estimatedUSDCents = Number(ethValue / BigInt("1000000000000000")) * 250; // ~$2500/ETH aprox
        
        let matches = false;
        switch (criterion.operator) {
            case ">": matches = estimatedUSDCents > criterion.changeCents; break;
            case ">=": matches = estimatedUSDCents >= criterion.changeCents; break;
            case "<": matches = estimatedUSDCents < criterion.changeCents; break;
            case "<=": matches = estimatedUSDCents <= criterion.changeCents; break;
            case "==": matches = estimatedUSDCents === criterion.changeCents; break;
        }

        return {
            matches,
            reason: `Estimado $${(estimatedUSDCents/100).toFixed(2)} ${criterion.operator} $${(criterion.changeCents/100).toFixed(2)}`
        };
    }

    evaluateDataCriterion(criterion, transaction) {
        // Simplificado: verificar que la función llamada esté permitida
        if (!transaction.data || transaction.data === "0x") {
            return { matches: false, reason: "Sin datos de función" };
        }

        const functionSelector = transaction.data.slice(0, 10);
        const allowedFunctions = criterion.conditions.map(cond => cond.function);
        
        // Para este ejemplo, aceptamos si hay condiciones definidas
        const matches = allowedFunctions.length > 0;
        
        return {
            matches,
            reason: `Función ${functionSelector} ${matches ? "evaluada" : "no permitida"}`
        };
    }

    chainIdToNetwork(chainId) {
        const networks = {
            1: "ethereum",
            8453: "base",
            84532: "base-sepolia", 
            137: "polygon"
        };
        return networks[parseInt(chainId)] || null;
    }

    // Métodos de utilidad
    listPolicies() {
        return Array.from(this.policies.entries()).map(([id, policy]) => ({
            id,
            scope: policy.scope,
            description: policy.description,
            rulesCount: policy.rules.length
        }));
    }

    getPolicy(policyId) {
        return this.policies.get(policyId);
    }

    removePolicy(policyId) {
        if (policyId === "default") {
            return { success: false, error: "No se puede eliminar la política por defecto" };
        }
        
        const deleted = this.policies.delete(policyId);
        return { success: deleted };
    }
}

module.exports = { RojoPolicyEngine, PolicySchema };
