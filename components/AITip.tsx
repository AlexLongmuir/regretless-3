import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../utils/theme';

interface AITipProps {
  tip: string;
  style?: any;
}

export const AITip: React.FC<AITipProps> = ({ tip, style }) => {
  return (
    <LinearGradient
      colors={[
        theme.colors.primary[200],
        theme.colors.primary[100],
        theme.colors.success[100],
        theme.colors.pink[200]
      ]}
      start={theme.gradients.magical.start}
      end={theme.gradients.magical.end}
      style={[styles.container, style]}
    >
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Image 
            source={require('../assets/star.png')} 
            style={styles.icon}
          />
          <Text style={styles.brandName}>Aris</Text>
        </View>
        <Icon 
          name="keyboard-arrow-right" 
          size={24} 
          color={theme.colors.grey[400]} 
        />
      </View>
      <Text style={styles.tip}>{tip}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: theme.spacing.sm,
  },
  brandName: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.headline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.primary[600],
  },
  tip: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    lineHeight: theme.typography.lineHeight.callout,
    color: theme.colors.grey[800],
  },
});