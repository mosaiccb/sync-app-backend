export interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    settings?: any;
    tenantName: string;
    companyId: string;
    baseUrl: string;
    clientId: string;
    clientSecret?: string;
    scope?: string;
    tokenEndpoint?: string;
    description?: string;
}
export declare class TenantDatabaseService {
    private createConnection;
    testConnection(): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
    getAllTenants(): Promise<Tenant[]>;
    getTenantById(id: string): Promise<Tenant | null>;
    getTenantBySubdomain(subdomain: string): Promise<Tenant | null>;
    getClientSecret(tenantId: string): Promise<string | null>;
    createTenant(_tenantData: any): Promise<string>;
    updateTenant(_updates: any): Promise<boolean>;
    deleteTenant(_tenantId: string): Promise<boolean>;
}
//# sourceMappingURL=TenantDatabaseService.d.ts.map