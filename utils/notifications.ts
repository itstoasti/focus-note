import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isCritical = notification.request.content.data?.critical === true ||
                      notification.request.content.data?.type === 'pomodoro-end';
    if (isCritical) {
      console.log('[NotificationHandler] Handling critical notification with high priority');
      return {
        shouldShowAlert: true,
        shouldPlaySound: true, // Sound should be defined in the notification content
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true, // Sound should be defined in the notification content
      shouldSetBadge: true,
    };
  },
});

// Register for push notifications
export async function registerForPushNotifications(): Promise<string | null> {
  let token = null;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      // Sound should be set per-notification, not on channel for flexibility
    });
    await Notifications.setNotificationChannelAsync('pomodoro', {
      name: 'Pomodoro Timer',
      description: 'High priority notifications for Pomodoro timer completions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 100, 250, 100, 250],
      lightColor: '#FF6B00',
      enableLights: true,
      enableVibrate: true,
      // Set specific sound for pomodoro channel if desired, but often better per-notification
      // sound: 'timer.mp3', 
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, 
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
          allowCriticalAlerts: true, // Ensure critical alerts are allowed if needed
          provideAppNotificationSettings: true,
          allowProvisional: true, // Allows notifications silently until user opts-in
        },
      });
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }
  return token;
}

// Initialize audio system
export async function initAudioSystem(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true, 
      // interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX, // Consider if needed
      // interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX, // Consider if needed
    });
    console.log('Audio system initialized');
  } catch (error) {
    console.error('Failed to initialize audio system:', error);
  }
}

// Cache for preloaded sound objects
const soundCache: Record<string, Audio.Sound> = {};

// Preload sounds for better performance - RESTORED (was simplified for debug)
export async function preloadSounds(): Promise<void> {
  try {
    console.log('[preloadSounds] Starting to preload app sounds');
    const soundsToPreload = ['task-complete', 'pomodoro-end', 'notification'];
    for (const soundName of soundsToPreload) {
      let soundFile; 
      try {
        switch (soundName) {
          case 'task-complete':
            soundFile = require('../assets/sounds/task-complete.mp3'); // Use original name
            break;
          case 'pomodoro-end':
            soundFile = require('../assets/sounds/timer.mp3');
            break;
          case 'notification': 
            soundFile = require('../assets/sounds/ping.mp3'); // Use renamed file
            break;
          default:
            console.warn(`[preloadSounds] Unknown sound name: ${soundName}, defaulting to notification sound.`);
            soundFile = require('../assets/sounds/ping.mp3');
        }
        if (soundFile === undefined) {
           console.error(`[preloadSounds] REQUIRE evaluated to undefined for sound: ${soundName}`);
           continue; 
        }
      } catch (requireError) {
        console.error(`[preloadSounds] Error during REQUIRE for sound ${soundName}:`, requireError);
        continue; 
      }
      try {
        const sound = new Audio.Sound();
        await sound.loadAsync(soundFile);
        soundCache[soundName] = sound;
        console.log(`[preloadSounds] Successfully preloaded: ${soundName}`);
      } catch (error) {
        console.error(`[preloadSounds] Failed to LOAD sound ${soundName} using expo-av:`, error);
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
    // @ts-ignore
    if (soundName === 'notification' && global._blockNextNotificationSound) {
      console.log(`[playSound] ⚠️ BLOCKING notification sound due to global flag`);
      return;
    }
    try {
      if (soundCache[soundName]) {
        console.log(`[playSound] Using cached sound for: ${soundName}`);
        try {
          const status = await soundCache[soundName].getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              await soundCache[soundName].stopAsync();
            }
            await soundCache[soundName].setPositionAsync(0);
          }
          await soundCache[soundName].setVolumeAsync(1.0);
          await soundCache[soundName].playAsync();
          console.log(`[playSound] Successfully played cached sound: ${soundName}`);
          return;
        } catch (cachedSoundError) {
          console.error(`[playSound] Error playing cached sound: ${cachedSoundError}`);
        }
      }
      
      let soundObject = new Audio.Sound();
      let soundFile;
      switch (soundName) {
        case 'task-complete':
          soundFile = require('../assets/sounds/task-complete.mp3'); // Use original name
          break;
        case 'pomodoro-end':
          soundFile = require('../assets/sounds/timer.mp3');
          break;
        case 'notification': 
           soundFile = require('../assets/sounds/ping.mp3'); // Use renamed file
           break;
         default:
            console.warn(`[playSound] Unknown sound name: ${soundName}, defaulting to notification sound.`);
            soundFile = require('../assets/sounds/ping.mp3');
       }
       if (!soundFile) {
          console.error(`[playSound] Require resulted in undefined for: ${soundName}. Falling back to haptics.`);
          throw new Error(`Sound asset require failed for ${soundName}`);
        }
      
      console.log(`[playSound] Loading sound file for: ${soundName}`);
      try {
        await soundObject.loadAsync(soundFile);
        console.log(`[playSound] Sound file loaded successfully for: ${soundName}`);
      } catch (loadError) {
        console.error(`[playSound] ERROR loading sound file: ${loadError}`);
        if (Platform.OS === 'android' && loadError instanceof Error && 
            loadError.message.includes('extractors')) {
          console.error('[playSound] Android extractor error detected, falling back to haptics');
          throw loadError;
        }
        throw loadError;
      }
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
      soundObject.setOnPlaybackStatusUpdate(async (playbackStatus) => {
        if (playbackStatus.isLoaded && 'didJustFinish' in playbackStatus && playbackStatus.didJustFinish) {
          try {
            await soundObject.unloadAsync();
            console.log(`[playSound] Sound ${soundName} finished and unloaded`);
          } catch (unloadError) {
            console.error(`[playSound] Error unloading sound: ${unloadError}`);
          }
        }
      });
      return;
    } catch (soundError: unknown) {
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

// Trigger device vibration - kept for potential direct use, but rely on notification settings primarily
export async function vibrate(category: 'reminder' | 'pomodoro' | 'celebration' = 'reminder'): Promise<void> {
  // try {
  //   let feedbackType = Haptics.NotificationFeedbackType.Success;
  //   if (category === 'pomodoro') feedbackType = Haptics.NotificationFeedbackType.Warning;
  //   else if (category === 'celebration') feedbackType = Haptics.NotificationFeedbackType.Success;
  //   await Haptics.notificationAsync(feedbackType);
  // } catch (error) {
  //   console.error('Error during haptic feedback:', error);
  // }
}

// Handler for when a notification is received while the app is in the foreground
export function handleReceivedNotification(notification: Notifications.Notification): void {
  console.log('[handleReceivedNotification] Received notification in foreground: ID', notification.request.identifier);
  // Rely on OS and notification content for sound/vibration
  // Add app state changes here if needed based on foreground notification
}

// Initialize notification listeners
export function initializeNotifications(
  handleNotificationResponse: (response: Notifications.NotificationResponse) => void
): { unsubscribeReceived: () => void; unsubscribeResponse: () => void } {
  const receivedSubscription = Notifications.addNotificationReceivedListener(handleReceivedNotification);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
  return {
    unsubscribeReceived: () => receivedSubscription.remove(),
    unsubscribeResponse: () => responseSubscription.remove(),
  };
} 