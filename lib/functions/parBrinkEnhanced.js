"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laborShifts = laborShifts;
exports.employees = employees;
exports.sales = sales;
const functions_1 = require("@azure/functions");
// Real SOAP API call function - requires proper PAR Brink configuration
async function callParBrinkSoapAPI(_endpoint, action, _soapBody) {
    // TODO: Implement actual SOAP client integration
    // This requires PAR Brink WSDL configuration and authentication
    throw new Error(`PAR Brink SOAP API integration not yet implemented for ${action}. Real API connection required.`);
}
// Get current clocked-in employees from PAR Brink
async function getParBrinkClockedInEmployees() {
    try {
        const soapBody = `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
                <soap:Header/>
                <soap:Body>
                    <GetShifts xmlns="http://parbrink.com/labor">
                        <request>
                            <Status>clocked-in</Status>
                        </request>
                    </GetShifts>
                </soap:Body>
            </soap:Envelope>
        `;
        const result = await callParBrinkSoapAPI('Labor2.svc', 'GetShifts', soapBody);
        return result.shifts || [];
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch clocked-in employees: ${errorMessage}`);
    }
}
// Get employee data from PAR Brink
async function getParBrinkEmployees() {
    try {
        const soapBody = `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
                <soap:Header/>
                <soap:Body>
                    <GetEmployees xmlns="http://parbrink.com/labor">
                        <request>
                            <Active>true</Active>
                        </request>
                    </GetEmployees>
                </soap:Body>
            </soap:Envelope>
        `;
        const result = await callParBrinkSoapAPI('Labor2.svc', 'GetEmployees', soapBody);
        return result.employees || [];
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch employees: ${errorMessage}`);
    }
}
// Get sales data from PAR Brink
async function getParBrinkSales(startDate, endDate) {
    try {
        const soapBody = `
            <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
                <soap:Header/>
                <soap:Body>
                    <GetSales xmlns="http://parbrink.com/labor">
                        <request>
                            <StartDate>${startDate || new Date().toISOString().split('T')[0]}</StartDate>
                            <EndDate>${endDate || new Date().toISOString().split('T')[0]}</EndDate>
                        </request>
                    </GetSales>
                </soap:Body>
            </soap:Envelope>
        `;
        const result = await callParBrinkSoapAPI('Labor2.svc', 'GetSales', soapBody);
        return result.sales || [];
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch sales data: ${errorMessage}`);
    }
}
// Labor shifts endpoint - real PAR Brink integration
async function laborShifts(_request, context) {
    try {
        context.log('PAR Brink labor-shifts endpoint called');
        const shifts = await getParBrinkClockedInEmployees();
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
async function employees(_request, context) {
    try {
        context.log('PAR Brink employees endpoint called');
        const employeeData = await getParBrinkEmployees();
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
        const url = new URL(request.url);
        const startDate = url.searchParams.get('startDate') || undefined;
        const endDate = url.searchParams.get('endDate') || undefined;
        const salesData = await getParBrinkSales(startDate, endDate);
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
// Register the function endpoints
functions_1.app.http('labor-shifts', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: laborShifts
});
functions_1.app.http('employees', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: employees
});
functions_1.app.http('sales', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: sales
});
//# sourceMappingURL=parBrinkEnhanced.js.map