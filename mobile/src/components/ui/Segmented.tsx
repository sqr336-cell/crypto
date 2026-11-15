import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface Segment<K extends string> {
  key: K;
  label: string;
  /** Count shown next to the label; a Signal dot marks unseen items. */
  count?: number;
  attention?: boolean;
}

export function Segmented<K extends string>({ segments, value, onChange }: { segments: Segment<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row} accessibilityRole="tablist">
      {segments.map((s) => {
        const active = s.key === value;
        return (
          <PressableScale
            key={s.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={s.count ? `${s.label}, ${s.count}` : s.label}
            onPress={() => onChange(s.key)}
            haptic="selection"
            style={[styles.item, active && styles.active]}
            testID={`segment-${s.key}`}
          >
            <Text variant="labelStrong" tone={active ? 'paper' : 'mist'}>
              {s.label}
            </Text>
            {s.count ? (
              <Text variant="caption" tone={active ? 'paper' : 'dim'} tabular>
                {s.count}
              </Text>
            ) : null}
            {s.attention ? <View style={styles.dot} /> : null}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { gap: space.xs, paddingHorizontal: space.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
  },
  active: { backgroundColor: colors.rack },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.signal },
});
