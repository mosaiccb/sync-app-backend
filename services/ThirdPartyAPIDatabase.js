"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThirdPartyAPIDatabase = void 0;
// Database service for third-party API configuration management
// Matches the actual ThirdPartyAPIs table schema in Azure SQL Database
const tedious_1 = require("tedious");
const uuid_1 = require("uuid");
class ThirdPartyAPIDatabase {
    createConnection() {
        return new Promise((resolve, reject) => {
            const sqlServer = process.env.SQL_SERVER || 'mosaic.database.windows.net';
            const sqlDatabase = process.env.SQL_DATABASE || 'moevocorp';
            const sqlAuthType = process.env.SQL_AUTH_TYPE || 'azure-active-directory-default';
            const config = {
                server: sqlServer,
                options: {
                    database: sqlDatabase,
                    encrypt: true,
                    trustServerCertificate: false,
                    requestTimeout: 300000,
                    connectTimeout: 60000,
                    rowCollectionOnRequestCompletion: true
                },
                authentication: {
                    type: sqlAuthType,
                    options: {}
                }
            };
            const connection = new tedious_1.Connection(config);
            connection.on('connect', (err) => {
                if (err) {
                    console.error('Connection failed:', err);
                    reject(err);
                }
                else {
                    console.log('Connected to SQL Server');
                    resolve(connection);
                }
            });
            connection.connect();
        });
    }
    async testConnection() {
        try {
            const connection = await this.createConnection();
            return new Promise((resolve) => {
                const request = new tedious_1.Request('SELECT GETDATE() as CurrentTime', (err, _rowCount, rows) => {
                    connection.close();
                    if (err) {
                        resolve({ success: false, message: err.message });
                    }
                    else {
                        console.log(`DB Test Result: CurrentTime = ${rows?.[0]?.[0]?.value}`);
                        resolve({
                            success: true,
                            message: 'Database connection successful',
                            details: {
                                server: process.env.SQL_SERVER || 'mosaic.database.windows.net',
                                database: process.env.SQL_DATABASE || 'moevocorp',
                                authType: process.env.SQL_AUTH_TYPE || 'azure-active-directory-default'
                            }
                        });
                    }
                });
                connection.execSql(request);
            });
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async createAPI(apiData) {
        const connection = await this.createConnection();
        const id = (0, uuid_1.v4)();
        const now = new Date();
        // Generate KeyVaultSecretName if not provided
        const keyVaultSecretName = apiData.KeyVaultSecretName ||
            `api-${apiData.Provider.toLowerCase()}-${apiData.Name.toLowerCase().replace(/\s+/g, '-')}-${id.substring(0, 8)}`;
        const sql = `
            INSERT INTO ThirdPartyAPIs 
            (Id, Name, Description, Category, Provider, BaseUrl, Version, AuthType, KeyVaultSecretName, ConfigurationJson, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
            VALUES (@id, @name, @description, @category, @provider, @baseUrl, @version, @authType, @keyVaultSecretName, @configurationJson, @isActive, @createdAt, @updatedAt, @createdBy, @updatedBy)
        `;
        return new Promise((resolve, reject) => {
            const request = new tedious_1.Request(sql, (err) => {
                connection.close();
                if (err) {
                    console.error('Error creating API:', err);
                    reject(err);
                }
                else {
                    resolve(id);
                }
            });
            request.addParameter('id', tedious_1.TYPES.UniqueIdentifier, id);
            request.addParameter('name', tedious_1.TYPES.NVarChar, apiData.Name);
            request.addParameter('description', tedious_1.TYPES.NVarChar, apiData.Description || null);
            request.addParameter('category', tedious_1.TYPES.NVarChar, apiData.Category || null);
            request.addParameter('provider', tedious_1.TYPES.NVarChar, apiData.Provider);
            request.addParameter('baseUrl', tedious_1.TYPES.NVarChar, apiData.BaseUrl);
            request.addParameter('version', tedious_1.TYPES.NVarChar, apiData.Version || null);
            request.addParameter('authType', tedious_1.TYPES.NVarChar, apiData.AuthType);
            request.addParameter('keyVaultSecretName', tedious_1.TYPES.NVarChar, keyVaultSecretName);
            request.addParameter('configurationJson', tedious_1.TYPES.NVarChar, apiData.ConfigurationJson ? JSON.stringify(apiData.ConfigurationJson) : null);
            request.addParameter('isActive', tedious_1.TYPES.Bit, apiData.IsActive !== false);
            request.addParameter('createdAt', tedious_1.TYPES.DateTime2, now);
            request.addParameter('updatedAt', tedious_1.TYPES.DateTime2, now);
            request.addParameter('createdBy', tedious_1.TYPES.NVarChar, apiData.CreatedBy);
            request.addParameter('updatedBy', tedious_1.TYPES.NVarChar, apiData.CreatedBy);
            connection.execSql(request);
        });
    }
    async getAllAPIs() {
        const connection = await this.createConnection();
        const sql = `
            SELECT Id, Name, Description, Category, Provider, BaseUrl, Version, 
                   AuthType, KeyVaultSecretName, ConfigurationJson, IsActive, 
                   CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
            FROM ThirdPartyAPIs
            WHERE IsActive = 1
            ORDER BY CreatedAt DESC
        `;
        return new Promise((resolve, reject) => {
            const apis = [];
            const request = new tedious_1.Request(sql, (err, _rowCount) => {
                connection.close();
                if (err) {
                    reject(err);
                }
                else {
                    resolve(apis);
                }
            });
            request.on('row', (columns) => {
                const api = {
                    Id: columns[0].value,
                    Name: columns[1].value,
                    Description: columns[2].value,
                    Category: columns[3].value,
                    Provider: columns[4].value,
                    BaseUrl: columns[5].value,
                    Version: columns[6].value,
                    AuthType: columns[7].value,
                    KeyVaultSecretName: columns[8].value,
                    ConfigurationJson: columns[9].value,
                    IsActive: columns[10].value,
                    CreatedAt: columns[11].value,
                    UpdatedAt: columns[12].value,
                    CreatedBy: columns[13].value,
                    UpdatedBy: columns[14].value
                };
                apis.push(api);
            });
            connection.execSql(request);
        });
    }
    async getAPIById(id) {
        const connection = await this.createConnection();
        const sql = `
            SELECT Id, Name, Description, Category, Provider, BaseUrl, Version, 
                   AuthType, KeyVaultSecretName, ConfigurationJson, IsActive, 
                   CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
            FROM ThirdPartyAPIs
            WHERE Id = @id
        `;
        return new Promise((resolve, reject) => {
            let foundAPI = null;
            const request = new tedious_1.Request(sql, (err) => {
                connection.close();
                if (err) {
                    reject(err);
                }
                else {
                    resolve(foundAPI);
                }
            });
            request.addParameter('id', tedious_1.TYPES.UniqueIdentifier, id);
            request.on('row', (columns) => {
                foundAPI = {
                    Id: columns[0].value,
                    Name: columns[1].value,
                    Description: columns[2].value,
                    Category: columns[3].value,
                    Provider: columns[4].value,
                    BaseUrl: columns[5].value,
                    Version: columns[6].value,
                    AuthType: columns[7].value,
                    KeyVaultSecretName: columns[8].value,
                    ConfigurationJson: columns[9].value,
                    IsActive: columns[10].value,
                    CreatedAt: columns[11].value,
                    UpdatedAt: columns[12].value,
                    CreatedBy: columns[13].value,
                    UpdatedBy: columns[14].value
                };
            });
            connection.execSql(request);
        });
    }
    async getAPIsByProvider(provider) {
        const connection = await this.createConnection();
        const sql = `
            SELECT Id, Name, Description, Category, Provider, BaseUrl, Version, 
                   AuthType, KeyVaultSecretName, ConfigurationJson, IsActive, 
                   CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
            FROM ThirdPartyAPIs
            WHERE Provider = @provider AND IsActive = 1
            ORDER BY CreatedAt DESC
        `;
        return new Promise((resolve, reject) => {
            const apis = [];
            const request = new tedious_1.Request(sql, (err) => {
                connection.close();
                if (err) {
                    reject(err);
                }
                else {
                    resolve(apis);
                }
            });
            request.addParameter('provider', tedious_1.TYPES.NVarChar, provider);
            request.on('row', (columns) => {
                const api = {
                    Id: columns[0].value,
                    Name: columns[1].value,
                    Description: columns[2].value,
                    Category: columns[3].value,
                    Provider: columns[4].value,
                    BaseUrl: columns[5].value,
                    Version: columns[6].value,
                    AuthType: columns[7].value,
                    KeyVaultSecretName: columns[8].value,
                    ConfigurationJson: columns[9].value,
                    IsActive: columns[10].value,
                    CreatedAt: columns[11].value,
                    UpdatedAt: columns[12].value,
                    CreatedBy: columns[13].value,
                    UpdatedBy: columns[14].value
                };
                apis.push(api);
            });
            connection.execSql(request);
        });
    }
}
exports.ThirdPartyAPIDatabase = ThirdPartyAPIDatabase;
//# sourceMappingURL=ThirdPartyAPIDatabase.js.map