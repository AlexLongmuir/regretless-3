import React from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground, Image } from 'react-native';
import { theme } from '../utils/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button } from './Button';

interface ActionCardProps {
  id: string;
  dreamTitle?: string;
  title: string;
  description?: string;
  status: 'todo' | 'done' | 'skipped';
  priority?: 'low' | 'medium' | 'high';
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  repeatInterval?: number;
  estimatedTime?: number;
  inspirationImages?: string[];
  onPress: (id: string) => void;
  onStatusChange: (id: string, status: 'todo' | 'done' | 'skipped') => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  id,
  dreamTitle,
  title,
  description,
  status,
  priority = 'medium',
  frequency = 'once',
  repeatInterval,
  estimatedTime,
  inspirationImages = [],
  onPress,
  onStatusChange,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'done':
        return theme.colors.success[500];
      case 'skipped':
        return theme.colors.grey[400];
      case 'todo':
      default:
        return theme.colors.primary[600];
    }
  };


  const getFrequencyText = () => {
    if (frequency === 'once') return 'One time';
    if (frequency === 'daily') return 'Daily';
    if (frequency === 'weekly') {
      return repeatInterval ? `Every ${repeatInterval} week${repeatInterval > 1 ? 's' : ''}` : 'Weekly';
    }
    if (frequency === 'monthly') {
      return repeatInterval ? `Every ${repeatInterval} month${repeatInterval > 1 ? 's' : ''}` : 'Monthly';
    }
    return 'One time';
  };

  const getFrequencyIcon = () => {
    if (frequency === 'once') return 'today';
    return 'repeat';
  };

  const formatEstimatedTime = () => {
    if (!estimatedTime) return null;
    if (estimatedTime < 60) return `${estimatedTime}min`;
    const hours = Math.floor(estimatedTime / 60);
    const minutes = estimatedTime % 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

  const dreamExamples = [
    {
      title: 'Learn Piano in 90 days',
      images: [
        'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop'
      ]
    },
    {
      title: 'Run a Marathon in 90 days',
      images: [
        'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
      ]
    },
    {
      title: 'Master Japanese Conversation in 200 days',
      images: [
        'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop'
      ]
    },
    {
      title: 'Build a Mobile App in 60 days',
      images: ['https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=300&fit=crop']
    }
  ];

  const selectedDream = dreamExamples[Math.floor(Math.random() * dreamExamples.length)];
  const defaultImages = selectedDream.images;
  const finalDreamTitle = dreamTitle || selectedDream.title;

  const backgroundImages = inspirationImages.length > 0 ? inspirationImages : defaultImages;
  const primaryImage = backgroundImages[0];

  const handleStatusPress = () => {
    const nextStatus = status === 'todo' ? 'done' : status === 'done' ? 'skipped' : 'todo';
    onStatusChange(id, nextStatus);
  };

  const getStatusButtonText = () => {
    switch (status) {
      case 'done':
        return 'Undo';
      case 'skipped':
        return 'Undo';
      case 'todo':
      default:
        return 'Mark Done';
    }
  };

  return (
    <View style={[
      styles.cardContainer,
      status === 'done' && styles.doneContainer,
      status === 'skipped' && styles.skippedContainer,
    ]}>
      <Pressable
        style={styles.card}
        onPress={() => onPress(id)}
      >
        <View style={styles.dreamTitleSection}>
          <Text style={styles.dreamTitle} numberOfLines={1}>
            {finalDreamTitle}
          </Text>
        </View>
        
        <View style={styles.imageSection}>
          <Image 
            source={{ uri: primaryImage }} 
            style={styles.backgroundImage}
          />
          
          <View style={styles.imageOverlay}>
            <View style={styles.actionDetailsSection}>
              <Text style={styles.actionTitle} numberOfLines={2}>
                {title}
              </Text>
              
              {description && (
                <Text style={styles.actionDescription} numberOfLines={3}>
                  {description}
                </Text>
              )}
              
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  <View style={styles.metaContainer}>
                    <View style={styles.frequencyContainer}>
                      <Icon name={getFrequencyIcon()} size={16} color={theme.colors.grey[300]} />
                      <Text style={styles.frequencyText}>{getFrequencyText()}</Text>
                    </View>
                    
                    <View style={styles.timeContainer}>
                      <Icon name="schedule" size={16} color={theme.colors.grey[300]} />
                      <Text style={styles.timeText}>{estimatedTime ? formatEstimatedTime() : '5min'}</Text>
                    </View>
                  </View>
                </View>
                
                <Button
                  title={getStatusButtonText()}
                  onPress={handleStatusPress}
                  variant="secondary"
                  size="xs"
                  style={styles.statusButton}
                />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: theme.colors.primary[900],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
  },
  doneContainer: {
    opacity: 0.7,
  },
  skippedContainer: {
    opacity: 0.5,
  },
  card: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  dreamTitleSection: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  dreamTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.surface[50],
    textAlign: 'left',
  },
  imageSection: {
    position: 'relative',
    minHeight: 120,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${theme.colors.primary[600]}CC`,
    padding: theme.spacing.md,
    justifyContent: 'flex-start',
  },
  actionDetailsSection: {
    marginBottom: theme.spacing.md,
  },
  actionTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.sm,
    textAlign: 'left',
  },
  actionDescription: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.md,
    textAlign: 'left',
    opacity: 0.9,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flex: 1,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  frequencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  frequencyText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.grey[300],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  timeText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.grey[300],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  statusButton: {
    // xs size and secondary variant styles will be applied automatically
  },
});