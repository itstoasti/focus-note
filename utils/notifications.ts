import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types/storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check if this is a critical notification (like pomodoro completion)
    const isCritical = notification.request.content.data?.critical === true ||
                      notification.request.content.data?.type === 'pomodoro-end';
    
    // Always show alerts for critical notifications
    if (isCritical) {
      console.log('[NotificationHandler] Handling critical notification with high priority');
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }
    
    // Default behavior for regular notifications
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

// Notification types
export type NotificationType = 
  | 'task-reminder'  // For upcoming tasks
  | 'pomodoro-end'   // For pomodoro timer completed
  | 'streak-reminder' // For daily streak reminders
  | 'task-due';      // For tasks that are due soon

// Notification settings type
export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  reminderTime: string; // Time for daily reminders (HH:MM format)
  taskReminders: boolean; // Whether to remind about upcoming tasks
  pomodoroAlerts: boolean; // Whether to alert when pomodoro timer ends
  streakReminders: boolean; // Whether to remind about maintaining streaks
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  reminderTime: '18:00', // Default to 6:00 PM
  taskReminders: true,
  pomodoroAlerts: true,
  streakReminders: true,
};

// Get notification settings from storage or return defaults
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const settingsJson = await AsyncStorage.getItem('notification_settings');
    if (settingsJson) {
      return JSON.parse(settingsJson);
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  } catch (error) {
    console.error("Failed to load notification settings:", error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

// Save notification settings to storage
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save notification settings:", error);
  }
}

// Register for push notifications
export async function registerForPushNotifications(): Promise<string | null> {
  let token = null;
  
  if (Platform.OS === 'android') {
    // Create the default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    
    // Create a dedicated high-priority channel for Pomodoro notifications
    await Notifications.setNotificationChannelAsync('pomodoro', {
      name: 'Pomodoro Timer',
      description: 'High priority notifications for Pomodoro timer completions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 100, 250, 100, 250],
      lightColor: '#FF6B00',
      enableLights: true,
      enableVibrate: true,
      sound: 'timer.mp3', // Use the pomodoro timer sound
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, // Try to bypass Do Not Disturb mode
      showBadge: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: true,
        }
      }
    });
    
    console.log('[registerForPushNotifications] Created notification channels');
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
          provideAppNotificationSettings: true,
          allowProvisional: true,
        },
      });
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    // Get the token that uniquely identifies this device
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Initialize audio system
export async function initAudioSystem(): Promise<void> {
  try {
    // Set up audio mode with minimal configuration that works in Expo Go
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true, 
    });
    
    console.log('Audio system initialized');
  } catch (error) {
    console.error('Failed to initialize audio system:', error);
  }
}

// Cache for preloaded sound objects
const soundCache: Record<string, Audio.Sound> = {};

// Preload sounds for better performance
export async function preloadSounds(): Promise<void> {
  try {
    console.log('[preloadSounds] Starting to preload app sounds');
    
    // Array of sound names to preload
    const soundsToPreload = ['task-complete', 'pomodoro-end', 'notification'];
    
    for (const soundName of soundsToPreload) {
      try {
        let soundFile;
        
        // Map sound name to file
        switch (soundName) {
          case 'task-complete':
            soundFile = require('../assets/sounds/complete.mp3');
            break;
          case 'pomodoro-end':
            soundFile = require('../assets/sounds/timer.mp3');
            break;
          default:
            soundFile = require('../assets/sounds/notification.mp3');
        }
        
        const sound = new Audio.Sound();
        await sound.loadAsync(soundFile);
        soundCache[soundName] = sound;
        console.log(`[preloadSounds] Successfully preloaded: ${soundName}`);
      } catch (error) {
        console.error(`[preloadSounds] Failed to preload sound ${soundName}:`, error);
      }
    }
    
    console.log('[preloadSounds] Finished preloading sounds');
  } catch (error) {
    console.error('[preloadSounds] Error in preloading sounds:', error);
  }
}

