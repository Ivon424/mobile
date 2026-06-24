import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uabgopxjgvtxbyipregm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYmdvcHhqZ3Z0eGJ5aXByZWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzg3MTIsImV4cCI6MjA5Nzc1NDcxMn0.LRDhxkEaetplKM7yW1mdIdKFUonQQOMH33at0Q3kzsE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});