// 🚀 Node.js Deployment Script
// Automated deployment for Azure Functions backend
//
// Author: GitHub Copilot AI Assistant
// Created: July 2025
// Purpose: Automated deployment bypassing VS Code Git requirements
//
// 🔧 Hardcoded Configuration:
//   • Function App: ukg-sync-backend-5rrqlcuxyzlvy
//   • Resource Group: mosaicRG01
//   • Subscription: 3a09f19f-d0c3-4a11-ac2c-6d869a76ec94

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

class AzureFunctionDeployment {
    constructor(options = {}) {
        this.functionAppName = options.functionAppName || 'ukg-sync-backend-5rrqlcuxyzlvy';
        this.resourceGroup = options.resourceGroup || 'mosaicRG01';
        this.subscriptionId = options.subscriptionId || '3a09f19f-d0c3-4a11-ac2c-6d869a76ec94';
        this.skipBuild = options.skipBuild || false;
        this.verbose = options.verbose || false;
    }

    log(message, color = 'white') {
        const colors = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            reset: '\x1b[0m'
        };
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    async runCommand(command, description) {
        return new Promise((resolve, reject) => {
            if (this.verbose) {
                this.log(`Running: ${command}`, 'cyan');
            }
            this.log(description, 'yellow');
            
            const process = exec(command, (error, stdout, stderr) => {
                if (error) {
                    this.log(`❌ ${description} failed: ${error.message}`, 'red');
                    reject(error);
                } else {
                    if (stdout && this.verbose) {
                        console.log(stdout);
                    }
                    if (stderr && this.verbose) {
                        console.error(stderr);
                    }
                    this.log(`✅ ${description} completed`, 'green');
                    resolve(stdout);
                }
            });

            // Show real-time output for long-running commands
            process.stdout.on('data', (data) => {
                if (this.verbose) {
                    process.stdout.write(data);
                }
            });
        });
    }

    async checkPrerequisites() {
        this.log('📋 Checking prerequisites...', 'cyan');

        try {
            // Check Azure CLI
            await this.runCommand('az account show', 'Checking Azure CLI authentication');
            
            // Check Azure Functions Core Tools
            await this.runCommand('func --version', 'Checking Azure Functions Core Tools');
            
            // Check project files
            if (!fs.existsSync('host.json')) {
                throw new Error('host.json not found. Make sure you are in the sync-app-backend directory');
            }
            
            if (!fs.existsSync('package.json')) {
                throw new Error('package.json not found. Make sure you are in the sync-app-backend directory');
            }
            
            this.log('✅ Prerequisites check passed', 'green');
        } catch (error) {
            this.log(`❌ Prerequisites check failed: ${error.message}`, 'red');
            throw error;
        }
    }

    async buildProject() {
        if (this.skipBuild) {
            this.log('⏭️  Skipping build (skipBuild option enabled)', 'yellow');
            return;
        }

        this.log('🔨 Building project...', 'cyan');
        
        try {
            await this.runCommand('npm install', 'Installing dependencies');
            await this.runCommand('npm run build', 'Building TypeScript');
            this.log('✅ Build completed successfully', 'green');
        } catch (error) {
            this.log('❌ Build failed', 'red');
            throw error;
        }
    }

    async deployWithFuncTools() {
        this.log('🚀 Attempting deployment with Azure Functions Core Tools...', 'cyan');
        
        try {
            const command = `func azure functionapp publish ${this.functionAppName}${this.verbose ? ' --verbose' : ''}`;
            await this.runCommand(command, 'Publishing to Azure Functions');
            return true;
        } catch (error) {
            this.log('⚠️  func publish failed, trying ZIP deployment method...', 'yellow');
            return false;
        }
    }

    async createZipPackage() {
        return new Promise((resolve, reject) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const zipFileName = `deployment-${timestamp}.zip`;
            
            this.log(`Creating deployment package: ${zipFileName}`, 'yellow');
            
            const output = fs.createWriteStream(zipFileName);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            output.on('close', () => {
                this.log(`✅ Created ${zipFileName} (${archive.pointer()} bytes)`, 'green');
                resolve(zipFileName);
            });
            
            archive.on('error', (err) => {
                this.log(`❌ Error creating ZIP: ${err.message}`, 'red');
                reject(err);
            });
            
            archive.pipe(output);
            
            // Add files, excluding certain directories
            const excludePatterns = ['node_modules', '.git', '*.zip', 'deployment*.zip', '.vscode', '*.log'];
            
            archive.glob('**/*', {
                ignore: excludePatterns,
                dot: true
            });
            
            archive.finalize();
        });
    }

    async deployWithZip() {
        this.log('📦 Attempting ZIP deployment...', 'cyan');
        
        try {
            const zipFileName = await this.createZipPackage();
            
            const command = `az functionapp deployment source config-zip --resource-group ${this.resourceGroup} --name ${this.functionAppName} --src ${zipFileName}`;
            await this.runCommand(command, 'Uploading to Azure');
            
            // Cleanup
            fs.unlinkSync(zipFileName);
            this.log(`🗑️  Cleaned up ${zipFileName}`, 'yellow');
            
            return true;
        } catch (error) {
            this.log('❌ ZIP deployment failed', 'red');
            throw error;
        }
    }

    async testDeployment() {
        this.log('🧪 Testing deployment...', 'cyan');
        
        // Wait a bit for deployment to settle
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const healthUrl = `https://${this.functionAppName}.azurewebsites.net/api/health`;
        
        try {
            const command = process.platform === 'win32' 
                ? `curl "${healthUrl}"` 
                : `curl -f -s "${healthUrl}"`;
                
            await this.runCommand(command, 'Testing health endpoint');
            this.log('✅ Health check passed', 'green');
        } catch (error) {
            this.log('⚠️  Health check failed, but deployment may still be successful', 'yellow');
            this.log(`URL: ${healthUrl}`, 'yellow');
        }
    }

    async deploy() {
        try {
            this.log('🚀 Starting Azure Functions Deployment', 'green');
            this.log(`Function App: ${this.functionAppName}`, 'yellow');
            this.log(`Resource Group: ${this.resourceGroup}`, 'yellow');
            this.log(`Subscription: ${this.subscriptionId}`, 'yellow');
            
            await this.checkPrerequisites();
            await this.buildProject();
            
            // Try func publish first, then ZIP deployment as fallback
            const funcSuccess = await this.deployWithFuncTools();
            
            if (!funcSuccess) {
                await this.deployWithZip();
            }
            
            await this.testDeployment();
            
            this.log('🎉 Deployment completed successfully!', 'green');
            this.log(`🌐 Function App URL: https://${this.functionAppName}.azurewebsites.net`, 'cyan');
            this.log(`🔍 Admin Functions: https://${this.functionAppName}.azurewebsites.net/admin/functions`, 'cyan');
            
        } catch (error) {
            this.log('❌ Deployment failed', 'red');
            console.error(error);
            process.exit(1);
        }
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    functionAppName: process.env.AZURE_FUNCTION_APP_NAME || 'ukg-sync-backend-5rrqlcuxyzlvy',
    resourceGroup: process.env.AZURE_RESOURCE_GROUP || 'mosaicRG01',
    skipBuild: args.includes('--skip-build'),
    verbose: args.includes('--verbose') || args.includes('-v')
};

// Run deployment
const deployment = new AzureFunctionDeployment(options);
deployment.deploy();

module.exports = { AzureFunctionDeployment };
