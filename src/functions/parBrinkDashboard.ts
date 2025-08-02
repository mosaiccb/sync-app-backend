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
  payRate?: number; // Optional pay rate for labor cost calculations
  hoursWorked?: number; // Optional hours worked for labor calculations
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
    let targetDate: string;
    let offsetMinutes: number;
    
    if (businessDate) {
      // If business date is provided, still get offset from API
      const timezoneData = await getTimezoneDataAndBusinessDate(locationInfo.timezone);
      targetDate = businessDate;
      offsetMinutes = timezoneData.offsetMinutes;
    } else {
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

async function fetchParBrinkSalesData(accessToken: string, locationToken: string, businessDate: string, offsetMinutes: number, timezone: string, context: InvocationContext): Promise<SalesOrder[]> {
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
    
    const response = await axios.post('https://api11.brinkpos.net/sales2.svc', soapBody, { headers });
    
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

  } catch (error) {
    context.error('Error fetching PAR Brink sales data:', error);
    return [];
  }
}

async function fetchParBrinkLaborData(accessToken: string, locationToken: string, businessDate: string, offsetMinutes: number, timezone: string, context: InvocationContext): Promise<PunchDetail[]> {
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
    
    const response = await axios.post('https://api11.brinkpos.net/labor2.svc', soapBody, { headers });
    
    // Parse XML response
    const xmlData = response.data;
    context.log(`PAR Brink Labor API response received. Response length: ${xmlData?.length || 0} characters`);
    
    // Parse shifts from XML response
    const shifts = parseShiftsFromXML(xmlData);
    context.log(`Parsed ${shifts.length} labor shifts from PAR Brink API`);
    
    return shifts;

  } catch (error) {
    context.error('Error fetching PAR Brink labor data:', error);
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
    // Convert to Mountain Time before extracting hour
    const mountainTimeHour = parseInt(orderTime.toLocaleString("en-US", { 
      timeZone: "America/Denver",
      hour: 'numeric',
      hour12: false
    }));
    const hour = `${mountainTimeHour.toString().padStart(2, '0')}:00`;

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

  // Get current Mountain Time hour to filter out future labor data
  const currentMountainTime = new Date().toLocaleString("en-US", { 
    timeZone: "America/Denver",
    hour: 'numeric',
    hour12: false
  });
  const currentMountainHour = parseInt(currentMountainTime);
  console.log(`🕒 CURRENT TIME FILTER: Current Mountain Time hour is ${currentMountainHour}:00 - filtering out future labor data`);

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
        if (!punch.hoursWorked || punch.hoursWorked <= 0) return;
        
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
        
        console.log(`🔍 TIMEZONE DEBUG: UTC: ${punchStartUTC.toISOString()} (${punchStartUTC.getHours()}:00) → MT Hour: ${punchStartHourMT}:00`);
        
        // Process this shift across ALL hours it spans in Mountain Time
        // Determine which hours this shift covers based on Mountain Time
        const startHour = punchStartHourMT;
        const endHour = punchEndHourMT;
        
        // Handle shifts that cross midnight
        let hoursToProcess: number[] = [];
        if (endHour >= startHour) {
          // Normal shift within same day
          for (let h = startHour; h <= endHour; h++) {
            hoursToProcess.push(h);
          }
        } else {
          // Shift crosses midnight
          for (let h = startHour; h <= 23; h++) {
            hoursToProcess.push(h);
          }
          for (let h = 0; h <= endHour; h++) {
            hoursToProcess.push(h);
          }
        }
        
        // Process each hour the shift spans with proper hour calculations
        hoursToProcess.forEach(hourNum => {
          const hourKey = `${hourNum.toString().padStart(2, '0')}:00`;
          
          // **CRITICAL FIX**: Skip future hours to prevent showing labor data for times that haven't happened yet
          if (hourNum > currentMountainHour) {
            console.log(`⏭️ FUTURE FILTER: Skipping hour ${hourNum}:00 (future) - current hour is ${currentMountainHour}:00`);
            return; // Skip this future hour
          }
          
          if (hourlyData[hourKey]) {
            // Simplified approach: Calculate the fraction of the total shift that falls in this hour
            // This avoids complex timezone boundary calculations
            
            // For a shift that spans multiple hours, divide the total hours proportionally
            const totalHoursInShift = punch.hoursWorked || 0;
            const hoursInThisSpan = hoursToProcess.length;
            const hoursPerHour = totalHoursInShift / hoursInThisSpan;
            
            // Use this simplified distribution for now
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
                console.log(`Hourly employee at ${hourKey}: ${overlapHours.toFixed(3)} overlap hours (of ${(punch.hoursWorked || 0).toFixed(3)} total), $${punch.payRate}/hour = $${laborCost.toFixed(2)}, punch MT: ${punchStartHourMT}:00-${punchEndHourMT}:00`);
              } else {
                console.log(`Salaried employee at ${hourKey}: ${overlapHours.toFixed(3)} overlap hours (of ${(punch.hoursWorked || 0).toFixed(3)} total), $0 labor cost (excluded), punch MT: ${punchStartHourMT}:00-${punchEndHourMT}:00`);
              }
            }
          }
        });
      } catch (error) {
        // Skip invalid punch records
        console.error('Error processing punch record:', error);
      }
    });

    // Apply validation rules and corrections
    hours.forEach(hour => {
      const data = hourlyData[hour];
      
      // REMOVED PROBLEMATIC VALIDATION: Labor hours CAN exceed employee count in restaurants
      // due to overlapping shifts, split shifts, multiple job codes, etc.
      // The original validation was incorrectly capping real PAR Brink data.
      
      // VALIDATION RULE 2: Only validate extremely unrealistic scenarios (removed)
      // Restaurant operations can have overlapping shifts, so hours can exceed employee count
      
      // VALIDATION RULE 3: Wage validation (restaurant industry rates)
      // Only validate wages for meaningful hour blocks (>= 0.25 hours to avoid false alarms from small overlaps)
      if (data.hoursWorked >= 0.25 && data.laborCost > 0) {
        const avgWage = data.laborCost / data.hoursWorked;
        if (avgWage < 2.0) {
          console.warn(`Labor validation WARNING for ${hour}: Average wage of $${avgWage.toFixed(2)}/hour is unusually low, even for tipped employees.`);
        }
        if (avgWage > 35.0) {
          console.warn(`Labor validation WARNING for ${hour}: Average wage of $${avgWage.toFixed(2)}/hour seems unusually high (management rate?).`);
        }
      }
      
      // VALIDATION RULE 4: Labor cost consistency check
      // If we have hours but no cost, or cost but no hours, flag it
      if ((data.hoursWorked > 0 && data.laborCost === 0) || (data.laborCost > 0 && data.hoursWorked === 0)) {
        console.warn(`Labor validation WARNING for ${hour}: Inconsistent hours (${data.hoursWorked}) and cost ($${data.laborCost}).`);
      }
      
      // VALIDATION RULE 5: No negative values
      data.hoursWorked = Math.max(0, data.hoursWorked);
      data.laborCost = Math.max(0, data.laborCost);
      data.employeesWorking = Math.max(0, data.employeesWorking);
    });
  }

  return hours.map(hour => hourlyData[hour]);
}

