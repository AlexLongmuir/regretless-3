import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TextInput, Animated, ScrollView } from 'react-native';
import { SvgXml } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../utils/theme';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { Pills } from '../components/Pills';
import { ListRow } from '../components/ListRow';
import { ImageGallery } from '../components/ImageGallery';
import { CompactActionCard } from '../components/CompactActionCard';
import ScheduleSelector from '../components/ScheduleSelector';
import { dreamCategories, popularDreams, dayOptions, getStartDateOptions, formatDateDisplay, arisAvatar } from '../constants/AddGoalFlowConstants';
import { createGoalWithAI, generatePersonalizationQuestions, generateActionPlan, type GoalData as AIGoalData, type AIAction } from '../frontend-services/ai-service';
import { useAuthContext } from '../contexts/AuthContext';

// iOS-style typing indicator component
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDots = () => {
      const createAnimation = (dot: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.3,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        );
      };

      Animated.parallel([
        createAnimation(dot1, 0),
        createAnimation(dot2, 200),
        createAnimation(dot3, 400),
      ]).start();
    };

    animateDots();
  }, []);

  return (
    <View style={styles.typingIndicator}>
      <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
      <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
      <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
    </View>
  );
};

interface Message {
  id: string;
  text: string;
  isAris: boolean;
  timestamp: Date;
  animatedValue?: Animated.Value;
}




interface GoalData {
  title: string;
  startDate: string;
  duration: number | null;
  images: string[];
  reason: string;
  schedule: any[] | null;
  startingLevel: string;
  restrictions: string;
  history: string;
  preferences: string;
  actions: Action[] | null;
  actionFeedback: string;
  selectedGoalOption?: 'original' | 'alternative' | 'custom';
  customTitle?: string;
  customDays?: number;
  feedbackAttempts?: number;
  feedbackImprove?: string;
  feedbackDislike?: string;
}

interface Action {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  day: number;
  dueDate?: string;
}

interface ConversationStep {
  id: string;
  type: 'text' | 'daySelection' | 'schedule' | 'actions' | 'images' | 'startDate' | 'goalSuggestions' | 'actionFeedback';
  question: string;
  completed: boolean;
  skippable?: boolean;
}

type ConversationPhase = 'discovery' | 'planning' | 'actions' | 'feedback' | 'complete';

const initialSteps: ConversationStep[] = [
  {
    id: 'goal',
    type: 'text',
    question: "Hi there! I'm Aris, your goal-setting companion. What dream would you like to turn into reality?",
    completed: false,
  },
  {
    id: 'startDate',
    type: 'startDate',
    question: "Excellent choice! When would you like to start working on this goal?",
    completed: false,
  },
  {
    id: 'duration',
    type: 'daySelection',
    question: "That sounds amazing! How many days do you want to dedicate to achieving this goal?",
    completed: false,
  },
  {
    id: 'images',
    type: 'images',
    question: "Wonderful! Visualization is proven to increase success rates by up to 70%. Do you have any inspirational images that represent your goal? These could be photos of what you want to achieve, places you want to visit, or anything that motivates you.",
    completed: false,
    skippable: true,
  },
  {
    id: 'schedule',
    type: 'schedule',
    question: "Perfect! When would you like to work on this goal? Please select the days and times that work best for you.",
    completed: false,
  },
  {
    id: 'reason',
    type: 'text',
    question: "Great! Research by Dr. Gail Matthews at Dominican University shows that people who write down their motivation are 42% more likely to achieve their goals. What's the main reason this goal is important to you?",
    completed: false,
  },
  {
    id: 'startingLevel',
    type: 'text',
    question: "What's your current experience level with this goal? Are you a complete beginner or do you have some background?",
    completed: false,
  },
  {
    id: 'restrictions',
    type: 'text',
    question: "Are there any constraints I should know about? For example, budget limitations, time restrictions, or resources you don't have access to?",
    completed: false,
    skippable: true,
  },
  {
    id: 'goalSuggestions',
    type: 'goalSuggestions',
    question: "These refined goals use the SMART framework (Specific, Measurable, Achievable, Relevant, Time-bound), which is proven to increase your likelihood of success by up to 42%. Based on your schedule and experience level, which approach resonates with you?",
    completed: false,
  },
];

