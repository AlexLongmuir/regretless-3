import React from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ViewStyle, 
  SafeAreaView
} from 'react-native';
import { theme } from '../utils/theme';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  footer?: React.ReactNode;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  footer,
}) => {
  const ContentWrapper = scrollable ? ScrollView : View;
  const wrapperProps = scrollable 
    ? { 
        contentContainerStyle: [styles.scrollContent, contentContainerStyle],
        showsVerticalScrollIndicator: false,
        alwaysBounceVertical: false,
      } 
    : { style: [styles.staticContent, contentContainerStyle] };

  return (
    <View style={[styles.container, style]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ContentWrapper {...wrapperProps} style={scrollable ? styles.scrollView : undefined}>
          <View style={styles.constrainedContent}>
            {children}
          </View>
        </ContentWrapper>
        
        {footer && (
          <View style={styles.footerContainer}>
            <View style={styles.constrainedFooter}>
              {footer}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  staticContent: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  constrainedContent: {
    width: '100%',
    maxWidth: 500, // Max width for iPad/Tablet
    flex: 1,
  },
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: theme.colors.pageBackground, // Ensure footer background matches page
  },
  constrainedFooter: {
    width: '100%',
    maxWidth: 500, // Max width for footer on iPad/Tablet
  },
});
