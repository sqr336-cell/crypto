import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Small marker shown before the label (e.g. "1" for the primary role). */
  badge?: string;
  testID?: string;
}

/** Selectable pill used in pickers and filters. */
export function Chip({ label, selected, onPress, disabled, badge, testID }: ChipProps) {
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: !!selected, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      pressedScale={0.94}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      {selected ? (
        badge ? (
          <View style={styles.badge}>
            <Text variant="micro" tone="ink">
              {badge}
            </Text>
          </View>
        ) : (
          <Check size={14} color={colors.signal} strokeWidth={2.5} />
        )
      ) : null}
      <Text variant="label" tone={selected ? 'paper' : 'mist'}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Non-interactive label. Shared items can be highlighted. */
export function Tag({ label, highlighted }: { label: string; highlighted?: boolean }) {
  return (
    <View style={[styles.tag, highlighted && styles.tagHighlighted]}>
      <Text variant="caption" tone={highlighted ? 'paper' : 'mist'}>
        {label}
      </Text>
    </View>
  );
}

export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  idle: { backgroundColor: colors.desk, borderColor: colors.hairlineStrong },
  selected: { backgroundColor: colors.signalSoft, borderColor: colors.signalLine },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.signal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  tagHighlighted: { borderColor: colors.signalLine, backgroundColor: colors.signalSoft },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
