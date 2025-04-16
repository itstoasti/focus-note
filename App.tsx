import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ExpoRoot } from 'expo-router';
import { View, Text } from 'react-native';
import { enableScreens } from 'react-native-screens';

// Enable screens
enableScreens();

// Standalone app component with minimal dependencies
export default function App() {
  try {
    console.log('Starting app...');
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ExpoRoot context={require.context('./app')} />
        </View>
      </GestureHandlerRootView>
    );
  } catch (error) {
    console.error('App error:', error);
    // Fallback error display
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', textAlign: 'center', margin: 20 }}>
          Error initializing app: {error.message}
        </Text>
      </View>
    );
  }
} 