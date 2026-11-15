import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Checkbox row (consents, confirmations). */
export function Toggle({ label, value, onChange, testID }: { label: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      haptic="selection"
      pressedScale={0.98}
      style={styles.row}
    >
      <View style={[styles.box, value && styles.boxOn]}>{value ? <Check size={14} color={colors.signalInk} strokeWidth={3} /> : null}</View>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** On/off switch row (settings). */
export function Switch({ label, note, value, onChange, testID }: { label: string; note?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      haptic="selection"
      pressedScale={0.99}
      style={styles.switchRow}
    >
      <View style={styles.switchText}>
        <Text variant="body">{label}</Text>
        {note ? (
          <Text variant="caption" tone="mist">
            {note}
          </Text>
        ) : null}
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.faderHigh, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.signal, borderColor: colors.signal },
  label: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md },
  switchText: { flex: 1, gap: 2 },
  track: { width: 46, height: 28, borderRadius: radius.pill, backgroundColor: colors.fader, padding: 3 },
  trackOn: { backgroundColor: colors.signal },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.mist },
  knobOn: { backgroundColor: colors.signalInk, transform: [{ translateX: 18 }] },
});
