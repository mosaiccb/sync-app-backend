"use strict";
/**
 * Enhanced Store Configuration Usage Examples
 * Demonstrating the new store URL, Google Maps, and detailed daily hours features
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnhancedStoreExample = getEnhancedStoreExample;
exports.generateStoreInfoCard = generateStoreInfoCard;
exports.isStoreOpenAt = isStoreOpenAt;
exports.getOperatingHoursForDate = getOperatingHoursForDate;
exports.enhancedDashboardStoreInfo = enhancedDashboardStoreInfo;
const storeConfigService_1 = require("../services/storeConfigService");
/**
 * Example 1: Get store with enhanced location data
 */
async function getEnhancedStoreExample(context) {
    const locationToken = "RPNrrDYtnke+OHNLfy74/A=="; // Castle Rock
    const store = await storeConfigService_1.storeConfigService.getStoreConfig(locationToken, context);
    if (store) {
        context.log(`Store: ${store.name} (${store.state})`);
        context.log(`Address: ${store.address}`);
        context.log(`Phone: ${store.phone}`);
        context.log(`Store URL: ${store.storeurl}`);
        context.log(`Google Maps: ${store.googleMapsUrl}`);
        // Check if store is currently open
        if (store.dailyHours) {
            const now = new Date();
            const currentDay = now.toLocaleDateString('en-US', {
                weekday: 'long',
                timeZone: store.timezone
            }).toLowerCase();
            const todayHours = store.dailyHours[currentDay];
            if (todayHours) {
                context.log(`Today's hours: ${todayHours.open} - ${todayHours.close}`);
                const currentTime = now.toLocaleTimeString('en-US', {
                    hour12: false,
                    timeZone: store.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const isOpen = currentTime >= todayHours.open && currentTime <= todayHours.close;
                context.log(`Currently ${isOpen ? 'OPEN' : 'CLOSED'}`);
            }
        }
    }
}
/**
 * Example 2: Generate customer-facing store information
 */
async function generateStoreInfoCard(locationToken, context) {
    const store = await storeConfigService_1.storeConfigService.getStoreConfig(locationToken, context);
    if (!store) {
        return null;
    }
    // Generate a customer-facing info card
    const storeCard = {
        name: store.name,
        address: store.address,
        phone: store.phone,
        directions: store.googleMapsUrl,
        website: store.storeurl,
        hours: store.dailyHours ? {
            'Monday': `${store.dailyHours.monday.open} - ${store.dailyHours.monday.close}`,
            'Tuesday': `${store.dailyHours.tuesday.open} - ${store.dailyHours.tuesday.close}`,
            'Wednesday': `${store.dailyHours.wednesday.open} - ${store.dailyHours.wednesday.close}`,
            'Thursday': `${store.dailyHours.thursday.open} - ${store.dailyHours.thursday.close}`,
            'Friday': `${store.dailyHours.friday.open} - ${store.dailyHours.friday.close}`,
            'Saturday': `${store.dailyHours.saturday.open} - ${store.dailyHours.saturday.close}`,
            'Sunday': `${store.dailyHours.sunday.open} - ${store.dailyHours.sunday.close}`
        } : null,
        timezone: store.timezone
    };
    context.log('Generated store info card:', JSON.stringify(storeCard, null, 2));
    return storeCard;
}
/**
 * Example 3: Check if store is open at specific time
 */
async function isStoreOpenAt(locationToken, checkDate, context) {
    const store = await storeConfigService_1.storeConfigService.getStoreConfig(locationToken, context);
    if (!store || !store.dailyHours) {
        // Fallback to general hours if detailed hours not available
        const hour = checkDate.getHours();
        return hour >= (store?.openingHour || 10) && hour < (store?.closingHour || 22);
    }
    const dayName = checkDate.toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: store.timezone
    }).toLowerCase();
    const dayHours = store.dailyHours[dayName];
    if (!dayHours) {
        return false;
    }
    const checkTime = checkDate.toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: store.timezone,
        hour: '2-digit',
        minute: '2-digit'
    });
    const isOpen = checkTime >= dayHours.open && checkTime <= dayHours.close;
    context.log(`Store ${store.name} is ${isOpen ? 'open' : 'closed'} at ${checkTime} on ${dayName}`);
    return isOpen;
}
/**
 * Example 4: Generate operating hours report for sales/labor filtering
 */
async function getOperatingHoursForDate(locationToken, targetDate, context) {
    const store = await storeConfigService_1.storeConfigService.getStoreConfig(locationToken, context);
    if (!store) {
        return null;
    }
    // If we have detailed daily hours, use them
    if (store.dailyHours) {
        const date = new Date(targetDate);
        const dayName = date.toLocaleDateString('en-US', {
            weekday: 'long',
            timeZone: store.timezone
        }).toLowerCase();
        const dayHours = store.dailyHours[dayName];
        if (dayHours) {
            // Convert "10:30" to 10 (hour only for filtering)
            const openHour = parseInt(dayHours.open.split(':')[0]);
            const closeHour = parseInt(dayHours.close.split(':')[0]);
            context.log(`${store.name} operating hours for ${dayName}: ${openHour}:00 - ${closeHour}:00`);
            return { openHour, closeHour };
        }
    }
    // Fallback to general hours
    const openHour = store.openingHour || 10;
    const closeHour = store.closingHour || 22;
    context.log(`${store.name} using general hours: ${openHour}:00 - ${closeHour}:00`);
    return { openHour, closeHour };
}
/**
 * Example 5: Integration with sales/labor dashboard
 */
async function enhancedDashboardStoreInfo(locationToken, context) {
    const store = await storeConfigService_1.storeConfigService.getStoreConfig(locationToken, context);
    if (!store) {
        throw new Error(`Store not found for token: ${locationToken.substring(0, 10)}...`);
    }
    // Enhanced store context for dashboard
    const enhancedContext = {
        // Basic info
        storeName: store.name,
        storeId: store.id,
        timezone: store.timezone,
        state: store.state,
        region: store.region,
        // Location info
        address: store.address,
        phone: store.phone,
        storeUrl: store.storeurl,
        googleMapsUrl: store.googleMapsUrl,
        // Hours for current business date
        todaysHours: await getCurrentDayHours(store, context),
        // Metadata
        lastUpdated: store.lastUpdated,
        hasDetailedHours: !!store.dailyHours,
        hasLocationData: !!(store.address && store.phone)
    };
    context.log(`Enhanced dashboard context for ${store.name}:`, JSON.stringify(enhancedContext, null, 2));
    return enhancedContext;
}
/**
 * Helper function to get current day's hours
 */
async function getCurrentDayHours(store, _context) {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: store.timezone
    }).toLowerCase();
    if (store.dailyHours && store.dailyHours[currentDay]) {
        return {
            open: store.dailyHours[currentDay].open,
            close: store.dailyHours[currentDay].close,
            source: 'detailed_hours'
        };
    }
    // Fallback to general hours
    return {
        open: `${store.openingHour || 10}:00`,
        close: `${store.closingHour || 22}:00`,
        source: 'general_hours'
    };
}
//# sourceMappingURL=enhancedStoreExamples.js.map