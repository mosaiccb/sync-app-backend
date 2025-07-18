"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyVaultService = exports.KeyVaultService = void 0;
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
const identity_1 = require("@azure/identity");
const logger_1 = require("../utils/logger");
const cache_1 = require("../utils/cache");
class KeyVaultService {
    client;
    cachePrefix = 'kv:';
    cacheTTL = 300; // 5 minutes
    constructor() {
        const keyVaultName = process.env.AZURE_KEYVAULT_NAME;
        if (!keyVaultName) {
            throw new Error('AZURE_KEYVAULT_NAME environment variable is required');
        }
        const keyVaultUri = `https://${keyVaultName}.vault.azure.net/`;
        const credential = new identity_1.DefaultAzureCredential();
        this.client = new keyvault_secrets_1.SecretClient(keyVaultUri, credential);
        logger_1.logger.info('KeyVaultService initialized', { keyVaultUri });
    }
    /**
     * Store a tenant's credentials securely in Key Vault
     */
    async storeTenantCredentials(tenantId, credentials) {
        const correlationId = this.generateCorrelationId();
        try {
            logger_1.logger.info('Storing tenant credentials', { tenantId, correlationId });
            // Store credentials as separate secrets with tenant prefix
            const clientIdSecretName = `tenant-${tenantId}-client-id`;
            const clientSecretSecretName = `tenant-${tenantId}-client-secret`;
            await Promise.all([
                this.client.setSecret(clientIdSecretName, credentials.clientId),
                this.client.setSecret(clientSecretSecretName, credentials.clientSecret)
            ]);
            // Clear cache for this tenant
            this.clearTenantCache(tenantId);
            logger_1.logger.info('Tenant credentials stored successfully', { tenantId, correlationId });
        }
        catch (error) {
            logger_1.logger.error('Failed to store tenant credentials', {
                tenantId,
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to store credentials for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Retrieve a tenant's credentials from Key Vault
     */
    async getTenantCredentials(tenantId) {
        const correlationId = this.generateCorrelationId();
        const cacheKey = `tenant-credentials-${tenantId}`;
        try {
            // Check cache first
            const cached = cache_1.cache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Tenant credentials retrieved from cache', { tenantId, correlationId });
                return cached;
            }
            logger_1.logger.info('Retrieving tenant credentials from Key Vault', { tenantId, correlationId });
            const clientIdSecretName = `tenant-${tenantId}-client-id`;
            const clientSecretSecretName = `tenant-${tenantId}-client-secret`;
            const [clientIdSecret, clientSecretSecret] = await Promise.all([
                this.client.getSecret(clientIdSecretName),
                this.client.getSecret(clientSecretSecretName)
            ]);
            if (!clientIdSecret.value || !clientSecretSecret.value) {
                throw new Error(`Incomplete credentials found for tenant ${tenantId}`);
            }
            const credentials = {
                clientId: clientIdSecret.value,
                clientSecret: clientSecretSecret.value
            };
            // Cache the credentials
            cache_1.cache.set(cacheKey, credentials, this.cacheTTL);
            logger_1.logger.info('Tenant credentials retrieved successfully', { tenantId, correlationId });
            return credentials;
        }
        catch (error) {
            logger_1.logger.error('Failed to retrieve tenant credentials', {
                tenantId,
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to retrieve credentials for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete a tenant's credentials from Key Vault
     */
    async deleteTenantCredentials(tenantId) {
        const correlationId = this.generateCorrelationId();
        try {
            logger_1.logger.info('Deleting tenant credentials', { tenantId, correlationId });
            const clientIdSecretName = enant - $, { tenantId };
            -client - id;
            const clientSecretSecretName = enant - $, { tenantId };
            -client - secret;
            // Start deletion operations (they will be moved to deleted state)
            await Promise.all([
                this.client.beginDeleteSecret(clientIdSecretName),
                this.client.beginDeleteSecret(clientSecretSecretName)
            ]);
            // Clear cache for this tenant
            this.clearTenantCache(tenantId);
            logger_1.logger.info('Tenant credentials deleted successfully', { tenantId, correlationId });
        }
        catch (error) {
            logger_1.logger.error('Failed to delete tenant credentials', {
                tenantId,
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(Failed, to, delete credentials);
            for (tenant; $; { tenantId })
                : $;
            {
                error instanceof Error ? error.message : 'Unknown error';
            }
            ;
        }
    }
    /**
     * Update a tenant's credentials in Key Vault
     */
    async updateTenantCredentials(tenantId, credentials) {
        const correlationId = this.generateCorrelationId();
        try {
            logger_1.logger.info('Updating tenant credentials', { tenantId, correlationId });
            const updatePromises = [];
            if (credentials.clientId) {
                const clientIdSecretName = enant - $, { tenantId };
                -client - id;
                updatePromises.push(this.client.setSecret(clientIdSecretName, credentials.clientId));
            }
            if (credentials.clientSecret) {
                const clientSecretSecretName = enant - $, { tenantId };
                -client - secret;
                updatePromises.push(this.client.setSecret(clientSecretSecretName, credentials.clientSecret));
            }
            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                // Clear cache for this tenant
                this.clearTenantCache(tenantId);
            }
            logger_1.logger.info('Tenant credentials updated successfully', { tenantId, correlationId });
        }
        catch (error) {
            logger_1.logger.error('Failed to update tenant credentials', {
                tenantId,
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(Failed, to, update, credentials);
            for (tenant; $; { tenantId })
                : $;
            {
                error instanceof Error ? error.message : 'Unknown error';
            }
            ;
        }
    }
    /**
     * Check if tenant credentials exist in Key Vault
     */
    async tenantCredentialsExist(tenantId) {
        const correlationId = this.generateCorrelationId();
        try {
            logger_1.logger.debug('Checking if tenant credentials exist', { tenantId, correlationId });
            const clientIdSecretName = enant - $, { tenantId };
            -client - id;
            const clientSecretSecretName = enant - $, { tenantId };
            -client - secret;
            const [clientIdExists, clientSecretExists] = await Promise.all([
                this.secretExists(clientIdSecretName),
                this.secretExists(clientSecretSecretName)
            ]);
            const exists = clientIdExists && clientSecretExists;
            logger_1.logger.debug('Tenant credentials existence check completed', { tenantId, correlationId, exists });
            return exists;
        }
        catch (error) {
            logger_1.logger.error('Failed to check tenant credentials existence', {
                tenantId,
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    /**
     * List all tenant IDs that have credentials stored
     */
    async listTenantsWithCredentials() {
        const correlationId = this.generateCorrelationId();
        try {
            logger_1.logger.info('Listing tenants with credentials', { correlationId });
            const secretNames = [];
            for await (const secretProperties of this.client.listPropertiesOfSecrets()) {
                if (secretProperties.name.startsWith('tenant-') && secretProperties.name.endsWith('-client-id')) {
                    secretNames.push(secretProperties.name);
                }
            }
            // Extract tenant IDs from secret names
            const tenantIds = secretNames.map(name => {
                const match = name.match(/^tenant-(.+)-client-id$/);
                return match ? match[1] : null;
            }).filter(id => id !== null);
            logger_1.logger.info('Tenants with credentials listed', { correlationId, count: tenantIds.length });
            return tenantIds;
        }
        catch (error) {
            logger_1.logger.error('Failed to list tenants with credentials', {
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(Failed, to, list, tenants);
            with (credentials)
                : $;
            {
                error instanceof Error ? error.message : 'Unknown error';
            }
            ;
        }
    }
    /**
     * Clear cache for a specific tenant
     */
    clearTenantCache(tenantId) {
        const cacheKey = enant - credentials - $, { tenantId };
        cache_1.cache.del(cacheKey);
    }
    /**
     * Check if a secret exists in Key Vault
     */
    async secretExists(secretName) {
        try {
            await this.client.getSecret(secretName);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Generate a correlation ID for tracking requests
     */
    generateCorrelationId() {
        return kv - $;
        {
            Date.now();
        }
        -$;
        {
            Math.random().toString(36).substring(2, 15);
        }
        ;
    }
}
exports.KeyVaultService = KeyVaultService;
// Export singleton instance
exports.keyVaultService = new KeyVaultService();
//# sourceMappingURL=keyVault-old.js.map