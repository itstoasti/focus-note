import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import Checkbox from 'expo-checkbox';
import { Task } from '../types/storage';
import { Button } from './Button';
import { Timer } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onStartPomodoro: (id: string) => void;
}

export function TaskList({ tasks, onToggleTask, onStartPomodoro }: TaskListProps) {
  const { isDark } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Check if any task has an active pomodoro timer
  const anyActivePomodoro = tasks.some(t => t.pomodoroActive);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatTime = (endTime: string | null) => {
    if (!endTime) return null;
    const end = new Date(endTime);
    const now = new Date();
    const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (tasks.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF' }]}>
        <Text style={[styles.emptyText, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
          No tasks yet. Add one to get started!
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF' }]}>
      {tasks.map((task) => {
        const timeLeft = formatTime(task.pomodoroEndTime);

        return (
          <View
            key={task.id}
            style={[
              styles.task,
              { backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC' },
              task.completed && styles.completedTask,
            ]}
          >
            <Pressable
              style={styles.taskContent}
              onPress={() => toggleExpanded(task.id)}
            >
              <View style={styles.titleRow}>
                <Checkbox
                  value={task.completed}
                  onValueChange={() => onToggleTask(task.id)}
                  color={task.completed ? '#FF6B00' : undefined}
                />
                <Text
                  style={[
                    styles.title,
                    { color: isDark ? '#FFFFFF' : '#1A1A1A' },
                    task.completed && styles.completedText,
                  ]}
                >
                  {task.title}
                </Text>
                {task.pomodoroActive && (
                  <View style={styles.timer}>
                    <Timer size={16} color="#FF6B00" />
                    <Text style={[styles.timerText, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
                      {timeLeft}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
            {expandedId === task.id && (
              <View style={styles.content}>
                {task.notes && (
                  <Text
                    style={[
                      styles.notes,
                      { color: isDark ? '#666666' : '#64748B' },
                      task.completed && styles.completedText,
                    ]}
                  >
                    {task.notes}
                  </Text>
                )}
                <View style={styles.footer}>
                  <Text style={[styles.info, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
                    {task.pomodoroCount} Pomodoros completed
                  </Text>
                  <View style={styles.pomodoroButton}>
                    {task.pomodoroActive ? (
                      <Button
                        onPress={() => onStartPomodoro(task.id)}
                        title="Stop (No XP)"
                        variant="secondary"
                      />
                    ) : (
                      <Button
                        onPress={() => onStartPomodoro(task.id)}
                        title="Start Pomodoro"
                        variant="secondary"
                        disabled={task.completed || (anyActivePomodoro && !task.pomodoroActive)}
                      />
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function formatTimeRemaining(endTime: string | null): string {
  if (!endTime) return '';
  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return '00:00';
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  task: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  completedTask: {
    opacity: 0.5,
  },
  taskContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 14,
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 12,
  },
  notes: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    fontSize: 14,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  pomodoroButton: {
    marginTop: 8,
    width: '100%',
  },
});