import AsyncStorage from '@react-native-async-storage/async-storage';
import { Storage, Task, Stats, Badge } from '../types/storage';

const STORAGE_KEY = '@productivity_app';

export const DEFAULT_BADGES: Badge[] = [
  // Beginner badges - Easy to obtain
  {
    id: 'first-step',
    title: 'First Step',
    description: 'Complete your first task',
    emoji: '🌱',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Add a task before 8am',
    emoji: '🐦',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'note-beginner',
    title: 'Note Taker',
    description: 'Create your first note',
    emoji: '📄',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'three-day-streak',
    title: 'Getting Started',
    description: 'Maintain a 3-day streak',
    emoji: '🔥',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'daily-five',
    title: 'Daily Five',
    description: 'Complete 5 tasks in a single day',
    emoji: '✋',
    earned: false,
    earnedAt: null,
  },
  
  // Intermediate badges - Require more effort
  {
    id: 'streak-hero',
    title: '5-Day Streak Hero',
    description: 'Maintain a 5+ day streak',
    emoji: '🏃',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'xp-earner',
    title: '100 XP Earner',
    description: 'Earn 100+ total XP',
    emoji: '⭐',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'pomodoro-pro',
    title: 'Pomodoro Pro',
    description: 'Complete 10+ Pomodoro sessions',
    emoji: '⏰',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'note-taker',
    title: 'Note Expert',
    description: 'Create 5+ notes',
    emoji: '📝',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'task-master',
    title: 'Task Master',
    description: 'Complete 20+ tasks',
    emoji: '✅',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'hard-worker',
    title: 'Hard Worker',
    description: 'Complete 5+ hard difficulty tasks',
    emoji: '💪',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'planner',
    title: 'Planner',
    description: 'Add 5+ future tasks using the calendar',
    emoji: '📅',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'weekend-warrior',
    title: 'Weekend Warrior',
    description: 'Complete tasks on both Saturday and Sunday',
    emoji: '🏆',
    earned: false,
    earnedAt: null,
  },
  
  // Advanced badges - Challenging to obtain
  {
    id: 'consistent-streak',
    title: 'Consistency King',
    description: 'Maintain a 10+ day streak',
    emoji: '👑',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'xp-master',
    title: 'XP Master',
    description: 'Earn 250+ total XP',
    emoji: '🏆',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'pomodoro-master',
    title: 'Pomodoro Master',
    description: 'Complete 25+ Pomodoro sessions',
    emoji: '⌚',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'extreme-focus',
    title: 'Extreme Focus',
    description: 'Complete 5 Pomodoro sessions in a single day',
    emoji: '🧠',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'organization-expert',
    title: 'Organization Expert',
    description: 'Create 15+ notes',
    emoji: '📊',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'heavy-lifter',
    title: 'Heavy Lifter',
    description: 'Complete 15+ hard difficulty tasks',
    emoji: '🏋️',
    earned: false,
    earnedAt: null,
  },
  
  // Elite badges - Very challenging to obtain
  {
    id: 'month-streak',
    title: 'Monthly Mastery',
    description: 'Maintain a 30+ day streak',
    emoji: '🌟',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'xp-legend',
    title: 'XP Legend',
    description: 'Earn 500+ total XP',
    emoji: '🥇',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'xp-titan',
    title: 'XP Titan',
    description: 'Earn 1000+ total XP',
    emoji: '🔱',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'xp-immortal',
    title: 'XP Immortal',
    description: 'Earn 5000+ total XP',
    emoji: '⚡',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'task-legend',
    title: 'Task Legend',
    description: 'Complete 100+ tasks',
    emoji: '🌠',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'ultimate-pomodoro',
    title: 'Ultimate Pomodoro',
    description: 'Complete 50+ Pomodoro sessions',
    emoji: '🕰️',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'productivity-guru',
    title: 'Productivity Guru',
    description: 'Earn all other badges',
    emoji: '🧘',
    earned: false,
    earnedAt: null,
  }
];