// Play a sound (falls back to haptic feedback if sound fails)
export async function playSound(soundName: string): Promise<void> {
  try {
    console.log(`[playSound] Attempting to play sound: ${soundName}`);
    
    // Check for the global flag that blocks notification sounds
    // @ts-ignore - Property may not exist on global
    if (soundName === 'notification' && global._blockNextNotificationSound) {
      console.log(`[playSound] ⚠️ BLOCKING notification sound due to global flag`);
      console.log(`[playSound] This is likely an unwanted notification for a future task`);
      return; // Skip playing the notification sound
    }
    
    // Check if we're in development or production
    const settings = await getNotificationSettings();
    if (!settings.soundEnabled) {
      console.log('[playSound] Sounds are disabled in settings');
      return;
    }
    
    // First attempt to play an actual sound
    try {
      // Try using cached sound if available
      if (soundCache[soundName]) {
        console.log(`[playSound] Using cached sound for: ${soundName}`);
        
        try {
          // Make sure the sound is stopped and rewound first
          const status = await soundCache[soundName].getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              await soundCache[soundName].stopAsync();
            }
            await soundCache[soundName].setPositionAsync(0);
          }
          
          // Set volume and play
          await soundCache[soundName].setVolumeAsync(1.0);
          await soundCache[soundName].playAsync();
          console.log(`[playSound] Successfully played cached sound: ${soundName}`);
          return;
        } catch (cachedSoundError) {
          console.error(`[playSound] Error playing cached sound: ${cachedSoundError}`);
          // If cached sound fails, continue to try loading new sound
        }
      }
      
      // If no cached sound or it failed, create a new sound object
      let soundObject = new Audio.Sound();
      let soundFile;
      
      // Map sound name to file
      switch (soundName) {
        case 'task-complete':
          soundFile = require('../assets/sounds/complete.mp3');
          break;
        case 'pomodoro-end':
          soundFile = require('../assets/sounds/timer.mp3');
          break;
        default:
          soundFile = require('../assets/sounds/notification.mp3');
      }
      
      console.log(`[playSound] Loading sound file for: ${soundName}`);
      
      try {
        await soundObject.loadAsync(soundFile);
        console.log(`[playSound] Sound file loaded successfully for: ${soundName}`);
      } catch (loadError) {
        console.error(`[playSound] ERROR loading sound file: ${loadError}`);
        // Check if there is a file access issue (typically on Android)
        if (Platform.OS === 'android' && loadError instanceof Error && 
            loadError.message.includes('extractors')) {
          console.error('[playSound] Android extractor error detected, falling back to haptics');
          throw loadError;
        }
        throw loadError;
      }
      
      // Set volume
      try {
        await soundObject.setVolumeAsync(1.0);
        console.log(`[playSound] Volume set for: ${soundName}`);
      } catch (volumeError) {
        console.error(`[playSound] ERROR setting volume: ${volumeError}`);
        throw volumeError;
      }
      
      console.log(`[playSound] Playing sound file for: ${soundName}`);
      try {
        const playbackStatus = await soundObject.playAsync();
        console.log(`[playSound] Playback started with status:`, playbackStatus);
      } catch (playError) {
        console.error(`[playSound] ERROR playing sound: ${playError}`);
        throw playError;
      }
      
      // Unload sound after playing
      soundObject.setOnPlaybackStatusUpdate(async (playbackStatus) => {
        if (
          playbackStatus.isLoaded && 
          'didJustFinish' in playbackStatus && 
          playbackStatus.didJustFinish
        ) {
          try {
            await soundObject.unloadAsync();
            console.log(`[playSound] Sound ${soundName} finished and unloaded`);
          } catch (unloadError) {
            console.error(`[playSound] Error unloading sound: ${unloadError}`);
          }
        }
      });
      
      return; // Exit if sound played successfully
    } catch (soundError: unknown) {
      // If sound fails, log the error and fall back to haptic feedback
      console.error(`[playSound] Error playing actual sound file: ${soundError}`);
      console.error(`[playSound] Error type: ${typeof soundError}, name: ${(soundError as Error)?.name || 'unknown'}, message: ${(soundError as Error)?.message || 'no message'}`);
      console.error(`[playSound] Audio state info - Device: ${Device.modelName}, Platform: ${Platform.OS}, Version: ${Platform.Version}`);
      console.log('[playSound] Falling back to haptic feedback');
    }
    
    // Fallback to haptic feedback
    if (soundName === 'task-complete') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (soundName === 'pomodoro-end') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    console.log(`[playSound] Haptic feedback used for ${soundName}`);
  } catch (error: unknown) {
    console.error(`[playSound] CRITICAL ERROR: ${error}`);
    console.error(`[playSound] Stack trace: ${(error as Error)?.stack || 'No stack trace available'}`);
  }
}

// Trigger device vibration
export async function vibrate(): Promise<void> {
  const settings = await getNotificationSettings();
  if (!settings.vibrationEnabled) return;
  
  try {
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
  } catch (error) {
    console.error('Error during vibration:', error);
  }
}

