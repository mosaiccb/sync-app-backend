# Restaurant Operations Backend - Azure Functions

A robust Azure Functions backend for restaurant operations management with PAR Brink POS integration, UKG labor data, and multi-tenant restaurant location management.

## 🏗️ Architecture Overview

- **PAR Brink Integration**: SOAP API for real-time sales data from POS systems
- **UKG Ready OAuth**: Proxy service for labor management data
- **Azure SQL Database**: Restaurant locations, tenant configuration, audit logs
- **Azure Key Vault**: Secure storage for API credentials and secrets
- **WorldTimeAPI**: Accurate timezone handling with DST support for restaurant business dates
- **Multi-Timezone Support**: Currently Colorado (America/Denver), expandable nationwide

## 🍽️ Restaurant Business Logic

- **Business Day**: 5 AM to 4:59 AM next day (restaurant operational hours)
- **Timezone Handling**: Real-time calculation with DST support via WorldTimeAPI
- **Location Management**: 22 Colorado restaurant locations with encrypted tokens
- **Data Integration**: Combines PAR Brink sales with UKG labor for operational dashboards
- **Tips Tracking**: Comprehensive tip extraction from payment transactions and till operations

## 📋 Prerequisites

- Node.js 18+
- Azure Functions Core Tools 4.x
- Access to Azure SQL Server: `mosaic.database.windows.net`
- Access to Azure Key Vault: `kv-mosaic-ukg-sync`
- PAR Brink API credentials for restaurant locations
- UKG Ready API access for labor data

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `local.settings.json.example` to `local.settings.json` and update:

```json
{
  "Values": {
    "AZURE_KEYVAULT_NAME": "kv-mosaic-ukg-sync",
    "AZURE_KEY_VAULT_URL": "https://kv-mosaic-ukg-sync.vault.azure.net/",
    "SQL_SERVER": "mosaic.database.windows.net",
    "SQL_DATABASE": "moevocorp"
  }
}
```

### 3. Deploy Database Schema

```bash
npm run deploy:schema
```

### 4. Build and Test

```bash
npm run build
npm run test:db
```

### 5. Start Local Development

```bash
npm start
```

## 🔧 Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development
- `npm start` - Start Azure Functions runtime
- `npm run test:db` - Test database connection
- `npm run deploy:schema` - Show schema deployment instructions

## � Tips Dashboard Integration

### PAR Brink Tips Extraction

The tips functionality extracts comprehensive tip data from PAR Brink POS systems:

**Credit Card Tips**: Extracted from GetOrders API response

```xml
<Payment>
  <TipAmount>5.00</TipAmount>
  <Amount>25.00</Amount>
  <PaymentType>Credit Card</PaymentType>
</Payment>
```

**Cash Tips**: Extracted from GetTills API response

```xml
<PaidInOut>
  <Amount>8.50</Amount>
  <AccountType>0</AccountType>  <!-- Cash tips -->
  <Description>Cash Tip</Description>
</PaidInOut>
```

### Implementation Details

- **Dual API Integration**: Uses both GetOrders and GetTills endpoints
- **XML Parsing**: Enhanced parsing to extract TipAmount fields at payment and detail levels
- **Business Date Logic**: Respects restaurant business day (5 AM cutoff)
- **Real-time Data**: Live tip tracking throughout business operations
- **Configuration Reuse**: Leverages existing PAR Brink authentication and setup

## �📊 Database Schema

### Tenants

- Restaurant location configuration
- PAR Brink API settings and tokens
- Geographic and timezone information

### UKGApiConfigurations

- UKG Ready OAuth settings
- Labor management API configuration
- Employee and scheduling data access

### TenantAudit

- Complete audit trail for restaurant configuration changes
- Tracks all API setting modifications
- Security and compliance logging

## 🔐 Security

- **API Credentials**: PAR Brink and UKG credentials stored in Azure Key Vault
- **Location Tokens**: Encrypted restaurant identification tokens
- **Timezone Security**: WorldTimeAPI with fallback to prevent timezone manipulation
- **Audit Trail**: Complete logging of all configuration and data access

