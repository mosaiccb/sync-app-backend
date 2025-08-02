import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TenantDatabaseService } from '../services/TenantDatabaseService';
import { storeConfigService } from '../services/storeConfigService';

interface BrinkLocation {
  id: string;
  name: string;
  locationId: string;
  token: string;
  isActive: boolean;
  timezone?: string;        // Enhanced: Store timezone from database
  address?: string;         // Enhanced: Store address from database
  phone?: string;          // Enhanced: Store phone from database
  storeurl?: string;       // Enhanced: MOD Pizza website URL
  googleMapsUrl?: string;  // Enhanced: Google Maps URL
  dailyHours?: any;        // Enhanced: Daily operating hours JSON
}

interface BrinkConfig {
  accessToken: string;
  locations: BrinkLocation[];
  selectedEndpoints: string[];
}

export async function parBrinkConfigurations(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      };
    }

    context.log('PAR Brink Configurations request started');

    // Get enhanced store configurations from database service
    context.log('🏪 Loading enhanced store configurations from database...');
    const storeConfigs = await storeConfigService.getAllActiveStores(context);
    context.log(`📊 Retrieved ${storeConfigs.length} active stores from database`);

    const tenantService = new TenantDatabaseService();
    
    // Get PAR Brink access token from database or fallback to static
    let accessToken = 'tBJ5haIyv0uRbbWQL6FbXw=='; // Default token
    
    try {
      const apis = await tenantService.getThirdPartyAPIsByProvider('PAR Brink');
      
      if (apis.length > 0 && apis[0].ConfigurationJson) {
        const brinkApi = apis[0];
        const dbConfig = JSON.parse(brinkApi.ConfigurationJson!);
        
        // Try to get real access token from Key Vault if KeyVaultSecretName exists
        if (brinkApi.KeyVaultSecretName) {
          try {
            context.log(`Retrieving PAR Brink access token from Key Vault: ${brinkApi.KeyVaultSecretName}`);
            
            const { SecretClient } = await import('@azure/keyvault-secrets');
            const { DefaultAzureCredential } = await import('@azure/identity');
            
            const credential = new DefaultAzureCredential();
            const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL || 'https://ukgsync-kv-5rrqlcuxyzlvy.vault.azure.net/';
            const keyVaultClient = new SecretClient(keyVaultUrl, credential);
            
            const secret = await keyVaultClient.getSecret(brinkApi.KeyVaultSecretName);
            if (secret.value) {
              context.log('Successfully retrieved PAR Brink access token from Key Vault for configurations');
              accessToken = secret.value; // Override with real token
            } else {
              context.log('Key Vault secret exists but has no value, using configuration token');
              accessToken = dbConfig.accessToken || accessToken;
            }
          } catch (keyVaultError) {
            context.log('Key Vault retrieval failed in configurations, using configuration token:', keyVaultError);
            accessToken = dbConfig.accessToken || accessToken;
          }
        } else {
          accessToken = dbConfig.accessToken || accessToken;
        }
        
        // If still demo token, try environment variable
        if (accessToken === 'demo-access-token') {
          const envToken = process.env.PAR_BRINK_ACCESS_TOKEN;
          if (envToken && envToken !== 'demo-access-token') {
            context.log('Using PAR Brink access token from environment variable in configurations');
            accessToken = envToken;
          }
        }
      }
    } catch (dbError) {
      context.log('Database error retrieving PAR Brink config, using default token:', dbError);
    }

    // Convert enhanced store configs to BrinkLocation format with all the new fields
    const enhancedLocations: BrinkLocation[] = storeConfigs.map(store => ({
      id: store.id,
      name: store.name,
      locationId: store.id,  // PAR Brink location ID
      token: store.token,
      isActive: store.isActive,
      timezone: store.timezone,           // Enhanced: Store timezone
      address: store.address,             // Enhanced: Store address
      phone: store.phone,                 // Enhanced: Store phone
      storeurl: store.storeurl,           // Enhanced: MOD Pizza website URL
      googleMapsUrl: store.googleMapsUrl, // Enhanced: Google Maps URL
      dailyHours: store.dailyHours        // Enhanced: Daily operating hours
    }));

    context.log(`🚀 Enhanced store configurations loaded with full data (addresses, phones, hours, maps, etc.)`);

    const responseData = {
      success: true,
      data: {
        accessToken: accessToken, // Frontend needs this for API calls
        locations: enhancedLocations,
        totalLocations: enhancedLocations.length,
        enhanced: true, // Flag to indicate enhanced store data is available
        features: {
          timezones: true,
          addresses: true,
          phones: true,
          websites: true,
          googleMaps: true,
          dailyHours: true
        }
      }
    };

    context.log(`Returning ${enhancedLocations.length} enhanced PAR Brink locations with complete store data`);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      jsonBody: responseData
    };

  } catch (error) {
    context.error('Error in PAR Brink Configurations (falling back to static):', error);
    
    // Fallback to static configuration if enhanced system fails
    try {
      const staticConfig = getStaticBrinkConfiguration();
      const responseData = {
        success: true,
        data: {
          accessToken: staticConfig.accessToken,
          locations: staticConfig.locations,
          totalLocations: staticConfig.locations.length,
          enhanced: false, // Flag to indicate fallback mode
          fallback: true
        }
      };
      
      context.log(`Fallback: Returning ${staticConfig.locations.length} static PAR Brink locations`);
      
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        jsonBody: responseData
      };
    } catch (fallbackError) {
      context.error('Even fallback failed:', fallbackError);
      
      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        jsonBody: {
          success: false,
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

function getStaticBrinkConfiguration(): BrinkConfig {
  return {
    accessToken: 'tBJ5haIyv0uRbbWQL6FbXw==', // Real PAR Brink token (was demo-access-token)
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
  };
}

// Register the function
app.http('parBrinkConfigurations', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'par-brink/configurations',
  handler: parBrinkConfigurations
});
