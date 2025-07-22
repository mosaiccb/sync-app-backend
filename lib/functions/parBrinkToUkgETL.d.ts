import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
/**
 * PAR Brink to UKG Ready ETL Pipeline
 * Extracts employee data from PAR Brink, transforms it, and prepares for UKG Ready
 */
export declare function parBrinkToUkgETL(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
export declare function getParBrinkEmployeesTest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
export declare function testUkgReadyConnection(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=parBrinkToUkgETL.d.ts.map