"use strict";
// PAR Brink Sales and Labor Data Service
// Fetches sales and labor data directly from Brink POS API
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrinkSalesLaborService = void 0;
const axios_1 = __importDefault(require("axios"));
const TenantDatabaseService_1 = require("./TenantDatabaseService");
class BrinkSalesLaborService {
    tenantService;
    baseUrl = 'https://api11.brinkpos.net';
    constructor() {
        this.tenantService = new TenantDatabaseService_1.TenantDatabaseService();
    }
    /**
     * Get PAR Brink configuration from database
     */
    async getBrinkConfig() {
        try {
            const apis = await this.tenantService.getThirdPartyAPIsByProvider('PAR Brink');
            if (apis.length === 0) {
                console.warn('No PAR Brink configuration found');
                return null;
            }
            const brinkApi = apis[0];
            if (!brinkApi.ConfigurationJson) {
                console.warn('PAR Brink configuration JSON is empty');
                return null;
            }
            const config = JSON.parse(brinkApi.ConfigurationJson);
            return config;
        }
        catch (error) {
            console.error('Error loading PAR Brink configuration:', error);
            return null;
        }
    }
    /**
     * Make authenticated request to Brink API
     */
    async brinkApiRequest(endpoint, locationToken) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const response = await axios_1.default.get(url, {
                headers: {
                    'Authorization': `Bearer ${locationToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            return response.data;
        }
        catch (error) {
            console.error(`Brink API request failed for ${endpoint}:`, error?.message || error);
            throw error;
        }
    }
    /**
     * Fetch sales data for a specific location and date
     */
    async fetchSalesData(locationId, locationToken, date) {
        const endpoint = `/api/order/sales/${locationId}/${date}`;
        return await this.brinkApiRequest(endpoint, locationToken);
    }
    /**
     * Fetch labor data for a specific location and date
     */
    async fetchLaborData(locationId, locationToken, date) {
        const endpoint = `/api/labor/hours/${locationId}/${date}`;
        return await this.brinkApiRequest(endpoint, locationToken);
    }
    /**
     * Process raw sales data into hourly format
     */
    processSalesData(salesData) {
        const hourlyData = new Map();
        // Initialize all 24 hours
        for (let hour = 0; hour < 24; hour++) {
            hourlyData.set(hour, { sales: 0, orders: 0, guests: 0 });
        }
        // Process sales transactions
        salesData.forEach(transaction => {
            if (!transaction.timestamp || !transaction.amount)
                return;
            const transactionTime = new Date(transaction.timestamp);
            let hour = transactionTime.getHours();
            // Adjust for restaurant day (3 AM start)
            if (hour < 3) {
                hour += 24; // Move early morning hours to end of day
            }
            hour = hour % 24;
            const existing = hourlyData.get(hour) || { sales: 0, orders: 0, guests: 0 };
            existing.sales += parseFloat(transaction.amount) || 0;
            existing.orders += 1;
            // Guest count typically matches order count unless configured differently
            existing.guests += transaction.guestCount || 1;
            hourlyData.set(hour, existing);
        });
        return hourlyData;
    }
    /**
     * Process raw labor data into hourly format
     */
    processLaborData(laborData) {
        const hourlyData = new Map();
        // Initialize all 24 hours
        for (let hour = 0; hour < 24; hour++) {
            hourlyData.set(hour, { hours: 0, dollars: 0 });
        }
        // Process labor shifts
        laborData.forEach(shift => {
            if (!shift.startTime || !shift.endTime || !shift.hours)
                return;
            const startTime = new Date(shift.startTime);
            const endTime = new Date(shift.endTime);
            const totalHours = parseFloat(shift.hours) || 0;
            const totalCost = parseFloat(shift.cost) || 0;
            // Distribute hours across the shift duration
            let currentTime = new Date(startTime);
            const hourlyRate = totalCost / totalHours;
            while (currentTime < endTime) {
                let hour = currentTime.getHours();
                // Adjust for restaurant day (3 AM start)
                if (hour < 3) {
                    hour += 24;
                }
                hour = hour % 24;
                const nextHour = new Date(currentTime);
                nextHour.setHours(currentTime.getHours() + 1, 0, 0, 0);
                const hoursInThisHour = Math.min((Math.min(nextHour.getTime(), endTime.getTime()) - currentTime.getTime()) / (1000 * 60 * 60), 1);
                if (hoursInThisHour > 0) {
                    const existing = hourlyData.get(hour) || { hours: 0, dollars: 0 };
                    existing.hours += hoursInThisHour;
                    existing.dollars += hoursInThisHour * hourlyRate;
                    hourlyData.set(hour, existing);
                }
                currentTime = nextHour;
            }
        });
        return hourlyData;
    }
    /**
     * Calculate business metrics according to the rules
     */
    calculateMetrics(sales, orders, guests, laborHours, laborDollars) {
        // Guest Average = Gross/Net Sales ÷ Guests
        const guestAverage = guests > 0 ? sales / guests : 0;
        // Order Average = Gross/Net Sales ÷ Orders
        const orderAverage = orders > 0 ? sales / orders : 0;
        // Labor Percent calculation with special rules
        let laborPercent = 0;
        if (laborHours === 0) {
            // No labor hours = 0.00%
            laborPercent = 0;
        }
        else if (sales === 0) {
            // Labor hours exist but no sales = 100.00%
            laborPercent = 100;
        }
        else {
            // Normal calculation: Labor Dollars ÷ Gross/Net Sales × 100
            laborPercent = (laborDollars / sales) * 100;
        }
        return { guestAverage, orderAverage, laborPercent };
    }
    /**
     * Format hour for display (3:00 AM - 2:00 AM format)
     */
    formatHour(hour24) {
        // Convert to restaurant day format starting at 3 AM
        let displayHour = hour24;
        if (displayHour < 3) {
            displayHour += 24;
        }
        displayHour = displayHour % 24;
        const ampm = displayHour < 12 ? 'AM' : 'PM';
        const hour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour;
        return `${hour12}:00 ${ampm}`;
    }
    /**
     * Get Sales and Labor Report for a specific location and date
     */
    async getSalesLaborReport(locationId, date) {
        try {
            const config = await this.getBrinkConfig();
            if (!config) {
                throw new Error('PAR Brink configuration not found');
            }
            const location = config.locations.find(loc => loc.locationId === locationId && loc.isActive);
            if (!location) {
                throw new Error(`Location ${locationId} not found or inactive`);
            }
            // Use today's date if not specified
            const reportDate = date || new Date().toISOString().split('T')[0];
            // Fetch data from Brink API
            const [salesData, laborData] = await Promise.all([
                this.fetchSalesData(locationId, location.token, reportDate),
                this.fetchLaborData(locationId, location.token, reportDate)
            ]);
            // Process data into hourly format
            const hourlySales = this.processSalesData(salesData);
            const hourlyLabor = this.processLaborData(laborData);
            // Build hourly report data
            const hourlyData = [];
            let totals = {
                netSales: 0,
                guests: 0,
                orders: 0,
                laborHours: 0,
                laborDollars: 0
            };
            // Generate data for all 24 hours (starting at 3 AM)
            for (let i = 0; i < 24; i++) {
                const hour24 = (i + 3) % 24; // Start at 3 AM
                const sales = hourlySales.get(hour24) || { sales: 0, orders: 0, guests: 0 };
                const labor = hourlyLabor.get(hour24) || { hours: 0, dollars: 0 };
                const metrics = this.calculateMetrics(sales.sales, sales.orders, sales.guests, labor.hours, labor.dollars);
                const hourData = {
                    hour: this.formatHour((i + 3) % 24),
                    netSales: sales.sales,
                    guests: sales.guests,
                    guestAverage: metrics.guestAverage,
                    orders: sales.orders,
                    orderAverage: metrics.orderAverage,
                    laborHours: labor.hours,
                    laborDollars: labor.dollars,
                    laborPercent: metrics.laborPercent
                };
                hourlyData.push(hourData);
                // Add to totals
                totals.netSales += sales.sales;
                totals.guests += sales.guests;
                totals.orders += sales.orders;
                totals.laborHours += labor.hours;
                totals.laborDollars += labor.dollars;
            }
            // Calculate total metrics
            const totalMetrics = this.calculateMetrics(totals.netSales, totals.orders, totals.guests, totals.laborHours, totals.laborDollars);
            const totalData = {
                hour: 'Total',
                netSales: totals.netSales,
                guests: totals.guests,
                guestAverage: totalMetrics.guestAverage,
                orders: totals.orders,
                orderAverage: totalMetrics.orderAverage,
                laborHours: totals.laborHours,
                laborDollars: totals.laborDollars,
                laborPercent: totalMetrics.laborPercent
            };
            const report = {
                locationId: location.locationId,
                locationName: location.name,
                date: reportDate,
                reportDate: new Date(reportDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                }),
                hourlyData,
                totals: totalData
            };
            return report;
        }
        catch (error) {
            console.error('Error generating sales and labor report:', error);
            return null;
        }
    }
    /**
     * Get reports for all active locations
     */
    async getAllLocationReports(date) {
        try {
            const config = await this.getBrinkConfig();
            if (!config) {
                throw new Error('PAR Brink configuration not found');
            }
            const activeLocations = config.locations.filter(loc => loc.isActive);
            const reports = [];
            for (const location of activeLocations) {
                try {
                    const report = await this.getSalesLaborReport(location.locationId, date);
                    if (report) {
                        reports.push(report);
                    }
                }
                catch (error) {
                    console.error(`Error getting report for location ${location.name}:`, error);
                }
            }
            return reports;
        }
        catch (error) {
            console.error('Error getting all location reports:', error);
            return [];
        }
    }
    /**
     * Test connection to Brink API for a specific location
     */
    async testConnection(locationId) {
        try {
            const config = await this.getBrinkConfig();
            if (!config) {
                return { success: false, message: 'PAR Brink configuration not found' };
            }
            const location = locationId
                ? config.locations.find(loc => loc.locationId === locationId)
                : config.locations.find(loc => loc.isActive);
            if (!location) {
                return {
                    success: false,
                    message: locationId ? `Location ${locationId} not found` : 'No active locations found'
                };
            }
            // Test with a simple API call
            const endpoint = `/api/location/info/${location.locationId}`;
            const response = await this.brinkApiRequest(endpoint, location.token);
            return {
                success: true,
                message: `Successfully connected to ${location.name}`,
                details: {
                    locationId: location.locationId,
                    locationName: location.name,
                    response: response
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: error?.message || 'Connection test failed',
                details: error
            };
        }
    }
}
exports.BrinkSalesLaborService = BrinkSalesLaborService;
//# sourceMappingURL=BrinkSalesLaborService.js.map