## 📡 API Endpoints

### Restaurant Dashboard

- `POST /api/par-brink/dashboard` - Real-time sales and labor dashboard
- `GET /api/par-brink/sales` - PAR Brink sales data retrieval
- `GET /api/par-brink/employees` - Employee management data
- `GET /api/par-brink/labor-shifts` - Labor shift information
- `POST /api/par-brink/tips` - Credit card and cash tip tracking

### Restaurant Management

- `GET /api/tenants` - List restaurant locations
- `GET /api/tenants/{id}` - Get specific restaurant details
- `POST /api/tenants` - Add new restaurant location
- `PUT /api/tenants/{id}` - Update restaurant configuration
- `DELETE /api/tenants/{id}` - Remove restaurant (soft delete)

### Configuration & Integration

- `GET/POST /api/par-brink/configurations` - PAR Brink API settings
- `POST /api/oauth/token` - UKG Ready OAuth token generation
- `GET /api/ukg-ready` - UKG API proxy for labor data
- `GET /api/health` - System health and connectivity checks

## � Timezone & Business Date Handling

### WorldTimeAPI Integration

- Real-time timezone data with DST support
- Accurate offset calculation for PAR Brink API (requires integer minutes)
- Fallback to manual calculation if API unavailable

### Restaurant Business Logic

```typescript
// Business day calculation (5 AM cutoff)
if (localTime.getHours() < 5) {
  businessDate = previousDay; // Early morning = previous business day
} else {
  businessDate = currentDay; // Regular hours = current day
}
```

### Current Restaurant Locations

All 22 locations currently in Colorado (America/Denver timezone):

- Castle Rock, Centre, Creekwalk, Crown Point, Diamond Circle
- Dublin Commons, Falcon Landing, Forest Trace, Greeley
- Highlands Ranch, Johnstown, Lowry, McCastlin Marketplace
- Northfield Commons, Polaris Pointe, Park Meadows
- Ralston Creek, Sheridan Parkway, South Academy Highlands
- Tower, Wellington, Westminster Promenade

## 🔄 Recent Updates

### July 2025 - PAR Brink Integration Fixes

- **Integer Offset Fix**: PAR Brink API requires Int32 offset values
- **WorldTimeAPI Integration**: Accurate timezone handling with DST
- **Business Date Logic**: Restaurant-specific 5 AM cutoff implementation
- **Multi-Location Support**: 22 Colorado restaurants with encrypted tokens

## 🚦 Deployment

### Local Development

```bash
npm run build
npm start
```

### Azure Deployment

**Recommended Method (Proven to work):**

- Use VS Code Azure Functions extension
- Right-click on `sync-app-backend` folder → "Deploy to Function App..."
- Select your Function App and deploy

**PowerShell Script:**

```bash
.\deploy.ps1
```

_Note: The deployment script uses VS Code right-click method due to compatibility issues with `func publish` and Azure Functions v4 TypeScript programming model._

**Alternative (if VS Code unavailable):**

```bash
func azure functionapp publish ukg-sync-backend-5rrqlcuxyzlvy
```

_Warning: This method has known issues with TypeScript v4 programming model and may result in "0 functions found" errors._

## 📈 Monitoring

- Application Insights for restaurant operations monitoring
- PAR Brink API health checks and error tracking
- UKG OAuth token management and renewal
- WorldTimeAPI failover and timezone accuracy monitoring

## 🔍 Troubleshooting

### PAR Brink API Issues

- Verify location tokens are valid and not expired
- Check timezone offset calculation (must be integer)
- Ensure business date follows restaurant logic (5 AM cutoff)

### Database Connection Issues

- Verify Azure AD authentication for SQL Server
- Check restaurant location data integrity
- Ensure audit logging is functioning

### Timezone Calculation Problems

- WorldTimeAPI connection and fallback testing
- DST transition handling verification
- Business date accuracy across multiple locations
