import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { ThemeProvider, AppProvider } from '../context/ThemeContext';
import { initAudioSystem, preloadSounds, registerForPushNotifications, initializeNotifications } from '../utils/notifications';
import { scheduleDailyStreakReminder } from '../utils/notificationScheduler';
import * as Notifications from 'expo-notifications';

// Simple flag to prevent multiple initializations during HMR/Fast Refresh
let appInitialized = false;

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Initialize essential systems on startup
    async function initializeApp() {
      // Check the flag
      if (appInitialized) {
         console.log('[_layout] App already initialized, skipping re-initialization.');
         return;
      }
      appInitialized = true; // Set the flag

      try {
        console.log('[_layout] Initializing App...');
        // 1. Initialize Audio
        await initAudioSystem();
        // 2. Preload sounds (fire and forget)
        preloadSounds(); 
        // 3. Register for notifications (requests permissions)
        await registerForPushNotifications();
        // 4. Schedule the daily streak reminder based on current settings
        await scheduleDailyStreakReminder(); 
        console.log('[_layout] App Initialization complete.');
      } catch (error) {
        console.error('[_layout] CRITICAL ERROR during app initialization:', error);
        // Consider resetting the flag if init fails and needs to retry?
        // appInitialized = false; 
      }
    }

    initializeApp();

    // --- Notification Interaction Handling --- 
    // This handles what happens when a user taps on a notification
    const notificationInteractionSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[_layout] Notification tapped:', response.notification.request.content.data);
      const data = response.notification.request.content.data;
      // Example: Navigate to tasks screen if it's a streak reminder
      if (data?.type === 'streak-reminder') {
        router.push('/(tabs)'); // Navigate to the main task screen (adjust path if needed)
      }
      // Add other navigation logic based on notification type (e.g., Pomodoro end, Achievement)
    });

    // Cleanup listeners on component unmount
    return () => {
      notificationInteractionSubscription.remove();
    };
    // --- End Notification Interaction Handling --- 

  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <AppProvider>
      <ThemeProvider>
        <Slot />
      </ThemeProvider>
    </AppProvider>
  );
}
