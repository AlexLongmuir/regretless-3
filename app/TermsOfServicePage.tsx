import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';

const TermsOfServicePage = ({ navigation }: { navigation?: any }) => {
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
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>

        {/* Content */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By accessing and using the Regretless app, you accept and agree to be bound by the terms and provision of this agreement.
          </Text>

          <Text style={styles.sectionTitle}>2. Use License</Text>
          <Text style={styles.sectionText}>
            Permission is granted to temporarily download one copy of Regretless for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </Text>
          <Text style={styles.bulletPoint}>• modify or copy the materials</Text>
          <Text style={styles.bulletPoint}>• use the materials for any commercial purpose or for any public display</Text>
          <Text style={styles.bulletPoint}>• attempt to reverse engineer any software contained in the app</Text>
          <Text style={styles.bulletPoint}>• remove any copyright or other proprietary notations from the materials</Text>

          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.sectionText}>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.
          </Text>

          <Text style={styles.sectionTitle}>4. Privacy Policy</Text>
          <Text style={styles.sectionText}>
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the app, to understand our practices.
          </Text>

          <Text style={styles.sectionTitle}>5. Prohibited Uses</Text>
          <Text style={styles.sectionText}>
            You may not use our app:
          </Text>
          <Text style={styles.bulletPoint}>• For any unlawful purpose or to solicit others to perform unlawful acts</Text>
          <Text style={styles.bulletPoint}>• To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</Text>
          <Text style={styles.bulletPoint}>• To infringe upon or violate our intellectual property rights or the intellectual property rights of others</Text>
          <Text style={styles.bulletPoint}>• To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</Text>

          <Text style={styles.sectionTitle}>6. Content</Text>
          <Text style={styles.sectionText}>
            Our app allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content that you post to the app, including its legality, reliability, and appropriateness.
          </Text>

          <Text style={styles.sectionTitle}>7. Termination</Text>
          <Text style={styles.sectionText}>
            We may terminate or suspend your account and bar access to the app immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
          </Text>

          <Text style={styles.sectionTitle}>8. Disclaimer</Text>
          <Text style={styles.sectionText}>
            The information on this app is provided on an "as is" basis. To the fullest extent permitted by law, this Company excludes all representations, warranties, conditions and terms relating to our app and the use of this app.
          </Text>

          <Text style={styles.sectionTitle}>9. Governing Law</Text>
          <Text style={styles.sectionText}>
            These Terms shall be interpreted and governed by the laws of the United States, without regard to its conflict of law provisions.
          </Text>

          <Text style={styles.sectionTitle}>10. Changes</Text>
          <Text style={styles.sectionText}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
          </Text>

          <Text style={styles.sectionTitle}>11. Contact Information</Text>
          <Text style={styles.sectionText}>
            If you have any questions about these Terms of Service, please contact us at support@regretless.app.
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
  lastUpdated: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.grey[500],
  },
  contentSection: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: 10,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.headline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.headline,
    color: theme.colors.grey[800],
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.sm,
  },
  bulletPoint: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.grey[600],
    marginLeft: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
});

export default TermsOfServicePage;
