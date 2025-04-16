import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Animated, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Storage, Task } from '../../types/storage';
import {
  getStorageData,
  setStorageData,
  calculateLevel,
  getMotivationalMessage,
  hasStreakExpired,
  checkAndUpdateBadges,
  shouldEarnFreezeToken,
  autoEndDay,
  getLevelTitle,
  getDefaultStorage,
  createId
} from '../../utils/storage';
import { DifficultyPicker } from '../../components/DifficultyPicker';
import { useTheme } from '../../context/ThemeContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { 
  scheduleTaskReminder, 
  schedulePomodoroEndNotification, 
  cancelNotification,
  playSound,
  vibrate,
  schedulePomodoroCompletionNotification,
  schedulePomodoroStartNotification
} from '../../utils/notifications';
import DateTimePickerModal from "react-native-modal-datetime-picker";

// Add the missing isFutureDate function
function isFutureDate(date: Date): boolean {
  // Create new date objects to avoid modifying the originals
  const today = new Date();
  const nowDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Ensure we're working with a proper Date object
  const compareDate = new Date(date);
  const compareDateOnly = new Date(compareDate.getFullYear(), compareDate.getMonth(), compareDate.getDate());
  
  // Log the comparison for debugging
  console.log(`[isFutureDate] Comparing dates - Today: ${nowDateOnly.toISOString().split('T')[0]}, Target: ${compareDateOnly.toISOString().split('T')[0]}`);
  
  return compareDateOnly.getTime() > nowDateOnly.getTime();
}

// Helper function to format time from HH:MM to AM/PM
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM/PM
  const formattedMinutes = minutes.toString().padStart(2, '0');
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

