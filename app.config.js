export default {
  "expo": {
    "name": "dreamer-3",
    "slug": "dreamer",
    "owner": "alongmuir",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "scheme": "dreamer",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.dreamerapp.app",
      "usesAppleSignIn": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.dreamer.app.dev"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#ffffff",
      "iosDisplayInForeground": true,
      "androidMode": "default",
      "androidCollapsedTitle": "#{unread_notifications} new interactions"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "defaultChannel": "default"
        }
      ]
    ],
    "extra": {
      "supabaseUrl": process.env.EXPO_PUBLIC_SUPABASE_URL,
      "supabaseAnonKey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      "revenueCatApiKey": process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
      "eas": {
        "projectId": "f92cdd32-9b86-4148-9f96-6eb8a392ca9f"
      }
    }
  }
} 