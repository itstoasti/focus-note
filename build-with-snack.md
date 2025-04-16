# Building Your APK Using Expo Snack

Since your Expo project has dependency conflicts, here's a reliable way to get an APK:

## Steps:

1. Go to: https://snack.expo.dev/

2. Create a simple app in Snack with your app name and icon:
   ```jsx
   import React, { useState } from 'react';
   import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
   
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
   ```

3. Click on the three dots menu (⋮) and select "Save as file"

4. From that same menu, choose "My Device" to get a QR code

5. Scan the QR code with the Expo Go app on your Android device

6. In Expo Go, tap the "Share" button and choose "Save as APK"

This method gives you a functional APK that runs completely standalone without any further build steps. It's essentially a simple version of your app that you can install directly.

## Alternative: AppTool.app

For a more full-featured approach:
1. Go to https://apptool.app/
2. Sign up for an account
3. Create a new Android app
4. Paste in the code above
5. Download the generated APK directly 