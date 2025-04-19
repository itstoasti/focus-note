import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Separator } from '../../components/Separator';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getNotificationSettings, saveNotificationSettings, DEFAULT_NOTIFICATION_SETTINGS, NotificationSettings } from '../../utils/notificationScheduler';

export default function SettingsScreen() {
  const { isDark, theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const notificationSettings = await getNotificationSettings();
      setSettings(notificationSettings);
      console.log('[SettingsScreen] Loaded settings:', notificationSettings);
    } catch (error) {
        console.error("[SettingsScreen] Error loading settings:", error);
        setSettings(DEFAULT_NOTIFICATION_SETTINGS);
    } finally {
        setLoading(false);
    }
  }

  async function handleSettingsChange(newSettings: Partial<NotificationSettings>) {
    if (!settings) return;

    const updatedSettings = { ...settings, ...newSettings };
    console.log('[SettingsScreen] Updating settings:', updatedSettings);
    setSettings(updatedSettings);
    try {
        await saveNotificationSettings(updatedSettings);
        console.log('[SettingsScreen] Settings saved and daily reminder potentially rescheduled.');
    } catch (error) {
        console.error("[SettingsScreen] Error saving settings:", error);
        Alert.alert("Error", "Failed to save settings.");
    }
  }

  function handleTimeChange(event: any, selectedDate?: Date) {
    if (Platform.OS === 'android') {
        setShowTimePicker(false);
    }
    if (event.type === 'set' && selectedDate && settings) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      if (Platform.OS === 'ios') {
        setShowTimePicker(false);
      }
      handleSettingsChange({ dailyReminderTime: timeString });
    } else if (settings) {
      setShowTimePicker(false);
    }
  }

  function showTimePickerDialog() {
    if (!loading && settings) {
        setShowTimePicker(true);
    }
  }

  const renderSettingRow = (label: string, value: boolean, onValueChange: (newValue: boolean) => void) => (
    <View style={styles.option}>
      <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#767577", true: "#81b0ff" }}
        thumbColor={value ? "#0f8fff" : "#f4f3f4"}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );
  
  if (loading || !settings) {
    return (
      <SafeAreaView 
        style={[styles.safeArea, styles.loadingContainer, { backgroundColor: isDark ? '#121212' : '#f5f5f5' }]}
        edges={['top', 'left', 'right']}
      >
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
      </SafeAreaView>
    );
  }
  
  let timePickerDate = new Date(); 
  try {
    const [hours, minutes] = settings.dailyReminderTime.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      timePickerDate.setHours(hours);
      timePickerDate.setMinutes(minutes);
    }
  } catch (e) {
      console.error("[SettingsScreen] Error parsing dailyReminderTime:", settings.dailyReminderTime, e);
      const [defaultHours, defaultMinutes] = DEFAULT_NOTIFICATION_SETTINGS.dailyReminderTime.split(':').map(Number);
      timePickerDate.setHours(defaultHours);
      timePickerDate.setMinutes(defaultMinutes);
  }
  
  const formattedTime = timePickerDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: isDark ? '#121212' : '#f5f5f5' }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Theme</Text>
          {renderSettingRow('Dark Mode', isDark, (value) => setTheme(value ? 'dark' : 'light'))}
        </View>

        <Separator />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Notifications</Text>
          
          {renderSettingRow(
            'Daily Streak Reminder',
            settings.dailyStreakRemindersEnabled,
            (value) => handleSettingsChange({ dailyStreakRemindersEnabled: value })
          )}

          {settings.dailyStreakRemindersEnabled && (
            <TouchableOpacity 
              style={styles.option} 
              onPress={showTimePickerDialog}
            >
              <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>Reminder Time</Text>
              <Text style={[styles.timeText, { color: isDark ? '#0f8fff' : '#007AFF' }]}>
                {formattedTime}
              </Text>
            </TouchableOpacity>
          )}
          
          {showTimePicker && (
            <DateTimePicker
              value={timePickerDate}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleTimeChange}
            />
          )}

          <Separator style={{ marginVertical: 8 }}/>

          {renderSettingRow(
            'Pomodoro Start/End Alerts',
            settings.pomodoroNotificationsEnabled,
            (value) => handleSettingsChange({ pomodoroNotificationsEnabled: value })
          )}
          
          {renderSettingRow(
            'Streak Milestone Alerts',
            settings.streakMilestoneNotificationsEnabled,
            (value) => handleSettingsChange({ streakMilestoneNotificationsEnabled: value })
          )}
          
          {renderSettingRow(
            'Achievement Unlocks',
            settings.achievementNotificationsEnabled,
            (value) => handleSettingsChange({ achievementNotificationsEnabled: value })
          )}
        </View>

        <Separator />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>About</Text>
          <View style={styles.aboutContent}>
            <Text style={[styles.aboutText, { color: isDark ? '#ddd' : '#333' }]}>
              Stay productive with tasks, pomodoro timers, and streak tracking.
            </Text>
            <Text style={[styles.versionText, { color: isDark ? '#aaa' : '#666' }]}>
              Version 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
  },
  timeText: {
    fontSize: 16,
  },
  aboutContent: {
    marginTop: 8,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 12,
  },
}); 