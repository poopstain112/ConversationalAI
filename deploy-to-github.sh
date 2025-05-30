#!/bin/bash

# Create a fresh Git repository for Valor
echo "Setting up fresh Git repository for Digital Ocean deployment..."

# Remove existing Git files
rm -rf .git

# Initialize new repository
git init
git add .
git commit -m "Initial Valor AI deployment"

# Add your GitHub repository as origin
# Replace YOUR_GITHUB_REPO_URL with your actual repository URL
git remote add origin YOUR_GITHUB_REPO_URL

# Push to GitHub
git push -u origin main --force

echo "Repository pushed to GitHub. Now connect Digital Ocean App Platform to this repository."