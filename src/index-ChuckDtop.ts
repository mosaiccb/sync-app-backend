// Entry point for Azure Functions
// This file imports all function registrations

// Import all function modules to ensure they register with the app
import './functions/tenants';
import './functions/oauth';
import './functions/health';
import './functions/thirdPartyAPISimple';
import './functions/parBrinkEnhanced';
import './functions/simpleTest';

// The functions are automatically registered with the app object
// when the modules are imported
