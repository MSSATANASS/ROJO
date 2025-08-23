/**
 * 🔴 ROJO API Testing - Prueba rápida de todas las APIs
 */

const http = require('http');

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: body
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testAPIs() {
    console.log('🔴 TESTING ROJO APIs...\n');

    const baseOptions = {
        hostname: 'localhost',
        port: 3002,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        // Test Health Check
        console.log('1️⃣ Testing Health Check...');
        const health = await makeRequest({
            ...baseOptions,
            path: '/health',
            method: 'GET'
        });
        console.log(`   Status: ${health.status}, Service: ${health.data.service}\n`);

        // Test Policies List
        console.log('2️⃣ Testing Policies List...');
        const policies = await makeRequest({
            ...baseOptions,
            path: '/api/policies',
            method: 'GET'
        });
        console.log(`   Status: ${policies.status}, Policies: ${policies.data.policies?.length || 0}\n`);

        // Test Transaction Validation
        console.log('3️⃣ Testing Transaction Validation...');
        const validation = await makeRequest({
            ...baseOptions,
            path: '/api/wallet/validate-transaction',
            method: 'POST'
        }, {
            transaction: {
                to: "0x1234567890123456789012345678901234567890",
                value: "100000000000000000",
                chainId: 8453
            }
        });
        console.log(`   Status: ${validation.status}, Valid: ${validation.data.validation?.allowed}\n`);

        // Test EIP-712 Inspection
        console.log('4️⃣ Testing EIP-712 Inspection...');
        const eip712 = await makeRequest({
            ...baseOptions,
            path: '/api/eip712/inspect',
            method: 'POST'
        }, {
            typedData: {
                types: {
                    TestMessage: [{ name: 'test', type: 'string' }]
                },
                primaryType: 'TestMessage',
                domain: { name: 'ROJO' },
                message: { test: 'Hello World' }
            }
        });
        console.log(`   Status: ${eip712.status}, Safe: ${eip712.data.inspection?.safe}\n`);

        console.log('✅ ALL API TESTS COMPLETED!');

    } catch (error) {
        console.error('❌ API Test Error:', error.message);
        console.log('\n💡 Make sure the server is running: node backend/integration-server.js');
    }
}

testAPIs();
