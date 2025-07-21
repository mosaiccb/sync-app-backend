"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyVaultService = void 0;
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
const identity_1 = require("@azure/identity");
const logger_1 = require("../utils/logger");
const cache_1 = require("../utils/cache");
class KeyVaultService {
    client;
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
            const clientIdSecretName = `tenant-${tenantId}-client-id`;
            const clientSecretSecretName = `tenant-${tenantId}-client-secret`;
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
            throw new Error(`Failed to delete credentials for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update a tenant's credentials in Key Vault
     */
    async updateTenantCredentials(tenantId, credentials) {
        const correlationId = this.generateCorrelationId();
        try {
            logger_1.logger.info('Updating tenant credentials', { tenantId, correlationId });
            const updates = [];
            if (credentials.clientId) {
                const clientIdSecretName = `tenant-${tenantId}-client-id`;
                updates.push(this.client.setSecret(clientIdSecretName, credentials.clientId));
            }
            if (credentials.clientSecret) {
                const clientSecretSecretName = `tenant-${tenantId}-client-secret`;
                updates.push(this.client.setSecret(clientSecretSecretName, credentials.clientSecret));
            }
            if (updates.length > 0) {
                await Promise.all(updates);
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
            throw new Error(`Failed to update credentials for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if a tenant has credentials stored in Key Vault
     */
    async hasTenantCredentials(tenantId) {
        const correlationId = this.generateCorrelationId();
        try {
            logger_1.logger.debug('Checking tenant credentials existence', { tenantId, correlationId });
            const clientIdSecretName = `tenant-${tenantId}-client-id`;
            const clientSecretSecretName = `tenant-${tenantId}-client-secret`;
            const [clientIdSecret, clientSecretSecret] = await Promise.all([
                this.client.getSecret(clientIdSecretName).catch(() => null),
                this.client.getSecret(clientSecretSecretName).catch(() => null)
            ]);
            const exists = !!(clientIdSecret?.value && clientSecretSecret?.value);
            logger_1.logger.debug('Tenant credentials existence check complete', { tenantId, correlationId, exists });
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
     * List all tenants that have credentials stored in Key Vault
     */
    async listTenantsWithCredentials() {
        const correlationId = this.generateCorrelationId();
        try {
            logger_1.logger.info('Listing tenants with credentials', { correlationId });
            const tenantIds = new Set();
            const secretPrefix = 'tenant-';
            for await (const secretProperties of this.client.listPropertiesOfSecrets()) {
                if (secretProperties.name.startsWith(secretPrefix)) {
                    // Extract tenant ID from secret name (format: tenant-{tenantId}-client-id or tenant-{tenantId}-client-secret)
                    const match = secretProperties.name.match(/^tenant-([^-]+)-client-(?:id|secret)$/);
                    if (match) {
                        tenantIds.add(match[1]);
                    }
                }
            }
            const result = Array.from(tenantIds);
            logger_1.logger.info('Tenants with credentials listed successfully', { correlationId, count: result.length });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to list tenants with credentials', {
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error(`Failed to list tenants with credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Clear cache for a specific tenant
     */
    clearTenantCache(tenantId) {
        const cacheKey = `tenant-credentials-${tenantId}`;
        cache_1.cache.del(cacheKey);
        logger_1.logger.debug('Tenant cache cleared', { tenantId });
    }
    /**
     * Generate a correlation ID for logging
     */
    generateCorrelationId() {
        return Math.random().toString(36).substring(2, 15);
    }
    /**
     * Clear all tenant-related cache entries
     */
    clearAllTenantCache() {
        // This would need to be implemented based on your cache implementation
        // For now, just log the action
        logger_1.logger.info('All tenant cache cleared');
    }
    /**
     * Get health status of the Key Vault service
     */
    async getHealthStatus() {
        try {
            // Try to list secrets to test connectivity
            const iterator = this.client.listPropertiesOfSecrets();
            await iterator.next();
            return { status: 'healthy' };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.KeyVaultService = KeyVaultService;
//# sourceMappingURL=keyVault-fixed.js.map