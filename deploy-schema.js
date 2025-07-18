#!/usr/bin/env node

// Database schema deployment script
const fs = require('fs');
const path = require('path');

async function deploySchema() {
  console.log('🚀 Starting database schema deployment...');
  
  const schemaPath = path.join(__dirname, 'tenant-schema-fixed.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    process.exit(1);
  }
  
  console.log('📄 Schema file found:', schemaPath);
  console.log('📝 Schema deployment instructions:');
  console.log('');
  console.log('1. Connect to your SQL Server: mosaic.database.windows.net');
  console.log('2. Select database: moevocorp');
  console.log('3. Run the contents of: tenant-schema-fixed.sql');
  console.log('');
  console.log('🔧 Alternative: Use Azure Data Studio or SQL Server Management Studio');
  console.log('   - Server: mosaic.database.windows.net');
  console.log('   - Database: moevocorp');
  console.log('   - Authentication: Azure Active Directory');
  console.log('');
  console.log('💡 After deployment, run: npm run test:db to verify the schema');
}

deploySchema().catch(console.error);
