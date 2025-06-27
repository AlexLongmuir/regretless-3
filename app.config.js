export default {
  "expo": {
    "name": "regretless-3",
    "slug": "regretless-3",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "scheme": "regretless",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.regretless.app",
      "usesAppleSignIn": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.regretless.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "supabaseUrl": process.env.SUPABASE_URL,
      "supabaseAnonKey": process.env.SUPABASE_ANON_KEY,
      "googleSignIn": {
        "iosClientId": process.env.GOOGLE_IOS_CLIENT_ID,
        "androidClientId": process.env.GOOGLE_ANDROID_CLIENT_ID,
        "webClientId": process.env.GOOGLE_WEB_CLIENT_ID
      }
    }
  }
} 