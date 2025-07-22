import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function testDbConnection(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const sql = require('mssql');
    
    try {
        // Get configuration from environment variables
        const authType = process.env.SQL_AUTH_TYPE || 'azure-active-directory-msi-app-service';
        const server = process.env.SQL_SERVER || 'mosaic.database.windows.net';
        const database = process.env.SQL_DATABASE || 'moevocorp';
        
        const config: any = {
            server: server,
            database: database,
            options: {
                encrypt: true,
                trustServerCertificate: false,
                requestTimeout: 30000,
                connectionTimeout: 30000,
                enableArithAbort: true
            }
        };

        // Configure authentication
        if (authType === 'azure-active-directory-msi-app-service') {
            config.authentication = {
                type: 'azure-active-directory-msi-app-service'
            };
        }

        context.log('Testing database connection with config:', JSON.stringify(config, null, 2));

        // Test connection
        const pool = await sql.connect(config);
        
        // Test a simple query
        const result = await pool.request().query('SELECT GETDATE() as CurrentTime, @@VERSION as Version');
        
        await pool.close();

        return {
            status: 200,
            jsonBody: {
                success: true,
                message: 'Database connection successful!',
                authType: authType,
                server: server,
                database: database,
                testResult: result.recordset[0]
            }
        };

    } catch (error: any) {
        context.log('Database connection failed:', error);
        
        return {
            status: 500,
            jsonBody: {
                success: false,
                message: 'Database connection failed',
                error: error.message,
                details: error.toString()
            }
        };
    }
}

app.http('testDbConnection', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: testDbConnection
});
