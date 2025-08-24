#!/usr/bin/env node

/**
 * 🔴 ROJO CONTRACT COMPILER
 * Compile Solidity contracts for Railway deployment
 * Uses solc for compilation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class ContractCompiler {
  constructor() {
    this.contractsDir = './contracts';
    this.artifactsDir = './artifacts';
    this.compiledContracts = {};
  }

  async checkSolc() {
    try {
      const version = execSync('solc --version', { encoding: 'utf8' });
      console.log('✅ Solc found:', version.split('\n')[0]);
      return true;
    } catch (error) {
      console.log('❌ Solc not found. Installing...');
      return this.installSolc();
    }
  }

  async installSolc() {
    try {
      console.log('🔧 Installing solc...');
      
      // For Railway, we'll use npm solc
      execSync('npm install -g solc', { stdio: 'inherit' });
      
      console.log('✅ Solc installed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to install solc:', error.message);
      return false;
    }
  }

  async compileContract(contractPath) {
    const contractName = path.basename(contractPath, '.sol');
    console.log(`🔨 Compiling ${contractName}...`);
    
    try {
      // Read contract source
      const source = fs.readFileSync(contractPath, 'utf8');
      
      // Compile using solc
      const output = execSync(`solc --bin --abi --optimize ${contractPath}`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Parse output
      const artifacts = this.parseSolcOutput(output, contractName);
      
      if (artifacts) {
        this.compiledContracts[contractName] = artifacts;
        console.log(`✅ ${contractName} compiled successfully`);
        return artifacts;
      } else {
        throw new Error('Compilation failed - no artifacts generated');
      }
      
    } catch (error) {
      console.error(`❌ Failed to compile ${contractName}:`, error.message);
      return null;
    }
  }

  parseSolcOutput(output, contractName) {
    try {
      // Simple parsing of solc output
      // In production, you'd want more robust parsing
      const lines = output.split('\n');
      let abi = null;
      let bytecode = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('Contract JSON ABI')) {
          // Next line should contain ABI
          if (i + 1 < lines.length) {
            try {
              abi = JSON.parse(lines[i + 1]);
            } catch (e) {
              // Try to extract JSON from the line
              const jsonMatch = lines[i + 1].match(/\[.*\]/);
              if (jsonMatch) {
                abi = JSON.parse(jsonMatch[0]);
              }
            }
          }
        }
        
        if (line.includes('Binary:')) {
          // Next line should contain bytecode
          if (i + 1 < lines.length) {
            bytecode = lines[i + 1].trim();
          }
        }
      }
      
      if (abi && bytecode) {
        return {
          name: contractName,
          abi: abi,
          bytecode: bytecode,
          source: fs.readFileSync(`./contracts/${contractName}.sol`, 'utf8')
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing solc output:', error.message);
      return null;
    }
  }

  async saveArtifacts() {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
    
    for (const [name, contract] of Object.entries(this.compiledContracts)) {
      const artifactPath = path.join(this.artifactsDir, `${name}.json`);
      fs.writeFileSync(artifactPath, JSON.stringify(contract, null, 2));
      console.log(`💾 Saved artifact: ${artifactPath}`);
    }
  }

  async compileAll() {
    console.log('🚀 Starting contract compilation...\n');
    
    // Check/install solc
    const solcReady = await this.checkSolc();
    if (!solcReady) {
      throw new Error('Solc not available');
    }
    
    // Get all .sol files
    const contractFiles = fs.readdirSync(this.contractsDir)
      .filter(file => file.endsWith('.sol'))
      .map(file => path.join(this.contractsDir, file));
    
    console.log(`📁 Found ${contractFiles.length} contracts to compile\n`);
    
    // Compile each contract
    for (const contractFile of contractFiles) {
      await this.compileContract(contractFile);
    }
    
    // Save artifacts
    await this.saveArtifacts();
    
    console.log(`\n🎉 Compilation completed!`);
    console.log(`📊 Compiled ${Object.keys(this.compiledContracts).length} contracts`);
    
    return this.compiledContracts;
  }
}

// Main execution
async function main() {
  try {
    const compiler = new ContractCompiler();
    await compiler.compileAll();
  } catch (error) {
    console.error('💥 Compilation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ContractCompiler;
