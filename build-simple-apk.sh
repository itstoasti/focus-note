#!/bin/bash

# Script to build a simplified standalone app

echo "🔧 Setting up simplified app build..."

# Create directory for simplified app
mkdir -p simple-app
cd simple-app

# Copy icon
mkdir -p assets/images
cp ../assets/images/notification-icon.png assets/images/icon.png

# Copy simplified files
cp ../App.js .
cp ../app.json.simple app.json
cp ../package.json.simple package.json
cp ../babel.config.js .

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build app
echo "🏗️ Building app..."
npx eas build -p android --profile preview --non-interactive

echo "✅ Build started! Check the link above for your APK."
echo "⌛ This will take approximately 15 minutes." 