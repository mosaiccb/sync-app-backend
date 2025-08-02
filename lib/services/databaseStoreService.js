"use strict";
/**
 * Database Store Configuration Service
 * Handles SQL database operations for store configurations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseStoreService = void 0;
const mssql_1 = require("mssql");
class DatabaseStoreService {
    static instance;
    pool = null;
    isConnecting = false;
    constructor() { }
    static getInstance() {
        if (!DatabaseStoreService.instance) {
            DatabaseStoreService.instance = new DatabaseStoreService();
        }
        return DatabaseStoreService.instance;
    }
    /**
     * Get database configuration from environment variables
     */
    getDatabaseConfig() {
        const sqlAuthType = process.env.SQL_AUTH_TYPE || 'default';
        const authType = sqlAuthType === 'default' ? 'default' : 'azure-active-directory-msi-app-service';
        const config = {
            server: process.env.SQL_SERVER || 'your-server.database.windows.net',
            database: process.env.SQL_DATABASE || 'sync-app-db',
            authentication: {
                type: authType,
                options: authType === 'default' ? {
                    userName: process.env.SQL_USERNAME,
                    password: process.env.SQL_PASSWORD
                } : undefined
            },
            options: {
                encrypt: true,
                trustServerCertificate: false
            }
        };
        // Debug log (hide sensitive info)
        console.log('🔍 Database config:', {
            server: config.server,
            database: config.database,
            authType: config.authentication.type,
            hasUsername: !!config.authentication.options?.userName,
            hasPassword: !!config.authentication.options?.password,
            envAuthType: sqlAuthType
        });
        return config;
    }
    /**
     * Get or create database connection pool
     */
    async getConnection(context) {
        if (this.pool && this.pool.connected) {
            return this.pool;
        }
        if (this.isConnecting) {
            // Wait for existing connection attempt
            while (this.isConnecting) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (this.pool && this.pool.connected) {
                return this.pool;
            }
        }
        this.isConnecting = true;
        try {
            const config = this.getDatabaseConfig();
            context?.log(`🔌 Connecting to database: ${config.server}/${config.database}`);
            this.pool = new mssql_1.ConnectionPool(config);
            await this.pool.connect();
            context?.log('✅ Database connection established');
            return this.pool;
        }
        catch (error) {
            context?.error('❌ Database connection failed:', error);
            throw error;
        }
        finally {
            this.isConnecting = false;
        }
    }
    /**
     * Get all active stores from database
     */
    async getAllStores(context) {
        try {
            const pool = await this.getConnection(context);
            const request = new mssql_1.Request(pool);
            const query = `
        SELECT 
          location_token as token,
          store_name as name,
          par_brink_location_id as id,
          timezone,
          state,
          region,
          address,
          phone,
          storeurl,
          google_maps_url as googleMapsUrl,
          daily_hours as dailyHoursJson,
          manager_name as manager,
          opening_hour as openingHour,
          closing_hour as closingHour,
          is_active as isActive,
          last_updated as lastUpdated
        FROM store_configurations 
        WHERE is_active = 1
        ORDER BY store_name;
      `;
            const result = await request.query(query);
            const stores = result.recordset.map(row => {
                // Parse daily hours JSON if available
                let dailyHours = undefined;
                if (row.dailyHoursJson) {
                    try {
                        dailyHours = JSON.parse(row.dailyHoursJson);
                    }
                    catch (error) {
                        context?.warn(`Failed to parse daily hours for store ${row.name}:`, error);
                    }
                }
                return {
                    token: row.token,
                    name: row.name,
                    id: row.id,
                    timezone: row.timezone,
                    state: row.state,
                    address: row.address,
                    phone: row.phone,
                    storeurl: row.storeurl,
                    googleMapsUrl: row.googleMapsUrl,
                    manager: row.manager,
                    region: row.region,
                    isActive: row.isActive,
                    lastUpdated: new Date(row.lastUpdated),
                    dailyHours: dailyHours,
                    openingHour: row.openingHour,
                    closingHour: row.closingHour
                };
            });
            context?.log(`📊 Retrieved ${stores.length} stores from database`);
            return stores;
        }
        catch (error) {
            context?.error('❌ Failed to fetch stores from database:', error);
            throw error;
        }
    }
    /**
     * Get single store by token
     */
    async getStoreByToken(token, context) {
        try {
            const pool = await this.getConnection(context);
            const request = new mssql_1.Request(pool);
            request.input('token', mssql_1.TYPES.NVarChar, token);
            const query = `
        SELECT 
          location_token as token,
          store_name as name,
          par_brink_location_id as id,
          timezone,
          state,
          region,
          address,
          phone,
          storeurl,
          google_maps_url as googleMapsUrl,
          daily_hours as dailyHoursJson,
          manager_name as manager,
          opening_hour as openingHour,
          closing_hour as closingHour,
          is_active as isActive,
          last_updated as lastUpdated
        FROM store_configurations 
        WHERE location_token = @token AND is_active = 1;
      `;
            const result = await request.query(query);
            if (result.recordset.length === 0) {
                return null;
            }
            const row = result.recordset[0];
            // Parse daily hours JSON if available
            let dailyHours = undefined;
            if (row.dailyHoursJson) {
                try {
                    dailyHours = JSON.parse(row.dailyHoursJson);
                }
                catch (error) {
                    context?.warn(`Failed to parse daily hours for store ${row.name}:`, error);
                }
            }
            return {
                token: row.token,
                name: row.name,
                id: row.id,
                timezone: row.timezone,
                state: row.state,
                address: row.address,
                phone: row.phone,
                storeurl: row.storeurl,
                googleMapsUrl: row.googleMapsUrl,
                manager: row.manager,
                region: row.region,
                isActive: row.isActive,
                lastUpdated: new Date(row.lastUpdated),
                dailyHours: dailyHours,
                openingHour: row.openingHour,
                closingHour: row.closingHour
            };
        }
        catch (error) {
            context?.error(`❌ Failed to fetch store ${token.substring(0, 10)}... from database:`, error);
            throw error;
        }
    }
    /**
     * Get stores by state
     */
    async getStoresByState(state, context) {
        try {
            const pool = await this.getConnection(context);
            const request = new mssql_1.Request(pool);
            request.input('state', mssql_1.TYPES.Char, state);
            const query = `
        SELECT 
          location_token as token,
          store_name as name,
          par_brink_location_id as id,
          timezone,
          state,
          region,
          address,
          phone,
          storeurl,
          google_maps_url as googleMapsUrl,
          daily_hours as dailyHoursJson,
          manager_name as manager,
          opening_hour as openingHour,
          closing_hour as closingHour,
          is_active as isActive,
          last_updated as lastUpdated
        FROM store_configurations 
        WHERE state = @state AND is_active = 1
        ORDER BY store_name;
      `;
            const result = await request.query(query);
            const stores = result.recordset.map(row => {
                // Parse daily hours JSON if available
                let dailyHours = undefined;
                if (row.dailyHoursJson) {
                    try {
                        dailyHours = JSON.parse(row.dailyHoursJson);
                    }
                    catch (error) {
                        context?.warn(`Failed to parse daily hours for store ${row.name}:`, error);
                    }
                }
                return {
                    token: row.token,
                    name: row.name,
                    id: row.id,
                    timezone: row.timezone,
                    state: row.state,
                    address: row.address,
                    phone: row.phone,
                    storeurl: row.storeurl,
                    googleMapsUrl: row.googleMapsUrl,
                    manager: row.manager,
                    region: row.region,
                    isActive: row.isActive,
                    lastUpdated: new Date(row.lastUpdated),
                    dailyHours: dailyHours,
                    openingHour: row.openingHour,
                    closingHour: row.closingHour
                };
            });
            context?.log(`📊 Retrieved ${stores.length} stores for state ${state}`);
            return stores;
        }
        catch (error) {
            context?.error(`❌ Failed to fetch stores for state ${state}:`, error);
            throw error;
        }
    }
    /**
     * Get store operating hours
     */
    async getStoreHours(token, context) {
        try {
            const pool = await this.getConnection(context);
            const request = new mssql_1.Request(pool);
            request.input('token', mssql_1.TYPES.NVarChar, token);
            const query = `
        SELECT opening_hour, closing_hour
        FROM store_configurations 
        WHERE location_token = @token AND is_active = 1;
      `;
            const result = await request.query(query);
            if (result.recordset.length === 0) {
                return null;
            }
            const row = result.recordset[0];
            return {
                opening: row.opening_hour,
                closing: row.closing_hour
            };
        }
        catch (error) {
            context?.error(`❌ Failed to fetch store hours for ${token.substring(0, 10)}...:`, error);
            throw error;
        }
    }
    /**
     * Update store configuration
     */
    async updateStore(token, updates, updatedBy, context) {
        try {
            const pool = await this.getConnection(context);
            const request = new mssql_1.Request(pool);
            // Build dynamic update query based on provided fields
            const updateFields = [];
            const allowedFields = ['name', 'timezone', 'state', 'region', 'address', 'phone', 'manager'];
            allowedFields.forEach(field => {
                if (updates[field] !== undefined) {
                    updateFields.push(`${field === 'name' ? 'store_name' : field === 'manager' ? 'manager_name' : field} = @${field}`);
                    request.input(field, mssql_1.TYPES.NVarChar, updates[field]);
                }
            });
            if (updateFields.length === 0) {
                context?.warn('No valid fields to update');
                return false;
            }
            request.input('token', mssql_1.TYPES.NVarChar, token);
            request.input('updatedBy', mssql_1.TYPES.NVarChar, updatedBy);
            const query = `
        UPDATE store_configurations 
        SET ${updateFields.join(', ')}, 
            last_updated = GETDATE(),
            updated_by = @updatedBy
        WHERE location_token = @token AND is_active = 1;
      `;
            const result = await request.query(query);
            const success = result.rowsAffected[0] > 0;
            if (success) {
                context?.log(`✅ Updated store ${token.substring(0, 10)}... successfully`);
            }
            else {
                context?.warn(`⚠️ No store found to update for token ${token.substring(0, 10)}...`);
            }
            return success;
        }
        catch (error) {
            context?.error(`❌ Failed to update store ${token.substring(0, 10)}...:`, error);
            throw error;
        }
    }
    /**
     * Add new store
     */
    async addStore(store, createdBy, context) {
        try {
            const pool = await this.getConnection(context);
            const request = new mssql_1.Request(pool);
            request.input('token', mssql_1.TYPES.NVarChar, store.token);
            request.input('name', mssql_1.TYPES.NVarChar, store.name);
            request.input('id', mssql_1.TYPES.NVarChar, store.id);
            request.input('timezone', mssql_1.TYPES.NVarChar, store.timezone);
            request.input('state', mssql_1.TYPES.Char, store.state);
            request.input('region', mssql_1.TYPES.NVarChar, store.region || null);
            request.input('address', mssql_1.TYPES.NVarChar, store.address || null);
            request.input('phone', mssql_1.TYPES.NVarChar, store.phone || null);
            request.input('manager', mssql_1.TYPES.NVarChar, store.manager || null);
            request.input('isActive', mssql_1.TYPES.Bit, store.isActive);
            request.input('createdBy', mssql_1.TYPES.NVarChar, createdBy);
            const query = `
        INSERT INTO store_configurations (
          location_token, store_name, par_brink_location_id, timezone, state,
          region, address, phone, manager_name, is_active, updated_by
        ) VALUES (
          @token, @name, @id, @timezone, @state,
          @region, @address, @phone, @manager, @isActive, @createdBy
        );
      `;
            await request.query(query);
            context?.log(`✅ Added new store: ${store.name} (${store.token.substring(0, 10)}...)`);
            return true;
        }
        catch (error) {
            context?.error(`❌ Failed to add store ${store.name}:`, error);
            throw error;
        }
    }
    /**
     * Test database connection
     */
    async testConnection(context) {
        try {
            const pool = await this.getConnection(context);
            const request = new mssql_1.Request(pool);
            const result = await request.query('SELECT COUNT(*) as store_count FROM store_configurations WHERE is_active = 1');
            const storeCount = result.recordset[0].store_count;
            context?.log(`✅ Database connection test passed. Found ${storeCount} active stores.`);
            return true;
        }
        catch (error) {
            context?.error('❌ Database connection test failed:', error);
            return false;
        }
    }
    /**
     * Close database connection
     */
    async close(context) {
        try {
            if (this.pool && this.pool.connected) {
                await this.pool.close();
                context?.log('🔌 Database connection closed');
            }
            this.pool = null;
        }
        catch (error) {
            context?.error('❌ Error closing database connection:', error);
        }
    }
}
// Export singleton instance  
exports.databaseStoreService = DatabaseStoreService.getInstance();
//# sourceMappingURL=databaseStoreService.js.map