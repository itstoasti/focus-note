import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stats as StatsType } from '../types/storage';
import { useTheme } from '../context/ThemeContext';
import { getLevelTitle } from '../utils/storage';

interface StatsProps {
  stats: StatsType;
}

export function Stats({ stats }: StatsProps) {
  const { isDark } = useTheme();
  
  // Explicitly extract freezeTokens to ensure we're not missing it
  const { 
    streak = 0, 
    freezeTokens = 0, 
    xp = 0, 
    pomodoroXp = 0, 
    level = 1, 
    badges = [] 
  } = stats || {};
  
  console.log('Stats component - received stats:', { 
    streak, 
    freezeTokens, 
    xp, 
    level 
  });
  
  const levelTitle = getLevelTitle(level);
  
  // Calculate the next level XP target based on current level
  const getNextLevelXp = (currentLevel: number): number => {
    switch (currentLevel) {
      case 1: return 100;
      case 2: return 250;
      case 3: return 500;
      case 4: return 1000;
      case 5: return 2000;
      case 6: return 3000;
      case 7: return 5000;
      case 8: return 7500;
      case 9: return 10000;
      case 10: return 10000; // Max level
      default: return 100;
    }
  };
  
  const nextLevelXp = getNextLevelXp(level);

  return (
    <View style={[styles.container, { 
      backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
      borderColor: isDark ? '#1A1A1A' : '#E2E8F0',
    }]}>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>Streak</Text>
          <Text style={[styles.value, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
            {streak} {streak >= 3 ? '🔥' : ''}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: isDark ? '#444444' : '#E2E8F0' }]} />
        <View style={styles.stat}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>Freeze Tokens</Text>
          <Text style={[styles.value, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>{freezeTokens} ❄️</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>Level {level}</Text>
          <Text style={[styles.value, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>{levelTitle}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: isDark ? '#444444' : '#E2E8F0' }]} />
        <View style={styles.stat}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>XP Progress</Text>
          <Text style={[styles.value, { color: '#FF6B00' }]}>
            {xp}/{nextLevelXp}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>Task XP</Text>
          <Text style={[styles.value, { color: '#FF6B00' }]}>{xp - pomodoroXp}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: isDark ? '#444444' : '#E2E8F0' }]} />
        <View style={styles.stat}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>Pomodoro XP</Text>
          <Text style={[styles.value, { color: '#FF6B00' }]}>{stats.totalPomodoros * 5}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
  }
});