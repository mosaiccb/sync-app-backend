"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parBrinkDashboard = parBrinkDashboard;
const functions_1 = require("@azure/functions");
const axios_1 = __importDefault(require("axios"));
/**
 * PAR Brink Dashboard Function
 * Retrieves real-time sales and labor data for dashboard visualization
 */
async function parBrinkDashboard(request, context) {
    try {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
        }
        context.log('PAR Brink Dashboard request started');
        // Get request parameters
        const body = await request.json();
        const { locationToken, accessToken, businessDate } = body;
        if (!locationToken || !accessToken) {
            context.log('Missing required parameters');
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'Missing required parameters: locationToken and accessToken are required'
                }
            };
        }
        // Get location name from token (using the same mapping as PowerShell script)
        const locationMapping = getLocationMapping();
        const locationInfo = locationMapping[locationToken];
        if (!locationInfo) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'Invalid location token'
                }
            };
        }
        // Use current date if not specified
        const targetDate = businessDate || getCurrentMountainTime();
        context.log(`Fetching data for location: ${locationInfo.name} on date: ${targetDate}`);
        // Fetch sales data
        const salesData = await fetchParBrinkSalesData(accessToken, locationToken, targetDate, context);
        // Fetch labor data (placeholder - would need to integrate with UKG or other labor system)
        const laborData = await fetchLaborData(locationInfo.id, targetDate, context);
        // Process data into hourly format
        const hourlySales = processHourlySalesData(salesData);
        const hourlyLabor = processHourlyLaborData(laborData);
        // Calculate totals and metrics
        const totalSales = hourlySales.reduce((sum, hour) => sum + hour.sales, 0);
        const totalGuests = hourlySales.reduce((sum, hour) => sum + hour.guests, 0);
        const totalOrders = hourlySales.reduce((sum, hour) => sum + hour.orders, 0);
        const totalLaborCost = hourlyLabor.reduce((sum, hour) => sum + hour.laborCost, 0);
        const totalLaborHours = hourlyLabor.reduce((sum, hour) => sum + hour.hoursWorked, 0);
        const laborPercentage = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;
        const overallGuestAverage = totalGuests > 0 ? totalSales / totalGuests : 0;
        const dashboardData = {
            location: locationInfo.name,
            locationId: locationInfo.id,
            businessDate: targetDate,
            hourlySales,
            hourlyLabor,
            totalSales,
            totalGuests,
            totalOrders,
            totalLaborCost,
            totalLaborHours,
            laborPercentage,
            overallGuestAverage
        };
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: true,
                data: dashboardData
            }
        };
    }
    catch (error) {
        context.error('Error in PAR Brink Dashboard:', error);
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
async function fetchParBrinkSalesData(accessToken, locationToken, businessDate, context) {
    try {
        const headers = {
            'AccessToken': accessToken,
            'LocationToken': locationToken,
            'Content-Type': 'text/xml',
            'SOAPAction': 'http://www.brinksoftware.com/webservices/sales/v2/ISalesWebService2/GetOrders'
        };
        // Convert to Mountain Time format
        const mtDate = convertToMountainTime(businessDate);
        const mtNow = getCurrentMountainTime(true);
        const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
        <soapenv:Header/>
        <soapenv:Body>
          <v2:GetOrders>
            <v2:request>
              <v2:BusinessDate>${mtDate}</v2:BusinessDate>
              <v2:ModifiedTime>
                <sys:DateTime>${mtNow}</sys:DateTime>
                <sys:OffsetMinutes>-420</sys:OffsetMinutes>
              </v2:ModifiedTime>
            </v2:request>
          </v2:GetOrders>
        </soapenv:Body>
      </soapenv:Envelope>
    `;
        context.log('Making PAR Brink API call...');
        const response = await axios_1.default.post('https://api11.brinkpos.net/sales2.svc', soapBody, { headers });
        // Parse XML response
        const xmlData = response.data;
        const orders = parseOrdersFromXML(xmlData);
        context.log(`Retrieved ${orders.length} orders from PAR Brink`);
        return orders;
    }
    catch (error) {
        context.error('Error fetching PAR Brink sales data:', error);
        return [];
    }
}
async function fetchLaborData(locationId, businessDate, context) {
    try {
        // This would integrate with UKG or other labor system
        // For now, return mock data structure
        context.log(`Fetching labor data for location ${locationId} on ${businessDate}`);
        // In a real implementation, this would call UKG API or SQL database
        return [];
    }
    catch (error) {
        context.error('Error fetching labor data:', error);
        return [];
    }
}
function processHourlySalesData(orders) {
    const hourlyData = {};
    // Initialize hourly buckets (3AM to 2AM next day)
    const hours = [];
    for (let i = 3; i <= 23; i++) {
        hours.push(`${i.toString().padStart(2, '0')}:00`);
    }
    for (let i = 0; i <= 2; i++) {
        hours.push(`${i.toString().padStart(2, '0')}:00`);
    }
    hours.forEach(hour => {
        hourlyData[hour] = {
            hour,
            sales: 0,
            guests: 0,
            orders: 0,
            guestAverage: 0
        };
    });
    // Process each order
    orders.forEach(order => {
        if (!order.firstsendtime?.DateTime || order.firstsendtime.nil)
            return;
        const orderTime = new Date(order.firstsendtime.DateTime);
        const hour = `${orderTime.getHours().toString().padStart(2, '0')}:00`;
        if (hourlyData[hour]) {
            hourlyData[hour].sales += order.Total || 0;
            hourlyData[hour].orders += 1;
            // Count guests (assuming 1 guest per order for now - could be enhanced)
            hourlyData[hour].guests += 1;
            // Calculate guest average
            hourlyData[hour].guestAverage = hourlyData[hour].guests > 0
                ? hourlyData[hour].sales / hourlyData[hour].guests
                : 0;
        }
    });
    return hours.map(hour => hourlyData[hour]);
}
function processHourlyLaborData(punches) {
    const hourlyData = {};
    // Initialize hourly buckets (24-hour format)
    const hours = [];
    for (let i = 0; i <= 23; i++) {
        hours.push(`${i.toString().padStart(2, '0')}:00`);
    }
    // Initialize all hours with zero data
    hours.forEach(hour => {
        hourlyData[hour] = {
            hour,
            laborCost: 0,
            hoursWorked: 0,
            employeesWorking: 0
        };
    });
    // Process actual punch data if available
    if (punches && punches.length > 0) {
        punches.forEach(punch => {
            try {
                const punchDate = new Date(punch['local Time']);
                const hour = `${punchDate.getHours().toString().padStart(2, '0')}:00`;
                if (hourlyData[hour]) {
                    // This is a simplified calculation - in reality you'd need to:
                    // 1. Calculate actual hours worked from punch in/out pairs
                    // 2. Get employee hourly rates from your system
                    // 3. Handle overtime, breaks, etc.
                    hourlyData[hour].employeesWorking += 1;
                    // You would calculate actual hours and costs based on your labor system
                }
            }
            catch (error) {
                // Skip invalid punch records
            }
        });
    }
    return hours.map(hour => hourlyData[hour]);
}
function parseOrdersFromXML(xmlData) {
    try {
        if (!xmlData || xmlData.trim() === '') {
            return [];
        }
        // Real XML parsing logic would go here
        // For now, return empty array until real PAR Brink XML response is received
        // TODO: Implement actual XML parsing based on PAR Brink GetOrders response format
        // Sample real implementation would use xml2js or similar:
        // const parser = new xml2js.Parser();
        // const result = await parser.parseStringPromise(xmlData);
        // Extract order data from result and map to SalesOrder interface
        return [];
    }
    catch (error) {
        console.error('Error parsing XML orders:', error);
        return [];
    }
}
function getLocationMapping() {
    return {
        "RPNrrDYtnke+OHNLfy74/A==": { name: "Castle Rock", id: "109" },
        "16U5e0+GFEW/ixlKo+VJhg==": { name: "Centre", id: "159" },
        "xQwecGX8lUGnpLlTbheuug==": { name: "Creekwalk", id: "651" },
        "BhFEGI1ffUi1CLVe8/qtKw==": { name: "Crown Point", id: "479" },
        "XbEjtd0tKkavxcJ043UsUg==": { name: "Diamond Circle", id: "204133" },
        "kRRYZ8SCiUatilX4KO7dBg==": { name: "Dublin Commons", id: "20408" },
        "dWQm28UaeEq0qStmvTfACg==": { name: "Falcon Landing", id: "67" },
        "Q58QIT+t+kGf9tzqHN2OCA==": { name: "Forest Trace", id: "188" },
        "2LUEj0hnMk+kCQlUcySYBQ==": { name: "Greeley", id: "354" },
        "x/S/SDwyrEem54+ZoCILeg==": { name: "Highlands Ranch", id: "204049" },
        "gAAbGt6udki8DwPMkonciA==": { name: "Johnstown", id: "722" },
        "37CE8WDS8k6isMGLMB9PRA==": { name: "Lowry", id: "619" },
        "7yC7X4KjZEuoZCDviTwspA==": { name: "McCastlin Marketplace", id: "161" },
        "SUsjq0mEck6HwRkd7uNACg==": { name: "Northfield Commons", id: "336" },
        "M4X3DyDrLUKwi3CQHbqlOQ==": { name: "Polaris Pointe", id: "1036" },
        "38AZmQGFQEy5VNajl9utlA==": { name: "Park Meadows", id: "26" },
        "ZOJMZlffDEqC849w6PnF0g==": { name: "Ralston Creek", id: "441" },
        "A2dHEwIh9USNnpMrXCrpQw==": { name: "Sheridan Parkway", id: "601" },
        "y4xlWfqFJEuvmkocDGZGtw==": { name: "South Academy Highlands", id: "204047" },
        "6OwU+/7IOka+PV9JzAgzYQ==": { name: "Tower", id: "579" },
        "YUn21EMuwki+goWuIJ5yGg==": { name: "Wellington", id: "652" },
        "OpM9o1kTOkyMM2vevMMqdw==": { name: "Westminster Promenade", id: "202794" }
    };
}
function getCurrentMountainTime(includeTime = false) {
    const now = new Date();
    const mountainTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Denver" }));
    if (includeTime) {
        return mountainTime.toISOString().slice(0, 19);
    }
    return mountainTime.toISOString().slice(0, 10);
}
function convertToMountainTime(dateString) {
    const date = new Date(dateString);
    const mountainTime = new Date(date.toLocaleString("en-US", { timeZone: "America/Denver" }));
    return mountainTime.toISOString().slice(0, 10);
}
// Register the function
functions_1.app.http('parBrinkDashboard', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/dashboard',
    handler: parBrinkDashboard
});
//# sourceMappingURL=parBrinkDashboard.js.map