export declare class KeyVaultService {
    private client;
    private readonly cachePrefix;
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
     * Check if tenant credentials exist in Key Vault
     */
    tenantCredentialsExist(tenantId: string): Promise<boolean>;
    /**
     * List all tenant IDs that have credentials stored
     */
    listTenantsWithCredentials(): Promise<string[]>;
    /**
     * Clear cache for a specific tenant
     */
    private clearTenantCache;
    /**
     * Check if a secret exists in Key Vault
     */
    private secretExists;
    /**
     * Generate a correlation ID for tracking requests
     */
    private generateCorrelationId;
}
export declare const keyVaultService: KeyVaultService;
//# sourceMappingURL=keyVault-old.d.ts.map