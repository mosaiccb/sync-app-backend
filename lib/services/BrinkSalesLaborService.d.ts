export interface HourlyData {
    hour: string;
    netSales: number;
    guests: number;
    guestAverage: number;
    orders: number;
    orderAverage: number;
    laborHours: number;
    laborDollars: number;
    laborPercent: number;
}
export interface SalesLaborReport {
    locationId: string;
    locationName: string;
    date: string;
    reportDate: string;
    hourlyData: HourlyData[];
    totals: HourlyData;
}
export interface BrinkLocation {
    id: string;
    name: string;
    locationId: string;
    token: string;
    isActive: boolean;
}
export interface BrinkConfig {
    accessToken: string;
    locations: BrinkLocation[];
    selectedEndpoints: string[];
}
export declare class BrinkSalesLaborService {
    private tenantService;
    private baseUrl;
    constructor();
    /**
     * Get PAR Brink configuration from database
     */
    private getBrinkConfig;
    /**
     * Make authenticated request to Brink API
     */
    private brinkApiRequest;
    /**
     * Fetch sales data for a specific location and date
     */
    private fetchSalesData;
    /**
     * Fetch labor data for a specific location and date
     */
    private fetchLaborData;
    /**
     * Process raw sales data into hourly format
     */
    private processSalesData;
    /**
     * Process raw labor data into hourly format
     */
    private processLaborData;
    /**
     * Calculate business metrics according to the rules
     */
    private calculateMetrics;
    /**
     * Format hour for display (3:00 AM - 2:00 AM format)
     */
    private formatHour;
    /**
     * Get Sales and Labor Report for a specific location and date
     */
    getSalesLaborReport(locationId: string, date?: string): Promise<SalesLaborReport | null>;
    /**
     * Get reports for all active locations
     */
    getAllLocationReports(date?: string): Promise<SalesLaborReport[]>;
    /**
     * Test connection to Brink API for a specific location
     */
    testConnection(locationId?: string): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
}
//# sourceMappingURL=BrinkSalesLaborService.d.ts.map