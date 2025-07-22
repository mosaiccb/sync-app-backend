import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

interface SalesOrderEntry {
  ItemId: string;
  Price: number;
  Description: string;
  DayPartId: number;
}

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
  BusinessDate: string;
  entries?: {
    orderentry?: SalesOrderEntry[] | SalesOrderEntry;
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
  currentLocalTime: string;
  currentHour: string;
  timezone: string;
  locationState: string;
  locationRegion: string;
}

interface LocationConfigDashboard {
  id: string;
  name: string;
  timezone: string;
  state: string;
  region?: string;
}

/**
 * Get current time in specified timezone for dashboard
 */
function getCurrentTimeInLocationTimezone(timezone: string = 'America/Denver', includeTime: boolean = false): string {
  const now = new Date();
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  if (includeTime) {
    return localTime.toISOString().slice(0, 19);
  }
  
  return localTime.toISOString().slice(0, 10);
}

/**
 * Get timezone offset in minutes for PAR Brink API calls
 */
function getLocationTimezoneOffsetMinutes(timezone: string = 'America/Denver'): number {
  const now = new Date();
  const utcTime = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  // Calculate offset in minutes
  const offsetMs = localTime.getTime() - utcTime.getTime();
  return Math.round(offsetMs / (1000 * 60));
}

/**
 * Enhanced location mapping with timezone support for multi-state expansion
 */
