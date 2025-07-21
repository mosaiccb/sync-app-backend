"use strict";
// Database service for tenant configuration management
// Uses SQL Server for configuration data and Azure Key Vault for secrets
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
exports.TenantDatabaseService = void 0;
const sql = __importStar(require("mssql"));
const identity_1 = require("@azure/identity");
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
class TenantDatabaseService {
    keyVaultClient;
    credential;
    pool = null;
    constructor() {
        // Initialize Azure credentials
        this.credential = new identity_1.DefaultAzureCredential();
        // Initialize Key Vault client for secrets
        const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL || 'https://ukgsync-kv-5rrqlcuxyzlvy.vault.azure.net/';
        this.keyVaultClient = new keyvault_secrets_1.SecretClient(keyVaultUrl, this.credential);
    }
    /**
     * Parse SQL connection string to mssql config
     * @param connectionString Connection string to parse
     * @returns Parsed connection configuration for mssql
     */
    parseConnectionStringToConfig(connectionString) {
        const config = {
            options: {
                encrypt: true,
                trustServerCertificate: false,
                requestTimeout: 30000,
                connectTimeout: 30000,
                enableArithAbort: true
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            }
        };
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
                        config.user = cleanValue;
                        break;
                    case 'password':
                    case 'pwd':
                        config.password = cleanValue;
                        break;
                    case 'encrypt':
                        config.options.encrypt = cleanValue.toLowerCase() === 'true';
                        break;
                }
            }
        });
        return config;
    }
    /**
     * Get database connection pool with fallback authentication
     * @returns Promise<sql.ConnectionPool>
     */
    async getConnectionPool() {
        if (this.pool && this.pool.connected) {
            return this.pool;
        }
        // Try managed identity first, then SQL auth as fallback
        this.pool = await this.createConnectionWithFallback();
        return this.pool;
    }
    /**
     * Create connection with managed identity fallback to SQL auth
     * @returns Promise<sql.ConnectionPool>
     */
    async createConnectionWithFallback() {
        const isAzureEnvironment = process.env.FUNCTIONS_WORKER_RUNTIME || process.env.WEBSITE_SITE_NAME;
        const authType = process.env.SQL_AUTH_TYPE || 'azure-active-directory-msi-app-service';
        // Check if SQL_AUTH_TYPE is explicitly set to use SQL authentication
        if (authType === 'default') {
            console.log('SQL_AUTH_TYPE is set to default, using SQL authentication');
            const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
            if (connectionString) {
                try {
                    console.log('Attempting SQL authentication...');
                    const sqlConfig = this.parseConnectionStringToConfig(connectionString);
                    const sqlPool = new sql.ConnectionPool(sqlConfig);
                    await sqlPool.connect();
                    console.log('✅ Connected using SQL authentication');
                    return sqlPool;
                }
                catch (sqlError) {
                    console.error('❌ SQL authentication failed:', sqlError?.message || sqlError);
                    throw new Error(`SQL authentication failed: ${sqlError?.message || sqlError}`);
                }
            }
            else {
                throw new Error('SQL_AUTH_TYPE is default but AZURE_SQL_CONNECTION_STRING is not provided');
            }
        }
        if (isAzureEnvironment && authType === 'azure-active-directory-msi-app-service') {
            // Try managed identity first
            try {
                console.log('Attempting managed identity connection...');
                const managedConfig = {
                    server: process.env.SQL_SERVER || 'mosaic.database.windows.net',
                    database: process.env.SQL_DATABASE || 'moevocorp',
                    authentication: {
                        type: 'azure-active-directory-msi-app-service',
                        options: {}
                    },
                    options: {
                        encrypt: true,
                        trustServerCertificate: false,
                        requestTimeout: 30000,
                        connectTimeout: 30000,
                        enableArithAbort: true
                    },
                    pool: {
                        max: 10,
                        min: 0,
                        idleTimeoutMillis: 30000
                    }
                };
                const managedPool = new sql.ConnectionPool(managedConfig);
                await managedPool.connect();
                console.log('✅ Connected using managed identity');
                return managedPool;
            }
            catch (managedError) {
                console.warn('⚠️ Managed identity failed, falling back to SQL auth:', managedError?.message || managedError);
                // Fallback to SQL authentication using connection string
                const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
                if (connectionString) {
                    try {
                        console.log('Attempting SQL auth fallback...');
                        const sqlConfig = this.parseConnectionStringToConfig(connectionString);
                        const sqlPool = new sql.ConnectionPool(sqlConfig);
                        await sqlPool.connect();
                        console.log('✅ Connected using SQL authentication fallback');
                        return sqlPool;
                    }
                    catch (sqlError) {
                        console.error('❌ SQL auth fallback also failed:', sqlError?.message || sqlError);
                        throw new Error(`Both managed identity and SQL auth failed. Managed: ${managedError?.message || managedError}, SQL: ${sqlError?.message || sqlError}`);
                    }
                }
                else {
                    throw new Error(`Managed identity failed and no AZURE_SQL_CONNECTION_STRING provided. Error: ${managedError?.message || managedError}`);
                }
            }
        }
        else {
            // Development environment - use SQL authentication
            const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
            if (connectionString) {
                const config = this.parseConnectionStringToConfig(connectionString);
                const pool = new sql.ConnectionPool(config);
                await pool.connect();
                console.log('✅ Connected using development SQL auth');
                return pool;
            }
            else {
                throw new Error('AZURE_SQL_CONNECTION_STRING required for development environment');
            }
        }
    }
    /**
     * Execute a SQL query using mssql
     * @param query SQL query string
     * @param parameters Query parameters
     * @returns Promise<any[]>
     */
    async executeQuery(query, parameters = {}) {
        const pool = await this.getConnectionPool();
        const request = pool.request();
        // Add parameters to request
        Object.keys(parameters).forEach(key => {
            request.input(key, parameters[key]);
        });
        const result = await request.query(query);
        return result.recordset || [];
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
        const parameters = { tenantId };
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
        const pool = await this.getConnectionPool();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            // Insert tenant configuration
            const insertTenantQuery = `
        INSERT INTO [dbo].[Tenants] 
          ([Id], [TenantName], [CompanyId], [BaseUrl], [ClientId], [Description], [CreatedBy])
        VALUES 
          (@id, @tenantName, @companyId, @baseUrl, @clientId, @description, @createdBy)
      `;
            const tenantRequest = new sql.Request(transaction);
            tenantRequest.input('id', sql.UniqueIdentifier, tenantId);
            tenantRequest.input('tenantName', sql.NVarChar, tenantData.tenantName);
            tenantRequest.input('companyId', sql.NVarChar, tenantData.companyId);
            tenantRequest.input('baseUrl', sql.NVarChar, tenantData.baseUrl);
            tenantRequest.input('clientId', sql.NVarChar, tenantData.clientId);
            tenantRequest.input('description', sql.NVarChar, tenantData.description || '');
            tenantRequest.input('createdBy', sql.NVarChar, 'system');
            await tenantRequest.query(insertTenantQuery);
            // Insert UKG API configuration
            const insertUKGQuery = `
        INSERT INTO [dbo].[UKGApiConfigurations] 
          ([TenantId], [TokenEndpoint], [CreatedBy])
        VALUES 
          (@tenantId, @tokenEndpoint, @createdBy)
      `;
            const ukgRequest = new sql.Request(transaction);
            ukgRequest.input('tenantId', sql.UniqueIdentifier, tenantId);
            ukgRequest.input('tokenEndpoint', sql.NVarChar, `${tenantData.baseUrl}/ta/rest/v2/companies/${tenantData.companyId}/oauth2/token`);
            ukgRequest.input('createdBy', sql.NVarChar, 'system');
            await ukgRequest.query(insertUKGQuery);
            // Store client secret in Key Vault
            await this.storeClientSecret(tenantId, tenantData.clientSecret);
            // Audit the creation
            await this.auditTenantChange(tenantId, 'CREATE', '', `TenantName:${tenantData.tenantName}; CompanyId:${tenantData.companyId}; BaseUrl:${tenantData.baseUrl}`, 'system');
            await transaction.commit();
            return tenantId;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    /**
     * Update an existing tenant
     * @param tenantData Updated tenant data
     * @returns Promise<boolean>
     */
    async updateTenant(tenantData) {
        const pool = await this.getConnectionPool();
        try {
            // Get old values for audit
            const oldTenant = await this.getTenantById(tenantData.id);
            if (!oldTenant)
                return false;
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                // Update tenant configuration
                const updateTenantQuery = `
          UPDATE [dbo].[Tenants] 
          SET 
            [TenantName] = @tenantName,
            [CompanyId] = @companyId,
            [BaseUrl] = @baseUrl,
            [ClientId] = @clientId,
            [Description] = @description,
            [IsActive] = @isActive,
            [ModifiedBy] = @modifiedBy,
            [ModifiedDate] = GETUTCDATE()
          WHERE [Id] = @id
        `;
                const tenantRequest = new sql.Request(transaction);
                tenantRequest.input('id', sql.UniqueIdentifier, tenantData.id);
                tenantRequest.input('tenantName', sql.NVarChar, tenantData.tenantName);
                tenantRequest.input('companyId', sql.NVarChar, tenantData.companyId);
                tenantRequest.input('baseUrl', sql.NVarChar, tenantData.baseUrl);
                tenantRequest.input('clientId', sql.NVarChar, tenantData.clientId);
                tenantRequest.input('description', sql.NVarChar, tenantData.description || '');
                tenantRequest.input('isActive', sql.Bit, tenantData.isActive !== undefined ? tenantData.isActive : true);
                tenantRequest.input('modifiedBy', sql.NVarChar, 'system');
                await tenantRequest.query(updateTenantQuery);
                // Update UKG configuration
                const updateUKGQuery = `
          UPDATE [dbo].[UKGApiConfigurations] 
          SET 
            [TokenEndpoint] = @tokenEndpoint,
            [ModifiedBy] = @modifiedBy,
            [ModifiedDate] = GETUTCDATE()
          WHERE [TenantId] = @tenantId
        `;
                const ukgRequest = new sql.Request(transaction);
                ukgRequest.input('tenantId', sql.UniqueIdentifier, tenantData.id);
                ukgRequest.input('tokenEndpoint', sql.NVarChar, `${tenantData.baseUrl}/ta/rest/v2/companies/${tenantData.companyId}/oauth2/token`);
                ukgRequest.input('modifiedBy', sql.NVarChar, 'system');
                await ukgRequest.query(updateUKGQuery);
                // Update client secret if provided
                if (tenantData.clientSecret) {
                    await this.storeClientSecret(tenantData.id, tenantData.clientSecret);
                }
                // Audit the update
                const oldValues = `TenantName:${oldTenant.tenantName}; CompanyId:${oldTenant.companyId}; BaseUrl:${oldTenant.baseUrl}`;
                const newValues = `TenantName:${tenantData.tenantName}; CompanyId:${tenantData.companyId}; BaseUrl:${tenantData.baseUrl}`;
                await this.auditTenantChange(tenantData.id, 'UPDATE', oldValues, newValues, 'system');
                await transaction.commit();
                return true;
            }
            catch (error) {
                await transaction.rollback();
                throw error;
            }
        }
        catch (error) {
            console.error('Update tenant error:', error);
            return false;
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
        const parameters = {
            tenantId,
            modifiedBy: 'system'
        };
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
        const parameters = {
            tenantId,
            action,
            oldValues,
            newValues,
            changedBy
        };
        await this.executeQuery(query, parameters);
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
    // ===== ThirdPartyAPI Methods =====
    /**
     * Test database connection for ThirdPartyAPI operations
     */
    async testThirdPartyAPIConnection() {
        try {
            const pool = await this.getConnectionPool();
            const request = pool.request();
            const result = await request.query('SELECT GETDATE() as CurrentTime');
            console.log(`ThirdPartyAPI DB Test Result: CurrentTime = ${result.recordset[0]?.CurrentTime}`);
            return {
                success: true,
                message: 'Database connection successful',
                details: {
                    server: process.env.SQL_SERVER || 'mosaic.database.windows.net',
                    database: process.env.SQL_DATABASE || 'moevocorp',
                    currentTime: result.recordset[0]?.CurrentTime
                }
            };
        }
        catch (error) {
            console.error('ThirdPartyAPI Database test failed:', error);
            return { success: false, message: error?.message || error };
        }
    }
    /**
     * Create a new ThirdPartyAPI
     */
    async createThirdPartyAPI(apiData) {
        const id = this.generateGuid();
        const query = `
      INSERT INTO [dbo].[ThirdPartyAPIs] (
        [Id], [Name], [Description], [Category], [Provider], [BaseUrl], 
        [Version], [AuthType], [KeyVaultSecretName], [ConfigurationJson], 
        [CreatedBy], [UpdatedBy], [IsActive]
      ) VALUES (
        @id, @name, @description, @category, @provider, @baseUrl,
        @version, @authType, @keyVaultSecretName, @configurationJson,
        @createdBy, @updatedBy, 1
      )
    `;
        const parameters = {
            id,
            name: apiData.Name,
            description: apiData.Description || null,
            category: apiData.Category || null,
            provider: apiData.Provider,
            baseUrl: apiData.BaseUrl,
            version: apiData.Version || null,
            authType: apiData.AuthType,
            keyVaultSecretName: apiData.KeyVaultSecretName,
            configurationJson: apiData.ConfigurationJson || null,
            createdBy: apiData.CreatedBy || 'system',
            updatedBy: apiData.UpdatedBy || apiData.CreatedBy || 'system'
        };
        await this.executeQuery(query, parameters);
        return id;
    }
    /**
     * Get all ThirdPartyAPIs
     */
    async getAllThirdPartyAPIs() {
        const query = `
      SELECT 
        [Id], [Name], [Description], [Category], [Provider], [BaseUrl],
        [Version], [AuthType], [KeyVaultSecretName], [ConfigurationJson],
        [IsActive], [CreatedAt], [UpdatedAt], [CreatedBy], [UpdatedBy]
      FROM [dbo].[ThirdPartyAPIs]
      WHERE [IsActive] = 1
      ORDER BY [Name]
    `;
        const results = await this.executeQuery(query);
        return results.map(row => ({
            Id: row.Id,
            Name: row.Name,
            Description: row.Description,
            Category: row.Category,
            Provider: row.Provider,
            BaseUrl: row.BaseUrl,
            Version: row.Version,
            AuthType: row.AuthType,
            KeyVaultSecretName: row.KeyVaultSecretName,
            ConfigurationJson: row.ConfigurationJson,
            IsActive: row.IsActive,
            CreatedAt: row.CreatedAt,
            UpdatedAt: row.UpdatedAt,
            CreatedBy: row.CreatedBy,
            UpdatedBy: row.UpdatedBy
        }));
    }
    /**
     * Get ThirdPartyAPI by ID
     */
    async getThirdPartyAPIById(id) {
        const query = `
      SELECT 
        [Id], [Name], [Description], [Category], [Provider], [BaseUrl],
        [Version], [AuthType], [KeyVaultSecretName], [ConfigurationJson],
        [IsActive], [CreatedAt], [UpdatedAt], [CreatedBy], [UpdatedBy]
      FROM [dbo].[ThirdPartyAPIs]
      WHERE [Id] = @id AND [IsActive] = 1
    `;
        const parameters = { id };
        const results = await this.executeQuery(query, parameters);
        if (results.length === 0)
            return null;
        const row = results[0];
        return {
            Id: row.Id,
            Name: row.Name,
            Description: row.Description,
            Category: row.Category,
            Provider: row.Provider,
            BaseUrl: row.BaseUrl,
            Version: row.Version,
            AuthType: row.AuthType,
            KeyVaultSecretName: row.KeyVaultSecretName,
            ConfigurationJson: row.ConfigurationJson,
            IsActive: row.IsActive,
            CreatedAt: row.CreatedAt,
            UpdatedAt: row.UpdatedAt,
            CreatedBy: row.CreatedBy,
            UpdatedBy: row.UpdatedBy
        };
    }
    /**
     * Get ThirdPartyAPIs by Provider
     */
    async getThirdPartyAPIsByProvider(provider) {
        const query = `
      SELECT 
        [Id], [Name], [Description], [Category], [Provider], [BaseUrl],
        [Version], [AuthType], [KeyVaultSecretName], [ConfigurationJson],
        [IsActive], [CreatedAt], [UpdatedAt], [CreatedBy], [UpdatedBy]
      FROM [dbo].[ThirdPartyAPIs]
      WHERE [Provider] = @provider AND [IsActive] = 1
      ORDER BY [Name]
    `;
        const parameters = { provider };
        const results = await this.executeQuery(query, parameters);
        return results.map(row => ({
            Id: row.Id,
            Name: row.Name,
            Description: row.Description,
            Category: row.Category,
            Provider: row.Provider,
            BaseUrl: row.BaseUrl,
            Version: row.Version,
            AuthType: row.AuthType,
            KeyVaultSecretName: row.KeyVaultSecretName,
            ConfigurationJson: row.ConfigurationJson,
            IsActive: row.IsActive,
            CreatedAt: row.CreatedAt,
            UpdatedAt: row.UpdatedAt,
            CreatedBy: row.CreatedBy,
            UpdatedBy: row.UpdatedBy
        }));
    }
    /**
     * Update ThirdPartyAPI
     */
    async updateThirdPartyAPI(id, apiData) {
        const pool = await this.getConnectionPool();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const updateFields = [];
            const parameters = { id };
            if (apiData.Name !== undefined) {
                updateFields.push('[Name] = @name');
                parameters.name = apiData.Name;
            }
            if (apiData.Description !== undefined) {
                updateFields.push('[Description] = @description');
                parameters.description = apiData.Description;
            }
            if (apiData.Category !== undefined) {
                updateFields.push('[Category] = @category');
                parameters.category = apiData.Category;
            }
            if (apiData.Provider !== undefined) {
                updateFields.push('[Provider] = @provider');
                parameters.provider = apiData.Provider;
            }
            if (apiData.BaseUrl !== undefined) {
                updateFields.push('[BaseUrl] = @baseUrl');
                parameters.baseUrl = apiData.BaseUrl;
            }
            if (apiData.Version !== undefined) {
                updateFields.push('[Version] = @version');
                parameters.version = apiData.Version;
            }
            if (apiData.AuthType !== undefined) {
                updateFields.push('[AuthType] = @authType');
                parameters.authType = apiData.AuthType;
            }
            if (apiData.KeyVaultSecretName !== undefined) {
                updateFields.push('[KeyVaultSecretName] = @keyVaultSecretName');
                parameters.keyVaultSecretName = apiData.KeyVaultSecretName;
            }
            if (apiData.ConfigurationJson !== undefined) {
                updateFields.push('[ConfigurationJson] = @configurationJson');
                parameters.configurationJson = apiData.ConfigurationJson;
            }
            if (updateFields.length === 0) {
                await transaction.rollback();
                return false;
            }
            updateFields.push('[UpdatedAt] = GETUTCDATE()');
            updateFields.push('[UpdatedBy] = @updatedBy');
            parameters.updatedBy = apiData.UpdatedBy || 'system';
            const query = `
        UPDATE [dbo].[ThirdPartyAPIs] 
        SET ${updateFields.join(', ')}
        WHERE [Id] = @id AND [IsActive] = 1
      `;
            const request = new sql.Request(transaction);
            Object.keys(parameters).forEach(key => {
                request.input(key, parameters[key]);
            });
            const result = await request.query(query);
            await transaction.commit();
            return result.rowsAffected[0] > 0;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    /**
     * Delete ThirdPartyAPI (soft delete)
     */
    async deleteThirdPartyAPI(id, deletedBy) {
        const query = `
      UPDATE [dbo].[ThirdPartyAPIs] 
      SET 
        [IsActive] = 0,
        [UpdatedAt] = GETUTCDATE(),
        [UpdatedBy] = @updatedBy
      WHERE [Id] = @id AND [IsActive] = 1
    `;
        const parameters = {
            id,
            updatedBy: deletedBy || 'system'
        };
        await this.executeQuery(query, parameters);
        return true;
    }
}
exports.TenantDatabaseService = TenantDatabaseService;
//# sourceMappingURL=TenantDatabaseService.js.map