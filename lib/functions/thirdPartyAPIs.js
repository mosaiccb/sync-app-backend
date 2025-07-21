"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.thirdPartyAPIs = thirdPartyAPIs;
const functions_1 = require("@azure/functions");
const ThirdPartyAPIDatabase_1 = require("../services/ThirdPartyAPIDatabase");
async function thirdPartyAPIs(request, context) {
    context.log('Third Party APIs endpoint called');
    const method = request.method;
    try {
        const db = new ThirdPartyAPIDatabase_1.ThirdPartyAPIDatabase();
        if (method === 'GET') {
            // Get all APIs or by provider
            const provider = request.query.get('provider');
            let apis;
            if (provider) {
                apis = await db.getAPIsByProvider(provider);
            }
            else {
                apis = await db.getAllAPIs();
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
            const apiId = await db.createAPI({
                Name: body.Name,
                Description: body.Description,
                Category: body.Category || 'API',
                Provider: body.Provider,
                BaseUrl: body.BaseUrl,
                Version: body.Version,
                AuthType: body.AuthType,
                ConfigurationJson: body.ConfigurationJson,
                IsActive: body.IsActive !== false,
                CreatedBy: body.CreatedBy || 'system'
            });
            const createdAPI = await db.getAPIById(apiId);
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
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: thirdPartyAPIs
});
//# sourceMappingURL=thirdPartyAPIs.js.map