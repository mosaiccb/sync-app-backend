"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantsV2 = tenantsV2;
const functions_1 = require("@azure/functions");
const TenantDatabaseService_1 = require("../services/TenantDatabaseService");
/**
 * V2 Tenants API - Simplified endpoint following ThirdPartyAPIs pattern
 * GET /api/v2/tenants - Get all tenants
 * GET /api/v2/tenants?id={id} - Get tenant by ID
 * POST /api/v2/tenants - Create tenant
 * PUT /api/v2/tenants?id={id} - Update tenant
 * DELETE /api/v2/tenants?id={id} - Delete tenant
 */
async function tenantsV2(request, context) {
    context.log('Tenants V2 endpoint called');
    const method = request.method;
    try {
        const db = new TenantDatabaseService_1.TenantDatabaseService();
        if (method === 'GET') {
            // Get tenant by ID or all tenants
            const tenantId = request.query.get('id');
            if (tenantId) {
                // Get specific tenant
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
                // Transform to match frontend expectations (lowercase id/name)
                const transformedTenant = {
                    id: tenant.id,
                    name: tenant.tenantName,
                    tenantName: tenant.tenantName,
                    companyId: tenant.companyId,
                    baseUrl: tenant.baseUrl,
                    clientId: tenant.clientId,
                    description: tenant.description,
                    isActive: tenant.isActive,
                    createdDate: tenant.createdDate,
                    modifiedDate: tenant.modifiedDate,
                    tokenEndpoint: tenant.tokenEndpoint,
                    apiVersion: tenant.apiVersion,
                    scope: tenant.scope
                };
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        data: transformedTenant
                    })
                };
            }
            else {
                // Get all tenants
                const tenants = await db.getAllTenants();
                // Transform the data to match frontend interface (add lowercase id/name for compatibility)
                const transformedTenants = tenants.map(tenant => ({
                    id: tenant.id,
                    name: tenant.tenantName, // Add name field for compatibility
                    tenantName: tenant.tenantName,
                    companyId: tenant.companyId,
                    baseUrl: tenant.baseUrl,
                    clientId: tenant.clientId,
                    description: tenant.description,
                    isActive: tenant.isActive,
                    createdDate: tenant.createdDate,
                    modifiedDate: tenant.modifiedDate,
                    tokenEndpoint: tenant.tokenEndpoint,
                    apiVersion: tenant.apiVersion,
                    scope: tenant.scope
                }));
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        data: transformedTenants,
                        count: transformedTenants.length
                    })
                };
            }
        }
        if (method === 'POST') {
            // Create new tenant
            const body = await request.json();
            // Validate required fields
            const requiredFields = ['tenantName', 'companyId', 'baseUrl', 'clientId', 'clientSecret'];
            const missingFields = requiredFields.filter(field => !body[field]);
            if (missingFields.length > 0) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: `Missing required fields: ${missingFields.join(', ')}`
                    })
                };
            }
            context.log(`Creating new tenant: ${body.tenantName}`);
            const newTenantId = await db.createTenant({
                tenantName: body.tenantName,
                companyId: body.companyId,
                baseUrl: body.baseUrl,
                clientId: body.clientId,
                clientSecret: body.clientSecret,
                description: body.description
            });
            // Get the created tenant to return full data
            const createdTenant = await db.getTenantById(newTenantId);
            // Transform for response
            const transformedTenant = {
                id: createdTenant?.id,
                name: createdTenant?.tenantName,
                tenantName: createdTenant?.tenantName,
                companyId: createdTenant?.companyId,
                baseUrl: createdTenant?.baseUrl,
                clientId: createdTenant?.clientId,
                description: createdTenant?.description,
                isActive: createdTenant?.isActive,
                createdDate: createdTenant?.createdDate,
                modifiedDate: createdTenant?.modifiedDate,
                tokenEndpoint: createdTenant?.tokenEndpoint,
                apiVersion: createdTenant?.apiVersion,
                scope: createdTenant?.scope
            };
            return {
                status: 201,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    data: transformedTenant,
                    message: 'Tenant created successfully'
                })
            };
        }
        if (method === 'PUT') {
            // Update tenant
            const tenantId = request.query.get('id');
            const body = await request.json();
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
            // Get current tenant data first
            const currentTenant = await db.getTenantById(tenantId);
            if (!currentTenant) {
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
            // Merge updates with current data
            const success = await db.updateTenant({
                id: tenantId,
                tenantName: body.tenantName || currentTenant.tenantName,
                companyId: body.companyId || currentTenant.companyId,
                baseUrl: body.baseUrl || currentTenant.baseUrl,
                clientId: body.clientId || currentTenant.clientId,
                clientSecret: body.clientSecret,
                description: body.description !== undefined ? body.description : currentTenant.description,
                isActive: body.isActive !== undefined ? body.isActive : currentTenant.isActive
            });
            if (!success) {
                return {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Failed to update tenant'
                    })
                };
            }
            // Get the updated tenant to return
            const updatedTenant = await db.getTenantById(tenantId);
            // Transform for response
            const transformedTenant = {
                id: updatedTenant?.id,
                name: updatedTenant?.tenantName,
                tenantName: updatedTenant?.tenantName,
                companyId: updatedTenant?.companyId,
                baseUrl: updatedTenant?.baseUrl,
                clientId: updatedTenant?.clientId,
                description: updatedTenant?.description,
                isActive: updatedTenant?.isActive,
                createdDate: updatedTenant?.createdDate,
                modifiedDate: updatedTenant?.modifiedDate,
                tokenEndpoint: updatedTenant?.tokenEndpoint,
                apiVersion: updatedTenant?.apiVersion,
                scope: updatedTenant?.scope
            };
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    data: transformedTenant,
                    message: 'Tenant updated successfully'
                })
            };
        }
        if (method === 'DELETE') {
            // Delete tenant
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
            const success = await db.deleteTenant(tenantId);
            if (!success) {
                return {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Tenant not found or already deleted'
                    })
                };
            }
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Tenant deleted successfully'
                })
            };
        }
        if (method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    }
    catch (error) {
        context.log('Tenants V2 endpoint error:', error);
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
// Register the V2 function
functions_1.app.http('tenantsV2', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    route: 'v2/tenants',
    authLevel: 'anonymous',
    handler: tenantsV2
});
//# sourceMappingURL=tenantsV2.js.map