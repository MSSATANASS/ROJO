/**
 * 🔴 ROJO Quick Start - Inicializador robusto del servidor
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🔴 Iniciando ROJO Enhanced Server...\n');

// Función para verificar si el puerto está libre
function checkPort(port) {
    return new Promise((resolve) => {
        const server = http.createServer();
        server.listen(port, () => {
            server.once('close', () => resolve(true));
            server.close();
        });
        server.on('error', () => resolve(false));
    });
}

// Función para hacer health check
function healthCheck() {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3002,
            path: '/health',
            method: 'GET'
        }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.end();
    });
}

async function startServer() {
    try {
        console.log('🔍 Verificando puerto 3002...');
        
        // Verificar si ya hay algo corriendo
        const isHealthy = await healthCheck();
        if (isHealthy) {
            console.log('✅ Servidor ROJO ya está corriendo!');
            console.log('\n🔴 URLs disponibles:');
            console.log('   📱 Wallet: http://localhost:3002/frontend/wallet.html');
            console.log('   📊 Dashboard: http://localhost:3002/frontend/dashboard.html');
            console.log('   🔧 Health: http://localhost:3002/health');
            console.log('   🛡️ APIs: http://localhost:3002/api/policies');
            return;
        }

        const portFree = await checkPort(3002);
        if (!portFree) {
            console.log('⚠️ Puerto 3002 ocupado. Cerrando proceso...');
            // En Windows, usar taskkill
            if (process.platform === 'win32') {
                spawn('taskkill', ['/f', '/im', 'node.exe'], { stdio: 'inherit' });
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log('🚀 Iniciando servidor ROJO...');
        
        const server = spawn('node', ['backend/integration-server.js'], {
            stdio: 'inherit',
            cwd: __dirname
        });

        // Esperar a que el servidor esté listo
        console.log('⏳ Esperando que el servidor se inicialice...');
        
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const healthy = await healthCheck();
            
            if (healthy) {
                console.log('\n✅ ¡ROJO Enhanced Server iniciado exitosamente!\n');
                console.log('🔴 FUNCIONALIDADES DISPONIBLES:');
                console.log('   🛡️ Policy Engine - Validación de transacciones');
                console.log('   🔍 EIP-712 Inspector - Protección contra phishing');
                console.log('   🍪 Consent Manager - Compliance GDPR/CCPA');
                console.log('   📜 Script Loader - Carga inteligente de scripts');
                console.log('\n🌐 URLs para acceder:');
                console.log('   📱 Wallet Enhanced: http://localhost:3002/frontend/wallet.html');
                console.log('   📊 Dashboard: http://localhost:3002/frontend/dashboard.html');
                console.log('   🔧 Health Check: http://localhost:3002/health');
                console.log('   🛡️ Policy APIs: http://localhost:3002/api/policies');
                console.log('   🔍 EIP-712 APIs: http://localhost:3002/api/eip712/inspect');
                console.log('\n💡 Testing en consola del navegador:');
                console.log('   rojoDevUtils.testPolicyEngine()');
                console.log('   rojoDevUtils.getConsentStatus()');
                console.log('\n🔥 ¡ROJO listo para impresionar!');
                break;
            }
            
            attempts++;
            console.log(`   Intento ${attempts}/${maxAttempts}...`);
        }

        if (attempts >= maxAttempts) {
            console.log('❌ Error: El servidor no respondió después de 10 intentos');
            console.log('💡 Intenta ejecutar manualmente: node backend/integration-server.js');
        }

        // Manejar cierre graceful
        process.on('SIGINT', () => {
            console.log('\n🔴 Cerrando ROJO Enhanced Server...');
            server.kill();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Error iniciando ROJO:', error.message);
        console.log('💡 Intenta ejecutar manualmente: node backend/integration-server.js');
    }
}

startServer();
