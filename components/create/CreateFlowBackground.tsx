import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../utils/theme';

interface CreateFlowBackgroundProps {
  children: React.ReactNode;
}

export const CreateFlowBackground: React.FC<CreateFlowBackgroundProps> = ({ children }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Get background image URL from Supabase storage
  const getBackgroundImageUrl = () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    return `${supabaseUrl}/storage/v1/object/public/achievement-images/AchievementsBackground.png`;
  };

  const backgroundImageUrl = getBackgroundImageUrl();

  // Prefetch background image
  useEffect(() => {
    if (backgroundImageUrl) {
      Image.prefetch(backgroundImageUrl);
    }
  }, [backgroundImageUrl]);

  return (
    <View style={styles.container}>
      {/* Background Image */}
      {backgroundImageUrl && (
        <Image 
          source={{ uri: backgroundImageUrl }} 
          style={styles.backgroundImage}
          contentFit="cover"
          cachePolicy="disk"
          transition={0}
          priority="high"
        />
      )}
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, _isDark?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
});
