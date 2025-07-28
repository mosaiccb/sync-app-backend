import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

// Production-ready PAR Brink API integration
// Real SOAP API integration with PAR Brink Labor2.svc

export interface ParBrinkEmployee {
    EmployeeId: string;
}

export interface ParBrinkShift {
    ShiftId: string;
    EmployeeId: string;
    StartTime: string;
    EndTime?: string;
    JobId?: string;
    JobName?: string;
    Hours?: number;
    Status: 'clocked-in' | 'clocked-out' | 'break';
}

export interface ParBrinkSales {
    SaleId: string;
    Amount: number;
    Timestamp: string;
    ItemCount: number;
    PaymentMethod?: string;
    EmployeeId?: string;
}

// Real SOAP API call function - PAR Brink Labor2.svc integration
async function callParBrinkSoapAPI(
    _endpoint: string,
    action: string,
    soapBody: string,
    accessToken?: string,
    locationToken?: string
): Promise<any> {
    try {
        // PAR Brink API URL - based on working PowerShell examples
        const salesApiUrl = process.env.PAR_BRINK_SALES_URL || 'https://api11.brinkpos.net/sales2.svc';
        const laborApiUrl = process.env.PAR_BRINK_LABOR_URL || 'https://api11.brinkpos.net/labor2.svc';
        
        // Select appropriate endpoint based on action
        let apiUrl;
        switch (action) {
            case 'GetShifts':
                apiUrl = laborApiUrl;
                break;
            case 'GetEmployees':
                apiUrl = process.env.PAR_BRINK_SETTINGS_URL || 'https://api11.brinkpos.net/Settings2.svc';
                break;
            case 'GetSales':
            case 'GetOrders':
                apiUrl = salesApiUrl;
                break;
            default:
                throw new Error(`Unsupported PAR Brink action: ${action}`);
        }
        
        // Use provided access token or throw error if not provided
        const token = accessToken;
        if (!token) {
            throw new Error('PAR Brink access token is required but not provided in the request.');
        }
        
        // Validate token is not the demo token
        if (token === 'demo-access-token') {
            throw new Error('Demo access token detected. Please provide a valid PAR Brink access token.');
        }
        
        // PAR Brink SOAP Headers - based on working parBrinkDashboard.ts
        const headers: Record<string, string> = {
            'Content-Type': 'text/xml; charset=utf-8',
            'AccessToken': token || '',
            'LocationToken': locationToken || ''
        };

        // Set correct SOAPAction based on endpoint
        if (action === 'GetShifts') {
            // Labor API actions
            headers['SOAPAction'] = `http://www.brinksoftware.com/webservices/labor/v2/ILaborWebService2/${action}`;
        } else if (action === 'GetEmployees') {
            // Settings API actions
            headers['SOAPAction'] = `http://www.brinksoftware.com/webservices/settings/v2/ISettingsWebService2/${action}`;
        } else {
            // Sales API actions
            headers['SOAPAction'] = `http://www.brinksoftware.com/webservices/sales/v2/ISalesWebService2/${action}`;
        }

        // Log the SOAP request for debugging
        console.log(`PAR Brink SOAP ${action} request to ${apiUrl}:`, soapBody);
        console.log(`PAR Brink SOAP ${action} - Location Token being sent:`, locationToken);
        console.log(`PAR Brink SOAP ${action} - AccessToken provided:`, !!accessToken);

        // Make HTTP POST request instead of SOAP client (matching PowerShell approach)
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: soapBody
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log(`PAR Brink SOAP ${action} response:`, responseText);
        
        // Parse XML response - PAR Brink returns XML SOAP responses
        try {
            // Attempt to parse as JSON first (in case API returns JSON)
            const result = JSON.parse(responseText);
            return result;
        } catch {
            // Parse XML response using basic regex extraction
            console.log('XML response detected, parsing XML...');
            
            // Check for errors first
            const errorMatch = responseText.match(/<Message[^>]*>([^<]+)<\/Message>/);
            const resultCodeMatch = responseText.match(/<ResultCode[^>]*>(\d+)<\/ResultCode>/);
            
            if (resultCodeMatch && resultCodeMatch[1] !== '0') {
                const errorMessage = errorMatch ? errorMatch[1] : 'Unknown PAR Brink error';
                throw new Error(`PAR Brink API error (Code ${resultCodeMatch[1]}): ${errorMessage}`);
            }
            
            // Parse successful responses based on action type
            if (action === 'GetShifts') {
                const shifts: any[] = [];
                const shiftMatches = responseText.match(/<Shift>[\s\S]*?<\/Shift>/g) || [];
                
                shiftMatches.forEach(shiftXml => {
                    const employeeId = shiftXml.match(/<EmployeeId>([^<]+)<\/EmployeeId>/)?.[1];
                    const id = shiftXml.match(/<Id>([^<]+)<\/Id>/)?.[1];
                    const jobId = shiftXml.match(/<JobId>([^<]+)<\/JobId>/)?.[1];
                    const minutesWorked = shiftXml.match(/<MinutesWorked>([^<]+)<\/MinutesWorked>/)?.[1];
                    const payRate = shiftXml.match(/<PayRate>([^<]+)<\/PayRate>/)?.[1];
                    
                    // Parse start time
                    const startTimeMatch = shiftXml.match(/<StartTime[^>]*>[\s\S]*?<a:DateTime>([^<]+)<\/a:DateTime>/);
                    // Parse end time
                    const endTimeMatch = shiftXml.match(/<EndTime[^>]*>[\s\S]*?<a:DateTime>([^<]+)<\/a:DateTime>/);
                    
                    if (employeeId && id) {
                        shifts.push({
                            Id: id,
                            EmployeeId: employeeId,
                            JobId: jobId,
                            MinutesWorked: parseInt(minutesWorked || '0'),
                            PayRate: parseFloat(payRate || '0'),
                            StartTime: startTimeMatch?.[1] || '',
                            EndTime: endTimeMatch?.[1] === '0001-01-01T00:00:00Z' ? null : endTimeMatch?.[1],
                            BusinessDate: shiftXml.match(/<BusinessDate>([^<]+)<\/BusinessDate>/)?.[1]
                        });
                    }
                });
                
                console.log(`PAR Brink GetShifts - Found ${shifts.length} shifts in response for location token:`, locationToken);
                console.log('PAR Brink GetShifts - Parsed shifts:', shifts);
                
                return { Shifts: shifts };
            }
            
            if (action === 'GetEmployees') {
                const employees: any[] = [];
                const empMatches = responseText.match(/<Employee>[\s\S]*?<\/Employee>/g) || [];
                
                empMatches.forEach(empXml => {
                    const employeeId = empXml.match(/<EmployeeId>([^<]+)<\/EmployeeId>/)?.[1];
                    const firstName = empXml.match(/<FirstName>([^<]+)<\/FirstName>/)?.[1];
                    const lastName = empXml.match(/<LastName>([^<]+)<\/LastName>/)?.[1];
                    const active = empXml.match(/<Active>([^<]+)<\/Active>/)?.[1];
                    
                    if (employeeId) {
                        employees.push({
                            EmployeeId: employeeId,
                            FirstName: firstName || '',
                            LastName: lastName || '',
                            Active: active === 'true'
                        });
                    }
                });
                
                return { Employees: employees };
            }
            
            if (action === 'GetOrders') {
                const orders: any[] = [];
                // Fix: Use uppercase Order tags to match actual PAR Brink XML response
                const orderMatches = responseText.match(/<Order>[\s\S]*?<\/Order>/g) || [];
                
                console.log(`Found ${orderMatches.length} Order elements in XML response`);
                
                orderMatches.forEach((orderXml, index) => {
                    // Use proper field names from PAR Brink XML - Id not OrderId, Total is correct
                    const orderId = orderXml.match(/<Id>([^<]+)<\/Id>/)?.[1];
                    const total = orderXml.match(/<Total>([^<]+)<\/Total>/)?.[1];
                    const businessDate = orderXml.match(/<BusinessDate>([^<]+)<\/BusinessDate>/)?.[1];
                    const orderNumber = orderXml.match(/<Number>([^<]+)<\/Number>/)?.[1];
                    const name = orderXml.match(/<Name>([^<]+)<\/Name>/)?.[1];
                    
                    // Parse payments for tip data
                    const payments: any[] = [];
                    const paymentMatches = orderXml.match(/<Payment>[\s\S]*?<\/Payment>/g) || [];
                    
                    paymentMatches.forEach(paymentXml => {
                        const paymentId = paymentXml.match(/<Id>([^<]+)<\/Id>/)?.[1];
                        const amount = paymentXml.match(/<Amount>([^<]+)<\/Amount>/)?.[1];
                        const tenderId = paymentXml.match(/<TenderId>([^<]+)<\/TenderId>/)?.[1];
                        const tipAmount = paymentXml.match(/<TipAmount>([^<]+)<\/TipAmount>/)?.[1];
                        const employeeId = paymentXml.match(/<EmployeeId>([^<]+)<\/EmployeeId>/)?.[1];
                        
                        // Parse payment details for additional tip data
                        const details: any[] = [];
                        const detailMatches = paymentXml.match(/<Detail>[\s\S]*?<\/Detail>/g) || [];
                        
                        detailMatches.forEach(detailXml => {
                            const detailTipAmount = detailXml.match(/<TipAmount>([^<]+)<\/TipAmount>/)?.[1];
                            const detailEmployeeId = detailXml.match(/<EmployeeId>([^<]+)<\/EmployeeId>/)?.[1];
                            const tillNumber = detailXml.match(/<TillNumber>([^<]+)<\/TillNumber>/)?.[1];
                            const detailId = detailXml.match(/<Id>([^<]+)<\/Id>/)?.[1];
                            
                            if (detailTipAmount && parseFloat(detailTipAmount) > 0) {
                                details.push({
                                    Id: detailId,
                                    TipAmount: parseFloat(detailTipAmount || '0'),
                                    EmployeeId: detailEmployeeId,
                                    TillNumber: tillNumber ? parseInt(tillNumber) : null
                                });
                            }
                        });
                        
                        if (paymentId) {
                            payments.push({
                                Id: paymentId,
                                Amount: parseFloat(amount || '0'),
                                TenderId: tenderId ? parseInt(tenderId) : null,
                                TipAmount: parseFloat(tipAmount || '0'),
                                EmployeeId: employeeId,
                                Details: details
                            });
                        }
                    });
                    
                    console.log(`Order ${index + 1}: Id=${orderId}, Number=${orderNumber}, Total=${total}, Name=${name}, Payments=${payments.length}`);
                    
                    // Include orders with valid ID and non-zero totals (exclude test/incomplete orders)
                    if (orderId && total && parseFloat(total) > 0) {
                        orders.push({
                            OrderId: orderId,
                            Total: parseFloat(total),
                            BusinessDate: businessDate,
                            Number: orderNumber,
                            Name: name,
                            Payments: payments
                        });
                        console.log(`Added order ${index + 1} to results`);
                    } else {
                        console.log(`Skipped order ${index + 1}: missing required fields or zero total`);
                    }
                });
                
                console.log(`Parsed ${orders.length} valid orders from PAR Brink XML response`);
                return { Orders: { order: orders } };
            }
            
            // Default fallback
            return { Success: true, RawResponse: responseText };
        }
        
    } catch (error) {
        // Enhanced error handling for PAR Brink connection issues
        const errorMessage = error instanceof Error ? error.message : 'Unknown SOAP error';
        console.error(`PAR Brink SOAP ${action} error:`, errorMessage);
        
        // Check for common PAR Brink connection issues
        if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('timeout')) {
            throw new Error(`PAR Brink server unreachable. Please check server URL and network connectivity.`);
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            throw new Error(`PAR Brink authentication failed. Please check access token and credentials.`);
        } else if (errorMessage.includes('WSDL')) {
            throw new Error(`PAR Brink WSDL not found. Please verify WSDL URL: ${process.env.PAR_BRINK_WSDL_URL}`);
        }
        
        throw new Error(`PAR Brink ${action} failed: ${errorMessage}`);
    }
}

