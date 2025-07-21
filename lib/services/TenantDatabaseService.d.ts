export interface TenantConfig {
    id: string;
    tenantName: string;
    companyId: string;
    baseUrl: string;
    clientId: string;
    description?: string;
    isActive: boolean;
    createdDate: Date;
    modifiedDate?: Date;
    tokenEndpoint?: string;
    apiVersion?: string;
    scope?: string;
}
export interface CreateTenantRequest {
    tenantName: string;
    companyId: string;
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    description?: string;
}
export interface UpdateTenantRequest {
    id: string;
    tenantName: string;
    companyId: string;
    baseUrl: string;
    clientId: string;
    clientSecret?: string;
    description?: string;
}
export interface ThirdPartyAPI {
    Id: string;
    Name: string;
    Description?: string;
    Category?: string;
    Provider: string;
    BaseUrl: string;
    Version?: string;
    AuthType: string;
    KeyVaultSecretName: string;
    ConfigurationJson?: string;
    IsActive: boolean;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string;
    UpdatedBy?: string;
}
export declare class TenantDatabaseService {
    private keyVaultClient;
    private credential;
    private pool;
    constructor();
    /**
     * Parse SQL connection string to mssql config
     * @param connectionString Connection string to parse
     * @returns Parsed connection configuration for mssql
     */
    private parseConnectionStringToConfig;
    /**
     * Get database connection pool with fallback authentication
     * @returns Promise<sql.ConnectionPool>
     */
    private getConnectionPool;
    /**
     * Create connection with managed identity fallback to SQL auth
     * @returns Promise<sql.ConnectionPool>
     */
    private createConnectionWithFallback;
    /**
     * Execute a SQL query using mssql
     * @param query SQL query string
     * @param parameters Query parameters
     * @returns Promise<any[]>
     */
    private executeQuery;
    /**
     * Get all active tenants with UKG configuration
     * @returns Promise<TenantConfig[]>
     */
    getAllTenants(): Promise<TenantConfig[]>;
    /**
     * Get tenant by ID
     * @param tenantId Tenant ID
     * @returns Promise<TenantConfig | null>
     */
    getTenantById(tenantId: string): Promise<TenantConfig | null>;
    /**
     * Create a new tenant
     * @param tenantData Tenant configuration data
     * @returns Promise<string> New tenant ID
     */
    createTenant(tenantData: CreateTenantRequest): Promise<string>;
    /**
     * Update an existing tenant
     * @param tenantData Updated tenant data
     * @returns Promise<boolean>
     */
    updateTenant(tenantData: UpdateTenantRequest): Promise<boolean>;
    /**
     * Delete a tenant (soft delete)
     * @param tenantId Tenant ID to delete
     * @returns Promise<boolean>
     */
    deleteTenant(tenantId: string): Promise<boolean>;
    /**
     * Get client secret from Key Vault
     * @param tenantId Tenant ID
     * @returns Promise<string | null>
     */
    getClientSecret(tenantId: string): Promise<string | null>;
    /**
     * Store client secret in Key Vault
     * @param tenantId Tenant ID
     * @param clientSecret Client secret value
     * @returns Promise<void>
     */
    private storeClientSecret;
    /**
     * Audit tenant changes
     * @param tenantId Tenant ID
     * @param action Action performed
     * @param oldValues Old values
     * @param newValues New values
     * @param changedBy User who made the change
     * @returns Promise<void>
     */
    private auditTenantChange;
    /**
     * Generate a new GUID
     * @returns string
     */
    private generateGuid;
    /**
     * Test database connection for ThirdPartyAPI operations
     */
    testThirdPartyAPIConnection(): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
    /**
     * Create a new ThirdPartyAPI
     */
    createThirdPartyAPI(apiData: {
        Name: string;
        Description?: string;
        Category?: string;
        Provider: string;
        BaseUrl: string;
        Version?: string;
        AuthType: string;
        KeyVaultSecretName: string;
        ConfigurationJson?: string;
        CreatedBy?: string;
    }): Promise<string>;
    /**
     * Get all ThirdPartyAPIs
     */
    getAllThirdPartyAPIs(): Promise<ThirdPartyAPI[]>;
    /**
     * Get ThirdPartyAPI by ID
     */
    getThirdPartyAPIById(id: string): Promise<ThirdPartyAPI | null>;
    /**
     * Get ThirdPartyAPIs by Provider
     */
    getThirdPartyAPIsByProvider(provider: string): Promise<ThirdPartyAPI[]>;
    /**
     * Update ThirdPartyAPI
     */
    updateThirdPartyAPI(id: string, apiData: {
        Name?: string;
        Description?: string;
        Category?: string;
        Provider?: string;
        BaseUrl?: string;
        Version?: string;
        AuthType?: string;
        KeyVaultSecretName?: string;
        ConfigurationJson?: string;
        UpdatedBy?: string;
    }): Promise<boolean>;
    /**
     * Delete ThirdPartyAPI (soft delete)
     */
    deleteThirdPartyAPI(id: string, deletedBy?: string): Promise<boolean>;
}
//# sourceMappingURL=TenantDatabaseService.d.ts.map