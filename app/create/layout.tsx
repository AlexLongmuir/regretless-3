import React from 'react'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { CreateDreamProvider } from '../../contexts/CreateDreamContext'

export default function CreateLayout() {
  return (
    <CreateDreamProvider>
      <SafeAreaView style={{ flex:1, backgroundColor:'white' }}>
        <CreateScreenHeader />
        <Stack screenOptions={{ headerShown:false }} />
      </SafeAreaView>
    </CreateDreamProvider>
  )
}
  