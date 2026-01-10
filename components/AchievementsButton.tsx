import React, { useMemo, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { BlurView } from 'expo-blur';
import { Icon } from './Icon';

interface AchievementsButtonProps {
  onPress: () => void;
  count: number;
  total: number;
}

export const AchievementsButton: React.FC<AchievementsButtonProps> = ({ onPress, count, total }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Use dynamic tint based on theme
  const blurTint = isDark ? 'dark' : 'light';

  // Get background image URL from Supabase storage
  const getBackgroundImageUrl = () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    return `${supabaseUrl}/storage/v1/object/public/achievement-images/AchievementsBackground.png`;
  };

  const backgroundImageUrl = getBackgroundImageUrl();

  // Prefetch background image as soon as this button renders (i.e. on page load)
  useEffect(() => {
    if (backgroundImageUrl) {
      Image.prefetch(backgroundImageUrl);
    }
  }, [backgroundImageUrl]);
  
  const content = (
    <View style={styles.content}>
      <Text style={styles.text}>
        {count}
      </Text>
      <Icon name="trophy" size={16} color={theme.colors.text.primary} />
    </View>
  );

  if (isDark) {
    return (
      <TouchableOpacity 
        onPress={onPress}
        style={styles.containerSolid}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={styles.containerBlur}
      activeOpacity={0.7}
    >
      <BlurView intensity={80} tint={blurTint} style={styles.blur}>
        {content}
      </BlurView>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  containerBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 8,
  },
  containerSolid: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.card,
    borderWidth: 0.5,
    borderColor: theme.colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  blur: {
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.card + 'F0', // Slight transparency fallback
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
});
