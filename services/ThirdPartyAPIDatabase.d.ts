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
    private createConnection;
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
        KeyVaultSecretName?: string;
        ConfigurationJson?: any;
        IsActive?: boolean;
        CreatedBy: string;
    }): Promise<string>;
    getAllAPIs(): Promise<ThirdPartyAPI[]>;
    getAPIById(id: string): Promise<ThirdPartyAPI | null>;
    getAPIsByProvider(provider: string): Promise<ThirdPartyAPI[]>;
}
//# sourceMappingURL=ThirdPartyAPIDatabase.d.ts.map