import React from 'react'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { CreateDreamProvider } from '../../contexts/CreateDreamContext'
import { theme } from '../../utils/theme'

export default function CreateLayout() {
  return (
    <CreateDreamProvider>
      <SafeAreaView style={{ flex:1, backgroundColor: theme.colors.pageBackground }}>
        <CreateScreenHeader />
        <Stack screenOptions={{ headerShown:false }} />
      </SafeAreaView>
    </CreateDreamProvider>
  )
}
  