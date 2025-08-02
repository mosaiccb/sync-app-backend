"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laborShifts = laborShifts;
exports.employees = employees;
exports.sales = sales;
exports.tips = tips;
exports.tills = tills;
const functions_1 = require("@azure/functions");
// Real SOAP API call function - PAR Brink Labor2.svc integration
async function callParBrinkSoapAPI(_endpoint, action, soapBody, accessToken, locationToken) {
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
            case 'GetTills':
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
        const headers = {
            'Content-Type': 'text/xml; charset=utf-8',
            'AccessToken': token || '',
            'LocationToken': locationToken || ''
        };
        // Set correct SOAPAction based on endpoint
        if (action === 'GetShifts') {
            // Labor API actions
            headers['SOAPAction'] = `http://www.brinksoftware.com/webservices/labor/v2/ILaborWebService2/${action}`;
        }
        else if (action === 'GetEmployees') {
            // Settings API actions
            headers['SOAPAction'] = `http://www.brinksoftware.com/webservices/settings/v2/ISettingsWebService2/${action}`;
        }
        else {
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
        }
        catch {
            // Parse SOAP XML response - need to access through envelope structure like PowerShell
            console.log('SOAP XML response detected, parsing SOAP envelope...');
            console.log('Raw response (first 1000 chars):', responseText.substring(0, 1000));
            // Check for SOAP faults first
            const soapFaultMatch = responseText.match(/<soap:Fault|<s:Fault/i);
            if (soapFaultMatch) {
                const faultString = responseText.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i)?.[1] || 'SOAP Fault';
                throw new Error(`PAR Brink SOAP Fault: ${faultString}`);
            }
            // Check for PAR Brink API errors
            const errorMatch = responseText.match(/<Message[^>]*>([^<]+)<\/Message>/);
            const resultCodeMatch = responseText.match(/<ResultCode[^>]*>(\d+)<\/ResultCode>/);
            if (resultCodeMatch && resultCodeMatch[1] !== '0') {
                const errorMessage = errorMatch ? errorMatch[1] : 'Unknown PAR Brink error';
                throw new Error(`PAR Brink API error (Code ${resultCodeMatch[1]}): ${errorMessage}`);
            }
            // Parse successful responses based on action type
            if (action === 'GetShifts') {
                const shifts = [];
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
                const employees = [];
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
            if (action === 'GetTills') {
                console.log('=== PARSING GETTILLS SOAP RESPONSE ===');
                // Extract the tills section following PowerShell pattern: 
                // envelope.Body.GetTillsResponse.GetTillsResult.Tills.till
                const tillsResultMatch = responseText.match(/<GetTillsResult[^>]*>([\s\S]*?)<\/GetTillsResult>/i);
                if (!tillsResultMatch) {
                    console.log('No GetTillsResult found in response');
                    return { Tills: { till: [] } };
                }
                const tillsResultXml = tillsResultMatch[1];
                console.log('GetTillsResult section found, length:', tillsResultXml.length);
                // Look for Tills container
                const tillsContainerMatch = tillsResultXml.match(/<Tills[^>]*>([\s\S]*?)<\/Tills>/i);
                if (!tillsContainerMatch) {
                    console.log('No Tills container found in GetTillsResult');
                    return { Tills: { till: [] } };
                }
                const tillsContainerXml = tillsContainerMatch[1];
                console.log('Tills container found, length:', tillsContainerXml.length);
                // Now extract individual Till elements
                const tills = [];
                const tillMatches = tillsContainerXml.match(/<till[^>]*>([\s\S]*?)<\/till>/gi) || [];
                console.log(`Found ${tillMatches.length} till elements in SOAP response`);
                console.log(`Raw tills container (first 1000 chars):`, tillsContainerXml.substring(0, 1000));
                tillMatches.forEach((tillXml, index) => {
                    console.log(`\n--- Parsing till ${index + 1} from SOAP ---`);
                    console.log(`Till XML (first 300 chars):`, tillXml.substring(0, 300));
                    const tillId = tillXml.match(/<CashDrawerId>([^<]+)<\/CashDrawerId>/i)?.[1];
                    const tillNumber = tillXml.match(/<Number>([^<]+)<\/Number>/i)?.[1];
                    const startingBank = tillXml.match(/<StartingBank>([^<]+)<\/StartingBank>/i)?.[1];
                    const isClosed = tillXml.match(/<IsClosed>([^<]+)<\/IsClosed>/i)?.[1];
                    const declaredCash = tillXml.match(/<DeclaredCash>([^<]+)<\/DeclaredCash>/i)?.[1];
                    const overShort = tillXml.match(/<OverShort>([^<]+)<\/OverShort>/i)?.[1];
                    console.log(`Till parsed: ID=${tillId}, Number=${tillNumber}, Bank=${startingBank}, Closed=${isClosed}`);
                    // Parse PaidInOuts following PowerShell pattern: till.PaidInOuts.PaidInOut
                    const paidInOuts = [];
                    // Look for PaidInOuts container first
                    const paidInOutsContainerMatch = tillXml.match(/<PaidInOuts[^>]*>([\s\S]*?)<\/PaidInOuts>/i);
                    if (paidInOutsContainerMatch) {
                        const paidInOutsXml = paidInOutsContainerMatch[1];
                        console.log(`Found PaidInOuts container, length: ${paidInOutsXml.length}`);
                        console.log(`PaidInOuts XML (first 300 chars):`, paidInOutsXml.substring(0, 300));
                        // Extract PaidInOut elements
                        let paidInOutMatches = paidInOutsXml.match(/<PaidInOut[^>]*>([\s\S]*?)<\/PaidInOut>/gi) || [];
                        console.log(`Found ${paidInOutMatches.length} PaidInOut elements`);
                        paidInOutMatches.forEach((paidInOutXml, pioIndex) => {
                            console.log(`\n--- PaidInOut ${pioIndex + 1} from SOAP ---`);
                            console.log(`PaidInOut XML:`, paidInOutXml.substring(0, 200));
                            const accountType = paidInOutXml.match(/<AccountType>([^<]+)<\/AccountType>/i)?.[1];
                            const amount = paidInOutXml.match(/<Amount>([^<]+)<\/Amount>/i)?.[1];
                            const description = paidInOutXml.match(/<Description>([^<]+)<\/Description>/i)?.[1];
                            console.log(`PaidInOut parsed: AccountType=${accountType}, Amount=${amount}, Description=${description}`);
                            if (accountType && amount) {
                                paidInOuts.push({
                                    AccountType: accountType,
                                    Amount: parseFloat(amount || '0'),
                                    Description: description
                                });
                                // Log cash tip discovery
                                if (accountType === '0' && parseFloat(amount) > 0) {
                                    console.log(`✅ CASH TIP FOUND: $${amount} in PaidInOut ${pioIndex + 1}`);
                                }
                            }
                        });
                    }
                    else {
                        console.log('No PaidInOuts container found in till');
                    }
                    console.log(`Till ${index + 1}: ID=${tillId}, Number=${tillNumber}, PaidInOuts=${paidInOuts.length}`);
                    // Include tills with valid ID
                    if (tillId) {
                        tills.push({
                            CashDrawerId: tillId,
                            Id: tillId, // Also include for compatibility
                            Number: tillNumber,
                            StartingBank: parseFloat(startingBank || '0'),
                            IsClosed: isClosed === 'true',
                            DeclaredCash: parseFloat(declaredCash || '0'),
                            OverShort: parseFloat(overShort || '0'),
                            PaidInOuts: {
                                PaidInOut: paidInOuts.length === 1 ? paidInOuts[0] : paidInOuts
                            }
                        });
                    }
                });
                console.log(`\n=== TILLS SOAP PARSING SUMMARY ===`);
                console.log(`Parsed ${tills.length} tills from SOAP response`);
                return { Tills: { till: tills } };
            }
            if (action === 'GetOrders') {
                console.log('=== PARSING GETORDERS SOAP RESPONSE ===');
                // Extract the orders section following PowerShell pattern: 
                // envelope.Body.GetOrdersResponse.GetOrdersResult.orders.order
                const ordersResultMatch = responseText.match(/<GetOrdersResult[^>]*>([\s\S]*?)<\/GetOrdersResult>/i);
                if (!ordersResultMatch) {
                    console.log('No GetOrdersResult found in response');
                    return { Orders: { order: [] } };
                }
                const ordersResultXml = ordersResultMatch[1];
                console.log('GetOrdersResult section found, length:', ordersResultXml.length);
                // Look for Orders container (capital O - based on raw XML)
                const ordersContainerMatch = ordersResultXml.match(/<Orders[^>]*>([\s\S]*?)<\/Orders>/i);
                if (!ordersContainerMatch) {
                    console.log('No Orders container found in GetOrdersResult');
                    return { Orders: { order: [] } };
                }
                const ordersContainerXml = ordersContainerMatch[1];
                console.log('Orders container found, length:', ordersContainerXml.length);
                // Now extract individual Order elements (capital O - based on raw XML)
                const orders = [];
                const orderMatches = ordersContainerXml.match(/<Order[^>]*>([\s\S]*?)<\/Order>/gi) || [];
                console.log(`Found ${orderMatches.length} order elements in SOAP response`);
                console.log(`Raw orders container (first 1000 chars):`, ordersContainerXml.substring(0, 1000));
                orderMatches.forEach((orderXml, index) => {
                    console.log(`\n=== Parsing Order ${index + 1} from SOAP envelope ===`);
                    console.log(`Order XML (first 500 chars):`, orderXml.substring(0, 500));
                    // Parse order fields - note: PowerShell shows these are direct children of <order>
                    const orderId = orderXml.match(/<Id>([^<]+)<\/Id>/i)?.[1];
                    const total = orderXml.match(/<Total>([^<]+)<\/Total>/i)?.[1];
                    const businessDate = orderXml.match(/<BusinessDate>([^<]+)<\/BusinessDate>/i)?.[1];
                    const orderNumber = orderXml.match(/<Number>([^<]+)<\/Number>/i)?.[1];
                    const name = orderXml.match(/<Name>([^<]+)<\/Name>/i)?.[1];
                    console.log(`Order parsed: Id=${orderId}, Number=${orderNumber}, Total=${total}, Name=${name}`);
                    // Parse payments following PowerShell pattern: order.Payments.OrderPayment
                    const payments = [];
                    // Look for Payments container first
                    const paymentsContainerMatch = orderXml.match(/<Payments[^>]*>([\s\S]*?)<\/Payments>/i);
                    if (paymentsContainerMatch) {
                        const paymentsXml = paymentsContainerMatch[1];
                        console.log(`Found Payments container, length: ${paymentsXml.length}`);
                        console.log(`Payments XML (first 300 chars):`, paymentsXml.substring(0, 300));
                        // PowerShell uses OrderPayment, so try that first
                        let paymentMatches = paymentsXml.match(/<OrderPayment[^>]*>([\s\S]*?)<\/OrderPayment>/gi) || [];
                        if (paymentMatches.length === 0) {
                            // Fallback to regular Payment tags
                            paymentMatches = paymentsXml.match(/<Payment[^>]*>([\s\S]*?)<\/Payment>/gi) || [];
                        }
                        console.log(`Found ${paymentMatches.length} payment elements (OrderPayment pattern)`);
                        paymentMatches.forEach((paymentXml, paymentIndex) => {
                            console.log(`\n--- Payment ${paymentIndex + 1} from SOAP ---`);
                            console.log(`Payment XML:`, paymentXml.substring(0, 200));
                            const paymentId = paymentXml.match(/<Id>([^<]+)<\/Id>/i)?.[1] || paymentXml.match(/<id>([^<]+)<\/id>/i)?.[1];
                            const amount = paymentXml.match(/<Amount>([^<]+)<\/Amount>/i)?.[1];
                            const tenderId = paymentXml.match(/<TenderId>([^<]+)<\/TenderId>/i)?.[1];
                            const tipAmount = paymentXml.match(/<TipAmount>([^<]+)<\/TipAmount>/i)?.[1];
                            const employeeId = paymentXml.match(/<EmployeeId>([^<]+)<\/EmployeeId>/i)?.[1];
                            const paymentType = paymentXml.match(/<PaymentType>([^<]+)<\/PaymentType>/i)?.[1];
                            console.log(`Payment parsed: ID=${paymentId}, Amount=${amount}, TipAmount=${tipAmount}, PaymentType=${paymentType}`);
                            if (paymentId) {
                                payments.push({
                                    Id: paymentId,
                                    id: paymentId, // Also include lowercase for compatibility
                                    Amount: parseFloat(amount || '0'),
                                    TenderId: tenderId ? parseInt(tenderId) : null,
                                    TipAmount: parseFloat(tipAmount || '0'),
                                    EmployeeId: employeeId,
                                    PaymentType: paymentType
                                });
                                // Log tip discovery
                                if (tipAmount && parseFloat(tipAmount) > 0) {
                                    console.log(`✅ TIP FOUND: $${tipAmount} in payment ${paymentId}`);
                                }
                            }
                        });
                    }
                    else {
                        console.log('No Payments container found in order');
                    }
                    console.log(`Order ${index + 1}: Id=${orderId}, Number=${orderNumber}, Total=${total}, Name=${name}, Payments=${payments.length}`);
                    // Include orders with valid ID and non-zero totals (exclude test/incomplete orders)
                    if (orderId && total && parseFloat(total) > 0) {
                        orders.push({
                            OrderId: orderId,
                            Id: orderId, // Also include Id for compatibility
                            Total: parseFloat(total),
                            BusinessDate: businessDate,
                            Number: orderNumber,
                            Name: name,
                            Payments: payments
                        });
                        console.log(`✅ Added order ${index + 1} to results`);
                    }
                    else {
                        console.log(`❌ Skipped order ${index + 1}: missing required fields or zero total`);
                    }
                });
                console.log(`\n=== SOAP PARSING COMPLETE ===`);
                console.log(`Parsed ${orders.length} valid orders from PAR Brink SOAP response`);
                return { Orders: { order: orders } };
            }
            // Default fallback
            return { Success: true, RawResponse: responseText };
        }
    }
    catch (error) {
        // Enhanced error handling for PAR Brink connection issues
        const errorMessage = error instanceof Error ? error.message : 'Unknown SOAP error';
        console.error(`PAR Brink SOAP ${action} error:`, errorMessage);
        // Check for common PAR Brink connection issues
        if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('timeout')) {
            throw new Error(`PAR Brink server unreachable. Please check server URL and network connectivity.`);
        }
        else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            throw new Error(`PAR Brink authentication failed. Please check access token and credentials.`);
        }
        else if (errorMessage.includes('WSDL')) {
            throw new Error(`PAR Brink WSDL not found. Please verify WSDL URL: ${process.env.PAR_BRINK_WSDL_URL}`);
        }
        throw new Error(`PAR Brink ${action} failed: ${errorMessage}`);
    }
}
// Get current clocked-in employees from PAR Brink
async function getParBrinkClockedInEmployees(accessToken, locationToken, businessDate) {
    try {
        // Get Mountain Time (PAR Brink timezone) - based on PowerShell examples
        const now = new Date();
        const mtTime = new Date(now.getTime() - (7 * 60 * 60 * 1000)); // UTC-7 for Mountain Time
        // Extract just the date part to avoid duplicate timestamps
        let mTimeDay;
        if (businessDate) {
            // If businessDate is provided, extract just the date part (remove any existing time)
            mTimeDay = businessDate.split('T')[0];
            console.log(`Using provided business date: ${businessDate} -> extracted date: ${mTimeDay}`);
        }
        else {
            // Use current Mountain Time date
            mTimeDay = mtTime.toISOString().split('T')[0];
            console.log(`Using current Mountain Time date: ${mTimeDay}`);
        }
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
        console.log(`PAR Brink SOAP GetShifts request to https://api11.brinkpos.net/labor2.svc: ${soapBody}`);
        console.log(`PAR Brink SOAP GetShifts - Location Token being sent: ${locationToken}`);
        console.log(`PAR Brink SOAP GetShifts - AccessToken provided: ${!!accessToken}`);
        const result = await callParBrinkSoapAPI('Labor2.svc', 'GetShifts', soapBody, accessToken, locationToken);
        // Transform PAR Brink response to our interface
        const shifts = result?.Shifts || [];
        return shifts.map((shift) => ({
            ShiftId: shift.Id || `shift-${shift.EmployeeId}-${Date.now()}`,
            EmployeeId: shift.EmployeeId || '',
            StartTime: shift.StartTime || '',
            EndTime: shift.EndTime || null,
            JobId: shift.JobId || '',
            JobName: '', // Not provided in PAR Brink response
            Hours: shift.MinutesWorked ? Math.round(shift.MinutesWorked / 60 * 100) / 100 : 0,
            Status: shift.EndTime ? 'clocked-out' : 'clocked-in'
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch clocked-in employees: ${errorMessage}`);
    }
}
// Get employee data from PAR Brink
async function getParBrinkEmployees(accessToken, locationToken) {
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
        return employees.map((emp) => ({
            EmployeeId: emp.EmployeeId || '',
            FirstName: emp.FirstName || '',
            LastName: emp.LastName || '',
            Status: emp.Active ? 'active' : 'inactive',
            Position: '', // Not provided in basic PAR Brink response
            HourlyRate: 0 // Not provided in basic PAR Brink response
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch employees: ${errorMessage}`);
    }
}
// Get sales data from PAR Brink
async function getParBrinkSales(startDate, _endDate, accessToken, locationToken) {
    try {
        // Get current time for business date calculation
        const now = new Date();
        // Use provided start date or current date for business date
        const mTimeDay = startDate || now.toISOString().split('T')[0];
        console.log(`PAR Brink SOAP GetOrders request to https://api11.brinkpos.net/sales2.svc: 
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
            </soapenv:Envelope>`);
        console.log(`PAR Brink SOAP GetOrders - Location Token being sent: ${locationToken}`);
        console.log(`PAR Brink SOAP GetOrders - AccessToken provided: ${!!accessToken}`);
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
        console.log(`PAR Brink SOAP GetOrders response:`, JSON.stringify(result, null, 2));
        // Transform PAR Brink response to our interface
        const orders = result?.Orders?.order || [];
        console.log(`Parsed ${orders.length} orders from PAR Brink API`);
        return orders.map((order) => ({
            SaleId: order.OrderId || `sale-${Date.now()}`,
            Amount: order.Total || 0,
            Timestamp: order.BusinessDate || new Date().toISOString(),
            ItemCount: 0, // Not provided in basic PAR Brink response
            PaymentMethod: '', // Not provided in basic PAR Brink response
            EmployeeId: '', // Not provided in basic PAR Brink response
            Number: order.Number || '', // PAR Brink order number
            Name: order.Name || '' // PAR Brink customer name
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch sales data: ${errorMessage}`);
    }
}
// Get tips data from PAR Brink (both credit card and cash tips)
async function getParBrinkTips(startDate, _endDate, accessToken, locationToken) {
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
        const tipsData = [];
        console.log(`=== TIPS PARSING DEBUG ===`);
        console.log(`Total orders found: ${orders.length}`);
        console.log(`Raw result structure:`, JSON.stringify(result, null, 2));
        orders.forEach((order, orderIndex) => {
            console.log(`\n--- Processing order ${orderIndex + 1} ---`);
            console.log(`Order ID: ${order.OrderId || order.Id}`);
            console.log(`Order Number: ${order.Number}`);
            console.log(`Order Total: ${order.Total}`);
            console.log(`Order Name: ${order.Name}`);
            console.log(`Payments structure:`, JSON.stringify(order.Payments, null, 2));
            // Check if payments exist and handle PowerShell structure: order.Payments.OrderPayment
            let payments = [];
            if (order.Payments) {
                if (Array.isArray(order.Payments)) {
                    // If Payments is directly an array
                    payments = order.Payments;
                }
                else if (order.Payments.OrderPayment) {
                    // PowerShell pattern: order.Payments.OrderPayment (this is what we expect!)
                    payments = Array.isArray(order.Payments.OrderPayment) ? order.Payments.OrderPayment : [order.Payments.OrderPayment];
                    console.log(`    Using PowerShell pattern: order.Payments.OrderPayment`);
                }
                else if (order.Payments.Payment) {
                    // Alternative: payments nested under Payment property
                    payments = Array.isArray(order.Payments.Payment) ? order.Payments.Payment : [order.Payments.Payment];
                    console.log(`    Using alternative pattern: order.Payments.Payment`);
                }
                else {
                    // Direct payments object
                    payments = [order.Payments];
                    console.log(`    Using direct payment object`);
                }
            }
            console.log(`Found ${payments.length} payments for order ${orderIndex + 1}`);
            payments.forEach((payment, paymentIndex) => {
                console.log(`\n  Payment ${paymentIndex + 1}:`);
                console.log(`    Payment ID: ${payment.Id || payment.id}`);
                console.log(`    Amount: ${payment.Amount}`);
                console.log(`    TipAmount: ${payment.TipAmount}`);
                console.log(`    TenderId: ${payment.TenderId}`);
                console.log(`    EmployeeId: ${payment.EmployeeId}`);
                console.log(`    Full payment object:`, JSON.stringify(payment, null, 2));
                // Check for tip amount directly on payment (based on PowerShell structure)
                const tipAmount = parseFloat(payment.TipAmount || '0');
                if (tipAmount > 0) {
                    const tipEntry = {
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
                        PaymentId: payment.Id || payment.id
                    };
                    tipsData.push(tipEntry);
                    console.log(`    ✅ Found tip: $${tipAmount} for Order ${order.OrderId || order.Id}`);
                    console.log(`    Tip entry:`, JSON.stringify(tipEntry, null, 2));
                }
                else {
                    console.log(`    ❌ No tip found (TipAmount: ${payment.TipAmount})`);
                }
                // Also check payment details if they exist
                let details = [];
                if (payment.Details) {
                    details = Array.isArray(payment.Details) ? payment.Details : [payment.Details];
                }
                else if (payment.Detail) {
                    details = Array.isArray(payment.Detail) ? payment.Detail : [payment.Detail];
                }
                console.log(`    Found ${details.length} payment details`);
                details.forEach((detail, detailIndex) => {
                    console.log(`    Detail ${detailIndex + 1}:`, JSON.stringify(detail, null, 2));
                    const detailTipAmount = parseFloat(detail.TipAmount || '0');
                    if (detailTipAmount > 0) {
                        const detailTipEntry = {
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
                            PaymentId: payment.Id || payment.id,
                            DetailId: detail.Id || detail.id
                        };
                        tipsData.push(detailTipEntry);
                        console.log(`    ✅ Found detail tip: $${detailTipAmount} for Order ${order.OrderId || order.Id}`);
                        console.log(`    Detail tip entry:`, JSON.stringify(detailTipEntry, null, 2));
                    }
                    else {
                        console.log(`    ❌ No detail tip found (TipAmount: ${detail.TipAmount})`);
                    }
                });
            });
        });
        console.log(`\n=== TIPS PARSING SUMMARY ===`);
        console.log(`Total tips found: ${tipsData.length}`);
        console.log(`Tips data:`, JSON.stringify(tipsData, null, 2));
        console.log(`Parsed ${tipsData.length} tip entries from ${orders.length} PAR Brink orders`);
        return tipsData;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('PAR Brink tips extraction error:', errorMessage);
        throw new Error(`Failed to fetch tips data: ${errorMessage}`);
    }
}
// Get till data from PAR Brink (for cash tips)
async function getParBrinkTills(businessDate, accessToken, locationToken) {
    try {
        // Get current time for business date calculation
        const now = new Date();
        // Use provided business date or current date
        const mTimeDay = businessDate || now.toISOString().split('T')[0];
        console.log(`PAR Brink SOAP GetTills request for cash tips - Business Date: ${mTimeDay}`);
        // Use GetTills call matching PowerShell example
        const soapBody = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2">
                <soapenv:Header/>
                <soapenv:Body>
                    <v2:GetTills>
                        <v2:request>
                            <v2:BusinessDate>${mTimeDay}</v2:BusinessDate>
                        </v2:request>
                    </v2:GetTills>
                </soapenv:Body>
            </soapenv:Envelope>`;
        const result = await callParBrinkSoapAPI('Sales2.svc', 'GetTills', soapBody, accessToken, locationToken);
        console.log(`PAR Brink SOAP GetTills response:`, JSON.stringify(result, null, 2));
        // Parse tills and extract cash tips data from PaidInOuts
        // PowerShell structure: tillResponse.envelope.Body.GetTillsResponse.GetTillsResult.Tills.till
        // But our parsed result should be: result.Tills.till (similar to Orders.Order pattern)
        const tills = result?.Tills?.till || result?.Tills?.Till || [];
        const tillsData = [];
        console.log(`=== TILLS PARSING DEBUG ===`);
        console.log(`Total tills found: ${tills.length}`);
        console.log(`Raw result structure:`, JSON.stringify(result, null, 2));
        tills.forEach((till, tillIndex) => {
            console.log(`\n--- Processing till ${tillIndex + 1} ---`);
            console.log(`Till ID: ${till.CashDrawerId || till.Id}`);
            console.log(`Till Number: ${till.Number}`);
            console.log(`Starting Bank: ${till.StartingBank}`);
            console.log(`Is Closed: ${till.IsClosed}`);
            console.log(`PaidInOuts structure:`, JSON.stringify(till.PaidInOuts, null, 2));
            let paidInAmount = 0;
            let paidOutAmount = 0;
            // Check if PaidInOuts exist and handle structure: till.PaidInOuts.PaidInOut
            if (till.PaidInOuts && till.PaidInOuts.PaidInOut) {
                let paidInOuts = [];
                if (Array.isArray(till.PaidInOuts.PaidInOut)) {
                    paidInOuts = till.PaidInOuts.PaidInOut;
                }
                else {
                    paidInOuts = [till.PaidInOuts.PaidInOut];
                }
                console.log(`Found ${paidInOuts.length} PaidInOut entries for till ${tillIndex + 1}`);
                paidInOuts.forEach((pio, pioIndex) => {
                    console.log(`\n  PaidInOut ${pioIndex + 1}:`);
                    console.log(`    AccountType: ${pio.AccountType}`);
                    console.log(`    Amount: ${pio.Amount}`);
                    console.log(`    Description: ${pio.Description}`);
                    console.log(`    Full PaidInOut object:`, JSON.stringify(pio, null, 2));
                    const amount = parseFloat(pio.Amount || '0');
                    // PowerShell logic: AccountType "0" = PaidIn (cash tips), "1" = PaidOut
                    switch (pio.AccountType) {
                        case "0":
                            paidInAmount += amount;
                            console.log(`    ✅ Cash Tip (PaidIn): $${amount}`);
                            break;
                        case "1":
                            paidOutAmount += amount;
                            console.log(`    💰 PaidOut: $${amount}`);
                            break;
                        default:
                            console.log(`    ❓ Unknown AccountType: ${pio.AccountType}`);
                    }
                });
            }
            else {
                console.log('No PaidInOuts found in till');
            }
            const tillEntry = {
                TillID: till.CashDrawerId || till.Id,
                TillNumber: till.Number,
                BusinessDate: mTimeDay,
                StartingBank: parseFloat(till.StartingBank || '0'),
                IsClosed: till.IsClosed,
                DeclaredCash: parseFloat(till.DeclaredCash || '0'),
                OverShort: parseFloat(till.OverShort || '0'),
                CashTips: paidInAmount,
                PaidOut: paidOutAmount,
                TotalIn: paidInAmount,
                TotalOut: paidOutAmount,
                NetPaidIO: paidInAmount - paidOutAmount,
                Timestamp: new Date().toISOString()
            };
            tillsData.push(tillEntry);
            console.log(`Till ${tillIndex + 1}: CashTips=$${paidInAmount}, PaidOut=$${paidOutAmount}, Net=$${paidInAmount - paidOutAmount}`);
        });
        console.log(`\n=== TILLS PARSING SUMMARY ===`);
        console.log(`Total tills processed: ${tillsData.length}`);
        console.log(`Total cash tips: $${tillsData.reduce((sum, till) => sum + till.CashTips, 0)}`);
        console.log(`Tills data:`, JSON.stringify(tillsData, null, 2));
        console.log(`Parsed ${tillsData.length} till entries from ${tills.length} PAR Brink tills`);
        return tillsData;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('PAR Brink tills extraction error:', errorMessage);
        throw new Error(`Failed to fetch tills data: ${errorMessage}`);
    }
}
// Labor shifts endpoint - real PAR Brink integration
async function laborShifts(request, context) {
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
            }
            catch (parseError) {
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
    }
    catch (error) {
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
async function employees(request, context) {
    try {
        context.log('PAR Brink employees endpoint called');
        // Handle both GET and POST requests
        let requestData;
        if (request.method === 'POST') {
            try {
                const body = await request.text();
                requestData = JSON.parse(body);
                context.log('Request data:', requestData);
            }
            catch (parseError) {
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
    }
    catch (error) {
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
async function sales(request, context) {
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
            }
            catch (parseError) {
                context.log('Error parsing request body:', parseError);
            }
        }
        else {
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
    }
    catch (error) {
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
async function tips(request, context) {
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
            }
            catch (parseError) {
                context.log('Error parsing request body:', parseError);
            }
        }
        else {
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
    }
    catch (error) {
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
// Tills endpoint - real PAR Brink integration (for cash tips)
async function tills(request, context) {
    try {
        context.log('PAR Brink tills endpoint called');
        let businessDate, accessToken, locationToken;
        // Handle both GET and POST requests
        if (request.method === 'POST') {
            try {
                const body = await request.text();
                const requestData = JSON.parse(body);
                businessDate = requestData.businessDate;
                accessToken = requestData.accessToken;
                locationToken = requestData.locationToken;
                context.log('Tills request data:', requestData);
            }
            catch (parseError) {
                context.log('Error parsing request body:', parseError);
            }
        }
        else {
            const url = new URL(request.url);
            businessDate = url.searchParams.get('businessDate') || undefined;
        }
        const tillsData = await getParBrinkTills(businessDate, accessToken, locationToken);
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
                data: tillsData,
                timestamp: new Date().toISOString(),
                source: 'par-brink-api'
            })
        };
    }
    catch (error) {
        context.log('PAR Brink tills error:', error);
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
functions_1.app.http('par-brink-labor-shifts', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/labor-shifts',
    handler: laborShifts
});
functions_1.app.http('par-brink-employees', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/employees',
    handler: employees
});
functions_1.app.http('par-brink-sales', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/sales',
    handler: sales
});
functions_1.app.http('par-brink-tips', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/tips',
    handler: tips
});
functions_1.app.http('par-brink-tills', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'par-brink/tills',
    handler: tills
});
//# sourceMappingURL=parBrinkEnhanced.js.map