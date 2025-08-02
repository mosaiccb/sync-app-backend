import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { storeConfigService } from '../services/storeConfigService';

export async function storeAdmin(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Store admin endpoint called');
  
  const action = request.query.get('action') || 'health';
  
  try {
    switch (action) {
      case 'health':
        return await handleHealthCheck(context);
      
      case 'refresh':
        return await handleRefreshCache(context);
      
      case 'list':
        return await handleListStores(request, context);
      
      case 'get':
        return await handleGetStore(request, context);
      
      default:
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Invalid action',
            validActions: ['health', 'refresh', 'list', 'get'],
            usage: {
              health: '?action=health - Check store service health',
              refresh: '?action=refresh - Force refresh cache from database',
              list: '?action=list&state=CO - List stores (optionally by state)',
              get: '?action=get&token=xyz - Get specific store by token'
            }
          })
        };
    }
  } catch (error) {
    context.error('Store admin error:', error);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

async function handleHealthCheck(context: InvocationContext): Promise<HttpResponseInit> {
  const health = await storeConfigService.healthCheck(context);
  
  return {
    status: health.cacheStatus === 'missing' ? 503 : 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service: 'StoreConfigService',
      status: health.cacheStatus === 'healthy' ? 'healthy' : 'degraded',
      cache: health,
      timestamp: new Date().toISOString()
    })
  };
}

async function handleRefreshCache(context: InvocationContext): Promise<HttpResponseInit> {
  context.log('🔄 Manual cache refresh requested');
  
  const startTime = Date.now();
  await storeConfigService.refreshCache(context);
  const duration = Date.now() - startTime;
  
  const health = await storeConfigService.healthCheck(context);
  
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'refresh',
      success: true,
      duration: `${duration}ms`,
      cache: health,
      timestamp: new Date().toISOString()
    })
  };
}

async function handleListStores(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const state = request.query.get('state');
  
  let stores;
  if (state) {
    context.log(`📋 Listing stores for state: ${state}`);
    stores = await storeConfigService.getStoresByState(state, context);
  } else {
    context.log('📋 Listing all active stores');
    stores = await storeConfigService.getAllActiveStores(context);
  }
  
  // Create summary for easier viewing
  const summary = stores.map(store => ({
    name: store.name,
    state: store.state,
    address: store.address || 'N/A',
    phone: store.phone || 'N/A',
    hasWebsite: !!store.storeurl,
    hasGoogleMaps: !!store.googleMapsUrl,
    hasDetailedHours: !!store.dailyHours,
    lastUpdated: store.lastUpdated
  }));
  
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'list',
      filter: state ? { state } : 'all',
      count: stores.length,
      summary,
      fullData: stores, // Include complete data
      timestamp: new Date().toISOString()
    })
  };
}

async function handleGetStore(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const token = request.query.get('token');
  
  if (!token) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Missing token parameter',
        usage: '?action=get&token=xyz'
      })
    };
  }
  
  context.log(`🔍 Looking up store with token: ${token.substring(0, 10)}...`);
  
  const store = await storeConfigService.getStoreConfig(token, context);
  
  if (!store) {
    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Store not found',
        token: token.substring(0, 10) + '...'
      })
    };
  }
  
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get',
      store,
      timestamp: new Date().toISOString()
    })
  };
}

app.http('storeAdmin', {
  methods: ['GET'],
  authLevel: 'function',
  handler: storeAdmin
});
