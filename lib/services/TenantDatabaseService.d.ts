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
export declare class TenantDatabaseService {
    private connectionConfig;
    private keyVaultClient;
    private credential;
    constructor();
    /**
     * Parse SQL connection string
     * @param connectionString Connection string to parse
     * @returns Parsed connection configuration
     */
    private parseConnectionString;
    /**
     * Create a new database connection
     * @returns Promise<Connection>
     */
    private createConnection;
    /**
     * Execute a SQL query
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
     * Execute a transaction
     * @param connection Database connection
     * @param operations Operations to execute in transaction
     * @returns Promise<void>
     */
    private executeTransaction;
    /**
     * Generate a new GUID
     * @returns string
     */
    private generateGuid;
}
//# sourceMappingURL=TenantDatabaseService.d.ts.map