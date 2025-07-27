/**
 * Setup PAR Brink Configuration in Database
 * This script adds PAR Brink API configuration with 22 restaurant locations
 */

const { TenantDatabaseService } = require('./lib/services/TenantDatabaseService');

async function setupParBrinkConfiguration() {
    console.log('🏗️  Setting up PAR Brink configuration in database...');
    console.log('');

    const tenantService = new TenantDatabaseService();

    try {
        // Test database connection first
        console.log('1. Testing database connection...');
        const connectionTest = await tenantService.testThirdPartyAPIConnection();
        
        if (!connectionTest.success) {
            console.log('❌ Database connection failed!');
            console.log('   Error:', connectionTest.message);
            return false;
        }
        console.log('✅ Database connection successful!');
        console.log('');

        // Check if PAR Brink configuration already exists
        console.log('2. Checking for existing PAR Brink configuration...');
        const existingAPIs = await tenantService.getThirdPartyAPIsByProvider('PAR Brink');
        
        if (existingAPIs.length > 0) {
            console.log(`⚠️  Found ${existingAPIs.length} existing PAR Brink API(s)`);
            console.log('   Existing API:', existingAPIs[0].Name);
            
            // Update existing configuration
            const configurationJson = JSON.stringify({
                accessToken: process.env.PAR_BRINK_ACCESS_TOKEN || 'demo-access-token',
                selectedEndpoints: ['dashboard', 'sales', 'labor'],
                locations: [
                    { id: "1", name: "Castle Rock", locationId: "109", token: "RPNrrDYtnke+OHNLfy74/A==", isActive: true },
                    { id: "2", name: "Centre", locationId: "159", token: "16U5e0+GFEW/ixlKo+VJhg==", isActive: true },
                    { id: "3", name: "Creekwalk", locationId: "651", token: "xQwecGX8lUGnpLlTbheuug==", isActive: true },
                    { id: "4", name: "Crown Point", locationId: "479", token: "BhFEGI1ffUi1CLVe8/qtKw==", isActive: true },
                    { id: "5", name: "Diamond Circle", locationId: "204133", token: "XbEjtd0tKkavxcJ043UsUg==", isActive: true },
                    { id: "6", name: "Dublin Commons", locationId: "20408", token: "kRRYZ8SCiUatilX4KO7dBg==", isActive: true },
                    { id: "7", name: "Falcon Landing", locationId: "67", token: "dWQm28UaeEq0qStmvTfACg==", isActive: true },
                    { id: "8", name: "Forest Trace", locationId: "188", token: "Q58QIT+t+kGf9tzqHN2OCA==", isActive: true },
                    { id: "9", name: "Greeley", locationId: "354", token: "2LUEj0hnMk+kCQlUcySYBQ==", isActive: true },
                    { id: "10", name: "Highlands Ranch", locationId: "204049", token: "x/S/SDwyrEem54+ZoCILeg==", isActive: true },
                    { id: "11", name: "Johnstown", locationId: "722", token: "gAAbGt6udki8DwPMkonciA==", isActive: true },
                    { id: "12", name: "Lowry", locationId: "619", token: "37CE8WDS8k6isMGLMB9PRA==", isActive: true },
                    { id: "13", name: "McCastlin Marketplace", locationId: "161", token: "7yC7X4KjZEuoZCDviTwspA==", isActive: true },
                    { id: "14", name: "Northfield Commons", locationId: "336", token: "SUsjq0mEck6HwRkd7uNACg==", isActive: true },
                    { id: "15", name: "Polaris Pointe", locationId: "1036", token: "M4X3DyDrLUKwi3CQHbqlOQ==", isActive: true },
                    { id: "16", name: "Park Meadows", locationId: "26", token: "38AZmQGFQEy5VNajl9utlA==", isActive: true },
                    { id: "17", name: "Ralston Creek", locationId: "441", token: "ZOJMZlffDEqC849w6PnF0g==", isActive: true },
                    { id: "18", name: "Sheridan Parkway", locationId: "601", token: "A2dHEwIh9USNnpMrXCrpQw==", isActive: true },
                    { id: "19", name: "South Academy Highlands", locationId: "204047", token: "y4xlWfqFJEuvmkocDGZGtw==", isActive: true },
                    { id: "20", name: "Tower", locationId: "579", token: "6OwU+/7IOka+PV9JzAgzYQ==", isActive: true },
                    { id: "21", name: "Wellington", locationId: "652", token: "YUn21EMuwki+goWuIJ5yGg==", isActive: true },
                    { id: "22", name: "Westminster Promenade", locationId: "202794", token: "OpM9o1kTOkyMM2vevMMqdw==", isActive: true }
                ]
            }, null, 2);

            console.log('3. Updating existing PAR Brink configuration...');
            const updateResult = await tenantService.updateThirdPartyAPI(existingAPIs[0].Id, {
                ConfigurationJson: configurationJson,
                UpdatedBy: 'setup-script'
            });

            if (updateResult) {
                console.log('✅ PAR Brink configuration updated successfully!');
                console.log(`   Updated API ID: ${existingAPIs[0].Id}`);
                console.log(`   Total locations: 22`);
            } else {
                console.log('❌ Failed to update PAR Brink configuration');
                return false;
            }
        } else {
            console.log('   No existing configuration found. Creating new one...');
            console.log('');

            // Create new PAR Brink API configuration
            console.log('3. Creating PAR Brink API configuration...');
            
            const configurationJson = JSON.stringify({
                accessToken: process.env.PAR_BRINK_ACCESS_TOKEN || 'demo-access-token',
                selectedEndpoints: ['dashboard', 'sales', 'labor'],
                locations: [
                    { id: "1", name: "Castle Rock", locationId: "109", token: "RPNrrDYtnke+OHNLfy74/A==", isActive: true },
                    { id: "2", name: "Centre", locationId: "159", token: "16U5e0+GFEW/ixlKo+VJhg==", isActive: true },
                    { id: "3", name: "Creekwalk", locationId: "651", token: "xQwecGX8lUGnpLlTbheuug==", isActive: true },
                    { id: "4", name: "Crown Point", locationId: "479", token: "BhFEGI1ffUi1CLVe8/qtKw==", isActive: true },
                    { id: "5", name: "Diamond Circle", locationId: "204133", token: "XbEjtd0tKkavxcJ043UsUg==", isActive: true },
                    { id: "6", name: "Dublin Commons", locationId: "20408", token: "kRRYZ8SCiUatilX4KO7dBg==", isActive: true },
                    { id: "7", name: "Falcon Landing", locationId: "67", token: "dWQm28UaeEq0qStmvTfACg==", isActive: true },
                    { id: "8", name: "Forest Trace", locationId: "188", token: "Q58QIT+t+kGf9tzqHN2OCA==", isActive: true },
                    { id: "9", name: "Greeley", locationId: "354", token: "2LUEj0hnMk+kCQlUcySYBQ==", isActive: true },
                    { id: "10", name: "Highlands Ranch", locationId: "204049", token: "x/S/SDwyrEem54+ZoCILeg==", isActive: true },
                    { id: "11", name: "Johnstown", locationId: "722", token: "gAAbGt6udki8DwPMkonciA==", isActive: true },
                    { id: "12", name: "Lowry", locationId: "619", token: "37CE8WDS8k6isMGLMB9PRA==", isActive: true },
                    { id: "13", name: "McCastlin Marketplace", locationId: "161", token: "7yC7X4KjZEuoZCDviTwspA==", isActive: true },
                    { id: "14", name: "Northfield Commons", locationId: "336", token: "SUsjq0mEck6HwRkd7uNACg==", isActive: true },
                    { id: "15", name: "Polaris Pointe", locationId: "1036", token: "M4X3DyDrLUKwi3CQHbqlOQ==", isActive: true },
                    { id: "16", name: "Park Meadows", locationId: "26", token: "38AZmQGFQEy5VNajl9utlA==", isActive: true },
                    { id: "17", name: "Ralston Creek", locationId: "441", token: "ZOJMZlffDEqC849w6PnF0g==", isActive: true },
                    { id: "18", name: "Sheridan Parkway", locationId: "601", token: "A2dHEwIh9USNnpMrXCrpQw==", isActive: true },
                    { id: "19", name: "South Academy Highlands", locationId: "204047", token: "y4xlWfqFJEuvmkocDGZGtw==", isActive: true },
                    { id: "20", name: "Tower", locationId: "579", token: "6OwU+/7IOka+PV9JzAgzYQ==", isActive: true },
                    { id: "21", name: "Wellington", locationId: "652", token: "YUn21EMuwki+goWuIJ5yGg==", isActive: true },
                    { id: "22", name: "Westminster Promenade", locationId: "202794", token: "OpM9o1kTOkyMM2vevMMqdw==", isActive: true }
                ]
            }, null, 2);

            const apiData = {
                Name: 'PAR Brink POS API',
                Description: 'PAR Brink POS system integration with 22 restaurant locations',
                Category: 'POS Systems',
                Provider: 'PAR Brink',
                BaseUrl: 'https://api.parbrink.com',
                Version: 'v1',
                AuthType: 'Bearer Token',
                KeyVaultSecretName: 'par-brink-access-token',
                ConfigurationJson: configurationJson,
                CreatedBy: 'setup-script'
            };

            const apiId = await tenantService.createThirdPartyAPI(apiData);
            console.log('✅ PAR Brink API configuration created successfully!');
            console.log(`   New API ID: ${apiId}`);
            console.log(`   Total locations: 22`);
        }

        console.log('');
        console.log('4. Verifying configuration...');
        
        // Verify the configuration was saved
        const updatedAPIs = await tenantService.getThirdPartyAPIsByProvider('PAR Brink');
        if (updatedAPIs.length > 0 && updatedAPIs[0].ConfigurationJson) {
            const config = JSON.parse(updatedAPIs[0].ConfigurationJson);
            console.log('✅ Configuration verification successful!');
            console.log(`   API Name: ${updatedAPIs[0].Name}`);
            console.log(`   Provider: ${updatedAPIs[0].Provider}`);
            console.log(`   Locations in config: ${config.locations ? config.locations.length : 0}`);
            console.log(`   Selected endpoints: ${config.selectedEndpoints ? config.selectedEndpoints.join(', ') : 'none'}`);
        } else {
            console.log('⚠️  Configuration verification failed - no ConfigurationJson found');
        }

        console.log('');
        console.log('🎉 PAR Brink configuration setup completed successfully!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('   1. Test the configurations endpoint: curl https://ukg-sync-backend-5rrqlcuxyzlvy.azurewebsites.net/api/par-brink/configurations');
        console.log('   2. Check frontend - should now show 22 restaurant locations');
        console.log('   3. Test dashboard functionality with real location data');
        
        return true;

    } catch (error) {
        console.error('💥 Setup failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        return false;
    }
}

// Run the setup
if (require.main === module) {
    setupParBrinkConfiguration()
        .then(success => {
            if (success) {
                console.log('');
                console.log('✅ Setup completed successfully!');
                process.exit(0);
            } else {
                console.log('');
                console.log('❌ Setup failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { setupParBrinkConfiguration };
