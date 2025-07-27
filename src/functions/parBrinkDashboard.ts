import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import axios from 'axios';

interface SalesOrder {
  Id: string;
  Name: string;
  Number: string;
  Total: number;
  firstsendtime?: {
    DateTime?: string;
    nil?: boolean;
  };
  modifiedtime?: {
    DateTime?: string;
  };
}

interface PunchDetail {
  punchdate: string;
  'cost center 1': string;
  Type: string;
  'employee Id': string;
  username: string;
  firstName: string;
  lastName: string;
  SourceType: string;
  timeZone: string;
  'local Time': string;
}

interface HourlySalesData {
  hour: string;
  sales: number;
  guests: number;
  orders: number;
  guestAverage: number;
}

interface HourlyLaborData {
  hour: string;
  laborCost: number;
  hoursWorked: number;
  employeesWorking: number;
}

interface DashboardResponse {
  location: string;
  locationId: string;
  businessDate: string;
  hourlySales: HourlySalesData[];
  hourlyLabor: HourlyLaborData[];
  totalSales: number;
  totalGuests: number;
  totalOrders: number;
  totalLaborCost: number;
  totalLaborHours: number;
  laborPercentage: number;
  overallGuestAverage: number;
}



/**
 * PAR Brink Dashboard Function
 * Retrieves real-time sales and labor data for dashboard visualization
 */
export async function parBrinkDashboard(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
    const body = await request.json() as any;
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
    const targetDate = businessDate || getRestaurantBusinessDateForTimezone(locationInfo.timezone);
    const currentLocalDate = getCurrentLocalTime(locationInfo.timezone);
    
    context.log(`Fetching data for location: ${locationInfo.name} (${locationInfo.state}) on date: ${targetDate}`);
    context.log(`Location timezone: ${locationInfo.timezone}`);
    context.log(`Current local time date: ${currentLocalDate}`);
    context.log(`Using business date: ${targetDate} (${businessDate ? 'provided' : 'calculated'})`);

    // Fetch sales data
    const salesData = await fetchParBrinkSalesData(accessToken, locationToken, targetDate, locationInfo.timezone, context);
    
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

    const dashboardData: DashboardResponse = {
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

  } catch (error) {
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

async function fetchParBrinkSalesData(accessToken: string, locationToken: string, businessDate: string, timezone: string, context: InvocationContext): Promise<SalesOrder[]> {
  try {
    const headers = {
      'AccessToken': accessToken,
      'LocationToken': locationToken,
      'Content-Type': 'text/xml',
      'SOAPAction': 'http://www.brinksoftware.com/webservices/sales/v2/ISalesWebService2/GetOrders'
    };

    // Convert to local timezone format
    const localDate = convertToLocalTime(businessDate, timezone);
    const localNow = getCurrentLocalTime(timezone, true);
    
    // Calculate dynamic timezone offset for the specific timezone
    const offsetMinutes = getTimezoneOffset(timezone, new Date(businessDate));
    context.log(`Using ${timezone} offset: ${offsetMinutes} minutes for date ${businessDate}`);
    context.log(`Converted business date to local time: ${localDate}`);
    context.log(`Current local time: ${localNow}`);

    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
        <soapenv:Header/>
        <soapenv:Body>
          <v2:GetOrders>
            <v2:request>
              <v2:BusinessDate>${localDate}</v2:BusinessDate>
              <v2:ModifiedTime>
                <sys:DateTime>${localNow}</sys:DateTime>
                <sys:OffsetMinutes>${offsetMinutes}</sys:OffsetMinutes>
              </v2:ModifiedTime>
            </v2:request>
          </v2:GetOrders>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    context.log('Making PAR Brink API call with SOAP body:', soapBody.substring(0, 500) + '...');
    
    const response = await axios.post('https://api11.brinkpos.net/sales2.svc', soapBody, { headers });
    
    // Parse XML response
    const xmlData = response.data;
    context.log(`PAR Brink API response received. Response length: ${xmlData?.length || 0} characters`);
    
    // If no orders found and we're requesting future date, suggest trying current date
    if (localDate > getCurrentLocalTime(timezone)) {
      context.log(`NOTE: Requesting future date (${localDate}). Consider trying current date: ${getCurrentLocalTime(timezone)}`);
    }
    const orders = parseOrdersFromXML(xmlData);
    
    context.log(`Retrieved ${orders.length} orders from PAR Brink`);
    return orders;

  } catch (error) {
    context.error('Error fetching PAR Brink sales data:', error);
    return [];
  }
}

async function fetchLaborData(locationId: string, businessDate: string, context: InvocationContext): Promise<PunchDetail[]> {
  try {
    // This would integrate with UKG or other labor system
    // For now, return mock data structure
    context.log(`Fetching labor data for location ${locationId} on ${businessDate}`);
    
    // In a real implementation, this would call UKG API or SQL database
    return [];

  } catch (error) {
    context.error('Error fetching labor data:', error);
    return [];
  }
}

function processHourlySalesData(orders: SalesOrder[]): HourlySalesData[] {
  const hourlyData: { [hour: string]: HourlySalesData } = {};

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
    if (!order.firstsendtime?.DateTime || order.firstsendtime.nil) return;

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

function processHourlyLaborData(punches: PunchDetail[]): HourlyLaborData[] {
  const hourlyData: { [hour: string]: HourlyLaborData } = {};

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
      } catch (error) {
        // Skip invalid punch records
      }
    });
  }

  return hours.map(hour => hourlyData[hour]);
}

