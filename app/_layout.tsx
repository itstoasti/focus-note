import React from 'react';
import { Slot } from 'expo-router';
import { ThemeProvider, AppProvider } from '../context/ThemeContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider>
        <Slot />
      </ThemeProvider>
    </AppProvider>
  );
}
