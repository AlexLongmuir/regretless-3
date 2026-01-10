import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';

const PrivacyPolicyPage = ({ navigation }: { navigation?: any }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
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
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>

        {/* Content */}
        <Text style={styles.sectionTitle}>0. Data Controller</Text>
        <Text style={styles.sectionText}>
          Dreamer (contact: alexlongmuir@icloud.com) is the data controller for your personal information. If you are in the EEA/UK, Dreamer acts as controller for the purposes of applicable data protection laws.
        </Text>
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.sectionText}>
          We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
        </Text>
        <Text style={styles.subsectionTitle}>Personal Information:</Text>
        <Text style={styles.bulletPoint}>• Email address</Text>
        <Text style={styles.bulletPoint}>• Name (if provided)</Text>
        <Text style={styles.bulletPoint}>• Dream goals and progress data</Text>
        <Text style={styles.bulletPoint}>• Action plans and completion records</Text>
        <Text style={styles.bulletPoint}>• Photos and journal entries</Text>
        <Text style={styles.bulletPoint}>• Voice recordings (if you use audio input features)</Text>
        <Text style={styles.bulletPoint}>• AI interaction data and preferences</Text>
        <Text style={styles.subsectionTitle}>Automatically Collected:</Text>
        <Text style={styles.bulletPoint}>• Device identifiers (IDFA/AAID), IP address, device model, OS version</Text>
        <Text style={styles.bulletPoint}>• App version, diagnostics, crash logs, performance and usage analytics</Text>
        <Text style={styles.bulletPoint}>• Approximate location (if enabled by your device)</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.sectionText}>
          We use the information we collect to:
        </Text>
        <Text style={styles.bulletPoint}>• Provide, maintain, and improve our services</Text>
        <Text style={styles.bulletPoint}>• Process transactions and send related information</Text>
        <Text style={styles.bulletPoint}>• Send technical notices, updates, and support messages</Text>
        <Text style={styles.bulletPoint}>• Respond to your comments and questions</Text>
        <Text style={styles.bulletPoint}>• Provide personalized goal tracking and AI-powered recommendations</Text>
        <Text style={styles.bulletPoint}>• Generate AI-powered suggestions and improve app features and prompts (without using your content to train foundation models)</Text>

        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.sectionText}>
          We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
        </Text>
        <Text style={styles.subsectionTitle}>We may share your information:</Text>
        <Text style={styles.bulletPoint}>• With AI service providers (such as OpenAI or Anthropic) to process your requests and improve our AI features</Text>
        <Text style={styles.bulletPoint}>• With payment processors (RevenueCat) to handle subscription transactions</Text>
        <Text style={styles.bulletPoint}>• With service providers who assist us in operating our app</Text>
        <Text style={styles.bulletPoint}>• When required by law or to protect our rights</Text>
        <Text style={styles.bulletPoint}>• In connection with a business transfer or acquisition</Text>

        <Text style={styles.sectionTitle}>4. AI and Data Processing</Text>
        <Text style={styles.sectionText}>
          Dreamer uses artificial intelligence to provide personalized coaching and recommendations. This means:
        </Text>
        <Text style={styles.bulletPoint}>• Your goals, actions, and progress data may be analyzed by AI models to generate personalized suggestions</Text>
        <Text style={styles.bulletPoint}>• We do not use your content to train third-party foundation models; we may analyze aggregate patterns to improve prompts and features</Text>
        <Text style={styles.bulletPoint}>• AI providers may process your data according to their own privacy policies</Text>
        <Text style={styles.bulletPoint}>• We take steps to ensure your data is handled securely and in accordance with this policy</Text>

        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.sectionText}>
          We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
        </Text>

        <Text style={styles.sectionTitle}>6. Data Retention</Text>
        <Text style={styles.sectionText}>
          We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time.
        </Text>

        <Text style={styles.sectionTitle}>7. Your Rights</Text>
        <Text style={styles.sectionText}>
          You have the right to:
        </Text>
        <Text style={styles.bulletPoint}>• Access your personal information</Text>
        <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
        <Text style={styles.bulletPoint}>• Delete your account and data</Text>
        <Text style={styles.bulletPoint}>• Export your data</Text>
        <Text style={styles.bulletPoint}>• Opt out of certain communications</Text>

        <Text style={styles.sectionTitle}>8. Cookies and Tracking</Text>
        <Text style={styles.sectionText}>
          We may use cookies and similar tracking technologies to collect and use personal information about you. You can control cookie settings through your device preferences.
        </Text>

        <Text style={styles.sectionTitle}>9. Third-Party Services and Payments</Text>
        <Text style={styles.sectionText}>
          Our app integrates with third-party services including AI providers (OpenAI, Anthropic), payment processors (RevenueCat), analytics, and cloud storage providers. Purchases are handled by Apple/Google via RevenueCat; we do not store your full payment card details. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies.
        </Text>

        <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
        <Text style={styles.sectionText}>
          Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
        </Text>

        <Text style={styles.sectionTitle}>11. International Users</Text>
        <Text style={styles.sectionText}>
          If you are accessing our services from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States.
        </Text>

        <Text style={styles.sectionTitle}>12. Changes to This Policy</Text>
        <Text style={styles.sectionText}>
          We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
        </Text>

        <Text style={styles.sectionTitle}>13. Contact Us</Text>
        <Text style={styles.sectionText}>
          If you have any questions about this Privacy Policy, please contact us at alexlongmuir@icloud.com.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
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
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.largeTitle,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'left',
  },
  lastUpdated: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.text.tertiary,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.headline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.headline,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  subsectionTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  sectionText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  bulletPoint: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
});

export default PrivacyPolicyPage;
