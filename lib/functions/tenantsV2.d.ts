import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
/**
 * V2 Tenants API - Simplified endpoint following ThirdPartyAPIs pattern
 * GET /api/v2/tenants - Get all tenants
 * GET /api/v2/tenants?id={id} - Get tenant by ID
 * POST /api/v2/tenants - Create tenant
 * PUT /api/v2/tenants?id={id} - Update tenant
 * DELETE /api/v2/tenants?id={id} - Delete tenant
 */
export declare function tenantsV2(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=tenantsV2.d.ts.map