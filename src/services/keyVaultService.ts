import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export class KeyVaultService {
  private client: SecretClient;
  private keyVaultUrl: string;

  constructor() {
    this.keyVaultUrl = process.env.AZURE_KEY_VAULT_URL || '';
    if (!this.keyVaultUrl) {
      throw new Error('AZURE_KEY_VAULT_URL environment variable is required');
    }

    // Use Managed Identity for authentication in Azure
    const credential = new DefaultAzureCredential();
    this.client = new SecretClient(this.keyVaultUrl, credential);
  }

  /**
   * Store a secret in Key Vault
   */
  async setSecret(name: string, value: string, contentType?: string): Promise<void> {
    try {
      await this.client.setSecret(name, value, {
        contentType: contentType || 'application/json'
      });
    } catch (error) {
      throw new Error(`Failed to store secret in Key Vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve a secret from Key Vault
   */
  async getSecret(name: string): Promise<string | null> {
    try {
      const secret = await this.client.getSecret(name);
      return secret.value || null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null; // Secret not found
      }
      throw new Error(`Failed to retrieve secret from Key Vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a secret from Key Vault
   */
  async deleteSecret(name: string): Promise<boolean> {
    try {
      await this.client.beginDeleteSecret(name);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return false; // Secret not found
      }
      throw new Error(`Failed to delete secret from Key Vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store third-party API credentials securely
   */
  async storeThirdPartyAPICredentials(secretName: string, credentials: any): Promise<void> {
    const credentialsJson = JSON.stringify(credentials);
    await this.setSecret(secretName, credentialsJson, 'third-party-api-credentials');
  }

  /**
   * Retrieve third-party API credentials
   */
  async getThirdPartyAPICredentials(secretName: string): Promise<any | null> {
    const credentialsJson = await this.getSecret(secretName);
    if (!credentialsJson) {
      return null;
    }
    
    try {
      return JSON.parse(credentialsJson);
    } catch (error) {
      throw new Error(`Failed to parse third-party API credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a unique secret name for third-party API
   */
  static generateSecretName(tenantId: string, provider: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    const sanitizedProvider = provider.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `third-party-api-${tenantId}-${sanitizedProvider}-${ts}`;
  }
}
