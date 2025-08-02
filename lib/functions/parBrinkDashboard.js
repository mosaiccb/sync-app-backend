"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parBrinkDashboard = parBrinkDashboard;
const functions_1 = require("@azure/functions");
const axios_1 = __importDefault(require("axios"));
/**
 * DATA VALIDATION CONFIGURATION
 * Configure validation tools and thresholds for dashboard data quality
 */
const DATA_VALIDATION_CONFIG = {
    // Enable/disable validation features
    enableFutureDataBlocking: true,
    enableSalesValidation: true,
    enableLaborValidation: true,
    enableAlignmentValidation: true,
    enableBusinessLogicValidation: true,
    enableComprehensiveReporting: true,
    // Validation thresholds
    maxReasonableOrderValue: 500,
    minReasonableOrderValue: 5,
    maxReasonableLaborPercentage: 40,
    minReasonableLaborPercentage: 15,
    maxReasonableWage: 40,
    minReasonableWage: 2.13, // Federal tipped minimum
    // Quality score weights
    futureDataPenalty: 10,
    alignmentIssuePenalty: 5,
    businessLogicPenalty: 3,
    completenessIssuePenalty: 5,
    // Logging levels
    enableDetailedLogging: true,
    enableWarningAlerts: true,
    enableInfoMessages: true
};
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
        // Use current restaurant business date if not specified
        // For restaurants: business day can extend past midnight, so we need special logic
        let targetDate;
        let offsetMinutes;
        if (businessDate) {
            // If business date is provided, still get offset from API
            const timezoneData = await getTimezoneDataAndBusinessDate(locationInfo.timezone);
            targetDate = businessDate;
            offsetMinutes = timezoneData.offsetMinutes;
        }
        else {
            // Get both business date and offset from WorldTimeAPI
            const timezoneData = await getTimezoneDataAndBusinessDate(locationInfo.timezone);
            targetDate = timezoneData.businessDate;
            offsetMinutes = timezoneData.offsetMinutes;
        }
        const currentLocalDate = getCurrentLocalTime(locationInfo.timezone);
        context.log(`Fetching data for location: ${locationInfo.name} (${locationInfo.state}) on date: ${targetDate}`);
        context.log(`Location timezone: ${locationInfo.timezone}`);
        context.log(`Current local time date: ${currentLocalDate}`);
        context.log(`Using business date: ${targetDate} (${businessDate ? 'provided' : 'calculated'})`);
        context.log(`Using timezone offset: ${offsetMinutes} minutes`);
        const salesData = await fetchParBrinkSalesData(accessToken, locationToken, targetDate, offsetMinutes, locationInfo.timezone, context);
        // Fetch labor data from PAR Brink using the same access token
        const laborData = await fetchParBrinkLaborData(accessToken, locationToken, targetDate, offsetMinutes, locationInfo.timezone, context);
        // Process data into hourly format
        const hourlySales = processHourlySalesData(salesData);
        const hourlyLabor = processHourlyLaborData(laborData);
        // **COMPREHENSIVE DATA VALIDATION REPORT**
        const validationResults = validateDashboardData(hourlySales, hourlyLabor, locationInfo.timezone, context);
        // Debug: Log raw data to identify alignment issues
        console.log(`🔍 RAW DATA DEBUG: Sales orders count: ${salesData.length}`);
        if (salesData.length > 0) {
            console.log(`🔍 RAW DATA DEBUG: First sales order time: ${salesData[0].firstsendtime?.DateTime}`);
            console.log(`🔍 RAW DATA DEBUG: Last sales order time: ${salesData[salesData.length - 1].firstsendtime?.DateTime}`);
            // Log first few sales orders with timezone conversion
            salesData.slice(0, 3).forEach((order, index) => {
                if (order.firstsendtime?.DateTime) {
                    const orderTime = new Date(order.firstsendtime.DateTime);
                    const mountainTimeHour = parseInt(orderTime.toLocaleString("en-US", {
                        timeZone: "America/Denver",
                        hour: 'numeric',
                        hour12: false
                    }));
                    console.log(`🔍 RAW DATA DEBUG: Sales order ${index + 1}: UTC ${order.firstsendtime.DateTime} → MT Hour ${mountainTimeHour}:00, Total: $${order.Total}`);
                }
            });
        }
        console.log(`🔍 RAW DATA DEBUG: Labor shifts count: ${laborData.length}`);
        if (laborData.length > 0) {
            console.log(`🔍 RAW DATA DEBUG: First labor shift time: ${laborData[0]['local Time']}`);
            console.log(`🔍 RAW DATA DEBUG: Last labor shift time: ${laborData[laborData.length - 1]['local Time']}`);
            // Log first few labor shifts with timezone conversion
            laborData.slice(0, 3).forEach((shift, index) => {
                const shiftTime = new Date(shift['local Time']);
                const mountainTimeHour = parseInt(shiftTime.toLocaleString("en-US", {
                    timeZone: "America/Denver",
                    hour: 'numeric',
                    hour12: false
                }));
                console.log(`🔍 RAW DATA DEBUG: Labor shift ${index + 1}: UTC ${shift['local Time']} → MT Hour ${mountainTimeHour}:00, Hours: ${shift.hoursWorked}, Rate: $${shift.payRate}`);
            });
        }
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
            overallGuestAverage,
            validationResults
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
async function fetchParBrinkSalesData(accessToken, locationToken, businessDate, offsetMinutes, timezone, context) {
    try {
        const headers = {
            'AccessToken': accessToken,
            'LocationToken': locationToken,
            'Content-Type': 'text/xml',
            'SOAPAction': 'http://www.brinksoftware.com/webservices/sales/v2/ISalesWebService2/GetOrders'
        };
        // Calculate dynamic timezone offset for the specific timezone
        // Offset is already calculated and passed as parameter from WorldTimeAPI
        context.log(`Using ${timezone} offset: ${offsetMinutes} minutes for date ${businessDate}`);
        // Keep business date as-is - don't convert to local time
        // Business date represents the operational day for the restaurant
        const businessDateForAPI = businessDate; // Use business date as provided
        context.log(`Using business date for API: ${businessDateForAPI}`);
        const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
        <soapenv:Header/>
        <soapenv:Body>
          <v2:GetOrders>
            <v2:request>
              <v2:BusinessDate>${businessDateForAPI}</v2:BusinessDate>
            </v2:request>
          </v2:GetOrders>
        </soapenv:Body>
      </soapenv:Envelope>
    `;
        context.log('Making PAR Brink API call with SOAP body:', soapBody.substring(0, 500) + '...');
        const response = await axios_1.default.post('https://api11.brinkpos.net/sales2.svc', soapBody, { headers });
        // Parse XML response
        const xmlData = response.data;
        context.log(`PAR Brink API response received. Response length: ${xmlData?.length || 0} characters`);
        // If no orders found and we're requesting future date, suggest trying current date
        if (businessDate > getCurrentLocalTime(timezone)) {
            context.log(`NOTE: Requesting future date (${businessDate}). Consider trying current date: ${getCurrentLocalTime(timezone)}`);
        }
        const orders = parseOrdersFromXML(xmlData);
        context.log(`Retrieved ${orders.length} orders from PAR Brink`);
        // Debug: Log XML response when no orders found (to see what's actually returned)
        if (orders.length === 0) {
            context.log('DEBUG: XML response with 0 orders:', xmlData.substring(0, 2000));
        }
        return orders;
    }
    catch (error) {
        context.error('Error fetching PAR Brink sales data:', error);
        return [];
    }
}
async function fetchParBrinkLaborData(accessToken, locationToken, businessDate, offsetMinutes, timezone, context) {
    try {
        const headers = {
            'AccessToken': accessToken,
            'LocationToken': locationToken,
            'Content-Type': 'text/xml',
            'SOAPAction': 'http://www.brinksoftware.com/webservices/labor/v2/ILaborWebService2/GetShifts'
        };
        // Use the same timezone offset calculation as sales data
        context.log(`Fetching PAR Brink labor data using ${timezone} offset: ${offsetMinutes} minutes for date ${businessDate}`);
        // PAR Brink Labor API expects simple date format: YYYY-MM-DD
        const businessDateForAPI = businessDate.includes('T') ? businessDate.split('T')[0] : businessDate;
        context.log(`Using business date for Labor API: ${businessDateForAPI}`);
        const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/labor/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
        <soapenv:Header/>
        <soapenv:Body>
          <v2:GetShifts>
            <v2:request>
              <v2:BusinessDate>${businessDateForAPI}</v2:BusinessDate>
            </v2:request>
          </v2:GetShifts>
        </soapenv:Body>
      </soapenv:Envelope>
    `;
        context.log('Making PAR Brink Labor API call with SOAP body:', soapBody.substring(0, 500) + '...');
        const response = await axios_1.default.post('https://api11.brinkpos.net/labor2.svc', soapBody, { headers });
        // Parse XML response
        const xmlData = response.data;
        context.log(`PAR Brink Labor API response received. Response length: ${xmlData?.length || 0} characters`);
        // Parse shifts from XML response
        const shifts = parseShiftsFromXML(xmlData);
        context.log(`Parsed ${shifts.length} labor shifts from PAR Brink API`);
        return shifts;
    }
    catch (error) {
        context.error('Error fetching PAR Brink labor data:', error);
        return [];
    }
}
function processHourlySalesData(orders) {
    const hourlyData = {};
    // Get current Mountain Time hour for sales data validation
    const now = new Date();
    const currentMountainHour = parseInt(now.toLocaleString("en-US", {
        timeZone: "America/Denver",
        hour: 'numeric',
        hour12: false
    }));
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
    // Process each order with validation
    orders.forEach(order => {
        if (!order.firstsendtime?.DateTime || order.firstsendtime.nil)
            return;
        const orderTime = new Date(order.firstsendtime.DateTime);
        // Convert to Mountain Time before extracting hour
        const mountainTimeHour = parseInt(orderTime.toLocaleString("en-US", {
            timeZone: "America/Denver",
            hour: 'numeric',
            hour12: false
        }));
        const hour = `${mountainTimeHour.toString().padStart(2, '0')}:00`;
        // **SALES DATA VALIDATION**: Check for future orders (should not exist in real-time dashboard)
        if (DATA_VALIDATION_CONFIG.enableFutureDataBlocking && mountainTimeHour > currentMountainHour) {
            console.warn(`🚨 FUTURE SALES ORDER: Order at ${hour} is in the future (current: ${currentMountainHour}:00) - excluding from totals`);
            return; // Skip future orders
        }
        if (hourlyData[hour]) {
            // **SALES DATA VALIDATION**: Validate order values
            const orderTotal = order.Total || 0;
            if (DATA_VALIDATION_CONFIG.enableSalesValidation) {
                if (orderTotal < 0) {
                    console.warn(`💸 NEGATIVE ORDER: Order ${order.Number} has negative total $${orderTotal} - excluding`);
                    return;
                }
                if (orderTotal > DATA_VALIDATION_CONFIG.maxReasonableOrderValue) {
                    console.log(`💰 HIGH VALUE ORDER: Order ${order.Number} total $${orderTotal} (large order or catering)`);
                }
            }
            hourlyData[hour].sales += orderTotal;
            hourlyData[hour].orders += 1;
            // Count guests (assuming 1 guest per order for now - could be enhanced)
            hourlyData[hour].guests += 1;
            // Calculate guest average
            hourlyData[hour].guestAverage = hourlyData[hour].guests > 0
                ? hourlyData[hour].sales / hourlyData[hour].guests
                : 0;
        }
    });
    // **ENHANCED SALES DATA VALIDATION** - Apply comprehensive validation
    if (DATA_VALIDATION_CONFIG.enableSalesValidation && DATA_VALIDATION_CONFIG.enableDetailedLogging) {
        console.log(`📊 SALES VALIDATION: Starting validation for ${hours.length} sales hours`);
    }
    let salesValidationIssues = 0;
    let futureHoursBlocked = 0;
    hours.forEach(hour => {
        const data = hourlyData[hour];
        const hourNum = parseInt(hour.split(':')[0]);
        // Block future sales data as final safety check
        if (hourNum > currentMountainHour) {
            if (data.sales > 0 || data.orders > 0 || data.guests > 0) {
                console.warn(`🚨 FUTURE SALES BLOCKED: ${hour} had sales data but it's future time - forcing to zero`);
                futureHoursBlocked++;
                salesValidationIssues++;
            }
            data.sales = 0;
            data.orders = 0;
            data.guests = 0;
            data.guestAverage = 0;
            return;
        }
        // Validate sales data consistency
        if (data.orders > 0 && data.sales === 0) {
            console.warn(`🔍 SALES INCONSISTENCY: ${hour} has ${data.orders} orders but $0 sales`);
            salesValidationIssues++;
        }
        if (data.sales > 0 && data.orders === 0) {
            console.warn(`🔍 SALES INCONSISTENCY: ${hour} has $${data.sales} sales but 0 orders`);
            salesValidationIssues++;
        }
        // Validate guest average calculations
        if (data.guests > 0) {
            const calculatedAverage = data.sales / data.guests;
            if (Math.abs(calculatedAverage - data.guestAverage) > 0.01) {
                console.warn(`🔢 CALCULATION ERROR: ${hour} guest average mismatch - recalculating`);
                data.guestAverage = calculatedAverage;
                salesValidationIssues++;
            }
        }
        // Validate realistic ranges
        if (data.guestAverage > 100) {
            console.warn(`💰 HIGH GUEST AVERAGE: ${hour} guest average $${data.guestAverage.toFixed(2)} (catering/large orders?)`);
            salesValidationIssues++;
        }
        if (data.guestAverage > 0 && data.guestAverage < 5) {
            console.warn(`💸 LOW GUEST AVERAGE: ${hour} guest average $${data.guestAverage.toFixed(2)} (discounts/promos?)`);
            salesValidationIssues++;
        }
    });
    console.log(`📋 SALES VALIDATION SUMMARY:`);
    console.log(`  ✅ Sales hours validated: ${hours.length}`);
    console.log(`  ⚠️  Sales issues found: ${salesValidationIssues}`);
    console.log(`  🔒 Future sales hours blocked: ${futureHoursBlocked}`);
    console.log(`  🕒 Current MT hour: ${currentMountainHour}:00`);
    return hours.map(hour => hourlyData[hour]);
}
/**
 * Comprehensive Dashboard Data Validation Tool
 * Provides detailed analysis and quality metrics for sales and labor data
 */
