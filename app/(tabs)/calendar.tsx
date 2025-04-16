import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, Modal, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Storage, Task } from '../../types/storage';
import { 
  getStorageData, 
  setStorageData, 
  checkAndUpdateBadges, 
  getDefaultStorage,
  calculateLevel
} from '../../utils/storage';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleTaskReminder, cancelNotification, playSound, vibrate } from '../../utils/notifications';
import uuid from 'uuid';

// Helper function to check if a date is in the future (ignoring time)
function isFutureDate(date: Date): boolean {
  // Create new date objects to avoid modifying the originals
  const today = new Date();
  const nowDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Ensure we're working with a proper Date object
  const compareDate = new Date(date);
  const compareDateOnly = new Date(compareDate.getFullYear(), compareDate.getMonth(), compareDate.getDate());
  
  // Log the comparison for debugging
  console.log(`[calendar/isFutureDate] Comparing dates - Today: ${nowDateOnly.toISOString().split('T')[0]}, Target: ${compareDateOnly.toISOString().split('T')[0]}`);
  
  return compareDateOnly.getTime() > nowDateOnly.getTime();
}

// Helper function to format time from HH:MM to AM/PM
function formatTime(timeString: string): string {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM/PM
  const formattedMinutes = minutes.toString().padStart(2, '0');
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

// Simple calendar implementation
const Calendar = ({ 
  selectedDate, 
  onSelectDate,
  tasks,
  isDark
}: { 
  selectedDate: Date; 
  onSelectDate: (date: Date) => void;
  tasks: Task[];
  isDark: boolean;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Create calendar days for the month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDayOfMonth = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  
  // Get days with tasks
  const daysWithTasks = tasks.reduce((days: Record<string, number>, task) => {
    if (!task.date) return days; // Skip tasks without dates
    
    const date = new Date(task.date);
    const taskYear = date.getFullYear();
    const taskMonth = date.getMonth();
    
    if (
      taskYear === currentMonth.getFullYear() && 
      taskMonth === currentMonth.getMonth()
    ) {
      const day = date.getDate();
      days[day] = (days[day] || 0) + 1;
    }
    return days;
  }, {});
  
  // Calendar navigation
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const isSelectedDate = (day: number) => {
    return (
      selectedDate.getDate() === day && 
      selectedDate.getMonth() === currentMonth.getMonth() && 
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };
  
  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day && 
      today.getMonth() === currentMonth.getMonth() && 
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Days of the week header
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Create a function to get date for specific day
  const getDateForDay = (day: number) => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
  };
  
  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={previousMonth}>
          <Text style={[styles.calendarNavButton, { color: isDark ? '#FFFFFF' : '#000000' }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.calendarMonthTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={nextMonth}>
          <Text style={[styles.calendarNavButton, { color: isDark ? '#FFFFFF' : '#000000' }]}>→</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.daysOfWeek}>
        {daysOfWeek.map(day => (
          <Text key={day} style={[styles.dayOfWeek, { color: isDark ? '#FFFFFF' : '#000000' }]}>{day}</Text>
        ))}
      </View>
      
      <View style={styles.calendarDays}>
        {/* Empty cells for days before the first day of month */}
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <View key={`empty-${index}`} style={styles.calendarDayEmpty} />
        ))}
        
        {/* Actual days */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const hasTasks = !!daysWithTasks[day];
          
          return (
            <TouchableOpacity
              key={`day-${day}`}
              style={[
                styles.calendarDay,
                isSelectedDate(day) && styles.selectedDay,
                isToday(day) && styles.today,
              ]}
              onPress={() => onSelectDate(getDateForDay(day))}
            >
              <Text 
                style={[
                  styles.calendarDayText, 
                  { color: isDark ? '#FFFFFF' : '#000000' },
                  isSelectedDate(day) && { color: '#FFFFFF' }
                ]}
              >
                {day}
              </Text>
              {hasTasks && (
                <View style={[
                  styles.taskDot, 
                  { backgroundColor: isSelectedDate(day) ? '#FFFFFF' : '#FF6B00' }
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function CalendarScreen() {
  const [storage, setStorage] = useState<Storage | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddTaskModalVisible, setIsAddTaskModalVisible] = useState(false);
  const [isEditTaskModalVisible, setIsEditTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskEffort, setNewTaskEffort] = useState<Task['effort']>('medium');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | null>(null);
  const { isDark } = useTheme();
  
  // Initial data load
  useEffect(() => {
    loadData();
  }, []);
  
  // Reload data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Calendar] Tab focused, reloading data');
      loadData();
      return () => {}; // cleanup function
    }, [])
  );
  
  async function loadData() {
    console.log('[Calendar] Loading data');
    try {
      const data = await getStorageData();
      
      // Ensure all tasks have a date property
      let needsUpdate = false;
      const todayISOString = new Date().toISOString();
      
      data.tasks = data.tasks.map(task => {
        if (!task.date) {
          needsUpdate = true;
          return { ...task, date: todayISOString };
        }
        return task;
      });
      
      // Save updated tasks if needed
      if (needsUpdate) {
        await setStorageData(data);
      }
      
      setStorage(data);
      console.log(`[Calendar] Data loaded successfully with ${data.tasks.length} tasks`);
    } catch (error) {
      console.error('[Calendar] Error loading data:', error);
    }
  }
  
  // Helper function to normalize dates for comparison
  const normalizeDateForComparison = (date: Date | string): string => {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  
  // Filter tasks for the selected date
  const tasksForSelectedDate = storage?.tasks.filter(task => {
    if (!task.date) return false; // Skip tasks without date
    
    // Compare normalized dates (year-month-day) to avoid time issues
    return normalizeDateForComparison(task.date) === normalizeDateForComparison(selectedDate);
  }) || [];
  
  // Add a task for the selected date
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Task Title Required', 'Please enter a title for your task.');
      return;
    }

    const now = new Date();
    const taskDate = new Date(selectedDate); 
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      taskDate.setHours(hours, minutes, 0, 0);
    }

    // Check if this is a future-dated task (compare dates without time)
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate()).getTime();
    const isFutureTask = taskDateOnly > nowDateOnly;
    
    console.log(`[calendar/handleAddTask] Creating task for date: ${taskDate.toISOString()}`);
    console.log(`[calendar/handleAddTask] Is future task: ${isFutureTask}`);

    const newTask: Task = {
      id: uuid.v4(),
      title: newTaskTitle,
      notes: newTaskNotes,
      completed: false,
      effort: newTaskEffort,
      date: taskDate.toISOString(),
      time: selectedTime,
      notificationTime: selectedTime,
    };
    
    // Update the stats
    let updatedStats = { ...storage.stats };
    
    // If this is a future task, increment the calendar tasks counter
    if (isFutureTask) {
      updatedStats.calendarTasksCreated += 1;
      
      // Check for Planner badge if we've created 5+ future tasks
      if (updatedStats.calendarTasksCreated >= 5 && 
          !updatedStats.badges.find(b => b.id === 'planner')?.earned) {
        updatedStats = await checkAndUpdateBadges(updatedStats);
      }
    }
    
    // Save the task first without notification ID
    const newStorage = {
      ...storage,
      tasks: [...storage.tasks, newTask],
      stats: updatedStats,
    };
    
    await setStorageData(newStorage);
    setStorage(newStorage);
    
    // Only schedule a reminder if this is a future task
    if (isFutureTask) {
      try {
        console.log(`[calendar/handleAddTask] Scheduling notification for future task: ${newTask.id}`);
        
        // Wait a little bit before scheduling the notification (helps avoid immediate notifications)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Schedule the notification with the suppressImmediateSound flag
        const notificationId = await scheduleTaskReminder(newTask);
        
        if (notificationId) {
          console.log(`[calendar/handleAddTask] Future task notification scheduled with ID: ${notificationId}`);
          
          // Update the task with the notification ID
          const updatedTasks = newStorage.tasks.map(t => 
            t.id === newTask.id 
              ? { ...t, notificationId } 
              : t
          );
          
          const updatedStorage = {
            ...newStorage,
            tasks: updatedTasks
          };
          
          await setStorageData(updatedStorage);
          setStorage(updatedStorage);
          console.log(`[calendar/handleAddTask] Successfully updated task with notification ID`);
        } else {
          console.log(`[calendar/handleAddTask] No notification ID returned (might have been skipped)`);
        }
      } catch (error) {
        console.error('[calendar/handleAddTask] Error scheduling notification:', error);
        // Continue without notification
      }
    } else {
      console.log(`[calendar/handleAddTask] Task is not a future task, not scheduling notification`);
    }
    
    resetTaskForm();
    setIsAddTaskModalVisible(false);
  };
  
  // Handle task completion toggle
  const handleToggleTask = async (id: string) => {
    if (!storage) return;
    
    const task = storage.tasks.find(t => t.id === id);
    if (!task) return;
    
    // Toggle the task's completed state
    const isCompleting = !task.completed;
    
    // Play sound when completing a task
    if (isCompleting) {
      try {
        await playSound('task-complete');
        await vibrate();
      } catch (error) {
        console.error("Error with sound or vibration:", error);
      }
    }
    
    // If completing the task, cancel any scheduled notifications
    if (isCompleting && task.notificationId) {
      await cancelNotification(task.notificationId);
    }
    
    const newTasks = storage.tasks.map(t =>
      t.id === id ? { 
        ...t, 
        completed: !t.completed,
        notificationId: isCompleting ? undefined : t.notificationId
      } : t
    );
    
    // Calculate XP for completed tasks - same as in the main tasks screen
    let newXp = storage.stats.xp;
    // Update task completion counters
    let tasksCompleted = storage.stats.tasksCompleted;
    let hardTasksCompleted = storage.stats.hardTasksCompleted;
    let dailyTasksCompleted = storage.stats.dailyTasksCompleted;
    
    if (isCompleting) { // Task is being completed
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

    // Check and award badges if that function is available
    if (typeof checkAndUpdateBadges === 'function') {
      updatedStats = await checkAndUpdateBadges(updatedStats);
    }
    
    const newStorage = {
      ...storage,
      tasks: newTasks,
      stats: updatedStats,
    };
    
    await setStorageData(newStorage);
    setStorage(newStorage);
  };
  
  // Delete a task
  const handleDeleteTask = async (id: string) => {
    if (!storage) return;
    
    const newTasks = storage.tasks.filter(task => task.id !== id);
    
    const newStorage = {
      ...storage,
      tasks: newTasks,
    };
    
    await setStorageData(newStorage);
    setStorage(newStorage);
  };
  
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString(undefined, options);
  };
  
  // Handle time picker
  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      setSelectedTime(time);
    }
  };
  
  const openTimePicker = () => {
    setShowTimePicker(true);
  };
  
  // Handle date picker
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      // Update the correct date based on which modal is active
      if (activeModal === 'add') {
        setSelectedDate(date);
      } else if (activeModal === 'edit') {
        setEditDate(date);
      }
    }
  };
  
  // Open the Add Task Modal
  const openAddTaskModal = () => {
    setActiveModal('add');
    setIsAddTaskModalVisible(true);
  };
  
  // Open the date picker with the correct active modal set
  const openDatePicker = (modal: 'add' | 'edit') => {
    setActiveModal(modal);
    setShowDatePicker(true);
  };
  
  // Handle opening the edit modal
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskNotes(task.notes || '');
    setNewTaskEffort(task.effort);
    
    // Set the edit date
    if (task.date) {
      setEditDate(new Date(task.date));
    } else {
      setEditDate(new Date());
    }
    
    // Set the time if it exists
    if (task.time) {
      const [hours, minutes] = task.time.split(':').map(Number);
      const timeDate = new Date();
      timeDate.setHours(hours, minutes, 0, 0);
      setSelectedTime(timeDate);
    } else {
      setSelectedTime(null);
    }
    
    setActiveModal('edit');
    setIsEditTaskModalVisible(true);
  };
  
  // Save the edited task
  const saveEditedTask = async () => {
    if (!storage || !editingTask) return;
    
    if (!newTaskTitle.trim()) {
      Alert.alert('Task Title Required', 'Please enter a title for your task.');
      return;
    }
    
    // Format time for storage
    let timeString = null;
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      timeString = `${hours}:${minutes}`;
    }
    
    // Set time on edit date if provided
    const taskDate = new Date(editDate);
    if (selectedTime) {
      taskDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    }
    
    // Check if date changed and if we need to schedule a new notification
    const dateChanged = editingTask.date !== taskDate.toISOString();
    const timeChanged = editingTask.time !== timeString;
    const needsNewNotification = dateChanged || timeChanged;
    
    // Cancel existing notification if date or time changed
    if (needsNewNotification && editingTask.notificationId) {
      await cancelNotification(editingTask.notificationId);
    }
    
    // Create updated task object
    const updatedTask: Task = {
      ...editingTask,
      title: newTaskTitle,
      notes: newTaskNotes,
      effort: newTaskEffort,
      date: taskDate.toISOString(),
      time: timeString,
      notificationTime: timeString,
      // Clear notification ID if we need to reschedule
      notificationId: needsNewNotification ? undefined : editingTask.notificationId
    };
    
    // Update tasks array
    const newTasks = storage.tasks.map(t => 
      t.id === editingTask.id ? updatedTask : t
    );
    
    // Save updated tasks
    const newStorage = {
      ...storage,
      tasks: newTasks,
    };
    
    await setStorageData(newStorage);
    setStorage(newStorage);
    
    // Schedule a new notification if needed
    if (needsNewNotification) {
      // Check if this is a future-dated task
      const now = new Date();
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate()).getTime();
      const isFutureTask = taskDateOnly > nowDateOnly || 
                          (taskDateOnly === nowDateOnly && timeString && 
                           `${now.getHours()}:${now.getMinutes()}` < timeString);
      
      if (isFutureTask) {
        try {
          // Schedule the notification
          const notificationId = await scheduleTaskReminder(updatedTask);
          
          if (notificationId) {
            // Update the task with the notification ID
            const updatedTasks = newTasks.map(t => 
              t.id === updatedTask.id 
                ? { ...t, notificationId } 
                : t
            );
            
            const updatedStorage = {
              ...newStorage,
              tasks: updatedTasks
            };
            
            await setStorageData(updatedStorage);
            setStorage(updatedStorage);
          }
        } catch (error) {
          console.error('Error scheduling notification:', error);
          // Continue without notification
        }
      }
    }
    
    // Reset and close modal
    setEditingTask(null);
    resetTaskForm();
    setIsEditTaskModalVisible(false);
  };
  
  // Reset formatting when resetting the form
  const resetTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskNotes('');
    setNewTaskEffort('medium');
    setSelectedTime(null);
    setEditDate(new Date());
  };
  
  if (!storage) return null;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F8FAFC' }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>Calendar</Text>
        </View>
        
        <Calendar 
          selectedDate={selectedDate} 
          onSelectDate={setSelectedDate}
          tasks={storage.tasks}
          isDark={isDark}
        />
        
        <View style={styles.selectedDateHeader}>
          <Text style={[styles.selectedDateText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            {formatDate(selectedDate)}
          </Text>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}
            onPress={openAddTaskModal}
          >
            <Text style={[styles.addButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Add Task</Text>
          </TouchableOpacity>
        </View>
        
        {tasksForSelectedDate.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              No tasks for this date
            </Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {tasksForSelectedDate.map(task => (
              <View 
                key={task.id}
                style={[styles.taskItem, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}
              >
                <TouchableOpacity
                  style={[styles.checkbox, { 
                    borderColor: isDark ? '#666666' : '#94A3B8',
                    backgroundColor: task.completed ? (isDark ? '#666666' : '#94A3B8') : 'transparent' 
                  }]}
                  onPress={() => handleToggleTask(task.id)}
                >
                  {task.completed && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <View style={styles.taskContent}>
                  <Text 
                    style={[
                      styles.taskTitle, 
                      { 
                        color: isDark ? '#FFFFFF' : '#000000',
                        textDecorationLine: task.completed ? 'line-through' : 'none'
                      }
                    ]}
                  >
                    {task.title}
                  </Text>
                  {task.notes ? (
                    <Text style={[styles.taskNotes, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      {task.notes}
                    </Text>
                  ) : null}
                  <View style={styles.taskMeta}>
                    <View style={[styles.taskEffort, { backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9' }]}>
                      <Text style={[styles.taskEffortText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        {task.effort} ({task.effort === 'easy' ? '5' : task.effort === 'medium' ? '10' : '15'} XP)
                      </Text>
                    </View>
                    {task.time && (
                      <View style={[styles.taskTime, { backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9' }]}>
                        <Text style={[styles.taskTimeText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          🕒 {formatTime(task.time)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.taskActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditTask(task)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                  onPress={() => handleDeleteTask(task.id)}
                >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* Add Task Modal */}
      <Modal
        visible={isAddTaskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddTaskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Add Task for {formatDate(selectedDate)}
            </Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9',
                color: isDark ? '#FFFFFF' : '#000000',
              }]}
              placeholder="Task title..."
              placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            
            <TextInput
              style={[styles.notesInput, { 
                backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9',
                color: isDark ? '#FFFFFF' : '#000000',
              }]}
              placeholder="Notes (optional)..."
              placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
              value={newTaskNotes}
              onChangeText={setNewTaskNotes}
              multiline
            />
            
            <Text style={[styles.sectionLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>Difficulty:</Text>
            <View style={styles.difficultyButtons}>
              <TouchableOpacity
                style={[
                  styles.difficultyButton,
                  { backgroundColor: newTaskEffort === 'easy' ? '#10B981' : (isDark ? '#333333' : '#E2E8F0') }
                ]}
                onPress={() => setNewTaskEffort('easy')}
              >
                <Text style={[
                  styles.difficultyButtonText, 
                  { color: newTaskEffort === 'easy' ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#000000') }
                ]}>
                  Easy (5 XP)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.difficultyButton,
                  { backgroundColor: newTaskEffort === 'medium' ? '#0EA5E9' : (isDark ? '#333333' : '#E2E8F0') }
                ]}
                onPress={() => setNewTaskEffort('medium')}
              >
                <Text style={[
                  styles.difficultyButtonText, 
                  { color: newTaskEffort === 'medium' ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#000000') }
                ]}>
                  Medium (10 XP)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.difficultyButton,
                  { backgroundColor: newTaskEffort === 'hard' ? '#EF4444' : (isDark ? '#333333' : '#E2E8F0') }
                ]}
                onPress={() => setNewTaskEffort('hard')}
              >
                <Text style={[
                  styles.difficultyButtonText, 
                  { color: newTaskEffort === 'hard' ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#000000') }
                ]}>
                  Hard (15 XP)
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeColumn}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>Date:</Text>
                <TouchableOpacity 
                  style={[styles.timeButton, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}
                  onPress={() => openDatePicker('add')}
                >
                  <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
                    {selectedDate ? selectedDate.toDateString() : "Select Date"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateTimeColumn}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>Time:</Text>
            <TouchableOpacity 
              style={[styles.timeButton, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}
              onPress={openTimePicker}
            >
              <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
                {selectedTime 
                  ? formatTime(`${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`) 
                  : "Set Time (Optional)"}
              </Text>
            </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}
                onPress={() => setIsAddTaskModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  { 
                    backgroundColor: newTaskTitle.trim() ? '#FF6B00' : (isDark ? '#444444' : '#CBD5E1'),
                    opacity: newTaskTitle.trim() ? 1 : 0.5
                  }
                ]}
                onPress={handleAddTask}
                disabled={!newTaskTitle.trim()}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Edit Task Modal */}
      <Modal
        visible={isEditTaskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditTaskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Edit Task
            </Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9',
                color: isDark ? '#FFFFFF' : '#000000',
              }]}
              placeholder="Task title..."
              placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            
            <TextInput
              style={[styles.notesInput, { 
                backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9',
                color: isDark ? '#FFFFFF' : '#000000',
              }]}
              placeholder="Notes (optional)..."
              placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
              value={newTaskNotes}
              onChangeText={setNewTaskNotes}
              multiline
            />
            
            <Text style={[styles.sectionLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>Difficulty:</Text>
            <View style={styles.difficultyButtons}>
              <TouchableOpacity
                style={[
                  styles.difficultyButton,
                  { backgroundColor: newTaskEffort === 'easy' ? '#10B981' : (isDark ? '#333333' : '#E2E8F0') }
                ]}
                onPress={() => setNewTaskEffort('easy')}
              >
                <Text style={[
                  styles.difficultyButtonText, 
                  { color: newTaskEffort === 'easy' ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#000000') }
                ]}>
                  Easy (5 XP)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.difficultyButton,
                  { backgroundColor: newTaskEffort === 'medium' ? '#0EA5E9' : (isDark ? '#333333' : '#E2E8F0') }
                ]}
                onPress={() => setNewTaskEffort('medium')}
              >
                <Text style={[
                  styles.difficultyButtonText, 
                  { color: newTaskEffort === 'medium' ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#000000') }
                ]}>
                  Medium (10 XP)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.difficultyButton,
                  { backgroundColor: newTaskEffort === 'hard' ? '#EF4444' : (isDark ? '#333333' : '#E2E8F0') }
                ]}
                onPress={() => setNewTaskEffort('hard')}
              >
                <Text style={[
                  styles.difficultyButtonText, 
                  { color: newTaskEffort === 'hard' ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#000000') }
                ]}>
                  Hard (15 XP)
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeColumn}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>Date:</Text>
                <TouchableOpacity 
                  style={[styles.timeButton, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}
                  onPress={() => openDatePicker('edit')}
                >
                  <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
                    {editDate ? editDate.toDateString() : "Select Date"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateTimeColumn}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>Time:</Text>
                <TouchableOpacity 
                  style={[styles.timeButton, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}
                  onPress={openTimePicker}
                >
                  <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
                    {selectedTime 
                      ? formatTime(`${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`) 
                      : "Set Time (Optional)"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}
                onPress={() => {
                  setIsEditTaskModalVisible(false);
                  setEditingTask(null);
                  resetTaskForm();
                }}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  { 
                    backgroundColor: newTaskTitle.trim() ? '#FF6B00' : (isDark ? '#444444' : '#CBD5E1'),
                    opacity: newTaskTitle.trim() ? 1 : 0.5
                  }
                ]}
                onPress={saveEditedTask}
                disabled={!newTaskTitle.trim()}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={editDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      
      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime || new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Calendar styles
  calendarContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarMonthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  calendarNavButton: {
    fontSize: 24,
    padding: 8,
  },
  daysOfWeek: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeek: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  calendarDayEmpty: {
    width: '14.28%',
    height: 40,
  },
  calendarDayText: {
    fontSize: 14,
  },
  selectedDay: {
    backgroundColor: '#FF6B00',
    borderRadius: 20,
  },
  today: {
    borderWidth: 1,
    borderColor: '#FF6B00',
    borderRadius: 20,
  },
  taskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  // Selected date header
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
  },
  // Task list
  taskList: {
    marginBottom: 24,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  taskNotes: {
    fontSize: 14,
    marginTop: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  taskEffort: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  taskEffortText: {
    fontSize: 12,
  },
  taskTime: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  taskTimeText: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesInput: {
    padding: 12,
    borderRadius: 8,
    height: 100,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  difficultyButtons: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  difficultyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  actionButtonText: {
    fontSize: 16,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  dateTimeColumn: {
    flex: 1,
  },
}); 