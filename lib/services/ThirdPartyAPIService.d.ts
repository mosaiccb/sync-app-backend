/**
 * Third-Party API Service (Simplified)
 *
 * Features:
 * - Basic API configuration management
 * - Secure credential management via Key Vault
 * - Connection testing capabilities
 * - TODO: Full database persistence using TenantDatabaseService pattern
 */
export interface ThirdPartyAPI {
    id: string;
    name: string;
    description?: string;
    category: string;
    baseUrl: string;
    version: string;
    authType: 'bearer' | 'apikey' | 'oauth2' | 'basic' | 'none';
    secretName?: string;
    rateLimits?: {
        requestsPerSecond?: number;
        requestsPerMinute?: number;
        requestsPerHour?: number;
        requestsPerDay?: number;
    };
    healthCheckEndpoint?: string;
    isActive: boolean;
    tenantId: string;
    endpoints?: ThirdPartyAPIEndpoint[];
    createdAt: Date;
    updatedAt: Date;
}
export interface ThirdPartyAPIEndpoint {
    id: string;
    thirdPartyAPIId: string;
    name: string;
    description?: string;
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    requestTemplate?: string;
    headersJson?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateThirdPartyAPIRequest {
    name: string;
    description?: string;
    category: string;
    baseUrl: string;
    version: string;
    authType: 'bearer' | 'apikey' | 'oauth2' | 'basic' | 'none';
    authConfig?: Record<string, unknown>;
    rateLimits?: {
        requestsPerSecond?: number;
        requestsPerMinute?: number;
        requestsPerHour?: number;
        requestsPerDay?: number;
    };
    healthCheckEndpoint?: string;
    isActive: boolean;
    tenantId: string;
    endpoints?: Omit<ThirdPartyAPIEndpoint, 'id' | 'thirdPartyAPIId' | 'createdAt' | 'updatedAt'>[];
}
export interface UpdateThirdPartyAPIRequest {
    name?: string;
    description?: string;
    category?: string;
    baseUrl?: string;
    version?: string;
    authType?: 'bearer' | 'apikey' | 'oauth2' | 'basic' | 'none';
    authConfig?: Record<string, unknown>;
    rateLimits?: {
        requestsPerSecond?: number;
        requestsPerMinute?: number;
        requestsPerHour?: number;
        requestsPerDay?: number;
    };
    healthCheckEndpoint?: string;
    isActive?: boolean;
}
export interface TestConnectionRequest {
    baseUrl: string;
    healthCheckEndpoint?: string;
    authType: 'bearer' | 'apikey' | 'oauth2' | 'basic' | 'none';
    authConfig?: Record<string, unknown>;
}
export interface TestConnectionResponse {
    success: boolean;
    status?: number;
    responseTime?: number;
    message?: string;
    error?: string;
}
export declare class ThirdPartyAPIService {
    private keyVaultService;
    constructor();
    /**
     * Store authentication configuration in Key Vault
     */
    private storeAuthConfig;
    /**
     * Create a new third-party API configuration (simplified for now)
     * TODO: Implement full database persistence using TenantDatabaseService pattern
     */
    createThirdPartyAPI(apiData: CreateThirdPartyAPIRequest): Promise<ThirdPartyAPI>;
    /**
     * Test connection to a third-party API with comprehensive validation
     */
    testConnection(testData: TestConnectionRequest): Promise<TestConnectionResponse>;
}
//# sourceMappingURL=ThirdPartyAPIService.d.ts.map