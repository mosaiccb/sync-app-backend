import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
/**
 * V2 Tenant Credentials API - Get credentials for OAuth token generation
 * GET /api/v2/tenants/credentials?id={id} - Get tenant credentials including client secret
 */
export declare function tenantCredentialsV2(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=tenantCredentialsV2.d.ts.map