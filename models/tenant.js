"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantAlreadyExistsError = exports.TenantValidationError = exports.TenantNotFoundError = exports.TenantError = exports.TenantQuerySchema = exports.TenantUpdateSchema = exports.TenantCreateSchema = exports.TenantConfigSchema = void 0;
exports.generateTenantId = generateTenantId;
exports.validateTenantConfig = validateTenantConfig;
exports.validateTenantCreate = validateTenantCreate;
exports.validateTenantUpdate = validateTenantUpdate;
exports.validateTenantQuery = validateTenantQuery;
exports.toTenantMetadata = toTenantMetadata;
const zod_1 = require("zod");
const uuid_1 = require("uuid");
// Zod schemas for validation
exports.TenantConfigSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1, 'Tenant name is required'),
    description: zod_1.z.string().optional(),
    ukgClientId: zod_1.z.string().min(1, 'UKG Client ID is required'),
    ukgClientSecret: zod_1.z.string().min(1, 'UKG Client Secret is required'),
    ukgRedirectUri: zod_1.z.string().url('Valid redirect URI is required'),
    ukgScopes: zod_1.z.array(zod_1.z.string()).default(['read:employee', 'read:company']),
    ukgBaseUrl: zod_1.z.string().url('Valid UKG base URL is required'),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
    lastSyncAt: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.TenantCreateSchema = exports.TenantConfigSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastSyncAt: true
}).transform(data => ({
    ...data,
    description: data.description || undefined
}));
exports.TenantUpdateSchema = exports.TenantConfigSchema.partial().omit({
    id: true,
    createdAt: true
}).transform(data => ({
    ...data,
    name: data.name || undefined,
    description: data.description || undefined
}));
exports.TenantQuerySchema = zod_1.z.object({
    active: zod_1.z.boolean().optional(),
    limit: zod_1.z.number().min(1).max(100).default(50),
    offset: zod_1.z.number().min(0).default(0),
    search: zod_1.z.string().optional()
}).transform(data => ({
    ...data,
    active: data.active || undefined
}));
// Custom error classes
class TenantError extends Error {
    code;
    statusCode;
    constructor(message, code, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'TenantError';
    }
}
exports.TenantError = TenantError;
class TenantNotFoundError extends TenantError {
    constructor(tenantId) {
        super(`Tenant with ID '${tenantId}' not found`, 'TENANT_NOT_FOUND', 404);
    }
}
exports.TenantNotFoundError = TenantNotFoundError;
class TenantValidationError extends TenantError {
    constructor(message) {
        super(message, 'TENANT_VALIDATION_ERROR', 400);
    }
}
exports.TenantValidationError = TenantValidationError;
class TenantAlreadyExistsError extends TenantError {
    constructor(tenantName) {
        super(`Tenant with name '${tenantName}' already exists`, 'TENANT_ALREADY_EXISTS', 409);
    }
}
exports.TenantAlreadyExistsError = TenantAlreadyExistsError;
// Utility functions
function generateTenantId() {
    return (0, uuid_1.v4)();
}
function validateTenantConfig(config) {
    const result = exports.TenantConfigSchema.safeParse(config);
    if (!result.success) {
        throw new TenantValidationError(`Invalid tenant configuration: ${result.error.issues.map(i => i.message).join(', ')}`);
    }
    return result.data;
}
function validateTenantCreate(data) {
    const result = exports.TenantCreateSchema.safeParse(data);
    if (!result.success) {
        throw new TenantValidationError(`Invalid tenant creation data: ${result.error.issues.map(i => i.message).join(', ')}`);
    }
    return result.data;
}
function validateTenantUpdate(data) {
    const result = exports.TenantUpdateSchema.safeParse(data);
    if (!result.success) {
        throw new TenantValidationError(`Invalid tenant update data: ${result.error.issues.map(i => i.message).join(', ')}`);
    }
    return result.data;
}
function validateTenantQuery(query) {
    const result = exports.TenantQuerySchema.safeParse(query);
    if (!result.success) {
        throw new TenantValidationError(`Invalid tenant query: ${result.error.issues.map(i => i.message).join(', ')}`);
    }
    return result.data;
}
function toTenantMetadata(config) {
    return {
        id: config.id,
        name: config.name,
        description: config.description,
        ukgRedirectUri: config.ukgRedirectUri,
        ukgScopes: config.ukgScopes,
        ukgBaseUrl: config.ukgBaseUrl,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        lastSyncAt: config.lastSyncAt,
        metadata: config.metadata
    };
}
//# sourceMappingURL=tenant.js.map