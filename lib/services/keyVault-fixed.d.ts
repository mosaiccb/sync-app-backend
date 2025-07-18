export declare class KeyVaultService {
    private client;
    private readonly cacheTTL;
    constructor();
    /**
     * Store a tenant's credentials securely in Key Vault
     */
    storeTenantCredentials(tenantId: string, credentials: {
        clientId: string;
        clientSecret: string;
    }): Promise<void>;
    /**
     * Retrieve a tenant's credentials from Key Vault
     */
    getTenantCredentials(tenantId: string): Promise<{
        clientId: string;
        clientSecret: string;
    }>;
    /**
     * Delete a tenant's credentials from Key Vault
     */
    deleteTenantCredentials(tenantId: string): Promise<void>;
    /**
     * Update a tenant's credentials in Key Vault
     */
    updateTenantCredentials(tenantId: string, credentials: {
        clientId?: string;
        clientSecret?: string;
    }): Promise<void>;
    /**
     * Check if a tenant has credentials stored in Key Vault
     */
    hasTenantCredentials(tenantId: string): Promise<boolean>;
    /**
     * List all tenants that have credentials stored in Key Vault
     */
    listTenantsWithCredentials(): Promise<string[]>;
    /**
     * Clear cache for a specific tenant
     */
    private clearTenantCache;
    /**
     * Generate a correlation ID for logging
     */
    private generateCorrelationId;
    /**
     * Clear all tenant-related cache entries
     */
    clearAllTenantCache(): void;
    /**
     * Get health status of the Key Vault service
     */
    getHealthStatus(): Promise<{
        status: 'healthy' | 'unhealthy';
        message?: string;
    }>;
}
//# sourceMappingURL=keyVault-fixed.d.ts.map