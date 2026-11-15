import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { MediaSource } from '../../domain/types';
import { colors, fonts } from '../../theme/tokens';
import { Text } from './Text';

export function Avatar({ source, name, size = 44, ring }: { source: MediaSource | null; name: string; size?: number; ring?: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      accessibilityIgnoresInvertColors
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        ring && { borderWidth: 2, borderColor: colors.signal },
      ]}
    >
      {source ? (
        <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
      ) : (
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.42, lineHeight: size * 0.5 }} tone="mist">
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', backgroundColor: colors.rack, alignItems: 'center', justifyContent: 'center' },
});
