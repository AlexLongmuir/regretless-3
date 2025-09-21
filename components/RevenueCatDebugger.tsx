/**
 * RevenueCatDebugger - Debug component for testing RevenueCat integration
 * 
 * This component helps debug RevenueCat issues during development and testing.
 * It shows the current configuration status and allows testing purchases.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useEntitlementsContext } from '../contexts/EntitlementsContext';
import { isRevenueCatConfigured, waitForRevenueCatInitialization } from '../lib/revenueCat';
import Constants from 'expo-constants';

interface DebugInfo {
  isConfigured: boolean;
  apiKey: string | null;
  customerInfo: any | null;
  hasProAccess: boolean;
  loading: boolean;
  error: string | null;
}

export const RevenueCatDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    isConfigured: false,
    apiKey: null,
    customerInfo: null,
    hasProAccess: false,
    loading: true,
    error: null,
  });

  const entitlements = useEntitlementsContext();

  const refreshDebugInfo = async () => {
    try {
      const isConfigured = await waitForRevenueCatInitialization();
      const apiKey = Constants.expoConfig?.extra?.revenueCatApiKey || null;
      
      setDebugInfo({
        isConfigured,
        apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : null,
        customerInfo: entitlements.customerInfo,
        hasProAccess: entitlements.hasProAccess,
        loading: entitlements.loading,
        error: entitlements.error,
      });
    } catch (error: any) {
      setDebugInfo(prev => ({
        ...prev,
        error: error.message,
      }));
    }
  };

  React.useEffect(() => {
    refreshDebugInfo();
  }, [entitlements.customerInfo, entitlements.hasProAccess, entitlements.loading, entitlements.error]);

  const testPurchase = async () => {
    try {
      // This would trigger a test purchase
      // Implementation depends on your paywall component
      console.log('Test purchase triggered');
    } catch (error: any) {
      console.error('Test purchase error:', error);
    }
  };

  const clearCache = async () => {
    try {
      await entitlements.refreshCustomerInfo();
      console.log('Cache cleared and refreshed');
    } catch (error: any) {
      console.error('Error clearing cache:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>RevenueCat Debug Info</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        <Text style={styles.info}>Configured: {debugInfo.isConfigured ? '✅ Yes' : '❌ No'}</Text>
        <Text style={styles.info}>API Key: {debugInfo.apiKey || 'Not set'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Info</Text>
        <Text style={styles.info}>Loading: {debugInfo.loading ? '🔄 Yes' : '✅ No'}</Text>
        <Text style={styles.info}>Has Pro Access: {debugInfo.hasProAccess ? '✅ Yes' : '❌ No'}</Text>
        <Text style={styles.info}>User ID: {debugInfo.customerInfo?.originalAppUserId || 'Unknown'}</Text>
      </View>

      {debugInfo.error && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Error</Text>
          <Text style={styles.error}>{debugInfo.error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.button} onPress={refreshDebugInfo}>
          <Text style={styles.buttonText}>Refresh Debug Info</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={clearCache}>
          <Text style={styles.buttonText}>Clear Cache & Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testPurchase}>
          <Text style={styles.buttonText}>Test Purchase</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Raw Customer Info</Text>
        <Text style={styles.rawData}>
          {JSON.stringify(debugInfo.customerInfo, null, 2)}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  info: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  error: {
    fontSize: 14,
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  rawData: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
    color: '#333',
  },
});
