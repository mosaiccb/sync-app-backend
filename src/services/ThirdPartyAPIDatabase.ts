// Database service for third-party API configuration management
// Matches the actual ThirdPartyAPIs table schema in Azure SQL Database
import { Connection, Request, TYPES } from 'tedious';
import { v4 as uuidv4 } from 'uuid';

export interface ThirdPartyAPI {
    Id: string;
    Name: string;
    Description?: string;
    Category?: string;
    Provider: string;
    BaseUrl: string;
    Version?: string;
    AuthType: string;
    KeyVaultSecretName: string;
    ConfigurationJson?: string;
    IsActive: boolean;
    CreatedAt: Date;
    UpdatedAt: Date;
    CreatedBy?: string;
    UpdatedBy?: string;
}

export class ThirdPartyAPIDatabase {
    private createConnection(): Promise<Connection> {
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
                    type: sqlAuthType as any,
                    options: {}
                }
            };

            const connection = new Connection(config);

            connection.on('connect', (err) => {
                if (err) {
                    console.error('Connection failed:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQL Server');
                    resolve(connection);
                }
            });

            connection.connect();
        });
    }

    async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
        try {
            const connection = await this.createConnection();
            
            return new Promise((resolve) => {
                const request = new Request('SELECT GETDATE() as CurrentTime', (err, _rowCount, rows) => {
                    connection.close();
                    
                    if (err) {
                        resolve({ success: false, message: err.message });
                    } else {
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
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async createAPI(apiData: {
        Name: string;
        Description?: string;
        Category?: string;
        Provider: string;
        BaseUrl: string;
        Version?: string;
        AuthType: string;
        KeyVaultSecretName?: string;
        ConfigurationJson?: any;
        IsActive?: boolean;
        CreatedBy: string;
    }): Promise<string> {
        const connection = await this.createConnection();
        
        const id = uuidv4();
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
            const request = new Request(sql, (err) => {
                connection.close();
                if (err) {
                    console.error('Error creating API:', err);
                    reject(err);
                } else {
                    resolve(id);
                }
            });
            
            request.addParameter('id', TYPES.UniqueIdentifier, id);
            request.addParameter('name', TYPES.NVarChar, apiData.Name);
            request.addParameter('description', TYPES.NVarChar, apiData.Description || null);
            request.addParameter('category', TYPES.NVarChar, apiData.Category || null);
            request.addParameter('provider', TYPES.NVarChar, apiData.Provider);
            request.addParameter('baseUrl', TYPES.NVarChar, apiData.BaseUrl);
            request.addParameter('version', TYPES.NVarChar, apiData.Version || null);
            request.addParameter('authType', TYPES.NVarChar, apiData.AuthType);
            request.addParameter('keyVaultSecretName', TYPES.NVarChar, keyVaultSecretName);
            request.addParameter('configurationJson', TYPES.NVarChar, 
                apiData.ConfigurationJson ? JSON.stringify(apiData.ConfigurationJson) : null);
            request.addParameter('isActive', TYPES.Bit, apiData.IsActive !== false);
            request.addParameter('createdAt', TYPES.DateTime2, now);
            request.addParameter('updatedAt', TYPES.DateTime2, now);
            request.addParameter('createdBy', TYPES.NVarChar, apiData.CreatedBy);
            request.addParameter('updatedBy', TYPES.NVarChar, apiData.CreatedBy);
            
            connection.execSql(request);
        });
    }

    async getAllAPIs(): Promise<ThirdPartyAPI[]> {
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
            const apis: ThirdPartyAPI[] = [];
            
            const request = new Request(sql, (err, _rowCount) => {
                connection.close();
                if (err) {
                    reject(err);
                } else {
                    resolve(apis);
                }
            });
            
            request.on('row', (columns) => {
                const api: ThirdPartyAPI = {
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

    async getAPIById(id: string): Promise<ThirdPartyAPI | null> {
        const connection = await this.createConnection();
        
        const sql = `
            SELECT Id, Name, Description, Category, Provider, BaseUrl, Version, 
                   AuthType, KeyVaultSecretName, ConfigurationJson, IsActive, 
                   CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
            FROM ThirdPartyAPIs
            WHERE Id = @id
        `;
        
        return new Promise((resolve, reject) => {
            let foundAPI: ThirdPartyAPI | null = null;
            
            const request = new Request(sql, (err) => {
                connection.close();
                if (err) {
                    reject(err);
                } else {
                    resolve(foundAPI);
                }
            });
            
            request.addParameter('id', TYPES.UniqueIdentifier, id);
            
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

    async getAPIsByProvider(provider: string): Promise<ThirdPartyAPI[]> {
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
            const apis: ThirdPartyAPI[] = [];
            
            const request = new Request(sql, (err) => {
                connection.close();
                if (err) {
                    reject(err);
                } else {
                    resolve(apis);
                }
            });
            
            request.addParameter('provider', TYPES.NVarChar, provider);
            
            request.on('row', (columns) => {
                const api: ThirdPartyAPI = {
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