// Schedule a local notification
export async function scheduleNotification(
  title: string,
  body: string,
  trigger: any, // Use any temporarily to bypass type checking until we can fix the format
  type: NotificationType,
  data: any = {}
): Promise<string> {
  try {
    console.log(`[scheduleNotification] Attempting to schedule notification of type: ${type}`);
    console.log(`[scheduleNotification] Title: "${title}", Body: "${body}"`);
    console.log(`[scheduleNotification] Trigger: ${JSON.stringify(trigger, null, 2)}`);
    
    // Check if this is a future task notification with suppressImmediateSound flag
    if (data?.suppressImmediateSound) {
      console.log(`[scheduleNotification] This notification has suppressImmediateSound flag set`);
      // Make sure we delay long enough to avoid the immediate sound
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // EMERGENCY BLOCK: Block any task-reminder notification with "scheduled for" text
    // regardless of any other conditions
    if (type === 'task-reminder' && (body.includes("scheduled for today") || body.includes("scheduled for "))) {
      const now = new Date();
      
      // If there's a date trigger and it's less than 24 hours in the future
      if (trigger?.date) {
        const triggerDate = new Date(trigger.date);
        const timeUntilTrigger = triggerDate.getTime() - now.getTime();
        
        console.log(`[scheduleNotification] Detailed date check for task reminder notification:`);
        console.log(`[scheduleNotification] - Current time: ${now.toISOString()}`);
        console.log(`[scheduleNotification] - Trigger time: ${triggerDate.toISOString()}`);
        console.log(`[scheduleNotification] - Time difference: ${(timeUntilTrigger / (60 * 60 * 1000)).toFixed(2)} hours`);
        
        // Get date-only values (without time) to determine if we're scheduling for a different day
        const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const triggerDateOnly = new Date(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate());
        const isDifferentDay = triggerDateOnly.getTime() > nowDateOnly.getTime();
        
        console.log(`[scheduleNotification] - Today's date: ${nowDateOnly.toISOString().split('T')[0]}`);
        console.log(`[scheduleNotification] - Target date: ${triggerDateOnly.toISOString().split('T')[0]}`);
        console.log(`[scheduleNotification] - Is different day: ${isDifferentDay}`);
        
        // STRICT CHECK: For "scheduled for" messages, we need to ensure:
        // 1. The notification is scheduled for a future day (not today)
        // 2. The notification is not scheduled to be delivered immediately
        
        if (!isDifferentDay || timeUntilTrigger < 60000) { // Either same day OR less than 1 minute in future
          console.log(`[scheduleNotification] EMERGENCY BLOCK: Blocking task reminder notification`);
          console.log(`[scheduleNotification] This appears to be an immediate notification for a future task`);
          console.log(`[scheduleNotification] Task scheduled for ${isDifferentDay ? 'a future day' : 'today'}, ${(timeUntilTrigger / 60000).toFixed(1)} minutes in future`);
          return '';
        }
      } else {
        // If no trigger date at all, definitely block as it would be immediate
        console.log(`[scheduleNotification] EMERGENCY BLOCK: Blocking task reminder notification`);
        console.log(`[scheduleNotification] No trigger date - would be immediate`);
        return '';
      }
    }
    
    // SPECIAL FIX: For any task-reminder notifications, strictly validate date
    if (type === 'task-reminder' && data?.taskId) {
      console.log(`[scheduleNotification] Validating task reminder for task ID: ${data.taskId}`);
      
      // Only allow notifications scheduled for actual date of task
      const now = new Date();
      const triggerDate = trigger?.date ? new Date(trigger.date) : null;
      
      if (triggerDate) {
        // Create new Date objects for comparison to avoid modifying originals
        const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const triggerDay = new Date(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate()).getTime();
        
        console.log(`[scheduleNotification] Task notification date check - Now: ${new Date(nowDay).toISOString().split('T')[0]}, Trigger: ${new Date(triggerDay).toISOString().split('T')[0]}`);
        
        if (triggerDay > nowDay) {
          console.log(`[scheduleNotification] This is a proper future date notification, proceeding`);
          
          // Ensure the notification is not being scheduled for immediate delivery
          // This ensures even for future tasks, no notification is delivered right away
          if (triggerDate.getTime() - now.getTime() < 60000) { // Less than 1 minute in the future
            console.log(`[scheduleNotification] WARNING: Trigger time is very close to current time (${triggerDate.toISOString()}), likely an error`);
            console.log(`[scheduleNotification] Blocking this notification as it would deliver immediately`);
            return '';
          }
        } else if (triggerDay === nowDay) {
          // This is for today, check if it's at least 1 minute in the future
          if (triggerDate.getTime() - now.getTime() < 60000) {
            console.log(`[scheduleNotification] Warning: Notification for today is scheduled for less than 1 minute in the future`);
            // Only block if it contains "scheduled for today" which indicates a future task notification
            if (body.includes("scheduled for today") || body.includes("scheduled for ")) {
              console.log(`[scheduleNotification] Blocking immediate notification that appears to be for a future task`);
              return '';
            }
          }
          console.log(`[scheduleNotification] This is a notification for today, proceeding`);
        } else {
          // Something is wrong with the trigger date - it's in the past
          console.log(`[scheduleNotification] Error: Trigger date appears to be in the past, skipping notification`);
          return '';
        }
      } else {
        console.log(`[scheduleNotification] Warning: No trigger date for task notification`);
        if (body.includes("scheduled for today") || body.includes("scheduled for ")) {
          // This is likely a false immediate notification for a future task
          console.log(`[scheduleNotification] Blocking notification that appears to be for a future task but has no trigger date`);
          return '';
        }
      }
    }
    
    // Check settings first
    try {
      const settings = await getNotificationSettings();
      console.log(`[scheduleNotification] Notification settings: ${JSON.stringify({
        enabled: settings.enabled,
        soundEnabled: settings.soundEnabled,
      }, null, 2)}`);
      
      if (!settings.enabled) {
        console.log('[scheduleNotification] Notifications are disabled in settings, skipping');
        return '';
      }
    } catch (settingsError) {
      console.error('[scheduleNotification] Error getting notification settings:', settingsError);
      // Default to trying to schedule notification if settings can't be retrieved
      console.log('[scheduleNotification] Will attempt to schedule notification despite settings error');
    }

    // Validate trigger date if it exists
    if (trigger && trigger.date) {
      try {
        const triggerDate = new Date(trigger.date);
        const now = new Date();
        
        console.log(`[scheduleNotification] Trigger date: ${triggerDate.toISOString()}`);
        console.log(`[scheduleNotification] Current time: ${now.toISOString()}`);
        
        if (isNaN(triggerDate.getTime())) {
          console.error('[scheduleNotification] Invalid trigger date format');
          return '';
        }
        
        if (triggerDate <= now) {
          console.error('[scheduleNotification] Trigger date is not in the future');
          // Add a small buffer to ensure notification is scheduled
          trigger.date = new Date(now.getTime() + 5000); // 5 seconds in the future
          console.log(`[scheduleNotification] Adjusted trigger date to 5 seconds from now: ${new Date(trigger.date).toISOString()}`);
        }
      } catch (dateError) {
        console.error('[scheduleNotification] Error validating trigger date:', dateError);
        return '';
      }
    }

    // Check for required permissions
    try {
      const { status } = await Notifications.getPermissionsAsync();
      console.log(`[scheduleNotification] Notification permission status: ${status}`);
      
      if (status !== 'granted') {
        console.error('[scheduleNotification] Notification permissions not granted');
        return '';
      }
    } catch (permissionError) {
      console.error('[scheduleNotification] Error checking notification permissions:', permissionError);
    }

    // Include the notification type in the data payload
    try {
      console.log('[scheduleNotification] Scheduling notification...');
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: { ...data, type },
        },
        trigger,
      });
      
      console.log(`[scheduleNotification] Successfully scheduled notification with ID: ${notificationId}`);
      return notificationId;
    } catch (scheduleError) {
      console.error('[scheduleNotification] Error scheduling notification:', scheduleError);
      
      // Get more detailed error information
      const errDetails = scheduleError instanceof Error ? 
        { name: scheduleError.name, message: scheduleError.message, stack: scheduleError.stack } : 
        String(scheduleError);
      console.error(`[scheduleNotification] Error details: ${JSON.stringify(errDetails, null, 2)}`);
      
      // Get device information
      try {
        const device = {
          platform: Platform.OS,
          version: Platform.Version
        };
        console.error(`[scheduleNotification] Device info: ${JSON.stringify(device, null, 2)}`);
      } catch (deviceError) {
        console.error('[scheduleNotification] Could not get device info:', deviceError);
      }
      
      return '';
    }
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error('[scheduleNotification] Unexpected error in scheduleNotification:', error);
    const errDetails = error instanceof Error ? 
      { name: error.name, message: error.message, stack: error.stack } : 
      String(error);
    console.error(`[scheduleNotification] Full error details: ${JSON.stringify(errDetails, null, 2)}`);
    return '';
  }
}

