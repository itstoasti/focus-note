import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorageData, setStorageData, autoEndDay } from '../utils/storage';
import * as Notifications from 'expo-notifications';
import { 
  initializeNotifications, 
  registerForPushNotifications, 
  handleReceivedNotification,
  initAudioSystem,
  preloadSounds
} from '../utils/notifications';
import { scheduleDailyStreakReminder as scheduleStreakReminder } from '../utils/notificationScheduler';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
  isDark: false,
});

// New context for app-wide functionality
interface AppContextType {
  checkDayReset: () => Promise<void>;
  handleNotificationResponse: (response: Notifications.NotificationResponse) => void;
  expoPushToken: string | null;
}

const AppContext = createContext<AppContextType>({
  checkDayReset: async () => {},
  handleNotificationResponse: () => {},
  expoPushToken: null,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    // Schedule day reset check when app is in background/foreground
    checkDayReset();
    
    // Set up intervals to check at midnight and when app is active
    const midnightCheck = setupMidnightCheck();
    const activeCheck = setInterval(checkDayReset, 60 * 1000); // Check every minute when app is active
    
    // Initialize audio system
    initAudioSystem().catch(err => console.error('Audio init error:', err));
    
    // Preload sound files for better performance
    preloadSounds().catch(err => console.error('Sound preloading error:', err));
    
    // Initialize push notifications
    (async () => {
      const token = await registerForPushNotifications();
      setExpoPushToken(token);
      
      // Schedule daily streak reminder
      await scheduleStreakReminder();
    })();
    
    // Initialize notification listeners
    const { unsubscribeReceived, unsubscribeResponse } = initializeNotifications(handleNotificationResponse);
    
    return () => {
      clearInterval(activeCheck);
      if (midnightCheck) clearTimeout(midnightCheck);
      unsubscribeReceived();
      unsubscribeResponse();
    };
  }, []);
  
  // Calculate milliseconds until next midnight
  const getMillisToMidnight = (): number => {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0
    );
    return midnight.getTime() - now.getTime();
  };
  
  // Set up a timeout that will trigger at midnight
  const setupMidnightCheck = () => {
    const msToMidnight = getMillisToMidnight();
    console.log(`[setupMidnightCheck] Scheduling next day reset in ${Math.floor(msToMidnight / 1000 / 60)} minutes`);
    
    return setTimeout(() => {
      console.log('[setupMidnightCheck] It\'s midnight! Running day reset check...');
      checkDayReset();
      // Setup for next day after this runs
      setupMidnightCheck();
    }, msToMidnight);
  };
  
  // Logic to check and process day reset
  const checkDayReset = async (): Promise<void> => {
    try {
      console.log('[checkDayReset] Checking if day needs to be reset');
      const data = await getStorageData();
      
      if (!data || !data.stats.lastEndDay) {
        console.log('[checkDayReset] No previous day data found, skipping reset');
        return;
      }
      
      console.log(`[checkDayReset] Last end day was: ${new Date(data.stats.lastEndDay).toLocaleString()}`);
      console.log(`[checkDayReset] Current streak before reset: ${data.stats.streak}`);
      console.log(`[checkDayReset] Completed tasks: ${data.tasks.filter(t => t.completed).length}`);
      
      const result = await autoEndDay(data);
      
      if (result) {
        console.log('[checkDayReset] Day needs to be reset, saving updated data');
        console.log(`[checkDayReset] New streak will be: ${result.stats.streak} (was: ${data.stats.streak})`);
        
        try {
          await setStorageData(result);
          console.log('[checkDayReset] Day was automatically ended and streak updated successfully');
        } catch (saveError) {
          console.error('[checkDayReset] Failed to save auto-ended day data:', saveError);
        }
      } else {
        console.log('[checkDayReset] No day reset needed');
      }
    } catch (error) {
      console.error('[checkDayReset] Error in automatic day reset:', error);
    }
  };
  
  // Handler for notification responses (when user taps a notification)
  const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
    const { data } = response.notification.request.content;
    console.log('Notification tapped:', data);
    
    // Handle different notification types
    if (data.type === 'task-reminder' && data.taskId) {
      // Navigate to the task - handled by the receiver
    } else if (data.type === 'streak-reminder') {
      // Navigate to tasks screen - handled by the receiver
    }
  };
  
  return (
    <AppContext.Provider value={{ 
      checkDayReset, 
      handleNotificationResponse,
      expoPushToken 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    // Load saved theme preference
    AsyncStorage.getItem('theme').then((savedTheme) => {
      if (savedTheme) {
        setThemeState(savedTheme as Theme);
      }
    });
  }, []);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  const isDark = theme === 'system' 
    ? systemColorScheme === 'dark'
    : theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export const useApp = () => useContext(AppContext); 