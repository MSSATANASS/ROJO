// 🔴 ROJO Ecosystem Integration - Simple Testing
// @author ROJO Organization

console.log('🔴 ROJO Ecosystem Integration - Simple Testing');
console.log('=' .repeat(50));

// 🔴 Test 1: Check if server files exist
const fs = require('fs');
const path = require('path');

console.log('\n📁 Testing File Structure:');

const files = [
    'backend/integration-server.js',
    'frontend/dashboard.html',
    'frontend/dashboard.js',
    'package.json'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} - EXISTS`);
    } else {
        console.log(`❌ ${file} - MISSING`);
    }
});

// 🔴 Test 2: Check package.json
console.log('\n📦 Testing Package.json:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ Package name: ${packageJson.name}`);
    console.log(`✅ Version: ${packageJson.version}`);
    console.log(`✅ Dependencies: ${Object.keys(packageJson.dependencies).length} packages`);
} catch (error) {
    console.log(`❌ Error reading package.json: ${error.message}`);
}

// 🔴 Test 3: Check HTML content
console.log('\n🎨 Testing Dashboard HTML:');
try {
    const htmlContent = fs.readFileSync('frontend/dashboard.html', 'utf8');
    if (htmlContent.includes('ROJO Ecosystem')) {
        console.log('✅ Dashboard HTML contains "ROJO Ecosystem"');
    } else {
        console.log('❌ Dashboard HTML missing "ROJO Ecosystem"');
    }
    
    if (htmlContent.includes('dashboard.js')) {
        console.log('✅ Dashboard HTML references dashboard.js');
    } else {
        console.log('❌ Dashboard HTML missing dashboard.js reference');
    }
} catch (error) {
    console.log(`❌ Error reading dashboard.html: ${error.message}`);
}

// 🔴 Test 4: Check JavaScript content
console.log('\n⚡ Testing Dashboard JavaScript:');
try {
    const jsContent = fs.readFileSync('frontend/dashboard.js', 'utf8');
    if (jsContent.includes('RojoEcosystemDashboard')) {
        console.log('✅ Dashboard JS contains "RojoEcosystemDashboard" class');
    } else {
        console.log('❌ Dashboard JS missing "RojoEcosystemDashboard" class');
    }
    
    if (jsContent.includes('loadEcosystemData')) {
        console.log('✅ Dashboard JS contains "loadEcosystemData" method');
    } else {
        console.log('❌ Dashboard JS missing "loadEcosystemData" method');
    }
} catch (error) {
    console.log(`❌ Error reading dashboard.js: ${error.message}`);
}

// 🔴 Test 5: Check server code
console.log('\n🚀 Testing Integration Server:');
try {
    const serverContent = fs.readFileSync('backend/integration-server.js', 'utf8');
    if (serverContent.includes('express')) {
        console.log('✅ Server uses Express.js');
    } else {
        console.log('❌ Server missing Express.js');
    }
    
    if (serverContent.includes('/api/ecosystem/stats')) {
        console.log('✅ Server has ecosystem stats endpoint');
    } else {
        console.log('❌ Server missing ecosystem stats endpoint');
    }
} catch (error) {
    console.log(`❌ Error reading server.js: ${error.message}`);
}

console.log('\n' + '=' .repeat(50));
console.log('🔴 Simple Testing Complete!');
console.log('Next: Start server with "node backend/integration-server.js"');
console.log('Then: Open http://localhost:3002 in browser');
