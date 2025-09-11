import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { theme } from '../utils/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface OptionItem {
  id: string;
  icon: string;
  title: string;
  destructive?: boolean;
  selected?: boolean;
  onPress: () => void;
}

interface OptionsPopoverProps {
  visible: boolean;
  onClose: () => void;
  options: OptionItem[];
  triggerPosition?: { x: number; y: number; width: number; height: number };
}

export const OptionsPopover: React.FC<OptionsPopoverProps> = ({ visible, onClose, options, triggerPosition }) => {
  const getPopoverPosition = () => {
    if (!triggerPosition) {
      return { top: '50%' as const, left: '50%' as const, transform: [{ translateX: -100 }, { translateY: -50 }] };
    }

    const { x, y, width, height } = triggerPosition;
    const popoverHeight = options.length * 44 + 12; // height calculation for options
    // Calculate width based on longest option text
    const longestText = Math.max(...options.map(opt => opt.title.length));
    const popoverWidth = Math.min(Math.max(longestText * 8 + 60, 120), 160); // dynamic width with min/max bounds
    const screenHeight = Dimensions.get('window').height;
    const screenWidth = Dimensions.get('window').width;
    const screenMargin = 16; // page side padding
    const gap = 4; // small gap between button and popover
    
    // Position directly below the button
    let top = y + height + gap;
    
    // Safety check for screen bounds
    if (top + popoverHeight > screenHeight - screenMargin) {
      top = y - popoverHeight - gap; // Position above if no room below
    }
    if (top < screenMargin) {
      top = screenMargin;
    }
    
    // Position to align with the right edge of the button, maintaining page side padding
    let left = x + width - popoverWidth;
    
    // Ensure it doesn't go beyond the right edge (maintain page side padding)
    if (left + popoverWidth > screenWidth - screenMargin) {
      left = screenWidth - popoverWidth - screenMargin;
    }
    
    // Ensure it doesn't go beyond the left edge (maintain page side padding)
    if (left < screenMargin) {
      left = screenMargin;
    }
    
    return {
      position: 'absolute' as const,
      top,
      left,
    };
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.container, getPopoverPosition()]}>
              {options.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.option,
                    option.selected && styles.selectedOption
                  ]}
                  onPress={() => {
                    option.onPress();
                    onClose();
                  }}
                >
                  <Icon 
                    name={option.icon} 
                    size={20} 
                    color={option.destructive ? theme.colors.error[500] : 
                           option.selected ? theme.colors.primary[400] : theme.colors.surface[50]} 
                  />
                  <Text style={[
                    styles.optionText,
                    option.destructive && styles.destructiveText,
                    option.selected && styles.selectedText
                  ]}>
                    {option.title}
                  </Text>
                  {option.selected && (
                    <Icon 
                      name="check" 
                      size={16} 
                      color={theme.colors.primary[400]} 
                      style={styles.checkIcon}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    backgroundColor: theme.colors.grey[600],
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 120,
    maxWidth: 160,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  optionText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.surface[50],
  },
  destructiveText: {
    color: theme.colors.error[500],
  },
  selectedOption: {
    backgroundColor: theme.colors.primary[700],
  },
  selectedText: {
    color: theme.colors.primary[400],
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
});