"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parBrinkToUkgETL = parBrinkToUkgETL;
exports.getParBrinkEmployeesTest = getParBrinkEmployeesTest;
exports.testUkgReadyConnection = testUkgReadyConnection;
const functions_1 = require("@azure/functions");
const UkgReadyApiService_1 = require("../services/UkgReadyApiService");
// Transformation mappings
const JOB_CODE_MAPPING = {
    '10': 'Manager',
    '20': 'Crew Member',
    '30': 'Shift Leader',
    // Add more mappings as needed
};
const SECURITY_LEVEL_MAPPING = {
    '1': 'Manager',
    '2': 'Staff',
    '5': 'Shift Leader',
    // Add more mappings as needed
};
/**
 * PAR Brink to UKG Ready ETL Pipeline
 * Extracts employee data from PAR Brink, transforms it, and prepares for UKG Ready
 */
async function parBrinkToUkgETL(request, context) {
    try {
        context.log('🚀 Starting PAR Brink → UKG Ready ETL Pipeline');
        const requestBody = await request.text();
        if (!requestBody) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'Request body required with PAR Brink configuration'
                }
            };
        }
        const config = JSON.parse(requestBody);
        const { accessToken, locationToken, dryRun = true, ukgReady } = config;
        if (!accessToken || !locationToken) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'accessToken and locationToken are required'
                }
            };
        }
        // Validate UKG Ready config if not dry run
        if (!dryRun && !ukgReady) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: 'UKG Ready configuration required for live ETL'
                }
            };
        }
        // STEP 1: EXTRACT - Get employee data from PAR Brink
        context.log('📥 STEP 1: Extracting employee data from PAR Brink...');
        const parBrinkEmployees = await extractParBrinkEmployees(accessToken, locationToken, context);
        // STEP 2: TRANSFORM - Convert PAR Brink format to UKG Ready format
        context.log('🔄 STEP 2: Transforming PAR Brink data to UKG Ready format...');
        const ukgReadyEmployees = transformParBrinkToUkgReady(parBrinkEmployees, context);
        // STEP 3: LOAD - Prepare for UKG Ready (dry run or actual load)
        context.log(`📤 STEP 3: ${dryRun ? 'Dry run preview' : 'Loading data to UKG Ready'}...`);
        const loadResult = dryRun
            ? await dryRunPreview(ukgReadyEmployees, context)
            : await loadToUkgReady(ukgReadyEmployees, ukgReady, context);
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: true,
                message: `ETL Pipeline completed successfully (${dryRun ? 'dry run' : 'live'})`,
                data: {
                    extracted: parBrinkEmployees.length,
                    transformed: ukgReadyEmployees.length,
                    loadResult: loadResult,
                    preview: dryRun ? ukgReadyEmployees.slice(0, 5) : undefined // Show first 5 for preview
                }
            }
        };
    }
    catch (error) {
        context.log('❌ ETL Pipeline error:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: false,
                error: 'ETL Pipeline failed',
                message: error.message
            }
        };
    }
}
/**
 * EXTRACT: Get employee data from PAR Brink SOAP API
 */
