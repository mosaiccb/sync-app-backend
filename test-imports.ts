// Test file to verify imports work
import { ThirdPartyAPIDatabase } from './src/services/ThirdPartyAPIDatabase';
import { TenantDatabaseService } from './src/services/TenantDatabaseService';

console.log('ThirdPartyAPIDatabase:', typeof ThirdPartyAPIDatabase);
console.log('TenantDatabaseService:', typeof TenantDatabaseService);

const db = new ThirdPartyAPIDatabase();
const tenant = new TenantDatabaseService();

console.log('Both imports work!');
