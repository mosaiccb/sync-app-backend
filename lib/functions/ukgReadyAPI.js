"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ukgReadyAPI = ukgReadyAPI;
const functions_1 = require("@azure/functions");
const TenantDatabaseService_1 = require("../services/TenantDatabaseService");
/**
 * UKG Ready API Endpoints - Time Entries and Employee Management
 * Based on UKG Ready REST API Documentation: https://secure2.saashr.com/ta/docs/rest/public/
 */
const dbService = new TenantDatabaseService_1.TenantDatabaseService();
/**
 * Make authenticated request to UKG Ready API
 */
async function makeUKGRequest(tenantId, endpoint, method = 'GET', body) {
    try {
        // Get tenant credentials
        const tenant = await dbService.getTenantById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        const clientSecret = await dbService.getClientSecret(tenantId);
        if (!clientSecret) {
            throw new Error('Client secret not found');
        }
        // Get OAuth token
        const tokenResponse = await fetch(tenant.tokenEndpoint || '', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: tenant.clientId,
                client_secret: clientSecret,
                scope: tenant.scope || 'read write'
            })
        });
        if (!tokenResponse.ok) {
            throw new Error(`Token request failed: ${tokenResponse.status}`);
        }
        const tokenData = await tokenResponse.json();
        // Make API request
        const apiUrl = `${tenant.baseUrl}/ta/rest/v2/companies/${tenant.companyId}${endpoint}`;
        const response = await fetch(apiUrl, {
            method,
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error('UKG API request failed:', error);
        throw error;
    }
}
/**
 * UKG Ready API Handler
 * GET /api/ukg-ready?tenant={tenantId}&module={timeentries|employees}&action={action}
 */
