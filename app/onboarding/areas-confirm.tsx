/**
 * Areas Confirmation Step - Review and provide feedback on generated areas
 * 
 * Shows the generated areas and allows users to provide feedback for regeneration
 * Matches the functionality of the create flow areas.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { AreaGrid } from '../../components/AreaChips';
import { OnboardingHeader } from '../../components/onboarding';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { generateOnboardingAreas } from '../../frontend-services/backend-bridge';
import type { Area } from '../../backend/database/types';

interface AreaSuggestion {
  id: string
  title: string
  emoji: string
  selected?: boolean
}

const AreasConfirmStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, setGeneratedAreas, setGeneratedActions } = useOnboardingContext();
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [newAreaTitle, setNewAreaTitle] = useState('');
  const [newAreaEmoji, setNewAreaEmoji] = useState('🚀');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Convert areas from context to local UI format, sorted by position
  const areaSuggestions: AreaSuggestion[] = state.generatedAreas
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(area => ({
      id: area.id,
      title: area.title,
      emoji: area.icon || '🚀',
      imageUrl: area.image_url
    }));

  const emojiOptions = ['🚀', '✍️', '🔧', '📢', '📚', '💡', '🎯', '⚡', '🔥', '💪', '🎨', '📈', '🌟', '🎉', '💎', '🏆'];

  const handleContinue = async () => {
    if (state.generatedAreas.length === 0) {
      Alert.alert('Error', 'No areas generated. Please try again.');
      return;
    }
    
    setIsContinuing(true);
    // Small delay to show loading feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    navigation.navigate('ActionsGenerating' as never);
  };

  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      Alert.alert('Feedback Required', 'Please provide feedback on what you\'d like to change.');
      return;
    }

    setIsLoading(true);
    try {
      const dreamParams = {
        title: state.answers[2] || 'Your Dream',
        baseline: state.answers[4] || undefined,
        obstacles: state.answers[10] || undefined,
        enjoyment: state.answers[11] || undefined,
      };

      const newAreas = await generateOnboardingAreas({
        title: dreamParams.title,
        baseline: dreamParams.baseline,
        obstacles: dreamParams.obstacles,
        enjoyment: dreamParams.enjoyment,
        feedback: feedback.trim(),
        original_areas: state.generatedAreas,
        figurine_url: state.figurineUrl || undefined
      });

      if (newAreas && newAreas.length > 0) {
        // Clear actions when areas are regenerated since they reference old areas
        setGeneratedActions([]);
        setGeneratedAreas(newAreas);
        setFeedback('');
      }
      
      // Simulate minimum loading time for UX
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to regenerate areas:', error);
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleAreaEdit = (areaId: string) => {
    const area = areaSuggestions.find(a => a.id === areaId);
    if (area) {
      setEditingArea(areaId);
      setNewAreaTitle(area.title);
      setNewAreaEmoji(area.emoji);
    }
  };

  const handleSaveEdit = () => {
    if (editingArea && newAreaTitle.trim() && newAreaEmoji.trim()) {
      // Update the area in context
      const updatedAreas = state.generatedAreas.map(area => 
        area.id === editingArea 
          ? { ...area, title: newAreaTitle.trim(), icon: newAreaEmoji.trim() }
          : area
      );
      setGeneratedAreas(updatedAreas);
      setEditingArea(null);
      setNewAreaTitle('');
      setNewAreaEmoji('');
    }
  };

  const handleCancelEdit = () => {
    setEditingArea(null);
    setNewAreaTitle('');
    setNewAreaEmoji('');
  };

  const handleAddArea = () => {
    setEditingArea('new');
    setNewAreaTitle('');
    setNewAreaEmoji('🚀');
  };

  const handleSaveNewArea = () => {
    if (newAreaTitle.trim() && newAreaEmoji.trim()) {
      const newId = `temp_${Date.now()}`;
      const newArea: Area = {
        id: newId,
        dream_id: 'onboarding',
        title: newAreaTitle.trim(),
        icon: newAreaEmoji.trim(),
        position: state.generatedAreas.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setGeneratedAreas([...state.generatedAreas, newArea]);
      setEditingArea(null);
      setNewAreaTitle('');
      setNewAreaEmoji('');
    }
  };

  const handleRemoveArea = (areaId: string) => {
    const updatedAreas = state.generatedAreas.filter(area => area.id !== areaId);
    setGeneratedAreas(updatedAreas);
  };

  const handleReorderAreas = (reorderedAreas: AreaSuggestion[]) => {
    // Update positions based on new order
    const updatedAreas = reorderedAreas.map((area, index) => {
      const originalArea = state.generatedAreas.find(a => a.id === area.id);
      if (originalArea) {
        return { ...originalArea, position: index };
      }
      return originalArea;
    }).filter(Boolean) as Area[];
    
    setGeneratedAreas(updatedAreas);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          {/* Rocket Icon */}
          <Text style={{ fontSize: 80, marginBottom: 24 }}>🚀</Text>
          
          {/* Title */}
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            color: '#000', 
            marginBottom: 16,
            lineHeight: 24
          }}>
            Creating Areas
          </Text>
          
          {/* Description */}
          <Text style={{ 
            fontSize: 16, 
            color: '#000', 
            textAlign: 'center',
            paddingHorizontal: 32,
            lineHeight: 22
          }}>
            This segments your goal into well defined chunks to make it easy for you to check off goals quicker & see success
          </Text>
          
          {/* Loading indicator */}
          <ActivityIndicator 
            size="large" 
            color="#000" 
            style={{ marginTop: 32 }} 
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <OnboardingHeader onBack={handleBack} />
      
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={{
          fontFamily: theme.typography.fontFamily.system,
          fontSize: theme.typography.fontSize.title2,
          fontWeight: theme.typography.fontWeight.semibold as any,
          lineHeight: theme.typography.lineHeight.title2,
          color: theme.colors.grey[900],
          textAlign: 'left',
          marginBottom: theme.spacing.sm,
        }}>
          Congratulations, your plan is created
        </Text>

        {/* Description Text */}
        <Text style={{ 
          fontSize: 14,
          fontWeight: theme.typography.fontWeight.regular as any,
          lineHeight: 18,
          color: theme.colors.grey[600],
          textAlign: 'left',
          marginBottom: 8,
        }}>
          We've organised your goal "{state.answers[2] || 'Your Dream'}" into {state.generatedAreas.length} focus areas.
        </Text>

        <Text style={{ 
          fontSize: 14,
          fontWeight: theme.typography.fontWeight.regular as any,
          lineHeight: 18,
          color: theme.colors.grey[600],
          textAlign: 'left',
          marginBottom: theme.spacing.xl,
        }}>
          Make sure you're happy with them and then we'll create steps within each of them on the next page.
        </Text>

        {/* Area Grid */}
        <AreaGrid
          areas={areaSuggestions}
          onEdit={handleAreaEdit}
          onRemove={handleRemoveArea}
          onAdd={handleAddArea}
          showAddButton={false}
          showEditButtons={false}
          showRemoveButtons={false}
          title=""
        />

      </ScrollView>
      
      {/* Footer section */}
      <View style={{ 
        paddingHorizontal: 16,
        paddingBottom: 32,
        backgroundColor: theme.colors.pageBackground
      }}>
        {/* Instructional Text */}
        <Text style={{ 
          fontSize: 14, 
          color: '#000', 
          marginBottom: 12,
          lineHeight: 20
        }}>
          Change the areas by providing feedback to our AI below.
        </Text>

        {/* Feedback Input */}
        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Provide detailed feedback here for AI to adjust your areas accordingly.."
          multiline
          style={{ 
            minHeight: 60,
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            fontSize: 16,
            textAlignVertical: 'top'
          }}
        />
        
        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button 
            title="Refine with AI" 
            variant="secondary"
            onPress={() => {
              Keyboard.dismiss(); // Close keyboard when AI refine is triggered
              handleRegenerate();
            }}
            style={{ flex: 1, borderRadius: theme.radius.xl }}
            disabled={!feedback.trim()}
          />
          <Button 
            title="Looks Good"
            variant="black"
            loading={isContinuing}
            onPress={() => {
              Keyboard.dismiss(); // Close keyboard when continuing
              handleContinue();
            }}
            style={{ flex: 1, borderRadius: theme.radius.xl }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AreasConfirmStep;