function parseShiftsFromXML(xmlData: string): PunchDetail[] {
  try {
    if (!xmlData || xmlData.trim() === '') {
      return [];
    }

    const shifts: PunchDetail[] = [];
    
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
          const shiftRecord: PunchDetail = {
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
      } catch (error) {
        // Skip invalid shift records
        console.error('Error parsing individual shift:', error);
      }
    });
    
    return shifts;
  } catch (error) {
    console.error('Error parsing XML shifts:', error);
    return [];
  }
}

function parseOrdersFromXML(xmlData: string): SalesOrder[] {
  try {
    if (!xmlData || xmlData.trim() === '') {
      return [];
    }

    const orders: SalesOrder[] = [];
    
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
          const order: SalesOrder = {
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
        } else {
          console.log(`XML parsing - Skipped order ${index + 1}: missing required fields`);
        }
      } catch (error) {
        // Skip invalid order records
        console.error('Error parsing individual order:', error);
      }
    });
    
    console.log(`Parsed ${orders.length} orders from PAR Brink XML response`);
    return orders;
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

async function getTimezoneDataAndBusinessDate(timezone: string): Promise<{ offsetMinutes: number; businessDate: string; currentLocalTime: string }> {
  try {
    // Try WorldTimeAPI first for accurate timezone data with DST
    const response = await axios.get(`https://worldtimeapi.org/api/timezone/${timezone}`, {
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
      let businessDate: string;
      const localDateStr = localDateTime.split('T')[0]; // Get just the date part
      
      if (localHour < 5) {
        const prevDay = new Date(localDateStr + 'T00:00:00');
        prevDay.setDate(prevDay.getDate() - 1);
        businessDate = prevDay.toISOString().slice(0, 10);
      } else {
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
  } catch (error) {
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
  const partsMap: {[key: string]: string} = {};
  parts.forEach(part => {
    partsMap[part.type] = part.value;
  });
  
  // Create a new date object representing the local time
  const localTime = new Date(
    `${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}`
  );
  
  // Restaurant business logic: if it's before 5 AM, use previous day as business date
  let businessDate: string;
  if (localTime.getHours() < 5) {
    const prevDay = new Date(localTime);
    prevDay.setDate(prevDay.getDate() - 1);
    businessDate = prevDay.toISOString().slice(0, 10);
  } else {
    businessDate = localTime.toISOString().slice(0, 10);
  }
  
  // Calculate the offset in minutes
  const localAsUTC = new Date(
    `${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}Z`
  );
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
app.http('parBrinkDashboard', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'par-brink/dashboard',
  handler: parBrinkDashboard
});
