"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.laborShifts = laborShifts;
exports.employees = employees;
exports.sales = sales;
const functions_1 = require("@azure/functions");
const TenantDatabaseService_1 = require("../services/TenantDatabaseService");
// Get PAR Brink configuration from database or fallback to environment
async function getParBrinkConfiguration() {
    try {
        const tenantService = new TenantDatabaseService_1.TenantDatabaseService();
        const apis = await tenantService.getThirdPartyAPIsByProvider('PAR Brink');
        if (apis.length > 0) {
            const parBrinkApi = apis[0];
            // First try to get access token from Key Vault using KeyVaultSecretName
            if (parBrinkApi.KeyVaultSecretName) {
                try {
                    console.log(`Retrieving PAR Brink access token from Key Vault: ${parBrinkApi.KeyVaultSecretName}`);
                    // Use the getClientSecret method pattern but for PAR Brink secret
                    const { SecretClient } = await Promise.resolve().then(() => __importStar(require('@azure/keyvault-secrets')));
                    const { DefaultAzureCredential } = await Promise.resolve().then(() => __importStar(require('@azure/identity')));
                    const credential = new DefaultAzureCredential();
                    const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL || 'https://ukgsync-kv-5rrqlcuxyzlvy.vault.azure.net/';
                    const keyVaultClient = new SecretClient(keyVaultUrl, credential);
                    const secret = await keyVaultClient.getSecret(parBrinkApi.KeyVaultSecretName);
                    if (secret.value) {
                        console.log('Successfully retrieved PAR Brink access token from Key Vault');
                        return { accessToken: secret.value };
                    }
                    else {
                        console.log('Key Vault secret exists but has no value');
                    }
                }
                catch (keyVaultError) {
                    console.log('Key Vault retrieval failed, trying other methods:', keyVaultError);
                }
            }
            // Fallback to ConfigurationJson if Key Vault fails
            if (parBrinkApi.ConfigurationJson) {
                const config = JSON.parse(parBrinkApi.ConfigurationJson);
                // Only use database token if it's not the demo token
                if (config.accessToken && config.accessToken !== 'demo-access-token') {
                    console.log('Using PAR Brink access token from database configuration');
                    return { accessToken: config.accessToken };
                }
                else {
                    console.log(`Database configuration contains demo token: ${config.accessToken}, skipping`);
                }
            }
        }
    }
    catch (error) {
        console.log('Database config error, using environment fallback:', error);
    }
    // Final fallback to environment variable
    const envToken = process.env.PAR_BRINK_ACCESS_TOKEN;
    if (envToken && envToken !== 'demo-access-token') {
        console.log('Using PAR Brink access token from environment variable');
        return { accessToken: envToken };
    }
    console.log('No valid PAR Brink access token found - all sources returned demo token or empty');
    return { accessToken: envToken || '' };
}
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
            case 'GetEmployees':
                apiUrl = laborApiUrl;
                break;
            case 'GetSales':
            case 'GetOrders':
                apiUrl = salesApiUrl;
                break;
            default:
                throw new Error(`Unsupported PAR Brink action: ${action}`);
        }
        // Get access token from configuration if not provided
        let token = accessToken;
        if (!token) {
            const config = await getParBrinkConfiguration();
            token = config.accessToken;
        }
        // Validate access token for debugging
        const expectedToken = 'tBJ5haIyv0uRbbWQL6FbXw==';
        console.log(`Access token validation: Retrieved="${token}", Expected="${expectedToken}", Match=${token === expectedToken}`);
        // TODO: REMOVE THIS VALIDATION LOG ONCE ACCESS TOKEN ISSUE IS RESOLVED!
        // Check if we have access token configured
        if (!token) {
            throw new Error('PAR Brink access token not configured. Please check database configuration or set PAR_BRINK_ACCESS_TOKEN environment variable.');
        }
        // PAR Brink SOAP Headers - based on working parBrinkDashboard.ts
        const headers = {
            'Content-Type': 'text/xml; charset=utf-8',
            'AccessToken': token || '',
            'LocationToken': locationToken || ''
        };
        // Set correct SOAPAction based on endpoint
        if (action === 'GetShifts' || action === 'GetEmployees') {
            // Labor API actions
            headers['SOAPAction'] = `http://www.brinksoftware.com/webservices/labor/v2/ILaborWebService2/${action}`;
        }
        else {
            // Sales API actions
            headers['SOAPAction'] = `http://www.brinksoftware.com/webservices/sales/v2/ISalesWebService2/${action}`;
        }
        // Log the SOAP request for debugging
        console.log(`PAR Brink SOAP ${action} request to ${apiUrl}:`, soapBody);
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
            if (action === 'GetOrders') {
                const orders = [];
                const orderMatches = responseText.match(/<order>[\s\S]*?<\/order>/g) || [];
                orderMatches.forEach(orderXml => {
                    const orderId = orderXml.match(/<OrderId>([^<]+)<\/OrderId>/)?.[1];
                    const total = orderXml.match(/<Total>([^<]+)<\/Total>/)?.[1];
                    const businessDate = orderXml.match(/<BusinessDate>([^<]+)<\/BusinessDate>/)?.[1];
                    if (orderId) {
                        orders.push({
                            OrderId: orderId,
                            Total: parseFloat(total || '0'),
                            BusinessDate: businessDate
                        });
                    }
                });
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
        const mTimeNow = mtTime.toISOString().replace('Z', '');
        const mTimeDay = businessDate || mtTime.toISOString().split('T')[0];
        // Calculate Mountain Time offset minutes (MST = -420, MDT = -360)
        // PAR Brink expects the timezone offset for Mountain Time zone
        // July 27, 2025 is during Daylight Saving Time, so use MDT
        const offsetMinutes = -360; // Mountain Daylight Time (UTC-6)
        const soapBody = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/labor/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
                <soapenv:Header/>
                <soapenv:Body>
                    <v2:GetShifts>
                        <v2:request>
                            <v2:BusinessDate>${mTimeDay}</v2:BusinessDate>
                            <v2:ModifiedTime>
                                <sys:DateTime>${mTimeNow}</sys:DateTime>
                                <sys:OffsetMinutes>${offsetMinutes}</sys:OffsetMinutes>
                            </v2:ModifiedTime>
                        </v2:request>
                    </v2:GetShifts>
                </soapenv:Body>
            </soapenv:Envelope>`;
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
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/labor/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
                <soapenv:Header/>
                <soapenv:Body>
                    <v2:GetEmployees>
                        <v2:request>
                            <v2:Active>true</v2:Active>
                        </v2:request>
                    </v2:GetEmployees>
                </soapenv:Body>
            </soapenv:Envelope>`;
        const result = await callParBrinkSoapAPI('Labor2.svc', 'GetEmployees', soapBody, accessToken, locationToken);
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
        // Get Mountain Time (PAR Brink timezone) - based on PowerShell examples
        const now = new Date();
        const mtTime = new Date(now.getTime() - (7 * 60 * 60 * 1000)); // UTC-7 for Mountain Time
        const mTimeNow = mtTime.toISOString().replace('Z', '');
        const mTimeDay = startDate || mtTime.toISOString().split('T')[0];
        // Calculate Mountain Time offset minutes (MST = -420, MDT = -360)
        // PAR Brink expects the timezone offset for Mountain Time zone
        // July 27, 2025 is during Daylight Saving Time, so use MDT
        const offsetMinutes = -360; // Mountain Daylight Time (UTC-6)
        const soapBody = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
                <soapenv:Header/>
                <soapenv:Body>
                    <v2:GetOrders>
                        <v2:request>
                            <v2:BusinessDate>${mTimeDay}</v2:BusinessDate>
                            <v2:ModifiedTime>
                                <sys:DateTime>${mTimeNow}</sys:DateTime>
                                <sys:OffsetMinutes>${offsetMinutes}</sys:OffsetMinutes>
                            </v2:ModifiedTime>
                        </v2:request>
                    </v2:GetOrders>
                </soapenv:Body>
            </soapenv:Envelope>`;
        const result = await callParBrinkSoapAPI('Sales2.svc', 'GetOrders', soapBody, accessToken, locationToken);
        // Transform PAR Brink response to our interface
        const orders = result?.Orders?.order || [];
        return orders.map((order) => ({
            SaleId: order.OrderId || `sale-${Date.now()}`,
            Amount: order.Total || 0,
            Timestamp: order.BusinessDate || new Date().toISOString(),
            ItemCount: 0, // Not provided in basic PAR Brink response
            PaymentMethod: '', // Not provided in basic PAR Brink response
            EmployeeId: '' // Not provided in basic PAR Brink response
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch sales data: ${errorMessage}`);
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
//# sourceMappingURL=parBrinkEnhanced.js.map