// Cancel a specific notification
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    if (!notificationId) {
      console.log('[cancelNotification] No notification ID provided, skipping cancellation');
      return;
    }
    
    console.log(`[cancelNotification] Attempting to cancel notification ID: ${notificationId}`);
    
    // Check if the notification exists before trying to cancel it
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const notificationExists = scheduledNotifications.some(
        notification => notification.identifier === notificationId
      );
      
      if (!notificationExists) {
        console.log(`[cancelNotification] Notification ID ${notificationId} not found in scheduled notifications`);
        // Still proceed with cancellation attempt in case of caching issues
      } else {
        console.log(`[cancelNotification] Notification ID ${notificationId} found, proceeding with cancellation`);
      }
    } catch (checkError) {
      console.error('[cancelNotification] Error checking if notification exists:', checkError);
      // Continue with cancellation despite error checking
    }
    
    // Perform the actual cancellation
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`[cancelNotification] Successfully cancelled notification ID: ${notificationId}`);
  } catch (error) {
    console.error(`[cancelNotification] Error canceling notification ${notificationId}:`, error);
    
    // Get more detailed error information
    const errDetails = error instanceof Error ? 
      { name: error.name, message: error.message, stack: error.stack } : 
      String(error);
    console.error(`[cancelNotification] Error details: ${JSON.stringify(errDetails, null, 2)}`);
    
    // Log device info
    try {
      const device = {
        platform: Platform.OS,
        version: Platform.Version
      };
      console.error(`[cancelNotification] Device info: ${JSON.stringify(device, null, 2)}`);
    } catch (deviceError) {
      console.error('[cancelNotification] Could not get device info:', deviceError);
    }
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

// Schedule a notification for a task
export async function scheduleTaskReminder(task: Task): Promise<string> {
  try {
    console.log(`[scheduleTaskReminder] Scheduling reminder for task: ${task.id}, Date: ${task.date}, Time: ${task.time}`);
    console.log(`[scheduleTaskReminder] Task details: ${JSON.stringify({
      id: task.id,
      title: task.title,
      date: task.date,
      time: task.time,
      completed: task.completed,
      notificationId: task.notificationId
    }, null, 2)}`);
    
    if (!task.date) {
      console.log('[scheduleTaskReminder] Task has no date, skipping reminder.');
      return '';
    }
    
    try {
      const settings = await getNotificationSettings();
      console.log(`[scheduleTaskReminder] Notification settings: ${JSON.stringify({
        enabled: settings.enabled,
        taskReminders: settings.taskReminders,
        reminderTime: settings.reminderTime
      }, null, 2)}`);
      
      if (!settings.enabled || !settings.taskReminders) {
        console.log('[scheduleTaskReminder] Reminders disabled or task reminders specifically off, skipping.');
        return '';
      }
    } catch (settingsError) {
      console.error('[scheduleTaskReminder] Error getting notification settings:', settingsError);
      // Default to trying to schedule reminder if settings can't be retrieved
      console.log('[scheduleTaskReminder] Will attempt to schedule reminder despite settings error');
    }
    
    // If the task already has a scheduled notification, cancel it first
    if (task.notificationId) {
      console.log(`[scheduleTaskReminder] Cancelling existing notification: ${task.notificationId}`);
      try {
        await cancelNotification(task.notificationId);
        console.log(`[scheduleTaskReminder] Successfully cancelled existing notification: ${task.notificationId}`);
      } catch (cancelError) {
        console.error('[scheduleTaskReminder] Error cancelling existing notification:', cancelError);
        // Continue despite cancellation error
      }
    }
    
    // Create a Date object for the task due date/time
    let taskDueDate: Date;
    try {
      taskDueDate = new Date(task.date);
      console.log(`[scheduleTaskReminder] Parsed taskDueDate: ${taskDueDate.toISOString()}`);
      
      // Check for Invalid Date
      if (isNaN(taskDueDate.getTime())) {
        console.error(`[scheduleTaskReminder] Invalid date format: "${task.date}"`);
        return '';
      }
    } catch (dateError) {
      console.error('[scheduleTaskReminder] Error parsing task date:', dateError);
      console.error(`[scheduleTaskReminder] Raw date value: "${task.date}"`);
      return '';
    }

    const now = new Date();
    console.log(`[scheduleTaskReminder] Current time: ${now.toISOString()}`);
    console.log(`[scheduleTaskReminder] Time difference (ms): ${taskDueDate.getTime() - now.getTime()}`);

    // Calculate if this is a task for a future date (not today)
    // Create new Date objects for comparison to avoid modifying originals
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDateOnly = new Date(taskDueDate.getFullYear(), taskDueDate.getMonth(), taskDueDate.getDate());
    const isFutureDate = taskDateOnly.getTime() > nowDateOnly.getTime();
    
    console.log(`[scheduleTaskReminder] Task date: ${taskDateOnly.toISOString()}, comparing to now: ${nowDateOnly.toISOString()}`);
    console.log(`[scheduleTaskReminder] Is future date: ${isFutureDate}`);
    
    // For any future-dated task, ONLY schedule the reminder for the task day at 9 AM
    if (isFutureDate) {
      console.log('[scheduleTaskReminder] This is a future task. Only scheduling for task day at 9 AM.');
      
      // Set reminder to 9 AM on the task day
      const reminderDate = new Date(taskDateOnly);
      reminderDate.setHours(9, 0, 0, 0); // 9 AM on task day
      
      // To avoid playing any sound at all for future tasks, delay the notification scheduling by a little bit
      // This avoids the notification system thinking it might need to display immediately
      try {
        // Add a small delay before scheduling to prevent system from triggering immediate sound
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Ensure this is at least 2 minutes in the future to avoid any chance of immediate delivery
        if (reminderDate.getTime() - now.getTime() < 120000) { // less than 2 minutes
          console.log('[scheduleTaskReminder] Warning: Calculated reminder time is very close to current time');
          console.log('[scheduleTaskReminder] Adding a buffer to prevent immediate notification');
          // Add at least 2 minutes to the current time
          reminderDate.setTime(now.getTime() + 120000);
        }
        
        console.log(`[scheduleTaskReminder] Scheduling notification for task day: ${reminderDate.toISOString()}`);
        
        // Create a special setting for this call to prevent immediate sound
        const notificationId = await scheduleNotification(
          'Task Reminder',
          `"${task.title}" is scheduled for ${new Date(taskDateOnly).toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}.`,
          { date: reminderDate },
          'task-reminder',
          { taskId: task.id, suppressImmediateSound: true }
        );
        
        console.log(`[scheduleTaskReminder] Successfully scheduled future notification with ID: ${notificationId}`);
        return notificationId;
      } catch (scheduleError) {
        console.error('[scheduleTaskReminder] Error scheduling future notification:', scheduleError);
      return '';
      }
    }

    // Only continue with standard notification scheduling for today's tasks
    let reminderDate: Date;
    let reminderMessage: string;

    // Calculate reminder time based on whether a specific time was set and how far in the future the task is
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const timeUntilTask = taskDueDate.getTime() - now.getTime();
    const daysUntilTask = Math.floor(timeUntilTask / oneDayInMs);
    
    console.log(`[scheduleTaskReminder] Days until task: ${daysUntilTask}`);
    
    if (daysUntilTask > 1) {
      // Task is multiple days away - notify at 9 AM on the day of the task
      reminderDate = new Date(taskDueDate);
      reminderDate.setHours(9, 0, 0, 0);
      reminderMessage = `"${task.title}" is scheduled for ${new Date(taskDueDate).toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}.`;
      console.log(`[scheduleTaskReminder] Task is ${daysUntilTask} days away. Scheduling reminder for 9 AM on task day: ${reminderDate.toISOString()}`);
    } else if (task.time) {
      // Task is today or tomorrow and has a specific time - notify 30 minutes before
      reminderDate = new Date(taskDueDate.getTime() - 30 * 60 * 1000);
      reminderMessage = `"${task.title}" is due in 30 minutes.`;
      console.log(`[scheduleTaskReminder] Task has specific time and is within 1 day. Calculated reminder time (30 min before): ${reminderDate.toISOString()}`);
    } else {
      // Task is today or tomorrow but no specific time - notify at 9 AM
      reminderDate = new Date(taskDueDate);
      reminderDate.setHours(9, 0, 0, 0);
      reminderMessage = `"${task.title}" is scheduled for ${new Date(taskDueDate).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}.`;
      console.log(`[scheduleTaskReminder] Task has no specific time and is within 1 day. Scheduled for 9 AM: ${reminderDate.toISOString()}`);
    }

    // Final check: Ensure the calculated reminder time is at least 2 minutes in the future
    if (reminderDate.getTime() - now.getTime() < 120000) {
      console.log('[scheduleTaskReminder] Calculated reminder time is too close to current time.');
      
      // If less than 2 minutes away, set to 2 minutes from now
      reminderDate = new Date(now.getTime() + 120000);
      console.log(`[scheduleTaskReminder] Adjusted reminder time to 2 minutes from now: ${reminderDate.toISOString()}`);
      
      // If reminder was for less than 5 seconds in the future, it was likely an error
      if (reminderDate.getTime() - now.getTime() < 5000) {
        console.log('[scheduleTaskReminder] Reminder time appears to be in the past or immediate future, skipping.');
      return '';
      }
    }

    console.log(`[scheduleTaskReminder] Final scheduling with trigger date: ${reminderDate.toISOString()}`);
    
    try {
      const notificationId = await scheduleNotification(
        'Task Reminder',
        reminderMessage,
        { date: reminderDate },
        'task-reminder',
        { taskId: task.id }
      );
      
      console.log(`[scheduleTaskReminder] Successfully scheduled notification with ID: ${notificationId}`);
      return notificationId;
    } catch (scheduleError) {
      console.error('[scheduleTaskReminder] Error scheduling notification:', scheduleError);
      const errDetails = scheduleError instanceof Error ? 
        { name: scheduleError.name, message: scheduleError.message, stack: scheduleError.stack } : 
        String(scheduleError);
      console.error(`[scheduleTaskReminder] Error details: ${JSON.stringify(errDetails, null, 2)}`);
      
      // Get device information
      try {
        const device = {
          platform: Platform.OS,
          version: Platform.Version
        };
        console.error(`[scheduleTaskReminder] Device info: ${JSON.stringify(device, null, 2)}`);
      } catch (deviceError) {
        console.error('[scheduleTaskReminder] Could not get device info:', deviceError);
      }
      
      return '';
    }
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error('[scheduleTaskReminder] Unexpected error in scheduleTaskReminder:', error);
    const errDetails = error instanceof Error ? 
      { name: error.name, message: error.message, stack: error.stack } : 
      String(error);
    console.error(`[scheduleTaskReminder] Full error details: ${JSON.stringify(errDetails, null, 2)}`);
    return '';
  }
}

// Schedule a notification for the pomodoro timer start
export async function schedulePomodoroStartNotification(
  endTime: Date,
  taskTitle: string
): Promise<string> {
  const settings = await getNotificationSettings();
  if (!settings.enabled || !settings.pomodoroAlerts) return '';
  
  try {
    const startNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pomodoro Timer Started',
        body: `Your pomodoro session for "${taskTitle}" will end at ${endTime.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}.`,
        sound: false, // No sound for the start notification
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: { 
          type: 'pomodoro-start',
          critical: false
        },
      },
      trigger: null, // Send immediately
    });
    console.log(`[schedulePomodoroStartNotification] Displayed start notification with ID: ${startNotificationId}`);
    return startNotificationId;
  } catch (error) {
    console.error('[schedulePomodoroStartNotification] Error showing notification:', error);
    throw error; // Re-throw to let caller handle it
  }
}

