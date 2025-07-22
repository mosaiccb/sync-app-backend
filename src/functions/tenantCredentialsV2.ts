import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TenantDatabaseService } from '../services/TenantDatabaseService';

/**
 * V2 Tenant Credentials API - Get credentials for OAuth token generation
 * GET /api/v2/tenants/credentials?id={id} - Get tenant credentials including client secret
 */
export async function tenantCredentialsV2(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Tenant Credentials V2 endpoint called');
    
    const method = request.method;
    
    try {
        const db = new TenantDatabaseService();
        
        if (method === 'GET') {
            const tenantId = request.query.get('id');
            
            if (!tenantId) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Tenant ID is required in query parameter'
                    })
                };
            }
            
            context.log(`Getting credentials for tenant: ${tenantId}`);
            
            // Get tenant config from database
            const tenant = await db.getTenantById(tenantId);
            if (!tenant) {
                return {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Tenant not found'
                    })
                };
            }
            
            // Get client secret from Key Vault
            const clientSecret = await db.getClientSecret(tenantId);
            if (!clientSecret) {
                return {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Client secret not found'
                    })
                };
            }
            
            // Return credentials with both id/name formats for compatibility
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    data: {
                        id: tenant.id,
                        tenantId: tenant.id,
                        name: tenant.tenantName,
                        tenantName: tenant.tenantName,
                        companyId: tenant.companyId,
                        baseUrl: tenant.baseUrl,
                        clientId: tenant.clientId,
                        clientSecret: clientSecret,
                        tokenEndpoint: tenant.tokenEndpoint
                    }
                })
            };
        }
        
        if (method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
        }
        
        // Method not allowed
        return {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Method not allowed'
            })
        };
        
    } catch (error: any) {
        context.log('Tenant Credentials V2 endpoint error:', error);
        
        return {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
}

// Register the V2 credentials function
app.http('tenantCredentialsV2', {
    methods: ['GET', 'OPTIONS'],
    route: 'v2/tenants/credentials',
    authLevel: 'anonymous',
    handler: tenantCredentialsV2
});
