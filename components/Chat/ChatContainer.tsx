import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { theme } from '../../utils/theme';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

export interface ChatMessage {
  id: string;
  text: string;
  isAris: boolean;
  timestamp: Date;
  animatedValue?: Animated.Value;
}

interface ChatContainerProps {
  messages: ChatMessage[];
  isProcessing?: boolean;
  isTransitioning?: boolean;
  processingText?: string;
  avatar?: string;
  style?: any;
  contentContainerStyle?: any;
  showsVerticalScrollIndicator?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isProcessing = false,
  isTransitioning = false,
  processingText = "I'm processing your request...",
  avatar,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={[styles.messagesContainer, style]}
      contentContainerStyle={[styles.messagesContent, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          id={message.id}
          text={message.text}
          isAris={message.isAris}
          timestamp={message.timestamp}
          animatedValue={message.animatedValue}
          avatar={message.isAris ? avatar : undefined}
        />
      ))}
      
      {(isProcessing || isTransitioning) && (
        <View style={styles.processingContainer}>
          {avatar && (
            <View style={styles.avatarContainer}>
              <SvgXml xml={avatar} width={40} height={40} />
            </View>
          )}
          <View style={styles.processingBubble}>
            {isTransitioning ? (
              <TypingIndicator />
            ) : (
              <Text style={styles.processingText}>
                {processingText}
              </Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  processingContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  processingBubble: {
    maxWidth: '75%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  processingText: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.primary[700],
    fontStyle: 'italic',
  },
});