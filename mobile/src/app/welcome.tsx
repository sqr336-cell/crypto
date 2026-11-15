import { router } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Text';
import { Wordmark } from '../components/ui/Wordmark';
import { backend } from '../data';
import type { OAuthProvider } from '../data/backend';
import { useT } from '../i18n';
import { toastError } from '../state/toast';
import { colors, fonts, layout, space } from '../theme/tokens';

const BARS = [0.22, 0.38, 0.3, 0.55, 0.8, 0.62, 1, 0.74, 0.48, 0.66, 0.9, 0.58, 0.34, 0.5, 0.28, 0.42, 0.2];

/** The one orchestrated moment of the app: a level meter coming alive. */
function LiveBars() {
  const reduced = useReducedMotion();
  return (
    <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {BARS.map((h, i) => (
        <Bar key={i} h={h} i={i} reduced={reduced} signal={i === 6} />
      ))}
    </View>
  );
}

function Bar({ h, i, reduced, signal }: { h: number; i: number; reduced: boolean; signal: boolean }) {
  const v = useSharedValue(reduced ? h : 0.08);
  useEffect(() => {
    if (reduced) return;
    v.value = withDelay(
      i * 45,
      withSequence(
        withTiming(h, { duration: 420 }),
        withRepeat(withSequence(withTiming(h * 0.62, { duration: 900 + i * 37 }), withTiming(h, { duration: 900 + i * 29 })), -1, true),
      ),
    );
  }, [h, i, reduced, v]);
  const style = useAnimatedStyle(() => ({ height: `${v.value * 100}%` }));
  return <Animated.View style={[styles.bar, { backgroundColor: signal ? colors.signal : colors.fader }, style]} />;
}

export default function Welcome() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const demo = backend.mode === 'demo';

  useEffect(() => {
    void backend.availableProviders().then(setProviders).catch(() => setProviders([]));
  }, []);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xl }]}>
      <View style={styles.inner}>
        <Wordmark size={26} />
        <View style={styles.hero}>
          <LiveBars />
          <Animated.View entering={FadeIn.delay(350).duration(500)}>
            <Text style={styles.tagline} accessibilityRole="header">
              {t('welcome.tagline')}
            </Text>
            <Text variant="body" tone="mist" style={styles.pitch}>
              {t('welcome.pitch')}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.actions}>
          {demo ? (
            <>
              <Button label={t('welcome.demo')} full onPress={() => void run('demo', () => backend.startDemo!())} loading={busy === 'demo'} testID="welcome-demo" />
              <View style={styles.note}>
                <View style={styles.noteDot} />
                <Text variant="caption" tone="mist" style={styles.noteText}>
                  {t('welcome.demoNote')}
                </Text>
              </View>
            </>
          ) : (
            <>
              {providers.includes('apple') && Platform.OS !== 'android' ? (
                <Button label={t('welcome.apple')} full onPress={() => void run('apple', () => backend.signInWithProvider('apple'))} loading={busy === 'apple'} />
              ) : null}
              {providers.includes('google') ? (
                <Button
                  label={t('welcome.google')}
                  full
                  variant={providers.includes('apple') && Platform.OS !== 'android' ? 'secondary' : 'primary'}
                  onPress={() => void run('google', () => backend.signInWithProvider('google'))}
                  loading={busy === 'google'}
                />
              ) : null}
              <Button
                label={t('welcome.email')}
                icon={Mail}
                full
                variant={providers.length ? 'secondary' : 'primary'}
                onPress={() => router.push('/sign-in')}
                testID="welcome-email"
              />
              <Text variant="caption" tone="dim" align="center">
                {t('welcome.legal')}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.booth },
  inner: { flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: space.xl },
  hero: { flex: 1, justifyContent: 'center', gap: space.xxl },
  bars: { height: 96, flexDirection: 'row', alignItems: 'center', gap: 5 },
  bar: { width: 5, borderRadius: 3 },
  tagline: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.2, color: colors.paper },
  pitch: { marginTop: space.lg, maxWidth: 360 },
  actions: { gap: space.md },
  note: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  noteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.signal, marginTop: 6 },
  noteText: { flex: 1 },
});
