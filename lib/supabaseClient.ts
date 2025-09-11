import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

export const supabaseClient = createClient(
  Constants.expoConfig?.extra?.supabaseUrl!,
  Constants.expoConfig?.extra?.supabaseAnonKey!,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
);


