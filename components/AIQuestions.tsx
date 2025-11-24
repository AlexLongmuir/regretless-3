import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Modal, SafeAreaView, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../utils/theme';
import { Button } from './Button';
import { SheetHeader } from './SheetHeader';

interface AIQuestionsProps {
  context: string;
  actionTitle: string;
  actionDescription: string;
  style?: any;
}

export const AIQuestions: React.FC<AIQuestionsProps> = ({ context, actionTitle, actionDescription, style }) => {
  const [isWebViewVisible, setIsWebViewVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  const generateQuestions = () => {
    const baseQuestions = [
      `What specific steps should I take to successfully complete "${actionTitle}"?`,
      `What are the most common mistakes people make when trying to "${actionTitle.toLowerCase()}" and how can I avoid them?`,
      `What tools, resources, or preparation do I need before starting "${actionTitle}"?`
    ];
    return baseQuestions;
  };

  const questions = generateQuestions();

  const handleQuestionPress = (question: string) => {
    const prompt = `Context: ${context}\n\nQuestion: ${question}`;
    const encodedPrompt = encodeURIComponent(prompt);
    const chatGptUrl = `https://chat.openai.com/?q=${encodedPrompt}`;
    
    setCurrentUrl(chatGptUrl);
    setIsWebViewVisible(true);
  };

  const closeWebView = () => {
    setIsWebViewVisible(false);
    setCurrentUrl('');
  };

  return (
    <>
      <LinearGradient
        colors={[
          theme.colors.primary[200],
          theme.colors.primary[100],
          theme.colors.success[100],
          theme.colors.pink[200]
        ]}
        start={theme.gradients.magical.start}
        end={theme.gradients.magical.end}
        style={[styles.container, style]}
      >
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <Image 
              source={require('../assets/star.png')} 
              style={styles.icon}
            />
            <Text style={styles.brandName}>AI Questions</Text>
          </View>
          <Icon 
            name="keyboard-arrow-right" 
            size={24} 
            color={theme.colors.grey[400]} 
          />
        </View>
        
        <View style={styles.questionsContainer}>
          {questions.map((question, index) => (
            <Button
              key={index}
              title={question}
              onPress={() => handleQuestionPress(question)}
              variant="secondary"
              size="sm"
              style={styles.questionButton}
            />
          ))}
        </View>
      </LinearGradient>

      <Modal
        visible={isWebViewVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <SheetHeader
            title="ChatGPT"
            onClose={closeWebView}
          />
          <WebView
            source={{ uri: currentUrl }}
            style={styles.webView}
            startInLoadingState
            scalesPageToFit
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: theme.spacing.sm,
  },
  brandName: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.headline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.primary[600],
  },
  questionsContainer: {
    gap: theme.spacing.sm,
  },
  questionButton: {
    alignSelf: 'stretch',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  webView: {
    flex: 1,
  },
});