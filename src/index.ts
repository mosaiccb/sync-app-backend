// Entry point for Azure Functions
import { app } from '@azure/functions';

// Import all function modules to ensure they register with the app
import './functions/tenants';
import './functions/tenantsV2';
import './functions/tenantCredentialsV2';
import './functions/oauth';
import './functions/health';
import './functions/thirdPartyAPIs';
import './functions/thirdPartyAPISimple';
import './functions/testDbConnection';
import './functions/parBrinkConfigurations';
import './functions/parBrinkDashboard';
import './functions/parBrinkEnhanced';
import './functions/parBrinkToUkgETL';
import './functions/ukgReadyAPI';
import './functions/simpleTest';

// Export the app for Azure Functions runtime
export { app };
