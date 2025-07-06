import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../utils/theme';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { SchedulePicker } from '../components/SchedulePicker';
import { Pills } from '../components/Pills';
import { ListRow } from '../components/ListRow';
import { ImageGallery } from '../components/ImageGallery';
import { SvgXml } from 'react-native-svg';

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
    id: 'business',
    title: 'Start a side business and make $1000/month',
    category: 'finance',
  },
  {
    id: 'spanish',
    title: 'Learn Spanish fluently for travel',
    category: 'self-development',
  },
  {
    id: 'cooking',
    title: 'Master cooking and host dinner parties',
    category: 'popular',
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
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [filteredDreams, setFilteredDreams] = useState(popularDreams.filter(dream => dream.category === 'popular'));
  const [daysInput, setDaysInput] = useState('');
  const [startDateInput, setStartDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [endDateInput, setEndDateInput] = useState('');
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Update filtered dreams when category changes
  useEffect(() => {
    setFilteredDreams(popularDreams.filter(dream => dream.category === selectedCategory));
  }, [selectedCategory]);

  // Initialize the conversation
  useEffect(() => {
    if (messages.length === 0 && conversationSteps.length > 0) {
      const firstStep = conversationSteps[0];
      const initialMessage: Message = {
        id: '1',
        text: firstStep.question,
        isAris: true,
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
      setTotalProgress(1);
    }
  }, []);

  const getCurrentStep = () => {
    return conversationSteps[currentStepIndex];
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
      setCurrentStepIndex(nextIndex);
      
      // Add Aris's next message
      setTimeout(() => {
        const nextStep = conversationSteps[nextIndex];
        const arisMessage: Message = {
          id: Date.now().toString(),
          text: nextStep.question,
          isAris: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, arisMessage]);
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

    setMessages(prev => [...prev, userMessage]);

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

    setMessages(prev => [...prev, userMessage]);

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
    setMessages(prev => [...prev, userMessage]);
    
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
    setMessages(prev => [...prev, userMessage]);
    
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

  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setStartDateInput(dateString);
    }
  };

  const handleEndDateCalendarPress = () => {
    setShowEndDatePicker(!showEndDatePicker);
  };

  const handleEndDatePickerChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android
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
    }
  };

  const handleImageSelection = (images: string[]) => {
    const newGoalData = { ...goalData };
    newGoalData.images = images;
    setGoalData(newGoalData);
    
    // Create user response message
    const imageCount = images.length;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: imageCount > 0 ? `I've added ${imageCount} inspirational ${imageCount === 1 ? 'image' : 'images'}` : "I'll skip adding images for now",
      isAris: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    moveToNextStep();
  };

  const handleScheduleSelection = (schedule: any[]) => {
    const newGoalData = { ...goalData };
    newGoalData.schedule = schedule;
    setGoalData(newGoalData);
    
    // Create user response message
    const selectedDays = schedule.filter(day => day.selected).length;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `I've selected my availability for ${selectedDays} days of the week`,
      isAris: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
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
      setMessages(prev => [...prev, arisMessage]);
      
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
                  onPillPress={handleCategoryChange}
                />
                
                <View style={styles.dreamsList}>
                  {filteredDreams.map((dream) => (
                    <ListRow
                      key={dream.id}
                      title={dream.title}
                      onPress={() => handleDreamSelection(dream.title)}
                    />
                  ))}
                </View>
              </View>
              
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.dynamicInput}
                  value={currentInput}
                  onChangeText={setCurrentInput}
                  placeholder="Enter your own dream..."
                  placeholderTextColor={theme.colors.grey[400]}
                  multiline
                  maxLength={500}
                />
                <IconButton
                  icon="send"
                  onPress={() => handleTextInput(currentInput)}
                  variant="primary"
                  size="md"
                  disabled={!currentInput.trim()}
                />
              </View>
            </View>
          );
        }
        
        return (
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.dynamicInput}
              value={currentInput}
              onChangeText={setCurrentInput}
              placeholder="Type your response..."
              placeholderTextColor={theme.colors.grey[400]}
              multiline
              maxLength={500}
            />
            <IconButton
              icon="send"
              onPress={() => handleTextInput(currentInput)}
              variant="primary"
              size="md"
              disabled={!currentInput.trim()}
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
                onPillPress={handleDayPillPress}
              />
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.dynamicInput}
                value={daysInput}
                onChangeText={handleDaysInputChange}
                placeholder="Enter number of days..."
                placeholderTextColor={theme.colors.grey[400]}
                keyboardType="numeric"
                maxLength={4}
              />
              <IconButton
                icon="send"
                onPress={handleDaysSubmit}
                variant="primary"
                size="md"
                disabled={!daysInput.trim()}
              />
            </View>
            <Text style={styles.orText}>or</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.dynamicInputWithIcon}
                  value={endDateInput ? formatDateDisplay(endDateInput) : ''}
                  placeholder="Select end date"
                  placeholderTextColor={theme.colors.grey[400]}
                  editable={false}
                />
                <IconButton
                  icon="calendar"
                  onPress={handleEndDateCalendarPress}
                  variant="ghost"
                  size="sm"
                />
              </View>
              <IconButton
                icon="send"
                onPress={handleDaysSubmit}
                variant="primary"
                size="md"
                disabled={!daysInput.trim()}
              />
            </View>
          </View>
        );

      case 'images':
        return (
          <View style={styles.selectionContainer}>
            <ImageGallery
              images={goalData.images}
              onImagesChange={handleImageSelection}
              maxImages={6}
              addButtonText="Add Image"
              emptyStateTitle=""
              emptyStateDescription=""
            />
            <Button
              title="Continue"
              onPress={() => handleImageSelection(goalData.images)}
              style={styles.continueButton}
            />
          </View>
        );

      case 'schedule':
        return (
          <View style={styles.selectionContainer}>
            <SchedulePicker
              onScheduleChange={handleScheduleSelection}
              initialSchedule={goalData.schedule || undefined}
            />
            <Button
              title="Continue"
              onPress={() => handleScheduleSelection(goalData.schedule || [])}
              style={styles.continueButton}
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
            title="Goal Setup Progress"
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
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View key={message.id} style={[
            styles.messageRow,
            message.isAris ? styles.arisMessageRow : styles.userMessageRow
          ]}>
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
          </View>
        ))}
        
        {isProcessing && (
          <View style={styles.processingContainer}>
            <View style={styles.avatarContainer}>
              <SvgXml xml={arisAvatar} width={40} height={40} />
            </View>
            <View style={styles.processingBubble}>
              <Text style={styles.processingText}>
                I'm creating your personalized action plan...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {!isProcessing && renderInputComponent()}

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
  },
  dreamsList: {
    marginTop: theme.spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
});

export default AddGoalFlow;