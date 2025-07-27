import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import axios from 'axios';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  position: string;
  status: string;
}

interface TimeEntry {
  employeeId: string;
  clockInTime: string;
  timeZone: string;
  location: string;
  position: string;
  currentStatus: 'clocked-in' | 'on-break' | 'clocked-out';
  duration: string;
}

interface ClockedInEmployee {
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  position: string;
  clockInTime: string;
  duration: string;
  location: string;
  currentStatus: 'clocked-in' | 'on-break';
  timeZone: string;
}

interface ClockedInResponse {
  location: string;
  locationId: string;
  businessDate: string;
  currentTime: string;
  clockedInEmployees: ClockedInEmployee[];
  totalEmployeesWorking: number;
  employeesOnBreak: number;
  lastUpdated: string;
}

/**
 * PAR Brink Clocked In Employees Function
 * Retrieves real-time data of who is currently clocked in at any location
 * POST /api/par-brink/clocked-in
 */
export async function parBrinkClockedIn(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    context.log('PAR Brink Clocked In request started');

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

    // Get location information
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

    const currentLocalTime = getCurrentLocalTime(locationInfo.timezone, true);

    context.log(`Fetching clocked-in data for location: ${locationInfo.name} (${locationInfo.state}) on date: ${targetDate}`);
    context.log(`Location timezone: ${locationInfo.timezone}`);
    context.log(`Current local time: ${currentLocalTime}`);

    // Fetch employee data first
    const employees = await fetchParBrinkEmployees(accessToken, locationToken, context);
    
    // Fetch current time entries (punch data) for today
    const timeEntries = await fetchCurrentTimeEntries(accessToken, locationToken, targetDate, offsetMinutes, locationInfo.timezone, context);

    // Process data to determine who is currently clocked in
    const clockedInEmployees = processClockEntries(employees, timeEntries, locationInfo.timezone, context);

    // Calculate metrics
    const totalEmployeesWorking = clockedInEmployees.filter(emp => emp.currentStatus === 'clocked-in').length;
    const employeesOnBreak = clockedInEmployees.filter(emp => emp.currentStatus === 'on-break').length;

    const responseData: ClockedInResponse = {
      location: locationInfo.name,
      locationId: locationInfo.id,
      businessDate: targetDate,
      currentTime: currentLocalTime,
      clockedInEmployees: clockedInEmployees.sort((a, b) => 
        new Date(a.clockInTime).getTime() - new Date(b.clockInTime).getTime()
      ),
      totalEmployeesWorking,
      employeesOnBreak,
      lastUpdated: new Date().toISOString()
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      jsonBody: {
        success: true,
        data: responseData
      }
    };

  } catch (error) {
    context.error('Error in PAR Brink Clocked In:', error);
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

/**
 * Fetch employee data from PAR Brink
 */
async function fetchParBrinkEmployees(accessToken: string, locationToken: string, context: InvocationContext): Promise<Employee[]> {
  try {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:set="http://www.brinksoftware.com/webservices/settings/v2">
        <soap:Header />
        <soap:Body>
            <set:GetEmployees />
        </soap:Body>
    </soap:Envelope>`;

    const response = await axios.post('https://api11.brinkpos.net/Settings2.svc', soapEnvelope, {
      headers: {
        'AccessToken': accessToken,
        'LocationToken': locationToken,
        'Content-Type': 'text/xml',
        'SOAPAction': 'http://www.brinksoftware.com/webservices/settings/v2/ISettingsWebService2/GetEmployees'
      },
      timeout: 15000
    });

    // Parse XML response to extract employee data
    const employees = parseEmployeeXML(response.data, context);
    context.log(`Retrieved ${employees.length} employees from PAR Brink`);
    
    return employees;

  } catch (error) {
    context.error('Error fetching PAR Brink employees:', error);
    throw error;
  }
}

/**
 * Fetch current time entries (punch data) from PAR Brink
 */
async function fetchCurrentTimeEntries(accessToken: string, locationToken: string, businessDate: string, offsetMinutes: number, _timezone: string, context: InvocationContext): Promise<TimeEntry[]> {
  try {
    // PAR Brink SOAP request for labor/punch data
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:lab="http://www.brinksoftware.com/webservices/labor/v2">
        <soap:Header />
        <soap:Body>
            <lab:GetPunchDetailsByBusinessDate>
                <lab:businessDate>${businessDate}</lab:businessDate>
                <lab:timezoneOffsetMinutes>${offsetMinutes}</lab:timezoneOffsetMinutes>
            </lab:GetPunchDetailsByBusinessDate>
        </soap:Body>
    </soap:Envelope>`;

    context.log('Making PAR Brink Labor API call for punch data');
    context.log(`Business Date: ${businessDate}, Timezone Offset: ${offsetMinutes} minutes`);

    const response = await axios.post('https://api11.brinkpos.net/Labor2.svc', soapEnvelope, {
      headers: {
        'AccessToken': accessToken,
        'LocationToken': locationToken,
        'Content-Type': 'text/xml',
        'SOAPAction': 'http://www.brinksoftware.com/webservices/labor/v2/ILaborWebService2/GetPunchDetailsByBusinessDate'
      },
      timeout: 20000
    });

    // Parse XML response to extract punch data
    const timeEntries = parsePunchXML(response.data, context);
    context.log(`Retrieved ${timeEntries.length} time entries from PAR Brink`);
    
    return timeEntries;

  } catch (error) {
    context.error('Error fetching time entries:', error);
    // Return empty array rather than failing completely
    return [];
  }
}

/**
 * Parse employee XML data from PAR Brink response
 */
function parseEmployeeXML(xmlData: string, context: InvocationContext): Employee[] {
  const employees: Employee[] = [];
  
  try {
    // Simple XML parsing - in production you'd use a proper XML parser
    const employeeRegex = /<Employee[^>]*>(.*?)<\/Employee>/gs;
    const matches = Array.from(xmlData.matchAll(employeeRegex));
    
    matches.forEach(match => {
      const employeeXml = match[1];
      
      const id = extractXmlValue(employeeXml, 'Id') || '';
      const firstName = extractXmlValue(employeeXml, 'FirstName') || '';
      const lastName = extractXmlValue(employeeXml, 'LastName') || '';
      const employeeNumber = extractXmlValue(employeeXml, 'EmployeeNumber') || '';
      const position = extractXmlValue(employeeXml, 'JobTitle') || extractXmlValue(employeeXml, 'Position') || '';
      const status = extractXmlValue(employeeXml, 'IsActive') === 'true' ? 'Active' : 'Inactive';
      
      if (id && firstName && lastName && status === 'Active') {
        employees.push({
          id,
          firstName,
          lastName,
          employeeNumber,
          position,
          status
        });
      }
    });
    
  } catch (error) {
    context.error('Error parsing employee XML:', error);
  }
  
  return employees;
}

/**
 * Parse punch XML data from PAR Brink response
 */
function parsePunchXML(xmlData: string, context: InvocationContext): TimeEntry[] {
  const timeEntries: TimeEntry[] = [];
  
  try {
    // Simple XML parsing for punch details
    const punchRegex = /<PunchDetail[^>]*>(.*?)<\/PunchDetail>/gs;
    const matches = Array.from(xmlData.matchAll(punchRegex));
    
    matches.forEach(match => {
      const punchXml = match[1];
      
      const employeeId = extractXmlValue(punchXml, 'employee Id') || extractXmlValue(punchXml, 'EmployeeId') || '';
      const localTime = extractXmlValue(punchXml, 'local Time') || extractXmlValue(punchXml, 'LocalTime') || '';
      const punchType = extractXmlValue(punchXml, 'Type') || '';
      const timeZone = extractXmlValue(punchXml, 'timeZone') || '';
      const location = extractXmlValue(punchXml, 'cost center 1') || '';
      
      if (employeeId && localTime && punchType) {
        timeEntries.push({
          employeeId,
          clockInTime: localTime,
          timeZone,
          location,
          position: '', // Will be filled from employee data
          currentStatus: determinePunchStatus(punchType),
          duration: ''  // Will be calculated
        });
      }
    });
    
  } catch (error) {
    context.error('Error parsing punch XML:', error);
  }
  
  return timeEntries;
}

/**
 * Process clock entries to determine who is currently working
 */
function processClockEntries(employees: Employee[], timeEntries: TimeEntry[], timezone: string, context: InvocationContext): ClockedInEmployee[] {
  const clockedInEmployees: ClockedInEmployee[] = [];
  const now = new Date();
  
  // Group time entries by employee
  const entriesByEmployee = new Map<string, TimeEntry[]>();
  timeEntries.forEach(entry => {
    if (!entriesByEmployee.has(entry.employeeId)) {
      entriesByEmployee.set(entry.employeeId, []);
    }
    entriesByEmployee.get(entry.employeeId)!.push(entry);
  });
  
  // Process each employee's time entries
  entriesByEmployee.forEach((entries, employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;
    
    // Sort entries by time
    entries.sort((a, b) => new Date(a.clockInTime).getTime() - new Date(b.clockInTime).getTime());
    
    // Determine current status from latest entries
    const currentStatus = determineCurrentStatus(entries, now);
    
    if (currentStatus.isWorking) {
      const duration = calculateDuration(currentStatus.clockInTime!, now);
      
      clockedInEmployees.push({
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        clockInTime: currentStatus.clockInTime!,
        duration,
        location: currentStatus.location,
        currentStatus: currentStatus.status,
        timeZone: timezone
      });
    }
  });
  
  context.log(`Found ${clockedInEmployees.length} employees currently working`);
  return clockedInEmployees;
}

/**
 * Determine punch status from punch type
 */
function determinePunchStatus(punchType: string): 'clocked-in' | 'on-break' | 'clocked-out' {
  const type = punchType.toLowerCase();
  
  if (type.includes('in') || type.includes('start')) {
    return 'clocked-in';
  } else if (type.includes('break')) {
    return 'on-break';
  } else {
    return 'clocked-out';
  }
}

/**
 * Determine current working status from time entries
 */
function determineCurrentStatus(entries: TimeEntry[], currentTime: Date): {
  isWorking: boolean;
  status: 'clocked-in' | 'on-break';
  clockInTime?: string;
  location: string;
} {
  let isWorking = false;
  let currentStatus: 'clocked-in' | 'on-break' = 'clocked-in';
  let clockInTime: string | undefined;
  let location = '';
  
  // Process entries in chronological order to determine final status
  for (const entry of entries) {
    const entryTime = new Date(entry.clockInTime);
    
    // Only consider entries from today
    if (entryTime.toDateString() !== currentTime.toDateString()) {
      continue;
    }
    
    if (entry.currentStatus === 'clocked-in') {
      isWorking = true;
      currentStatus = 'clocked-in';
      if (!clockInTime) {
        clockInTime = entry.clockInTime;
      }
      location = entry.location;
    } else if (entry.currentStatus === 'on-break') {
      currentStatus = 'on-break';
      location = entry.location;
    } else if (entry.currentStatus === 'clocked-out') {
      isWorking = false;
      clockInTime = undefined;
    }
  }
  
  return {
    isWorking,
    status: currentStatus,
    clockInTime,
    location
  };
}

/**
 * Calculate duration between two times
 */
function calculateDuration(startTime: string, endTime: Date): string {
  const start = new Date(startTime);
  const diffMs = endTime.getTime() - start.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

/**
 * Extract value from XML element
 */
function extractXmlValue(xml: string, elementName: string): string | null {
  const regex = new RegExp(`<${elementName}[^>]*>([^<]*)<\/${elementName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Shared utility functions from parBrinkDashboard.ts
function getLocationMapping(): { [token: string]: { name: string; id: string; timezone: string; state: string } } {
  return {
    'e6b5c2a4-8f3d-4e1b-9c7a-5d2f1e8b4c6a': {
      name: 'Denver West',
      id: '109',
      timezone: 'America/Denver',
      state: 'Colorado'
    },
    'f7c6d3b5-9e4f-5f2c-ad8b-6e3f2f9c5d7b': {
      name: 'Colorado Springs',
      id: '110', 
      timezone: 'America/Denver',
      state: 'Colorado'
    },
    'a8d7e4c6-af5g-6g3d-be9c-7f4g3gad6e8c': {
      name: 'Fort Collins',
      id: '111',
      timezone: 'America/Denver', 
      state: 'Colorado'
    }
  };
}

function getCurrentLocalTime(timezone: string, includeTime: boolean = false): string {
  const now = new Date();
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  if (includeTime) {
    return localTime.toISOString();
  } else {
    return localTime.toISOString().slice(0, 10);
  }
}

async function getTimezoneDataAndBusinessDate(timezone: string): Promise<{ offsetMinutes: number; businessDate: string; currentLocalTime: string }> {
  try {
    // Try WorldTimeAPI first for accurate timezone data with DST
    const response = await axios.get(`https://worldtimeapi.org/api/timezone/${timezone}`, {
      timeout: 5000
    });

    if (response.data && response.data.raw_offset !== undefined && response.data.dst_offset !== undefined) {
      const totalOffsetSeconds = response.data.raw_offset + (response.data.dst ? response.data.dst_offset : 0);
      const offsetMinutes = Math.round(Math.abs(totalOffsetSeconds / 60));
      
      const localDateTime = response.data.datetime;
      const localDate = new Date(localDateTime);
      
      // Restaurant business logic: if it's before 3 AM, use previous day as business date
      let businessDate: string;
      if (localDate.getHours() < 3) {
        const prevDay = new Date(localDate);
        prevDay.setDate(prevDay.getDate() - 1);
        businessDate = prevDay.toISOString().slice(0, 10);
      } else {
        businessDate = localDate.toISOString().slice(0, 10);
      }

      const currentLocalTime = localDate.toISOString().slice(0, 19);

      return {
        offsetMinutes,
        businessDate,
        currentLocalTime
      };
    }
  } catch (error) {
    console.log(`WorldTimeAPI failed for ${timezone}, falling back to manual calculation`);
  }

  // Fallback to manual calculation
  const checkDate = new Date();
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

  const parts = formatter.formatToParts(checkDate);
  const partsMap: { [key: string]: string } = {};
  parts.forEach(part => {
    partsMap[part.type] = part.value;
  });

  const localTime = new Date(`${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}`);
  
  let businessDate: string;
  if (localTime.getHours() < 3) {
    const prevDay = new Date(localTime);
    prevDay.setDate(prevDay.getDate() - 1);
    businessDate = prevDay.toISOString().slice(0, 10);
  } else {
    businessDate = localTime.toISOString().slice(0, 10);
  }

  const localAsUTC = new Date(`${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}Z`);
  const offsetMinutes = Math.round(Math.abs((checkDate.getTime() - localAsUTC.getTime()) / (1000 * 60)));

  return {
    offsetMinutes,
    businessDate,
    currentLocalTime: localTime.toISOString().slice(0, 19)
  };
}

// Register the function
app.http('parBrinkClockedIn', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'par-brink/clocked-in',
  handler: parBrinkClockedIn
});
