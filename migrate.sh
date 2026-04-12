# Remove the root config files that enforce pnpm workspaces
rm -f package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json

# Move frontend code to the root
# shopt -s dotglob helps move hidden files too
shopt -s dotglob
mv artifacts/greenlims-ksa/* . 2>/dev/null
shopt -u dotglob

# Fix the package.json to remove workspace dependencies
sed -i.bak '/"@workspace\//d' package.json
sed -i.bak 's/"name": "@workspace\/greenlims-ksa"/"name": "greenlims-ksa"/' package.json
rm -f package.json.bak

# Also edit vite.config.ts if it imports something workspace specific
# (Usually Replit doesn't put workspace imports in vite.config.ts but just in case)

# Backup the remaining folders
mv artifacts .backup_artifacts
mv lib .backup_lib
mv scripts .backup_scripts

echo "Migration completed."