export async function getStorageData(): Promise<Storage> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsedData = JSON.parse(data);
      // Initialize notes array if it doesn't exist (for backward compatibility)
      if (!parsedData.notes) {
        parsedData.notes = [];
      }
      
      // Initialize new stats fields if they don't exist
      if (!parsedData.stats.tasksCompleted) {
        parsedData.stats.tasksCompleted = 0;
      }
      if (!parsedData.stats.hardTasksCompleted) {
        parsedData.stats.hardTasksCompleted = 0;
      }
      if (!parsedData.stats.notesCreated) {
        parsedData.stats.notesCreated = 0;
      }
      
      // Initialize additional stats fields for badges
      if (!parsedData.stats.dailyTasksCompleted) {
        parsedData.stats.dailyTasksCompleted = 0;
      }
      if (!parsedData.stats.dailyPomodorosCompleted) {
        parsedData.stats.dailyPomodorosCompleted = 0;
      }
      if (!parsedData.stats.calendarTasksCreated) {
        parsedData.stats.calendarTasksCreated = 0;
      }
      if (parsedData.stats.saturdayCompleted === undefined) {
        parsedData.stats.saturdayCompleted = false;
      }
      if (parsedData.stats.sundayCompleted === undefined) {
        parsedData.stats.sundayCompleted = false;
      }
      
      return parsedData;
    }
    return {
      tasks: [],
      stats: {
        streak: 0,
        freezeTokens: 0,
        xp: 0,
        pomodoroXp: 0,
        totalPomodoros: 0,
        level: 1,
        lastEndDay: null,
        badges: [],
        tasksCompleted: 0,
        hardTasksCompleted: 0,
        notesCreated: 0,
        dailyTasksCompleted: 0,
        dailyPomodorosCompleted: 0,
        calendarTasksCreated: 0,
        saturdayCompleted: false,
        sundayCompleted: false,
      },
      notes: [],
    };
  } catch (error) {
    console.error('Error loading data:', error);
    return {
      tasks: [],
      stats: {
        streak: 0,
        freezeTokens: 0,
        xp: 0,
        pomodoroXp: 0,
        totalPomodoros: 0,
        level: 1,
        lastEndDay: null,
        badges: [],
        tasksCompleted: 0,
        hardTasksCompleted: 0,
        notesCreated: 0,
        dailyTasksCompleted: 0,
        dailyPomodorosCompleted: 0,
        calendarTasksCreated: 0,
        saturdayCompleted: false,
        sundayCompleted: false,
      },
      notes: [],
    };
  }
}