async function ukgReadyAPI(request, context) {
    context.log('UKG Ready API endpoint called');
    const method = request.method;
    try {
        if (method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
        }
        const tenantId = request.query.get('tenant');
        const module = request.query.get('module'); // 'timeentries' or 'employees'
        const action = request.query.get('action'); // specific action like 'list', 'get', 'create', etc.
        if (!tenantId) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    error: 'Tenant ID is required'
                })
            };
        }
        if (!module || !['timeentries', 'employees'].includes(module)) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({
                    success: false,
                    error: 'Module must be "timeentries" or "employees"'
                })
            };
        }
        let result;
        if (module === 'timeentries') {
            result = await handleTimeEntriesRequest(tenantId, action, request, method);
        }
        else if (module === 'employees') {
            result = await handleEmployeesRequest(tenantId, action, request, method);
        }
        return {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: true,
                data: result
            })
        };
    }
    catch (error) {
        context.error('UKG Ready API error:', error);
        return {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
}
/**
 * Handle Time Entries requests
 */
async function handleTimeEntriesRequest(tenantId, action, request, method) {
    switch (action) {
        case 'list':
            // GET time entries with optional filters
            const startDate = request.query.get('startDate');
            const endDate = request.query.get('endDate');
            const employeeId = request.query.get('employeeId');
            const status = request.query.get('status');
            let endpoint = '/timeentries';
            const params = new URLSearchParams();
            if (startDate)
                params.append('startDate', startDate);
            if (endDate)
                params.append('endDate', endDate);
            if (employeeId)
                params.append('employeeId', employeeId);
            if (status)
                params.append('status', status);
            if (params.toString()) {
                endpoint += '?' + params.toString();
            }
            return await makeUKGRequest(tenantId, endpoint);
        case 'get':
            // GET specific time entry by ID
            const timeEntryId = request.query.get('id');
            if (!timeEntryId) {
                throw new Error('Time entry ID is required');
            }
            return await makeUKGRequest(tenantId, `/timeentries/${timeEntryId}`);
        case 'create':
            // POST create new time entry
            if (method !== 'POST') {
                throw new Error('POST method required for create action');
            }
            const createData = await request.json();
            return await makeUKGRequest(tenantId, '/timeentries', 'POST', createData);
        case 'update':
            // PUT update time entry
            if (method !== 'PUT') {
                throw new Error('PUT method required for update action');
            }
            const updateId = request.query.get('id');
            if (!updateId) {
                throw new Error('Time entry ID is required');
            }
            const updateData = await request.json();
            return await makeUKGRequest(tenantId, `/timeentries/${updateId}`, 'PUT', updateData);
        case 'delete':
            // DELETE time entry
            if (method !== 'DELETE') {
                throw new Error('DELETE method required for delete action');
            }
            const deleteId = request.query.get('id');
            if (!deleteId) {
                throw new Error('Time entry ID is required');
            }
            return await makeUKGRequest(tenantId, `/timeentries/${deleteId}`, 'DELETE');
        case 'approve':
            // POST approve time entries
            if (method !== 'POST') {
                throw new Error('POST method required for approve action');
            }
            const approveData = await request.json();
            return await makeUKGRequest(tenantId, '/timeentries/approve', 'POST', approveData);
        case 'reject':
            // POST reject time entries
            if (method !== 'POST') {
                throw new Error('POST method required for reject action');
            }
            const rejectData = await request.json();
            return await makeUKGRequest(tenantId, '/timeentries/reject', 'POST', rejectData);
        case 'payperiod':
            // GET time entries for pay period
            const payPeriod = request.query.get('period');
            if (!payPeriod) {
                throw new Error('Pay period is required');
            }
            return await makeUKGRequest(tenantId, `/timeentries/payperiod/${payPeriod}`);
        default:
            throw new Error(`Unknown time entries action: ${action}`);
    }
}
/**
 * Handle Employees requests
 */
async function handleEmployeesRequest(tenantId, action, request, method) {
    switch (action) {
        case 'list':
            // GET employees with optional filters
            const department = request.query.get('department');
            const status = request.query.get('status');
            const manager = request.query.get('manager');
            const hireDate = request.query.get('hireDate');
            let endpoint = '/employees';
            const params = new URLSearchParams();
            if (department)
                params.append('department', department);
            if (status)
                params.append('status', status);
            if (manager)
                params.append('manager', manager);
            if (hireDate)
                params.append('hireDate', hireDate);
            if (params.toString()) {
                endpoint += '?' + params.toString();
            }
            return await makeUKGRequest(tenantId, endpoint);
        case 'get':
            // GET specific employee by ID
            const employeeId = request.query.get('id');
            if (!employeeId) {
                throw new Error('Employee ID is required');
            }
            return await makeUKGRequest(tenantId, `/employees/${employeeId}`);
        case 'create':
            // POST create new employee
            if (method !== 'POST') {
                throw new Error('POST method required for create action');
            }
            const createData = await request.json();
            return await makeUKGRequest(tenantId, '/employees', 'POST', createData);
        case 'update':
            // PUT update employee
            if (method !== 'PUT') {
                throw new Error('PUT method required for update action');
            }
            const updateId = request.query.get('id');
            if (!updateId) {
                throw new Error('Employee ID is required');
            }
            const updateData = await request.json();
            return await makeUKGRequest(tenantId, `/employees/${updateId}`, 'PUT', updateData);
        case 'deactivate':
            // PUT deactivate employee
            if (method !== 'PUT') {
                throw new Error('PUT method required for deactivate action');
            }
            const deactivateId = request.query.get('id');
            if (!deactivateId) {
                throw new Error('Employee ID is required');
            }
            return await makeUKGRequest(tenantId, `/employees/${deactivateId}/deactivate`, 'PUT');
        case 'terminate':
            // PUT terminate employee
            if (method !== 'PUT') {
                throw new Error('PUT method required for terminate action');
            }
            const terminateId = request.query.get('id');
            const terminationDate = request.query.get('terminationDate');
            if (!terminateId || !terminationDate) {
                throw new Error('Employee ID and termination date are required');
            }
            return await makeUKGRequest(tenantId, `/employees/${terminateId}/terminate`, 'PUT', {
                terminationDate
            });
        case 'departments':
            // GET list of departments
            return await makeUKGRequest(tenantId, '/employees/departments');
        case 'positions':
            // GET list of positions
            return await makeUKGRequest(tenantId, '/employees/positions');
        case 'managers':
            // GET list of managers
            return await makeUKGRequest(tenantId, '/employees/managers');
        case 'schedule':
            // GET employee schedule
            const scheduleEmpId = request.query.get('employeeId');
            const scheduleStart = request.query.get('startDate');
            const scheduleEnd = request.query.get('endDate');
            if (!scheduleEmpId) {
                throw new Error('Employee ID is required for schedule');
            }
            let scheduleEndpoint = `/employees/${scheduleEmpId}/schedule`;
            const scheduleParams = new URLSearchParams();
            if (scheduleStart)
                scheduleParams.append('startDate', scheduleStart);
            if (scheduleEnd)
                scheduleParams.append('endDate', scheduleEnd);
            if (scheduleParams.toString()) {
                scheduleEndpoint += '?' + scheduleParams.toString();
            }
            return await makeUKGRequest(tenantId, scheduleEndpoint);
        default:
            throw new Error(`Unknown employees action: ${action}`);
    }
}
// Register the function
functions_1.app.http('ukgReadyAPI', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    route: 'ukg-ready',
    authLevel: 'anonymous',
    handler: ukgReadyAPI
});
//# sourceMappingURL=ukgReadyAPI.js.map