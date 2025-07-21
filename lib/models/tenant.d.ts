import { z } from 'zod';
export declare const TenantConfigSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    ukgClientId: z.ZodString;
    ukgClientSecret: z.ZodString;
    ukgRedirectUri: z.ZodString;
    ukgScopes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    ukgBaseUrl: z.ZodString;
    isActive: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
    lastSyncAt: z.ZodOptional<z.ZodDate>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
    name: string;
    ukgClientId: string;
    ukgClientSecret: string;
    ukgRedirectUri: string;
    ukgScopes: string[];
    ukgBaseUrl: string;
    id?: string | undefined;
    description?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    lastSyncAt?: Date | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    name: string;
    ukgClientId: string;
    ukgClientSecret: string;
    ukgRedirectUri: string;
    ukgBaseUrl: string;
    id?: string | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    ukgScopes?: string[] | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    lastSyncAt?: Date | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const TenantCreateSchema: z.ZodEffects<z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    ukgClientId: z.ZodString;
    ukgClientSecret: z.ZodString;
    ukgRedirectUri: z.ZodString;
    ukgScopes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    ukgBaseUrl: z.ZodString;
    isActive: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
    lastSyncAt: z.ZodOptional<z.ZodDate>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "id" | "createdAt" | "updatedAt" | "lastSyncAt">, "strip", z.ZodTypeAny, {
    isActive: boolean;
    name: string;
    ukgClientId: string;
    ukgClientSecret: string;
    ukgRedirectUri: string;
    ukgScopes: string[];
    ukgBaseUrl: string;
    description?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    name: string;
    ukgClientId: string;
    ukgClientSecret: string;
    ukgRedirectUri: string;
    ukgBaseUrl: string;
    description?: string | undefined;
    isActive?: boolean | undefined;
    ukgScopes?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
}>, {
    description: string | undefined;
    isActive: boolean;
    name: string;
    ukgClientId: string;
    ukgClientSecret: string;
    ukgRedirectUri: string;
    ukgScopes: string[];
    ukgBaseUrl: string;
    metadata?: Record<string, any> | undefined;
}, {
    name: string;
    ukgClientId: string;
    ukgClientSecret: string;
    ukgRedirectUri: string;
    ukgBaseUrl: string;
    description?: string | undefined;
    isActive?: boolean | undefined;
    ukgScopes?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const TenantUpdateSchema: z.ZodEffects<z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ukgClientId: z.ZodOptional<z.ZodString>;
    ukgClientSecret: z.ZodOptional<z.ZodString>;
    ukgRedirectUri: z.ZodOptional<z.ZodString>;
    ukgScopes: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    ukgBaseUrl: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    createdAt: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    updatedAt: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    lastSyncAt: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
}, "id" | "createdAt">, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    ukgClientId?: string | undefined;
    ukgClientSecret?: string | undefined;
    ukgRedirectUri?: string | undefined;
    ukgScopes?: string[] | undefined;
    ukgBaseUrl?: string | undefined;
    updatedAt?: Date | undefined;
    lastSyncAt?: Date | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    description?: string | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    ukgClientId?: string | undefined;
    ukgClientSecret?: string | undefined;
    ukgRedirectUri?: string | undefined;
    ukgScopes?: string[] | undefined;
    ukgBaseUrl?: string | undefined;
    updatedAt?: Date | undefined;
    lastSyncAt?: Date | undefined;
    metadata?: Record<string, any> | undefined;
}>, {
    name: string | undefined;
    description: string | undefined;
    isActive?: boolean | undefined;
    ukgClientId?: string | undefined;
    ukgClientSecret?: string | undefined;
    ukgRedirectUri?: string | undefined;
    ukgScopes?: string[] | undefined;
    ukgBaseUrl?: string | undefined;
    updatedAt?: Date | undefined;
    lastSyncAt?: Date | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    description?: string | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    ukgClientId?: string | undefined;
    ukgClientSecret?: string | undefined;
    ukgRedirectUri?: string | undefined;
    ukgScopes?: string[] | undefined;
    ukgBaseUrl?: string | undefined;
    updatedAt?: Date | undefined;
    lastSyncAt?: Date | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const TenantQuerySchema: z.ZodEffects<z.ZodObject<{
    active: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    active?: boolean | undefined;
    search?: string | undefined;
}, {
    active?: boolean | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
}>, {
    active: true | undefined;
    limit: number;
    offset: number;
    search?: string | undefined;
}, {
    active?: boolean | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
}>;
export interface TenantConfig {
    id: string;
    name: string;
    description?: string;
    ukgClientId: string;
    ukgClientSecret: string;
    ukgRedirectUri: string;
    ukgScopes: string[];
    ukgBaseUrl: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastSyncAt?: Date;
    metadata?: Record<string, any>;
}
export interface TenantCreate {
    name: string;
    description?: string;
    ukgClientId: string;
    ukgClientSecret: string;
    ukgRedirectUri: string;
    ukgScopes?: string[];
    ukgBaseUrl: string;
    isActive?: boolean;
    metadata?: Record<string, any>;
}
export interface TenantUpdate {
    name?: string;
    description?: string;
    ukgClientId?: string;
    ukgClientSecret?: string;
    ukgRedirectUri?: string;
    ukgScopes?: string[];
    ukgBaseUrl?: string;
    isActive?: boolean;
    metadata?: Record<string, any>;
}
export interface TenantQuery {
    active?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
}
export interface TenantMetadata {
    id: string;
    name: string;
    description?: string;
    ukgRedirectUri: string;
    ukgScopes: string[];
    ukgBaseUrl: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastSyncAt?: Date;
    metadata?: Record<string, any>;
}
export declare class TenantError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code: string, statusCode?: number);
}
export declare class TenantNotFoundError extends TenantError {
    constructor(tenantId: string);
}
export declare class TenantValidationError extends TenantError {
    constructor(message: string);
}
export declare class TenantAlreadyExistsError extends TenantError {
    constructor(tenantName: string);
}
export declare function generateTenantId(): string;
export declare function validateTenantConfig(config: unknown): TenantConfig;
export declare function validateTenantCreate(data: unknown): TenantCreate;
export declare function validateTenantUpdate(data: unknown): TenantUpdate;
export declare function validateTenantQuery(query: unknown): TenantQuery;
export declare function toTenantMetadata(config: TenantConfig): TenantMetadata;
//# sourceMappingURL=tenant.d.ts.map