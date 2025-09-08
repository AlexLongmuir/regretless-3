import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'

interface GoalSuggestion {
  id: string
  title: string
  emoji: string
  selected?: boolean
}

interface DateSuggestion {
  id: string
  date: string
  label: string
  selected?: boolean
}

export default function FeasibilityStep() {
  const navigation = useNavigation<any>()
  const { title, end_date, setField } = useCreateDream()
  
  const [isLoading, setIsLoading] = useState(true)
  const [goalSuggestions, setGoalSuggestions] = useState<GoalSuggestion[]>([
    { id: '1', title: 'Publish the book', emoji: '📚', selected: false },
    { id: '2', title: 'Market the book', emoji: '📈', selected: false },
    { id: '3', title: 'Host a book signing', emoji: '✍️', selected: false },
    { id: '4', title: 'Write a book', emoji: '📝', selected: true }
  ])
  
  const [dateSuggestions, setDateSuggestions] = useState<DateSuggestion[]>([
    { id: '1', date: '17/11/2025', label: 'Change to 17/11/2025', selected: false },
    { id: '2', date: '01/03/2026', label: 'Stick with 01/03/2026', selected: true }
  ])

  useEffect(() => {
    // Simulate API call with minimum 3 second loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const handleGoalSelect = (goalId: string) => {
    setGoalSuggestions(prev => 
      prev.map(goal => ({
        ...goal,
        selected: goal.id === goalId
      }))
    )
  }

  const handleDateSelect = (dateId: string) => {
    setDateSuggestions(prev => 
      prev.map(date => ({
        ...date,
        selected: date.id === dateId
      }))
    )
  }

  const handleContinue = () => {
    const selectedGoal = goalSuggestions.find(g => g.selected)
    const selectedDate = dateSuggestions.find(d => d.selected)
    
    if (selectedGoal) {
      setField('title', selectedGoal.title)
    }
    if (selectedDate) {
      setField('end_date', selectedDate.date)
    }
    
    navigation.navigate('DreamConfirm')
  }

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
            Analysing Your Dream
          </Text>
          
          {/* Description */}
          <Text style={{ 
            fontSize: 16, 
            color: '#000', 
            textAlign: 'center',
            paddingHorizontal: 32,
            lineHeight: 22
          }}>
            This helps us ensure we're getting your dream right & increases your chance of success from the get go
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
      <CreateScreenHeader step="feasibility" />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Dream Title */}
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 24,
          lineHeight: 24
        }}>
          {title || '[Dream Name]'}
        </Text>

        {/* Intro Text */}
        <Text style={{ 
          fontSize: 16, 
          color: '#000', 
          marginBottom: 32,
          lineHeight: 22
        }}>
          We love your dream! We thought these dream titles could be slightly better to be more specific
        </Text>

        {/* Goal Suggestions */}
        <View style={{ gap: 8, marginBottom: 32 }}>
          {goalSuggestions.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              onPress={() => handleGoalSelect(goal.id)}
              style={{
                backgroundColor: goal.selected ? '#f0f0f0' : 'white',
                height: 44,
                paddingHorizontal: 16,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: goal.selected ? 2 : 0,
                borderColor: goal.selected ? '#000' : 'transparent'
              }}
            >
              <Text style={{ fontSize: 16 }}>{goal.emoji}</Text>
              <Text style={{ fontSize: 14, color: '#000' }}>{goal.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Feedback */}
        <Text style={{ 
          fontSize: 16, 
          color: '#000', 
          marginBottom: 16,
          lineHeight: 22
        }}>
          The end date seemed overly ambitious / too easy.
        </Text>

        {/* Date Suggestions */}
        <View style={{ gap: 8, marginBottom: 32 }}>
          {dateSuggestions.map((date) => (
            <TouchableOpacity
              key={date.id}
              onPress={() => handleDateSelect(date.id)}
              style={{
                backgroundColor: date.selected ? '#f0f0f0' : 'white',
                height: 44,
                paddingHorizontal: 16,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: date.selected ? 2 : 0,
                borderColor: date.selected ? '#000' : 'transparent'
              }}
            >
              <Text style={{ fontSize: 16 }}>📅</Text>
              <Text style={{ fontSize: 14, color: '#000' }}>{date.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      {/* Sticky bottom button */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: 32,
        backgroundColor: '#F3F4F6'
      }}>
        <Button 
          title="Create Goal" 
          variant="black"
          onPress={handleContinue} 
        />
      </View>
    </View>
  )
}
