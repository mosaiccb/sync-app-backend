"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = healthCheck;
const functions_1 = require("@azure/functions");
const TenantDatabaseService_1 = require("../services/TenantDatabaseService");
async function healthCheck(_request, context) {
    context.log('Health check endpoint called');
    try {
        const service = new TenantDatabaseService_1.TenantDatabaseService();
        // Test database connection
        const tenants = await service.getAllTenants();
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: {
                    connected: true,
                    tenantCount: tenants.length
                },
                message: 'TenantDatabaseService is working correctly'
            })
        };
    }
    catch (error) {
        context.log('Health check failed:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'TenantDatabaseService failed'
            })
        };
    }
}
functions_1.app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: healthCheck
});
//# sourceMappingURL=health.js.map