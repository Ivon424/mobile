import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://uabgopxjgvtxbyipregm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYmdvcHhqZ3Z0eGJ5aXByZWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzg3MTIsImV4cCI6MjA5Nzc1NDcxMn0.LRDhxkEaetplKM7yW1mdIdKFUonQQOMH33at0Q3kzsE';

const webStorage = {
  getItem: (key: string): Promise<string | null> => {
    try {
      return Promise.resolve(localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch {}
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch {}
    return Promise.resolve();
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});