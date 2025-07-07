import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TextInput, Animated, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../utils/theme';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { Pills } from '../components/Pills';
import { ListRow } from '../components/ListRow';
import { ImageGallery } from '../components/ImageGallery';
import { SvgXml } from 'react-native-svg';

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

const arisAvatar = `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<!-- Uploaded to: SVG Repo, www.svgrepo.com, Transformed by: SVG Repo Mixer Tools -->
<svg width="800px" height="800px" viewBox="0 0 64 64" id="wizard" xmlns="http://www.w3.org/2000/svg" fill="#000000">
<g id="SVGRepo_bgCarrier" stroke-width="0"/>
<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
<g id="SVGRepo_iconCarrier">
<title>wizard</title>
<circle cx="33" cy="23" r="23" style="fill:#D1E9F1"/>
<line x1="7" y1="17" x2="7" y2="19" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="7" y1="23" x2="7" y2="25" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<path d="M21.778,47H47.222A8.778,8.778,0,0,1,56,55.778V61a0,0,0,0,1,0,0H13a0,0,0,0,1,0,0V55.778A8.778,8.778,0,0,1,21.778,47Z" style="fill:#0F2A3F;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<polygon points="32 61 28 61 34 49 38 49 32 61" style="fill:#ffffff;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<path d="M59,39H11v4.236A5.763,5.763,0,0,0,16.764,49L34,55l19.236-6A5.763,5.763,0,0,0,59,43.236Z" style="fill:#0F2A3F;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="3" y1="21" x2="5" y2="21" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="9" y1="21" x2="11" y2="21" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="55.5" cy="6.5" r="2.5" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="13.984" cy="6.603" r="1.069" style="fill:#091A2B"/>
<ellipse cx="35" cy="39" rx="24" ry="6" style="fill:#091A2B;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="5.984" cy="30.603" r="1.069" style="fill:#091A2B"/>
<path d="M48,13V10.143A6.143,6.143,0,0,0,41.857,4H27.143A6.143,6.143,0,0,0,21,10.143V13" style="fill:#0F2A3F;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<rect x="20" y="17.81" width="29" height="14.19" style="fill:#ffe8dc;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<path d="M41.972,13H48a4,4,0,0,1,4,4h0a4,4,0,0,1-4,4H21a4,4,0,0,1-4-4h0a4,4,0,0,1,4-4H37" style="fill:#ffffff;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="39.5" cy="25.5" r="1.136" style="fill:#091A2B"/>
<circle cx="29.5" cy="25.5" r="1.136" style="fill:#091A2B"/>
<path d="M43.875,32a6.472,6.472,0,0,0-5.219-2.2A5.2,5.2,0,0,0,35,31.974,5.2,5.2,0,0,0,31.344,29.8,6.472,6.472,0,0,0,26.125,32H20v4.5a14.5,14.5,0,0,0,29,0V32Z" style="fill:#ffffff;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="33" y1="36" x2="37" y2="36" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<rect x="32" y="10" width="5" height="5" transform="translate(1.266 28.056) rotate(-45)" style="fill:#75BDD5;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
</g>
</svg>`;

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
}

interface Action {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  day: number;
}

interface ConversationStep {
  id: string;
  type: 'text' | 'daySelection' | 'schedule' | 'actions' | 'images' | 'startDate';
  question: string;
  completed: boolean;
  skippable?: boolean;
}

type ConversationPhase = 'discovery' | 'planning' | 'actions' | 'feedback' | 'complete';

const dreamCategories = [
  { id: 'tech', label: 'Tech' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'finance', label: 'Finance' },
  { id: 'design', label: 'Design' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'self-development', label: 'Self-Development' },
  { id: 'popular', label: 'Popular' },
];

