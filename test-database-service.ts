// Test script for ThirdPartyAPIDatabase service
import { ThirdPartyAPIDatabase } from './src/services/ThirdPartyAPIDatabase';

async function testDatabaseService() {
    console.log('🧪 Testing ThirdPartyAPIDatabase service...');
    console.log('');

    const db = new ThirdPartyAPIDatabase();

    try {
        // Test connection
        console.log('1. Testing database connection...');
        const connectionTest = await db.testConnection();
        
        if (connectionTest.success) {
            console.log('✅ Database connection successful!');
            console.log('   Details:', JSON.stringify(connectionTest.details, null, 2));
        } else {
            console.log('❌ Database connection failed!');
            console.log('   Error:', connectionTest.message);
            console.log('   Details:', connectionTest.details);
            return;
        }

        console.log('');

        // Test getting all APIs
        console.log('2. Testing getAllAPIs...');
        try {
            const apis = await db.getAllAPIs();
            console.log(`✅ Retrieved ${apis.length} APIs from database`);
            
            if (apis.length > 0) {
                console.log('   Sample API:', {
                    name: apis[0].name,
                    type: apis[0].type,
                    baseUrl: apis[0].baseUrl,
                    endpointCount: apis[0].endpoints.length
                });
            }
        } catch (error: any) {
            console.log('⚠️  getAllAPIs failed (might be expected if tables don\'t exist):', error.message);
        }

        console.log('');

        console.log('🎉 Database service test completed!');
        
    } catch (error: any) {
        console.error('💥 Test failed:', error.message);
        console.error('   Full error:', error);
    }
}

// Set environment variables for testing
process.env.SQL_AUTH_TYPE = process.env.SQL_AUTH_TYPE || 'azure-active-directory-default';
process.env.SQL_SERVER = process.env.SQL_SERVER || 'mosaic.database.windows.net';
process.env.SQL_DATABASE = process.env.SQL_DATABASE || 'moevocorp';

console.log('Environment Configuration:');
console.log('SQL_AUTH_TYPE:', process.env.SQL_AUTH_TYPE);
console.log('SQL_SERVER:', process.env.SQL_SERVER);
console.log('SQL_DATABASE:', process.env.SQL_DATABASE);
console.log('');

testDatabaseService().catch(console.error);
