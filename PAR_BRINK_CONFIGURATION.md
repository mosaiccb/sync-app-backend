# PAR Brink API Configuration Guide

## Overview

This configuration is based on the working PowerShell examples found in the frontend PS1Examples directory. The PAR Brink integration uses SOAP web services over HTTP REST endpoints.

## API Endpoints

- **Sales API**: `https://api11.brinkpos.net/sales2.svc`
- **Labor API**: `https://api11.brinkpos.net/labor2.svc`

## Required Environment Variables

### Azure Function App Settings

Add these to your Azure Function App Configuration:

```bash
PAR_BRINK_SALES_URL=https://api11.brinkpos.net/sales2.svc
PAR_BRINK_LABOR_URL=https://api11.brinkpos.net/labor2.svc
PAR_BRINK_ACCESS_TOKEN=your-actual-access-token-here
PAR_BRINK_TIMEOUT=30000
```

### Local Development (local.settings.json)

```json
{
  "Values": {
    "PAR_BRINK_SALES_URL": "https://api11.brinkpos.net/sales2.svc",
    "PAR_BRINK_LABOR_URL": "https://api11.brinkpos.net/labor2.svc",
    "PAR_BRINK_ACCESS_TOKEN": "your-actual-access-token-here",
    "PAR_BRINK_TIMEOUT": "30000"
  }
}
```

## SOAP Configuration Details

### Headers (based on PowerShell examples)

```typescript
{
  'Content-Type': 'text/xml; charset=utf-8',
  'SOAPAction': 'http://www.brinksoftware.com/webservices/sales/v2/ISalesWebService2/{action}',
  'Authorization': 'Bearer {accessToken}'
}
```

### Timezone Handling

PAR Brink uses Mountain Time (UTC-7). The integration automatically converts to Mountain Time with offset `-420` minutes.

### Location Tokens

From the PowerShell examples, here are some location tokens (encrypted):

- `"RPNrrDYtnke+OHNLfy74/A=="` - Location 1
- `"BhFEGI1ffUi1CLVe8/qtKw=="` - Location 2
- `"XbEjtd0tKkavxcJ043UsUg=="` - Location 3

## Available Actions

### Sales Data (`GetOrders`)

```xml
<v2:GetOrders>
    <v2:request>
        <v2:BusinessDate>
            <sys:DateTime>2025-01-26T00:00:00</sys:DateTime>
            <sys:OffsetMinutes>-420</sys:OffsetMinutes>
        </v2:BusinessDate>
        <v2:LocationToken>your-location-token</v2:LocationToken>
        <v2:ModifiedTime>
            <sys:DateTime>2025-01-26T17:00:00</sys:DateTime>
            <sys:OffsetMinutes>-420</sys:OffsetMinutes>
        </v2:ModifiedTime>
    </v2:request>
</v2:GetOrders>
```

### Labor Data (`GetShifts`)

```xml
<v2:GetShifts>
    <v2:request>
        <v2:BusinessDate>
            <sys:DateTime>2025-01-26T00:00:00</sys:DateTime>
            <sys:OffsetMinutes>-420</sys:OffsetMinutes>
        </v2:BusinessDate>
        <v2:LocationToken>your-location-token</v2:LocationToken>
        <v2:Status>active</v2:Status>
    </v2:request>
</v2:GetShifts>
```

## API Usage

### Frontend Integration

The frontend should call these endpoints:

- `/api/par-brink/labor-shifts` - For clocked-in employees
- `/api/par-brink/sales` - For sales data
- `/api/par-brink/employees` - For employee data

### Request Format

```typescript
// POST request body
{
  "accessToken": "your-access-token",
  "locationToken": "encrypted-location-token",
  "businessDate": "2025-01-26"
}
```

### Response Format

```typescript
{
  "success": true,
  "data": [...],
  "timestamp": "2025-01-26T17:00:00Z",
  "source": "par-brink-api"
}
```

## Error Handling

The integration handles these PAR Brink-specific errors:

- Missing access token
- Invalid location token
- Server connectivity issues
- XML parsing errors

## Next Steps

1. **Get Real Access Token**: Replace `your-actual-access-token-here` with real PAR Brink access token
2. **Get Location Tokens**: Get encrypted location tokens for your specific restaurants
3. **Test Connection**: Use the frontend to test the API endpoints
4. **Monitor Logs**: Check Azure Function logs for any connection issues

## Troubleshooting

### Common Issues

- **Error**: "PAR Brink access token not configured"

  - **Solution**: Set `PAR_BRINK_ACCESS_TOKEN` environment variable

- **Error**: "HTTP 401: Unauthorized"

  - **Solution**: Check access token validity

- **Error**: "XML response detected, implementing XML parser"
  - **Note**: This is expected - the API returns XML that needs parsing

### Logs Location

Check Azure Function logs at:
`https://your-function-app.scm.azurewebsites.net/api/logs/docker`
