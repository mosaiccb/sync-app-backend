"use strict";
// Entry point for Azure Functions
// This file imports all function registrations
Object.defineProperty(exports, "__esModule", { value: true });
// Import all function modules to ensure they register with the app
require("./functions/tenants");
require("./functions/oauth");
require("./functions/health");
require("./functions/thirdPartyAPISimple");
require("./functions/parBrinkEnhanced");
require("./functions/simpleTest");
// The functions are automatically registered with the app object
// when the modules are imported
//# sourceMappingURL=index-ChuckDtop.js.map