// Get current clocked-in employees from PAR Brink
async function getParBrinkClockedInEmployees(accessToken?: string, locationToken?: string, businessDate?: string): Promise<ParBrinkShift[]> {
    try {
        // Get Mountain Time (PAR Brink timezone) - based on PowerShell examples
        const now = new Date();
        const mtTime = new Date(now.getTime() - (7 * 60 * 60 * 1000)); // UTC-7 for Mountain Time
        const mTimeDay = businessDate || mtTime.toISOString().split('T')[0];

        const soapBody = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/labor/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
                <soapenv:Header/>
                <soapenv:Body>
                    <v2:GetShifts>
                        <v2:request>
                            <v2:BusinessDate>${mTimeDay}T00:00:00</v2:BusinessDate>
                        </v2:request>
                    </v2:GetShifts>
                </soapenv:Body>
            </soapenv:Envelope>`;
        
        const result = await callParBrinkSoapAPI('Labor2.svc', 'GetShifts', soapBody, accessToken, locationToken);
        
        // Transform PAR Brink response to our interface
        const shifts = result?.Shifts || [];
        return shifts.map((shift: any) => ({
            ShiftId: shift.Id || `shift-${shift.EmployeeId}-${Date.now()}`,
            EmployeeId: shift.EmployeeId || '',
            StartTime: shift.StartTime || '',
            EndTime: shift.EndTime || null,
            JobId: shift.JobId || '',
            JobName: '', // Not provided in PAR Brink response
            Hours: shift.MinutesWorked ? Math.round(shift.MinutesWorked / 60 * 100) / 100 : 0,
            Status: shift.EndTime ? 'clocked-out' : 'clocked-in'
        }));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch clocked-in employees: ${errorMessage}`);
    }
}

