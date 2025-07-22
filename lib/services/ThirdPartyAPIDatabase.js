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
exports.ThirdPartyAPIDatabase = void 0;
// Database service for third-party API configuration management
// Matches the actual ThirdPartyAPIs table schema in Azure SQL Database
const sql = __importStar(require("mssql"));
const uuid_1 = require("uuid");
class ThirdPartyAPIDatabase {
    pool = null;
    /**
     * Get database connection pool with fallback authentication
     * @returns Promise<sql.ConnectionPool>
     */
    async getConnectionPool() {
        if (this.pool && this.pool.connected) {
            return this.pool;
        }
        this.pool = await this.createConnectionWithFallback();
        return this.pool;
    }
    /**
     * Create connection with managed identity fallback to SQL auth
     * @returns Promise<sql.ConnectionPool>
     */
    async createConnectionWithFallback() {
        const isAzureEnvironment = process.env.FUNCTIONS_WORKER_RUNTIME || process.env.WEBSITE_SITE_NAME;
        if (isAzureEnvironment) {
            // Try managed identity first
            try {
                console.log('ThirdPartyAPIDatabase: Attempting managed identity connection...');
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
                console.log('✅ ThirdPartyAPIDatabase: Connected using managed identity');
                return managedPool;
            }
            catch (managedError) {
                console.warn('⚠️ ThirdPartyAPIDatabase: Managed identity failed, falling back to SQL auth:', managedError?.message || managedError);
                // Fallback to SQL authentication using connection string
                const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
                if (connectionString) {
                    try {
                        console.log('ThirdPartyAPIDatabase: Attempting SQL auth fallback...');
                        const sqlConfig = this.parseConnectionStringToConfig(connectionString);
                        const sqlPool = new sql.ConnectionPool(sqlConfig);
                        await sqlPool.connect();
                        console.log('✅ ThirdPartyAPIDatabase: Connected using SQL authentication fallback');
                        return sqlPool;
                    }
                    catch (sqlError) {
                        console.error('❌ ThirdPartyAPIDatabase: SQL auth fallback also failed:', sqlError?.message || sqlError);
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
                console.log('✅ ThirdPartyAPIDatabase: Connected using development SQL auth');
                return pool;
            }
            else {
                throw new Error('AZURE_SQL_CONNECTION_STRING required for development environment');
            }
        }
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
    async testConnection() {
        try {
            const pool = await this.getConnectionPool();
            const request = pool.request();
            const result = await request.query('SELECT GETDATE() as CurrentTime');
            console.log(`DB Test Result: CurrentTime = ${result.recordset[0]?.CurrentTime}`);
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
            console.error('Database test failed:', error);
            return { success: false, message: error?.message || error };
        }
    }
    async createAPI(apiData) {
        const id = (0, uuid_1.v4)();
        const query = `
            INSERT INTO [dbo].[ThirdPartyAPIs] (
                [Id], [Name], [Description], [Category], [Provider], [BaseUrl], 
                [Version], [AuthType], [KeyVaultSecretName], [ConfigurationJson], 
                [CreatedBy], [IsActive]
            ) VALUES (
                @id, @name, @description, @category, @provider, @baseUrl,
                @version, @authType, @keyVaultSecretName, @configurationJson,
                @createdBy, 1
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
            createdBy: apiData.CreatedBy || 'system'
        };
        await this.executeQuery(query, parameters);
        return id;
    }
    async getAllAPIs() {
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
    async getAPIById(id) {
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
    async getAPIsByProvider(provider) {
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
    async updateAPI(id, apiData) {
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
    async deleteAPI(id, deletedBy) {
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
        return true; // mssql executeQuery doesn't return rowsAffected easily, assume success if no error
    }
}
exports.ThirdPartyAPIDatabase = ThirdPartyAPIDatabase;
//# sourceMappingURL=ThirdPartyAPIDatabase.js.map