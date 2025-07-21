import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
/**
 * Create a new third-party API configuration
 * POST /api/third-party-apis
 */
export declare function createThirdPartyAPISimple(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Test PAR Brink connection
 * POST /api/third-party-apis/test-par-brink
 */
export declare function testParBrinkConnectionSimple(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Handle CORS preflight requests
 */
export declare function handleOptionsSimple(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=thirdPartyAPISimple.d.ts.map