#!/bin/bash

# Alternative method to grant database access using Azure CLI
# This creates the managed identity user and grants permissions

echo "Setting up managed identity database access for Function App..."

# Get the function app's managed identity object ID
FUNCTION_APP_OBJECT_ID="09ae11ce-827e-4e32-8c09-77e6c0ff441b"
FUNCTION_APP_NAME="ukg-sync-backend-5rrqlcuxyzlvy"

echo "Function App Object ID: $FUNCTION_APP_OBJECT_ID"
echo "Function App Name: $FUNCTION_APP_NAME"

# Note: You'll still need to run the SQL commands in the database
# This script is for reference - the SQL script above is the primary method

echo "Next steps:"
echo "1. Connect to the 'moevocorp' database using Azure AD authentication"
echo "2. Run the SQL script: grant-managed-identity-access.sql"
echo "3. Verify the managed identity user was created"

# Test connection after setup
echo "After running the SQL script, test with:"
echo "curl 'https://ukg-sync-backend-5rrqlcuxyzlvy.azurewebsites.net/api/health'"
