"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parBrinkDebugSales = parBrinkDebugSales;
const functions_1 = require("@azure/functions");
const axios_1 = __importDefault(require("axios"));
async function parBrinkDebugSales(request, context) {
    try {
        const requestBody = await request.json();
        const { accessToken, locationToken, businessDate } = requestBody;
        if (!accessToken || !locationToken || !businessDate) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: 'Missing required parameters: accessToken, locationToken, businessDate'
                }
            };
        }
        // Get access token from Key Vault
        const actualAccessToken = 'tBJ5haIyv0uRbbWQL6FbXw=='; // Using known working token
        // Calculate offset (MDT = -360 minutes)
        const offsetMinutes = 360;
        // Test WITHOUT ModifiedTime first (like labor API)
        const soapBodyWithoutModifiedTime = `
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
            <soapenv:Header/>
            <soapenv:Body>
              <v2:GetOrders>
                <v2:request>
                  <v2:BusinessDate>${businessDate}</v2:BusinessDate>
                </v2:request>
              </v2:GetOrders>
            </soapenv:Body>
          </soapenv:Envelope>
        `;
        // Also prepare version WITH ModifiedTime for comparison
        const now = new Date();
        const localDateTime = new Date(now.getTime() - (offsetMinutes * 60000));
        const modifiedTimeString = localDateTime.toISOString().replace('Z', '');
        const soapBodyWithModifiedTime = `
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://www.brinksoftware.com/webservices/sales/v2" xmlns:sys="http://schemas.datacontract.org/2004/07/System">
            <soapenv:Header/>
            <soapenv:Body>
              <v2:GetOrders>
                <v2:request>
                  <v2:BusinessDate>${businessDate}</v2:BusinessDate>
                  <v2:ModifiedTime>
                    <sys:DateTime>${modifiedTimeString}</sys:DateTime>
                    <sys:OffsetMinutes>-${offsetMinutes}</sys:OffsetMinutes>
                  </v2:ModifiedTime>
                </v2:request>
              </v2:GetOrders>
            </soapenv:Body>
          </soapenv:Envelope>
        `;
        const headers = {
            'AccessToken': actualAccessToken,
            'LocationToken': locationToken,
            'Content-Type': 'text/xml',
            'SOAPAction': 'http://www.brinksoftware.com/webservices/sales/v2/ISalesWebService2/GetOrders'
        };
        // Try WITHOUT ModifiedTime first (simpler, like labor API)
        const soapBodyToUse = soapBodyWithoutModifiedTime;
        context.log('Making PAR Brink API call for debug');
        context.log('SOAP Body (WITHOUT ModifiedTime):', soapBodyToUse);
        const response = await axios_1.default.post('https://api11.brinkpos.net/sales2.svc', soapBodyToUse, { headers });
        const xmlData = response.data;
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: true,
                debug: {
                    approach: 'WITHOUT ModifiedTime (like labor API)',
                    responseLength: xmlData?.length || 0,
                    soapBodySent: soapBodyToUse,
                    soapBodyWithModifiedTimeAlternative: soapBodyWithModifiedTime,
                    modifiedTimeUsed: null,
                    offsetMinutesUsed: offsetMinutes,
                    xmlResponse: xmlData,
                    hasOrderTag: xmlData.includes('<Order>'),
                    hasOrdersTag: xmlData.includes('<Orders>'),
                    hasResultCodeTag: xmlData.includes('<ResultCode>'),
                }
            }
        };
    }
    catch (error) {
        context.error('Error in PAR Brink debug sales:', error);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                details: error instanceof Error ? error.stack : 'No stack trace'
            }
        };
    }
}
functions_1.app.http('parBrinkDebugSales', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'par-brink/debug-sales',
    handler: parBrinkDebugSales
});
//# sourceMappingURL=parBrinkDebugSales.js.map