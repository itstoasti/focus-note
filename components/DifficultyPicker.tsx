import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { Task } from '../types/storage';
import { useTheme } from '../context/ThemeContext';

interface DifficultyPickerProps {
  value: Task['effort'];
  onChange: (value: Task['effort']) => void;
}

export function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark } = useTheme();

  const difficulties: { value: Task['effort']; label: string; xp: number }[] = [
    { value: 'easy', label: 'Easy', xp: 5 },
    { value: 'medium', label: 'Medium', xp: 10 },
    { value: 'hard', label: 'Hard', xp: 15 },
  ];

  const selectedDifficulty = difficulties.find(d => d.value === value);

  return (
    <>
      <Pressable
        style={[styles.button, { backgroundColor: isDark ? '#2A2A2A' : '#E2E8F0' }]}
        onPress={() => setIsOpen(true)}
      >
        <Text style={[styles.buttonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          {selectedDifficulty?.label} ({selectedDifficulty?.xp} XP)
        </Text>
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
            {difficulties.map(difficulty => (
              <Pressable
                key={difficulty.value}
                style={[
                  styles.option,
                  difficulty.value === value && [
                    styles.selectedOption,
                    { backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9' }
                  ],
                ]}
                onPress={() => {
                  onChange(difficulty.value);
                  setIsOpen(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  { color: isDark ? '#FFFFFF' : '#000000' },
                  difficulty.value === value && styles.selectedOptionText,
                ]}>
                  {difficulty.label} ({difficulty.xp} XP)
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonText: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 8,
    width: '80%',
    maxWidth: 300,
  },
  option: {
    padding: 16,
    borderRadius: 8,
  },
  selectedOption: {
    // backgroundColor will be set dynamically
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  selectedOptionText: {
    fontWeight: 'bold',
  },
}); 