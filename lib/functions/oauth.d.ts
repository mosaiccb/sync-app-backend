import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
/**
 * OAuth Token Proxy Function
 * Handles OAuth token requests for multiple tenants using SQL + Key Vault architecture
 */
export declare function oauthToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Test OAuth Token Function
 * Test endpoint to validate OAuth token functionality
 */
export declare function testOAuthToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=oauth.d.ts.map