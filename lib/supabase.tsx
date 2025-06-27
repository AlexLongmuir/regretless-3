import 'react-native-url-polyfill/auto';
import Constants from "expo-constants";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