export async function setStorageData(data: Storage): Promise<void> {
  try {
    // Calculate approximate size for diagnostic purposes
    const jsonData = JSON.stringify(data);
    const sizeInKB = (jsonData.length / 1024).toFixed(2);
    
    // Log more detailed information
    console.log(`[setStorageData] Saving data to AsyncStorage (${sizeInKB} KB)`);
    console.log(`[setStorageData] Stats summary: freezeTokens: ${data.stats.freezeTokens}, tasks: ${data.tasks.length}, level: ${data.stats.level}`);
    
    // Ensure we're saving the data correctly
    await AsyncStorage.setItem(STORAGE_KEY, jsonData);
    console.log('[setStorageData] Data saved successfully');
  } catch (error) {
    console.error('[setStorageData] !!! ERROR SAVING DATA !!!', error);
    // Rethrow the error so the caller can handle it appropriately
    throw new Error(`Failed to save data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function calculateLevel(xp: number): number {
  if (xp < 100) return 1;
  if (xp < 250) return 2;
  if (xp < 500) return 3;
  if (xp < 1000) return 4;
  if (xp < 2000) return 5;
  if (xp < 3000) return 6;
  if (xp < 5000) return 7;
  if (xp < 7500) return 8;
  if (xp < 10000) return 9;
  return 10;
}

export function getLevelTitle(level: number): string {
  switch (level) {
    case 1:
      return 'Beginner';
    case 2:
      return 'Explorer';
    case 3:
      return 'Master';
    case 4:
      return 'Champion';
    case 5:
      return 'Expert';
    case 6:
      return 'Guru';
    case 7:
      return 'Virtuoso';
    case 8:
      return 'Legend';
    case 9:
      return 'Titan';
    case 10:
      return 'Mythic';
    default:
      return 'Unknown';
  }
}

export function getTaskXP(effort: Task['effort']): number {
  switch (effort) {
    case 'easy':
      return 2;
    case 'medium':
      return 5;
    case 'hard':
      return 10;
    default:
      return 0;
  }
}

export function hasStreakExpired(lastEndDay: string): boolean {
  const lastDay = new Date(lastEndDay);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - lastDay.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 1;
}

export function isNewDay(lastEndDay: string | null): boolean {
  if (!lastEndDay) return true;
  
  const lastDate = new Date(lastEndDay);
  const today = new Date();
  
  return (
    lastDate.getDate() !== today.getDate() ||
    lastDate.getMonth() !== today.getMonth() ||
    lastDate.getFullYear() !== today.getFullYear()
  );
}

export function shouldEarnFreezeToken(stats: Stats): boolean {
  const shouldEarn = stats.streak > 0 && stats.streak % 7 === 0;
  if (stats.streak % 7 === 0 && stats.streak > 0) {
    console.log(`Streak ${stats.streak} reached - awarding freeze token`);
  }
  return shouldEarn;
}

export function getMotivationalMessage(): string {
  const messages = [
    'Great job! Keep up the momentum! 🚀',
    'You\'re making progress! Keep going! 💪',
    'Another day conquered! 🌟',
    'You\'re on fire! 🔥',
    'Success is built one day at a time! ⭐',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Automatically ends the day, awarding XP for completed tasks and incrementing streak if tasks were completed.
 * Called at app startup to process the previous day if user forgot to click "End Day" manually
 */
export async function autoEndDay(storage: Storage): Promise<Storage | null> {
  // If there's no storage data or it's not a new day, return null (no changes needed)
  if (!storage || !storage.stats.lastEndDay || !isNewDay(storage.stats.lastEndDay)) {
    return null;
  }
  
  console.log('[autoEndDay] A new day has been detected, processing auto-end-day');
  
  // Count completed tasks for yesterday
  const completedTasks = storage.tasks.filter(task => task.completed);
  const totalTasks = storage.tasks.length;
  const completionPercentage = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
  
  // If we've completed at least 90% of tasks, or if we've completed at least one task, 
  // count it for the streak (this ensures people with just a few tasks don't lose their streak)
  const taskThresholdMet = completionPercentage >= 90 || (totalTasks > 0 && completedTasks.length > 0);
  console.log(`[autoEndDay] Task threshold check: ${completedTasks.length} completed tasks out of ${totalTasks} total tasks`);
  console.log(`[autoEndDay] Completion percentage: ${completionPercentage.toFixed(1)}%, threshold met: ${taskThresholdMet}`);
  
  // Handle streak based on task completion, similar to handleEndDay
  let newStreak;
  let newFreezeTokens = storage.stats.freezeTokens;
  let customMessage = null;
  
  if (taskThresholdMet) {
    // If we completed tasks, increment streak
    newStreak = storage.stats.streak + 1;
    
    // Check if we earned a freeze token at this streak milestone
    console.log(`[autoEndDay] Current streak: ${storage.stats.streak}, New streak: ${newStreak}, Current freeze tokens: ${storage.stats.freezeTokens}`);
    
    // Check if the new streak is a multiple of 7
    if (newStreak % 7 === 0) {
      newFreezeTokens++;
      console.log(`[autoEndDay] Earned freeze token at streak ${newStreak}! New count: ${newFreezeTokens}`);
    }
  } else {
    // No tasks completed - should decrease streak or use freeze token
    console.log(`[autoEndDay] No tasks completed. Checking for freeze tokens (current: ${newFreezeTokens})`);
    if (newFreezeTokens > 0) {
      // Use a freeze token to maintain streak
      newStreak = storage.stats.streak;
      newFreezeTokens--;
      customMessage = "Used a freeze token to protect your streak! ❄️";
      console.log(`[autoEndDay] Used a freeze token to protect streak! Tokens remaining: ${newFreezeTokens}`);
    } else {
      // No freeze tokens, reset streak
      newStreak = 0;
      customMessage = "Your streak has been reset. Complete tasks today to start a new streak!";
      console.log(`[autoEndDay] No freeze tokens available. Streak reset to 0.`);
    }
  }
  
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Update weekend warrior tracking
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
  
  // Reset weekend warrior tracking on Monday
  if (dayOfWeek === 1) {
    saturdayCompleted = false;
    sundayCompleted = false;
  }
  
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
  
  // Additional XP from pomodoros - this XP is from task completion with pomodoros
  // and is separate from the pomodoroXp that was already added to total XP
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
  
  // Note: storage.stats.pomodoroXp is already added to total XP when pomodoros are completed
  // so we don't add it again here
  const newXp = storage.stats.xp + taskXp + pomodoroXp;
  const newLevel = calculateLevel(newXp);
  console.log(`[autoEndDay] XP: ${storage.stats.xp} + ${taskXp} + ${pomodoroXp} = ${newXp}, Level: ${newLevel}`);
  
  // Check for Daily Five badge
  const earnedDailyFive = storage.stats.dailyTasksCompleted >= 5;
  
  // Check for Weekend Warrior badge
  const earnedWeekendWarrior = saturdayCompleted && sundayCompleted;
  
  const newStats = {
    ...storage.stats,
    streak: newStreak,
    freezeTokens: newFreezeTokens,
    xp: newXp,
    pomodoroXp: 0, // Reset daily Pomodoro XP
    level: newLevel,
    lastEndDay: new Date().toISOString(),
    dailyTasksCompleted: 0, // Reset for new day
    dailyPomodorosCompleted: 0, // Reset for new day
    saturdayCompleted,
    sundayCompleted,
  };
  
  // Add badges if earned
  let updatedStats = newStats;
  
  // Daily Five badge
  if (earnedDailyFive && !storage.stats.badges.find(b => b.id === 'daily-five')?.earned) {
    const badgeStats = {
      ...updatedStats,
      badges: [
        ...updatedStats.badges,
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
    updatedStats = badgeStats;
  }
  
  // Weekend Warrior badge
  if (earnedWeekendWarrior && !updatedStats.badges.find(b => b.id === 'weekend-warrior')?.earned) {
    const badgeStats = {
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
    updatedStats = badgeStats;
  }
  
  // Check and award other badges
  updatedStats = checkAndAwardBadges(updatedStats);
  
  const newStorage: Storage = {
    tasks: storage.tasks.map((task) => ({
      ...task,
      completed: false,
      pomodoroCount: 0,
      pomodoroActive: false,
      pomodoroEndTime: null,
    })),
    stats: updatedStats,
    notes: storage.notes,
  };
  
  // Log a very clear summary of what happened with the streak
  if (storage.stats.streak !== newStreak) {
    if (newStreak > storage.stats.streak) {
      console.log(`[autoEndDay] STREAK INCREASED: ${storage.stats.streak} → ${newStreak} (tasks completed: ${completedTasks.length})`);
    } else if (newStreak === 0) {
      console.log(`[autoEndDay] STREAK RESET: ${storage.stats.streak} → 0 (no tasks completed, no freeze tokens)`);
    } else {
      console.log(`[autoEndDay] STREAK MAINTAINED: ${newStreak} (used freeze token)`);
    }
  } else {
    console.log(`[autoEndDay] STREAK UNCHANGED: ${newStreak}`);
  }
  
  return newStorage;
}

export function checkAndAwardBadges(stats: Stats): Stats {
  const newBadges = [...stats.badges];
  const today = new Date();
  const todayDate = today.toISOString();
  
  // Beginner badges
  
  // First Step - Complete first task
  if (stats.tasksCompleted >= 1 && !newBadges.find(b => b.id === 'first-step')?.earned) {
    newBadges.push({
      id: 'first-step',
      title: 'First Step',
      description: 'Complete your first task',
      emoji: '🌱',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Early Bird - Add a task before 8am
  // This will be handled in the task creation section when a task is added before 8am
  
  // Note Beginner - Create first note
  if (stats.notesCreated >= 1 && !newBadges.find(b => b.id === 'note-beginner')?.earned) {
    newBadges.push({
      id: 'note-beginner',
      title: 'Note Taker',
      description: 'Create your first note',
      emoji: '📄',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Getting Started - 3-day streak
  if (stats.streak >= 3 && !newBadges.find(b => b.id === 'three-day-streak')?.earned) {
    newBadges.push({
      id: 'three-day-streak',
      title: 'Getting Started',
      description: 'Maintain a 3-day streak',
      emoji: '🔥',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Daily Five - Complete 5 tasks in one day will be tracked during end-day
  
  // Intermediate badges
  
  // Streak Hero Badge
  if (stats.streak >= 5 && !newBadges.find(b => b.id === 'streak-hero')?.earned) {
    newBadges.push({
      id: 'streak-hero',
      title: '5-Day Streak Hero',
      description: 'Maintain a 5+ day streak',
      emoji: '🏃',
      earned: true,
      earnedAt: todayDate,
    });
  }

  // XP Earner Badge
  if (stats.xp >= 100 && !newBadges.find(b => b.id === 'xp-earner')?.earned) {
    newBadges.push({
      id: 'xp-earner',
      title: '100 XP Earner',
      description: 'Earn 100+ total XP',
      emoji: '⭐',
      earned: true,
      earnedAt: todayDate,
    });
  }

  // Pomodoro Pro Badge
  if (stats.totalPomodoros >= 10 && !newBadges.find(b => b.id === 'pomodoro-pro')?.earned) {
    newBadges.push({
      id: 'pomodoro-pro',
      title: 'Pomodoro Pro',
      description: 'Complete 10+ Pomodoro sessions',
      emoji: '⏰',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Note Expert Badge
  if (stats.notesCreated >= 5 && !newBadges.find(b => b.id === 'note-taker')?.earned) {
    newBadges.push({
      id: 'note-taker',
      title: 'Note Expert',
      description: 'Create 5+ notes',
      emoji: '📝',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Task Master Badge
  if (stats.tasksCompleted >= 20 && !newBadges.find(b => b.id === 'task-master')?.earned) {
    newBadges.push({
      id: 'task-master',
      title: 'Task Master',
      description: 'Complete 20+ tasks',
      emoji: '✅',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Hard Worker Badge
  if (stats.hardTasksCompleted >= 5 && !newBadges.find(b => b.id === 'hard-worker')?.earned) {
    newBadges.push({
      id: 'hard-worker',
      title: 'Hard Worker',
      description: 'Complete 5+ hard difficulty tasks',
      emoji: '💪',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Planner badge - Add 5+ future tasks using the calendar
  // This will be handled in the calendar task creation
  
  // Weekend Warrior - Complete tasks on both Saturday and Sunday
  // This will be checked during end-day processing
  
  // Advanced badges
  
  // Consistent Streak Badge
  if (stats.streak >= 10 && !newBadges.find(b => b.id === 'consistent-streak')?.earned) {
    newBadges.push({
      id: 'consistent-streak',
      title: 'Consistency King',
      description: 'Maintain a 10+ day streak',
      emoji: '👑',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // XP Master Badge
  if (stats.xp >= 250 && !newBadges.find(b => b.id === 'xp-master')?.earned) {
    newBadges.push({
      id: 'xp-master',
      title: 'XP Master',
      description: 'Earn 250+ total XP',
      emoji: '🏆',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Pomodoro Master
  if (stats.totalPomodoros >= 25 && !newBadges.find(b => b.id === 'pomodoro-master')?.earned) {
    newBadges.push({
      id: 'pomodoro-master',
      title: 'Pomodoro Master',
      description: 'Complete 25+ Pomodoro sessions',
      emoji: '⌚',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Extreme Focus - Complete 5 Pomodoro sessions in a single day
  // This will be checked during Pomodoro completion
  
  // Organization Expert
  if (stats.notesCreated >= 15 && !newBadges.find(b => b.id === 'organization-expert')?.earned) {
    newBadges.push({
      id: 'organization-expert',
      title: 'Organization Expert',
      description: 'Create 15+ notes',
      emoji: '📊',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Heavy Lifter
  if (stats.hardTasksCompleted >= 15 && !newBadges.find(b => b.id === 'heavy-lifter')?.earned) {
    newBadges.push({
      id: 'heavy-lifter',
      title: 'Heavy Lifter',
      description: 'Complete 15+ hard difficulty tasks',
      emoji: '🏋️',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Elite badges
  
  // Monthly Mastery
  if (stats.streak >= 30 && !newBadges.find(b => b.id === 'month-streak')?.earned) {
    newBadges.push({
      id: 'month-streak',
      title: 'Monthly Mastery',
      description: 'Maintain a 30+ day streak',
      emoji: '🌟',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // XP Legend
  if (stats.xp >= 500 && !newBadges.find(b => b.id === 'xp-legend')?.earned) {
    newBadges.push({
      id: 'xp-legend',
      title: 'XP Legend',
      description: 'Earn 500+ total XP',
      emoji: '🥇',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // XP Titan Badge
  if (stats.xp >= 1000 && !newBadges.find(b => b.id === 'xp-titan')?.earned) {
    newBadges.push({
      id: 'xp-titan',
      title: 'XP Titan',
      description: 'Earn 1000+ total XP',
      emoji: '🔱',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // XP Immortal Badge
  if (stats.xp >= 5000 && !newBadges.find(b => b.id === 'xp-immortal')?.earned) {
    newBadges.push({
      id: 'xp-immortal',
      title: 'XP Immortal',
      description: 'Earn 5000+ total XP',
      emoji: '⚡',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Task Legend
  if (stats.tasksCompleted >= 100 && !newBadges.find(b => b.id === 'task-legend')?.earned) {
    newBadges.push({
      id: 'task-legend',
      title: 'Task Legend',
      description: 'Complete 100+ tasks',
      emoji: '🌠',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Ultimate Pomodoro
  if (stats.totalPomodoros >= 50 && !newBadges.find(b => b.id === 'ultimate-pomodoro')?.earned) {
    newBadges.push({
      id: 'ultimate-pomodoro',
      title: 'Ultimate Pomodoro',
      description: 'Complete 50+ Pomodoro sessions',
      emoji: '🕰️',
      earned: true,
      earnedAt: todayDate,
    });
  }
  
  // Productivity Guru - Earn all other badges
  // Get all badge IDs except 'productivity-guru'
  const allOtherBadgeIds = DEFAULT_BADGES
    .filter(badge => badge.id !== 'productivity-guru')
    .map(badge => badge.id);
  
  // Check if the user has earned all other badges
  const hasAllBadges = allOtherBadgeIds.every(id => 
    newBadges.some(badge => badge.id === id && badge.earned)
  );
  
  if (hasAllBadges && !newBadges.find(b => b.id === 'productivity-guru')?.earned) {
    newBadges.push({
      id: 'productivity-guru',
      title: 'Productivity Guru',
      description: 'Earn all other badges',
      emoji: '🧘',
      earned: true,
      earnedAt: todayDate,
    });
  }

  return {
    ...stats,
    badges: newBadges,
  };
}

export async function checkAndUpdateBadges(stats: Stats): Promise<Stats> {
  const newStats = { ...stats };
  let updated = false;

  // Recalculate level based on XP to ensure it's correct
  const correctLevel = calculateLevel(stats.xp);
  if (stats.level !== correctLevel) {
    console.log(`Updating level from ${stats.level} to ${correctLevel} based on ${stats.xp} XP in checkAndUpdateBadges`);
    newStats.level = correctLevel;
    updated = true;
  }

  // First Step badge
  if (!stats.badges.find(b => b.id === 'first-step')?.earned && stats.tasksCompleted >= 1) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'first-step');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }

  // Getting Started (3-day streak)
  if (!stats.badges.find(b => b.id === 'three-day-streak')?.earned && stats.streak >= 3) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'three-day-streak');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }

  // Streak Hero (5-day streak)
  if (!stats.badges.find(b => b.id === 'streak-hero')?.earned && stats.streak >= 5) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'streak-hero');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Consistency King (10-day streak)
  if (!stats.badges.find(b => b.id === 'consistent-streak')?.earned && stats.streak >= 10) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'consistent-streak');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Monthly Mastery (30-day streak)
  if (!stats.badges.find(b => b.id === 'month-streak')?.earned && stats.streak >= 30) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'month-streak');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Daily Five
  if (!stats.badges.find(b => b.id === 'daily-five')?.earned && stats.dailyTasksCompleted >= 5) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'daily-five');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // XP earner
  if (!stats.badges.find(b => b.id === 'xp-earner')?.earned && stats.xp >= 100) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'xp-earner');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // XP Master
  if (!stats.badges.find(b => b.id === 'xp-master')?.earned && stats.xp >= 250) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'xp-master');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // XP Legend
  if (!stats.badges.find(b => b.id === 'xp-legend')?.earned && stats.xp >= 500) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'xp-legend');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // XP Titan
  if (!stats.badges.find(b => b.id === 'xp-titan')?.earned && stats.xp >= 1000) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'xp-titan');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // XP Immortal
  if (!stats.badges.find(b => b.id === 'xp-immortal')?.earned && stats.xp >= 5000) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'xp-immortal');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Pomodoro Pro
  if (!stats.badges.find(b => b.id === 'pomodoro-pro')?.earned && stats.totalPomodoros >= 10) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'pomodoro-pro');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Pomodoro Master
  if (!stats.badges.find(b => b.id === 'pomodoro-master')?.earned && stats.totalPomodoros >= 25) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'pomodoro-master');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Ultimate Pomodoro
  if (!stats.badges.find(b => b.id === 'ultimate-pomodoro')?.earned && stats.totalPomodoros >= 50) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'ultimate-pomodoro');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Task Master
  if (!stats.badges.find(b => b.id === 'task-master')?.earned && stats.tasksCompleted >= 20) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'task-master');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Task Legend
  if (!stats.badges.find(b => b.id === 'task-legend')?.earned && stats.tasksCompleted >= 100) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'task-legend');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Hard Worker
  if (!stats.badges.find(b => b.id === 'hard-worker')?.earned && stats.hardTasksCompleted >= 5) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'hard-worker');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Heavy Lifter
  if (!stats.badges.find(b => b.id === 'heavy-lifter')?.earned && stats.hardTasksCompleted >= 15) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'heavy-lifter');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Note Taker
  if (!stats.badges.find(b => b.id === 'note-beginner')?.earned && stats.notesCreated >= 1) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'note-beginner');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Note Expert
  if (!stats.badges.find(b => b.id === 'note-taker')?.earned && stats.notesCreated >= 5) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'note-taker');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Organization Expert
  if (!stats.badges.find(b => b.id === 'organization-expert')?.earned && stats.notesCreated >= 15) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'organization-expert');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Extreme Focus
  if (!stats.badges.find(b => b.id === 'extreme-focus')?.earned && stats.dailyPomodorosCompleted >= 5) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'extreme-focus');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Weekend Warrior
  if (!stats.badges.find(b => b.id === 'weekend-warrior')?.earned && stats.saturdayCompleted && stats.sundayCompleted) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'weekend-warrior');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }
  
  // Planner
  if (!stats.badges.find(b => b.id === 'planner')?.earned && stats.calendarTasksCreated >= 5) {
    const badgeIndex = newStats.badges.findIndex(b => b.id === 'planner');
    if (badgeIndex !== -1) {
      newStats.badges[badgeIndex].earned = true;
      newStats.badges[badgeIndex].earnedAt = new Date().toISOString();
      updated = true;
    }
  }

  if (updated) {
    const storage = await getStorageData();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...storage,
      stats: newStats
    }));
  }

  return newStats;
}