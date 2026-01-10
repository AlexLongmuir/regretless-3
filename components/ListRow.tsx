import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from './Icon';
import { Theme } from '../utils/theme';

interface ListRowProps {
  title: string;
  subtitle?: string;
  overline?: string;
  description?: string;
  onPress?: () => void;
  showChevron?: boolean;
  leftIcon?: string;
  rightElement?: 'chevron' | 'toggle' | React.ReactNode;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  variant?: 'default' | 'destructive' | 'dark';
  size?: 'default' | 'small';
  isFirst?: boolean;
  isLast?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  overline,
  description,
  onPress,
  leftIcon,
  rightElement = 'chevron',
  toggleValue = false,
  onToggleChange,
  variant = 'default',
  size = 'default',
  isFirst = false,
  isLast = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const renderRightElement = () => {
    if (rightElement === 'toggle') {
      return (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          trackColor={{ false: theme.colors.grey[300], true: theme.colors.success[500] }}
          thumbColor={theme.colors.surface[50]}
        />
      );
    }
    
    if (rightElement === 'chevron') {
      return (
        <Icon 
          name="chevron_right" 
          size={24} 
          color={variant === 'dark' ? theme.colors.surface[200] : theme.colors.grey[400]} 
        />
      );
    }

    if (React.isValidElement(rightElement)) {
      return rightElement;
    }

    return null;
  };

  const containerStyle = [
    size === 'small' ? styles.smallContainer : styles.container,
    size !== 'small' && isFirst && styles.firstRow,
    size !== 'small' && isLast && styles.lastRow,
    variant === 'destructive' && styles.destructiveRow,
  ];

  const titleStyle = [
    styles.title,
    size === 'small' && styles.smallTitle,
    variant === 'destructive' && styles.destructiveTitle,
    variant === 'dark' && styles.darkTitle,
  ];

  const contentStyle = [
    styles.content,
    size === 'small' && styles.smallContent,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={contentStyle}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Icon 
              name={leftIcon} 
              size={20} 
              color={variant === 'destructive' ? theme.colors.error[500] : variant === 'dark' ? theme.colors.surface[50] : theme.colors.grey[600]} 
            />
          </View>
        )}
        
        <View style={styles.textContainer}>
          {description && (
            <Text style={styles.description}>{description}</Text>
          )}
          {overline && (
            <Text style={styles.overline}>{overline}</Text>
          )}
          <Text style={titleStyle}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
        
        <View style={styles.rightContainer}>
          {renderRightElement()}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border.default, // Use semantic border color
    minHeight: 44,
  },
  smallContainer: {
    backgroundColor: theme.colors.surface[50], // Use semantic surface color
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    minHeight: 36,
  },
  firstRow: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  lastRow: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderBottomWidth: 0,
  },
  destructiveRow: {
    // No additional styling needed, handled by text color
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  smallContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 36,
  },
  leftIconContainer: {
    marginRight: theme.spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.text.primary, // Use semantic text color
  },
  smallTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: theme.colors.text.primary,
  },
  destructiveTitle: {
    color: theme.colors.error[500],
  },
  darkTitle: {
    color: theme.colors.surface[50],
  },
  overline: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: 16,
    color: theme.colors.text.tertiary, // Use semantic text color
    marginBottom: 2,
    fontStyle: 'italic',
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.text.secondary, // Use semantic text color
    marginTop: 2,
  },
  rightContainer: {
    marginLeft: theme.spacing.sm,
  },
  description: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: 16,
    color: theme.colors.text.tertiary, // Use semantic text color
    marginBottom: 4,
  },
});
