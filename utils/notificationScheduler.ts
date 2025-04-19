import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// --- Notification Settings ---

// Notification settings type
export interface NotificationSettings {
  dailyStreakRemindersEnabled: boolean;
  pomodoroNotificationsEnabled: boolean;
  streakMilestoneNotificationsEnabled: boolean;
  achievementNotificationsEnabled: boolean;
  dailyReminderTime: string; // HH:MM format
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  dailyStreakRemindersEnabled: true,
  pomodoroNotificationsEnabled: true,
  streakMilestoneNotificationsEnabled: true,
  achievementNotificationsEnabled: true,
  dailyReminderTime: '19:00',
};

const NOTIFICATION_SETTINGS_KEY = 'notification_settings_v2';

// Get notification settings
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const settingsJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (settingsJson) {
      const fetchedSettings = JSON.parse(settingsJson);
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...fetchedSettings };
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  } catch (error) {
    console.error("Failed to load notification settings:", error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

// Save notification settings
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    const settingsToSave: NotificationSettings = {
      dailyStreakRemindersEnabled: settings.dailyStreakRemindersEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.dailyStreakRemindersEnabled,
      pomodoroNotificationsEnabled: settings.pomodoroNotificationsEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.pomodoroNotificationsEnabled,
      streakMilestoneNotificationsEnabled: settings.streakMilestoneNotificationsEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.streakMilestoneNotificationsEnabled,
      achievementNotificationsEnabled: settings.achievementNotificationsEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.achievementNotificationsEnabled,
      dailyReminderTime: settings.dailyReminderTime ?? DEFAULT_NOTIFICATION_SETTINGS.dailyReminderTime,
    };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settingsToSave));
    console.log("[saveNotificationSettings] Settings saved:", JSON.stringify(settingsToSave));
    await scheduleDailyStreakReminder(); // Reschedule based on new settings
  } catch (error) {
    console.error("Failed to save notification settings:", error);
  }
}


// --- Notification Scheduling ---

// Private helper to schedule notifications
async function _scheduleNotification(
  identifier: string | null,
  content: Notifications.NotificationContentInput,
  trigger: Notifications.NotificationTriggerInput | null // Allow null trigger for immediate scheduling
): Promise<string> {
  try {
    console.log(`[_scheduleNotification] Scheduling notification ID: ${identifier ?? 'N/A'}`);
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: identifier ?? undefined,
      content,
      trigger,
    });
    console.log(`[_scheduleNotification] Successfully scheduled: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error(`[_scheduleNotification] Error scheduling notification (ID: ${identifier ?? 'N/A'}):`, error);
    const errDetails = error instanceof Error ?
      { name: error.name, message: error.message, stack: error.stack } :
      String(error);
    console.error(`[_scheduleNotification] Error details: ${JSON.stringify(errDetails, null, 2)}`);
    return '';
  }
}

// Schedule Pomodoro Start (Immediate, Silent)
export async function schedulePomodoroStartNotification(taskTitle: string): Promise<string> {
  const settings = await getNotificationSettings();
  if (!settings.pomodoroNotificationsEnabled) {
    console.log('[schedulePomodoroStartNotification] Pomodoro notifications disabled in settings, skipping.');
    return '';
  }
  console.log(`[schedulePomodoroStartNotification] Scheduling immediate start notification for "${taskTitle}"`);
  const content: Notifications.NotificationContentInput = {
    title: 'Pomodoro Started!',
    body: `Focus time for "${taskTitle}" has begun (25 minutes) ⏳.`,
    sound: false,
    priority: Notifications.AndroidNotificationPriority.DEFAULT,
    data: { type: 'pomodoro-start', taskTitle: taskTitle, notificationCategory: 'pomodoro' },
  };
  return await _scheduleNotification(null, content, null);
}

// Schedule Pomodoro End (Scheduled, Sound/Vibrate)
export async function schedulePomodoroEndNotification(endTime: Date, taskTitle: string, taskId: string): Promise<string> {
  const settings = await getNotificationSettings();
  if (!settings.pomodoroNotificationsEnabled) {
    console.log('[schedulePomodoroEndNotification] Pomodoro notifications disabled, skipping.');
    return '';
  }
  const now = new Date();
  const minTimeInFuture = 1000;
  if (endTime.getTime() - now.getTime() < minTimeInFuture) {
    console.warn(`[schedulePomodoroEndNotification] End time too close, adjusting slightly.`);
    endTime = new Date(now.getTime() + minTimeInFuture);
  }
  console.log(`[schedulePomodoroEndNotification] Scheduling END notification for "${taskTitle}" at ${endTime.toISOString()}`);
  let content: Notifications.NotificationContentInput = {
    title: 'Pomodoro Done!',
    body: `Great job on "${taskTitle}"—take a break or keep going! 🎉`,
    priority: Notifications.AndroidNotificationPriority.MAX,
    data: { type: 'pomodoro-end', critical: true, taskId: taskId, taskTitle: taskTitle, notificationCategory: 'pomodoro' },
    sound: 'timer.mp3', // Ensure this file exists in assets/sounds
  };
  if (Platform.OS === 'ios') {
    content = { ...content, /* @ts-ignore */ interruptionLevel: 'critical', sound: 'timer.mp3' };
  } else if (Platform.OS === 'android') {
    content = { ...content, vibrate: [0, 250, 100, 250], sound: 'timer.mp3' };
  }
  const trigger: Notifications.DateTriggerInput = { date: endTime, channelId: 'pomodoro' };
  return await _scheduleNotification(null, content, trigger);
}

// --- Unique ID for the daily streak reminder ---
const DAILY_STREAK_REMINDER_ID = 'daily-streak-reminder-focus-notes';

// Schedule Daily Streak Reminder (Repeating)
export async function scheduleDailyStreakReminder(): Promise<string> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_STREAK_REMINDER_ID);
  console.log(`[scheduleDailyStreakReminder] Canceled any existing reminder with ID: ${DAILY_STREAK_REMINDER_ID}`);
  const settings = await getNotificationSettings();
  if (!settings.dailyStreakRemindersEnabled) {
    console.log('[scheduleDailyStreakReminder] Daily streak reminders disabled, skipping.');
    return '';
  }
  const [hours, minutes] = settings.dailyReminderTime.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.error(`[scheduleDailyStreakReminder] Invalid reminder time format: ${settings.dailyReminderTime}`);
    return '';
  }
  console.log(`[scheduleDailyStreakReminder] Scheduling daily reminder for ${hours}:${minutes < 10 ? '0' : ''}${minutes}`);
  const content: Notifications.NotificationContentInput = {
    title: 'Focus Notes',
    body: 'Don\'t break your streak! Complete a task today 🔥.', // Correctly escaped apostrophe
    sound: 'ping.mp3', // Use gentle ping sound (renamed from notification.mp3)
    data: { type: 'streak-reminder', notificationCategory: 'reminder' },
    ...(Platform.OS === 'android' && { vibrate: [0, 150] }),
  };
  const trigger: Notifications.DailyTriggerInput = { hour: hours, minute: minutes, repeats: true, channelId: 'default' };
  return await _scheduleNotification(DAILY_STREAK_REMINDER_ID, content, trigger);
}

// Schedule Streak Milestone (Immediate)
export async function scheduleStreakMilestoneNotification(streakCount: number): Promise<string> {
  const settings = await getNotificationSettings();
  if (!settings.streakMilestoneNotificationsEnabled) {
    console.log('[scheduleStreakMilestoneNotification] Milestone notifications disabled, skipping.');
    return '';
  }
  if (![7, 14, 30].includes(streakCount)) return '';
  console.log(`[scheduleStreakMilestoneNotification] Scheduling immediate notification for ${streakCount}-day streak`);
  const content: Notifications.NotificationContentInput = {
    title: 'Streak Milestone!',
    body: `Epic! You've hit a ${streakCount}-day streak! Keep it blazing 🔥.`,
    sound: 'task-complete.mp3', // Ensure this file exists
    priority: Notifications.AndroidNotificationPriority.HIGH,
    data: { type: 'streak-milestone', streak: streakCount, notificationCategory: 'celebration' },
    ...(Platform.OS === 'android' && { vibrate: [0, 300, 150, 300] }),
    ...(Platform.OS === 'ios' && { /* @ts-ignore */ interruptionLevel: 'timeSensitive' }),
  };
  return await _scheduleNotification(null, content, null);
}

