"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThirdPartyAPIService = void 0;
const keyVaultService_1 = require("./keyVaultService");
class ThirdPartyAPIService {
    keyVaultService;
    constructor() {
        this.keyVaultService = new keyVaultService_1.KeyVaultService();
    }
    /**
     * Store authentication configuration in Key Vault
     */
    async storeAuthConfig(apiName, tenantId, authConfig) {
        try {
            const secretName = `api-${apiName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${tenantId.replace(/[^a-z0-9]/g, '-')}`;
            await this.keyVaultService.setSecret(secretName, JSON.stringify(authConfig));
            return secretName;
        }
        catch (error) {
            console.error('Error storing auth config:', error);
            throw new Error(`Failed to store authentication configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Create a new third-party API configuration (simplified for now)
     * TODO: Implement full database persistence using TenantDatabaseService pattern
     */
    async createThirdPartyAPI(apiData) {
        try {
            const apiId = crypto.randomUUID();
            const now = new Date();
            // Store authentication configuration in Key Vault if provided
            let secretName;
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
        }
        catch (error) {
            console.error('Error creating third-party API:', error);
            throw new Error(`Failed to create third-party API: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Test connection to a third-party API with comprehensive validation
     */
    async testConnection(testData) {
        try {
            const startTime = Date.now();
            // Construct test URL
            const testUrl = testData.healthCheckEndpoint
                ? `${testData.baseUrl}${testData.healthCheckEndpoint}`
                : testData.baseUrl;
            // Prepare headers based on auth type
            const headers = {
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
                            headers[testData.authConfig.headerName] = testData.authConfig.apiKey;
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                message: 'Connection test failed'
            };
        }
    }
}
exports.ThirdPartyAPIService = ThirdPartyAPIService;
//# sourceMappingURL=ThirdPartyAPIService.js.map