// Schedule a notification for the pomodoro timer end
export async function schedulePomodoroEndNotification(
  endTime: Date,
  taskTitle: string
): Promise<string> {
  const settings = await getNotificationSettings();
  if (!settings.enabled || !settings.pomodoroAlerts) return '';
  
  // Make sure the end time is in the future
  const now = new Date();
  
  // Ensure at least 1 minute in the future
  const minTimeInFuture = 60 * 1000; // 1 minute in milliseconds
  
  if (endTime.getTime() - now.getTime() < minTimeInFuture) {
    console.log(`[schedulePomodoroEndNotification] Warning: Pomodoro end time is too close (${endTime.toISOString()})`);
    // Add at least 1 minute to ensure it's sufficiently in the future
    endTime = new Date(now.getTime() + minTimeInFuture);
    console.log(`[schedulePomodoroEndNotification] Adjusted end time to: ${endTime.toISOString()}`);
  }
  
  console.log(`[schedulePomodoroEndNotification] Scheduling pomodoro notification for ${endTime.toISOString()}`);
  
  try {
    // ONLY show an immediate notification that pomodoro has started
    try {
      const startNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Pomodoro Timer Started',
          body: `Your pomodoro session for "${taskTitle}" will end at ${endTime.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}.`,
          sound: false, // No sound for the start notification
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          data: { 
            type: 'pomodoro-start',
            critical: false
          },
        },
        trigger: null, // Send immediately
      });
      console.log(`[schedulePomodoroEndNotification] Displayed start notification with ID: ${startNotificationId}`);
      
      // Return the start notification ID - we'll handle the completion notification separately
      // when the pomodoro actually ends in the finishPomodoro function
      return startNotificationId;
    } catch (startError) {
      console.error('[schedulePomodoroEndNotification] Failed to show start notification:', startError);
      return '';
    }
  } catch (error) {
    console.error('[schedulePomodoroEndNotification] Error scheduling notification:', error);
    return '';
  }
}

