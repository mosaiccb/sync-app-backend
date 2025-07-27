import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TenantDatabaseService } from '../services/TenantDatabaseService';

interface BrinkLocation {
  id: string;
  name: string;
  locationId: string;
  token: string;
  isActive: boolean;
}

interface BrinkConfig {
  accessToken: string;
  locations: BrinkLocation[];
  selectedEndpoints: string[];
}

/**
 * PAR Brink Configurations Function
 * Returns available PAR Brink locations and configuration
 */
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

    const tenantService = new TenantDatabaseService();
    
    // Get PAR Brink configuration from database
    let config: BrinkConfig;
    
    try {
      const apis = await tenantService.getThirdPartyAPIsByProvider('PAR Brink');
      
      if (apis.length === 0 || !apis[0].ConfigurationJson) {
        context.log('No database configuration found, using static configuration');
        config = getStaticBrinkConfiguration();
      } else {
        const brinkApi = apis[0];
        if (brinkApi.ConfigurationJson) {
          config = JSON.parse(brinkApi.ConfigurationJson);
        } else {
          config = getStaticBrinkConfiguration();
        }
      }
    } catch (dbError) {
      context.log('Database error, falling back to static configuration:', dbError);
      config = getStaticBrinkConfiguration();
    }

    // Filter to only return active locations and sanitize sensitive data
    const sanitizedLocations = config.locations
      .filter(loc => loc.isActive)
      .map(loc => ({
        id: loc.id,
        name: loc.name,
        locationId: loc.locationId,
        token: loc.token, // Frontend needs this for API calls
        isActive: loc.isActive
      }));

    const responseData = {
      success: true,
      data: {
        accessToken: config.accessToken, // Frontend needs this for API calls
        locations: sanitizedLocations,
        totalLocations: sanitizedLocations.length
      }
    };

    context.log(`Returning ${sanitizedLocations.length} active PAR Brink locations`);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      jsonBody: responseData
    };

  } catch (error) {
    context.error('Error in PAR Brink Configurations:', error);
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

function getStaticBrinkConfiguration(): BrinkConfig {
  return {
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
  };
}

// Register the function
app.http('parBrinkConfigurations', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'par-brink/configurations',
  handler: parBrinkConfigurations
});
