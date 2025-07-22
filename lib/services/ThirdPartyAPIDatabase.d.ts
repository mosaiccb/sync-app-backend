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
export declare class ThirdPartyAPIDatabase {
    private pool;
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
     * Parse SQL connection string to mssql config
     * @param connectionString Connection string to parse
     * @returns Parsed connection configuration for mssql
     */
    private parseConnectionStringToConfig;
    /**
     * Execute a SQL query using mssql
     * @param query SQL query string
     * @param parameters Query parameters
     * @returns Promise<any[]>
     */
    private executeQuery;
    testConnection(): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
    createAPI(apiData: {
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
    getAllAPIs(): Promise<ThirdPartyAPI[]>;
    getAPIById(id: string): Promise<ThirdPartyAPI | null>;
    getAPIsByProvider(provider: string): Promise<ThirdPartyAPI[]>;
    updateAPI(id: string, apiData: {
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
    deleteAPI(id: string, deletedBy?: string): Promise<boolean>;
}
//# sourceMappingURL=ThirdPartyAPIDatabase.d.ts.map