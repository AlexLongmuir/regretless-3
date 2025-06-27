import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

interface LoaderOverlayProps {
  visible: boolean;
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoaderOverlay: React.FC<LoaderOverlayProps> = ({
  visible,
  message,
  size = 'large',
  color = theme.colors.primary[500],
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ActivityIndicator size={size} color={color} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: theme.colors.grey[900],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.grey[700],
    textAlign: 'center',
  },
});