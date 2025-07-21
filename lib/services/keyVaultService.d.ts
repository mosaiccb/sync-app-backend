export declare class KeyVaultService {
    private client;
    private keyVaultUrl;
    constructor();
    /**
     * Store a secret in Key Vault
     */
    setSecret(name: string, value: string, contentType?: string): Promise<void>;
    /**
     * Retrieve a secret from Key Vault
     */
    getSecret(name: string): Promise<string | null>;
    /**
     * Delete a secret from Key Vault
     */
    deleteSecret(name: string): Promise<boolean>;
    /**
     * Store third-party API credentials securely
     */
    storeThirdPartyAPICredentials(secretName: string, credentials: any): Promise<void>;
    /**
     * Retrieve third-party API credentials
     */
    getThirdPartyAPICredentials(secretName: string): Promise<any | null>;
    /**
     * Generate a unique secret name for third-party API
     */
    static generateSecretName(tenantId: string, provider: string, timestamp?: number): string;
}
//# sourceMappingURL=keyVaultService.d.ts.map