const popularDreams = [
  // Popular dreams
  {
    id: 'guitar',
    title: 'Learn to play guitar and perform at an open mic night',
    category: 'popular',
  },
  {
    id: 'marathon',
    title: 'Run a half marathon in under 2 hours',
    category: 'popular',
  },
  {
    id: 'cooking',
    title: 'Master cooking and host dinner parties',
    category: 'popular',
  },
  {
    id: 'photography',
    title: 'Learn photography and create a stunning portfolio',
    category: 'popular',
  },
  {
    id: 'fitness',
    title: 'Get in the best shape of my life',
    category: 'popular',
  },
  
  // Tech dreams
  {
    id: 'app',
    title: 'Build and launch my first mobile app',
    category: 'tech',
  },
  {
    id: 'coding',
    title: 'Learn to code and switch to a tech career',
    category: 'tech',
  },
  {
    id: 'ai',
    title: 'Master AI and machine learning fundamentals',
    category: 'tech',
  },
  {
    id: 'website',
    title: 'Create a professional website from scratch',
    category: 'tech',
  },
  {
    id: 'blockchain',
    title: 'Understand blockchain and cryptocurrency',
    category: 'tech',
  },
  
  // Finance dreams
  {
    id: 'business',
    title: 'Start a side business and make $1000/month',
    category: 'finance',
  },
  {
    id: 'investing',
    title: 'Learn investing and build a portfolio',
    category: 'finance',
  },
  {
    id: 'debt',
    title: 'Pay off all my debt and become debt-free',
    category: 'finance',
  },
  {
    id: 'emergency',
    title: 'Build a 6-month emergency fund',
    category: 'finance',
  },
  {
    id: 'property',
    title: 'Save for and buy my first property',
    category: 'finance',
  },
  
  // Design dreams
  {
    id: 'graphic',
    title: 'Master graphic design and create stunning visuals',
    category: 'design',
  },
  {
    id: 'ux',
    title: 'Learn UX/UI design and land a design job',
    category: 'design',
  },
  {
    id: 'illustration',
    title: 'Develop my illustration skills and style',
    category: 'design',
  },
  {
    id: 'branding',
    title: 'Create a complete brand identity system',
    category: 'design',
  },
  {
    id: 'portfolio',
    title: 'Build a professional design portfolio',
    category: 'design',
  },
  
  // Self-development dreams
  {
    id: 'spanish',
    title: 'Learn Spanish fluently for travel',
    category: 'self-development',
  },
  {
    id: 'meditation',
    title: 'Establish a daily meditation practice',
    category: 'self-development',
  },
  {
    id: 'reading',
    title: 'Read 50 books this year',
    category: 'self-development',
  },
  {
    id: 'confidence',
    title: 'Build unshakeable self-confidence',
    category: 'self-development',
  },
  {
    id: 'speaking',
    title: 'Overcome fear of public speaking',
    category: 'self-development',
  },
  
  // Marketing dreams
  {
    id: 'social',
    title: 'Build a strong social media presence',
    category: 'marketing',
  },
  {
    id: 'content',
    title: 'Create viral content and grow my audience',
    category: 'marketing',
  },
  {
    id: 'brand',
    title: 'Launch and market my personal brand',
    category: 'marketing',
  },
  {
    id: 'newsletter',
    title: 'Start a successful email newsletter',
    category: 'marketing',
  },
  {
    id: 'influencer',
    title: 'Become an influencer in my niche',
    category: 'marketing',
  },
  
  // Healthcare dreams
  {
    id: 'nutrition',
    title: 'Master nutrition and transform my health',
    category: 'healthcare',
  },
  {
    id: 'sleep',
    title: 'Improve my sleep quality and energy levels',
    category: 'healthcare',
  },
  {
    id: 'yoga',
    title: 'Become proficient in yoga and mindfulness',
    category: 'healthcare',
  },
  {
    id: 'mental',
    title: 'Improve my mental health and wellbeing',
    category: 'healthcare',
  },
  {
    id: 'habits',
    title: 'Build healthy daily habits that stick',
    category: 'healthcare',
  },
];

const dayOptions = [
  { id: '30', label: '30 days' },
  { id: '60', label: '60 days' },
  { id: '90', label: '90 days' },
];

const getStartDateOptions = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const getDayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long' });

  return [
    { id: formatDate(today), label: 'Today' },
    { id: formatDate(tomorrow), label: 'Tomorrow' },
    { id: formatDate(dayAfterTomorrow), label: getDayName(dayAfterTomorrow) },
  ];
};

