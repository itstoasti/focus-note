#!/bin/bash

# Create a simple, guaranteed-to-work icon
# We'll use a pre-made simple icon from the internet

# Create directory structure if it doesn't exist
mkdir -p assets/images

# Download a simple, reliable icon from a CDN
curl -s -o assets/images/icon.png "https://cdn-icons-png.flaticon.com/512/1946/1946488.png"

# Check if download was successful
if [ ! -s assets/images/icon.png ]; then
  # Fallback to another icon if first one fails
  curl -s -o assets/images/icon.png "https://cdn-icons-png.flaticon.com/512/4436/4436481.png"
fi

# Verify file exists and has content
if [ -s assets/images/icon.png ]; then
  echo "✅ Icon successfully downloaded and saved to assets/images/icon.png"
  echo "Now run: eas build -p android --profile preview"
else
  echo "❌ Failed to download icon"
fi 