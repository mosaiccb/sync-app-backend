"use strict";
// Database service for tenant configuration management
// Uses SQL Server for configuration data and Azure Key Vault for secrets
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantDatabaseService = void 0;
const tedious_1 = require("tedious");
const identity_1 = require("@azure/identity");
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
class TenantDatabaseService {
    connectionConfig;
    keyVaultClient;
    credential;
    constructor() {
        // Initialize Azure credentials
        this.credential = new identity_1.DefaultAzureCredential();
        // Initialize Key Vault client for secrets
        const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL || 'https://ukgsync-kv-5rrqlcuxyzlvy.vault.azure.net/';
        this.keyVaultClient = new keyvault_secrets_1.SecretClient(keyVaultUrl, this.credential);
        // Parse connection string if available, otherwise use individual settings
        const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
        if (connectionString) {
            // Parse connection string
            const config = this.parseConnectionString(connectionString);
            this.connectionConfig = {
                server: config.server,
                authentication: {
                    type: 'sql-password',
                    options: {
                        userName: config.username,
                        password: config.password
                    }
                },
                options: {
                    database: config.database,
                    encrypt: config.encrypt,
                    trustServerCertificate: false,
                    requestTimeout: 30000,
                    connectionTimeout: 30000,
                    port: 1433,
                    enableArithAbort: true
                }
            };
        }
        else {
            // Fallback to individual environment variables
            this.connectionConfig = {
                server: process.env.SQL_SERVER || 'mosaic.database.windows.net',
                authentication: {
                    type: 'sql-password',
                    options: {
                        userName: process.env.SQL_USERNAME || '',
                        password: process.env.SQL_PASSWORD || ''
                    }
                },
                options: {
                    database: process.env.SQL_DATABASE || 'moevocorp',
                    encrypt: true,
                    trustServerCertificate: false,
                    requestTimeout: 30000,
                    connectionTimeout: 30000,
                    port: 1433,
                    enableArithAbort: true
                }
            };
        }
    }
    /**
     * Parse SQL connection string
     * @param connectionString Connection string to parse
     * @returns Parsed connection configuration
     */
    parseConnectionString(connectionString) {
        const config = {};
        const parts = connectionString.split(';');
        parts.forEach(part => {
            const [key, value] = part.split('=', 2);
            if (key && value) {
                const cleanKey = key.trim().toLowerCase();
                const cleanValue = value.trim();
                switch (cleanKey) {
                    case 'server':
                        config.server = cleanValue;
                        break;
                    case 'database':
                        config.database = cleanValue;
                        break;
                    case 'user id':
                    case 'uid':
                        config.username = cleanValue;
                        break;
                    case 'password':
                    case 'pwd':
                        config.password = cleanValue;
                        break;
                    case 'encrypt':
                        config.encrypt = cleanValue.toLowerCase() === 'true';
                        break;
                }
            }
        });
        return config;
    }
    /**
     * Create a new database connection
     * @returns Promise<Connection>
     */
    async createConnection() {
        return new Promise((resolve, reject) => {
            const connection = new tedious_1.Connection(this.connectionConfig);
            connection.connect((err) => {
                if (err) {
                    console.error('Database connection error:', err);
                    reject(err);
                }
                else {
                    console.log('Connected to SQL Server');
                    resolve(connection);
                }
            });
        });
    }
    /**
     * Execute a SQL query
     * @param query SQL query string
     * @param parameters Query parameters
     * @returns Promise<any[]>
     */
    async executeQuery(query, parameters = []) {
        const connection = await this.createConnection();
        return new Promise((resolve, reject) => {
            const results = [];
            const request = new tedious_1.Request(query, (err) => {
                connection.close();
                if (err) {
                    console.error('Query execution error:', err);
                    reject(err);
                }
                else {
                    resolve(results);
                }
            });
            // Add parameters to request
            parameters.forEach(param => {
                request.addParameter(param.name, param.type, param.value);
            });
            // Handle row results
            request.on('row', (columns) => {
                const row = {};
                columns.forEach((column) => {
                    row[column.metadata.colName] = column.value;
                });
                results.push(row);
            });
            connection.execSql(request);
        });
    }
    /**
     * Get all active tenants with UKG configuration
     * @returns Promise<TenantConfig[]>
     */
    async getAllTenants() {
        const query = `
      SELECT 
        t.Id as id,
        t.TenantName as tenantName,
        t.CompanyId as companyId,
        t.BaseUrl as baseUrl,
        t.ClientId as clientId,
        t.Description as description,
        t.IsActive as isActive,
        t.CreatedDate as createdDate,
        t.ModifiedDate as modifiedDate,
        u.TokenEndpoint as tokenEndpoint,
        u.ApiVersion as apiVersion,
        u.Scope as scope
      FROM [dbo].[Tenants] t
      LEFT JOIN [dbo].[UKGApiConfigurations] u ON t.Id = u.TenantId AND u.IsActive = 1
      WHERE t.IsActive = 1
      ORDER BY t.TenantName
    `;
        const results = await this.executeQuery(query);
        return results.map(row => ({
            id: row.id,
            tenantName: row.tenantName,
            companyId: row.companyId,
            baseUrl: row.baseUrl,
            clientId: row.clientId,
            description: row.description,
            isActive: row.isActive,
            createdDate: row.createdDate,
            modifiedDate: row.modifiedDate,
            tokenEndpoint: row.tokenEndpoint,
            apiVersion: row.apiVersion,
            scope: row.scope
        }));
    }
    /**
     * Get tenant by ID
     * @param tenantId Tenant ID
     * @returns Promise<TenantConfig | null>
     */
    async getTenantById(tenantId) {
        const query = `
      SELECT 
        t.Id as id,
        t.TenantName as tenantName,
        t.CompanyId as companyId,
        t.BaseUrl as baseUrl,
        t.ClientId as clientId,
        t.Description as description,
        t.IsActive as isActive,
        t.CreatedDate as createdDate,
        t.ModifiedDate as modifiedDate,
        u.TokenEndpoint as tokenEndpoint,
        u.ApiVersion as apiVersion,
        u.Scope as scope
      FROM [dbo].[Tenants] t
      LEFT JOIN [dbo].[UKGApiConfigurations] u ON t.Id = u.TenantId AND u.IsActive = 1
      WHERE t.Id = @tenantId AND t.IsActive = 1
    `;
        const parameters = [
            { name: 'tenantId', type: tedious_1.TYPES.UniqueIdentifier, value: tenantId }
        ];
        const results = await this.executeQuery(query, parameters);
        if (results.length === 0)
            return null;
        const row = results[0];
        return {
            id: row.id,
            tenantName: row.tenantName,
            companyId: row.companyId,
            baseUrl: row.baseUrl,
            clientId: row.clientId,
            description: row.description,
            isActive: row.isActive,
            createdDate: row.createdDate,
            modifiedDate: row.modifiedDate,
            tokenEndpoint: row.tokenEndpoint,
            apiVersion: row.apiVersion,
            scope: row.scope
        };
    }
    /**
     * Create a new tenant
     * @param tenantData Tenant configuration data
     * @returns Promise<string> New tenant ID
     */
    async createTenant(tenantData) {
        const tenantId = this.generateGuid();
        const connection = await this.createConnection();
        try {
            // Start transaction
            await this.executeTransaction(connection, async () => {
                // Insert tenant configuration
                const insertTenantQuery = `
          INSERT INTO [dbo].[Tenants] 
            ([Id], [TenantName], [CompanyId], [BaseUrl], [ClientId], [Description], [CreatedBy])
          VALUES 
            (@id, @tenantName, @companyId, @baseUrl, @clientId, @description, @createdBy)
        `;
                const tenantParams = [
                    { name: 'id', type: tedious_1.TYPES.UniqueIdentifier, value: tenantId },
                    { name: 'tenantName', type: tedious_1.TYPES.NVarChar, value: tenantData.tenantName },
                    { name: 'companyId', type: tedious_1.TYPES.NVarChar, value: tenantData.companyId },
                    { name: 'baseUrl', type: tedious_1.TYPES.NVarChar, value: tenantData.baseUrl },
                    { name: 'clientId', type: tedious_1.TYPES.NVarChar, value: tenantData.clientId },
                    { name: 'description', type: tedious_1.TYPES.NVarChar, value: tenantData.description || '' },
                    { name: 'createdBy', type: tedious_1.TYPES.NVarChar, value: 'system' }
                ];
                await this.executeQuery(insertTenantQuery, tenantParams);
                // Insert UKG API configuration
                const insertUKGQuery = `
          INSERT INTO [dbo].[UKGApiConfigurations] 
            ([TenantId], [TokenEndpoint], [CreatedBy])
          VALUES 
            (@tenantId, @tokenEndpoint, @createdBy)
        `;
                const ukgParams = [
                    { name: 'tenantId', type: tedious_1.TYPES.UniqueIdentifier, value: tenantId },
                    { name: 'tokenEndpoint', type: tedious_1.TYPES.NVarChar, value: `${tenantData.baseUrl}/ta/rest/v2/companies/${tenantData.companyId}/oauth2/token` },
                    { name: 'createdBy', type: tedious_1.TYPES.NVarChar, value: 'system' }
                ];
                await this.executeQuery(insertUKGQuery, ukgParams);
                // Store client secret in Key Vault
                await this.storeClientSecret(tenantId, tenantData.clientSecret);
                // Audit the creation
                await this.auditTenantChange(tenantId, 'CREATE', '', `TenantName:${tenantData.tenantName}; CompanyId:${tenantData.companyId}; BaseUrl:${tenantData.baseUrl}`, 'system');
            });
            return tenantId;
        }
        finally {
            connection.close();
        }
    }
    /**
     * Update an existing tenant
     * @param tenantData Updated tenant data
     * @returns Promise<boolean>
     */
    async updateTenant(tenantData) {
        const connection = await this.createConnection();
        try {
            // Get old values for audit
            const oldTenant = await this.getTenantById(tenantData.id);
            if (!oldTenant)
                return false;
            await this.executeTransaction(connection, async () => {
                // Update tenant configuration
                const updateTenantQuery = `
          UPDATE [dbo].[Tenants] 
          SET 
            [TenantName] = @tenantName,
            [CompanyId] = @companyId,
            [BaseUrl] = @baseUrl,
            [ClientId] = @clientId,
            [Description] = @description,
            [ModifiedBy] = @modifiedBy,
            [ModifiedDate] = GETUTCDATE()
          WHERE [Id] = @id
        `;
                const tenantParams = [
                    { name: 'id', type: tedious_1.TYPES.UniqueIdentifier, value: tenantData.id },
                    { name: 'tenantName', type: tedious_1.TYPES.NVarChar, value: tenantData.tenantName },
                    { name: 'companyId', type: tedious_1.TYPES.NVarChar, value: tenantData.companyId },
                    { name: 'baseUrl', type: tedious_1.TYPES.NVarChar, value: tenantData.baseUrl },
                    { name: 'clientId', type: tedious_1.TYPES.NVarChar, value: tenantData.clientId },
                    { name: 'description', type: tedious_1.TYPES.NVarChar, value: tenantData.description || '' },
                    { name: 'modifiedBy', type: tedious_1.TYPES.NVarChar, value: 'system' }
                ];
                await this.executeQuery(updateTenantQuery, tenantParams);
                // Update UKG configuration
                const updateUKGQuery = `
          UPDATE [dbo].[UKGApiConfigurations] 
          SET 
            [TokenEndpoint] = @tokenEndpoint,
            [ModifiedBy] = @modifiedBy,
            [ModifiedDate] = GETUTCDATE()
          WHERE [TenantId] = @tenantId
        `;
                const ukgParams = [
                    { name: 'tenantId', type: tedious_1.TYPES.UniqueIdentifier, value: tenantData.id },
                    { name: 'tokenEndpoint', type: tedious_1.TYPES.NVarChar, value: `${tenantData.baseUrl}/ta/rest/v2/companies/${tenantData.companyId}/oauth2/token` },
                    { name: 'modifiedBy', type: tedious_1.TYPES.NVarChar, value: 'system' }
                ];
                await this.executeQuery(updateUKGQuery, ukgParams);
                // Update client secret if provided
                if (tenantData.clientSecret) {
                    await this.storeClientSecret(tenantData.id, tenantData.clientSecret);
                }
                // Audit the update
                const oldValues = `TenantName:${oldTenant.tenantName}; CompanyId:${oldTenant.companyId}; BaseUrl:${oldTenant.baseUrl}`;
                const newValues = `TenantName:${tenantData.tenantName}; CompanyId:${tenantData.companyId}; BaseUrl:${tenantData.baseUrl}`;
                await this.auditTenantChange(tenantData.id, 'UPDATE', oldValues, newValues, 'system');
            });
            return true;
        }
        finally {
            connection.close();
        }
    }
    /**
     * Delete a tenant (soft delete)
     * @param tenantId Tenant ID to delete
     * @returns Promise<boolean>
     */
    async deleteTenant(tenantId) {
        const query = `
      UPDATE [dbo].[Tenants] 
      SET 
        [IsActive] = 0,
        [ModifiedBy] = @modifiedBy,
        [ModifiedDate] = GETUTCDATE()
      WHERE [Id] = @tenantId;
      
      UPDATE [dbo].[UKGApiConfigurations] 
      SET 
        [IsActive] = 0,
        [ModifiedBy] = @modifiedBy,
        [ModifiedDate] = GETUTCDATE()
      WHERE [TenantId] = @tenantId;
    `;
        const parameters = [
            { name: 'tenantId', type: tedious_1.TYPES.UniqueIdentifier, value: tenantId },
            { name: 'modifiedBy', type: tedious_1.TYPES.NVarChar, value: 'system' }
        ];
        await this.executeQuery(query, parameters);
        await this.auditTenantChange(tenantId, 'DELETE', '', '', 'system');
        return true;
    }
    /**
     * Get client secret from Key Vault
     * @param tenantId Tenant ID
     * @returns Promise<string | null>
     */
    async getClientSecret(tenantId) {
        try {
            const secretName = `tenant-${tenantId}-client-secret`;
            const secret = await this.keyVaultClient.getSecret(secretName);
            return secret.value || null;
        }
        catch (error) {
            console.error(`Error retrieving client secret for tenant ${tenantId}:`, error);
            return null;
        }
    }
    /**
     * Store client secret in Key Vault
     * @param tenantId Tenant ID
     * @param clientSecret Client secret value
     * @returns Promise<void>
     */
    async storeClientSecret(tenantId, clientSecret) {
        try {
            const secretName = `tenant-${tenantId}-client-secret`;
            await this.keyVaultClient.setSecret(secretName, clientSecret);
        }
        catch (error) {
            console.error(`Error storing client secret for tenant ${tenantId}:`, error);
            throw error;
        }
    }
    /**
     * Audit tenant changes
     * @param tenantId Tenant ID
     * @param action Action performed
     * @param oldValues Old values
     * @param newValues New values
     * @param changedBy User who made the change
     * @returns Promise<void>
     */
    async auditTenantChange(tenantId, action, oldValues, newValues, changedBy) {
        const query = `
      INSERT INTO [dbo].[TenantAudit] 
        ([TenantId], [Action], [OldValues], [NewValues], [ChangedBy])
      VALUES 
        (@tenantId, @action, @oldValues, @newValues, @changedBy)
    `;
        const parameters = [
            { name: 'tenantId', type: tedious_1.TYPES.UniqueIdentifier, value: tenantId },
            { name: 'action', type: tedious_1.TYPES.NVarChar, value: action },
            { name: 'oldValues', type: tedious_1.TYPES.NVarChar, value: oldValues },
            { name: 'newValues', type: tedious_1.TYPES.NVarChar, value: newValues },
            { name: 'changedBy', type: tedious_1.TYPES.NVarChar, value: changedBy }
        ];
        await this.executeQuery(query, parameters);
    }
    /**
     * Execute a transaction
     * @param connection Database connection
     * @param operations Operations to execute in transaction
     * @returns Promise<void>
     */
    async executeTransaction(connection, operations) {
        return new Promise((resolve, reject) => {
            connection.beginTransaction(async (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                try {
                    await operations();
                    connection.commitTransaction((commitErr) => {
                        if (commitErr) {
                            reject(commitErr);
                        }
                        else {
                            resolve();
                        }
                    });
                }
                catch (error) {
                    connection.rollbackTransaction((rollbackErr) => {
                        if (rollbackErr) {
                            console.error('Rollback error:', rollbackErr);
                        }
                        reject(error);
                    });
                }
            });
        });
    }
    /**
     * Generate a new GUID
     * @returns string
     */
    generateGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
exports.TenantDatabaseService = TenantDatabaseService;
//# sourceMappingURL=TenantDatabaseService.js.map