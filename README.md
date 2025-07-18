# UKG Sync Backend - Multi-Tenant Configuration Service

A robust Azure Functions backend that provides multi-tenant UKG Ready OAuth proxy and configuration management using a hybrid SQL Server + Azure Key Vault architecture.

## 🏗️ Architecture Overview

- **SQL Server**: Stores tenant configuration, API settings, and audit logs for fast queries
- **Azure Key Vault**: Stores only sensitive client secrets, referenced by tenant ID
- **Azure Functions**: RESTful API endpoints for tenant management and OAuth proxy
- **TypeScript**: Strongly typed codebase with comprehensive error handling

## 📋 Prerequisites

- Node.js 18+ 
- Azure Functions Core Tools 4.x
- Access to Azure SQL Server: `mosaic.database.windows.net`
- Access to Azure Key Vault: `kv-mosaic-ukg-sync`
- Azure CLI configured with appropriate permissions

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
Follow the instructions to run `tenant-schema-fixed.sql` on your SQL Server.

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
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues

## 📊 Database Schema

The system uses the following main tables:

### Tenants
- Primary tenant configuration
- Company details and API endpoints
- Soft delete support

### UKGApiConfigurations  
- UKG-specific API settings
- Token endpoints and scopes
- Linked to tenants via foreign key

### TenantAudit
- Complete audit trail
- Tracks all configuration changes
- Includes old/new values for comparison

## 🔐 Security

- **Secrets**: All sensitive data (client secrets) stored in Azure Key Vault
- **Authentication**: Azure AD authentication for database access
- **Audit**: Complete audit trail of all configuration changes
- **Access Control**: Service-level authentication for API endpoints

## 📡 API Endpoints

### Tenant Management
- `GET /api/tenants` - List all tenants
- `GET /api/tenants/{id}` - Get tenant by ID
- `POST /api/tenants` - Create new tenant
- `PUT /api/tenants/{id}` - Update tenant
- `DELETE /api/tenants/{id}` - Delete tenant (soft delete)

### OAuth Proxy
- `POST /api/oauth/token` - Generate OAuth token for tenant

## 🔄 Migration

To migrate existing Key Vault data to the new SQL schema:

1. Update `migrate-tenants.js` with your existing tenant data
2. Run: `node migrate-tenants.js`

## 🚦 Deployment

### Local Development
```bash
npm run build
npm start
```

### Azure Deployment
```bash
func azure functionapp publish your-function-app-name
```

## 📈 Monitoring

- Application Insights integration
- Structured logging with correlation IDs
- Performance metrics and error tracking
- Health check endpoints

## 🔍 Troubleshooting

### Database Connection Issues
- Verify Azure AD authentication is configured
- Check firewall rules for SQL Server
- Ensure database permissions are granted

### Key Vault Access Issues
- Verify managed identity has Key Vault access
- Check Key Vault access policies
- Ensure correct Key Vault URL in configuration

### Build Issues
- Run `npm run build` to check for TypeScript errors
- Verify all dependencies are installed
- Check Node.js version compatibility

## 🤝 Contributing

1. Follow TypeScript strict mode guidelines
2. Add comprehensive error handling
3. Include audit logging for data changes
4. Write tests for new functionality
5. Update documentation for API changes

## 📄 License

Copyright (c) 2025 Mosaic Employer Solutions, Inc.
