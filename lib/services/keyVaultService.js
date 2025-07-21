"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyVaultService = void 0;
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
const identity_1 = require("@azure/identity");
class KeyVaultService {
    client;
    keyVaultUrl;
    constructor() {
        this.keyVaultUrl = process.env.AZURE_KEY_VAULT_URL || '';
        if (!this.keyVaultUrl) {
            throw new Error('AZURE_KEY_VAULT_URL environment variable is required');
        }
        // Use Managed Identity for authentication in Azure
        const credential = new identity_1.DefaultAzureCredential();
        this.client = new keyvault_secrets_1.SecretClient(this.keyVaultUrl, credential);
    }
    /**
     * Store a secret in Key Vault
     */
    async setSecret(name, value, contentType) {
        try {
            await this.client.setSecret(name, value, {
                contentType: contentType || 'application/json'
            });
        }
        catch (error) {
            throw new Error(`Failed to store secret in Key Vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Retrieve a secret from Key Vault
     */
    async getSecret(name) {
        try {
            const secret = await this.client.getSecret(name);
            return secret.value || null;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return null; // Secret not found
            }
            throw new Error(`Failed to retrieve secret from Key Vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete a secret from Key Vault
     */
    async deleteSecret(name) {
        try {
            await this.client.beginDeleteSecret(name);
            return true;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return false; // Secret not found
            }
            throw new Error(`Failed to delete secret from Key Vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Store third-party API credentials securely
     */
    async storeThirdPartyAPICredentials(secretName, credentials) {
        const credentialsJson = JSON.stringify(credentials);
        await this.setSecret(secretName, credentialsJson, 'third-party-api-credentials');
    }
    /**
     * Retrieve third-party API credentials
     */
    async getThirdPartyAPICredentials(secretName) {
        const credentialsJson = await this.getSecret(secretName);
        if (!credentialsJson) {
            return null;
        }
        try {
            return JSON.parse(credentialsJson);
        }
        catch (error) {
            throw new Error(`Failed to parse third-party API credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate a unique secret name for third-party API
     */
    static generateSecretName(tenantId, provider, timestamp) {
        const ts = timestamp || Date.now();
        const sanitizedProvider = provider.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `third-party-api-${tenantId}-${sanitizedProvider}-${ts}`;
    }
}
exports.KeyVaultService = KeyVaultService;
//# sourceMappingURL=keyVaultService.js.map