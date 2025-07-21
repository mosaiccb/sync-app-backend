// Entry point for Azure Functions
import { app } from '@azure/functions';

// Import all function modules to ensure they register with the app
import './functions/tenants';
import './functions/oauth';
import './functions/health';
import './functions/thirdPartyAPIs';
import './functions/testDbConnection';
import './functions/parBrinkToUkgETL';

// Export the app for Azure Functions runtime
export { app };
