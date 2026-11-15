import { Pause, Play } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useT } from '../../i18n';
import { colors, layout, radius } from '../../theme/tokens';
import { PressableScale } from '../ui/PressableScale';

export function PlayButton({
  playing,
  loading,
  onPress,
  size = 48,
  tone = 'paper',
  testID,
}: {
  playing: boolean;
  loading?: boolean;
  onPress: () => void;
  size?: number;
  tone?: 'paper' | 'rack';
  testID?: string;
}) {
  const t = useT();
  const bg = playing ? colors.signal : tone === 'paper' ? colors.paper : colors.rack;
  const fg = playing ? colors.signalInk : tone === 'paper' ? colors.booth : colors.paper;
  const icon = Math.round(size * 0.4);
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={playing ? t('player.pause') : t('player.play')}
      onPress={onPress}
      hitSlop={layout.hitSlop}
      haptic="light"
      pressedScale={0.9}
      style={[styles.base, { width: size, height: size, backgroundColor: bg }]}
    >
      {loading && !playing ? (
        <ActivityIndicator color={fg} size="small" />
      ) : playing ? (
        <Pause size={icon} color={fg} fill={fg} strokeWidth={0} />
      ) : (
        <Play size={icon} color={fg} fill={fg} strokeWidth={0} style={{ marginLeft: size * 0.06 }} />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
