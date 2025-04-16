import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button } from './Button';
import { Picker } from '@react-native-picker/picker';
import { Task } from '../types/storage';
import { useTheme } from '../context/ThemeContext';

interface TaskInputProps {
  onAddTask: (title: string, notes: string, effort: Task['effort']) => void;
}

export function TaskInput({ onAddTask }: TaskInputProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [effort, setEffort] = useState<Task['effort']>('medium');
  const { isDark } = useTheme();

  const handleAddTask = () => {
    if (title.trim()) {
      onAddTask(title.trim(), notes.trim(), effort);
      setTitle('');
      setNotes('');
      setEffort('medium');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF' }]}>
      <TextInput
        style={[styles.input, { 
          color: isDark ? '#FFFFFF' : '#1A1A1A',
          backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC',
          borderColor: isDark ? '#3A3A3A' : '#E2E8F0'
        }]}
        placeholder="Task title"
        placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
        value={title}
        onChangeText={setTitle}
        maxLength={50}
      />
      <TextInput
        style={[styles.input, { 
          color: isDark ? '#FFFFFF' : '#1A1A1A',
          backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC',
          borderColor: isDark ? '#3A3A3A' : '#E2E8F0'
        }]}
        placeholder="Notes (optional)"
        placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={effort}
          onValueChange={(value) => setEffort(value as Task['effort'])}
          style={[styles.picker, { 
            color: isDark ? '#FFFFFF' : '#1A1A1A',
            backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC',
          }]}
          itemStyle={[styles.pickerItem, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}
        >
          <Picker.Item label="Easy (5 XP)" value="easy" />
          <Picker.Item label="Medium (10 XP)" value="medium" />
          <Picker.Item label="Hard (15 XP)" value="hard" />
        </Picker>
      </View>
      <Button
        onPress={handleAddTask}
        title="Add Task"
        variant="primary"
        disabled={!title.trim()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  pickerContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  pickerItem: {
    fontSize: 16,
  },
});