// Get employee data from PAR Brink
async function getParBrinkEmployees(accessToken?: string, locationToken?: string): Promise<ParBrinkEmployee[]> {
    try {
        const soapBody = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:set="http://www.brinksoftware.com/webservices/settings/v2">
                <soapenv:Header/>
                <soapenv:Body>
                    <set:GetEmployees>
                        <set:request>
                            <set:IncludeJobTypeInfo>true</set:IncludeJobTypeInfo>
                        </set:request>
                    </set:GetEmployees>
                </soapenv:Body>
            </soapenv:Envelope>`;
        
        const result = await callParBrinkSoapAPI('Settings2.svc', 'GetEmployees', soapBody, accessToken, locationToken);
        
        // Transform PAR Brink response to our interface
        const employees = result?.Employees || [];
        return employees.map((emp: any) => ({
            EmployeeId: emp.EmployeeId || '',
            FirstName: emp.FirstName || '',
            LastName: emp.LastName || '',
            Status: emp.Active ? 'active' : 'inactive',
            Position: '', // Not provided in basic PAR Brink response
            HourlyRate: 0 // Not provided in basic PAR Brink response
        }));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch employees: ${errorMessage}`);
    }
}

// Get sales data from PAR Brink
async function getParBrinkSales(startDate?: string, _endDate?: string, accessToken?: string, locationToken?: string): Promise<ParBrinkSales[]> {
    try {
        // Get current time for business date calculation
        const now = new Date();
        
        // Use provided start date or current date for business date
        const mTimeDay = startDate || now.toISOString().split('T')[0];

        console.log(`PAR Brink SOAP GetOrders request to https://api11.brinkpos.net/sales2.svc: 
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
                <soapenv:Header/>
                <soapenv:Body>
                    <v2:GetOrders>
                        <v2:request>
                            <v2:BusinessDate>${mTimeDay}</v2:BusinessDate>
                        </v2:request>
                    </v2:GetOrders>
                </soapenv:Body>
            </soapenv:Envelope>`);
        console.log(`PAR Brink SOAP GetOrders - Location Token being sent: ${locationToken}`);
        console.log(`PAR Brink SOAP GetOrders - AccessToken provided: ${!!accessToken}`);

        const soapBody = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
                <soapenv:Header/>
                <soapenv:Body>
                    <v2:GetOrders>
                        <v2:request>
                            <v2:BusinessDate>${mTimeDay}</v2:BusinessDate>
                        </v2:request>
                    </v2:GetOrders>
                </soapenv:Body>
            </soapenv:Envelope>`;
        
        const result = await callParBrinkSoapAPI('Sales2.svc', 'GetOrders', soapBody, accessToken, locationToken);
        
        console.log(`PAR Brink SOAP GetOrders response:`, JSON.stringify(result, null, 2));
        
        // Transform PAR Brink response to our interface
        const orders = result?.Orders?.order || [];
        console.log(`Parsed ${orders.length} orders from PAR Brink API`);
        
        return orders.map((order: any) => ({
            SaleId: order.OrderId || `sale-${Date.now()}`,
            Amount: order.Total || 0,
            Timestamp: order.BusinessDate || new Date().toISOString(),
            ItemCount: 0, // Not provided in basic PAR Brink response
            PaymentMethod: '', // Not provided in basic PAR Brink response
            EmployeeId: '', // Not provided in basic PAR Brink response
            Number: order.Number || '', // PAR Brink order number
            Name: order.Name || ''       // PAR Brink customer name
        }));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch sales data: ${errorMessage}`);
    }
}

