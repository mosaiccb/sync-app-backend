"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// Entry point for Azure Functions
const functions_1 = require("@azure/functions");
Object.defineProperty(exports, "app", { enumerable: true, get: function () { return functions_1.app; } });
// Import all function modules to ensure they register with the app
require("./functions/tenants");
require("./functions/oauth");
require("./functions/health");
require("./functions/thirdPartyAPIs");
require("./functions/testDbConnection");
//# sourceMappingURL=index.js.map