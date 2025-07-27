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
const soap = __importStar(require("soap"));
// Real SOAP API call function - PAR Brink Labor2.svc integration
async function callParBrinkSoapAPI(_endpoint, action, soapBody, accessToken, locationToken) {
    try {
        // PAR Brink WSDL URL (update with actual PAR Brink server URL)
        const wsdlUrl = process.env.PAR_BRINK_WSDL_URL || `https://your-par-brink-server.com/Labor2.svc?wsdl`;
        // Create SOAP client
        const client = await soap.createClientAsync(wsdlUrl, {
            // PAR Brink SOAP client options
            forceSoap12Headers: true, // Use SOAP 1.2
        });
        // Set authentication headers if provided
        if (accessToken) {
            client.addHttpHeader('Authorization', `Bearer ${accessToken}`);
        }
        if (locationToken) {
            client.addHttpHeader('X-Location-Token', locationToken);
        }
        // Log the SOAP request for debugging
        console.log(`PAR Brink SOAP ${action} request:`, soapBody);
        // Make the SOAP call based on action
        let result;
        switch (action) {
            case 'GetShifts':
                result = await client.GetShiftsAsync(soapBody);
                break;
            case 'GetEmployees':
                result = await client.GetEmployeesAsync(soapBody);
                break;
            case 'GetSales':
                result = await client.GetSalesAsync(soapBody);
                break;
            default:
                throw new Error(`Unsupported PAR Brink action: ${action}`);
        }
        console.log(`PAR Brink SOAP ${action} response:`, JSON.stringify(result, null, 2));
        return result[0]; // SOAP client returns [result, rawResponse]
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
        const soapBody = `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
                <soap:Header/>
                <soap:Body>
                    <GetShifts xmlns="http://parbrink.com/labor">
                        <request>
                            <Status>clocked-in</Status>
                            <BusinessDate>${businessDate || new Date().toISOString().split('T')[0]}</BusinessDate>
                            ${locationToken ? `<LocationToken>${locationToken}</LocationToken>` : ''}
                        </request>
                    </GetShifts>
                </soap:Body>
            </soap:Envelope>
        `;
        const result = await callParBrinkSoapAPI('Labor2.svc', 'GetShifts', soapBody, accessToken, locationToken);
        // Transform PAR Brink response to our interface
        const shifts = result?.GetShiftsResult?.Shifts || result?.shifts || [];
        return shifts.map((shift) => ({
            ShiftId: shift.ShiftId || shift.Id || `shift-${shift.EmployeeId}-${Date.now()}`,
            EmployeeId: shift.EmployeeId || shift.Employee?.Id || '',
            StartTime: shift.StartTime || shift.ClockInTime || '',
            EndTime: shift.EndTime || shift.ClockOutTime || null,
            JobId: shift.JobId || shift.Job?.Id || '',
            JobName: shift.JobName || shift.Job?.Name || '',
            Hours: shift.Hours || 0,
            Status: shift.Status || (shift.EndTime ? 'clocked-out' : 'clocked-in')
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
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
                <soap:Header/>
                <soap:Body>
                    <GetEmployees xmlns="http://parbrink.com/labor">
                        <request>
                            <Active>true</Active>
                            ${locationToken ? `<LocationToken>${locationToken}</LocationToken>` : ''}
                        </request>
                    </GetEmployees>
                </soap:Body>
            </soap:Envelope>
        `;
        const result = await callParBrinkSoapAPI('Labor2.svc', 'GetEmployees', soapBody, accessToken, locationToken);
        // Transform PAR Brink response to our interface
        const employees = result?.GetEmployeesResult?.Employees || result?.employees || [];
        return employees.map((emp) => ({
            EmployeeId: emp.EmployeeId || emp.Id || '',
            FirstName: emp.FirstName || emp.Name?.First || '',
            LastName: emp.LastName || emp.Name?.Last || '',
            Status: emp.Status || emp.Active ? 'active' : 'inactive',
            Position: emp.Position || emp.JobTitle || '',
            HourlyRate: emp.HourlyRate || emp.Rate || 0
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch employees: ${errorMessage}`);
    }
}
// Get sales data from PAR Brink
async function getParBrinkSales(startDate, endDate, accessToken, locationToken) {
    try {
        const soapBody = `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
                <soap:Header/>
                <soap:Body>
                    <GetSales xmlns="http://parbrink.com/labor">
                        <request>
                            <StartDate>${startDate || new Date().toISOString().split('T')[0]}</StartDate>
                            <EndDate>${endDate || new Date().toISOString().split('T')[0]}</EndDate>
                            ${locationToken ? `<LocationToken>${locationToken}</LocationToken>` : ''}
                        </request>
                    </GetSales>
                </soap:Body>
            </soap:Envelope>
        `;
        const result = await callParBrinkSoapAPI('Labor2.svc', 'GetSales', soapBody, accessToken, locationToken);
        // Transform PAR Brink response to our interface
        const sales = result?.GetSalesResult?.Sales || result?.sales || [];
        return sales.map((sale) => ({
            SaleId: sale.SaleId || sale.Id || `sale-${Date.now()}`,
            Amount: sale.Amount || sale.Total || 0,
            Timestamp: sale.Timestamp || sale.DateTime || new Date().toISOString(),
            ItemCount: sale.ItemCount || sale.Items?.length || 0,
            PaymentMethod: sale.PaymentMethod || sale.Payment?.Method || '',
            EmployeeId: sale.EmployeeId || sale.Employee?.Id || ''
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