// Weather Dashboard Test Script
// Run this in your browser console or Node.js to test the weather system

const BACKEND_URL = 'http://localhost:7074'; // Adjust for your environment

async function testWeatherSystem() {
  console.log('🌤️  Testing Weather Dashboard System...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BACKEND_URL}/api/weather?action=health`);
    const healthData = await healthResponse.json();
    
    if (healthData.success) {
      console.log('✅ Health check passed');
      console.log(`   API Key: ${healthData.hasApiKey ? 'Configured' : 'Missing'}`);
      console.log(`   Database: ${healthData.dbConnection ? 'Connected' : 'Disconnected'}`);
    } else {
      console.log('❌ Health check failed:', healthData.error);
      return;
    }

    // Test 2: Get Store Configurations
    console.log('\n2. Testing store configurations...');
    const configResponse = await fetch(`${BACKEND_URL}/api/parBrinkConfigurations`);
    const configData = await configResponse.json();
    
    if (configData.success && configData.data?.locations) {
      const storesWithAddresses = configData.data.locations.filter(store => store.address);
      console.log(`✅ Found ${storesWithAddresses.length} stores with addresses`);
      
      if (storesWithAddresses.length > 0) {
        const testStore = storesWithAddresses[0];
        console.log(`   Test store: ${testStore.name} (${testStore.token})`);
        
        // Test 3: Get Weather for Test Store
        console.log('\n3. Testing weather for test store...');
        const weatherResponse = await fetch(
          `${BACKEND_URL}/api/weather?action=get&token=${testStore.token}`
        );
        const weatherData = await weatherResponse.json();
        
        if (weatherData.success) {
          console.log('✅ Weather data retrieved successfully');
          console.log(`   Location: ${weatherData.store.name}`);
          console.log(`   Address: ${weatherData.store.address}`);
          console.log(`   Current Temp: ${weatherData.weather.current.temp}°F`);
          console.log(`   Condition: ${weatherData.weather.current.weather[0].description}`);
          console.log(`   Business Hours Weather: ${weatherData.weather.businessHoursWeather.length} entries`);
          console.log(`   Traffic Impact: ${weatherData.weather.weatherSummary.customerTrafficImpact}`);
          console.log(`   Staffing Rec: ${weatherData.weather.weatherSummary.staffingRecommendation}`);
        } else {
          console.log('❌ Weather test failed:', weatherData.error);
        }
      } else {
        console.log('⚠️  No stores found with address data');
      }
    } else {
      console.log('❌ Store configuration test failed');
    }

    // Test 4: Test State-Level Weather (if Colorado stores exist)
    console.log('\n4. Testing state-level weather (Colorado)...');
    const stateResponse = await fetch(`${BACKEND_URL}/api/weather?action=list&state=CO`);
    const stateData = await stateResponse.json();
    
    if (stateData.success) {
      console.log(`✅ State weather data retrieved for ${stateData.stores?.length || 0} stores`);
    } else {
      console.log('❌ State weather test failed:', stateData.error);
    }

    console.log('\n🎉 Weather system testing complete!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Frontend component test
function testFrontendWeatherDashboard() {
  console.log('\n🖥️  Frontend Weather Dashboard Test');
  console.log('1. Navigate to: http://localhost:5173/weather-dashboard');
  console.log('2. Check that store locations load in dropdown');
  console.log('3. Select a store and verify weather data appears');
  console.log('4. Test refresh button functionality');
  console.log('5. Verify responsive design on mobile');
}

// Run tests
if (typeof window !== 'undefined') {
  // Browser environment
  console.log('Running in browser environment');
  testWeatherSystem();
  testFrontendWeatherDashboard();
} else {
  // Node.js environment
  console.log('Running in Node.js environment');
  // You would need to install fetch polyfill for Node.js
  console.log('Install node-fetch and run: node weather-test.js');
}

// Export for manual testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testWeatherSystem,
    testFrontendWeatherDashboard
  };
}
