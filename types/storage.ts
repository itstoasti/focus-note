export interface Task {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  effort: 'easy' | 'medium' | 'hard';
  pomodoroCount: number;
  pomodoroActive: boolean;
  pomodoroEndTime: string | null;
  date: string; // ISO string format for the task date
  time?: string; // Optional time in 24-hour format (HH:MM)
  notificationId?: string; // ID of the scheduled notification for this task
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
}

export interface Stats {
  streak: number;
  freezeTokens: number;
  xp: number;
  pomodoroXp: number;
  totalPomodoros: number;
  level: number;
  lastEndDay: string | null;
  badges: Badge[];
  tasksCompleted: number;
  hardTasksCompleted: number;
  notesCreated: number;
  dailyTasksCompleted: number; // For the Daily Five badge
  dailyPomodorosCompleted: number; // For the Extreme Focus badge
  calendarTasksCreated: number; // For the Planner badge
  saturdayCompleted: boolean; // For Weekend Warrior badge
  sundayCompleted: boolean; // For Weekend Warrior badge
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface Storage {
  tasks: Task[];
  stats: Stats;
  notes: Note[];
}

export const DEFAULT_BADGES: Badge[] = [
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
];