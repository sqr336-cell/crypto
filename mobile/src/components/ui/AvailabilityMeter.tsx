import { StyleSheet, View } from 'react-native';
import { AVAILABILITY_LEVEL, type Availability } from '../../domain/taxonomy';
import { useT } from '../../i18n';
import { colors, space } from '../../theme/tokens';
import { Text } from './Text';

/**
 * Signature element: availability as a 3-bar level meter.
 * Looking = 3 lit bars, available = 2, open = 1, unavailable = none.
 */
export function AvailabilityMeter({ value, showLabel = true, size = 'md' }: { value: Availability; showLabel?: boolean; size?: 'sm' | 'md' }) {
  const t = useT();
  const level = AVAILABILITY_LEVEL[value];
  const h = size === 'md' ? 12 : 9;
  return (
    <View style={styles.row} accessibilityLabel={t(`availability.${value}`)}>
      <View style={[styles.meter, { height: h }]}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { height: (h * (i + 1)) / 4, width: size === 'md' ? 3 : 2.5 },
              { backgroundColor: i <= level ? colors.signal : colors.faderHigh },
            ]}
          />
        ))}
      </View>
      {showLabel ? (
        <Text variant={size === 'md' ? 'label' : 'caption'} tone={level > 0 ? 'paper' : 'mist'}>
          {t(`availability.${value}`)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  meter: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { borderRadius: 1.5 },
});
