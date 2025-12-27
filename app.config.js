export default {
  "expo": {
    "name": "Dreamer",
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
      "buildNumber": "6",
      "usesAppleSignIn": true,
      "infoPlist": {
        "LSApplicationQueriesSchemes": [
          "chatgpt"
        ]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.dreamer.app.dev",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "chatgpt"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
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
      ],
      "expo-web-browser",
      "expo-av"
    ],
    "extra": {
      "supabaseUrl": process.env.EXPO_PUBLIC_SUPABASE_URL,
      "supabaseAnonKey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      "revenueCatApiKey": process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
      "mixpanelToken": process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
      "mixpanelServerURL": process.env.EXPO_PUBLIC_MIXPANEL_SERVER_URL || "https://api.mixpanel.com",
      "backendUrl": process.env.EXPO_PUBLIC_BACKEND_URL,
      "eas": {
        "projectId": "f92cdd32-9b86-4148-9f96-6eb8a392ca9f"
      }
    }
  }
} 