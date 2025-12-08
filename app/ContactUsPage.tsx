import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { ListRow } from '../components/ListRow';
import { IconButton } from '../components/IconButton';

const ContactUsPage = ({ navigation }: { navigation?: any }) => {
  const handleEmailPress = () => {
    const email = 'alexlongmuir@icloud.com';
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
          Email to report bugs, suggest improvements or any account issues.
        </Text>

        {/* Contact Options */}
        <View style={styles.listContainer}>
          <ListRow
            title="Email Support"
            subtitle="alexlongmuir@icloud.com"
            leftIcon="email"
            onPress={handleEmailPress}
            isFirst={true}
            isLast={true}
          />
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
    paddingTop: 16,
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
    backgroundColor: theme.colors.background.card,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
});

export default ContactUsPage;
