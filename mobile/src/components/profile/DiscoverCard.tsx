import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Info } from 'lucide-react-native';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { DiscoverCandidate } from '../../domain/types';
import { useT } from '../../i18n';
import { formatDuration } from '../../lib/format';
import { useItemPlayback, usePlayer } from '../../state/player';
import { colors, fonts, motion, radius, space } from '../../theme/tokens';
import { PlayButton } from '../audio/PlayButton';
import { trackItem } from '../audio/playable';
import { Waveform } from '../audio/Waveform';
import { AvailabilityMeter } from '../ui/AvailabilityMeter';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { FitReasons, FitTier } from './Fit';

export interface DiscoverCardHandle {
  /** Animates the card away, then calls back. Used by the action buttons. */
  fling: (direction: 'left' | 'right') => void;
}

interface Props {
  candidate: DiscoverCandidate;
  /** How much vertical room the card has: tighter densities drop secondary lines. */
  density?: 'regular' | 'compact' | 'tight';
  onDecide: (decision: 'pass' | 'interest') => void;
  onOpenFit: () => void;
}

const THRESHOLD = 110;

export const DiscoverCard = forwardRef<DiscoverCardHandle, Props>(function DiscoverCard({ candidate, onDecide, onOpenFit, density = 'regular' }, ref) {
  const t = useT();
  const { profile, tracks, fit } = candidate;
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  // Entrance: a short settle from 96 % scale (layout animations are avoided: on the web they freeze the card height).
  const appear = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) appear.value = withTiming(1, { duration: 220 });
  }, [appear, reduced]);
  const [trackIndex, setTrackIndex] = useState(0);
  const track = tracks[trackIndex] ?? null;
  const item = track ? trackItem(track, { id: profile.id, displayName: profile.displayName, artwork: profile.avatar ?? profile.banner }, 'discover') : null;
  const playback = useItemPlayback(item?.key ?? '');
  const toggle = usePlayer((s) => s.toggle);
  const seekTo = usePlayer((s) => s.seekTo);
  const positionMs = usePlayer((s) => (playback.isCurrent ? s.positionMs : 0));

  const fling = (direction: 'left' | 'right') => {
    const target = (direction === 'right' ? 1 : -1) * width * 1.3;
    const done = () => onDecide(direction === 'right' ? 'interest' : 'pass');
    if (reduced) return done();
    x.value = withTiming(target, { duration: 240 }, (finished) => {
      if (finished) runOnJS(done)();
    });
  };
  useImperativeHandle(ref, () => ({ fling }));

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-14, 14],
    onUpdate: (e) => {
      'worklet';
      x.value = e.translationX;
    },
    onDeactivate: (e) => {
      'worklet';
      const decided = Math.abs(e.translationX) > THRESHOLD || Math.abs(e.velocityX) > 900;
      if (decided) {
        const dir = e.translationX > 0 ? 'right' : 'left';
        runOnJS(fling)(dir);
      } else {
        x.value = withSpring(0, motion.cardSpring);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateX: x.value },
      { rotate: `${interpolate(x.value, [-width, width], [-9, 9])}deg` },
      { scale: 0.96 + appear.value * 0.04 },
    ],
  }));
  const linkHint = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [20, THRESHOLD], [0, 1], 'clamp') }));
  const passHint = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-THRESHOLD, -20], [1, 0], 'clamp') }));

  const roles = profile.roles.map((r) => t(`roles.${r}`)).join(', ');

  return (
    <Animated.View style={[styles.card, cardStyle]} testID="discover-card">
      <GestureDetector gesture={pan}>
        <View style={styles.cover}>
          {profile.banner ? <Image source={profile.banner} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
          <LinearGradient
            colors={['rgba(14,13,18,0)', 'rgba(14,13,18,0.35)', 'rgba(14,13,18,0.94)']}
            locations={[0.25, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.coverTop}>
            {profile.isDemo ? (
              <View style={styles.demoBadge}>
                <Text variant="micro" tone="paper">
                  {t('common.demoProfile')}
                </Text>
              </View>
            ) : (
              <View />
            )}
          </View>
          <Animated.View style={[styles.stamp, styles.stampLink, linkHint]} pointerEvents="none">
            <Text variant="heading" tone="ink">
              {t('discover.link')}
            </Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampPass, passHint]} pointerEvents="none">
            <Text variant="heading" tone="paper">
              {t('discover.pass')}
            </Text>
          </Animated.View>
          <PressableScale
            style={styles.identity}
            onPress={() => router.push(`/profile/${profile.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${t('discover.viewProfile')}: ${profile.displayName}`}
            pressedScale={0.99}
            testID="discover-open-profile"
          >
            <Text style={[styles.name, density !== 'regular' && styles.nameCompact]} numberOfLines={density === 'regular' ? 2 : 1} adjustsFontSizeToFit>
              {profile.displayName}
            </Text>
            <Text variant="label" tone="paper" numberOfLines={1}>
              {roles}
            </Text>
            <View style={styles.statusRow}>
              <AvailabilityMeter value={profile.availability} size="sm" />
              {profile.city ? (
                <Text variant="caption" tone="mist" numberOfLines={1}>
                  {profile.city}
                </Text>
              ) : null}
            </View>
            {profile.lookingFor && density === 'regular' ? (
              <Text variant="caption" tone="mist" numberOfLines={2} style={styles.looking}>
                {t('profile.lookingFor')}{'  '}
                <Text variant="caption" tone="paper">
                  {profile.lookingFor}
                </Text>
              </Text>
            ) : null}
          </PressableScale>
        </View>
      </GestureDetector>

      <View style={styles.player}>
        {track && item ? (
          <>
            <View style={styles.playerRow}>
              <PlayButton playing={playback.playing} loading={playback.loading} onPress={() => void toggle(item)} size={44} testID="discover-play" />
              <View style={styles.trackText}>
                <Text variant="labelStrong" numberOfLines={1}>
                  {track.title}
                </Text>
                <View style={styles.trackMeta}>
                  {track.bpm ? (
                    <Text variant="caption" tone="mist" tabular>
                      {track.bpm} BPM
                    </Text>
                  ) : null}
                  {track.musicalKey ? (
                    <Text variant="caption" tone="mist">
                      {track.musicalKey}
                    </Text>
                  ) : null}
                  <Text variant="caption" tone={playback.isCurrent ? 'paper' : 'mist'} tabular>
                    {playback.isCurrent ? formatDuration(positionMs) : formatDuration(track.durationMs)}
                  </Text>
                </View>
              </View>
              {tracks.length > 1 ? (
                <View style={styles.switcher}>
                  {tracks.map((tr, i) => (
                    <PressableScale
                      key={tr.id}
                      onPress={() => {
                        setTrackIndex(i);
                        void usePlayer.getState().play(trackItem(tr, { id: profile.id, displayName: profile.displayName, artwork: profile.avatar ?? profile.banner }, 'discover'));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={tr.title}
                      accessibilityState={{ selected: i === trackIndex }}
                      style={[styles.switch, i === trackIndex && styles.switchOn]}
                    >
                      <Text variant="micro" tone={i === trackIndex ? 'paper' : 'mist'} tabular>
                        {i + 1}
                      </Text>
                    </PressableScale>
                  ))}
                </View>
              ) : null}
            </View>
            <Waveform
              peaks={track.waveform}
              progress={playback.progress}
              active={playback.isCurrent}
              height={34}
              onSeek={(f) => (playback.isCurrent ? seekTo(f) : void toggle(item))}
              accessibilityLabel={track.title}
            />
          </>
        ) : (
          <Text variant="caption" tone="dim">
            {t('discover.noSounds')}
          </Text>
        )}
      </View>

      <PressableScale style={styles.fit} onPress={onOpenFit} pressedScale={0.99} accessibilityRole="button" accessibilityLabel={t('discover.howScored')} testID="discover-fit">
        <View style={styles.fitHead}>
          <FitTier fit={fit} />
          <Info size={16} color={colors.dim} />
        </View>
        {density !== 'tight' ? <FitReasons fit={fit} city={profile.city} max={density === 'regular' ? 2 : 1} /> : null}
      </PressableScale>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.card,
    backgroundColor: colors.desk,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  cover: { flex: 1, minHeight: 150, justifyContent: 'space-between', backgroundColor: colors.rack },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', padding: space.lg },
  demoBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(14,13,18,0.6)',
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  identity: { padding: space.lg, gap: 6 },
  name: { fontFamily: fonts.display, fontSize: 34, lineHeight: 37, letterSpacing: -0.8, color: colors.paper },
  nameCompact: { fontSize: 26, lineHeight: 30 },
  looking: { marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  stamp: { position: 'absolute', top: space.xl, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill },
  stampLink: { left: space.xl, backgroundColor: colors.signal },
  stampPass: { right: space.xl, backgroundColor: colors.rack, borderWidth: 1, borderColor: colors.hairlineStrong },
  player: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, gap: space.sm },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  trackText: { flex: 1, gap: 2 },
  trackMeta: { flexDirection: 'row', gap: space.md },
  switcher: { flexDirection: 'row', gap: 4 },
  switch: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairlineStrong },
  switchOn: { backgroundColor: colors.rack, borderColor: colors.faderHigh },
  fit: {
    marginHorizontal: space.md,
    marginBottom: space.md,
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.tile,
    backgroundColor: colors.booth,
  },
  fitHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
