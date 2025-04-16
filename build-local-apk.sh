#!/bin/bash

# Script to build an Android APK locally

echo "🔧 Building APK locally with Gradle..."

# Ensure Android directory exists
if [ ! -d "./android" ]; then
  echo "⚙️ Running prebuild to generate Android project..."
  npx expo prebuild -p android
fi

# Ensure icon is valid
cp assets/images/notification-icon.png assets/images/icon.png

# Build APK with Gradle
cd android
./gradlew assembleDebug

echo "✅ APK Build complete!"
echo "📱 Your APK is available at:"
echo "android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "💡 Install on your device by copying this file to your phone and opening it." 