// Get tips data from PAR Brink (both credit card and cash tips)
async function getParBrinkTips(startDate?: string, _endDate?: string, accessToken?: string, locationToken?: string): Promise<any[]> {
    try {
        // Get current time for business date calculation
        const now = new Date();
        
        // Use provided start date or current date for business date
        const mTimeDay = startDate || now.toISOString().split('T')[0];

        console.log(`PAR Brink SOAP GetOrders request for tips analysis - Business Date: ${mTimeDay}`);

        // Use enhanced GetOrders call matching PowerShell example
        const soapBody = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2">
                <soapenv:Header/>
                <soapenv:Body>
                    <v2:GetOrders>
                        <v2:request>
                            <v2:BusinessDate>${mTimeDay}</v2:BusinessDate>
                            <v2:ExcludeOpenOrders>false</v2:ExcludeOpenOrders>
                            <v2:PriceRollUp>RollUpAndDetails</v2:PriceRollUp>
                        </v2:request>
                    </v2:GetOrders>
                </soapenv:Body>
            </soapenv:Envelope>`;
        
        const result = await callParBrinkSoapAPI('Sales2.svc', 'GetOrders', soapBody, accessToken, locationToken);
        
        console.log(`PAR Brink SOAP GetOrders for tips response:`, JSON.stringify(result, null, 2));
        
        // Parse orders and extract tip data from payments
        const orders = result?.Orders?.order || [];
        const tipsData: any[] = [];
        
        orders.forEach((order: any, orderIndex: number) => {
            console.log(`Processing order ${orderIndex + 1}: OrderId=${order.OrderId}, Payments=${order.Payments?.length || 0}`);
            
            if (order.Payments && Array.isArray(order.Payments)) {
                order.Payments.forEach((payment: any, paymentIndex: number) => {
                    console.log(`Processing payment ${paymentIndex + 1}: Amount=${payment.Amount}, TipAmount=${payment.TipAmount}`);
                    
                    // Check for tip amount directly on payment (based on PowerShell structure)
                    const tipAmount = parseFloat(payment.TipAmount || '0');
                    if (tipAmount > 0) {
                        tipsData.push({
                            OrderId: order.OrderId || order.Id,
                            OrderNumber: order.Number,
                            CustomerName: order.Name,
                            TipAmount: tipAmount,
                            PaymentType: payment.TenderId || 'Unknown',
                            PaymentAmount: parseFloat(payment.Amount || '0'),
                            EmployeeId: payment.EmployeeId,
                            TillNumber: payment.TillNumber,
                            BusinessDate: order.BusinessDate,
                            Timestamp: payment.BusinessDate || order.BusinessDate,
                            PaymentId: payment.Id
                        });
                        console.log(`Found tip: $${tipAmount} for Order ${order.OrderId || order.Id}`);
                    }
                    
                    // Also check payment details if they exist
                    if (payment.Details && Array.isArray(payment.Details)) {
                        payment.Details.forEach((detail: any, detailIndex: number) => {
                            console.log(`Processing payment detail ${detailIndex + 1}: TipAmount=${detail.TipAmount}`);
                            
                            const detailTipAmount = parseFloat(detail.TipAmount || '0');
                            if (detailTipAmount > 0) {
                                tipsData.push({
                                    OrderId: order.OrderId || order.Id,
                                    OrderNumber: order.Number,
                                    CustomerName: order.Name,
                                    TipAmount: detailTipAmount,
                                    PaymentType: payment.TenderId || 'Unknown',
                                    PaymentAmount: parseFloat(payment.Amount || '0'),
                                    EmployeeId: detail.EmployeeId || payment.EmployeeId,
                                    TillNumber: detail.TillNumber || payment.TillNumber,
                                    BusinessDate: order.BusinessDate,
                                    Timestamp: payment.BusinessDate || order.BusinessDate,
                                    PaymentId: payment.Id,
                                    DetailId: detail.Id
                                });
                                console.log(`Found detail tip: $${detailTipAmount} for Order ${order.OrderId || order.Id}`);
                            }
                        });
                    }
                });
            }
        });
        
        console.log(`Parsed ${tipsData.length} tip entries from ${orders.length} PAR Brink orders`);
        return tipsData;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('PAR Brink tips extraction error:', errorMessage);
        throw new Error(`Failed to fetch tips data: ${errorMessage}`);
    }
}

// Labor shifts endpoint - real PAR Brink integration
export async function laborShifts(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('PAR Brink labor-shifts endpoint called');
        
        // Handle both GET and POST requests
        let accessToken, locationToken, businessDate;
        
        if (request.method === 'POST') {
            try {
                const body = await request.text();
                const requestData = JSON.parse(body);
                accessToken = requestData.accessToken;
                locationToken = requestData.locationToken;
                businessDate = requestData.businessDate;
            } catch (parseError) {
                context.log('Error parsing request body:', parseError);
            }
        }
        
        context.log('Request params:', { accessToken: !!accessToken, locationToken: !!locationToken, businessDate });
        context.log('Location token being sent to PAR Brink:', locationToken);
        
        const shifts = await getParBrinkClockedInEmployees(accessToken, locationToken, businessDate);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify({
                success: true,
                data: shifts,
                timestamp: new Date().toISOString(),
                source: 'par-brink-api'
            })
        };
    } catch (error) {
        context.log('PAR Brink labor-shifts error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            status: 501,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString(),
                source: 'par-brink-api'
            })
        };
    }
}

// Employees endpoint - real PAR Brink integration
export async function employees(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('PAR Brink employees endpoint called');
        
        // Handle both GET and POST requests
        let requestData;
        if (request.method === 'POST') {
            try {
                const body = await request.text();
                requestData = JSON.parse(body);
                context.log('Request data:', requestData);
            } catch (parseError) {
                context.log('Error parsing request body:', parseError);
            }
        }
        
        const employeeData = await getParBrinkEmployees(requestData?.accessToken, requestData?.locationToken);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify({
                success: true,
                data: employeeData,
                timestamp: new Date().toISOString(),
                source: 'par-brink-api'
            })
        };
    } catch (error) {
        context.log('PAR Brink employees error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            status: 501,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString(),
                source: 'par-brink-api'
            })
        };
    }
}

// Sales endpoint - real PAR Brink integration
export async function sales(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('PAR Brink sales endpoint called');
        
        let startDate, endDate, accessToken, locationToken;
        
        // Handle both GET and POST requests
        if (request.method === 'POST') {
            try {
                const body = await request.text();
                const requestData = JSON.parse(body);
                startDate = requestData.startDate;
                endDate = requestData.endDate;
                accessToken = requestData.accessToken;
                locationToken = requestData.locationToken;
                context.log('Request data:', requestData);
            } catch (parseError) {
                context.log('Error parsing request body:', parseError);
            }
        } else {
            const url = new URL(request.url);
            startDate = url.searchParams.get('startDate') || undefined;
            endDate = url.searchParams.get('endDate') || undefined;
        }
        
        const salesData = await getParBrinkSales(startDate, endDate, accessToken, locationToken);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify({
                success: true,
                data: salesData,
                timestamp: new Date().toISOString(),
                source: 'par-brink-api'
            })
        };
    } catch (error) {
        context.log('PAR Brink sales error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            status: 501,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString(),
                source: 'par-brink-api'
            })
        };
    }
}

// Tips endpoint - real PAR Brink integration
export async function tips(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('PAR Brink tips endpoint called');
        
        let startDate, endDate, accessToken, locationToken;
        
        // Handle both GET and POST requests
        if (request.method === 'POST') {
            try {
                const body = await request.text();
                const requestData = JSON.parse(body);
                startDate = requestData.startDate;
                endDate = requestData.endDate;
                accessToken = requestData.accessToken;
                locationToken = requestData.locationToken;
                context.log('Tips request data:', requestData);
            } catch (parseError) {
                context.log('Error parsing request body:', parseError);
            }
        } else {
            const url = new URL(request.url);
            startDate = url.searchParams.get('startDate') || undefined;
            endDate = url.searchParams.get('endDate') || undefined;
        }
        
        const tipsData = await getParBrinkTips(startDate, endDate, accessToken, locationToken);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify({
                success: true,
                data: tipsData,
                timestamp: new Date().toISOString(),
                source: 'par-brink-api'
            })
        };
    } catch (error) {
        context.log('PAR Brink tips error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            status: 501,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString(),
                source: 'par-brink-api'
            })
        };
    }
}

// Register the function endpoints - matching frontend API expectations
app.http('par-brink-labor-shifts', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/labor-shifts',
    handler: laborShifts
});

app.http('par-brink-employees', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/employees',
    handler: employees
});

app.http('par-brink-sales', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/sales',
    handler: sales
});

app.http('par-brink-tips', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/tips',
    handler: tips
});