export default function TasksScreen() {
  const [storage, setStorage] = useState<Storage | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskEffort, setTaskEffort] = useState<Task['effort']>('medium');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const { isDark, theme, setTheme } = useTheme();
  const router = useRouter();
  
  // Add state for task details modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskNotes, setTaskNotes] = useState('');
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [pomodoroTimers, setPomodoroTimers] = useState<Record<string, string>>({});
  const [showNewTaskDetails, setShowNewTaskDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [initialPickerDate, setInitialPickerDate] = useState(new Date()); // State for initial date value

  // Add state to track keyboard visibility
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  // Add keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Initial data load
  useEffect(() => {
    loadData();
  }, []);
  
  // Reload data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Tasks] Tab focused, reloading data');
      loadData();
      return () => {}; // cleanup function
    }, [])
  );

  useEffect(() => {
    if (!storage) return;

    // Update Pomodoro timers
    const interval = setInterval(() => {
      const now = new Date();
      const completedTaskIds: string[] = [];
      
      storage.tasks.forEach(task => {
        if (!task.pomodoroEndTime) return;
        const endTime = new Date(task.pomodoroEndTime);
        if (now >= endTime) {
          completedTaskIds.push(task.id);
        }
      });
      
      // Process any completed timers
      if (completedTaskIds.length > 0) {
        console.log(`[Pomodoro Auto-complete] Found ${completedTaskIds.length} completed timers`);
        
        // Process them one at a time
        completedTaskIds.forEach(taskId => {
          finishPomodoro(taskId, true); // true = fully completed
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [storage]);

  useEffect(() => {
    if (!storage) return;
    
    const interval = setInterval(() => {
      const timers: Record<string, string> = {};
      const now = new Date();
      
      storage.tasks.forEach(task => {
        if (task.pomodoroActive && task.pomodoroEndTime) {
          const endTime = new Date(task.pomodoroEndTime);
          const remainingMs = endTime.getTime() - now.getTime();
          
          if (remainingMs > 0) {
            const minutes = Math.floor(remainingMs / 60000);
            const seconds = Math.floor((remainingMs % 60000) / 1000);
            timers[task.id] = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
          } else {
            timers[task.id] = "0:00";
          }
        }
      });
      
      setPomodoroTimers(timers);
    }, 1000);

    return () => clearInterval(interval);
  }, [storage]);

  async function loadData() {
    try {
      console.log('[loadData] Starting data load');
      let data = await getStorageData();
      
      // Check if streak has expired (more than 1 day since last end day)
      if (data.stats.lastEndDay && hasStreakExpired(data.stats.lastEndDay)) {
        console.log('[loadData] Streak expired, updating stats');
        if (data.stats.freezeTokens > 0) {
          data.stats.freezeTokens--;
          console.log(`[loadData] Used freeze token, ${data.stats.freezeTokens} remaining`);
        } else {
          data.stats.streak = 0;
          console.log('[loadData] Reset streak to 0');
        }
        
        try {
          await setStorageData(data);
          console.log('[loadData] Updated expired streak data');
        } catch (streakError) {
          console.error('[loadData] Error saving streak update:', streakError);
          // Continue with the modified data in memory even if save failed
        }
      }
      
      // Fix: Recalculate level based on XP to ensure it's up to date
      const correctLevel = calculateLevel(data.stats.xp);
      if (data.stats.level !== correctLevel) {
        console.log(`[loadData] Updating level from ${data.stats.level} to ${correctLevel} based on ${data.stats.xp} XP`);
        data.stats.level = correctLevel;
        
        try {
          await setStorageData(data);
          console.log('[loadData] Updated level data');
        } catch (levelError) {
          console.error('[loadData] Error saving level update:', levelError);
          // Continue with the modified data in memory even if save failed
        }
      }
      
      // Automatically end the day if it's a new day since last ended
      const autoEndResult = await autoEndDay(data);
      if (autoEndResult) {
        console.log('[loadData] Auto-ending day from previous session');
        try {
          await setStorageData(autoEndResult);
          console.log('[loadData] Successfully saved auto-end day data');
          data = autoEndResult;
        } catch (autoEndError) {
          console.error('[loadData] Error saving auto-end day data:', autoEndError);
          // Continue with the returned data anyway
          data = autoEndResult;
        }
      }
      
      // Ensure all tasks have a date property
      let needsUpdate = false;
      const todayISOString = new Date().toISOString();
      
      data.tasks = data.tasks.map(task => {
        if (!task.date) {
          console.log(`[loadData] Adding missing date to task: ${task.title}`);
          needsUpdate = true;
          return { ...task, date: todayISOString };
        }
        return task;
      });
      
      // Save updated tasks if needed
      if (needsUpdate) {
        console.log('[loadData] Saving tasks with added date properties');
        try {
          await setStorageData(data);
          console.log('[loadData] Successfully saved updated task dates');
        } catch (datesError) {
          console.error('[loadData] Error saving task date updates:', datesError);
          // Continue with the modified data in memory even if save failed
        }
      }
      
      setStorage(data);
      console.log('[loadData] Data successfully loaded and processed');
    } catch (error) {
      console.error('[loadData] CRITICAL ERROR during data loading:', error);
      Alert.alert(
        "Loading Error", 
        "There was a problem loading your data. Some features may not work correctly.", 
        [{ text: "OK" }]
      );
    }
  }

  const handleAddTask = async () => {
    // --- Start: Basic Checks --- 
    console.log('[handleAddTask] Add button clicked.');
    if (!taskTitle) {
      console.log('[handleAddTask] No task title, exiting.');
      Alert.alert("Missing Title", "Please enter a title for the task.");
      return;
    }
    if (!storage) {
      console.error('[handleAddTask] Storage is null, cannot add task.');
      Alert.alert("Error", "Cannot load data. Please restart the app.");
      return;
    }
    console.log('[handleAddTask] Initial checks passed.');
    // --- End: Basic Checks --- 
    
    // --- Start: Calculate Task Date/Time --- 
    let finalTaskDate = selectedDate || new Date(); 
    if (selectedTime) {
      finalTaskDate.setHours(selectedTime.getHours());
      finalTaskDate.setMinutes(selectedTime.getMinutes());
    } else if (selectedDate) {
      // If only date was selected, ensure time is start of day
      finalTaskDate.setHours(0, 0, 0, 0);
    } // If neither date nor time selected, finalTaskDate remains new Date()
    console.log(`[handleAddTask] Calculated finalTaskDate: ${finalTaskDate.toISOString()}`);
    // --- End: Calculate Task Date/Time --- 
    
    // --- Start: Create Task Object --- 
    const newTask: Task = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 15), // Add randomness for uniqueness
      title: taskTitle,
      notes: newTaskNotes || '',
      completed: false,
      effort: taskEffort,
      pomodoroCount: 0,
      pomodoroActive: false,
      pomodoroEndTime: null,
      date: finalTaskDate.toISOString(),
      time: selectedTime ? 
        `${finalTaskDate.getHours().toString().padStart(2, '0')}:${finalTaskDate.getMinutes().toString().padStart(2, '0')}` 
        : undefined,
      notificationId: undefined,
    };
    console.log('[handleAddTask] New task object created:', JSON.stringify(newTask, null, 2));
    // --- End: Create Task Object --- 

    // --- Start: Schedule Notification --- 
    let scheduledNotificationId: string | undefined;
    let isDateInFuture = false;
    
    // Check if this is a future task before scheduling notification
    if (selectedDate) {
      try {
        console.log(`[handleAddTask] Checking if task is for a future date. selectedDate: ${selectedDate.toISOString()}`);
        isDateInFuture = isFutureDate(selectedDate);
        console.log(`[handleAddTask] Task is for a future date: ${isDateInFuture}`);
      } catch (dateError) {
        console.error('[handleAddTask] Error checking future date:', dateError);
      }
    }
    
    // Only schedule notification if this is a future task
    if (isDateInFuture) {
      try {
        console.log('[handleAddTask] This is a future task, scheduling notification...');
        
        // Add a small delay before scheduling to avoid immediate notifications
        await new Promise(resolve => setTimeout(resolve, 500));
        
        scheduledNotificationId = await scheduleTaskReminder(newTask);
        if (scheduledNotificationId) {
          newTask.notificationId = scheduledNotificationId;
          console.log(`[handleAddTask] Notification scheduled successfully with ID: ${scheduledNotificationId}`);
        } else {
          console.log('[handleAddTask] scheduleTaskReminder returned no ID (likely skipped).');
        }
      } catch (notifError) {
        console.error('[handleAddTask] Error during scheduleTaskReminder:', notifError);
        // Decide if you want to proceed without notification or stop
        Alert.alert("Notification Error", "Could not schedule task reminder, but task will be saved.");
      }
    } else {
      console.log('[handleAddTask] Task is not for a future date, not scheduling notification.');
    }
    // --- End: Schedule Notification --- 
    
    // --- Start: Prepare Data for Saving --- 
    let updatedStats = { ...storage.stats };
    let newTasksArray: Task[] = [];
    let newStorage: Storage;
    
    // Note: Temporarily simplifying badge logic - uncomment later if needed
    // // Check for Early Bird badge 
    // const now = new Date();
    // if (now.getHours() < 8 && !storage.stats.badges.find(b => b.id === 'early-bird')?.earned) { 
    //   // ... (add badge logic) ...
    // }
    try {
      console.log('[handleAddTask] Preparing data for saving...');
      // Add safety check for calendarTasksCreated property
      if (typeof storage.stats.calendarTasksCreated === 'undefined') {
        storage.stats.calendarTasksCreated = 0;
      }
      
      // Safely check if the date is in the future
      let isDateInFuture = false;
      if (selectedDate) {
        try {
          console.log(`[handleAddTask] About to check if date is in future. selectedDate: ${selectedDate.toISOString()}`);
          const dateToCheck = new Date(selectedDate);
          console.log(`[handleAddTask] Date object created: ${dateToCheck.toISOString()}`);
          isDateInFuture = isFutureDate(dateToCheck);
          console.log(`[handleAddTask] Selected date is in future: ${isDateInFuture}`);
        } catch (dateError) {
          console.error('[handleAddTask] Error checking if date is in future:', dateError);
          isDateInFuture = false;
        }
      }
      
      updatedStats.calendarTasksCreated = (storage.stats.calendarTasksCreated || 0) + (isDateInFuture ? 1 : 0);
      
      const currentTasks = storage.tasks || [];
      newTasksArray = [...currentTasks, newTask];
      
      newStorage = {
        ...storage,
        tasks: newTasksArray,
        stats: updatedStats,
      };
      console.log(`[handleAddTask] Prepared newStorage with ${newTasksArray.length} tasks.`);
    // --- End: Prepare Data for Saving --- 
    } catch (prepError) {
      console.error('[handleAddTask] Error preparing data for saving:', prepError);
      Alert.alert(
        "Error", 
        "There was a problem preparing the task data. Please try again.", 
        [{ text: "OK" }]
      );
      return;
    }

    // --- Start: Save Data and Update State --- 
      console.log('[handleAddTask] Entering TRY block for saving...');
      console.log(`[handleAddTask] About to save newStorage with ${newTasksArray.length} tasks.`);
      try {
        // For future tasks, inject a special flag to prevent unwanted notification sounds 
        if (isDateInFuture) {
          // Use a global flag that will disable notification sounds temporarily
          console.log('[handleAddTask] Setting flag to prevent notification sounds for future task');
          // @ts-ignore
          global._blockNextNotificationSound = true;
          
          // Set a timeout to reset the flag after a short time
          setTimeout(() => {
            // @ts-ignore
            global._blockNextNotificationSound = false;
            console.log('[handleAddTask] Reset notification sound blocking flag');
          }, 1000);
        }
        
        console.log('[handleAddTask] >>> Calling setStorageData...');
        await setStorageData(newStorage);
        console.log('[handleAddTask] <<< setStorageData FINISHED successfully.');
        
        console.log('[handleAddTask] >>> Calling setStorage (local state)...');
        setStorage(newStorage);
        console.log('[handleAddTask] <<< setStorage (local state) FINISHED.');
      } catch (error) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('[handleAddTask] !!!!!!!!!!!! CRITICAL ERROR SAVING DATA !!!!!!!!!!!!', error);
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        
        // Try to extract more details about what might have gone wrong
        try {
          const dataSize = JSON.stringify(newStorage).length / 1024;
          console.error(`[handleAddTask] Data size attempted to save: ${dataSize.toFixed(2)} KB`);
          console.error(`[handleAddTask] Task count: ${newStorage.tasks.length}`);
          
          // Check for any unusually large tasks
          const largestTask = [...newStorage.tasks].sort((a, b) => 
            JSON.stringify(b).length - JSON.stringify(a).length
          )[0];
          
          if (largestTask) {
            const largestTaskSize = JSON.stringify(largestTask).length / 1024;
            console.error(`[handleAddTask] Largest task (${largestTaskSize.toFixed(2)} KB): ${largestTask.title}`);
          }
        } catch (debugError) {
          console.error('[handleAddTask] Error during debug analysis:', debugError);
        }
        
        Alert.alert(
          "Save Failed", 
          "Task could not be saved. The app may have reached its storage limit or encountered another error.", 
          [{ text: "OK" }]
        );
        return; // Stop execution
      }
      console.log('[handleAddTask] Exited TRY block for saving successfully.');
    // --- End: Save Data and Update State --- 

    // --- Start: Reset Inputs --- 
    console.log('[handleAddTask] Resetting input fields...');
    setTaskTitle('');
    setTaskEffort('medium');
    setNewTaskNotes('');
    setSelectedDate(null);
    setSelectedTime(null);
    setShowNewTaskDetails(false);
    console.log('[handleAddTask] Input fields reset.');
    // --- End: Reset Inputs --- 
    
    // --- Start: Play Sound --- 
    try {
      console.log('[handleAddTask] Playing sound...');
      
      // Only play task-complete sound (not notification sound) for future tasks
      if (isDateInFuture) {
        console.log('[handleAddTask] Task is for future date, only playing task-complete sound');
        await playSound('task-complete');
      } else {
        // For today's tasks, we can play notification sounds
        await playSound('task-complete');
      }
      
      console.log('[handleAddTask] Sound played.');
    } catch (soundError) {
      console.error("[handleAddTask] Error playing sound:", soundError);
      
      // Try falling back to basic vibration if haptics also failed
      try {
        console.log('[handleAddTask] Falling back to basic vibration...');
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          // @ts-ignore - React Native's vibrate is not fully typed
          Vibration.vibrate(300);
          console.log('[handleAddTask] Basic vibration completed');
        }
      } catch (vibrationError) {
        console.error('[handleAddTask] All feedback methods failed:', vibrationError);
      }
    }
    // --- End: Play Sound --- 

    console.log('[handleAddTask] Function finished successfully.');
  };

  const handleToggleTask = async (id: string) => {
    if (!storage) return;

    // Find the task
    const task = storage.tasks.find(t => t.id === id);
    if (!task) return;

    // Toggle the task's completed state
    const isCompleting = !task.completed;
    
    // Play sound when completing a task
    if (isCompleting) {
      try {
        console.log('[handleToggleTask] Playing completion sound...');
        await playSound('task-complete');
        console.log('[handleToggleTask] Sound played successfully');
        await vibrate();
      } catch (error) {
        console.error("[handleToggleTask] Error with sound or vibration:", error);
        
        // Try falling back to basic vibration if haptics also failed
        try {
          console.log('[handleToggleTask] Falling back to basic vibration...');
          if (Platform.OS === 'ios' || Platform.OS === 'android') {
            Vibration.vibrate(300);
            console.log('[handleToggleTask] Basic vibration completed');
          }
        } catch (vibrationError) {
          console.error('[handleToggleTask] All feedback methods failed:', vibrationError);
        }
      }
    }
    
    // If completing the task, cancel any scheduled notifications
    if (isCompleting && task.notificationId) {
      await cancelNotification(task.notificationId);
    }
    
    const newTasks = storage.tasks.map(t => {
      if (t.id === id) {
        return {
          ...t,
          completed: !t.completed,
          notificationId: isCompleting ? undefined : t.notificationId
        };
      }
      return t;
    });

    // Calculate XP for completed tasks
    let newXp = storage.stats.xp;
    // Update task completion counters
    let tasksCompleted = storage.stats.tasksCompleted;
    let hardTasksCompleted = storage.stats.hardTasksCompleted;
    let dailyTasksCompleted = storage.stats.dailyTasksCompleted;
    
    if (!task.completed) { // Task is being completed
      tasksCompleted++;
      dailyTasksCompleted++; // Increment daily tasks completed counter
      
      if (task.effort === 'hard') {
        hardTasksCompleted++;
      }
      
      switch (task.effort) {
        case 'easy':
          newXp += 5;
          break;
        case 'medium':
          newXp += 10;
          break;
        case 'hard':
          newXp += 15;
          break;
      }
    } else { // Task is being uncompleted
      tasksCompleted = Math.max(0, tasksCompleted - 1);
      dailyTasksCompleted = Math.max(0, dailyTasksCompleted - 1); // Decrement daily tasks
      
      if (task.effort === 'hard') {
        hardTasksCompleted = Math.max(0, hardTasksCompleted - 1);
      }
      
      switch (task.effort) {
        case 'easy':
          newXp -= 5;
          break;
        case 'medium':
          newXp -= 10;
          break;
        case 'hard':
          newXp -= 15;
          break;
      }
    }

    const newLevel = calculateLevel(newXp);

    const newStats = {
      ...storage.stats,
      xp: newXp,
      level: newLevel,
      tasksCompleted,
      hardTasksCompleted,
      dailyTasksCompleted,
    };
    
    // Check for Daily Five badge - completed 5 tasks in a single day
    let updatedStats = newStats;
    if (dailyTasksCompleted >= 5 && !storage.stats.badges.find(b => b.id === 'daily-five')?.earned) {
      updatedStats = {
        ...newStats,
        badges: [
          ...newStats.badges,
          {
            id: 'daily-five',
            title: 'Daily Five',
            description: 'Complete 5 tasks in a single day',
            emoji: '✋',
            earned: true,
            earnedAt: new Date().toISOString(),
          }
        ]
      };
    }

    // Check and award badges
    updatedStats = await checkAndUpdateBadges(updatedStats);

    const newStorage = {
      ...storage,
      tasks: newTasks,
      stats: updatedStats,
    };

    try {
      console.log(`[handleToggleTask] Saving ${newTasks.length} tasks, taskID: ${id}`);
      await setStorageData(newStorage);
      console.log('[handleToggleTask] Data saved successfully');
      setStorage(newStorage);
      // Show a motivational message when task is completed
      setMessage(getMotivationalMessage());
    } catch (error) {
      console.error('[handleToggleTask] ERROR saving data:', error);
      Alert.alert(
        "Toggle Failed", 
        "Could not update task status. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleEndDay = async () => {
    if (!storage) return;

    // Calculate completion percentage
    const completedTasks = storage.tasks.filter(task => task.completed);
    const totalTasks = storage.tasks.length;
    const completionPercentage = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
    
    // Check if we meet the threshold for streak increment (90% or at least one task)
    const meetStreakThreshold = completionPercentage >= 90 || (totalTasks > 0 && completedTasks.length > 0);

    // Calculate task XP based on effort and completed status
    const taskXp = storage.tasks.reduce((total, task) => {
      if (task.completed) {
        switch (task.effort) {
          case 'easy':
            return total + 5;
          case 'medium':
            return total + 10;
          case 'hard':
            return total + 15;
          default:
            return total;
        }
      }
      return total;
    }, 0);

    // Calculate pomodoro XP
    const pomodoroXp = storage.tasks.reduce((total, task) => {
      if (task.pomodoroCount > 0) {
        switch (task.effort) {
          case 'easy':
            return total + 5;
          case 'medium':
            return total + 10;
          case 'hard':
            return total + 15;
          default:
            return total;
        }
      }
      return total;
    }, 0);

    const newXp = storage.stats.xp + taskXp + storage.stats.pomodoroXp;
    const newLevel = calculateLevel(newXp);
    console.log(`End Day - XP: ${storage.stats.xp} + ${taskXp} + ${storage.stats.pomodoroXp} = ${newXp}, Level: ${newLevel}`);

    // Handle streak based on task completion
    let newStreak;
    let newFreezeTokens = storage.stats.freezeTokens;
    let customMessage = null;
    
    if (meetStreakThreshold) {
      // If we completed tasks, increment streak
      newStreak = storage.stats.streak + 1;
      
      // Check if we earned a freeze token at this streak milestone
      console.log(`Current streak: ${storage.stats.streak}, New streak: ${newStreak}, Current freeze tokens: ${storage.stats.freezeTokens}`);
      
      // Fix: Check if the new streak is a multiple of 7
      if (newStreak % 7 === 0) {
        newFreezeTokens++;
        console.log(`Earned freeze token at streak ${newStreak}! New count: ${newFreezeTokens}`);
      }
    } else {
      // No tasks completed - should decrease streak or use freeze token
      if (newFreezeTokens > 0) {
        // Use a freeze token to maintain streak
        newStreak = storage.stats.streak;
        newFreezeTokens--;
        customMessage = "Used a freeze token to protect your streak! ❄️";
      } else {
        // No freeze tokens, reset streak
        newStreak = 0;
        customMessage = "Your streak has been reset. Complete tasks tomorrow to start a new streak!";
      }
    }

    // Update weekend warrior tracking
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    let saturdayCompleted = storage.stats.saturdayCompleted;
    let sundayCompleted = storage.stats.sundayCompleted;
    
    // If today is Sunday and we completed tasks, mark Sunday as completed
    if (dayOfWeek === 0 && completedTasks.length > 0) {
      sundayCompleted = true;
    }
    
    // If today is Saturday and we completed tasks, mark Saturday as completed
    if (dayOfWeek === 6 && completedTasks.length > 0) {
      saturdayCompleted = true;
    }
    
    // Check for Weekend Warrior badge
    const earnedWeekendWarrior = saturdayCompleted && sundayCompleted;

    const newStats = {
      ...storage.stats,
      streak: newStreak,
      freezeTokens: newFreezeTokens,
      xp: newXp,
      pomodoroXp: 0, // Reset daily Pomodoro XP
      totalPomodoros: storage.stats.totalPomodoros,
      level: newLevel,
      lastEndDay: new Date().toISOString(),
      dailyTasksCompleted: 0, // Reset for new day
      dailyPomodorosCompleted: 0, // Reset for new day
      saturdayCompleted,
      sundayCompleted,
    };

    // Check and award badges
    let updatedStats = newStats;
    
    // Weekend Warrior badge
    if (earnedWeekendWarrior && !updatedStats.badges.find(b => b.id === 'weekend-warrior')?.earned) {
      updatedStats = {
        ...updatedStats,
        badges: [
          ...updatedStats.badges,
          {
            id: 'weekend-warrior',
            title: 'Weekend Warrior',
            description: 'Complete tasks on both Saturday and Sunday',
            emoji: '🏆',
            earned: true,
            earnedAt: new Date().toISOString(),
          }
        ]
      };
    }
    
    // Check for other badges
    updatedStats = await checkAndUpdateBadges(updatedStats);

    const newStorage: Storage = {
      tasks: storage.tasks.map((task) => ({
        ...task,
        completed: false,
        pomodoroCount: 0,
        pomodoroActive: false,
        pomodoroEndTime: null,
        date: task.date || new Date().toISOString(),
      })),
      stats: updatedStats,
      notes: storage.notes,
    };

    try {
      console.log(`[handleEndDay] Ending day, clearing completions from ${storage.tasks.length} tasks`);
      await setStorageData(newStorage);
      console.log('[handleEndDay] End of day data saved successfully');
      setStorage(newStorage);
      // Use custom message if available, otherwise use motivational message
      setMessage(customMessage || getMotivationalMessage());
    } catch (error) {
      console.error('[handleEndDay] ERROR saving end of day data:', error);
      Alert.alert(
        "End Day Failed", 
        "Could not process end of day. Please try again or restart the app.",
        [{ text: "OK" }]
      );
    }
  };
  
  // Add function to cancel a pomodoro timer
  const cancelPomodoro = async (taskId: string) => {
    if (!storage) return;
    
    const task = storage.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Cancel any existing notification for this task
    if (task.notificationId) {
      await cancelNotification(task.notificationId);
    }
    
    const newTasks = storage.tasks.map(task => 
      task.id === taskId ? {
        ...task,
        pomodoroActive: false,
        pomodoroEndTime: null,
        notificationId: undefined
      } : task
    );
    
    const newStorage = {
      ...storage,
      tasks: newTasks
    };
    
    try {
      console.log(`[cancelPomodoro] Canceling pomodoro for task ID: ${taskId}`);
      await setStorageData(newStorage);
      console.log('[cancelPomodoro] Data saved successfully');
      setStorage(newStorage);
    } catch (error) {
      console.error('[cancelPomodoro] ERROR saving data:', error);
      Alert.alert(
        "Cancel Failed", 
        "Could not cancel Pomodoro timer. Please try again.",
        [{ text: "OK" }]
      );
    }
  };
  
  // Add function to open task details modal
  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setTaskNotes(task.notes || '');
    setIsTaskModalVisible(true);
  };
  
  // Add function to save task notes
  const saveTaskNotes = async () => {
    if (!storage || !selectedTask) return;
    
    const newTasks = storage.tasks.map(task => 
      task.id === selectedTask.id ? {
        ...task,
        notes: taskNotes
      } : task
    );
    
    const newStorage = {
      ...storage,
      tasks: newTasks
    };
    
    try {
      console.log(`[saveTaskNotes] Saving notes for task ID: ${selectedTask.id}`);
      await setStorageData(newStorage);
      console.log('[saveTaskNotes] Notes saved successfully');
      setStorage(newStorage);
      setIsTaskModalVisible(false);
    } catch (error) {
      console.error('[saveTaskNotes] ERROR saving notes:', error);
      Alert.alert(
        "Save Failed", 
        "Could not save task notes. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Add function to delete a task
  const handleDeleteTask = async (taskId: string) => {
    if (!storage) return;
    
    const newTasks = storage.tasks.filter(task => task.id !== taskId);
    
    const newStorage = {
      ...storage,
      tasks: newTasks
    };
    
    try {
      console.log(`[handleDeleteTask] Deleting task ID: ${taskId}`);
      await setStorageData(newStorage);
      console.log('[handleDeleteTask] Task deleted successfully');
      setStorage(newStorage);
    } catch (error) {
      console.error('[handleDeleteTask] ERROR deleting task:', error);
      Alert.alert(
        "Delete Failed", 
        "Could not delete task. Please try again.",
        [{ text: "OK" }]
      );
    }
  };
  
  // Add function to start a pomodoro timer
  const startPomodoro = async (taskId: string) => {
    if (!storage) return;
    
    // Find the task
    const task = storage.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`[startPomodoro] Task with ID ${taskId} not found`);
      return;
    }

    // Check if there's already an active pomodoro timer for any task
    const activePomodoro = storage.tasks.find(t => t.pomodoroActive);
    if (activePomodoro) {
      console.log(`[startPomodoro] Cannot start a new pomodoro because task "${activePomodoro.title}" has an active timer`);
      Alert.alert(
        "Pomodoro Already Running",
        `You already have an active pomodoro timer for "${activePomodoro.title}". Please wait for it to finish or cancel it before starting a new one.`,
        [{ text: "OK" }]
      );
      return;
    }
    
    // Standard pomodoro is 25 minutes
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + 25);
    
    // Cancel any existing notification for this task
    if (task.notificationId) {
      await cancelNotification(task.notificationId);
    }
    
    // First, show the start notification with correct time info
    try {
      await schedulePomodoroStartNotification(endTime, task.title);
      console.log(`[startPomodoro] Displayed start notification`);
    } catch (startError) {
      console.error('[startPomodoro] Error showing start notification:', startError);
    }
    
    // Then schedule the end notification for when the timer finishes
    let notificationId;
    try {
      notificationId = await schedulePomodoroEndNotification(endTime, task.title);
      console.log(`[startPomodoro] Scheduled end notification with ID: ${notificationId}`);
    } catch (notifError) {
      console.error('[startPomodoro] Error scheduling end notification:', notifError);
      // Continue without notification
    }
    
    const newTasks = storage.tasks.map(t => 
      t.id === taskId ? {
        ...t,
        pomodoroActive: true,
        pomodoroEndTime: endTime.toISOString(),
        notificationId // Store the notification ID
      } : t
    );
    
    const newStorage = {
      ...storage,
      tasks: newTasks
    };
    
    try {
      console.log(`[startPomodoro] Starting pomodoro for task ID: ${taskId}, ending at ${endTime.toISOString()}`);
      await setStorageData(newStorage);
      console.log('[startPomodoro] Pomodoro started successfully');
      setStorage(newStorage);
    } catch (error) {
      console.error('[startPomodoro] ERROR starting pomodoro:', error);
      Alert.alert(
        "Pomodoro Start Failed", 
        "Could not start the pomodoro timer. Please try again.",
        [{ text: "OK" }]
      );
    }
  };
  
  // Add function to complete a pomodoro session
  const completePomodoro = async (taskId: string) => {
    if (!storage) return;
    
    const task = storage.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`[completePomodoro] Task with ID ${taskId} not found`);
      return;
    }
    
    // Check if timer is actually completed or manually stopped
    const now = new Date();
    const endTime = task.pomodoroEndTime ? new Date(task.pomodoroEndTime) : null;
    const isFullyCompleted = endTime && now >= endTime;
    
    // If manually stopping, show a confirmation alert
    if (!isFullyCompleted) {
      Alert.alert(
        "Cancel Pomodoro?",
        "If you stop now, you won't receive XP or credit for this Pomodoro session. You only get credit for completing the full 25 minutes.",
        [
          {
            text: "Continue Timer",
            style: "cancel"
          },
          {
            text: "Stop Anyway",
            onPress: () => finishPomodoro(taskId, isFullyCompleted)
          }
        ]
      );
      return;
    }
    
    // If it's fully completed, proceed without confirmation
    finishPomodoro(taskId, isFullyCompleted);
  };
  
  // Helper function to finish the pomodoro process after potential confirmation
  const finishPomodoro = async (taskId: string, isFullyCompleted: boolean) => {
    if (!storage) return;
    
    const task = storage.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`[finishPomodoro] Task with ID ${taskId} not found`);
      return;
    }
    
    // Cancel any existing notification for this task
    if (task.notificationId) {
      try {
        await cancelNotification(task.notificationId);
        console.log(`[finishPomodoro] Canceled notification with ID: ${task.notificationId}`);
      } catch (cancelError) {
        console.error('[finishPomodoro] Error canceling notification:', cancelError);
        // Continue even if notification cancellation fails
      }
    }
    
    console.log(`[finishPomodoro] Timer fully completed: ${isFullyCompleted}`);
    
    // Schedule a completion notification only if the timer was fully completed
    if (isFullyCompleted) {
      try {
        // REMOVED: All notification logic was here
        // We rely entirely on the notification scheduled by schedulePomodoroEndNotification
        // This notification is scheduled when the Pomodoro starts and will fire automatically
        // when the timer ends
        console.log(`[finishPomodoro] Timer completed - notification will be handled by the system`);
      } catch (error) {
        console.error('[finishPomodoro] Error:', error);
      }
    }
    
    // Play completion sound and vibrate (always give feedback even for manual stops)
    try {
      console.log('[finishPomodoro] Playing completion sound...');
      await playSound('pomodoro-end');
      console.log('[finishPomodoro] Sound played successfully');
      await vibrate();
      console.log('[finishPomodoro] Played completion sound and vibration');
    } catch (soundError) {
      console.error("[finishPomodoro] Error with sound or vibration:", soundError);
      
      // Try falling back to basic vibration if haptics also failed
      try {
        console.log('[finishPomodoro] Falling back to basic vibration...');
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Vibration.vibrate([300, 200, 300]);
          console.log('[finishPomodoro] Basic vibration completed');
        }
      } catch (vibrationError) {
        console.error('[finishPomodoro] All feedback methods failed:', vibrationError);
      }
    }
    
    // Only update stats and award XP if timer was fully completed
    let updatedStats = { ...storage.stats };
    let pomodoroCount = task.pomodoroCount;
    
    if (isFullyCompleted) {
      // Increment daily pomodoros counter
      const dailyPomodorosCompleted = storage.stats.dailyPomodorosCompleted + 1;
      
      // Increment the pomodoro count for the task
      pomodoroCount = task.pomodoroCount + 1;
      
      // Calculate new pomodoro XP
      const newPomodoroXp = Math.min(storage.stats.pomodoroXp + 5, 20); // Cap daily pomodoro XP at 20
      
      // Update stats - adding the new pomodoro XP to total XP as well
      updatedStats = {
        ...storage.stats,
        totalPomodoros: storage.stats.totalPomodoros + 1,
        pomodoroXp: newPomodoroXp,
        xp: storage.stats.xp + 5, // Add 5 XP to overall XP immediately
        dailyPomodorosCompleted,
      };
      
      // Check for Extreme Focus badge - 5 pomodoros in a day
      if (dailyPomodorosCompleted >= 5 && !storage.stats.badges.find(b => b.id === 'extreme-focus')?.earned) {
        console.log('[finishPomodoro] Earned Extreme Focus badge');
        updatedStats = {
          ...updatedStats,
          badges: [
            ...updatedStats.badges,
            {
              id: 'extreme-focus',
              title: 'Extreme Focus',
              description: 'Complete 5 Pomodoro sessions in a single day',
              emoji: '🧠',
              earned: true,
              earnedAt: new Date().toISOString(),
            }
          ]
        };
      }
      
      // Check for other pomodoro-related badges
      try {
        updatedStats = await checkAndUpdateBadges(updatedStats);
        console.log('[finishPomodoro] Checked and updated badges');
      } catch (badgeError) {
        console.error('[finishPomodoro] Error checking badges:', badgeError);
        // Continue with the current stats
      }
    } else {
      console.log('[finishPomodoro] Timer was manually stopped before completion. No XP or count awarded.');
    }
    
    const newTasks = storage.tasks.map(t => 
      t.id === taskId ? {
        ...t,
        pomodoroCount: pomodoroCount,
        pomodoroActive: false,
        pomodoroEndTime: null,
        notificationId: undefined
      } : t
    );
    
    const newStorage = {
      ...storage,
      tasks: newTasks,
      stats: updatedStats
    };
    
    try {
      console.log(`[finishPomodoro] Completing pomodoro for task ID: ${taskId}`);
      await setStorageData(newStorage);
      console.log('[finishPomodoro] Pomodoro completed successfully');
      setStorage(newStorage);
    } catch (error) {
      console.error('[finishPomodoro] ERROR completing pomodoro:', error);
      Alert.alert(
        "Pomodoro Completion Failed", 
        "Could not save the completed pomodoro. Please try again.",
        [{ text: "OK" }]
      );
    }
  };
  
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  // Function to render the delete action
  const renderRightActions = (taskId: string) => {
    return (
      <View style={styles.deleteContainer}>
        <Pressable 
          style={[styles.deleteButton, { backgroundColor: '#EF4444' }]}
          onPress={() => handleDeleteTask(taskId)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </Pressable>
      </View>
    );
  };

  // Add these functions to handle time picker
  const showTimePicker = () => {
    console.log('[ModalTimePicker] Opening time picker');
    setTimePickerVisibility(true);
  };
  
  const hideTimePicker = () => {
    setTimePickerVisibility(false);
  };

  const handleConfirmTime = (time: Date) => {
    console.log('[ModalTimePicker] Confirmed time:', time.toISOString());
    // Combine with selected date or today
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    baseDate.setHours(time.getHours());
    baseDate.setMinutes(time.getMinutes());
    baseDate.setSeconds(0, 0);
    setSelectedTime(baseDate); // Set the combined date+time
    hideTimePicker();
  };

  const showDatePicker = () => {
    console.log('[ModalDatePicker] Opening date picker');
    const initialDate = selectedDate || new Date();
    console.log('[ModalDatePicker] Setting initial picker date to:', initialDate.toISOString());
    setInitialPickerDate(initialDate); // Set the initial date for the modal
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirmDate = (date: Date) => {
    console.log('[ModalDatePicker] Confirmed date:', date.toISOString());
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0); // Keep only the date part
    setSelectedDate(dateOnly);
    hideDatePicker();
  };

  if (!storage) return null;

  // Filter tasks to only show today's tasks
  const todayTasks = storage.tasks.filter(task => {
    if (!task.date) return true; // For backward compatibility
    const taskDate = new Date(task.date);
    const today = new Date();
    return (
      taskDate.getDate() === today.getDate() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getFullYear() === today.getFullYear()
    );
  });

  const level = storage.stats.level;
  const levelTitle = getLevelTitle(level);

  // Calculate XP progress percentage for the current level
  const calculateXpPercentage = (xp: number, level: number): number => {
    const getXpForLevel = (lvl: number): { min: number, max: number } => {
      switch (lvl) {
        case 1: return { min: 0, max: 100 };
        case 2: return { min: 100, max: 250 };
        case 3: return { min: 250, max: 500 };
        case 4: return { min: 500, max: 1000 };
        case 5: return { min: 1000, max: 2000 };
        case 6: return { min: 2000, max: 3000 };
        case 7: return { min: 3000, max: 5000 };
        case 8: return { min: 5000, max: 7500 };
        case 9: return { min: 7500, max: 10000 };
        case 10: return { min: 10000, max: 10000 }; // Max level
        default: return { min: 0, max: 100 };
      }
    };
    
    const { min, max } = getXpForLevel(level);
    const rangeSize = max - min;
    
    if (rangeSize === 0) return 100; // For level 10
    
    const xpInLevel = xp - min;
    return Math.min(100, (xpInLevel / rangeSize) * 100);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <SafeAreaView 
          style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F8FAFC' }]}
          edges={['top', 'left', 'right']}
        >
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContentContainer,
              { paddingBottom: isKeyboardVisible ? 200 : 120 } // Add extra padding when keyboard is visible
            ]}
            keyboardShouldPersistTaps="handled"
            directionalLockEnabled={true}
            scrollEventThrottle={16}
            alwaysBounceVertical={true}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>Focus Notes</Text>
          <View style={styles.headerButtons}>
            <Pressable style={[styles.themeButton, { backgroundColor: isDark ? '#1A1A1A' : '#E2E8F0' }]} onPress={toggleTheme}>
              <Text style={styles.themeButtonText}>{isDark ? '☀️' : '🌙'}</Text>
            </Pressable>
            <Pressable 
              style={[styles.analyticsButton, { backgroundColor: isDark ? '#1A1A1A' : '#E2E8F0' }]}
              onPress={() => router.push({
                pathname: '/stats',
                // Force a reload of the stats page by adding a timestamp
                query: { t: Date.now() }
              })}
            >
              <Text style={[styles.analyticsText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Analytics</Text>
            </Pressable>
          </View>
        </View>

            <View style={[styles.statsCard, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderColor: isDark ? '#2A2A2A' : '#E2E8F0', borderWidth: 1 }]}>
          <View style={styles.streakSection}>
            <View style={styles.streakIcon}>
              <Text style={styles.streakIconText}>🔥</Text>
            </View>
                <Text style={[styles.streakCount, { color: isDark ? '#FFFFFF' : '#000000' }]}>{storage.stats.streak}</Text>
                <Text style={[styles.streakLabel, { color: isDark ? '#666666' : '#94A3B8' }]}>Day Streak</Text>
          </View>
              <View style={[styles.levelSection, { borderTopColor: isDark ? '#2A2A2A' : '#E2E8F0' }]}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelIcon}>🏆</Text>
                  <Text style={[styles.levelText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Level {level}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{levelTitle}</Text>
              </View>
            </View>
            <View style={styles.xpBar}>
              <Text style={[styles.xpText, { color: isDark ? '#666666' : '#94A3B8' }]}>{storage.stats.xp} XP</Text>
              <Text style={[styles.xpText, { color: isDark ? '#666666' : '#94A3B8' }]}>
                {(() => {
                  // Get the next level XP target based on the current level
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
                      case 10: return 10000;
                      default: return 100;
                    }
                  };
                  
                  // Get correct level for the current XP
                  const correctLevel = calculateLevel(storage.stats.xp);
                  
                  // Return the correct XP target for the next level
                  return getNextLevelXp(correctLevel);
                })()} XP
              </Text>
            </View>
            <View style={[
              styles.progressBarContainer, 
              { backgroundColor: isDark ? '#333333' : '#E2E8F0' }
            ]}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    backgroundColor: '#FF6B00',
                    width: `${calculateXpPercentage(storage.stats.xp, calculateLevel(storage.stats.xp))}%` 
                  }
                ]} 
              />
            </View>
          </View>
        </View>

            <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Today's Tasks</Text>

            <View style={styles.inputContainer}>
              {/* Main Input Row */}
              <View style={styles.mainInputRow}>
          <TextInput
                  style={[
                    styles.taskTitleInput,
                    { 
                      color: isDark ? '#FFFFFF' : '#1E293B',
                      backgroundColor: isDark ? '#333333' : '#FFFFFF',
                    },
                  ]}
                  placeholder="Add new task..."
                  placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
            value={taskTitle}
            onChangeText={setTaskTitle}
                  onSubmitEditing={handleAddTask}
                  disableFullscreenUI={true}
                  autoCorrect={false}
                  blurOnSubmit={true}
                  autoCapitalize="sentences"
                  importantForAutofill="no"
                  keyboardType="default"
                  returnKeyType="done"
                  maxLength={100}
                  textContentType="none"
                  selectionColor={isDark ? "#FF6B00" : "#FF6B00"}
                />
                <Pressable 
                  style={[styles.detailsToggleButton, { 
                    backgroundColor: isDark ? '#333333' : '#E2E8F0',
                  }]}
                  onPress={() => setShowNewTaskDetails(!showNewTaskDetails)}
                >
                  <Text style={[styles.detailsToggleIcon, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {showNewTaskDetails ? '▲' : '▼'}
                  </Text>
                </Pressable>
                <Pressable 
                  style={[styles.addButton, { 
                    backgroundColor: taskTitle.trim() ? '#FF6B00' : (isDark ? '#444444' : '#CBD5E1'),
                  }]} 
                  onPress={handleAddTask}
                  disabled={!taskTitle.trim()}
                >
                  <Text style={[styles.addButtonText, { 
                    color: taskTitle.trim() ? '#FFFFFF' : (isDark ? '#666666' : '#94A3B8') 
                  }]}>+</Text>
          </Pressable>
        </View>

              {/* Details Dropdown Panel */}
              {showNewTaskDetails && (
                <View style={[styles.taskDetailsPanel, { 
                  backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9',
                  borderTopColor: isDark ? '#333333' : '#E2E8F0'
                }]}>
                  <View style={styles.difficultySection}>
                    <Text style={[styles.detailsSectionLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      Difficulty / XP:
                    </Text>
                    <View style={styles.difficultyButtons}>
            <Pressable
                        style={[styles.difficultyButton, { 
                          backgroundColor: taskEffort === 'easy' 
                            ? '#10B981' 
                            : (isDark ? '#333333' : '#E2E8F0'),
                        }]}
                        onPress={() => setTaskEffort('easy')}
                      >
                        <Text style={[styles.difficultyButtonText, { 
                          color: taskEffort === 'easy' 
                            ? '#FFFFFF' 
                            : (isDark ? '#FFFFFF' : '#000000')
                        }]}>
                          Easy (5 XP)
                        </Text>
                      </Pressable>
                      <Pressable 
                        style={[styles.difficultyButton, { 
                          backgroundColor: taskEffort === 'medium' 
                            ? '#0EA5E9' 
                            : (isDark ? '#333333' : '#E2E8F0'),
                        }]}
                        onPress={() => setTaskEffort('medium')}
                      >
                        <Text style={[styles.difficultyButtonText, { 
                          color: taskEffort === 'medium' 
                            ? '#FFFFFF' 
                            : (isDark ? '#FFFFFF' : '#000000')
                        }]}>
                          Medium (10 XP)
                        </Text>
                      </Pressable>
                      <Pressable 
                        style={[styles.difficultyButton, { 
                          backgroundColor: taskEffort === 'hard' 
                            ? '#EF4444' 
                            : (isDark ? '#333333' : '#E2E8F0'),
                        }]}
                        onPress={() => setTaskEffort('hard')}
                      >
                        <Text style={[styles.difficultyButtonText, { 
                          color: taskEffort === 'hard' 
                            ? '#FFFFFF' 
                            : (isDark ? '#FFFFFF' : '#000000')
                        }]}>
                          Hard (15 XP)
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  
                  {/* Add Date & Time Selection */}
                  <View style={styles.dateTimeSection}>
                    <Text style={[styles.detailsSectionLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      When:
                    </Text>
                    <View style={styles.dateTimeButtons}>
                      <Pressable 
                        style={[styles.dateTimeButton, { 
                          backgroundColor: isDark ? '#333333' : '#E2E8F0',
                        }]}
                        onPress={showDatePicker}
                      >
                        <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
                          {selectedDate ? selectedDate.toLocaleDateString() : "Select Date"}
                        </Text>
                      </Pressable>
                      
                      <Pressable 
                        style={[styles.dateTimeButton, { 
                          backgroundColor: isDark ? '#333333' : '#E2E8F0',
                        }]}
                        onPress={showTimePicker}
                      >
                        <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
                          {selectedTime 
                            ? formatTime(`${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`)
                            : "Set Time"
                          }
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  
                  <Text style={[styles.detailsSectionLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Notes:
                  </Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      { 
                        color: isDark ? '#FFFFFF' : '#1E293B',
                        backgroundColor: isDark ? '#333333' : '#F1F5F9',
                      },
                    ]}
                    placeholder="Add notes (optional)"
                    placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
                    value={newTaskNotes}
                    onChangeText={setNewTaskNotes}
                    multiline
                    numberOfLines={3}
                    disableFullscreenUI={true}
                    autoCorrect={false}
                    importantForAutofill="no"
                    textContentType="none"
                    selectionColor={isDark ? "#FF6B00" : "#FF6B00"}
                  />
                </View>
              )}
            </View>

            {todayTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  No tasks for today. Add a task to get started!
                </Text>
              </View>
            ) : (
              <View style={styles.taskList}>
                {/* Clear scroll area to make scrolling easier */}
                <View style={styles.scrollHandleArea}>
                  <View style={[styles.scrollHandle, { backgroundColor: isDark ? '#333333' : '#CBD5E1' }]} />
                </View>
                
                {todayTasks.map(task => (
                  <Swipeable
                    key={task.id}
                    ref={(ref) => {
                      if (ref && !swipeableRefs.current.has(task.id)) {
                        swipeableRefs.current.set(task.id, ref);
                      }
                    }}
                    renderRightActions={() => renderRightActions(task.id)}
                    onSwipeableOpen={() => {
                      // Close any other open swipeables
                      swipeableRefs.current.forEach((swipeable, id) => {
                        if (id !== task.id) swipeable.close();
                      });
                    }}
                    friction={2}
                    overshootFriction={8}
                    enableTrackpadTwoFingerGesture
                    rightThreshold={40}
                  >
                    <View style={[styles.taskItem, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
                      <Pressable
                        style={[styles.checkbox, { borderColor: isDark ? '#666666' : '#94A3B8' }]}
              onPress={() => handleToggleTask(task.id)}
            >
                        {task.completed && <Text style={[styles.checkmark, { color: isDark ? '#FFFFFF' : '#000000' }]}>✓</Text>}
            </Pressable>
                      <Pressable 
                        style={styles.taskContent}
                        onPress={() => openTaskDetails(task)}
                      >
                        <Text style={[styles.taskTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>{task.title}</Text>
                        <View style={styles.taskMeta}>
                          <View style={[styles.taskDifficulty, { backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9' }]}>
                            <Text style={[styles.difficultyLabel, { color: isDark ? '#666666' : '#64748B' }]}>
                  {task.effort} ({task.effort === 'easy' ? '5' : task.effort === 'medium' ? '10' : '15'} XP)
                </Text>
              </View>
                          
                          {task.date && (
                            <View style={[styles.taskDate, { backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9' }]}>
                              <Text style={[styles.taskMetaText, { color: isDark ? '#666666' : '#64748B' }]}>
                                📅 {new Date(task.date).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                          {task.time && (
                            <View style={[styles.taskTime, { backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9' }]}>
                              <Text style={[styles.taskMetaText, { color: isDark ? '#666666' : '#64748B' }]}>
                                🕒 {formatTime(task.time)}
                              </Text>
                            </View>
                          )}
                          
                          {task.notes ? (
                            <View style={[styles.notesIndicator, { backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9' }]}>
                              <Text style={[styles.notesIndicatorText, { color: isDark ? '#666666' : '#64748B' }]}>
                                Notes
                              </Text>
            </View>
                          ) : null}
                          
                          {task.pomodoroCount > 0 ? (
                            <View style={[styles.pomodoroCount, { backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9' }]}>
                              <Text style={[styles.pomodoroCountText, { color: isDark ? '#666666' : '#64748B' }]}>
                                🍅 {task.pomodoroCount}
                              </Text>
          </View>
                          ) : null}
                        </View>
                      </Pressable>
                      
                      {!task.pomodoroActive ? (
                        <Pressable 
                          style={[
                            styles.pomodoroButton, 
                            { backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9' },
                            storage?.tasks.some(t => t.pomodoroActive && t.id !== task.id) && { opacity: 0.5 }
                          ]}
                          onPress={() => startPomodoro(task.id)}
                          disabled={storage?.tasks.some(t => t.pomodoroActive && t.id !== task.id)}
                        >
                          <Text style={[styles.pomodoroButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            🍅
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={{ alignItems: 'center' }}>
                          <Pressable 
                            style={[styles.pomodoroButton, { backgroundColor: '#FF6347' }]}
                            onPress={() => completePomodoro(task.id)}
                          >
                            <Text style={[styles.pomodoroButtonText, { color: '#FFFFFF' }]}>
                              ⏱️
                            </Text>
                          </Pressable>
                          <Text style={[styles.timerText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            {pomodoroTimers[task.id] || '25:00'}
                          </Text>
                          <Text style={[styles.timerNote, { color: isDark ? '#999999' : '#666666', fontSize: 10 }]}>
                            Complete full time for XP
                          </Text>
                        </View>
                      )}
                    </View>
                  </Swipeable>
                ))}
                
                {/* Extra scroll space at the bottom */}
                <View style={styles.extraScrollSpace} />
              </View>
            )}

        <View style={styles.endDayButtonContainer}>
              <Pressable style={[styles.endDayButton, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]} onPress={handleEndDay}>
                <Text style={[styles.endDayButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>📅 End Day</Text>
          </Pressable>
        </View>

        {message && (
              <View style={[styles.messageContainer, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
            <Text style={styles.messageIcon}>💡</Text>
                <Text style={[styles.messageText, { color: isDark ? '#FFFFFF' : '#000000' }]}>{message}</Text>
          </View>
        )}

            {/* Task Details Modal */}
            <Modal
              visible={isTaskModalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setIsTaskModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
                  <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {selectedTask?.title}
                  </Text>
                  
                  <View style={[styles.taskDetailItem, { borderBottomColor: isDark ? '#333333' : '#E2E8F0' }]}>
                    <Text style={[styles.taskDetailLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Difficulty:</Text>
                    <Text style={[styles.taskDetailValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      {selectedTask?.effort} ({selectedTask?.effort === 'easy' ? '5' : selectedTask?.effort === 'medium' ? '10' : '15'} XP)
                    </Text>
                  </View>
                  
                  <View style={[styles.taskDetailItem, { borderBottomColor: isDark ? '#333333' : '#E2E8F0' }]}>
                    <Text style={[styles.taskDetailLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Pomodoros:</Text>
                    <Text style={[styles.taskDetailValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      {selectedTask?.pomodoroCount || 0} completed
                    </Text>
                  </View>
                  
                  {selectedTask?.date && (
                    <View style={[styles.taskDetailItem, { borderBottomColor: isDark ? '#333333' : '#E2E8F0' }]}>
                      <Text style={[styles.taskDetailLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Date:</Text>
                      <Text style={[styles.taskDetailValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {new Date(selectedTask.date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  {selectedTask?.time && (
                    <View style={[styles.taskDetailItem, { borderBottomColor: isDark ? '#333333' : '#E2E8F0' }]}>
                      <Text style={[styles.taskDetailLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Time:</Text>
                      <Text style={[styles.taskDetailValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {formatTime(selectedTask.time)}
                      </Text>
                    </View>
                  )}
                  
                  <Text style={[styles.taskDetailLabel, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 16 }]}>
                    Notes:
                  </Text>
                  <TextInput
                    style={[
                      styles.taskNotesInput,
                      { 
                        color: isDark ? '#FFFFFF' : '#1E293B',
                        backgroundColor: isDark ? '#333333' : '#F1F5F9',
                      },
                    ]}
                    multiline
                    placeholder="Add notes about this task..."
                    placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
                    value={taskNotes}
                    onChangeText={setTaskNotes}
                    disableFullscreenUI={true}
                    autoCorrect={false}
                    importantForAutofill="no"
                    textContentType="none"
                    selectionColor={isDark ? "#FF6B00" : "#FF6B00"}
                  />
                  
                  <View style={styles.modalButtons}>
                    <Pressable 
                      style={[styles.modalButton, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}
                      onPress={() => setIsTaskModalVisible(false)}
                    >
                      <Text style={[styles.modalButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Cancel</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.modalButton, { backgroundColor: '#FF6B00' }]}
                      onPress={saveTaskNotes}
                    >
                      <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Add Date Picker Modal */}
            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="date"
              onConfirm={handleConfirmDate}
              onCancel={hideDatePicker}
              date={initialPickerDate}
            />
            
            {/* Add Time Picker Modal */}
            <DateTimePickerModal
              isVisible={isTimePickerVisible}
              mode="time"
              onConfirm={handleConfirmTime}
              onCancel={hideTimePicker}
              date={selectedTime || initialPickerDate}
              is24Hour={false}
            />
      </ScrollView>
    </SafeAreaView>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeButton: {
    padding: 8,
    borderRadius: 8,
  },
  themeButtonText: {
    fontSize: 18,
  },
  analyticsButton: {
    padding: 8,
    borderRadius: 8,
  },
  analyticsText: {
    // color is now dynamic
  },
  statsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  streakSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  streakIcon: {
    marginBottom: 8,
  },
  streakIconText: {
    fontSize: 24,
  },
  streakCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  streakLabel: {
    color: '#666666',
  },
  levelSection: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: 16,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelIcon: {
    marginRight: 8,
  },
  levelText: {
    color: '#FFFFFF',
    marginRight: 8,
  },
  levelBadge: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  xpBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpText: {
    color: '#666666',
    fontSize: 12,
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  mainInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitleInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  detailsToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  detailsToggleIcon: {
    fontSize: 14,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
  },
  taskDetailsPanel: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: 12,
    marginTop: -1,
  },
  difficultySection: {
    marginBottom: 16,
  },
  detailsSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 80,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666666',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
  },
  taskContent: {
    flex: 1,
    marginHorizontal: 12,
    paddingVertical: 8,
  },
  taskTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 4,
  },
  taskDifficulty: {
    backgroundColor: '#2A2A2A',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  difficultyLabel: {
    color: '#666666',
    fontSize: 12,
  },
  endDayButtonContainer: {
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  endDayButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  endDayButtonText: {
    color: '#000000',
    fontWeight: '600',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  messageIcon: {
    marginRight: 8,
    fontSize: 20,
  },
  messageText: {
    color: '#FFFFFF',
    flex: 1,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  notesIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notesIndicatorText: {
    fontSize: 12,
  },
  pomodoroCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pomodoroCountText: {
    fontSize: 12,
  },
  pomodoroButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  pomodoroButtonText: {
    fontSize: 16,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  taskDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  taskDetailLabel: {
    fontSize: 14,
  },
  taskDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskNotesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    height: 120,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  modalButtonText: {
    fontWeight: '600',
  },
  // Add styles for the delete action
  deleteContainer: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 24,
    color: 'white',
  },
  timerText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  timerNote: {
    fontSize: 10,
    color: '#999999',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  taskList: {
    marginBottom: 24,
  },
  scrollHandleArea: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 10,
  },
  scrollHandle: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  extraScrollSpace: {
    height: 30,
  },
  dateTimeSection: {
    marginBottom: 16,
  },
  dateTimeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  dateTimeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  taskMetaText: {
    fontSize: 12,
  },
  taskDate: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskTime: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});