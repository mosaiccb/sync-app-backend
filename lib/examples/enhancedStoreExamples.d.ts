/**
 * Enhanced Store Configuration Usage Examples
 * Demonstrating the new store URL, Google Maps, and detailed daily hours features
 */
import { InvocationContext } from '@azure/functions';
/**
 * Example 1: Get store with enhanced location data
 */
export declare function getEnhancedStoreExample(context: InvocationContext): Promise<void>;
/**
 * Example 2: Generate customer-facing store information
 */
export declare function generateStoreInfoCard(locationToken: string, context: InvocationContext): Promise<{
    name: string;
    address: string | undefined;
    phone: string | undefined;
    directions: string | undefined;
    website: string | undefined;
    hours: {
        Monday: string;
        Tuesday: string;
        Wednesday: string;
        Thursday: string;
        Friday: string;
        Saturday: string;
        Sunday: string;
    } | null;
    timezone: string;
} | null>;
/**
 * Example 3: Check if store is open at specific time
 */
export declare function isStoreOpenAt(locationToken: string, checkDate: Date, context: InvocationContext): Promise<boolean>;
/**
 * Example 4: Generate operating hours report for sales/labor filtering
 */
export declare function getOperatingHoursForDate(locationToken: string, targetDate: string, context: InvocationContext): Promise<{
    openHour: number;
    closeHour: number;
} | null>;
/**
 * Example 5: Integration with sales/labor dashboard
 */
export declare function enhancedDashboardStoreInfo(locationToken: string, context: InvocationContext): Promise<{
    storeName: string;
    storeId: string;
    timezone: string;
    state: string;
    region: string | undefined;
    address: string | undefined;
    phone: string | undefined;
    storeUrl: string | undefined;
    googleMapsUrl: string | undefined;
    todaysHours: {
        open: any;
        close: any;
        source: string;
    };
    lastUpdated: Date;
    hasDetailedHours: boolean;
    hasLocationData: boolean;
}>;
//# sourceMappingURL=enhancedStoreExamples.d.ts.map