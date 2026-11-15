import { Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import type { Track } from '../../domain/types';
import { useT } from '../../i18n';
import { formatDuration } from '../../lib/format';
import { useItemPlayback, usePlayer, type PlayerItem } from '../../state/player';
import { colors, radius, space } from '../../theme/tokens';
import { IconButton } from '../ui/IconButton';
import { Text } from '../ui/Text';
import { PlayButton } from './PlayButton';
import { Waveform } from './Waveform';

/** A sound on a profile: play, scrub, and its musical details. */
export function TrackRow({ track, item, onDelete }: { track: Track; item: PlayerItem; onDelete?: () => void }) {
  const t = useT();
  const { playing, loading, progress, isCurrent } = useItemPlayback(item.key);
  const toggle = usePlayer((s) => s.toggle);
  const seekTo = usePlayer((s) => s.seekTo);
  const positionMs = usePlayer((s) => (isCurrent ? s.positionMs : 0));

  return (
    <View style={[styles.row, isCurrent && styles.current]}>
      <View style={styles.top}>
        <PlayButton playing={playing} loading={loading} onPress={() => void toggle(item)} size={42} testID={`play-${track.id}`} />
        <View style={styles.titles}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {track.title}
          </Text>
          <View style={styles.meta}>
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
            {track.genre ? (
              <Text variant="caption" tone="mist">
                {t(`genres.${track.genre}`)}
              </Text>
            ) : null}
          </View>
        </View>
        <Text variant="caption" tone={isCurrent ? 'paper' : 'dim'} tabular>
          {isCurrent ? formatDuration(positionMs) : formatDuration(track.durationMs)}
        </Text>
        {onDelete ? <IconButton icon={Trash2} label={t('profile.removeTrack')} onPress={onDelete} size={36} color={colors.mist} /> : null}
      </View>
      <Waveform
        peaks={track.waveform}
        progress={progress}
        active={isCurrent}
        height={30}
        barWidth={2.5}
        onSeek={(f) => {
          if (isCurrent) seekTo(f);
          else void toggle(item);
        }}
        accessibilityLabel={track.title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.md, padding: space.md, borderRadius: radius.tile, backgroundColor: colors.desk },
  current: { backgroundColor: colors.rack },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  titles: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', gap: space.md },
});
