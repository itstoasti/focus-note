import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function Separator() {
  const { isDark } = useTheme();
  
  return (
    <View 
      style={[
        styles.separator, 
        { backgroundColor: isDark ? '#333' : '#e0e0e0' }
      ]} 
    />
  );
}

const styles = StyleSheet.create({
  separator: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
}); 