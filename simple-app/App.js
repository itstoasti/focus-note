import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Switch, ScrollView } from 'react-native';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f5f5f5' }]}>
      <View style={styles.section}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Focus Notes</Text>
        
        <View style={styles.option}>
          <Text style={[styles.optionText, { color: isDark ? '#fff' : '#000' }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={setIsDark}
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Settings</Text>
        <View style={styles.settingsContent}>
          <Text style={[styles.settingsText, { color: isDark ? '#ddd' : '#333' }]}>
            App settings would appear here.
          </Text>
        </View>
      </View>
      
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
      <StatusBar style={isDark ? "light" : "dark"} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 8,
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
  settingsContent: {
    marginTop: 8,
  },
  settingsText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
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