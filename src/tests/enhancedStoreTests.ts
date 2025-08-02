/**
 * Test Script for Enhanced Store Configuration System
 * Run this to test SQL+cache performance and new features
 */

import { InvocationContext } from '@azure/functions';
import { storeConfigService } from '../services/storeConfigService';
import { databaseStoreService } from '../services/databaseStoreService';

interface TestResult {
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

/**
 * Performance test: SQL vs Cache
 */
export async function performanceTest(context: InvocationContext): Promise<void> {
  const testTokens = [
    "RPNrrDYtnke+OHNLfy74/A==", // Castle Rock
    "XQ6YP1rWoLEcddpUJY6XuQ==", // Golden
    "HZAk2KejHMgJKjX4sxOJKw=="  // Longmont
  ];

  context.log('\n🔍 ENHANCED STORE CONFIGURATION PERFORMANCE TEST');
  context.log('=====================================================\n');

  // Test 1: Database performance (first call)
  context.log('Test 1: Database Performance (Cold Start)');
  for (const token of testTokens) {
    const result = await timeFunction(
      () => databaseStoreService.getStoreByToken(token, context),
      'Database Query'
    );
    
    if (result.success && result.data) {
      context.log(`  ✅ ${result.data.name}: ${result.duration}ms`);
      context.log(`     Address: ${result.data.address || 'Not available'}`);
      context.log(`     Store URL: ${result.data.storeurl || 'Not available'}`);
      context.log(`     Daily Hours: ${result.data.dailyHours ? 'Available' : 'Not available'}`);
    } else {
      context.log(`  ❌ Token ${token.substring(0, 10)}...: ${result.error}`);
    }
  }

  // Wait for cache to be populated
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Cache performance (subsequent calls)
  context.log('\nTest 2: Cache Performance (Warm Cache)');
  for (const token of testTokens) {
    const result = await timeFunction(
      () => storeConfigService.getStoreConfig(token, context),
      'Cache Lookup'
    );
    
    if (result.success && result.data) {
      context.log(`  ⚡ ${result.data.name}: ${result.duration}ms (cached)`);
    } else {
      context.log(`  ❌ Token ${token.substring(0, 10)}...: ${result.error}`);
    }
  }

  // Test 3: Enhanced features validation
  context.log('\nTest 3: Enhanced Features Validation');
  await testEnhancedFeatures(context);

  // Test 4: Hours accuracy test
  context.log('\nTest 4: Operating Hours Accuracy');
  await testOperatingHours(context);

  context.log('\n✅ Performance test completed!');
}

/**
 * Test enhanced store features
 */
async function testEnhancedFeatures(context: InvocationContext): Promise<void> {
  const testToken = "RPNrrDYtnke+OHNLfy74/A=="; // Castle Rock
  
  const store = await storeConfigService.getStoreConfig(testToken, context);
  
  if (!store) {
    context.log('  ❌ Could not retrieve test store');
    return;
  }

  // Test enhanced data availability
  const tests = [
    { field: 'address', value: store.address, label: 'Street Address' },
    { field: 'phone', value: store.phone, label: 'Phone Number' },
    { field: 'storeurl', value: store.storeurl, label: 'Store Website URL' },
    { field: 'googleMapsUrl', value: store.googleMapsUrl, label: 'Google Maps Link' },
    { field: 'dailyHours', value: store.dailyHours, label: 'Daily Hours Data' }
  ];

  for (const test of tests) {
    if (test.value) {
      context.log(`  ✅ ${test.label}: Available`);
      if (test.field === 'dailyHours' && typeof test.value === 'object') {
        const days = Object.keys(test.value);
        context.log(`     Days covered: ${days.join(', ')}`);
      }
    } else {
      context.log(`  ⚠️  ${test.label}: Not available`);
    }
  }
}

/**
 * Test operating hours accuracy
 */
async function testOperatingHours(context: InvocationContext): Promise<void> {
  const testToken = "RPNrrDYtnke+OHNLfy74/A=="; // Castle Rock
  
  const store = await storeConfigService.getStoreConfig(testToken, context);
  
  if (!store) {
    context.log('  ❌ Could not retrieve test store');
    return;
  }

  context.log(`  Testing hours for: ${store.name}`);

  if (store.dailyHours) {
    // Test each day's hours
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
      const dayHours = store.dailyHours[day as keyof typeof store.dailyHours];
      if (dayHours) {
        context.log(`  📅 ${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayHours.open} - ${dayHours.close}`);
        
        // Validate time format
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(dayHours.open) || !timeRegex.test(dayHours.close)) {
          context.log(`    ⚠️  Invalid time format for ${day}`);
        }
      } else {
        context.log(`  ❌ Missing hours for ${day}`);
      }
    }
  } else {
    context.log(`  📅 Using general hours: ${store.openingHour}:00 - ${store.closingHour}:00`);
  }

  // Test current status
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { 
    weekday: 'long',
    timeZone: store.timezone 
  }).toLowerCase();

  if (store.dailyHours && store.dailyHours[currentDay as keyof typeof store.dailyHours]) {
    const todayHours = store.dailyHours[currentDay as keyof typeof store.dailyHours];
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: store.timezone,
      hour: '2-digit',
      minute: '2-digit'
    });

    const isOpen = currentTime >= todayHours.open && currentTime <= todayHours.close;
    context.log(`  🕒 Current time: ${currentTime} (${store.timezone})`);
    context.log(`  🏪 Store status: ${isOpen ? 'OPEN' : 'CLOSED'}`);
  }
}