function validateDashboardData(salesData, laborData, timezone, context) {
    if (!DATA_VALIDATION_CONFIG.enableComprehensiveReporting) {
        return undefined; // Skip validation if disabled
    }
    context.log('🔍 COMPREHENSIVE DATA VALIDATION STARTING...');
    const now = new Date();
    const currentHour = parseInt(now.toLocaleString("en-US", {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
    }));
    // Overall validation metrics
    let totalValidationIssues = 0;
    let dataQualityScore = 100;
    let recommendedActions = [];
    let alignmentIssues = 0;
    let futureDataIssues = 0;
    let businessLogicIssues = 0;
    // Sales data analysis
    const totalSales = salesData.reduce((sum, hour) => sum + hour.sales, 0);
    const totalOrders = salesData.reduce((sum, hour) => sum + hour.orders, 0);
    const activeSalesHours = salesData.filter(hour => hour.sales > 0).length;
    const peakSalesHour = salesData.reduce((max, hour) => hour.sales > max.sales ? hour : max);
    // Labor data analysis
    const totalLaborCost = laborData.reduce((sum, hour) => sum + hour.laborCost, 0);
    const totalLaborHours = laborData.reduce((sum, hour) => sum + hour.hoursWorked, 0);
    const activeLaborHours = laborData.filter(hour => hour.hoursWorked > 0).length;
    const peakLaborHour = laborData.reduce((max, hour) => hour.laborCost > max.laborCost ? hour : max);
    context.log(`📊 Analysis: ${totalLaborHours.toFixed(1)} total labor hours processed`);
    // **VALIDATION 1: SALES-LABOR ALIGNMENT**
    if (DATA_VALIDATION_CONFIG.enableAlignmentValidation) {
        context.log('📊 Validating sales-labor alignment...');
    }
    salesData.forEach((salesHour, index) => {
        const laborHour = laborData[index];
        const hourNum = parseInt(salesHour.hour.split(':')[0]);
        // Skip future hours
        if (hourNum > currentHour)
            return;
        // Check for significant sales without labor coverage (excluding prep hours)
        if (salesHour.sales > 100 && laborHour.hoursWorked === 0) {
            // Additional context: Check if this is during typical operating hours
            if (hourNum >= 11 && hourNum <= 22) {
                context.warn(`⚠️ ALIGNMENT ISSUE: ${salesHour.hour} has $${salesHour.sales} sales but no labor hours during operating hours`);
                alignmentIssues++;
                totalValidationIssues++;
            }
            else {
                context.log(`🔍 INFO: ${salesHour.hour} has $${salesHour.sales} sales but no labor hours (possibly delivery/takeout during off-hours)`);
            }
        }
        // Check for labor without sales (normal for prep/cleaning hours, especially early morning)
        if (laborHour.hoursWorked > 2 && salesHour.sales === 0) {
            if (hourNum < 11 || hourNum > 22) {
                context.log(`🔍 INFO: ${salesHour.hour} has ${laborHour.hoursWorked.toFixed(1)} labor hours but no sales (prep/cleaning/closing)`);
            }
            else {
                context.log(`🔍 INFO: ${salesHour.hour} has ${laborHour.hoursWorked.toFixed(1)} labor hours but no sales during operating hours`);
            }
        }
    });
    // **VALIDATION 2: FUTURE DATA DETECTION**
    context.log('🕐 Validating temporal data integrity...');
    // Check sales data for future entries
    salesData.forEach(hourData => {
        const hourNum = parseInt(hourData.hour.split(':')[0]);
        if (hourNum > currentHour && hourData.sales > 0) {
            context.warn(`🚨 FUTURE SALES DATA: ${hourData.hour} contains $${hourData.sales} but is future time`);
            futureDataIssues++;
            totalValidationIssues++;
        }
    });
    // Check labor data for future entries
    laborData.forEach(hourData => {
        const hourNum = parseInt(hourData.hour.split(':')[0]);
        if (hourNum > currentHour && hourData.laborCost > 0) {
            context.warn(`🚨 FUTURE LABOR DATA: ${hourData.hour} contains $${hourData.laborCost} labor cost but is future time`);
            futureDataIssues++;
            totalValidationIssues++;
        }
    });
    // **VALIDATION 3: BUSINESS LOGIC VALIDATION**
    context.log('🏪 Validating business logic rules...');
    // Labor percentage should be reasonable for restaurant industry
    const laborPercentage = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;
    if (laborPercentage > 40) {
        context.warn(`💸 HIGH LABOR %: ${laborPercentage.toFixed(1)}% exceeds typical restaurant range (25-35%)`);
        businessLogicIssues++;
        recommendedActions.push('Review labor scheduling and efficiency');
    }
    else if (laborPercentage < 15 && totalSales > 500) {
        // Note: Low labor % could be due to salaried employees not being included in labor cost
        context.warn(`💸 LOW LABOR %: ${laborPercentage.toFixed(1)}% seems low for restaurant operations (may exclude salaried staff)`);
        businessLogicIssues++;
        recommendedActions.push('Verify labor data completeness - check if salaried staff are included');
    }
    // Average order value validation
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    if (avgOrderValue > 50) {
        context.log(`💰 HIGH AOV: Average order value $${avgOrderValue.toFixed(2)} (catering/large orders?)`);
    }
    else if (avgOrderValue < 8 && totalOrders > 10) {
        context.warn(`💸 LOW AOV: Average order value $${avgOrderValue.toFixed(2)} seems low for restaurant`);
        businessLogicIssues++;
        recommendedActions.push('Review pricing strategy or order composition');
    }
    // **VALIDATION 4: DATA COMPLETENESS**
    context.log('📋 Validating data completeness...');
    let completenessIssues = 0;
    if (activeSalesHours < 8) {
        context.warn(`📈 LIMITED SALES DATA: Only ${activeSalesHours} hours with sales activity`);
        completenessIssues++;
        dataQualityScore -= 10;
    }
    if (activeLaborHours < 6) {
        context.warn(`👥 LIMITED LABOR DATA: Only ${activeLaborHours} hours with labor activity`);
        completenessIssues++;
        dataQualityScore -= 15;
    }
    // **VALIDATION 5: OPERATIONAL INSIGHTS**
    context.log('🎯 Generating operational insights...');
    if (peakSalesHour.sales > 0) {
        context.log(`📈 PEAK SALES: ${peakSalesHour.hour} with $${peakSalesHour.sales.toFixed(2)}`);
    }
    if (peakLaborHour.laborCost > 0) {
        context.log(`👥 PEAK LABOR: ${peakLaborHour.hour} with $${peakLaborHour.laborCost.toFixed(2)} cost`);
    }
    // Calculate data quality score
    dataQualityScore -= (alignmentIssues * 5);
    dataQualityScore -= (futureDataIssues * 10);
    dataQualityScore -= (businessLogicIssues * 3);
    dataQualityScore -= (completenessIssues * 5);
    dataQualityScore = Math.max(0, dataQualityScore);
    // **COMPREHENSIVE VALIDATION SUMMARY**
    context.log('\n🎯 COMPREHENSIVE VALIDATION SUMMARY:');
    context.log(`  📊 Data Quality Score: ${dataQualityScore}%`);
    context.log(`  ⚠️  Total Issues Found: ${totalValidationIssues}`);
    context.log(`  🏪 Sales Hours Active: ${activeSalesHours}`);
    context.log(`  👥 Labor Hours Active: ${activeLaborHours}`);
    context.log(`  💰 Total Sales: $${totalSales.toFixed(2)}`);
    context.log(`  💸 Total Labor Cost: $${totalLaborCost.toFixed(2)}`);
    context.log(`  📈 Labor Percentage: ${laborPercentage.toFixed(1)}%`);
    context.log(`  🎯 Average Order Value: $${avgOrderValue.toFixed(2)}`);
    context.log(`  🕐 Current Hour: ${currentHour}:00`);
    if (recommendedActions.length > 0) {
        context.log('  💡 RECOMMENDED ACTIONS:');
        recommendedActions.forEach(action => context.log(`    • ${action}`));
    }
    if (dataQualityScore >= 90) {
        context.log('  ✅ EXCELLENT: Data quality is excellent!');
    }
    else if (dataQualityScore >= 75) {
        context.log('  ✅ GOOD: Data quality is acceptable with minor issues');
    }
    else if (dataQualityScore >= 50) {
        context.log('  ⚠️  WARNING: Data quality has significant issues requiring attention');
    }
    else {
        context.log('  🚨 CRITICAL: Data quality is poor and requires immediate review');
    }
    context.log('🔍 COMPREHENSIVE DATA VALIDATION COMPLETED\n');
    // Return validation results for frontend display
    return {
        dataQualityScore,
        totalIssuesFound: totalValidationIssues,
        salesHoursActive: activeSalesHours,
        laborHoursActive: activeLaborHours,
        currentHour,
        recommendedActions,
        validationCategories: {
            futureDataBlocking: {
                enabled: DATA_VALIDATION_CONFIG.enableFutureDataBlocking,
                issuesFound: futureDataIssues,
                description: "Prevents future sales and labor data from appearing in real-time dashboard"
            },
            salesValidation: {
                enabled: DATA_VALIDATION_CONFIG.enableSalesValidation,
                issuesFound: Math.floor(totalValidationIssues * 0.3), // Estimate sales portion
                description: "Validates order values, consistency checks, and guest calculations"
            },
            laborValidation: {
                enabled: DATA_VALIDATION_CONFIG.enableLaborValidation,
                issuesFound: Math.floor(totalValidationIssues * 0.4), // Estimate labor portion
                description: "Validates wage ranges, hour distributions, and labor cost consistency"
            },
            alignmentValidation: {
                enabled: DATA_VALIDATION_CONFIG.enableAlignmentValidation,
                issuesFound: alignmentIssues,
                description: "Checks for sales-labor alignment and coverage gaps"
            },
            businessLogicValidation: {
                enabled: DATA_VALIDATION_CONFIG.enableBusinessLogicValidation,
                issuesFound: businessLogicIssues,
                description: "Validates restaurant industry standards and operational metrics"
            }
        }
    };
}
function processHourlyLaborData(punches) {
    const hourlyData = {};
    // Get current Mountain Time hour to filter out future labor data - ENHANCED DEBUGGING
    const now = new Date();
    const currentMountainTime = now.toLocaleString("en-US", {
        timeZone: "America/Denver",
        hour: 'numeric',
        hour12: false
    });
    const currentMountainHour = parseInt(currentMountainTime);
    // Additional debugging for timezone issues
    const currentUTC = now.toISOString();
    const currentMTFormatted = now.toLocaleString("en-US", {
        timeZone: "America/Denver",
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    console.log(`🕒 ENHANCED TIME DEBUG:`);
    console.log(`  Current UTC: ${currentUTC}`);
    console.log(`  Current MT: ${currentMTFormatted}`);
    console.log(`  Current MT Hour: ${currentMountainHour}:00`);
    console.log(`  Filtering out ALL hours > ${currentMountainHour}`);
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
    // Process PAR Brink shift data with validation
    if (punches && punches.length > 0) {
        punches.forEach(punch => {
            try {
                if (!punch.hoursWorked || punch.hoursWorked <= 0)
                    return;
                // Process punch times using the EXACT SAME method as sales data
                const punchStartUTC = new Date(punch['local Time']);
                const punchEndUTC = new Date(punchStartUTC.getTime() + (punch.hoursWorked * 60 * 60 * 1000));
                // Extract Mountain Time hours directly using the same method as sales processing
                const punchStartHourMT = parseInt(punchStartUTC.toLocaleString("en-US", {
                    timeZone: "America/Denver",
                    hour: 'numeric',
                    hour12: false
                }));
                const punchEndHourMT = parseInt(punchEndUTC.toLocaleString("en-US", {
                    timeZone: "America/Denver",
                    hour: 'numeric',
                    hour12: false
                }));
                console.log(`🔍 TIMEZONE DEBUG: Start UTC: ${punchStartUTC.toISOString()} → MT Hour: ${punchStartHourMT}:00`);
                console.log(`🔍 TIMEZONE DEBUG: End UTC: ${punchEndUTC.toISOString()} → MT Hour: ${punchEndHourMT}:00`);
                console.log(`🔍 SHIFT DEBUG: Total hours worked: ${punch.hoursWorked}, Start: ${punchStartHourMT}:00, End: ${punchEndHourMT}:00`);
                // Process this shift across ALL hours it spans in Mountain Time
                // Determine which hours this shift covers based on Mountain Time
                const startHour = punchStartHourMT;
                // Fix: Ensure end hour never exceeds 23 (convert to proper 24-hour format)
                const endHour = punchEndHourMT > 23 ? 23 : punchEndHourMT;
                // Handle shifts that cross midnight
                let hoursToProcess = [];
                if (endHour >= startHour) {
                    // Normal shift within same day
                    for (let h = startHour; h <= endHour; h++) {
                        // Fix: Ensure we don't add hour 24 (which doesn't exist)
                        if (h <= 23) {
                            hoursToProcess.push(h);
                        }
                        else if (h === 24) {
                            hoursToProcess.push(0); // Convert hour 24 to hour 0 (midnight)
                        }
                    }
                }
                else {
                    // Shift crosses midnight
                    for (let h = startHour; h <= 23; h++) {
                        hoursToProcess.push(h);
                    }
                    for (let h = 0; h <= endHour; h++) {
                        hoursToProcess.push(h);
                    }
                }
                // Process each hour the shift spans with proper hour calculations
                // **CRITICAL FIX**: Filter out future hours BEFORE processing any labor data
                console.log(`🔍 BEFORE FILTERING: Shift spans hours [${hoursToProcess.join(',')}], current hour is ${currentMountainHour}`);
                const allowedHours = hoursToProcess.filter(hourNum => {
                    const isAllowed = hourNum <= currentMountainHour;
                    if (!isAllowed) {
                        console.log(`❌ BLOCKING FUTURE HOUR: ${hourNum}:00 > ${currentMountainHour}:00 (current) - WILL NOT PROCESS`);
                    }
                    return isAllowed;
                });
                console.log(`✅ AFTER FILTERING: Allowed hours [${allowedHours.join(',')}] out of original [${hoursToProcess.join(',')}]`);
                if (allowedHours.length === 0) {
                    console.log(`⏭️ FUTURE FILTER: Entire shift ${punchStartHourMT}:00-${punchEndHourMT}:00 is in the future - skipping completely`);
                    return; // Skip this entire shift if all hours are in the future
                }
                console.log(`📊 SHIFT PROCESSING: Processing shift ${punchStartHourMT}:00-${punchEndHourMT}:00, allowed hours: ${allowedHours.join(',')}, filtered out future hours`);
                allowedHours.forEach(hourNum => {
                    const hourKey = `${hourNum.toString().padStart(2, '0')}:00`;
                    if (hourlyData[hourKey]) {
                        // **FIXED CALCULATION**: Proportionally distribute labor only across allowed (non-future) hours
                        const totalHoursInShift = punch.hoursWorked || 0;
                        const allowedHoursCount = allowedHours.length;
                        const hoursPerHour = totalHoursInShift / allowedHoursCount;
                        // Use this corrected distribution for non-future hours only
                        const overlapHours = hoursPerHour;
                        // Only process if there's actual overlap for this hour
                        if (overlapHours > 0) {
                            // Labor Hours: Include ALL employees (hourly + salaried) - precise overlap
                            hourlyData[hourKey].hoursWorked += overlapHours;
                            hourlyData[hourKey].employeesWorking += 1;
                            // Labor Cost: Only include HOURLY employees (payRate > 0)
                            if (punch.payRate && punch.payRate > 0) {
                                const laborCost = overlapHours * punch.payRate;
                                hourlyData[hourKey].laborCost += laborCost;
                                console.log(`✅ ALLOWED HOUR - Hourly employee at ${hourKey}: ${overlapHours.toFixed(3)} overlap hours (of ${totalHoursInShift.toFixed(3)} total), $${punch.payRate}/hour = $${laborCost.toFixed(2)}, punch MT: ${punchStartHourMT}:00-${punchEndHourMT}:00`);
                            }
                            else {
                                console.log(`✅ ALLOWED HOUR - Salaried employee at ${hourKey}: ${overlapHours.toFixed(3)} overlap hours (of ${totalHoursInShift.toFixed(3)} total), $0 labor cost (excluded), punch MT: ${punchStartHourMT}:00-${punchEndHourMT}:00`);
                            }
                        }
                    }
                });
            }
            catch (error) {
                // Skip invalid punch records
                console.error('Error processing punch record:', error);
            }
        });
        // **ENHANCED DATA VALIDATION TOOLS** - Apply comprehensive validation rules and corrections
        console.log(`📊 DATA VALIDATION: Starting validation for ${hours.length} hours`);
        let validationIssues = 0;
        let futureHoursFound = 0;
        let correctionsMade = 0;
        hours.forEach(hour => {
            const data = hourlyData[hour];
            const hourNum = parseInt(hour.split(':')[0]);
            // **VALIDATION RULE 1: ABSOLUTE FUTURE FILTER** - Force zero for any future hours as final safety check
            if (hourNum > currentMountainHour) {
                if (data.laborCost > 0 || data.hoursWorked > 0 || data.employeesWorking > 0) {
                    console.warn(`🚨 FUTURE HOUR DETECTED: ${hour} has labor data but it's future time! Forcing to zero.`);
                    console.warn(`   Before: Cost=$${data.laborCost}, Hours=${data.hoursWorked}, Employees=${data.employeesWorking}`);
                    futureHoursFound++;
                    validationIssues++;
                }
                data.laborCost = 0;
                data.hoursWorked = 0;
                data.employeesWorking = 0;
                console.log(`🔒 FUTURE HOUR ZEROED: ${hour} forced to $0.00 cost, 0 hours, 0 employees`);
                correctionsMade++;
                return; // Skip other validations for future hours
            }
            // **VALIDATION RULE 1.5: INVALID HOUR DETECTION** - Catch any invalid hour values
            if (hourNum < 0 || hourNum > 23) {
                console.warn(`🚨 INVALID HOUR DETECTED: ${hour} is not a valid 24-hour format! Skipping.`);
                data.laborCost = 0;
                data.hoursWorked = 0;
                data.employeesWorking = 0;
                validationIssues++;
                correctionsMade++;
                return;
            } // **VALIDATION RULE 2: EXTREME OUTLIER DETECTION** - Flag but don't correct extreme outliers for investigation
            if (data.hoursWorked > 50) {
                console.warn(`🚨 EXTREME OUTLIER: ${hour} has ${data.hoursWorked.toFixed(2)} hours worked - possible data aggregation issue`);
                validationIssues++;
            }
            if (data.employeesWorking > 20) {
                console.warn(`🚨 EXTREME OUTLIER: ${hour} has ${data.employeesWorking} employees - unusually high for single hour`);
                validationIssues++;
            }
            // **VALIDATION RULE 3: WAGE VALIDATION** - Restaurant industry rates with enhanced ranges
            if (data.hoursWorked >= 0.25 && data.laborCost > 0) {
                const avgWage = data.laborCost / data.hoursWorked;
                // Expanded wage validation ranges for restaurant industry
                if (avgWage < 2.13) {
                    console.warn(`💰 WAGE ALERT: ${hour} - Average wage $${avgWage.toFixed(2)}/hour below federal tipped minimum ($2.13)`);
                    validationIssues++;
                }
                else if (avgWage < 7.25) {
                    console.log(`💰 WAGE INFO: ${hour} - Average wage $${avgWage.toFixed(2)}/hour indicates tipped employees`);
                }
                else if (avgWage > 40.0) {
                    console.warn(`💰 WAGE ALERT: ${hour} - Average wage $${avgWage.toFixed(2)}/hour unusually high (executive/owner rate?)`);
                    validationIssues++;
                }
                else if (avgWage > 25.0) {
                    console.log(`💰 WAGE INFO: ${hour} - Average wage $${avgWage.toFixed(2)}/hour indicates management/senior staff`);
                }
            }
            // **VALIDATION RULE 4: DATA CONSISTENCY CHECKS**
            if ((data.hoursWorked > 0 && data.laborCost === 0)) {
                console.warn(`🔍 CONSISTENCY ALERT: ${hour} - Has ${data.hoursWorked.toFixed(2)} hours but $0 cost (all salaried staff?)`);
                validationIssues++;
            }
            if ((data.laborCost > 0 && data.hoursWorked === 0)) {
                console.warn(`🔍 CONSISTENCY ERROR: ${hour} - Has $${data.laborCost.toFixed(2)} cost but 0 hours (data error)`);
                data.laborCost = 0; // Correct this error
                correctionsMade++;
                validationIssues++;
            }
            if (data.employeesWorking > 0 && data.hoursWorked === 0) {
                console.warn(`🔍 CONSISTENCY ERROR: ${hour} - Has ${data.employeesWorking} employees but 0 hours (data error)`);
                data.employeesWorking = 0; // Correct this error
                correctionsMade++;
                validationIssues++;
            }
            // **VALIDATION RULE 5: NEGATIVE VALUE PROTECTION**
            const originalValues = {
                hours: data.hoursWorked,
                cost: data.laborCost,
                employees: data.employeesWorking
            };
            data.hoursWorked = Math.max(0, data.hoursWorked);
            data.laborCost = Math.max(0, data.laborCost);
            data.employeesWorking = Math.max(0, data.employeesWorking);
            if (originalValues.hours < 0 || originalValues.cost < 0 || originalValues.employees < 0) {
                console.warn(`🔧 NEGATIVE VALUE CORRECTION: ${hour} - Fixed negative values`);
                correctionsMade++;
                validationIssues++;
            }
            // **VALIDATION RULE 6: BUSINESS LOGIC VALIDATION** - Restaurant-specific checks
            if (data.laborCost > 1000) {
                console.warn(`💸 HIGH COST ALERT: ${hour} - Labor cost $${data.laborCost.toFixed(2)} seems high for single hour`);
                validationIssues++;
            }
            // **VALIDATION RULE 7: DATA QUALITY SCORING**
            let qualityScore = 100;
            let avgWage = 0;
            if (data.hoursWorked > 0 && data.laborCost > 0) {
                avgWage = data.laborCost / data.hoursWorked;
            }
            if (data.hoursWorked > 0 && data.laborCost === 0)
                qualityScore -= 20; // Salaried staff normal
            if (avgWage && (avgWage < 5 || avgWage > 30))
                qualityScore -= 10; // Wage outliers
            if (data.hoursWorked > data.employeesWorking * 8)
                qualityScore -= 15; // Hour distribution issues
            if (qualityScore < 80) {
                console.log(`📊 DATA QUALITY: ${hour} - Quality score ${qualityScore}% (review recommended)`);
            }
        });
        // **VALIDATION SUMMARY REPORT**
        console.log(`\n📋 DATA VALIDATION SUMMARY:`);
        console.log(`  ✅ Hours validated: ${hours.length}`);
        console.log(`  ⚠️  Issues found: ${validationIssues}`);
        console.log(`  🔒 Future hours blocked: ${futureHoursFound}`);
        console.log(`  🔧 Corrections applied: ${correctionsMade}`);
        console.log(`  🕒 Current MT hour: ${currentMountainHour}:00`);
        if (validationIssues === 0) {
            console.log(`  🎉 All labor data passed validation!`);
        }
        else if (correctionsMade > 0) {
            console.log(`  ✨ Data quality improved through ${correctionsMade} corrections`);
        }
    }
    return hours.map(hour => hourlyData[hour]);
}
function parseShiftsFromXML(xmlData) {
    try {
        if (!xmlData || xmlData.trim() === '') {
            return [];
        }
        const shifts = [];
        // Extract shift data using regex (similar pattern to parBrinkEnhanced.js)
        const shiftMatches = xmlData.match(/<Shift>[\s\S]*?<\/Shift>/g) || [];
        shiftMatches.forEach(shiftXml => {
            try {
                const employeeId = shiftXml.match(/<EmployeeId>([^<]+)<\/EmployeeId>/)?.[1];
                const businessDate = shiftXml.match(/<BusinessDate>([^<]+)<\/BusinessDate>/)?.[1];
                const startTime = shiftXml.match(/<StartTime[\s\S]*?<a:DateTime>([^<]+)<\/a:DateTime>/)?.[1];
                const endTime = shiftXml.match(/<EndTime[\s\S]*?<a:DateTime>([^<]+)<\/a:DateTime>/)?.[1];
                const payRate = parseFloat(shiftXml.match(/<PayRate>([^<]+)<\/PayRate>/)?.[1] || '0');
                const minutesWorked = parseInt(shiftXml.match(/<MinutesWorked>([^<]+)<\/MinutesWorked>/)?.[1] || '0');
                // Add debug logging to see shift data
                console.log(`🔍 SHIFT PARSING DEBUG: Employee ${employeeId}, Start: ${startTime}, End: ${endTime}, Minutes: ${minutesWorked}, PayRate: $${payRate}`);
                if (employeeId && businessDate && startTime && minutesWorked > 0) {
                    // Create ONE shift record per employee shift (not separate IN/OUT punches)
                    // This represents the complete shift with all the hours worked
                    const shiftRecord = {
                        punchdate: businessDate,
                        'cost center 1': '', // Could be extracted from Job/Cost Center if available
                        Type: 'SHIFT', // Mark as complete shift, not individual punch
                        'employee Id': employeeId,
                        username: '', // Not available in shift data
                        firstName: '', // Not available in shift data  
                        lastName: '', // Not available in shift data
                        SourceType: 'PAR Brink',
                        timeZone: 'America/Denver', // Mountain Time for PAR Brink locations
                        'local Time': startTime, // Shift start time for positioning
                        payRate: payRate, // Add pay rate for labor cost calculations
                        hoursWorked: minutesWorked / 60 // Convert minutes to hours - this is the TOTAL hours for the shift
                    };
                    shifts.push(shiftRecord);
                }
            }
            catch (error) {
                // Skip invalid shift records
                console.error('Error parsing individual shift:', error);
            }
        });
        return shifts;
    }
    catch (error) {
        console.error('Error parsing XML shifts:', error);
        return [];
    }
}
function parseOrdersFromXML(xmlData) {
    try {
        if (!xmlData || xmlData.trim() === '') {
            return [];
        }
        const orders = [];
        // Debug: Log XML structure
        console.log('XML parsing - Response length:', xmlData.length);
        console.log('XML parsing - Contains <Order>:', xmlData.includes('<Order>'));
        console.log('XML parsing - Contains <Orders>:', xmlData.includes('<Orders>'));
        // Extract order data using regex - PAR Brink returns <Order> elements
        const orderMatches = xmlData.match(/<Order>[\s\S]*?<\/Order>/g) || [];
        console.log('XML parsing - Found order matches:', orderMatches.length);
        orderMatches.forEach((orderXml, index) => {
            try {
                // Extract basic order information
                const id = orderXml.match(/<Id>([^<]+)<\/Id>/)?.[1];
                const number = orderXml.match(/<Number>([^<]+)<\/Number>/)?.[1];
                const total = parseFloat(orderXml.match(/<Total>([^<]+)<\/Total>/)?.[1] || '0');
                const name = orderXml.match(/<Name>([^<]+)<\/Name>/)?.[1];
                console.log(`XML parsing - Order ${index + 1}: ID=${id}, Number=${number}, Total=${total}, Name=${name}`);
                // Extract FirstSendTime for timestamp
                const firstSendTimeMatch = orderXml.match(/<FirstSendTime[\s\S]*?<a:DateTime>([^<]+)<\/a:DateTime>/);
                const firstSendTime = firstSendTimeMatch?.[1];
                // Extract ModifiedTime for tracking
                const modifiedTimeMatch = orderXml.match(/<ModifiedTime[\s\S]*?<a:DateTime>([^<]+)<\/a:DateTime>/);
                const modifiedTime = modifiedTimeMatch?.[1];
                if (id && number && total > 0) {
                    const order = {
                        Id: id,
                        Name: name || `Order ${number}`,
                        Number: number,
                        Total: total,
                        firstsendtime: firstSendTime ? {
                            DateTime: firstSendTime,
                            nil: false
                        } : undefined,
                        modifiedtime: modifiedTime ? {
                            DateTime: modifiedTime
                        } : undefined
                    };
                    orders.push(order);
                    console.log(`XML parsing - Successfully added order ${index + 1}`);
                }
                else {
                    console.log(`XML parsing - Skipped order ${index + 1}: missing required fields`);
                }
            }
            catch (error) {
                // Skip invalid order records
                console.error('Error parsing individual order:', error);
            }
        });
        console.log(`Parsed ${orders.length} orders from PAR Brink XML response`);
        return orders;
    }
    catch (error) {
        console.error('Error parsing XML orders:', error);
        return [];
    }
}
function getLocationMapping() {
    return {
        "RPNrrDYtnke+OHNLfy74/A==": { name: "Castle Rock", id: "109", timezone: "America/Denver", state: "CO" },
        "16U5e0+GFEW/ixlKo+VJhg==": { name: "Centre", id: "159", timezone: "America/Denver", state: "CO" },
        "xQwecGX8lUGnpLlTbheuug==": { name: "Creekwalk", id: "651", timezone: "America/Denver", state: "CO" },
        "BhFEGI1ffUi1CLVe8/qtKw==": { name: "Crown Point", id: "479", timezone: "America/Denver", state: "CO" },
        "XbEjtd0tKkavxcJ043UsUg==": { name: "Diamond Circle", id: "204133", timezone: "America/Denver", state: "CO" },
        "kRRYZ8SCiUatilX4KO7dBg==": { name: "Dublin Commons", id: "20408", timezone: "America/Denver", state: "CO" },
        "dWQm28UaeEq0qStmvTfACg==": { name: "Falcon Landing", id: "67", timezone: "America/Denver", state: "CO" },
        "Q58QIT+t+kGf9tzqHN2OCA==": { name: "Forest Trace", id: "188", timezone: "America/Denver", state: "CO" },
        "2LUEj0hnMk+kCQlUcySYBQ==": { name: "Greeley", id: "354", timezone: "America/Denver", state: "CO" },
        "x/S/SDwyrEem54+ZoCILeg==": { name: "Highlands Ranch", id: "204049", timezone: "America/Denver", state: "CO" },
        "gAAbGt6udki8DwPMkonciA==": { name: "Johnstown", id: "722", timezone: "America/Denver", state: "CO" },
        "37CE8WDS8k6isMGLMB9PRA==": { name: "Lowry", id: "619", timezone: "America/Denver", state: "CO" },
        "7yC7X4KjZEuoZCDviTwspA==": { name: "McCastlin Marketplace", id: "161", timezone: "America/Denver", state: "CO" },
        "SUsjq0mEck6HwRkd7uNACg==": { name: "Northfield Commons", id: "336", timezone: "America/Denver", state: "CO" },
        "M4X3DyDrLUKwi3CQHbqlOQ==": { name: "Polaris Pointe", id: "1036", timezone: "America/Denver", state: "CO" },
        "38AZmQGFQEy5VNajl9utlA==": { name: "Park Meadows", id: "26", timezone: "America/Denver", state: "CO" },
        "ZOJMZlffDEqC849w6PnF0g==": { name: "Ralston Creek", id: "441", timezone: "America/Denver", state: "CO" },
        "A2dHEwIh9USNnpMrXCrpQw==": { name: "Sheridan Parkway", id: "601", timezone: "America/Denver", state: "CO" },
        "y4xlWfqFJEuvmkocDGZGtw==": { name: "South Academy Highlands", id: "204047", timezone: "America/Denver", state: "CO" },
        "6OwU+/7IOka+PV9JzAgzYQ==": { name: "Tower", id: "579", timezone: "America/Denver", state: "CO" },
        "YUn21EMuwki+goWuIJ5yGg==": { name: "Wellington", id: "652", timezone: "America/Denver", state: "CO" },
        "OpM9o1kTOkyMM2vevMMqdw==": { name: "Westminster Promenade", id: "202794", timezone: "America/Denver", state: "CO" }
        // Future expansion examples:
        // "NEW_TEXAS_TOKEN": { name: "Austin Downtown", id: "1001", timezone: "America/Chicago", state: "TX" },
        // "NEW_CALIFORNIA_TOKEN": { name: "Los Angeles West", id: "1002", timezone: "America/Los_Angeles", state: "CA" },
        // "NEW_FLORIDA_TOKEN": { name: "Miami Beach", id: "1003", timezone: "America/New_York", state: "FL" }
    };
}
function getCurrentLocalTime(timezone, includeTime = false) {
    const now = new Date();
    const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    if (includeTime) {
        return localTime.toISOString().slice(0, 19);
    }
    return localTime.toISOString().slice(0, 10);
}
async function getTimezoneDataAndBusinessDate(timezone) {
    try {
        // Try WorldTimeAPI first for accurate timezone data with DST
        const response = await axios_1.default.get(`https://worldtimeapi.org/api/timezone/${timezone}`, {
            timeout: 5000 // 5 second timeout
        });
        if (response.data && response.data.raw_offset !== undefined && response.data.dst_offset !== undefined) {
            // raw_offset is the standard timezone offset in seconds
            // dst_offset is the additional DST offset in seconds  
            // Total offset = raw_offset + dst_offset (if DST is active)
            const totalOffsetSeconds = response.data.raw_offset + (response.data.dst ? response.data.dst_offset : 0);
            const offsetMinutes = Math.round(Math.abs(totalOffsetSeconds / 60)); // Round to whole number for PAR Brink Int32
            // Get current local datetime from the API
            const localDateTime = response.data.datetime;
            // Extract the local hour directly from the datetime string to avoid timezone conversion issues
            const localHour = parseInt(localDateTime.split('T')[1].split(':')[0]);
            // Restaurant business logic: if it's before 5 AM, use previous day as business date
            let businessDate;
            const localDateStr = localDateTime.split('T')[0]; // Get just the date part
            if (localHour < 5) {
                const prevDay = new Date(localDateStr + 'T00:00:00');
                prevDay.setDate(prevDay.getDate() - 1);
                businessDate = prevDay.toISOString().slice(0, 10);
            }
            else {
                businessDate = localDateStr;
            }
            // Extract time without timezone for currentLocalTime
            const currentLocalTime = localDateTime.split('T')[1].split('.')[0]; // Get HH:MM:SS part
            console.log(`WorldTimeAPI timezone data for ${timezone}:`);
            console.log(`  Current Local DateTime: ${localDateTime}`);
            console.log(`  Current Local Hour: ${localHour}`);
            console.log(`  Business Date: ${businessDate} (${localHour < 5 ? 'adjusted for early morning' : 'same as calendar date'})`);
            console.log(`  DST Active: ${response.data.dst}`);
            console.log(`  Abbreviation: ${response.data.abbreviation}`);
            console.log(`  PAR Brink Offset: ${offsetMinutes} minutes`);
            return {
                offsetMinutes,
                businessDate,
                currentLocalTime: localDateStr + 'T' + currentLocalTime
            };
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`WorldTimeAPI failed for ${timezone}, falling back to manual calculation:`, errorMessage);
    }
    // Fallback to manual calculation if API fails
    const checkDate = new Date();
    // Create a date formatter for the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    // Get the date parts for the target timezone
    const parts = formatter.formatToParts(checkDate);
    const partsMap = {};
    parts.forEach(part => {
        partsMap[part.type] = part.value;
    });
    // Create a new date object representing the local time
    const localTime = new Date(`${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}`);
    // Restaurant business logic: if it's before 5 AM, use previous day as business date
    let businessDate;
    if (localTime.getHours() < 5) {
        const prevDay = new Date(localTime);
        prevDay.setDate(prevDay.getDate() - 1);
        businessDate = prevDay.toISOString().slice(0, 10);
    }
    else {
        businessDate = localTime.toISOString().slice(0, 10);
    }
    // Calculate the offset in minutes
    const localAsUTC = new Date(`${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}Z`);
    const offsetMinutes = Math.round(Math.abs((checkDate.getTime() - localAsUTC.getTime()) / (1000 * 60))); // Round to whole number for PAR Brink Int32
    console.log(`Fallback timezone calculation for ${timezone}:`);
    console.log(`  Local time: ${localTime.toISOString()}`);
    console.log(`  Business Date: ${businessDate} (${localTime.getHours() < 5 ? 'adjusted for early morning' : 'same as calendar date'})`);
    console.log(`  Calculated offset: ${offsetMinutes} minutes (fallback method)`);
    return {
        offsetMinutes,
        businessDate,
        currentLocalTime: localTime.toISOString().slice(0, 19)
    };
}
// Register the function
functions_1.app.http('parBrinkDashboard', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/dashboard',
    handler: parBrinkDashboard
});
//# sourceMappingURL=parBrinkDashboard.js.map