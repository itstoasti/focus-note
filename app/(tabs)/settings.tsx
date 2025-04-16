import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Separator } from '../../components/Separator';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getNotificationSettings, saveNotificationSettings, DEFAULT_NOTIFICATION_SETTINGS, NotificationSettings } from '../../utils/notifications';

export default function SettingsScreen() {
  const { isDark, theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const notificationSettings = await getNotificationSettings();
    setSettings(notificationSettings);
  }

  async function handleSettingsChange(newSettings: Partial<NotificationSettings>) {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    await saveNotificationSettings(updatedSettings);
  }

  function handleTimeChange(event: any, selectedDate?: Date) {
    setShowTimePicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      handleSettingsChange({ reminderTime: timeString });
    }
  }

  function showTimePickerDialog() {
    setShowTimePicker(true);
  }

  // Parse the time string (HH:MM) for the time picker
  const timeComponents = settings.reminderTime.split(':');
  const timeDate = new Date();
  timeDate.setHours(parseInt(timeComponents[0], 10));
  timeDate.setMinutes(parseInt(timeComponents[1], 10));

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: isDark ? '#121212' : '#f5f5f5' }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Theme</Text>
          <View style={styles.option}>
            <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>Dark Mode</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
            />
          </View>
        </View>

        <Separator />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Notifications</Text>
          
          <View style={styles.option}>
            <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>Enable Notifications</Text>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => handleSettingsChange({ enabled: value })}
            />
          </View>
          
          {settings.enabled && (
            <>
              <View style={styles.option}>
                <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>Play Sounds</Text>
                <Switch
                  value={settings.soundEnabled}
                  onValueChange={(value) => handleSettingsChange({ soundEnabled: value })}
                />
              </View>
              
              <View style={styles.option}>
                <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>Vibrate</Text>
                <Switch
                  value={settings.vibrationEnabled}
                  onValueChange={(value) => handleSettingsChange({ vibrationEnabled: value })}
                />
              </View>
              
              <View style={styles.option}>
                <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>Task Reminders</Text>
                <Switch
                  value={settings.taskReminders}
                  onValueChange={(value) => handleSettingsChange({ taskReminders: value })}
                />
              </View>
              
              <View style={styles.option}>
                <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>Pomodoro Alerts</Text>
                <Switch
                  value={settings.pomodoroAlerts}
                  onValueChange={(value) => handleSettingsChange({ pomodoroAlerts: value })}
                />
              </View>
              
              <View style={styles.option}>
                <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>Streak Reminders</Text>
                <Switch
                  value={settings.streakReminders}
                  onValueChange={(value) => handleSettingsChange({ streakReminders: value })}
                />
              </View>
              
              <TouchableOpacity 
                style={styles.option}
                onPress={showTimePickerDialog}
              >
                <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>Daily Reminder Time</Text>
                <Text style={[styles.timeText, { color: isDark ? '#0f8fff' : '#007AFF' }]}>
                  {settings.reminderTime}
                </Text>
              </TouchableOpacity>
              
              {showTimePicker && (
                <DateTimePicker
                  value={timeDate}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </>
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