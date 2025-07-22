# To enable "Run From Package" mode (requires Git commits)

# Set the function app to run from package
az functionapp config appsettings set \
  --name ukg-sync-backend-5rrqlcuxyzlvy \
  --resource-group mosaicRG01 \
  --settings WEBSITE_RUN_FROM_PACKAGE=1

# This would then require:
# 1. git commit (your changes must be committed)
# 2. git push (if using continuous deployment)
# 3. Package-based deployment methods
