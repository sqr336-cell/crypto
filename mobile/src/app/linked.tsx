import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Text';
import { useMyProfile, useProfileBundle } from '../data/queries';
import { useT } from '../i18n';
import { colors, fonts, space } from '../theme/tokens';
import { goBack } from '../lib/nav';

const LEFT = [0.3, 0.55, 0.8, 0.45, 0.7, 1, 0.6];
const RIGHT = [0.6, 1, 0.7, 0.45, 0.8, 0.55, 0.3];

/** The "New link" moment: two waveforms meet and become one. */
export default function Linked() {
  const t = useT();
  const { id, name, conversationId } = useLocalSearchParams<{ id: string; name: string; conversationId?: string }>();
  const me = useMyProfile();
  const them = useProfileBundle(id);
  const reduced = useReducedMotion();
  const meet = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (!reduced) meet.value = withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [meet, reduced]);

  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - meet.value) * -90 }], opacity: 0.3 + meet.value * 0.7 }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - meet.value) * 90 }], opacity: 0.3 + meet.value * 0.7 }));

  return (
    <View style={styles.backdrop}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.panel} accessibilityViewIsModal>
        <View style={styles.avatars}>
          <Avatar source={me.data?.avatar ?? null} name={me.data?.displayName ?? ''} size={64} />
          <Avatar source={them.data?.profile.avatar ?? null} name={name ?? ''} size={64} />
        </View>
        <View style={styles.wave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[styles.half, leftStyle]}>
            {LEFT.map((h, i) => (
              <View key={i} style={[styles.bar, { height: 56 * h }]} />
            ))}
          </Animated.View>
          <View style={styles.signal} />
          <Animated.View style={[styles.half, rightStyle]}>
            {RIGHT.map((h, i) => (
              <View key={i} style={[styles.bar, { height: 56 * h }]} />
            ))}
          </Animated.View>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {t('linked.title')}
        </Text>
        <Text variant="body" tone="mist" align="center">
          {t('linked.body', { name: name ?? '' })}
        </Text>
        <View style={styles.actions}>
          {conversationId ? (
            <Button label={t('linked.message')} full onPress={() => router.replace(`/chat/${conversationId}`)} testID="linked-message" />
          ) : null}
          <Button label={t('linked.keep')} full variant="ghost" onPress={() => goBack()} testID="linked-keep" />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,5,9,0.86)', justifyContent: 'center', padding: space.xl },
  panel: { alignItems: 'center', gap: space.lg, width: '100%', maxWidth: 420, alignSelf: 'center' },
  avatars: { flexDirection: 'row', gap: space.xl },
  wave: { flexDirection: 'row', alignItems: 'center', height: 64, gap: 6 },
  half: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bar: { width: 5, borderRadius: 3, backgroundColor: colors.paper },
  signal: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.signal },
  title: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1, color: colors.paper, marginTop: space.md },
  actions: { width: '100%', gap: space.sm, marginTop: space.lg },
});
