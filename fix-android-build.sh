#!/bin/bash

# Fix Android build issues script
echo "🔧 Fixing Android build issues..."

# 1. Fix React Navigation issues
echo "⚙️ Fixing React Navigation versions..."
npm uninstall @react-navigation/native
npm install @react-navigation/native@6.1.9 --legacy-peer-deps

# 2. Force Expo versions to be compatible
echo "⚙️ Updating Expo SDK packages for compatibility..."
npm install expo@~49.0.0 --force

# 3. Clear cache
echo "🧹 Clearing cache files..."
rm -rf node_modules/.cache
rm -rf .expo

# 4. Reinstall node modules cleanly
echo "📦 Reinstalling dependencies..."
npm install --legacy-peer-deps

# 5. Update the simple icon
echo "🖼️ Ensuring icon is valid..."
cp assets/images/notification-icon.png assets/images/icon.png

echo "✅ Build fixes applied! Now try:"
echo "eas build -p android --profile preview" 