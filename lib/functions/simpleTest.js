"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
/**
 * Simple test function to verify function deployment works
 */
async function simpleTest(_request, context) {
    context.log('🔧 Simple test function called');
    return {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            message: 'Simple test function is working!',
            timestamp: new Date().toISOString(),
            functionName: 'simpleTest'
        })
    };
}
functions_1.app.http('simpleTest', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: simpleTest
});
//# sourceMappingURL=simpleTest.js.map