const AddGoalFlow = ({ navigation }: { navigation?: any }) => {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationSteps, setConversationSteps] = useState<ConversationStep[]>(initialSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [phase, setPhase] = useState<ConversationPhase>('discovery');
  const [totalProgress, setTotalProgress] = useState(0);
  const [goalData, setGoalData] = useState<GoalData>({
    title: '',
    startDate: new Date().toISOString().split('T')[0], // Default to today
    duration: null,
    images: [],
    reason: '',
    schedule: null,
    startingLevel: '',
    restrictions: '',
    history: '',
    preferences: '',
    actions: null,
    actionFeedback: '',
  });
  const [aiSuggestions, setAiSuggestions] = useState<Array<{id: string; title: string; days: number; description: string}>>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [filteredDreams, setFilteredDreams] = useState(popularDreams.filter(dream => dream.category === 'popular'));
  const [daysInput, setDaysInput] = useState('');
  const [startDateInput, setStartDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [endDateInput, setEndDateInput] = useState('');
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [feedbackImprove, setFeedbackImprove] = useState('');
  const [feedbackDislike, setFeedbackDislike] = useState('');
  const [actionFeedbackAttempts, setActionFeedbackAttempts] = useState(0);
  const [showActionFeedback, setShowActionFeedback] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Update filtered dreams when category changes
  useEffect(() => {
    setFilteredDreams(popularDreams.filter(dream => dream.category === selectedCategory));
  }, [selectedCategory]);

  // Initialize the conversation
  useEffect(() => {
    if (messages.length === 0 && conversationSteps.length > 0) {
      const firstStep = conversationSteps[0];
      const animatedValue = new Animated.Value(0);
      const initialMessage: Message = {
        id: '1',
        text: firstStep.question,
        isAris: true,
        timestamp: new Date(),
        animatedValue,
      };
      setMessages([initialMessage]);
      
      // Animate the initial message
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Auto-scroll to show the initial message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 400);
      
      setTotalProgress(1);
    }
  }, []);

  const getCurrentStep = () => {
    return conversationSteps[currentStepIndex];
  };

  const addAnimatedMessage = (message: Omit<Message, 'animatedValue'>) => {
    const animatedValue = new Animated.Value(0);
    const messageWithAnimation = { ...message, animatedValue };
    
    setMessages(prev => [...prev, messageWithAnimation]);
    
    // Animate message appearing
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Auto-scroll to bottom after message is added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const moveToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    
    // Mark current step as completed
    const updatedSteps = [...conversationSteps];
    updatedSteps[currentStepIndex].completed = true;
    setConversationSteps(updatedSteps);

    // Increment progress (always forward)
    setTotalProgress(prev => prev + 1);

    if (nextIndex < conversationSteps.length) {
      // Start transition state
      setIsTransitioning(true);
      
      // Animate input area fade out only (no slide to prevent layout shifts)
      Animated.timing(fadeAnim, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Show typing animation for 1 second
      setTimeout(() => {
        setCurrentStepIndex(nextIndex);
        
        const nextStep = conversationSteps[nextIndex];
        const arisMessage: Message = {
          id: Date.now().toString(),
          text: nextStep.question,
          isAris: true,
          timestamp: new Date(),
        };
        
        // Close any open date pickers before moving to next step
        setShowDatePicker(false);
        setShowEndDatePicker(false);
        
        // Animate new message appearing
        addAnimatedMessage(arisMessage);
        
        // Animate input area fade back in only
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        setIsTransitioning(false);
      }, 1000);
    } else {
      // All steps completed, generate AI suggestions first
      generateAISuggestions();
    }
  };

  const handleTextInput = (input: string) => {
    if (!input.trim()) return;
    
    const currentStep = getCurrentStep();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isAris: false,
      timestamp: new Date(),
    };

    addAnimatedMessage(userMessage);

    // Store the user's response
    const newGoalData = { ...goalData };
    switch (currentStep.id) {
      case 'goal':
        newGoalData.title = input;
        break;
      case 'reason':
        newGoalData.reason = input;
        break;
      case 'startingLevel':
        newGoalData.startingLevel = input;
        break;
      case 'restrictions':
        newGoalData.restrictions = input;
        break;
      case 'history':
        newGoalData.history = input;
        break;
      case 'preferences':
        newGoalData.preferences = input;
        break;
    }
    setGoalData(newGoalData);
    setCurrentInput('');
    
    moveToNextStep();
  };

  const handleDreamSelection = (dreamTitle: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: dreamTitle,
      isAris: false,
      timestamp: new Date(),
    };

    addAnimatedMessage(userMessage);

    const newGoalData = { ...goalData };
    newGoalData.title = dreamTitle;
    setGoalData(newGoalData);
    
    moveToNextStep();
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleDaySelection = (days: number) => {
    const newGoalData = { ...goalData };
    newGoalData.duration = days;
    setGoalData(newGoalData);
    
    // Create user response message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `I want to achieve this goal in ${days} days`,
      isAris: false,
      timestamp: new Date(),
    };
    addAnimatedMessage(userMessage);
    
    moveToNextStep();
  };

  const handleDayPillPress = (dayId: string) => {
    setDaysInput(dayId);
  };

  const handleDaysInputChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setDaysInput(numericValue);
  };

  const handleDaysSubmit = () => {
    const days = parseInt(daysInput);
    if (days && days > 0) {
      handleDaySelection(days);
    }
  };

  const handleStartDateSelection = (dateString: string) => {
    const newGoalData = { ...goalData };
    newGoalData.startDate = dateString;
    setGoalData(newGoalData);
    
    // Create user response message
    const date = new Date(dateString);
    const isToday = dateString === new Date().toISOString().split('T')[0];
    const isTomorrow = dateString === new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let dateText;
    if (isToday) {
      dateText = "today";
    } else if (isTomorrow) {
      dateText = "tomorrow";
    } else {
      dateText = `on ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `I want to start ${dateText}`,
      isAris: false,
      timestamp: new Date(),
    };
    addAnimatedMessage(userMessage);
    
    moveToNextStep();
  };

  const handleStartDatePillPress = (dateId: string) => {
    setStartDateInput(dateId);
  };

  const handleStartDateInputChange = (text: string) => {
    setStartDateInput(text);
  };

  const handleStartDateSubmit = () => {
    if (startDateInput) {
      handleStartDateSelection(startDateInput);
    }
  };

  const handleCalendarPress = () => {
    setShowDatePicker(!showDatePicker);
  };

  const handleDatePickerChange = (_event: any, selectedDate?: Date) => {
    // Only close on Android dismiss/cancel
    if (Platform.OS === 'android' && !selectedDate) {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setStartDateInput(dateString);
      // Don't auto-close picker - let user continue selecting or manually close
    }
  };

  const handleEndDateCalendarPress = () => {
    setShowEndDatePicker(!showEndDatePicker);
  };

  const handleEndDatePickerChange = (_event: any, selectedDate?: Date) => {
    // Only close on Android dismiss/cancel
    if (Platform.OS === 'android' && !selectedDate) {
      setShowEndDatePicker(false);
    }
    
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setEndDateInput(dateString);
      
      // Calculate days between start and end date
      const startDate = new Date(goalData.startDate);
      const endDate = new Date(dateString);
      const timeDifference = endDate.getTime() - startDate.getTime();
      const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1; // +1 to include both start and end days
      
      if (daysDifference > 0) {
        setDaysInput(daysDifference.toString());
      }
      
      // Don't auto-close picker - let user continue selecting or manually close
    }
  };

  const handleImageSelection = (images: string[]) => {
    const newGoalData = { ...goalData };
    newGoalData.images = images;
    setGoalData(newGoalData);
    
    // Don't auto-submit - just update the state
    // User needs to click Continue button to proceed
  };

  const handleImagesContinue = () => {
    // Create user response message when Continue is clicked
    const imageCount = goalData.images.length;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: imageCount > 0 ? `I've added ${imageCount} inspirational ${imageCount === 1 ? 'image' : 'images'}` : "I'll skip adding images for now",
      isAris: false,
      timestamp: new Date(),
    };
    addAnimatedMessage(userMessage);
    
    moveToNextStep();
  };

  const handleScheduleSelection = (schedule: any[]) => {
    const newGoalData = { ...goalData };
    newGoalData.schedule = schedule;
    setGoalData(newGoalData);
    
    // Don't auto-submit - just update the state
    // User needs to click Continue button to proceed
  };

  const handleScheduleContinue = () => {
    // Create user response message when Continue is clicked
    const selectedDays = goalData.schedule?.filter(day => day.selected).length || 0;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `I've selected my availability for ${selectedDays} days of the week`,
      isAris: false,
      timestamp: new Date(),
    };
    addAnimatedMessage(userMessage);
    
    moveToNextStep();
  };

  const generateAISuggestions = async () => {
    console.log('🚀 [AI DEBUG] Starting generateAISuggestions');
    console.log('📝 [AI DEBUG] Current goalData:', goalData);
    console.log('👤 [AI DEBUG] User ID:', user?.id);
    
    setIsGeneratingSuggestions(true);
    
    try {
      if (!user?.id) {
        console.error('❌ [AI DEBUG] User not authenticated');
        throw new Error('User not authenticated');
      }
      
      // Create goal with AI improvements to get suggestions
      const aiGoalData: AIGoalData = {
        title: goalData.title,
        startDate: goalData.startDate,
        duration: goalData.duration,
        images: goalData.images,
        reason: goalData.reason,
        schedule: goalData.schedule,
        startingLevel: goalData.startingLevel,
        restrictions: goalData.restrictions,
        category: goalData.selectedGoalOption === 'custom' ? 'custom' : undefined
      };
      
      console.log('📊 [AI DEBUG] Calling createGoalWithAI with data:', aiGoalData);
      
      const { goal, improvedTitle, suggestions } = await createGoalWithAI(aiGoalData, user.id);
      
      console.log('✅ [AI DEBUG] createGoalWithAI response:');
      console.log('  - goal:', goal);
      console.log('  - improvedTitle:', improvedTitle);
      console.log('  - suggestions:', suggestions);
      
      // Create AI-generated suggestions based on the improved goal
      const aiGeneratedSuggestions = [
        {
          id: '1',
          title: improvedTitle,
          days: goalData.duration || 30,
          description: suggestions.join(', ')
        },
        {
          id: '2',
          title: `${improvedTitle} - Quick Start`,
          days: Math.max(Math.floor((goalData.duration || 30) * 0.7), 14),
          description: 'Shorter timeline, focused on essentials'
        },
        {
          id: '3',
          title: `${improvedTitle} - Comprehensive`,
          days: Math.min(Math.floor((goalData.duration || 30) * 1.5), 90),
          description: 'Extended timeline, includes advanced techniques'
        }
      ];
      
      console.log('📝 [AI DEBUG] Generated AI suggestions:', aiGeneratedSuggestions);
      
      setAiSuggestions(aiGeneratedSuggestions);
      setIsGeneratingSuggestions(false);
      
      // Move to goal suggestions step
      setPhase('actions');
      setCurrentStepIndex(conversationSteps.length - 1); // Go to goalSuggestions step
      
      const arisMessage: Message = {
        id: Date.now().toString(),
        text: "Perfect! I've analyzed your goal and created some improved versions. These use the SMART framework to increase your success rate by up to 42%. Which approach resonates with you?",
        isAris: true,
        timestamp: new Date(),
      };
      addAnimatedMessage(arisMessage);
      
      console.log('🎉 [AI DEBUG] Successfully completed generateAISuggestions');
      
    } catch (error) {
      console.error('❌ [AI DEBUG] Error generating AI suggestions:', error);
      setIsGeneratingSuggestions(false);
      
      // Fall back to showing goalSuggestions step with mock data
      setPhase('actions');
      setCurrentStepIndex(conversationSteps.length - 1);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "I'll help you refine your goal. Here are some suggestions based on proven goal-setting frameworks:",
        isAris: true,
        timestamp: new Date(),
      };
      addAnimatedMessage(errorMessage);
    }
  };

  const handleGoalSuggestionSelection = (type: 'original' | 'alternative' | 'custom', title: string, days: number) => {
    const newGoalData = { ...goalData };
    newGoalData.selectedGoalOption = type;
    newGoalData.title = title;
    newGoalData.duration = days;
    setGoalData(newGoalData);
    
    // Create user response message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `I'll work on "${title}" for ${days} days`,
      isAris: false,
      timestamp: new Date(),
    };
    addAnimatedMessage(userMessage);
    
    // Now generate the action plan
    setPhase('actions');
    generateActions();
  };

  const generateActions = async () => {
    console.log('🎬 [ACTION DEBUG] Starting generateActions');
    console.log('📝 [ACTION DEBUG] Current goalData:', goalData);
    console.log('👤 [ACTION DEBUG] User ID:', user?.id);
    
    setIsProcessing(true);
    
    try {
      // Use user from context
      if (!user?.id) {
        console.error('❌ [ACTION DEBUG] User not authenticated');
        throw new Error('User not authenticated');
      }
      const userId = user.id;
      
      // Create goal with AI improvements
      const aiGoalData: AIGoalData = {
        title: goalData.title,
        startDate: goalData.startDate,
        duration: goalData.duration,
        images: goalData.images,
        reason: goalData.reason,
        schedule: goalData.schedule,
        startingLevel: goalData.startingLevel,
        restrictions: goalData.restrictions,
        category: goalData.selectedGoalOption === 'custom' ? 'custom' : undefined
      };
      
      console.log('📊 [ACTION DEBUG] Calling createGoalWithAI with data:', aiGoalData);
      
      const { goal, improvedTitle, suggestions } = await createGoalWithAI(aiGoalData, userId);
      
      console.log('✅ [ACTION DEBUG] createGoalWithAI response:');
      console.log('  - goal:', goal);
      console.log('  - improvedTitle:', improvedTitle);
      console.log('  - suggestions:', suggestions);
      
      // Generate personalization questions
      console.log('❓ [ACTION DEBUG] Generating personalization questions for goal:', goal.id);
      const questions = await generatePersonalizationQuestions(goal.id);
      
      console.log('✅ [ACTION DEBUG] Generated questions:', questions);
      
      // Create responses based on user's conversation inputs
      const responses = [
        { question_type: 'experience' as const, answer: goalData.startingLevel },
        { question_type: 'limitations' as const, answer: goalData.restrictions },
        { question_type: 'personalization' as const, answer: goalData.preferences || 'I prefer structured learning with clear milestones' }
      ];
      
      console.log('📝 [ACTION DEBUG] User responses:', responses);
      
      // Generate action plan
      console.log('🎯 [ACTION DEBUG] Generating action plan...');
      const { actions, planData } = await generateActionPlan(goal.id, goal, responses);
      
      console.log('✅ [ACTION DEBUG] Generated action plan:');
      console.log('  - actions:', actions);
      console.log('  - planData:', planData);
      
      // Convert AI actions to frontend format
      const convertedActions: Action[] = actions.map(action => ({
        id: action.id,
        title: action.title,
        description: action.description,
        estimatedTime: action.estimatedTime,
        day: action.day,
        dueDate: action.dueDate
      }));
      
      console.log('🔄 [ACTION DEBUG] Converted actions for frontend:', convertedActions);

      const newGoalData = { ...goalData };
      newGoalData.actions = convertedActions;
      setGoalData(newGoalData);
      
      console.log('💾 [ACTION DEBUG] Updated goalData with actions');

      const arisMessage: Message = {
        id: Date.now().toString(),
        text: "Perfect! I've created a personalized action plan based on your goal and preferences. Here's your AI-generated roadmap to success:",
        isAris: true,
        timestamp: new Date(),
      };
      addAnimatedMessage(arisMessage);
      
      setIsProcessing(false);
      setShowActionFeedback(true);
      setTotalProgress(prev => prev + 1);
      
      console.log('🎉 [ACTION DEBUG] Successfully completed generateActions');
      
    } catch (error) {
      console.error('❌ [ACTION DEBUG] Error in generateActions:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "I encountered an issue creating your action plan. Please try again or check that you're signed in.",
        isAris: true,
        timestamp: new Date(),
      };
      addAnimatedMessage(errorMessage);
      
      setIsProcessing(false);
    }
  };


  const regenerateActions = () => {
    setIsProcessing(true);
    
    // Simulate AI regeneration with user feedback
    setTimeout(() => {
      const improvedActions: Action[] = [];
      const startDate = new Date(goalData.startDate);
      
      for (let i = 1; i <= 20; i++) {
        const actionDate = new Date(startDate);
        actionDate.setDate(startDate.getDate() + i - 1);
        
        improvedActions.push({
          id: i.toString(),
          title: `Enhanced ${goalData.title.toLowerCase()} - Day ${i}`,
          description: `Improved practice session based on feedback - ${i <= 5 ? 'building foundations' : i <= 10 ? 'developing skills' : i <= 15 ? 'advanced practice' : 'perfecting mastery'}`,
          estimatedTime: 25 + (i % 4) * 10, // Varying time: 25, 35, 45, 55 minutes
          day: i,
          dueDate: actionDate.toISOString().split('T')[0],
        });
      }

      const newGoalData = { ...goalData };
      newGoalData.actions = improvedActions;
      setGoalData(newGoalData);

      const arisMessage: Message = {
        id: Date.now().toString(),
        text: "Great! I've updated your action plan based on your feedback. Here's the improved version:",
        isAris: true,
        timestamp: new Date(),
      };
      addAnimatedMessage(arisMessage);
      
      setIsProcessing(false);
      setShowActionFeedback(true);
      
      // Navigate back to tabs and trigger sticky overlay
      setTimeout(() => {
        navigation?.navigate('Tabs', { showActionSuggestions: true });
      }, 1000);
    }, 2000);
  };

  const handleFinish = () => {
    console.log('Goal created:', goalData);
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      // Go back one step in the conversation
      const previousIndex = currentStepIndex - 1;
      setCurrentStepIndex(previousIndex);
      
      // Remove the last few messages to go back to previous state
      const messagesToKeep = messages.slice(0, -2); // Remove last user and Aris message
      setMessages(messagesToKeep);
    } else {
      // Exit the flow if at the beginning
      if (navigation?.goBack) {
        navigation.goBack();
      }
    }
  };

  const handleClose = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const renderInputComponent = () => {
    const currentStep = getCurrentStep();
    if (!currentStep) return null;

    const isDisabled = isTransitioning;

    switch (currentStep.type) {
      case 'text':
        if (currentStep.id === 'goal') {
          return (
            <View style={styles.inputContainer}>
              <View style={styles.dreamContentWrapper}>
                <Pills
                  pills={dreamCategories.map(cat => ({
                    ...cat,
                    selected: cat.id === selectedCategory
                  }))}
                  onPillPress={isDisabled ? () => {} : handleCategoryChange}
                />
                
                <View style={styles.dreamsList}>
                  {filteredDreams.map((dream) => (
                    <ListRow
                      key={dream.id}
                      title={dream.title}
                      onPress={isDisabled ? () => {} : () => handleDreamSelection(dream.title)}
                      size="small"
                      rightElement="chevron"
                    />
                  ))}
                </View>
              </View>
              
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.dynamicInput, isDisabled && styles.disabledInput]}
                  value={currentInput}
                  onChangeText={isDisabled ? undefined : setCurrentInput}
                  placeholder="Enter your own dream..."
                  placeholderTextColor={theme.colors.grey[400]}
                  multiline
                  maxLength={500}
                  editable={!isDisabled}
                />
                <IconButton
                  icon="send"
                  onPress={() => handleTextInput(currentInput)}
                  variant="primary"
                  size="md"
                  disabled={!currentInput.trim() || isDisabled}
                />
              </View>
            </View>
          );
        }
        
        return (
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput 
                style={[styles.dynamicInput, isDisabled && styles.disabledInput]}
                value={currentInput}
                onChangeText={isDisabled ? undefined : setCurrentInput}
                placeholder="Type your response..."
                placeholderTextColor={theme.colors.grey[400]}
                multiline
                maxLength={500}
                editable={!isDisabled}
              />
              <IconButton
                icon="send"
                onPress={() => handleTextInput(currentInput)}
                variant="primary"
                size="md"
                disabled={!currentInput.trim() || isDisabled}
              />
            </View>
          </View>
        );

      case 'startDate':
        return (
          <View style={styles.selectionContainer}>
            <View style={styles.pillsContainer}>
              <Pills
                pills={getStartDateOptions().map(option => ({
                  ...option,
                  selected: startDateInput === option.id
                }))}
                onPillPress={handleStartDatePillPress}
              />
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.dynamicInputWithIcon}
                  value={formatDateDisplay(startDateInput)}
                  onChangeText={handleStartDateInputChange}
                  placeholder="Select a date"
                  placeholderTextColor={theme.colors.grey[400]}
                  editable={false}
                />
                <IconButton
                  icon="calendar"
                  onPress={handleCalendarPress}
                  variant="ghost"
                  size="sm"
                />
              </View>
              <IconButton
                icon="send"
                onPress={handleStartDateSubmit}
                variant="primary"
                size="md"
                disabled={!startDateInput.trim()}
              />
            </View>
          </View>
        );

      case 'daySelection':
        return (
          <View style={styles.selectionContainer}>
            <View style={styles.pillsContainer}>
              <Pills
                pills={dayOptions.map(option => ({
                  ...option,
                  selected: daysInput === option.id
                }))}
                onPillPress={isDisabled ? () => {} : handleDayPillPress}
              />
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.dynamicInputWithIcon, isDisabled && styles.disabledInput]}
                  value={daysInput}
                  onChangeText={isDisabled ? undefined : handleDaysInputChange}
                  placeholder="Enter number of days..."
                  placeholderTextColor={theme.colors.grey[400]}
                  keyboardType="numeric"
                  maxLength={4}
                  editable={!isDisabled}
                />
                <IconButton
                  icon="calendar"
                  onPress={isDisabled ? () => {} : handleEndDateCalendarPress}
                  variant="ghost"
                  size="sm"
                  disabled={isDisabled}
                />
              </View>
              <IconButton
                icon="send"
                onPress={handleDaysSubmit}
                variant="primary"
                size="md"
                disabled={!daysInput.trim() || isDisabled}
              />
            </View>
          </View>
        );

      case 'images':
        return (
          <View style={styles.selectionContainer}>
            <ImageGallery
              images={goalData.images}
              onImagesChange={isDisabled ? () => {} : handleImageSelection}
              maxImages={6}
              addButtonText="Add Image"
              emptyStateTitle=""
              emptyStateDescription=""
            />
            <Button
              title="Continue"
              onPress={handleImagesContinue}
              style={styles.continueButton}
              disabled={isDisabled}
            />
          </View>
        );

      case 'schedule':
        const schedules = goalData.schedule || [{ id: 1, name: 'Schedule One', days: [], timeBlocks: [], expanded: true }];
        
        return (
          <View style={styles.scheduleFullContainer}>
            <Text style={styles.scheduleTitle}>Select your availability</Text>
            <View style={styles.scheduleContent}>
              <ScheduleSelector
                schedules={schedules}
                onScheduleChange={handleScheduleSelection}
                disabled={isDisabled}
              />
            </View>
            <Button
              title="Continue"
              onPress={handleScheduleContinue}
              style={styles.continueButton}
              disabled={isDisabled}
            />
          </View>
        );

      case 'goalSuggestions':
        const suggestions = aiSuggestions.length > 0 ? aiSuggestions : [
          {
            id: '1',
            title: `Master ${goalData.title.toLowerCase()} fundamentals`,
            days: Math.max(Math.floor((goalData.duration || 30) * 0.7), 14),
            description: `${Math.floor(((goalData.duration || 30) - Math.max(Math.floor((goalData.duration || 30) * 0.7), 14)) / (goalData.duration || 30) * 100)}% shorter, focuses on core skills`
          },
          {
            id: '2', 
            title: `Complete ${goalData.title.toLowerCase()} challenge`,
            days: goalData.duration || 30,
            description: 'Same timeline, structured approach'
          },
          {
            id: '3',
            title: `Advanced ${goalData.title.toLowerCase()} mastery`,
            days: Math.min(Math.floor((goalData.duration || 30) * 1.5), 90),
            description: `${Math.floor((Math.min(Math.floor((goalData.duration || 30) * 1.5), 90) - (goalData.duration || 30)) / (goalData.duration || 30) * 100)}% longer, advanced techniques`
          }
        ];

        return (
          <View style={styles.selectionContainer}>
            <View style={styles.goalSuggestionsContent}>
              {/* Current Goal Section */}
              <View style={styles.goalSection}>
                <Text style={styles.sectionTitle}>Your Current Goal</Text>
                <ListRow
                  title={`${goalData.title} in ${goalData.duration} days`}
                  description="Your original goal as specified"
                  onPress={isDisabled ? () => {} : () => handleGoalSuggestionSelection('original', goalData.title, goalData.duration || 30)}
                  size="small"
                  rightElement="chevron"
                />
              </View>

              {/* Suggested Goals Section */}
              <View style={styles.goalSection}>
                <Text style={styles.sectionTitle}>
                  {isGeneratingSuggestions ? 'Generating AI Suggestions...' : 'AI-Generated Suggestions'}
                </Text>
                {isGeneratingSuggestions ? (
                  <View style={styles.loadingContainer}>
                    <TypingIndicator />
                  </View>
                ) : (
                  suggestions.map((suggestion) => (
                    <ListRow
                      key={suggestion.id}
                      title={`${suggestion.title} in ${suggestion.days} days`}
                      description={suggestion.description}
                      onPress={isDisabled ? () => {} : () => handleGoalSuggestionSelection('alternative', suggestion.title, suggestion.days)}
                      size="small"
                      rightElement="chevron"
                    />
                  ))
                )}
              </View>
            </View>

            {/* Custom Goal Input */}
            <View style={styles.customGoalSection}>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.goalTitleInput, isDisabled && styles.disabledInput]}
                  value={goalData.customTitle || ''}
                  onChangeText={isDisabled ? undefined : (text) => setGoalData({...goalData, customTitle: text})}
                  placeholder="Goal title..."
                  placeholderTextColor={theme.colors.grey[400]}
                  editable={!isDisabled}
                />
                <TextInput
                  style={[styles.goalDaysInput, isDisabled && styles.disabledInput]}
                  value={goalData.customDays?.toString() || ''}
                  onChangeText={isDisabled ? undefined : (text) => {
                    const days = parseInt(text.replace(/[^0-9]/g, ''));
                    setGoalData({...goalData, customDays: days || undefined});
                  }}
                  placeholder="Days"
                  placeholderTextColor={theme.colors.grey[400]}
                  keyboardType="numeric"
                  maxLength={3}
                  editable={!isDisabled}
                />
                <IconButton
                  icon="send"
                  onPress={() => handleGoalSuggestionSelection('custom', goalData.customTitle || '', goalData.customDays || 30)}
                  variant="primary"
                  size="md"
                  disabled={!goalData.customTitle?.trim() || !goalData.customDays || isDisabled}
                />
              </View>
            </View>
          </View>
        );

      case 'actions':
        return null; // Actions are now displayed in the chat messages area


      default:
        return null;
    }
  };

  const getEstimatedTotalSteps = () => {
    // Base steps + potential AI iterations + action generation
    return conversationSteps.length + 2;
  };
  
  const getCurrentStepTitle = () => {
    const currentStep = getCurrentStep();
    if (!currentStep) return 'Goal Setup Progress';
    
    switch (currentStep.id) {
      case 'goal':
        return 'Choose Your Dream';
      case 'startDate':
        return 'Set Start Date';
      case 'duration':
        return 'Choose Duration';
      case 'images':
        return 'Add Inspiration';
      case 'schedule':
        return 'Plan Your Time';
      case 'reason':
        return 'Your Motivation';
      case 'startingLevel':
        return 'Current Level';
      case 'restrictions':
        return 'Known Constraints';
      case 'goalSuggestions':
        return 'Refine Your Goal';
      default:
        if (phase === 'actions') {
          return 'Creating Your Plan';
        }
        return 'Goal Setup Progress';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <IconButton
          icon="chevron_left"
          onPress={handleBack}
          variant="secondary"
          size="md"
        />
        <View style={styles.progressContainer}>
          <ProgressIndicator
            currentStep={totalProgress}
            totalSteps={getEstimatedTotalSteps()}
            title={getCurrentStepTitle()}
          />
        </View>
        <IconButton
          icon="close"
          onPress={handleClose}
          variant="secondary"
          size="md"
        />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <Animated.View 
            key={message.id} 
            style={[
              styles.messageRow,
              message.isAris ? styles.arisMessageRow : styles.userMessageRow,
              {
                opacity: message.animatedValue || 1,
                transform: [{
                  translateY: message.animatedValue 
                    ? message.animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      })
                    : 0
                }]
              }
            ]}
          >
            {message.isAris && (
              <View style={styles.avatarContainer}>
                <SvgXml xml={arisAvatar} width={40} height={40} />
              </View>
            )}
            <View style={[
              styles.messageBubble,
              message.isAris ? styles.arisBubble : styles.userBubble
            ]}>
              <Text style={[
                styles.messageText,
                message.isAris ? styles.arisText : styles.userText
              ]}>
                {message.text}
              </Text>
            </View>
          </Animated.View>
        ))}
        
        {(isProcessing || isTransitioning) && (
          <View style={styles.processingContainer}>
            <View style={styles.avatarContainer}>
              <SvgXml xml={arisAvatar} width={40} height={40} />
            </View>
            <View style={styles.processingBubble}>
              {isTransitioning ? (
                <TypingIndicator />
              ) : (
                <Text style={styles.processingText}>
                  I'm creating your personalized action plan...
                </Text>
              )}
            </View>
          </View>
        )}
        
        {goalData.actions && goalData.actions.length > 0 && phase === 'actions' && (
          <View style={styles.actionPlanContainer}>
            <ScrollView 
              horizontal={false}
              showsVerticalScrollIndicator={false}
              style={styles.actionsList}
            >
              {goalData.actions.map((action) => (
                <CompactActionCard
                  key={action.id}
                  id={action.id}
                  title={action.title}
                  status="todo"
                  estimatedTime={action.estimatedTime}
                  dueDate={action.dueDate}
                  onPress={() => {}} // No action needed for preview
                  onStatusChange={() => {}} // No action needed for preview
                />
              ))}
            </ScrollView>
            
          </View>
        )}
      </ScrollView>

      {!isProcessing && (phase === 'feedback' || (getCurrentStep() && phase !== 'actions')) && (
        <Animated.View style={{ 
          opacity: fadeAnim,
          flex: getCurrentStep()?.type === 'schedule' ? 1 : 0, // Expand for schedule, normal for others
        }}>
          {renderInputComponent()}
        </Animated.View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={new Date(startDateInput)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDatePickerChange}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDateInput ? new Date(endDateInput) : new Date(goalData.startDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDatePickerChange}
          minimumDate={new Date(goalData.startDate)}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface[100],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface[100],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey[200],
  },
  progressContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
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
  processingContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    justifyContent: 'flex-start',
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
  inputContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface[100],
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
    minHeight: 100, // Ensure consistent minimum height to accommodate all content
  },
  inputWrapper: {
    flex: 1,
    marginBottom: 0,
  },
  dynamicInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.grey[900],
    backgroundColor: theme.colors.surface[50],
    minHeight: 40,
    maxHeight: 120,
    textAlignVertical: 'center',
  },
  selectionContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface[100],
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
    minHeight: 140, // Ensure consistent minimum height to accommodate all content
  },
  continueButton: {
    marginTop: theme.spacing.md,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface[100],
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
    minHeight: 140, // Ensure consistent minimum height to accommodate all content
  },
  actionCard: {
    backgroundColor: theme.colors.surface[200],
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  actionDescription: {
    fontSize: 14,
    color: theme.colors.grey[600],
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  actionTime: {
    fontSize: 12,
    color: theme.colors.grey[500],
    fontWeight: '500',
  },
  finishButton: {
    marginTop: theme.spacing.md,
  },
  dreamContentWrapper: {
    marginBottom: theme.spacing.md,
    // Ensure consistent layout
    flexShrink: 0,
  },
  dreamsList: {
    marginTop: theme.spacing.md,
    // Ensure consistent layout during transitions
    flexShrink: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: 40, // Ensure consistent row height
  },
  pillsContainer: {
    marginBottom: theme.spacing.md,
  },
  inputWithIcon: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface[50],
    minHeight: 40,
  },
  dynamicInputWithIcon: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.grey[900],
    backgroundColor: 'transparent',
    minHeight: 40,
    textAlignVertical: 'center',
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: theme.colors.grey[100],
    // Don't override existing padding/margins - just visual changes
  },
  orText: {
    textAlign: 'center',
    color: theme.colors.grey[500],
    fontSize: 14,
    marginVertical: theme.spacing.sm,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.grey[600],
    marginHorizontal: 2,
  },
  scheduleContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    backgroundColor: theme.colors.surface[100],
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
  },
  scheduleFullContainer: {
    flex: 1, // Increased from 1 to 1.2 to make container slightly taller
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg, // Added small padding under continue button
    backgroundColor: theme.colors.surface[100],
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
  },
  schedulePickerWrapper: {
    marginBottom: theme.spacing.md,
    maxHeight: 300, // Cap height but allow natural sizing
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.md,
  },
  scheduleSubtitle: {
    fontSize: 14,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  dayButton: {
    backgroundColor: theme.colors.surface[200],
    borderRadius: 12,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDayButton: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[500],
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  selectedDayButtonText: {
    color: theme.colors.primary[700],
  },
  // New Schedule Card Styles
  scheduleCard: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.grey[200],
    overflow: 'hidden',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface[100],
  },
  scheduleHeaderLeft: {
    flex: 1,
  },
  scheduleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  scheduleCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: 2,
  },
  scheduleCardSubtitle: {
    fontSize: 14,
    color: theme.colors.grey[600],
  },
  deleteButton: {
    padding: theme.spacing.xs,
    borderRadius: 6,
    backgroundColor: theme.colors.error[50],
  },
  deleteButtonText: {
    fontSize: 16,
  },
  expandButton: {
    padding: theme.spacing.xs,
    borderRadius: 6,
    backgroundColor: theme.colors.grey[100],
  },
  expandButtonText: {
    fontSize: 16,
    color: theme.colors.grey[700],
  },
  scheduleContent: {
    flex: 1,
    marginBottom: theme.spacing.xs, // Reduced from md to xs
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.grey[500],
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.grey[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDayCircle: {
    backgroundColor: theme.colors.primary[500],
  },
  dayCircleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.grey[700],
  },
  selectedDayCircleText: {
    color: theme.colors.surface[50],
  },
  timeGridContainer: {
    gap: theme.spacing.sm,
  },
  timeRangeBlock: {
    marginBottom: theme.spacing.sm,
  },
  timeRangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  timeRangeStart: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.grey[700],
  },
  timeRangeEnd: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.grey[700],
  },
  timeSlotsGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    zIndex: 2,
  },
  selectedTimeSlot: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[600],
    borderRadius: 6,
  },
  selectedTimeRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  selectedTimeRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.surface[50],
    textAlign: 'center',
  },
  selectedTimeSlotText: {
    fontSize: 8,
    fontWeight: '500',
    color: theme.colors.surface[50],
    textAlign: 'center',
  },
  timeRangeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  timeSlotsContainer: {
    position: 'relative',
    height: 36,
    backgroundColor: theme.colors.grey[200],
    borderRadius: 8,
    flexDirection: 'row',
  },
  timeSlot: {
    flex: 1,
    height: '100%',
    backgroundColor: 'transparent',
  },
  addScheduleButton: {
    borderWidth: 2,
    borderColor: theme.colors.grey[300],
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.surface[50],
    marginBottom: theme.spacing.md,
  },
  addScheduleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.grey[600],
  },
  goalSuggestionsContent: {
    marginBottom: theme.spacing.xs,
  },
  goalSection: {
    marginBottom: theme.spacing.sm,
  },
  goalTitleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.grey[900],
    backgroundColor: theme.colors.surface[50],
    minHeight: 40,
    textAlignVertical: 'center',
    marginRight: theme.spacing.sm,
  },
  goalDaysInput: {
    width: 80,
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.grey[900],
    backgroundColor: theme.colors.surface[50],
    minHeight: 40,
    textAlignVertical: 'center',
    textAlign: 'center',
    marginRight: theme.spacing.sm,
  },
  customGoalSection: {
    paddingTop: theme.spacing.md,
  },
  actionPlanContainer: {
    marginBottom: theme.spacing.lg,
  },
  actionsList: {
    maxHeight: 600,
    paddingHorizontal: theme.spacing.sm,
  },
  feedbackButtons: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  approveButton: {
    marginBottom: theme.spacing.sm,
  },
  improveButton: {
    marginBottom: theme.spacing.sm,
  },
  feedbackContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface[100],
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
  },
  feedbackForm: {
    gap: theme.spacing.md,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.grey[900],
    backgroundColor: theme.colors.surface[50],
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  submitFeedbackButton: {
    marginTop: theme.spacing.md,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
});

export default AddGoalFlow;