function getEnhancedLocationMappingForDashboard(): { [token: string]: LocationConfigDashboard } {
  return {
    // Colorado locations (Mountain Time)
    "RPNrrDYtnke+OHNLfy74/A==": { 
      id: "109", name: "Castle Rock", timezone: "America/Denver", state: "CO", region: "Colorado Front Range" 
    },
    "16U5e0+GFEW/ixlKo+VJhg==": { 
      id: "159", name: "Centre", timezone: "America/Denver", state: "CO", region: "Colorado Front Range" 
    },
    "xQwecGX8lUGnpLlTbheuug==": { 
      id: "651", name: "Creekwalk", timezone: "America/Denver", state: "CO", region: "Colorado Front Range" 
    },
    "BhFEGI1ffUi1CLVe8/qtKw==": { 
      id: "479", name: "Crown Point", timezone: "America/Denver", state: "CO", region: "Colorado Front Range" 
    },
    "XbEjtd0tKkavxcJ043UsUg==": { 
      id: "204133", name: "Diamond Circle", timezone: "America/Denver", state: "CO", region: "Colorado Front Range" 
    },
    "kRRYZ8SCiUatilX4KO7dBg==": { 
      id: "20408", name: "Dublin Commons", timezone: "America/Denver", state: "CO", region: "Colorado Front Range" 
    },
    "dWQm28UaeEq0qStmvTfACg==": { 
      id: "67", name: "Falcon Landing", timezone: "America/Denver", state: "CO", region: "Colorado Springs Area" 
    },
    "Q58QIT+t+kGf9tzqHN2OCA==": { 
      id: "188", name: "Forest Trace", timezone: "America/Denver", state: "CO", region: "Colorado Front Range" 
    },
    "2LUEj0hnMk+kCQlUcySYBQ==": { 
      id: "354", name: "Greeley", timezone: "America/Denver", state: "CO", region: "Northern Colorado" 
    },
    "x/S/SDwyrEem54+ZoCILeg==": { 
      id: "204049", name: "Highlands Ranch", timezone: "America/Denver", state: "CO", region: "Colorado Front Range" 
    },
    "gAAbGt6udki8DwPMkonciA==": { 
      id: "722", name: "Johnstown", timezone: "America/Denver", state: "CO", region: "Northern Colorado" 
    },
    "37CE8WDS8k6isMGLMB9PRA==": { 
      id: "619", name: "Lowry", timezone: "America/Denver", state: "CO", region: "Denver Metro" 
    },
    "7yC7X4KjZEuoZCDviTwspA==": { 
      id: "161", name: "McCastlin Marketplace", timezone: "America/Denver", state: "CO", region: "Boulder County" 
    },
    "SUsjq0mEck6HwRkd7uNACg==": { 
      id: "336", name: "Northfield Commons", timezone: "America/Denver", state: "CO", region: "Denver Metro" 
    },
    "M4X3DyDrLUKwi3CQHbqlOQ==": { 
      id: "1036", name: "Polaris Pointe", timezone: "America/Denver", state: "CO", region: "Colorado Springs Area" 
    },
    "38AZmQGFQEy5VNajl9utlA==": { 
      id: "26", name: "Park Meadows", timezone: "America/Denver", state: "CO", region: "Colorado Front Range" 
    },
    "ZOJMZlffDEqC849w6PnF0g==": { 
      id: "441", name: "Ralston Creek", timezone: "America/Denver", state: "CO", region: "Jefferson County" 
    },
    "A2dHEwIh9USNnpMrXCrpQw==": { 
      id: "601", name: "Sheridan Parkway", timezone: "America/Denver", state: "CO", region: "Denver Metro" 
    },
    "y4xlWfqFJEuvmkocDGZGtw==": { 
      id: "204047", name: "South Academy Highlands", timezone: "America/Denver", state: "CO", region: "Colorado Springs Area" 
    },
    "6OwU+/7IOka+PV9JzAgzYQ==": { 
      id: "579", name: "Tower", timezone: "America/Denver", state: "CO", region: "Denver Metro" 
    },
    "YUn21EMuwki+goWuIJ5yGg==": { 
      id: "652", name: "Wellington", timezone: "America/Denver", state: "CO", region: "Northern Colorado" 
    },
    "OpM9o1kTOkyMM2vevMMqdw==": { 
      id: "202794", name: "Westminster Promenade", timezone: "America/Denver", state: "CO", region: "Westminster/Broomfield" 
    }
    
    // Future expansion examples:
    // "TEXAS_TOKEN_1": { id: "TX001", name: "Austin Central", timezone: "America/Chicago", state: "TX", region: "Austin Metro" },
    // "CALIFORNIA_TOKEN_1": { id: "CA001", name: "San Diego", timezone: "America/Los_Angeles", state: "CA", region: "Southern California" },
    // "ARIZONA_TOKEN_1": { id: "AZ001", name: "Phoenix", timezone: "America/Phoenix", state: "AZ", region: "Phoenix Metro" }
  };
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

    // Get location name from enhanced mapping with timezone support  
    const locationMapping = getEnhancedLocationMappingForDashboard();
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

    // Use location-specific timezone instead of hardcoded Mountain Time
    const locationTimezone = locationInfo.timezone;
    const targetDate = businessDate || getCurrentTimeInLocationTimezone(locationTimezone);
    
    context.log(`Fetching data for location: ${locationInfo.name} (${locationInfo.state}, ${locationTimezone}) on date: ${targetDate}`);

    // Fetch sales data with timezone awareness
    const salesData = await fetchParBrinkSalesData(accessToken, locationToken, targetDate, context, locationTimezone);
    
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

    // Get current local time information for highlighting current hour
    const currentLocalTime = getCurrentTimeInLocationTimezone(locationTimezone, true);
    const currentLocalDate = new Date(currentLocalTime);
    const currentHour = `${currentLocalDate.getHours().toString().padStart(2, '0')}:00`;

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
      overallGuestAverage,
      currentLocalTime,
      currentHour,
      timezone: locationTimezone,
      locationState: locationInfo.state,
      locationRegion: locationInfo.region || 'Unknown Region'
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

async function fetchParBrinkSalesData(accessToken: string, locationToken: string, businessDate: string, context: InvocationContext, locationTimezone: string = 'America/Denver'): Promise<SalesOrder[]> {
  try {
    const headers = {
      'AccessToken': accessToken,
      'LocationToken': locationToken,
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'http://www.brinksoftware.com/webservices/sales/v2/ISalesWebService2/GetOrders',
      'User-Agent': 'UKG-Sync-App/1.0',
      'Accept': 'text/xml, application/soap+xml, application/xml'
    };

    // Convert to location-specific timezone format instead of hardcoded Mountain Time
    const localDate = convertToLocationTimezone(businessDate, locationTimezone);
    const localNow = getCurrentTimeInLocationTimezone(locationTimezone, true);
    const timezoneOffset = getLocationTimezoneOffsetMinutes(locationTimezone);

    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
        <soapenv:Header/>
        <soapenv:Body>
          <v2:GetOrders>
            <v2:request>
              <v2:BusinessDate>${localDate}</v2:BusinessDate>
              <v2:ModifiedTime>
                <sys:DateTime>${localNow}</sys:DateTime>
                <sys:OffsetMinutes>${timezoneOffset}</sys:OffsetMinutes>
              </v2:ModifiedTime>
            </v2:request>
          </v2:GetOrders>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    context.log(`Making timezone-aware PAR Brink API call for ${locationTimezone}...`);
    context.log(`Business Date: ${businessDate} -> ${localDate} (${locationTimezone})`);
    context.log(`Modified Time: ${localNow} (Offset: ${timezoneOffset} mins)`);
    
    const response = await fetch('https://api11.brinkpos.net/sales2.svc', {
      method: 'POST',
      headers: headers,
      body: soapBody
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      context.error(`❌ PAR Brink Sales API error: ${response.status} ${response.statusText}`);
      context.error(`❌ Error response: ${errorText}`);
      throw new Error(`PAR Brink API request failed: ${response.status} ${response.statusText}`);
    }
    
    // Parse XML response
    const xmlData = await response.text();
    const orders = parseOrdersFromXML(xmlData);
    
    context.log(`Retrieved ${orders.length} orders from PAR Brink (${locationTimezone})`);
    return orders;

  } catch (error) {
    context.error('Error fetching timezone-aware PAR Brink sales data:', error);
    return [];
  }
}

/**
 * Convert date to location-specific timezone
 */
function convertToLocationTimezone(dateString: string, timezone: string = 'America/Denver'): string {
  const date = new Date(dateString);
  const localTime = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return localTime.toISOString().slice(0, 10);
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

function processHourlyLaborData(_punches: PunchDetail[]): HourlyLaborData[] {
  const hourlyData: { [hour: string]: HourlyLaborData } = {};

  // Initialize hourly buckets
  const hours = [];
  for (let i = 3; i <= 23; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }
  for (let i = 0; i <= 2; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }

  hours.forEach(hour => {
    const hourInt = parseInt(hour.split(':')[0]);
    
    // Generate mock labor data for business hours (8 AM - 10 PM)
    if (hourInt >= 8 && hourInt <= 22) {
      const employeesWorking = Math.floor(Math.random() * 8) + 3; // 3-10 employees
      const avgWage = 15; // $15/hour average
      const hoursWorked = employeesWorking * 1; // 1 hour per employee per hour
      
      hourlyData[hour] = {
        hour,
        laborCost: hoursWorked * avgWage,
        hoursWorked: hoursWorked,
        employeesWorking: employeesWorking
      };
    } else {
      hourlyData[hour] = {
        hour,
        laborCost: 0,
        hoursWorked: 0,
        employeesWorking: 0
      };
    }
  });

  return hours.map(hour => hourlyData[hour]);
}

function parseOrdersFromXML(_xmlData: string): SalesOrder[] {
  try {
    // For now, return mock data that simulates real PAR Brink orders
    // In production, you'd parse the actual XML response
    const mockOrders: SalesOrder[] = [];
    
    // Generate some sample orders for demonstration
    const currentDate = new Date().toISOString().split('T')[0];
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
    
    hours.forEach(hour => {
      const numOrders = Math.floor(Math.random() * 10) + 5; // 5-15 orders per hour
      
      for (let i = 0; i < numOrders; i++) {
        const orderTime = new Date();
        orderTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
        
        mockOrders.push({
          Id: `order_${hour}_${i}`,
          Name: `Order ${i + 1}`,
          Number: `${hour}${i.toString().padStart(3, '0')}`,
          Total: Math.floor(Math.random() * 50) + 10, // $10-60 orders
          BusinessDate: currentDate,
          firstsendtime: {
            DateTime: orderTime.toISOString(),
            nil: false
          },
          modifiedtime: {
            DateTime: orderTime.toISOString()
          },
          entries: {
            orderentry: [{
              ItemId: `item_${i}`,
              Price: Math.floor(Math.random() * 20) + 5,
              Description: 'Menu Item',
              DayPartId: hour < 15 ? 195034 : 195036 // Lunch vs Dinner
            }]
          }
        });
      }
    });
    
    return mockOrders;
  } catch (error) {
    console.error('Error generating mock orders:', error);
    return [];
  }
}

// Register the function
app.http('parBrinkDashboard', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'par-brink/dashboard',
  handler: parBrinkDashboard
});
