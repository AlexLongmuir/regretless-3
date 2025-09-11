import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { ListRow } from '../components/ListRow';
import { IconButton } from '../components/IconButton';

const ContactUsPage = ({ navigation }: { navigation?: any }) => {
  const handleEmailPress = () => {
    const email = 'support@regretless.app';
    const subject = 'Support Request';
    const body = 'Hi there,\n\nI need help with...';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open email client');
      }
    });
  };

  const handleWebsitePress = () => {
    const url = 'https://regretless.app';
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open website');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <IconButton
          icon="chevron_left"
          onPress={() => navigation?.goBack()}
          variant="ghost"
          size="md"
          style={styles.backButton}
        />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <Text style={styles.title}>Contact Us</Text>
        <Text style={styles.subtitle}>
          We're here to help! Reach out to us through any of the channels below.
        </Text>

        {/* Contact Options */}
        <View style={styles.listContainer}>
          <ListRow
            title="Email Support"
            subtitle="support@regretless.app"
            leftIcon="email"
            onPress={handleEmailPress}
            isFirst={true}
          />
          <ListRow
            title="Visit Our Website"
            subtitle="regretless.app"
            leftIcon="language"
            onPress={handleWebsitePress}
          />
          <ListRow
            title="Report a Bug"
            subtitle="Help us improve the app"
            leftIcon="bug_report"
            onPress={() => Alert.alert('Bug Report', 'Please email us at support@regretless.app with details about the issue you encountered.')}
            isLast={true}
          />
        </View>

        {/* Additional Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Response Time</Text>
          <Text style={styles.infoText}>
            We typically respond to support requests within 24 hours during business days.
          </Text>
          
          <Text style={styles.infoTitle}>Business Hours</Text>
          <Text style={styles.infoText}>
            Monday - Friday: 9:00 AM - 5:00 PM PST
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: 12,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.largeTitle,
    color: theme.colors.grey[800],
    marginBottom: theme.spacing.sm,
    textAlign: 'left',
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.grey[600],
  },
  listContainer: {
    width: '100%',
    backgroundColor: theme.colors.primary[50],
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: theme.spacing.xl,
  },
  infoSection: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: 10,
    padding: theme.spacing.lg,
  },
  infoTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.headline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.headline,
    color: theme.colors.grey[800],
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  infoText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.sm,
  },
});

export default ContactUsPage;