// Schedule an immediate notification for pomodoro completion
export async function schedulePomodoroCompletionNotification(
  taskTitle: string
): Promise<string> {
  const settings = await getNotificationSettings();
  if (!settings.enabled || !settings.pomodoroAlerts) return '';
  
  console.log(`[schedulePomodoroCompletionNotification] Scheduling immediate completion notification`);
  
  try {
    // Prepare content with maximum priority settings for all platforms
    const enhancedContent = {
      title: 'POMODORO COMPLETE!',
      body: `Your pomodoro session for "${taskTitle}" has finished.`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { 
        type: 'pomodoro-end', 
        critical: true,
        autoDismiss: false,
        taskTitle,
        isCompletion: true,
        timestamp: new Date().toISOString()
      },
      autoDismiss: false,
    };
    
    // For iOS, add critical flags
    if (Platform.OS === 'ios') {
      // @ts-ignore - iOS specific properties
      enhancedContent._displayInForeground = true;
      // @ts-ignore
      enhancedContent.categoryIdentifier = 'pomodoro';
      // @ts-ignore
      enhancedContent._criticalVolume = 1.0; // Maximum volume
      // @ts-ignore
      enhancedContent._criticalness = 1; // Maximum critical level
    }
    
    // Create the notification with these enhanced settings
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: enhancedContent,
      trigger: null // Deliver immediately
    });
    
    // Also trigger a sound and vibration directly (belt and suspenders approach)
    try {
      // Set audio to play at max volume even in silent mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });
      
      // Play the sound directly as well
      playSound('pomodoro-end').catch(err => 
        console.error('Error playing direct pomodoro sound:', err)
      );
      
      // For Android, use native vibration pattern
      if (Platform.OS === 'android') {
        try {
          // Use a more aggressive vibration pattern
          Vibration.vibrate([0, 500, 200, 500, 200, 500]);
        } catch (vibErr) {
          console.error('Error with direct vibration:', vibErr);
        }
      }
      
      // Use haptics for additional feedback
      vibrate().catch(err => console.error('Error with haptic vibration:', err));
    } catch (feedbackError) {
      console.error('[schedulePomodoroCompletionNotification] Error with direct feedback:', feedbackError);
    }
    
    console.log(`[schedulePomodoroCompletionNotification] Successfully scheduled immediate notification with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('[schedulePomodoroCompletionNotification] Error scheduling notification:', error);
    return '';
  }
}

// Schedule a daily streak reminder notification
export async function scheduleStreakReminder(): Promise<string> {
  const settings = await getNotificationSettings();
  if (!settings.enabled || !settings.streakReminders) return '';
  
  // Parse the reminder time (HH:MM)
  const [hours, minutes] = settings.reminderTime.split(':').map(Number);
  
  const now = new Date();
  let reminderDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes
  );
  
  // If the time for today has already passed, schedule for tomorrow
  if (reminderDate <= now) {
    reminderDate.setDate(reminderDate.getDate() + 1);
  }
  
  return await scheduleNotification(
    'Don\'t Break Your Streak!',
    'Remember to complete your tasks today to maintain your streak.',
    { date: reminderDate },
    'streak-reminder'
  );
}

// Handler for when a notification is received while the app is in the foreground
export function handleReceivedNotification(
  notification: Notifications.Notification
): void {
  try {
    const data = notification.request.content.data;
    const type = data?.type as NotificationType;
    
    // If we have a suppressImmediateSound flag, don't play sounds
    if (data?.suppressImmediateSound) {
      console.log(`[handleReceivedNotification] Suppressing immediate sound for notification with type: ${type}`);
      return;
    }
    
    if (!type) return;
    
    // For pomodoro notifications, only play sound when they're actually due (not when scheduled)
    if (type === 'pomodoro-end') {
      const trigger = notification.request.trigger;
      // Check if it's a date-based trigger
      if (trigger && 'date' in trigger) {
        const triggerDate = trigger.date;
        // If the trigger date is in the future by more than 10 seconds, this is just the scheduling event
        const now = new Date();
        const triggerTime = new Date(triggerDate).getTime();
        const timeDiff = triggerTime - now.getTime();
        
        if (timeDiff > 10000) { // More than 10 seconds in the future
          console.log(`[handleReceivedNotification] Pomodoro notification scheduled for ${new Date(triggerDate).toLocaleTimeString()}, not playing sound yet`);
          return; // Don't play sound for future-scheduled pomodoro notifications
        }
        
        console.log(`[handleReceivedNotification] Pomodoro time is up! Playing sound.`);
      }
    }
    
    // Ensure audio session is active and can play in silent mode
    if (type === 'pomodoro-end') {
      try {
        // Temporarily set audio mode to play even in silent (iOS)
        if (Platform.OS === 'ios') {
          Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
          }).catch(err => console.error('Error setting audio mode:', err));
        }
      } catch (error) {
        console.error('Error configuring audio for critical notification:', error);
      }
    }
    
    // Play the appropriate sound based on notification type
    switch (type) {
      case 'pomodoro-end':
        playSound('pomodoro-end').catch(err => console.error('Error playing pomodoro sound:', err));
        break;
      case 'task-reminder':
      case 'task-due':
        playSound('notification').catch(err => console.error('Error playing notification sound:', err));
        break;
      case 'streak-reminder':
        playSound('task-complete').catch(err => console.error('Error playing streak reminder sound:', err));
        break;
      default:
        break;
    }
    
    // Vibrate the device
    vibrate().catch(err => console.error('Error with vibration:', err));
  } catch (error) {
    console.error('Error handling notification:', error);
  }
}

// Initialize notification listeners
export function initializeNotifications(
  handleNotificationResponse: (response: Notifications.NotificationResponse) => void
): { unsubscribeReceived: () => void; unsubscribeResponse: () => void } {
  // Listener for notifications received while the app is in the foreground
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    handleReceivedNotification
  );
  
  // Listener for user interactions with notifications
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse
  );
  
  return {
    unsubscribeReceived: () => receivedSubscription.remove(),
    unsubscribeResponse: () => responseSubscription.remove(),
  };
} 