function parseOrdersFromXML(xmlData: string): SalesOrder[] {
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
  } catch (error) {
    console.error('Error parsing XML orders:', error);
    return [];
  }
}

function getLocationMapping(): { [token: string]: { name: string; id: string; timezone: string; state: string } } {
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

function getCurrentLocalTime(timezone: string, includeTime: boolean = false): string {
  const now = new Date();
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  if (includeTime) {
    return localTime.toISOString().slice(0, 19);
  }
  
  return localTime.toISOString().slice(0, 10);
}

function getRestaurantBusinessDateForTimezone(timezone: string): string {
  // For restaurants, the business day typically runs from early morning (5-6 AM) 
  // until late night/early morning (2-3 AM next day)
  // If it's after midnight but before 5 AM in local timezone, use the previous calendar day as business date
  const now = new Date();
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  // If it's between midnight and 5 AM in local timezone, subtract a day for business date
  if (localTime.getHours() < 5) {
    const businessDate = new Date(localTime);
    businessDate.setDate(businessDate.getDate() - 1);
    return businessDate.toISOString().slice(0, 10);
  }
  
  return localTime.toISOString().slice(0, 10);
}

function convertToLocalTime(dateString: string, timezone: string): string {
  const date = new Date(dateString);
  const localTime = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return localTime.toISOString().slice(0, 10);
}

function getTimezoneOffset(timezone: string, date?: Date): number {
  // Use provided date or current date
  const checkDate = date || new Date();
  
  // Create the same moment in both UTC and the specified timezone
  const utcTime = new Date(checkDate.toISOString());
  const localTimeString = checkDate.toLocaleString("en-US", { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse local timezone string back to Date (interpreting as UTC to get the offset)
  const [datePart, timePart] = localTimeString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  const localAsUTC = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour}:${minute}:${second}Z`);
  
  // Calculate the offset in minutes
  // Timezone behind UTC = negative offset, ahead of UTC = positive offset
  const offsetMinutes = (localAsUTC.getTime() - utcTime.getTime()) / (1000 * 60);
  
  return Math.round(offsetMinutes);
}

// Register the function
app.http('parBrinkDashboard', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'par-brink/dashboard',
  handler: parBrinkDashboard
});
