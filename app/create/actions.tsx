import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button, ActionChipsList } from '../../components'

interface ActionCard {
  id: string
  title: string
  est_minutes?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  repeat_every_days?: number
  acceptance_criteria?: string[]
  due_date?: string
  dream_image?: string
}

export default function ActionsStep() {
  const navigation = useNavigation<any>()
  const { title, setField } = useCreateDream()
  
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [actions, setActions] = useState<ActionCard[]>([
    {
      id: '1',
      title: 'Set Up Social Media Accounts',
      est_minutes: 60,
      difficulty: 'medium',
      repeat_every_days: 4,
      acceptance_criteria: ['Choose platforms', 'Create engaging content', 'Schedule posts for consistency'],
      due_date: '2024-01-07',
      dream_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
    },
    {
      id: '2',
      title: 'Conduct Comprehensive Market Research and Competitive Analysis for New Product Launch',
      est_minutes: 120,
      difficulty: 'hard',
      repeat_every_days: undefined,
      acceptance_criteria: [
        'Identify and analyze target audience demographics, psychographics, and purchasing behavior patterns',
        'Conduct thorough competitive analysis including pricing strategies, marketing approaches, and market positioning',
        'Gather comprehensive insights on industry trends, market size, growth potential, and emerging opportunities'
      ],
      due_date: '2024-01-10',
      dream_image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop'
    },
    {
      id: '3',
      title: 'Develop Business Plan',
      est_minutes: 180,
      difficulty: 'hard',
      repeat_every_days: undefined,
      acceptance_criteria: ['Validate market demand', 'Define target market', 'Identify revenue streams'],
      due_date: '2024-01-15',
      dream_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop'
    }
  ])

  useEffect(() => {
    // Simulate API call with minimum 3 second loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
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
            Creating Actions
          </Text>
          
          {/* Description */}
          <Text style={{ 
            fontSize: 16, 
            color: '#000', 
            textAlign: 'center',
            paddingHorizontal: 32,
            lineHeight: 22
          }}>
            These are the things you tick off to complete each area and then your overall dream
          </Text>
          
          {/* Loading indicator */}
          <ActivityIndicator 
            size="large" 
            color="#000" 
            style={{ marginTop: 32 }} 
          />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <CreateScreenHeader step="actions" />
      
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Planning Section */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 24, marginRight: 8 }}>✍️</Text>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold', 
              color: '#000',
              lineHeight: 24
            }}>
              Planning
            </Text>
          </View>
          
          <Text style={{ 
            fontSize: 12, 
            fontWeight: 'bold',
            color: '#000', 
            marginBottom: 24,
            lineHeight: 16
          }}>
            These are the actions for the planning area, their due dates & the acceptance criteria for each action
          </Text>

          {/* Action Cards */}
          <ActionChipsList
            actions={actions}
            onEdit={(id, updatedAction) => {
              setActions(prev => prev.map(a => a.id === id ? updatedAction : a))
            }}
            onRemove={(id) => {
              setActions(prev => prev.filter(a => a.id !== id))
            }}
            onAdd={(newAction) => {
              setActions(prev => [...prev, newAction])
            }}
          />
        </View>
      </ScrollView>
      
      {/* Sticky bottom section */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: 32,
        backgroundColor: '#F3F4F6'
      }}>
        {/* Instructional Text */}
        <Text style={{ 
          fontSize: 14, 
          color: '#000', 
          marginBottom: 12,
          lineHeight: 20
        }}>
          If you want to change these, hold down to edit or provide feedback to our AI.
        </Text>

        {/* Feedback Input */}
        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Provide detailed feedback here for AI to adjust your actions accordingly.."
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
            title="Fix with AI" 
            variant="secondary"
            onPress={() => {
              // Trigger loading page
              setIsLoading(true)
              // Simulate AI processing
              setTimeout(() => {
                setIsLoading(false)
              }, 3000)
            }}
            style={{ flex: 1 }}
          />
          <Button 
            title="Looks Good" 
            variant="black"
            onPress={() => navigation.navigate('ActionsConfirm')}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  )
}
