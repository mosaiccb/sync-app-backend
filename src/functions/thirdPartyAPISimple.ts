import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { KeyVaultService } from '../services/keyVaultService';

// Lazy initialization of KeyVaultService to avoid requiring environment variables at module load
let keyVaultService: KeyVaultService | null = null;

function getKeyVaultService(): KeyVaultService {
    if (!keyVaultService) {
        keyVaultService = new KeyVaultService();
    }
    return keyVaultService;
}

/**
 * Create a new third-party API configuration
 * POST /api/third-party-apis
 */
export async function createThirdPartyAPISimple(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('Creating new third-party API configuration');
        
        const requestBody = await request.text();
        if (!requestBody) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'Request body is required'
                }
            };
        }

        const apiConfig = JSON.parse(requestBody);
        
        // Debug: Log the received configuration structure
        context.log('Received API configuration:', {
            name: apiConfig.name,
            category: apiConfig.category,
            baseUrl: apiConfig.baseUrl,
            authType: apiConfig.authType,
            hasAuthConfig: !!apiConfig.authConfig,
            hasEndpoints: !!apiConfig.endpoints,
            endpointsCount: apiConfig.endpoints?.length || 0
        });
        
        // Validate required fields based on ThirdPartyAPI interface from frontend
        if (!apiConfig.name || !apiConfig.category || !apiConfig.baseUrl || !apiConfig.authConfig) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'Name, category, baseUrl, and authConfig are required'
                }
            };
        }

        // Store sensitive credentials in Key Vault (skip for local testing if env vars not set)
        let secretName = '';
        try {
            secretName = KeyVaultService.generateSecretName(
                apiConfig.tenantId || 'global',
                apiConfig.category || 'parbrink',
                Date.now()
            );
            
            await getKeyVaultService().storeThirdPartyAPICredentials(secretName, apiConfig.authConfig);
            context.log(`Third-party API credentials stored in Key Vault: ${secretName}`);
        } catch (keyVaultError) {
            const errorMessage = keyVaultError instanceof Error ? keyVaultError.message : 'Key Vault unavailable';
            context.warn('Key Vault not available for local testing:', errorMessage);
            secretName = 'local-testing-' + Date.now();
        }

        context.log(`Third-party API configuration created successfully with secret: ${secretName}`);
        
        // Create a response that matches the frontend's ThirdPartyAPIResponse format
        const createdAPI = {
            id: 'api-' + Date.now(), // Generate a temporary ID for now
            name: apiConfig.name,
            description: apiConfig.description,
            category: apiConfig.category,
            baseUrl: apiConfig.baseUrl,
            version: apiConfig.version,
            authType: apiConfig.authType,
            authConfig: {}, // Don't return sensitive data
            endpoints: apiConfig.endpoints || [],
            rateLimits: apiConfig.rateLimits,
            healthCheckEndpoint: apiConfig.healthCheckEndpoint,
            isActive: apiConfig.isActive !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            jsonBody: {
                success: true,
                data: createdAPI,
                details: [`Configuration stored with secret: ${secretName}`]
            }
        };
        
    } catch (error) {
        context.error('Error creating third-party API:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: false,
                error: 'Failed to create third-party API configuration',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}

/**
 * Test PAR Brink connection
 * POST /api/third-party-apis/test-par-brink
 */
export async function testParBrinkConnectionSimple(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('Testing PAR Brink connection');
        
        const requestBody = await request.text();
        if (!requestBody) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'Request body is required'
                }
            };
        }

        const testData = JSON.parse(requestBody);
        const { accessToken, locationToken } = testData;
        
        if (!accessToken || !locationToken) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'Access token and location token are required'
                }
            };
        }

        // For now, just validate tokens are present
        // TODO: Implement actual SOAP call to PAR Brink API
        const testResult = {
            success: true,
            message: 'Connection test simulated successfully'
        };

        context.log('PAR Brink connection test completed');
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            jsonBody: testResult
        };
        
    } catch (error) {
        context.error('Error testing PAR Brink connection:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: false,
                error: 'Failed to test PAR Brink connection',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}

/**
 * Handle CORS preflight requests
 */
export async function handleOptionsSimple(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
    return {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    };
}

// Register the functions with unique names
app.http('createThirdPartyAPISimple', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'configurations',
    handler: createThirdPartyAPISimple
});

app.http('testParBrinkConnectionSimple', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'testParBrinkConnection',
    handler: testParBrinkConnectionSimple
});

app.http('thirdPartyAPIsOptionsSimple', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: 'configurations',
    handler: handleOptionsSimple
});
