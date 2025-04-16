#!/bin/bash

# Script to build APK directly with Gradle

# Set Java PATH
export PATH="/usr/local/opt/openjdk@17/bin:$PATH"

echo "🔧 Building APK directly with Gradle..."

# Make sure Android directory exists
if [ ! -d "android" ]; then
  echo "❌ Android directory not found!"
  exit 1
fi

# Go to the Android directory
cd android

# Check if gradlew exists
if [ ! -f "gradlew" ]; then
  echo "❌ gradlew not found!"
  exit 1
fi

# Make gradlew executable
chmod +x gradlew

# Clean the project
./gradlew clean

# Build the release APK
./gradlew assembleRelease

# Check if build succeeded
if [ $? -eq 0 ]; then
  echo "✅ APK built successfully!"
  echo "📱 Your APK is available at:"
  echo "android/app/build/outputs/apk/release/app-release.apk"
  
  # Copy APK to root directory for easier access
  cp app/build/outputs/apk/release/app-release.apk ../focus-notes.apk
  echo "📱 Also copied to: focus-notes.apk in the root directory"
else
  echo "❌ APK build failed"
  exit 1
fi 