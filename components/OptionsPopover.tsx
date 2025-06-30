import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { theme } from '../utils/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface OptionItem {
  id: string;
  icon: string;
  title: string;
  destructive?: boolean;
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
    const popoverHeight = options.length * 44 + 12; // updated height calculation for reduced padding
    const popoverWidth = 160; // more accurate estimate for "Photo Library" text
    const screenHeight = Dimensions.get('window').height;
    const screenWidth = Dimensions.get('window').width;
    const screenMargin = 2; // margin from screen edges
    
    // Determine vertical position based on screen position
    const isInTopHalf = y < screenHeight / 2;
    let top;
    
    if (isInTopHalf) {
      // Position below button
      top = y + height + 5;
    } else {
      // Position above button
      top = y - popoverHeight - 5;
    }
    
    // Safety checks for screen bounds
    if (top < screenMargin) {
      top = screenMargin;
    }
    if (top + popoverHeight > screenHeight - screenMargin) {
      top = screenHeight - popoverHeight - screenMargin;
    }
    
    // Determine horizontal alignment based on button position
    const isCloserToLeft = x < screenWidth / 2;
    let left;
    
    if (isCloserToLeft) {
      // Button is closer to left edge, align left edges (button's left edge is closest to screen)
      left = x;
    } else {
      // Button is closer to right edge, align right edges (button's right edge is closest to screen)
      left = x + width - popoverWidth;
    }
    
    // Debug logging
    console.log('Button position:', { x, y, width, height });
    console.log('Screen size:', { screenWidth, screenHeight });
    console.log('Popover positioning:', { left, top, popoverWidth, isCloserToLeft });
    
    const translateX = 0; // No transform needed since we're positioning directly
    
    return {
      position: 'absolute' as const,
      top,
      left,
      transform: [{ translateX }],
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
                  style={styles.option}
                  onPress={() => {
                    option.onPress();
                    onClose();
                  }}
                >
                  <Icon 
                    name={option.icon} 
                    size={20} 
                    color={option.destructive ? theme.colors.error[500] : theme.colors.surface[50]} 
                  />
                  <Text style={[
                    styles.optionText,
                    option.destructive && styles.destructiveText
                  ]}>
                    {option.title}
                  </Text>
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
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
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
});