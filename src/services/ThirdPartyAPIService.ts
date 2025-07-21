import { KeyVaultService } from './keyVaultService';

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

export class ThirdPartyAPIService {
    private keyVaultService: KeyVaultService;

    constructor() {
        this.keyVaultService = new KeyVaultService();
    }

    /**
     * Store authentication configuration in Key Vault
     */
    private async storeAuthConfig(apiName: string, tenantId: string, authConfig: Record<string, unknown>): Promise<string> {
        try {
            const secretName = `api-${apiName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${tenantId.replace(/[^a-z0-9]/g, '-')}`;
            await this.keyVaultService.setSecret(secretName, JSON.stringify(authConfig));
            return secretName;
        } catch (error) {
            console.error('Error storing auth config:', error);
            throw new Error(`Failed to store authentication configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create a new third-party API configuration (simplified for now)
     * TODO: Implement full database persistence using TenantDatabaseService pattern
     */
    async createThirdPartyAPI(apiData: CreateThirdPartyAPIRequest): Promise<ThirdPartyAPI> {
        try {
            const apiId = crypto.randomUUID();
            const now = new Date();
            
            // Store authentication configuration in Key Vault if provided
            let secretName: string | undefined;
            if (apiData.authConfig && Object.keys(apiData.authConfig).length > 0) {
                secretName = await this.storeAuthConfig(apiData.name, apiData.tenantId, apiData.authConfig);
            }
            
            // For now, return a mock response
            // TODO: Replace with actual database persistence
            return {
                id: apiId,
                name: apiData.name,
                description: apiData.description,
                category: apiData.category,
                baseUrl: apiData.baseUrl,
                version: apiData.version,
                authType: apiData.authType,
                secretName,
                rateLimits: apiData.rateLimits,
                healthCheckEndpoint: apiData.healthCheckEndpoint,
                isActive: apiData.isActive,
                tenantId: apiData.tenantId,
                endpoints: [],
                createdAt: now,
                updatedAt: now
            };
            
        } catch (error) {
            console.error('Error creating third-party API:', error);
            throw new Error(`Failed to create third-party API: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Test connection to a third-party API with comprehensive validation
     */
    async testConnection(testData: TestConnectionRequest): Promise<TestConnectionResponse> {
        try {
            const startTime = Date.now();
            
            // Construct test URL
            const testUrl = testData.healthCheckEndpoint 
                ? `${testData.baseUrl}${testData.healthCheckEndpoint}`
                : testData.baseUrl;
            
            // Prepare headers based on auth type
            const headers: Record<string, string> = {
                'User-Agent': 'UKG-Sync-App/1.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            
            // Add authentication headers based on type
            if (testData.authType !== 'none' && testData.authConfig) {
                switch (testData.authType) {
                    case 'bearer':
                        if (testData.authConfig.token) {
                            headers['Authorization'] = `Bearer ${testData.authConfig.token}`;
                        }
                        break;
                    case 'apikey':
                        if (testData.authConfig.apiKey && testData.authConfig.headerName) {
                            headers[testData.authConfig.headerName as string] = testData.authConfig.apiKey as string;
                        }
                        break;
                    case 'basic':
                        if (testData.authConfig.username && testData.authConfig.password) {
                            const credentials = Buffer.from(`${testData.authConfig.username}:${testData.authConfig.password}`).toString('base64');
                            headers['Authorization'] = `Basic ${credentials}`;
                        }
                        break;
                }
            }
            
            // Make test request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(testUrl, {
                method: 'GET',
                headers,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            
            return {
                success: response.ok,
                status: response.status,
                responseTime,
                message: response.ok 
                    ? `Connection successful (${response.status} ${response.statusText})`
                    : `Connection failed (${response.status} ${response.statusText})`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                message: 'Connection test failed'
            };
        }
    }
}
