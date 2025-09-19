/**
 * EmojiListRow - Reusable component for emoji + text rows
 * 
 * Supports two types:
 * - 'select': Updates a text input value and stays on current page
 * - 'navigate': Navigates to another page
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../utils/theme';

interface EmojiListRowProps {
  emoji: string;
  text: string;
  type: 'select' | 'navigate';
  onSelect?: (text: string) => void; // For 'select' type
  onNavigate?: () => void; // For 'navigate' type
  isSelected?: boolean; // For 'select' type to show selection state
  style?: any;
}

export const EmojiListRow: React.FC<EmojiListRowProps> = ({
  emoji,
  text,
  type,
  onSelect,
  onNavigate,
  isSelected = false,
  style,
}) => {
  const handlePress = () => {
    if (type === 'select' && onSelect) {
      onSelect(text);
    } else if (type === 'navigate' && onNavigate) {
      onNavigate();
    }
  };

  const containerStyle = [
    styles.container,
    isSelected && styles.selectedContainer,
    style,
  ];

  const textStyle = [
    styles.text,
    isSelected && styles.selectedText,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={textStyle}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedContainer: {
    backgroundColor: theme.colors.grey[100],
    borderWidth: 1,
    borderColor: theme.colors.black,
  },
  emoji: {
    fontSize: 16,
  },
  text: {
    fontSize: 14,
    color: '#000',
    flex: 1,
    fontFamily: theme.typography.fontFamily.system,
    fontWeight: theme.typography.fontWeight.regular as any,
  },
  selectedText: {
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.black,
  },
});
