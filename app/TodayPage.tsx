import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

const TodayPage = () => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.subtitle}>Your daily overview</Text>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Today's content will go here</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface[100],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.md,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  placeholderText: {
    fontSize: 16,
    color: theme.colors.grey[500],
    textAlign: 'center',
  },
});

export default TodayPage;