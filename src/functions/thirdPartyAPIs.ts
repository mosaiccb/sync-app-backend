import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TenantDatabaseService } from '../services/TenantDatabaseService';

export async function thirdPartyAPIs(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Third Party APIs endpoint called');
    
    const method = request.method;
    
    try {
        const db = new TenantDatabaseService();
        
        if (method === 'GET') {
            // Get all APIs or by provider
            const provider = request.query.get('provider');
            
            let apis;
            if (provider) {
                apis = await db.getThirdPartyAPIsByProvider(provider);
            } else {
                apis = await db.getAllThirdPartyAPIs();
            }
            
            // Transform the data to match frontend interface (lowercase field names)
            const transformedApis = apis.map(api => ({
                id: api.Id,
                name: api.Name,
                description: api.Description,
                category: api.Category,
                provider: api.Provider,
                baseUrl: api.BaseUrl,
                version: api.Version,
                authType: api.AuthType,
                keyVaultSecretName: api.KeyVaultSecretName,
                configurationJson: api.ConfigurationJson,
                isActive: api.IsActive,
                createdAt: api.CreatedAt,
                updatedAt: api.UpdatedAt,
                createdBy: api.CreatedBy,
                updatedBy: api.UpdatedBy
            }));
            
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    data: transformedApis,
                    count: transformedApis.length
                })
            };
        }
        
        if (method === 'POST') {
            // Create new API configuration
            const body = await request.json() as any;
            
            if (!body.Name || !body.Provider || !body.BaseUrl || !body.AuthType) {
                return {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: false,
                        error: 'Missing required fields: Name, Provider, BaseUrl, AuthType'
                    })
                };
            }
            
            const apiId = await db.createOrUpdateThirdPartyAPI({
                Name: body.Name,
                Description: body.Description,
                Category: body.Category || 'API',
                Provider: body.Provider,
                BaseUrl: body.BaseUrl,
                Version: body.Version,
                AuthType: body.AuthType,
                KeyVaultSecretName: body.KeyVaultSecretName || `api-${body.Name.toLowerCase().replace(/\s+/g, '-')}-secret`,
                ConfigurationJson: body.ConfigurationJson,
                CreatedBy: body.CreatedBy || 'system',
                UpdatedBy: body.UpdatedBy || body.CreatedBy || 'system'
            });
            
            const createdAPI = await db.getThirdPartyAPIById(apiId);
            
            // Transform the created API to match frontend interface
            const transformedAPI = createdAPI ? {
                id: createdAPI.Id,
                name: createdAPI.Name,
                description: createdAPI.Description,
                category: createdAPI.Category,
                provider: createdAPI.Provider,
                baseUrl: createdAPI.BaseUrl,
                version: createdAPI.Version,
                authType: createdAPI.AuthType,
                keyVaultSecretName: createdAPI.KeyVaultSecretName,
                configurationJson: createdAPI.ConfigurationJson,
                isActive: createdAPI.IsActive,
                createdAt: createdAPI.CreatedAt,
                updatedAt: createdAPI.UpdatedAt,
                createdBy: createdAPI.CreatedBy,
                updatedBy: createdAPI.UpdatedBy
            } : null;
            
            return {
                status: 201,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'API configuration created successfully',
                    data: transformedAPI
                })
            };
        }
        
        if (method === 'PUT') {
            // Update existing API configuration
            const body = await request.json() as any;
            const id = body.Id || body.id;
            
            if (!id) {
                return {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: false,
                        error: 'Missing API configuration ID'
                    })
                };
            }
            
            if (!body.Name || !body.Provider || !body.BaseUrl || !body.AuthType) {
                return {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: false,
                        error: 'Missing required fields: Name, Provider, BaseUrl, AuthType'
                    })
                };
            }
            
            await db.updateThirdPartyAPI(id, {
                Name: body.Name,
                Description: body.Description,
                Category: body.Category || 'API',
                Provider: body.Provider,
                BaseUrl: body.BaseUrl,
                Version: body.Version,
                AuthType: body.AuthType,
                KeyVaultSecretName: body.KeyVaultSecretName,
                ConfigurationJson: body.ConfigurationJson,
                UpdatedBy: body.UpdatedBy || 'system'
            });
            
            const updatedAPI = await db.getThirdPartyAPIById(id);
            
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'API configuration updated successfully',
                    data: updatedAPI
                })
            };
        }
        
        return {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'Method not allowed'
            })
        };
        
    } catch (error: any) {
        context.log('Third Party APIs endpoint error:', error);
        
        return {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
}

app.http('thirdPartyAPIs', {
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: thirdPartyAPIs
});
