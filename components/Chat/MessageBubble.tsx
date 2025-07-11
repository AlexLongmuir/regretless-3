import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { theme } from '../../utils/theme';

interface MessageBubbleProps {
  id: string;
  text: string;
  isAris: boolean;
  timestamp: Date;
  animatedValue?: Animated.Value;
  avatar?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  id,
  text,
  isAris,
  timestamp,
  animatedValue,
  avatar
}) => {
  return (
    <Animated.View 
      style={[
        styles.messageRow,
        isAris ? styles.arisMessageRow : styles.userMessageRow,
        {
          opacity: animatedValue || 1,
          transform: [{
            translateY: animatedValue 
              ? animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })
              : 0
          }]
        }
      ]}
    >
      {isAris && avatar && (
        <View style={styles.avatarContainer}>
          <SvgXml xml={avatar} width={40} height={40} />
        </View>
      )}
      <View style={[
        styles.messageBubble,
        isAris ? styles.arisBubble : styles.userBubble
      ]}>
        <Text style={[
          styles.messageText,
          isAris ? styles.arisText : styles.userText
        ]}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  arisMessageRow: {
    justifyContent: 'flex-start',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginRight: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
  },
  arisBubble: {
    backgroundColor: theme.colors.surface[200],
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: theme.colors.primary[500],
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  arisText: {
    color: theme.colors.grey[900],
  },
  userText: {
    color: theme.colors.surface[100],
  },
});