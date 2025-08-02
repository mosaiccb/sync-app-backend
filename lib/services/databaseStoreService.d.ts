/**
 * Database Store Configuration Service
 * Handles SQL database operations for store configurations
 */
import { InvocationContext } from '@azure/functions';
import { StoreConfig } from './storeConfigService';
declare class DatabaseStoreService {
    private static instance;
    private pool;
    private isConnecting;
    private constructor();
    static getInstance(): DatabaseStoreService;
    /**
     * Get database configuration from environment variables
     */
    private getDatabaseConfig;
    /**
     * Get or create database connection pool
     */
    private getConnection;
    /**
     * Get all active stores from database
     */
    getAllStores(context?: InvocationContext): Promise<StoreConfig[]>;
    /**
     * Get single store by token
     */
    getStoreByToken(token: string, context?: InvocationContext): Promise<StoreConfig | null>;
    /**
     * Get stores by state
     */
    getStoresByState(state: string, context?: InvocationContext): Promise<StoreConfig[]>;
    /**
     * Get store operating hours
     */
    getStoreHours(token: string, context?: InvocationContext): Promise<{
        opening: number;
        closing: number;
    } | null>;
    /**
     * Update store configuration
     */
    updateStore(token: string, updates: Partial<StoreConfig>, updatedBy: string, context?: InvocationContext): Promise<boolean>;
    /**
     * Add new store
     */
    addStore(store: Omit<StoreConfig, 'lastUpdated'>, createdBy: string, context?: InvocationContext): Promise<boolean>;
    /**
     * Test database connection
     */
    testConnection(context?: InvocationContext): Promise<boolean>;
    /**
     * Close database connection
     */
    close(context?: InvocationContext): Promise<void>;
}
export declare const databaseStoreService: DatabaseStoreService;
export {};
//# sourceMappingURL=databaseStoreService.d.ts.map