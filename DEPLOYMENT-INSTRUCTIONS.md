# Digital Ocean Deployment Instructions

## Step 1: Create GitHub Repository
1. Go to GitHub.com and create a new repository
2. Copy the repository URL (example: https://github.com/yourusername/valor-ai.git)

## Step 2: Push Code to GitHub
1. In Replit terminal, run:
```bash
chmod +x deploy-to-github.sh
./deploy-to-github.sh
```
2. When prompted, replace YOUR_GITHUB_REPO_URL with your actual GitHub repository URL

## Step 3: Deploy to Digital Ocean
1. Go to Digital Ocean App Platform
2. Click "Create App"
3. Connect your GitHub repository
4. Set environment variables:
   - `OPENAI_API_KEY`: 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
   - `NODE_ENV`: production
5. Deploy

## App Configuration
- Build Command: `npm run build`
- Run Command: `npm start`
- Port: 5000

Your Valor AI will be live and fully functional!