const formatDateDisplay = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    
    return `${weekday} ${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
};

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
    question: "Great! What's the main reason this goal is important to you?",
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
];

const AddGoalFlow = ({ navigation }: { navigation?: any }) => {
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
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [filteredDreams, setFilteredDreams] = useState(popularDreams.filter(dream => dream.category === 'popular'));
  const [daysInput, setDaysInput] = useState('');
  const [startDateInput, setStartDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [endDateInput, setEndDateInput] = useState('');
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
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
      // All steps completed, move to action generation
      setPhase('actions');
      generateActions();
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

  const generateActions = async () => {
    setIsProcessing(true);
    
    // Simulate AI action generation
    // In real implementation, this would call your AI API
    setTimeout(() => {
      const mockActions: Action[] = [
        {
          id: '1',
          title: `Practice ${goalData.title.toLowerCase()}`,
          description: 'Daily practice session to build fundamental skills',
          estimatedTime: 30,
          day: 1,
        },
        {
          id: '2',
          title: 'Research and study',
          description: 'Learn theory and best practices',
          estimatedTime: 45,
          day: 2,
        },
        {
          id: '3',
          title: 'Apply what you learned',
          description: 'Practical application of new knowledge',
          estimatedTime: 60,
          day: 3,
        },
      ];

      const newGoalData = { ...goalData };
      newGoalData.actions = mockActions;
      setGoalData(newGoalData);

      const arisMessage: Message = {
        id: Date.now().toString(),
        text: "Perfect! Based on everything you've told me, I've created a personalized action plan for you. Take a look at these actions and let me know what you think!",
        isAris: true,
        timestamp: new Date(),
      };
      addAnimatedMessage(arisMessage);
      
      setIsProcessing(false);
      setTotalProgress(prev => prev + 1);
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
          <View style={styles.scheduleContainer}>
            <Text style={styles.scheduleTitle}>Select your availability</Text>
            <View style={styles.schedulePickerWrapper}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {schedules.map((schedule, scheduleIndex) => (
                  <View key={schedule.id} style={styles.scheduleCard}>
                    {/* Schedule Header */}
                    <View style={styles.scheduleHeader}>
                      <View style={styles.scheduleHeaderLeft}>
                        <Text style={styles.scheduleCardTitle}>{schedule.name}</Text>
                        <Text style={styles.scheduleCardSubtitle}>
                          {schedule.timeBlocks?.length > 0 ? 
                            `• ${schedule.timeBlocks.map((blockId: number) => {
                              const hour = Math.floor(blockId / 2);
                              const minute = (blockId % 2) * 30;
                              const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                              const endMinute = minute + 30;
                              const endHour = endMinute >= 60 ? hour + 1 : hour;
                              const endMin = endMinute >= 60 ? 0 : endMinute;
                              const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
                              return `${startTime}-${endTime}`;
                            }).join(', ')}`
                            : '• No time selected'}
                        </Text>
                      </View>
                      <View style={styles.scheduleHeaderRight}>
                        {schedules.length > 1 && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                              if (!isDisabled) {
                                const newSchedules = schedules.filter(s => s.id !== schedule.id);
                                handleScheduleSelection(newSchedules);
                              }
                            }}
                            disabled={isDisabled}
                          >
                            <Text style={styles.deleteButtonText}>🗑</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.expandButton}
                          onPress={() => {
                            if (!isDisabled) {
                              const newSchedules = schedules.map((s, idx) => ({
                                ...s,
                                expanded: idx === scheduleIndex ? !s.expanded : false
                              }));
                              handleScheduleSelection(newSchedules);
                            }
                          }}
                          disabled={isDisabled}
                        >
                          <Text style={styles.expandButtonText}>{schedule.expanded ? '⌃' : '⌄'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Expanded Content */}
                    {schedule.expanded && (
                      <View style={styles.scheduleContent}>
                        {/* Days Section */}
                        <View style={styles.daysContainer}>
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dayIndex) => {
                            const isSelected = schedule.days?.includes(dayIndex) || false;
                            return (
                              <TouchableOpacity
                                key={dayIndex}
                                style={[
                                  styles.dayCircle,
                                  isSelected && styles.selectedDayCircle,
                                ]}
                                onPress={() => {
                                  if (!isDisabled) {
                                    const newSchedules = [...schedules];
                                    const currentDays = newSchedules[scheduleIndex].days || [];
                                    if (currentDays.includes(dayIndex)) {
                                      newSchedules[scheduleIndex].days = currentDays.filter((d: number) => d !== dayIndex);
                                    } else {
                                      newSchedules[scheduleIndex].days = [...currentDays, dayIndex];
                                    }
                                    handleScheduleSelection(newSchedules);
                                  }
                                }}
                                disabled={isDisabled}
                              >
                                <Text style={[
                                  styles.dayCircleText,
                                  isSelected && styles.selectedDayCircleText,
                                ]}>
                                  {day}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Time Section */}
                        <View style={styles.timeGridContainer}>
                          {[
                            { startHour: 0, endHour: 6 },
                            { startHour: 6, endHour: 12 },
                            { startHour: 12, endHour: 18 },
                            { startHour: 18, endHour: 24 },
                          ].map((timeRange, rangeIndex) => (
                            <View key={rangeIndex} style={styles.timeRangeBlock}>
                              <View style={styles.timeRangeHeader}>
                                <Text style={styles.timeRangeStart}>
                                  {timeRange.startHour.toString().padStart(2, '0')}:00
                                </Text>
                                <Text style={styles.timeRangeEnd}>
                                  {timeRange.endHour === 24 ? '00:00' : timeRange.endHour.toString().padStart(2, '0') + ':00'}
                                </Text>
                              </View>
                              
                              <View style={styles.timeSlotsContainer}>
                                {Array.from({ length: (timeRange.endHour - timeRange.startHour) * 2 }, (_, index) => {
                                  const hour = timeRange.startHour + Math.floor(index / 2);
                                  const minute = (index % 2) * 30;
                                  const slotId = hour * 2 + (minute / 30);
                                  
                                  return (
                                    <TouchableOpacity
                                      key={slotId}
                                      style={styles.timeSlot}
                                      onPress={() => {
                                        if (!isDisabled) {
                                          const newSchedules = [...schedules];
                                          const currentBlocks = newSchedules[scheduleIndex].timeBlocks || [];
                                          
                                          if (currentBlocks.includes(slotId)) {
                                            newSchedules[scheduleIndex].timeBlocks = currentBlocks.filter((b: number) => b !== slotId);
                                          } else {
                                            newSchedules[scheduleIndex].timeBlocks = [...currentBlocks, slotId];
                                          }
                                          handleScheduleSelection(newSchedules);
                                        }
                                      }}
                                      disabled={isDisabled}
                                      activeOpacity={1}
                                    />
                                  );
                                })}
                                
                                {/* Render selected time ranges as blue overlays */}
                                {schedule.timeBlocks && schedule.timeBlocks.length > 0 && (
                                  <>
                                    {(() => {
                                      // Group consecutive slots into ranges
                                      const sortedBlocks = [...schedule.timeBlocks].sort((a, b) => a - b);
                                      const ranges = [];
                                      let currentRange = [sortedBlocks[0]];
                                      
                                      for (let i = 1; i < sortedBlocks.length; i++) {
                                        if (sortedBlocks[i] === sortedBlocks[i-1] + 1) {
                                          currentRange.push(sortedBlocks[i]);
                                        } else {
                                          ranges.push(currentRange);
                                          currentRange = [sortedBlocks[i]];
                                        }
                                      }
                                      ranges.push(currentRange);
                                      
                                      return ranges.map((range, rangeIdx) => {
                                        const startSlot = range[0];
                                        const endSlot = range[range.length - 1];
                                        
                                        // Calculate position within this time range
                                        const startHour = Math.floor(startSlot / 2);
                                        const startMinute = (startSlot % 2) * 30;
                                        const endHour = Math.floor(endSlot / 2);
                                        const endMinute = (endSlot % 2) * 30 + 30;
                                        
                                        // Only show if in current time range
                                        if (startHour < timeRange.startHour || startHour >= timeRange.endHour) {
                                          return null;
                                        }
                                        
                                        const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
                                        const endTime = endMinute >= 60 ? 
                                          `${(endHour + 1).toString().padStart(2, '0')}:${(endMinute - 60).toString().padStart(2, '0')}` :
                                          `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                                        
                                        // Calculate position and size
                                        const slotsInRange = (timeRange.endHour - timeRange.startHour) * 2;
                                        const slotWidth = 100 / slotsInRange;
                                        const startPosition = (startSlot - timeRange.startHour * 2) * slotWidth;
                                        const width = range.length * slotWidth;
                                        
                                        return (
                                          <View
                                            key={rangeIdx}
                                            style={[
                                              styles.selectedTimeRange,
                                              {
                                                left: `${startPosition}%`,
                                                width: `${width}%`,
                                              }
                                            ]}
                                          >
                                            <Text style={styles.selectedTimeRangeText}>
                                              {startTime}
                                            </Text>
                                            <Text style={styles.selectedTimeRangeText}>
                                              {endTime}
                                            </Text>
                                          </View>
                                        );
                                      });
                                    })()}
                                  </>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}

                {/* Add Another Schedule Button */}
                <TouchableOpacity
                  style={styles.addScheduleButton}
                  onPress={() => {
                    if (!isDisabled) {
                      const newSchedule = {
                        id: Date.now(),
                        name: `Schedule ${schedules.length + 1}`,
                        days: [],
                        timeBlocks: [],
                        expanded: true
                      };
                      const newSchedules = schedules.map(s => ({ ...s, expanded: false }));
                      newSchedules.push(newSchedule);
                      handleScheduleSelection(newSchedules);
                    }
                  }}
                  disabled={isDisabled}
                >
                  <Text style={styles.addScheduleButtonText}>+ Add Another Schedule</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
            <Button
              title="Continue"
              onPress={handleScheduleContinue}
              style={styles.continueButton}
              disabled={isDisabled}
            />
          </View>
        );

      case 'actions':
        return (
          <View style={styles.actionsContainer}>
            {goalData.actions?.map((action) => (
              <View key={action.id} style={styles.actionCard}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
                <Text style={styles.actionTime}>
                  Day {action.day} • {action.estimatedTime} min
                </Text>
              </View>
            ))}
            <Button
              title="Create Goal"
              onPress={handleFinish}
              style={styles.finishButton}
            />
          </View>
        );

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
      </ScrollView>

      {!isProcessing && (
        <Animated.View style={{ 
          opacity: fadeAnim,
          flex: 0, // Prevent flex growth
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
    minHeight: 140, // Ensure consistent minimum height to accommodate all content
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
    gap: theme.spacing.sm,
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface[100],
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
    maxHeight: '70%', // Take up to 70% of available space
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
    padding: theme.spacing.md,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
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
});

export default AddGoalFlow;