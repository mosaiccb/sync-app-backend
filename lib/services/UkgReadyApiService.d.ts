import { InvocationContext } from '@azure/functions';
interface UkgReadyConfig {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    companyShortName: string;
}
interface UkgReadyEmployeePayload {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    personalEmail?: string;
    homePhone?: string;
    hireDate: string;
    terminationDate?: string;
    jobTitle?: string;
    department?: string;
    location?: string;
    payRate?: number;
    isActive: boolean;
    ssn?: string;
    birthDate?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
    };
}
interface UkgReadyApiResponse {
    success: boolean;
    employeeId?: string;
    errors?: string[];
    warnings?: string[];
}
interface UkgReadyBatchResponse {
    totalProcessed: number;
    successful: number;
    failed: number;
    results: UkgReadyApiResponse[];
    errors: string[];
}
/**
 * UKG Ready API Service
 * Handles authentication and employee data operations with UKG Ready
 */
export declare class UkgReadyApiService {
    private config;
    private accessToken;
    private tokenExpiry;
    private context;
    constructor(config: UkgReadyConfig, context: InvocationContext);
    /**
     * Authenticate with UKG Ready API
     */
    authenticate(): Promise<void>;
    /**
     * Ensure we have a valid access token
     */
    private ensureValidToken;
    /**
     * Create or update a single employee in UKG Ready
     */
    createOrUpdateEmployee(employee: UkgReadyEmployeePayload): Promise<UkgReadyApiResponse>;
    /**
     * Batch create/update employees in UKG Ready
     */
    batchCreateOrUpdateEmployees(employees: UkgReadyEmployeePayload[]): Promise<UkgReadyBatchResponse>;
    /**
     * Test UKG Ready API connection
     */
    testConnection(): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
    /**
     * Get employee count from UKG Ready (for validation)
     */
    getEmployeeCount(): Promise<number>;
}
export { UkgReadyConfig, UkgReadyEmployeePayload, UkgReadyApiResponse, UkgReadyBatchResponse };
//# sourceMappingURL=UkgReadyApiService.d.ts.map