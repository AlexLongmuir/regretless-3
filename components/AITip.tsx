import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';

interface AITipProps {
  tip: string;
  style?: any;
  variant?: 'light' | 'dark';
}

// Helper function to generate SVG with theme colors
const getArisSvg = (theme: Theme) => {
  const primaryLight = theme.colors.primary[100]; // #D1E9F1
  const primaryDark = theme.colors.primary[800]; // #091A2B
  const primaryMain = theme.colors.primary[600]; // #0F2A3F
  const white = theme.colors.text.inverse; // #FFFFFF
  const accent = theme.colors.primary[300]; // #75BDD5
  const skin = '#ffe8dc'; // Keep this specific color as it's part of the character design
  
  return `
<svg width="24" height="24" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="33" cy="23" r="23" fill="${primaryLight}"/>
  <line x1="7" y1="17" x2="7" y2="19" stroke="${primaryDark}" stroke-width="2" stroke-linecap="round"/>
  <line x1="7" y1="23" x2="7" y2="25" stroke="${primaryDark}" stroke-width="2" stroke-linecap="round"/>
  <path d="M21.778,47H47.222A8.778,8.778,0,0,1,56,55.778V61a0,0,0,0,1,0,0H13a0,0,0,0,1,0,0V55.778A8.778,8.778,0,0,1,21.778,47Z" fill="${primaryMain}" stroke="${primaryDark}" stroke-width="2"/>
  <polygon points="32 61 28 61 34 49 38 49 32 61" fill="${white}" stroke="${primaryDark}" stroke-width="2"/>
  <path d="M59,39H11v4.236A5.763,5.763,0,0,0,16.764,49L34,55l19.236-6A5.763,5.763,0,0,0,59,43.236Z" fill="${primaryMain}" stroke="${primaryDark}" stroke-width="2"/>
  <line x1="3" y1="21" x2="5" y2="21" stroke="${primaryDark}" stroke-width="2" stroke-linecap="round"/>
  <line x1="9" y1="21" x2="11" y2="21" stroke="${primaryDark}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="55.5" cy="6.5" r="2.5" fill="none" stroke="${primaryDark}" stroke-width="2"/>
  <circle cx="13.984" cy="6.603" r="1.069" fill="${primaryDark}"/>
  <ellipse cx="35" cy="39" rx="24" ry="6" fill="${primaryDark}"/>
  <circle cx="5.984" cy="30.603" r="1.069" fill="${primaryDark}"/>
  <path d="M48,13V10.143A6.143,6.143,0,0,0,41.857,4H27.143A6.143,6.143,0,0,0,21,10.143V13" fill="${primaryMain}" stroke="${primaryDark}" stroke-width="2"/>
  <rect x="20" y="17.81" width="29" height="14.19" fill="${skin}" stroke="${primaryDark}" stroke-width="2"/>
  <path d="M41.972,13H48a4,4,0,0,1,4,4h0a4,4,0,0,1-4,4H21a4,4,0,0,1-4-4h0a4,4,0,0,1,4-4H37" fill="${white}" stroke="${primaryDark}" stroke-width="2"/>
  <circle cx="39.5" cy="25.5" r="1.136" fill="${primaryDark}"/>
  <circle cx="29.5" cy="25.5" r="1.136" fill="${primaryDark}"/>
  <path d="M43.875,32a6.472,6.472,0,0,0-5.219-2.2A5.2,5.2,0,0,0,35,31.974,5.2,5.2,0,0,0,31.344,29.8,6.472,6.472,0,0,0,26.125,32H20v4.5a14.5,14.5,0,0,0,29,0V32Z" fill="${white}" stroke="${primaryDark}" stroke-width="2"/>
  <line x1="33" y1="36" x2="37" y2="36" stroke="${primaryDark}" stroke-width="2" stroke-linecap="round"/>
  <rect x="32" y="10" width="5" height="5" transform="rotate(-45 34.5 12.5)" fill="${accent}" stroke="${primaryDark}" stroke-width="2"/>
</svg>
`;
};

export const AITip: React.FC<AITipProps> = ({ tip, style, variant = 'light' }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const containerStyle = [
    styles.container,
    variant === 'dark' && styles.darkContainer,
    style
  ];

  const titleStyle = [
    styles.title,
    variant === 'dark' && styles.darkTitle,
  ];

  const descriptionStyle = [
    styles.description,
    variant === 'dark' && styles.darkDescription,
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.iconContainer}>
        <SvgXml xml={getArisSvg(theme)} width={48} height={48} />
      </View>
      <View style={styles.textContainer}>
        <Text style={titleStyle}>Great progress!</Text>
        <Text style={descriptionStyle}>{tip}</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  darkContainer: {
    backgroundColor: theme.colors.primary[400],
  },
  iconContainer: {
    // Icon is now centered due to alignItems: 'center' on container
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  darkTitle: {
    color: theme.colors.text.inverse,
  },
  description: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    lineHeight: theme.typography.lineHeight.callout,
    color: theme.colors.text.secondary,
  },
  darkDescription: {
    color: theme.colors.text.inverse,
    opacity: 0.9,
  },
});