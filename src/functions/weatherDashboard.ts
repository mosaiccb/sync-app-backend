import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { storeConfigService } from '../services/storeConfigService';
import { weatherService } from '../services/weatherService';

/**
 * Weather Dashboard Function
 * Provides weather data for restaurant locations based on stored addresses
 */
export async function weatherDashboard(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      };
    }

    context.log('Weather Dashboard request started');

    const action = request.query.get('action') || 'get';
    
    switch (action) {
      case 'health':
        return await handleHealthCheck(context);
        
      case 'get':
        return await handleGetWeather(request, context);
        
      case 'list':
        return await handleListStoreWeather(request, context);
        
      default:
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Invalid action',
            validActions: ['health', 'get', 'list'],
            usage: {
              health: '?action=health - Check weather service health',
              get: '?action=get&token=xyz - Get weather for specific store',
              list: '?action=list&state=CO - Get weather for all stores (optionally by state)'
            }
          })
        };
    }

  } catch (error) {
    context.error('Weather Dashboard error:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

async function handleHealthCheck(context: InvocationContext): Promise<HttpResponseInit> {
  const weatherHealth = await weatherService.healthCheck(context);
  const storeHealth = await storeConfigService.healthCheck(context);
  
  const overallStatus = 
    weatherHealth.status === 'healthy' && storeHealth.cacheStatus === 'healthy' 
      ? 'healthy' 
      : 'degraded';

  return {
    status: overallStatus === 'healthy' ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      service: 'WeatherDashboard',
      status: overallStatus,
      components: {
        weatherService: weatherHealth,
        storeService: {
          status: storeHealth.cacheStatus,
          totalStores: storeHealth.totalStores,
          lastRefresh: storeHealth.lastRefresh
        }
      },
      timestamp: new Date().toISOString()
    })
  };
}

async function handleGetWeather(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const token = request.query.get('token');
  
  if (!token) {
    return {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Missing token parameter',
        usage: '?action=get&token=xyz'
      })
    };
  }

  context.log(`🌤️ Getting weather for store token: ${token.substring(0, 10)}...`);

  // Get store configuration
  const store = await storeConfigService.getStoreConfig(token, context);
  if (!store) {
    return {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Store not found',
        token: token.substring(0, 10) + '...'
      })
    };
  }

  if (!store.address) {
    return {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Store address not available',
        store: store.name,
        message: 'Weather data requires store address to be configured'
      })
    };
  }

  // Determine business hours for weather filtering
  let businessHours = null;
  if (store.dailyHours) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = store.dailyHours[today as keyof typeof store.dailyHours];
    if (todayHours) {
      businessHours = {
        open: todayHours.open,
        close: todayHours.close
      };
    }
  }

  // Get weather data
  const weatherData = await weatherService.getRestaurantWeather(
    store.address,
    businessHours,
    context
  );

  if (!weatherData) {
    return {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Weather data unavailable',
        store: store.name,
        message: 'Unable to retrieve weather data for this location'
      })
    };
  }

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true,
      store: {
        name: store.name,
        address: store.address,
        timezone: store.timezone,
        businessHours: businessHours
      },
      weather: weatherData,
      timestamp: new Date().toISOString()
    })
  };
}

async function handleListStoreWeather(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const state = request.query.get('state');
  
  context.log(`🌤️ Getting weather for multiple stores${state ? ` in ${state}` : ''}`);

  // Get stores
  let stores;
  if (state) {
    stores = await storeConfigService.getStoresByState(state, context);
  } else {
    stores = await storeConfigService.getAllActiveStores(context);
  }

  // Filter stores that have addresses
  const storesWithAddresses = stores.filter(store => store.address);
  
  if (storesWithAddresses.length === 0) {
    return {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'No stores with addresses found',
        totalStores: stores.length,
        storesWithAddresses: 0,
        message: 'Weather data requires store addresses to be configured'
      })
    };
  }

  context.log(`📍 Found ${storesWithAddresses.length} stores with addresses out of ${stores.length} total stores`);

  // Get weather data for all stores (limit to prevent API overuse)
  const maxStores = 10; // Reasonable limit for batch requests
  const storesToProcess = storesWithAddresses.slice(0, maxStores);
  
  const weatherPromises = storesToProcess.map(async (store) => {
    try {
      // Determine business hours
      let businessHours = null;
      if (store.dailyHours) {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const todayHours = store.dailyHours[today as keyof typeof store.dailyHours];
        if (todayHours) {
          businessHours = {
            open: todayHours.open,
            close: todayHours.close
          };
        }
      }

      const weatherData = await weatherService.getRestaurantWeather(
        store.address!,
        businessHours,
        context
      );

      return {
        store: {
          token: store.token,
          name: store.name,
          address: store.address,
          timezone: store.timezone,
          businessHours: businessHours
        },
        weather: weatherData,
        success: !!weatherData
      };
    } catch (error) {
      context.warn(`Weather fetch failed for ${store.name}:`, error);
      return {
        store: {
          token: store.token,
          name: store.name,
          address: store.address,
          timezone: store.timezone,
          businessHours: null
        },
        weather: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  const results = await Promise.all(weatherPromises);
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  context.log(`✅ Weather data retrieved for ${successful.length}/${results.length} stores`);

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true,
      filter: state ? { state } : 'all',
      summary: {
        totalRequested: storesToProcess.length,
        successful: successful.length,
        failed: failed.length,
        totalStoresInSystem: stores.length,
        storesWithAddresses: storesWithAddresses.length
      },
      results: results,
      timestamp: new Date().toISOString()
    })
  };
}

// Register the function
app.http('weatherDashboard', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'weather',
  handler: weatherDashboard
});
