// Migration script to move existing Key Vault tenant data to new SQL schema
const { TenantDatabaseService } = require('./lib/services/TenantDatabaseService');

async function migrateTenantData() {
  console.log('🔄 Starting tenant data migration...');
  
  const tenantService = new TenantDatabaseService();
  
  // Example legacy tenant data - replace with actual data from your old system
  const legacyTenants = [
    {
      tenantName: 'Example Corp',
      companyId: 'EXAMPLE001',
      baseUrl: 'https://example.api.ukg.com',
      clientId: 'example-client-id',
      clientSecret: 'example-client-secret',
      description: 'Example tenant for testing'
    }
    // Add more tenants as needed
  ];
  
  try {
    let migratedCount = 0;
    
    for (const tenant of legacyTenants) {
      console.log(`📝 Migrating tenant: ${tenant.tenantName}`);
      
      try {
        const tenantId = await tenantService.createTenant({
          tenantName: tenant.tenantName,
          companyId: tenant.companyId,
          baseUrl: tenant.baseUrl,
          clientId: tenant.clientId,
          clientSecret: tenant.clientSecret,
          description: tenant.description
        });
        
        console.log(`✅ Successfully migrated tenant ${tenant.tenantName} with ID: ${tenantId}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate tenant ${tenant.tenantName}:`, error);
      }
    }
    
    console.log(`🎉 Migration completed! Successfully migrated ${migratedCount} of ${legacyTenants.length} tenants.`);
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    const allTenants = await tenantService.getAllTenants();
    console.log(`📊 Total tenants in database: ${allTenants.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateTenantData().catch(console.error);
