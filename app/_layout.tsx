import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/today');
    }
  }, [session, loading, segments]);

  // ── Deep link handler for password reset ──
  useEffect(() => {
    async function handleDeepLink(url: string) {
      if (!url) return;

      const hashPart = url.split('#')[1] ?? '';
      const queryPart = url.split('?')[1]?.split('#')[0] ?? '';
      const raw = hashPart || queryPart;
      if (!raw) return;

      const params = Object.fromEntries(new URLSearchParams(raw));

      if (params.type === 'recovery' && params.access_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? '',
        });

        if (!error) {
          setTimeout(() => {
            router.replace('/reset-password');
          }, 300);
        }
      }
    }

    // When app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // When app is opened cold from the link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Web: parse current URL on page load
    if (Platform.OS === 'web') {
      handleDeepLink(window.location.href);
    }

    return () => subscription.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="habit/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-habit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="report" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}