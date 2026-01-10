import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { getDailyRecommendation } from '../../../data/dailyRecommendations';
import { Button } from '../../Button';
import { useTheme } from '../../../contexts/ThemeContext';
import { Theme } from '../../../utils/theme';

interface RecommendationStepProps {
  onComplete: () => void;
}

export const RecommendationStep: React.FC<RecommendationStepProps> = ({ onComplete }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const recommendation = getDailyRecommendation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Daily Inspiration</Text>
        
        <View style={styles.card}>
          <View style={styles.imagePlaceholder}>
            {recommendation.imageUrl ? (
              <Image 
                source={{ uri: recommendation.imageUrl }} 
                style={styles.image} 
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.image, styles.placeholderColor]} />
            )}
            <View style={styles.typeTag}>
              <Text style={styles.typeText}>{recommendation.type.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{recommendation.title}</Text>
            {recommendation.author && (
              <Text style={styles.author}>by {recommendation.author}</Text>
            )}
            <Text style={styles.description}>{recommendation.description}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button 
          title="Next" 
          onPress={onComplete}
          style={[styles.button, { backgroundColor: theme.colors.primary[400] }]}
        />
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  header: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 18,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: 20,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    paddingTop: 10,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  imagePlaceholder: {
    height: 180,
    width: '100%',
    backgroundColor: theme.colors.disabled.inactive,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderColor: {
    backgroundColor: theme.colors.primary[200],
  },
  typeTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  author: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 24,
  },
  button: {
    width: '100%',
  },
});
