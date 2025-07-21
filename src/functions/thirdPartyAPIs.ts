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
            
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    data: apis,
                    count: apis.length
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
            
            const apiId = await db.createThirdPartyAPI({
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
            
            return {
                status: 201,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'API configuration created successfully',
                    data: createdAPI
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
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: thirdPartyAPIs
});