async function extractParBrinkEmployees(accessToken, locationToken, context) {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:set="http://www.brinksoftware.com/webservices/settings/v2">
        <soap:Header />
        <soap:Body>
            <set:GetEmployees />
        </soap:Body>
    </soap:Envelope>`;
    try {
        const response = await fetch('https://api11.brinkpos.net/Settings2.svc', {
            method: 'POST',
            headers: {
                'AccessToken': accessToken,
                'LocationToken': locationToken,
                'Content-Type': 'text/xml',
                'SOAPAction': 'http://www.brinksoftware.com/webservices/settings/v2/ISettingsWebService2/GetEmployees'
            },
            body: soapEnvelope
        });
        if (!response.ok) {
            throw new Error(`PAR Brink API request failed: ${response.status} ${response.statusText}`);
        }
        const xmlText = await response.text();
        context.log('📊 Received employee data from PAR Brink');
        // Parse XML and extract employee data
        const employees = parseParBrinkEmployeeXML(xmlText, context);
        context.log(`✅ Extracted ${employees.length} employees from PAR Brink`);
        return employees;
    }
    catch (error) {
        context.log('❌ Failed to extract PAR Brink employees:', error);
        throw error;
    }
}
/**
 * Parse PAR Brink XML response to extract employee data
 */
function parseParBrinkEmployeeXML(xmlText, context) {
    const employees = [];
    try {
        // Simple regex-based XML parsing for employee data
        // In production, consider using a proper XML parser
        const employeeMatches = xmlText.match(/<Employee[^>]*>[\s\S]*?<\/Employee>/g);
        if (!employeeMatches) {
            context.log('⚠️ No employee data found in PAR Brink response');
            return employees;
        }
        employeeMatches.forEach(employeeXml => {
            const employee = {
                EmployeeId: extractXmlValue(employeeXml, 'Id') || '',
                FirstName: extractXmlValue(employeeXml, 'FirstName') || '',
                LastName: extractXmlValue(employeeXml, 'LastName') || '',
                MiddleName: extractXmlValue(employeeXml, 'MiddleName'),
                HomeLocationId: extractXmlValue(employeeXml, 'HomeLocationId') || '',
                JobCodeId: extractXmlValue(employeeXml, 'JobCodeId') || '',
                SecurityLevelId: extractXmlValue(employeeXml, 'SecurityLevelId') || '',
                HireDate: extractXmlValue(employeeXml, 'HireDate') || '',
                TerminationDate: extractXmlValue(employeeXml, 'TerminationDate'),
                PayRate: parseFloat(extractXmlValue(employeeXml, 'PayRate') || '0'),
                IsActive: extractXmlValue(employeeXml, 'IsActive') === 'true',
                SocialSecurityNumber: extractXmlValue(employeeXml, 'SocialSecurityNumber'),
                DateOfBirth: extractXmlValue(employeeXml, 'DateOfBirth'),
                PhoneNumber: extractXmlValue(employeeXml, 'PhoneNumber'),
                EmailAddress: extractXmlValue(employeeXml, 'EmailAddress'),
                Address: extractXmlValue(employeeXml, 'Address'),
                City: extractXmlValue(employeeXml, 'City'),
                State: extractXmlValue(employeeXml, 'State'),
                ZipCode: extractXmlValue(employeeXml, 'ZipCode')
            };
            employees.push(employee);
        });
    }
    catch (error) {
        context.log('❌ Error parsing PAR Brink XML:', error);
        throw error;
    }
    return employees;
}
/**
 * Extract value from XML element
 */
function extractXmlValue(xml, elementName) {
    const regex = new RegExp(`<${elementName}[^>]*>([^<]*)</${elementName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : undefined;
}
/**
 * TRANSFORM: Convert PAR Brink employee data to UKG Ready format
 */
function transformParBrinkToUkgReady(parBrinkEmployees, context) {
    context.log(`🔄 Transforming ${parBrinkEmployees.length} PAR Brink employees to UKG Ready format`);
    return parBrinkEmployees.map(parEmployee => {
        const ukgEmployee = {
            employeeNumber: parEmployee.EmployeeId,
            firstName: parEmployee.FirstName,
            lastName: parEmployee.LastName,
            middleName: parEmployee.MiddleName,
            personalEmail: parEmployee.EmailAddress,
            homePhone: parEmployee.PhoneNumber,
            hireDate: formatDateForUkg(parEmployee.HireDate),
            terminationDate: parEmployee.TerminationDate ? formatDateForUkg(parEmployee.TerminationDate) : undefined,
            jobTitle: JOB_CODE_MAPPING[parEmployee.JobCodeId] || `Job Code ${parEmployee.JobCodeId}`,
            department: SECURITY_LEVEL_MAPPING[parEmployee.SecurityLevelId] || `Security Level ${parEmployee.SecurityLevelId}`,
            location: parEmployee.HomeLocationId, // Could be mapped to location name
            payRate: parEmployee.PayRate,
            isActive: parEmployee.IsActive,
            ssn: parEmployee.SocialSecurityNumber,
            birthDate: parEmployee.DateOfBirth ? formatDateForUkg(parEmployee.DateOfBirth) : undefined,
            address: parEmployee.Address ? {
                street: parEmployee.Address,
                city: parEmployee.City,
                state: parEmployee.State,
                zipCode: parEmployee.ZipCode
            } : undefined
        };
        return ukgEmployee;
    });
}
/**
 * Format date for UKG Ready (YYYY-MM-DD format)
 */
function formatDateForUkg(dateString) {
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    catch {
        return dateString; // Return original if parsing fails
    }
}
/**
 * DRY RUN: Preview the transformation without actually loading to UKG Ready
 */
async function dryRunPreview(ukgEmployees, context) {
    context.log(`🔍 Dry run preview: ${ukgEmployees.length} employees ready for UKG Ready`);
    const stats = {
        totalEmployees: ukgEmployees.length,
        activeEmployees: ukgEmployees.filter(e => e.isActive).length,
        inactiveEmployees: ukgEmployees.filter(e => !e.isActive).length,
        employeesWithEmail: ukgEmployees.filter(e => e.personalEmail).length,
        employeesWithPhone: ukgEmployees.filter(e => e.homePhone).length,
        jobTitleDistribution: {},
        departmentDistribution: {}
    };
    // Calculate job title distribution
    ukgEmployees.forEach(emp => {
        if (emp.jobTitle) {
            stats.jobTitleDistribution[emp.jobTitle] = (stats.jobTitleDistribution[emp.jobTitle] || 0) + 1;
        }
        if (emp.department) {
            stats.departmentDistribution[emp.department] = (stats.departmentDistribution[emp.department] || 0) + 1;
        }
    });
    return {
        message: 'Dry run completed - data ready for UKG Ready',
        statistics: stats,
        sampleEmployees: ukgEmployees.slice(0, 3) // Show first 3 as examples
    };
}
/**
 * LOAD: Send transformed data to UKG Ready
 */
async function loadToUkgReady(ukgEmployees, ukgConfig, context) {
    context.log(`📤 Loading ${ukgEmployees.length} employees to UKG Ready...`);
    try {
        const ukgService = new UkgReadyApiService_1.UkgReadyApiService(ukgConfig, context);
        // Test connection first
        const connectionTest = await ukgService.testConnection();
        if (!connectionTest.success) {
            throw new Error(`UKG Ready connection failed: ${connectionTest.message}`);
        }
        // Get current employee count for comparison
        const initialCount = await ukgService.getEmployeeCount();
        // Batch load employees
        const batchResult = await ukgService.batchCreateOrUpdateEmployees(ukgEmployees);
        // Get final employee count
        const finalCount = await ukgService.getEmployeeCount();
        return {
            message: 'Employees loaded to UKG Ready successfully',
            connectionTest: connectionTest,
            batchResult: batchResult,
            employeeCountBefore: initialCount,
            employeeCountAfter: finalCount,
            employeesAdded: finalCount > initialCount ? finalCount - initialCount : 0,
            summary: {
                totalProcessed: batchResult.totalProcessed,
                successful: batchResult.successful,
                failed: batchResult.failed,
                successRate: `${((batchResult.successful / batchResult.totalProcessed) * 100).toFixed(1)}%`
            }
        };
    }
    catch (error) {
        context.log('❌ Failed to load employees to UKG Ready:', error);
        throw error;
    }
}
// Register the ETL function
functions_1.app.http('parBrinkToUkgETL', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'etl/par-brink-to-ukg',
    handler: parBrinkToUkgETL,
});
// Test endpoint to get PAR Brink employees directly
async function getParBrinkEmployeesTest(request, context) {
    try {
        const requestBody = await request.text();
        const config = JSON.parse(requestBody);
        const { accessToken, locationToken } = config;
        const employees = await extractParBrinkEmployees(accessToken, locationToken, context);
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: true,
                message: 'PAR Brink employees retrieved successfully',
                data: employees,
                count: employees.length
            }
        };
    }
    catch (error) {
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: false,
                error: error.message
            }
        };
    }
}
functions_1.app.http('getParBrinkEmployeesTest', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'test/par-brink-employees',
    handler: getParBrinkEmployeesTest,
});
// Test UKG Ready API connection
async function testUkgReadyConnection(request, context) {
    try {
        const requestBody = await request.text();
        const ukgConfig = JSON.parse(requestBody);
        const ukgService = new UkgReadyApiService_1.UkgReadyApiService(ukgConfig, context);
        const testResult = await ukgService.testConnection();
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: testResult.success,
                message: testResult.message,
                details: testResult.details
            }
        };
    }
    catch (error) {
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: false,
                error: error.message
            }
        };
    }
}
functions_1.app.http('testUkgReadyConnection', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'test/ukg-ready-connection',
    handler: testUkgReadyConnection,
});
//# sourceMappingURL=parBrinkToUkgETL.js.map