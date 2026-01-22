import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Modal } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { SheetHeader } from './SheetHeader';
import { Button } from './Button';

interface EvolutionSheetProps {
  visible: boolean;
  evolutionLevel: number;
  figurineUrl: string;
  onClose: () => void;
}

export const EvolutionSheet: React.FC<EvolutionSheetProps> = ({
  visible,
  evolutionLevel,
  figurineUrl,
  onClose,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const screenWidth = Dimensions.get('window').width;
  const contentWidth = screenWidth - theme.spacing.lg * 2;
  const figurineSize = Math.min(contentWidth * 0.7, 300);

  // Get background image URL from Supabase storage
  const getBackgroundImageUrl = () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const fallbackUrl =
      'https://cqzutvspbsspgtmcdqyp.supabase.co/storage/v1/object/public/achievement-images/SkillsBackground.png';
    if (!supabaseUrl) return fallbackUrl;
    return `${supabaseUrl}/storage/v1/object/public/achievement-images/SkillsBackground.png`;
  };
  const backgroundImageUrl = getBackgroundImageUrl();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.container}>
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

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <SheetHeader
            onClose={onClose}
            title="Evolution Complete!"
            titleColor={theme.colors.text.inverse}
          />

          <View style={styles.content}>
            <View style={styles.congratulationsContainer}>
              <Text style={styles.congratulationsText}>
                🎉 Congratulations! 🎉
              </Text>
              <Text style={styles.evolutionText}>
                You've reached Level {evolutionLevel}!
              </Text>
              <Text style={styles.descriptionText}>
                Your figurine has evolved to reflect your growth and achievements.
              </Text>
            </View>

            <View style={styles.figurineContainer}>
              <Image
                source={{ uri: figurineUrl }}
                style={[styles.figurineImage, { width: figurineSize, height: figurineSize }]}
                contentFit="cover"
                cachePolicy="disk"
                transition={200}
                priority="high"
              />
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Continue"
                onPress={onClose}
                variant="inverse"
                size="lg"
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme, isDark?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xl,
  },
  congratulationsContainer: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  congratulationsText: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text.inverse,
    textAlign: 'center',
  },
  evolutionText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.inverse,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.inverse,
    textAlign: 'center',
    opacity: 0.9,
    paddingHorizontal: theme.spacing.md,
  },
  figurineContainer: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.border.default,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  figurineImage: {
    borderRadius: theme.radius.lg,
  },
  buttonContainer: {
    width: '100%',
    paddingTop: theme.spacing.md,
  },
});
