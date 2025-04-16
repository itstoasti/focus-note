import { StyleSheet, Text, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ onPress, title, variant = 'primary', disabled = false }: ButtonProps) {
  const { isDark } = useTheme();

  const buttonStyles = [
    styles.button,
    variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
    isDark && variant === 'primary' ? styles.darkPrimaryButton : {},
    isDark && variant === 'secondary' ? styles.darkSecondaryButton : {},
    disabled && styles.disabledButton,
  ];

  const textStyles = [
    styles.text,
    variant === 'primary' ? styles.primaryText : styles.secondaryText,
    isDark && variant === 'primary' ? styles.darkPrimaryText : {},
    isDark && variant === 'secondary' ? styles.darkSecondaryText : {},
    disabled && styles.disabledText,
  ];

  return (
    <Pressable
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={textStyles}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FF6B00',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  darkPrimaryButton: {
    backgroundColor: '#FF8C00',
  },
  darkSecondaryButton: {
    backgroundColor: '#2A2A2A',
    borderColor: '#3A3A3A',
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#1A1A1A',
  },
  darkPrimaryText: {
    color: '#FFFFFF',
  },
  darkSecondaryText: {
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#666666',
  },
});