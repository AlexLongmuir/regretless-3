export const theme = {
  colors: {
    // Primary brand color - Dark mysterious blue
    // Use primary[600] (#0F2A3F) for main brand elements like buttons and text
    primary: {
      50: '#E8F4F8',
      100: '#D1E9F1',
      200: '#A3D3E3',
      300: '#75BDD5',
      400: '#47A7C7',
      500: '#1991B9',
      600: '#0F2A3F', // Main primary color - Dark mysterious blue
      700: '#0C2235',
      800: '#091A2B', // Second primary color - Darker blue
      900: '#061221',
    },
    secondary: {
      50: '#F7FAFC',
      100: '#EDF2F7',
      200: '#E2E8F0',
      300: '#CBD5E0',
      400: '#A0AEC0',
      500: '#718096',
      600: '#4A5568',
      700: '#2D3748',
      800: '#1A202C',
      900: '#171923',
    },
    success: {
      50: '#F0FFF4',
      100: '#C6F6D5',
      200: '#9AE6B4',
      300: '#68D391',
      400: '#48BB78',
      500: '#38A169',
      600: '#2F855A',
      700: '#276749',
      800: '#22543D',
      900: '#1C4532',
    },
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },
    grey: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    blue: {
      50: '#E6F3FF',
      100: '#CCE7FF',
      200: '#99CFFF',
      300: '#66B7FF',
      400: '#339FFF',
      500: '#1A73E8',
      600: '#0F1419',
      700: '#0D1116',
      800: '#0A0E13',
      900: '#070B10',
    },
    indigo: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1',
      600: '#4F46E5',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81',
    },
    purple: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
      700: '#7C3AED',
      800: '#6B21A8',
      900: '#581C87',
    },
    pink: {
      50: '#FDF2F8',
      100: '#FCE7F3',
      200: '#FBCFE8',
      300: '#F9A8D4',
      400: '#F472B6',
      500: '#EC4899',
      600: '#DB2777',
      700: '#BE185D',
      800: '#9D174D',
      900: '#831843',
    },
    surface: {
      50: '#FFFFFF',
      100: '#F9FAFB',
      200: '#F3F4F6',
      300: '#E5E7EB',
      800: '#1F2937',
      900: '#111827',
    },
    // Default grey for secondary buttons - iOS-style grey that stands out on white
    defaultGrey: '#E5E7EB', // grey[300] - light enough to feel secondary but dark enough to be visible
  },
  gradients: {
    magical: {
      colors: ['primary.200', 'primary.100', 'success.100', 'pink.200'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },
  // Icon system - Professional icon library using react-native-vector-icons
  // Use these icon configurations consistently throughout the app
  icons: {
    email: {
      library: 'MaterialIcons' as const,
      name: 'email'
    },
    google: {
      library: 'FontAwesome' as const,
      name: 'google'
    },
    apple: {
      library: 'FontAwesome' as const,
      name: 'apple'

    },
    close: {
      library: 'MaterialIcons' as const,
      name: 'close'
    },
    add: {
      library: 'MaterialIcons' as const,
      name: 'add'
    },
    chevron_left: {
      library: 'MaterialIcons' as const,
      name: 'keyboard-arrow-left'
    },
    chevron_right: {
      library: 'MaterialIcons' as const,
      name: 'keyboard-arrow-right'
    },
    check_circle: {
      library: 'MaterialIcons' as const,
      name: 'check_circle'
    },
    remove_circle: {
      library: 'MaterialIcons' as const,
      name: 'remove_circle'
    },
    radio_button_unchecked: {
      library: 'MaterialIcons' as const,
      name: 'radio_button_unchecked'
    },
    keyboard_arrow_left: {
      library: 'MaterialIcons' as const,
      name: 'keyboard_arrow_left'
    },
    arrow_forward: {
      library: 'MaterialIcons' as const,
      name: 'arrow_forward'
    },
    notifications: {
      library: 'MaterialIcons' as const,
      name: 'notifications'
    },
    contact_support: {
      library: 'MaterialIcons' as const,
      name: 'support'
    },
    policy: {
      library: 'MaterialIcons' as const,
      name: 'description'
    },
    privacy_tip: {
      library: 'MaterialIcons' as const,
      name: 'security'
    },
    logout: {
      library: 'MaterialIcons' as const,
      name: 'exit-to-app'
    },
    delete_forever: {
      library: 'MaterialIcons' as const,
      name: 'delete'
    },
    analytics: {
      library: 'MaterialIcons' as const,
      name: 'bar-chart'
    }
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 },
  typography: {
    fontFamily: {
      system: 'SF Pro Display',
      mono: 'SF Mono',
    },
    fontSize: {
      caption2: 11,
      caption1: 12,
      footnote: 13,
      subheadline: 15,
      callout: 16,
      body: 17,
      headline: 17,
      title3: 20,
      title2: 22,
      title1: 28,
      largeTitle: 34,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      heavy: '800',
    },
    lineHeight: {
      caption2: 13,
      caption1: 16,
      footnote: 18,
      subheadline: 20,
      callout: 21,
      body: 22,
      headline: 22,
      title3: 25,
      title2: 28,
      title1: 34,
      largeTitle: 41,
    },
  },
};

export type Theme = typeof theme;