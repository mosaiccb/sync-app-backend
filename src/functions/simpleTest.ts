import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Simple test function to verify function deployment works
 */
async function simpleTest(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

app.http('simpleTest', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: simpleTest
});
