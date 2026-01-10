import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface UtilityTool {
  id: string;
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}

const UtilitiesPage = ({ navigation }: { navigation?: any }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const tools: UtilityTool[] = [
    {
      id: 'dream-board-converter',
      title: 'Dream Board Converter',
      description: 'Convert dream boards into suggested goals',
      icon: 'transform',
      onPress: () => console.log('Dream Board Converter pressed'),
    },
    {
      id: 'celebrity-goals',
      title: 'Celebrity Goals',
      description: 'Choose a celebrity and create goals inspired by their lifestyle',
      icon: 'star',
      onPress: () => console.log('Celebrity Goals pressed'),
    },
    {
      id: 'social-media-analyzer',
      title: 'Social Media Analyzer',
      description: 'Share a reel, post, or tweet to create aligned goals',
      icon: 'share',
      onPress: () => console.log('Social Media Analyzer pressed'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Tools</Text>
              <Text style={styles.subtitle}>Helpful tools and utilities</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.toolsGrid}>
          {tools.map((tool) => (
            <Pressable
              key={tool.id}
              style={styles.toolCard}
              onPress={tool.onPress}
            >
              <View style={styles.toolIconContainer}>
                <Icon name={tool.icon} size={40} color={theme.colors.surface[50]} />
              </View>
              <View style={styles.toolContent}>
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolDescription}>{tool.description}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page, // Was surface[100], page is better
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 60,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    textAlign: 'left',
  },
  toolsGrid: {
    gap: theme.spacing.md,
  },
  toolCard: {
    backgroundColor: theme.colors.primary[600],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    elevation: 4,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toolIconContainer: {
    marginRight: theme.spacing.lg,
  },
  toolContent: {
    flex: 1,
    flexShrink: 1,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.surface[50], // Keep white as card is primary[600]
    marginBottom: theme.spacing.sm,
    textAlign: 'left',
    flexWrap: 'wrap',
  },
  toolDescription: {
    fontSize: 14,
    color: theme.colors.surface[50],
    opacity: 0.9,
    textAlign: 'left',
    lineHeight: 18,
    flexWrap: 'wrap',
  },
});

export default UtilitiesPage;
