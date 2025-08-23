/**
 * 🔴 ROJO Logger - Sistema de logging para el ecosistema ROJO
 * @author VERGASEC PRO
 */

const pino = require('pino');

// Configuración del logger
const logger = pino({
    name: 'rojo-ecosystem',
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        }
    },
    transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname'
        }
    } : undefined
});

// Función helper para logs estructurados
function createLogMeta(component, action, data = {}) {
    return {
        component,
        action,
        timestamp: new Date().toISOString(),
        ...data
    };
}

// Exportar el logger y helpers
module.exports = {
    ...logger,
    createLogMeta,
    
    // Métodos de conveniencia
    rojoInfo: (component, action, message, data = {}) => {
        logger.info(createLogMeta(component, action, data), `🔴 ROJO: ${message}`);
    },
    
    rojoError: (component, action, message, error = null, data = {}) => {
        logger.error(createLogMeta(component, action, { error: error?.message, ...data }), `🔴 ROJO ERROR: ${message}`);
    },
    
    rojoWarn: (component, action, message, data = {}) => {
        logger.warn(createLogMeta(component, action, data), `🔴 ROJO WARNING: ${message}`);
    },
    
    rojoDebug: (component, action, message, data = {}) => {
        logger.debug(createLogMeta(component, action, data), `🔴 ROJO DEBUG: ${message}`);
    }
};
