"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parBrinkConfigurations = parBrinkConfigurations;
const functions_1 = require("@azure/functions");
const TenantDatabaseService_1 = require("../services/TenantDatabaseService");
/**
 * PAR Brink Configurations Function
 * Returns available PAR Brink locations and configuration
 */
async function parBrinkConfigurations(request, context) {
    try {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
        }
        context.log('PAR Brink Configurations request started');
        const tenantService = new TenantDatabaseService_1.TenantDatabaseService();
        // Get PAR Brink configuration from database
        const apis = await tenantService.getThirdPartyAPIsByProvider('PAR Brink');
        if (apis.length === 0) {
            context.log('No PAR Brink configuration found');
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'No PAR Brink configuration found'
                }
            };
        }
        const brinkApi = apis[0];
        if (!brinkApi.ConfigurationJson) {
            context.log('PAR Brink configuration JSON is empty');
            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'PAR Brink configuration is empty'
                }
            };
        }
        let config;
        try {
            config = JSON.parse(brinkApi.ConfigurationJson);
        }
        catch (parseError) {
            context.error('Error parsing PAR Brink configuration JSON:', parseError);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'Invalid configuration format'
                }
            };
        }
        // Filter to only return active locations and sanitize sensitive data
        const sanitizedLocations = config.locations
            .filter(loc => loc.isActive)
            .map(loc => ({
            id: loc.id,
            name: loc.name,
            locationId: loc.locationId,
            token: loc.token, // Frontend needs this for API calls
            isActive: loc.isActive
        }));
        const responseData = {
            success: true,
            accessToken: config.accessToken, // Frontend needs this for API calls
            locations: sanitizedLocations,
            totalLocations: sanitizedLocations.length
        };
        context.log(`Returning ${sanitizedLocations.length} active PAR Brink locations`);
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: responseData
        };
    }
    catch (error) {
        context.error('Error in PAR Brink Configurations:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: false,
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}
// Register the function
functions_1.app.http('parBrinkConfigurations', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/configurations',
    handler: parBrinkConfigurations
});
//# sourceMappingURL=parBrinkConfigurations.js.map