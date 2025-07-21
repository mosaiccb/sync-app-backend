"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.thirdPartyAPIs = thirdPartyAPIs;
const functions_1 = require("@azure/functions");
const TenantDatabaseService_1 = require("../services/TenantDatabaseService");
async function thirdPartyAPIs(request, context) {
    context.log('Third Party APIs endpoint called');
    const method = request.method;
    try {
        const db = new TenantDatabaseService_1.TenantDatabaseService();
        if (method === 'GET') {
            // Get all APIs or by provider
            const provider = request.query.get('provider');
            let apis;
            if (provider) {
                apis = await db.getThirdPartyAPIsByProvider(provider);
            }
            else {
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
            const body = await request.json();
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
        if (method === 'PUT') {
            // Update existing API configuration
            const body = await request.json();
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
    }
    catch (error) {
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
functions_1.app.http('thirdPartyAPIs', {
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: thirdPartyAPIs
});
//# sourceMappingURL=thirdPartyAPIs.js.map