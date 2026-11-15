import { Image } from 'expo-image';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useT } from '../../i18n';
import { usePlayer } from '../../state/player';
import { colors, layout, radius, space } from '../../theme/tokens';
import { IconButton } from '../ui/IconButton';
import { Text } from '../ui/Text';
import { PlayButton } from './PlayButton';

/** Persistent player above the tab bar. Tapping it opens the creator's profile. */
export function MiniPlayer() {
  const t = useT();
  const current = usePlayer((s) => s.current);
  const playing = usePlayer((s) => s.playing);
  const loading = usePlayer((s) => s.loading);
  const progress = usePlayer((s) => (s.durationMs > 0 ? s.positionMs / s.durationMs : 0));
  const toggle = usePlayer((s) => s.toggle);
  const stop = usePlayer((s) => s.stop);
  if (!current) return null;

  return (
    <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(160)} style={styles.wrap} testID="mini-player">
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]} />
      </View>
      <Pressable
        style={styles.body}
        accessibilityRole="button"
        accessibilityLabel={`${t('player.playing')}: ${current.title}, ${current.subtitle ?? ''}`}
        onPress={() => current.profileId && current.context !== 'message' && router.push(`/profile/${current.profileId}`)}
      >
        <View style={styles.art}>
          {current.artwork ? <Image source={current.artwork} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        </View>
        <View style={styles.titles}>
          <Text variant="labelStrong" numberOfLines={1}>
            {current.title}
          </Text>
          {current.subtitle ? (
            <Text variant="caption" tone="mist" numberOfLines={1}>
              {current.subtitle}
            </Text>
          ) : null}
        </View>
        <PlayButton playing={playing} loading={loading} onPress={() => void toggle()} size={40} testID="mini-player-toggle" />
        <IconButton icon={X} label={t('player.close')} onPress={stop} size={40} color={colors.mist} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: layout.miniPlayerHeight,
    marginHorizontal: space.sm,
    marginBottom: space.xs,
    borderRadius: radius.tile,
    backgroundColor: colors.rack,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  track: { height: 2, backgroundColor: colors.fader },
  fill: { height: 2, backgroundColor: colors.signal },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.sm, paddingRight: space.xs },
  art: { width: 40, height: 40, borderRadius: radius.thumb, overflow: 'hidden', backgroundColor: colors.fader },
  titles: { flex: 1, gap: 1 },
});
