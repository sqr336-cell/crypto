import { StyleSheet, View } from 'react-native';
import { colors, space } from '../../theme/tokens';

/** Without a cover image, a quiet level-meter texture (stable per profile) keeps the header intentional. */
export function CoverFallback({ seed }: { seed: string }) {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bars = Array.from({ length: 48 }, (_, i) => 0.2 + 0.8 * Math.abs(Math.sin((h % 97) * 0.13 + i * 0.47) * Math.cos(i * 0.21 + (h % 13))));
  return (
    <View style={styles.fallback} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((v, i) => (
        <View key={i} style={[styles.bar, { height: `${Math.round(v * 70)}%` }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: space.sm, opacity: 0.55 },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: colors.fader },
});