// Schedule Achievement Unlock (Immediate)
export async function scheduleAchievementUnlockNotification(badgeTitle: string): Promise<string> {
  const settings = await getNotificationSettings();
  if (!settings.achievementNotificationsEnabled) {
    console.log('[scheduleAchievementUnlockNotification] Achievement notifications disabled, skipping.');
    return '';
  }
  console.log(`[scheduleAchievementUnlockNotification] Scheduling immediate notification for achievement: ${badgeTitle}`);
  const content: Notifications.NotificationContentInput = {
    title: 'Achievement Unlocked!',
    body: `Badge earned: ${badgeTitle}! Nice work! 🏅.`,
    sound: 'task-complete.mp3', // Ensure this file exists
    priority: Notifications.AndroidNotificationPriority.HIGH,
    data: { type: 'achievement-unlocked', badge: badgeTitle, notificationCategory: 'celebration' },
    ...(Platform.OS === 'android' && { vibrate: [0, 300, 150, 300] }),
    ...(Platform.OS === 'ios' && { /* @ts-ignore */ interruptionLevel: 'timeSensitive' }),
  };
  return await _scheduleNotification(null, content, null);
}

// Cancel a specific notification
export async function cancelNotification(notificationId: string): Promise<void> {
    if (!notificationId) return;
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log(`[cancelNotification] Canceled notification: ${notificationId}`);
    } catch (error) {
        console.error(`[cancelNotification] Failed to cancel notification ${notificationId}:`, error);
    }
}

// Schedule Task Reminder (Not implemented fully in original code, placeholder)
// You might need Task type here if you implement reminder scheduling based on task details
// import { Task } from '../types/storage'; // Example if needed
export async function scheduleTaskReminder(task: any): Promise<string> {
    console.warn("[scheduleTaskReminder] Task reminder scheduling not implemented yet.");
    // Example structure if you were to implement it:
    // const settings = await getNotificationSettings();
    // if (!settings.taskRemindersEnabled) return ''; // Need a setting for this
    // const reminderTime = new Date(task.dueDate); // Or some reminder offset
    // reminderTime.setMinutes(reminderTime.getMinutes() - 15); // e.g., 15 mins before
    // const content = { title: 'Task Reminder', body: `Task due soon: ${task.title}` };
    // const trigger = { date: reminderTime };
    // return await _scheduleNotification(`task-${task.id}`, content, trigger);
    return '';
}

// Schedule Pomodoro Completion Notification (Not implemented fully in original code, placeholder)
export async function schedulePomodoroCompletionNotification(taskTitle: string, taskId: string): Promise<string> {
    console.warn("[schedulePomodoroCompletionNotification] Pomodoro completion notification scheduling not implemented yet.");
    // This seems similar to schedulePomodoroEndNotification, perhaps consolidate or clarify purpose
    return '';
} 