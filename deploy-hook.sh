#!/bin/bash

# Git post-receive hook for automatic deployment
# Place this file in: /home/yourusername/repositories/yourapp.git/hooks/post-receive
# Make it executable: chmod +x post-receive

# Configuration
REPO_DIR="/home/yourusername/repositories/yourapp.git"
WORK_TREE="/home/yourusername/temp-build"
PUBLIC_WWW="/home/yourusername/public_html"

echo "===== Starting Deployment ====="

# Create temporary working directory if it doesn't exist
mkdir -p $WORK_TREE

# Checkout latest code to temporary directory
echo "Checking out latest code..."
git --work-tree=$WORK_TREE --git-dir=$REPO_DIR checkout -f

# Navigate to working directory
cd $WORK_TREE

# Install dependencies
echo "Installing dependencies..."
npm ci --production=false

# Build the project
echo "Building project..."
npm run build

# Copy built files to public directory
echo "Deploying to public_html..."
rm -rf $PUBLIC_WWW/*
cp -r dist/* $PUBLIC_WWW/

# Clean up temporary directory
echo "Cleaning up..."
rm -rf $WORK_TREE

echo "===== Deployment Complete ====="
echo "Your app is now live!"
