import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { theme } from '../utils/theme';

interface AITipProps {
  tip: string;
  style?: any;
  variant?: 'light' | 'dark';
}

const arisSvg = `
<svg width="24" height="24" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="33" cy="23" r="23" fill="#D1E9F1"/>
  <line x1="7" y1="17" x2="7" y2="19" stroke="#091A2B" stroke-width="2" stroke-linecap="round"/>
  <line x1="7" y1="23" x2="7" y2="25" stroke="#091A2B" stroke-width="2" stroke-linecap="round"/>
  <path d="M21.778,47H47.222A8.778,8.778,0,0,1,56,55.778V61a0,0,0,0,1,0,0H13a0,0,0,0,1,0,0V55.778A8.778,8.778,0,0,1,21.778,47Z" fill="#0F2A3F" stroke="#091A2B" stroke-width="2"/>
  <polygon points="32 61 28 61 34 49 38 49 32 61" fill="#ffffff" stroke="#091A2B" stroke-width="2"/>
  <path d="M59,39H11v4.236A5.763,5.763,0,0,0,16.764,49L34,55l19.236-6A5.763,5.763,0,0,0,59,43.236Z" fill="#0F2A3F" stroke="#091A2B" stroke-width="2"/>
  <line x1="3" y1="21" x2="5" y2="21" stroke="#091A2B" stroke-width="2" stroke-linecap="round"/>
  <line x1="9" y1="21" x2="11" y2="21" stroke="#091A2B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="55.5" cy="6.5" r="2.5" fill="none" stroke="#091A2B" stroke-width="2"/>
  <circle cx="13.984" cy="6.603" r="1.069" fill="#091A2B"/>
  <ellipse cx="35" cy="39" rx="24" ry="6" fill="#091A2B"/>
  <circle cx="5.984" cy="30.603" r="1.069" fill="#091A2B"/>
  <path d="M48,13V10.143A6.143,6.143,0,0,0,41.857,4H27.143A6.143,6.143,0,0,0,21,10.143V13" fill="#0F2A3F" stroke="#091A2B" stroke-width="2"/>
  <rect x="20" y="17.81" width="29" height="14.19" fill="#ffe8dc" stroke="#091A2B" stroke-width="2"/>
  <path d="M41.972,13H48a4,4,0,0,1,4,4h0a4,4,0,0,1-4,4H21a4,4,0,0,1-4-4h0a4,4,0,0,1,4-4H37" fill="#ffffff" stroke="#091A2B" stroke-width="2"/>
  <circle cx="39.5" cy="25.5" r="1.136" fill="#091A2B"/>
  <circle cx="29.5" cy="25.5" r="1.136" fill="#091A2B"/>
  <path d="M43.875,32a6.472,6.472,0,0,0-5.219-2.2A5.2,5.2,0,0,0,35,31.974,5.2,5.2,0,0,0,31.344,29.8,6.472,6.472,0,0,0,26.125,32H20v4.5a14.5,14.5,0,0,0,29,0V32Z" fill="#ffffff" stroke="#091A2B" stroke-width="2"/>
  <line x1="33" y1="36" x2="37" y2="36" stroke="#091A2B" stroke-width="2" stroke-linecap="round"/>
  <rect x="32" y="10" width="5" height="5" transform="rotate(-45 34.5 12.5)" fill="#75BDD5" stroke="#091A2B" stroke-width="2"/>
</svg>
`;

export const AITip: React.FC<AITipProps> = ({ tip, style, variant = 'light' }) => {
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
        <SvgXml xml={arisSvg} width={48} height={48} />
      </View>
      <View style={styles.textContainer}>
        <Text style={titleStyle}>Great progress!</Text>
        <Text style={descriptionStyle}>{tip}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface[50],
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
    color: theme.colors.grey[800],
    marginBottom: 2,
  },
  darkTitle: {
    color: theme.colors.surface[50],
  },
  description: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    lineHeight: theme.typography.lineHeight.callout,
    color: theme.colors.grey[600],
  },
  darkDescription: {
    color: theme.colors.surface[200],
  },
});