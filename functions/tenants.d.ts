import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
/**
 * Get all tenants
 * GET /api/tenants
 */
export declare function getTenants(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Get tenant by ID
 * GET /api/tenants/{id}
 */
export declare function getTenantById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Create new tenant
 * POST /api/tenants
 */
export declare function createTenant(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Update tenant
 * PUT /api/tenants/{id}
 */
export declare function updateTenant(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Delete tenant
 * DELETE /api/tenants/{id}
 */
export declare function deleteTenant(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Get tenant credentials (for OAuth token generation)
 * GET /api/tenants/{id}/credentials
 */
export declare function getTenantCredentials(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Combined handler for /api/tenants route
 * Handles GET (list all) and POST (create) methods
 */
export declare function tenantsHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Combined handler for /api/tenants/{id} route
 * Handles GET (by ID), PUT (update), and DELETE methods
 */
export declare function tenantByIdHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=tenants.d.ts.map