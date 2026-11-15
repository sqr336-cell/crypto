import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { Syne_700Bold, Syne_800ExtraBold } from '@expo-google-fonts/syne';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DialogHost, ToastHost } from '../components/ui/Overlays';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Text';
import { Wordmark } from '../components/ui/Wordmark';
import { backend } from '../data';
import { queryClient, useMyProfile, useRealtimeSync } from '../data/queries';
import { useLocale, useT } from '../i18n';
import { usePushRouting } from '../lib/push';
import { useSession } from '../state/session';
import { errorMessage } from '../state/toast';
import { colors, space } from '../theme/tokens';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    Syne_800ExtraBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });

  useEffect(() => {
    let off: (() => void) | undefined;
    void useLocale.getState().hydrate();
    void useSession
      .getState()
      .init()
      .then((o) => (off = o));
    return () => off?.();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          {fontsLoaded ? <RootNavigator /> : <View style={styles.root} />}
          <ToastHost />
          <DialogHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const modal = { presentation: 'modal' as const, animation: 'slide_from_bottom' as const };

function RootNavigator() {
  const t = useT();
  const status = useSession((s) => s.status);
  const session = useSession((s) => s.session);
  const me = useMyProfile();
  const onboarded = !!me.data?.onboardedAt;
  const ready = status === 'ready' && (!session || me.isFetched);

  useRealtimeSync();
  usePushRouting(!!session && onboarded);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Keep "last active" fresh so Discover can favour people who are around.
  useEffect(() => {
    if (!session || !onboarded) return;
    void backend.touchActivity().catch(() => undefined);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void backend.touchActivity().catch(() => undefined);
    });
    return () => sub.remove();
  }, [session, onboarded]);

  if (!ready) {
    return (
      <View style={[styles.root, styles.center]}>
        <Wordmark size={30} />
      </View>
    );
  }

  if (session && me.isError && !me.data) {
    return (
      <View style={[styles.root, styles.center, styles.gap]}>
        <Text variant="body" tone="mist" align="center">
          {errorMessage(me.error)}
        </Text>
        <Button label={t('common.retry')} variant="secondary" onPress={() => void me.refetch()} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.booth }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !onboarded}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session && onboarded}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="profile/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/blocked" />
        <Stack.Screen name="propose/[id]" options={modal} />
        <Stack.Screen name="fit/[id]" options={modal} />
        <Stack.Screen name="filters" options={modal} />
        <Stack.Screen name="report" options={modal} />
        <Stack.Screen name="linked" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="add-sound" options={modal} />
      </Stack.Protected>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth-callback" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.booth },
  center: { alignItems: 'center', justifyContent: 'center' },
  gap: { gap: space.lg, padding: space.xxl },
});