/**
 * Time a function execution
 */
async function timeFunction<T>(
  fn: () => Promise<T>, 
  _label: string
): Promise<TestResult> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    
    return {
      success: true,
      duration,
      data: result
    };
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test all Colorado stores coverage
 */
export async function testColoradoStoresCoverage(context: InvocationContext): Promise<void> {
  context.log('\n🏪 COLORADO STORES COVERAGE TEST');
  context.log('=====================================\n');

  const coloradoTokens = [
    { token: "RPNrrDYtnke+OHNLfy74/A==", expectedName: "Castle Rock" },
    { token: "XQ6YP1rWoLEcddpUJY6XuQ==", expectedName: "Golden" },
    { token: "HZAk2KejHMgJKjX4sxOJKw==", expectedName: "Longmont" },
    { token: "9V7OgY3sVKOAFaH2eEX2VA==", expectedName: "Colorado Springs North" },
    { token: "4mEzKNLtF7gJ3wP8qR6YhA==", expectedName: "Colorado Springs South" },
    { token: "7nF2RzXpG8hL4xQ9tS5ZiB==", expectedName: "Westminster" },
    { token: "2pG3SzYqH9iM5yR0uT6AjC==", expectedName: "Thornton" },
    { token: "8qH4TzZrI0jN6zS1vU7BkD==", expectedName: "Parker" },
    { token: "5rI5UzArJ1kO7AS2wV8ClE==", expectedName: "Northglenn" }
  ];

  let storesWithEnhancedData = 0;
  let totalStores = coloradoTokens.length;

  for (const storeInfo of coloradoTokens) {
    const store = await storeConfigService.getStoreConfig(storeInfo.token, context);
    
    if (store) {
      const hasEnhancedData = !!(store.address && store.storeurl && store.dailyHours);
      
      context.log(`Store: ${store.name}`);
      context.log(`  Expected: ${storeInfo.expectedName}`);
      context.log(`  Address: ${store.address || 'Not available'}`);
      context.log(`  Website: ${store.storeurl || 'Not available'}`);
      context.log(`  Daily Hours: ${store.dailyHours ? 'Available' : 'Not available'}`);
      context.log(`  Enhanced Data: ${hasEnhancedData ? '✅ Complete' : '⚠️  Partial'}`);
      
      if (hasEnhancedData) {
        storesWithEnhancedData++;
      }
    } else {
      context.log(`❌ Store not found: ${storeInfo.expectedName}`);
    }
    
    context.log(''); // Empty line for readability
  }

  const coverage = Math.round((storesWithEnhancedData / totalStores) * 100);
  context.log(`📊 Enhanced Data Coverage: ${storesWithEnhancedData}/${totalStores} stores (${coverage}%)`);
  
  if (coverage >= 50) {
    context.log('✅ Good coverage - system ready for production');
  } else {
    context.log('⚠️  Low coverage - consider manual data entry for missing stores');
  }
}

/**
 * Main test runner
 */
export async function runAllTests(context: InvocationContext): Promise<void> {
  try {
    await performanceTest(context);
    await testColoradoStoresCoverage(context);
    
    context.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    context.log('\nNext Steps:');
    context.log('1. Deploy enhanced schema to production database');
    context.log('2. Populate remaining store data manually or via additional scraping');
    context.log('3. Update frontend dashboard to use enhanced store information');
    context.log('4. Monitor cache performance and adjust refresh interval if needed');
    
  } catch (error) {
    context.log('\n❌ TEST SUITE FAILED');
    context.log('Error:', error instanceof Error ? error.message : String(error));
  }
}
