#!/bin/bash

echo "Building Valor for Digital Ocean deployment..."

# Build the application
npm run build

# Create deployment directory
mkdir -p valor-deploy
mkdir -p valor-deploy/logs

# Copy essential files
cp -r dist/ valor-deploy/
cp package.json valor-deploy/
cp ecosystem.config.js valor-deploy/
cp deploy-setup.md valor-deploy/

# Copy database schema
cp -r shared/ valor-deploy/

# Create production package.json (without dev dependencies)
cat > valor-deploy/package.json << 'EOF'
{
  "name": "valor-ai",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "start": "node index.js",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "better-sqlite3": "^11.10.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cors": "^2.8.5",
    "drizzle-orm": "^0.39.1",
    "express": "^4.21.2",
    "lucide-react": "^0.453.0",
    "multer": "^1.4.5-lts.2",
    "openai": "^4.100.0",
    "pg": "^8.13.1",
    "tailwind-merge": "^2.6.0",
    "ws": "^8.18.2",
    "zod": "^3.24.2"
  }
}
EOF

echo "Valor deployment package created in 'valor-deploy' directory"
echo ""
echo "Next steps for Digital Ocean:"
echo "1. Follow the setup guide in deploy-setup.md"
echo "2. Upload the valor-deploy directory to your server"
echo "3. Run: npm install --production"
echo "4. Set environment variables (OPENAI_API_KEY, DATABASE_URL)"
echo "5. Run: pm2 start ecosystem.config.js"
echo ""
echo "After deployment, camera access will work perfectly!"