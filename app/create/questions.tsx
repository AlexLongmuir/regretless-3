import React, { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'

export default function QuestionsStep() {
  const navigation = useNavigation<any>()
  const { setField } = useCreateDream()
  
  const [currentProgress, setCurrentProgress] = useState('')
  const [obstacles, setObstacles] = useState('')
  const [enjoyment, setEnjoyment] = useState('')

  const handleContinue = () => {
    // Save the answers to context
    setField('baseline', currentProgress)
    setField('obstacles', obstacles)
    setField('enjoyment', enjoyment)
    navigation.navigate('Feasibility')
  }

  return (
    <View style={{ flex: 1 }}>
      <CreateScreenHeader step="questions" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 32,
          lineHeight: 24
        }}>
          Tell us about your journey so far
        </Text>

        {/* Question 1 */}
        <Input
          value={currentProgress}
          onChangeText={setCurrentProgress}
          placeholder="Start writing..."
          label="What's your current progress"
          multiline
          variant="borderless"
          style={{ marginBottom: 32 }}
        />

        {/* Question 2 */}
        <Input
          value={obstacles}
          onChangeText={setObstacles}
          placeholder="Start writing..."
          label="What's most likely going to cause you not to achieve this?"
          multiline
          variant="borderless"
          style={{ marginBottom: 32 }}
        />

        {/* Question 3 */}
        <Input
          value={enjoyment}
          onChangeText={setEnjoyment}
          placeholder="Start writing..."
          label="What's most likely to cause you to enjoy the journey?"
          multiline
          variant="borderless"
          style={{ marginBottom: 32 }}
        />
      </ScrollView>
      
      {/* Sticky bottom button */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: 32
      }}>
        <Button 
          title="Continue" 
          variant={"black" as any}
          onPress={handleContinue} 
        />
      </View>
    </View>
  )
}
