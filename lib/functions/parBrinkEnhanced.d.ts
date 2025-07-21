import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
/**
 * Enhanced PAR Brink configuration management with database persistence
 * POST /api/configurations
 */
export declare function createThirdPartyAPIEnhanced(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Enhanced PAR Brink connection testing with real SOAP calls
 * POST /api/testParBrinkConnection
 */
export declare function testParBrinkConnectionEnhanced(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Get PAR Brink employee data with enhanced error handling
 * POST /api/par-brink/employees
 */
export declare function getParBrinkEmployees(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Get PAR Brink labor shifts with enhanced filtering
 * POST /api/par-brink/labor-shifts
 */
export declare function getParBrinkLaborShifts(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
/**
 * Get PAR Brink configurations from database
 * GET /api/par-brink/configurations
 */
export declare function getParBrinkConfigurations(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=parBrinkEnhanced.d.ts.map