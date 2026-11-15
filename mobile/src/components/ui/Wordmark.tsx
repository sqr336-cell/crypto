import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../../theme/tokens';
import { Text } from './Text';

/**
 * The BEATLINK wordmark: lowercase Syne ExtraBold where the dot of the "i"
 * is the Signal dot — the brand's only light. Uses Syne's dotless "ı" glyph
 * so the stem keeps the typeface's own proportions.
 */
export function Wordmark({ size = 22 }: { size?: number }) {
  const dot = size * 0.24;
  const word = [styles.word, { fontSize: size, lineHeight: size * 1.2 }];
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="BEATLINK">
      <Text style={word}>beatl</Text>
      <View>
        <Text style={word}>ı</Text>
        <View
          style={[
            styles.dot,
            { width: dot, height: dot, borderRadius: dot / 2, left: size * 0.175 - dot / 2, bottom: size * DOT_BOTTOM },
          ]}
        />
      </View>
      <Text style={word}>nk</Text>
    </View>
  );
}

/** Distance from the bottom of the line box to the bottom of the dot, in em. */
const DOT_BOTTOM = 0.85;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  word: { fontFamily: fonts.display, color: colors.paper, letterSpacing: -0.3 },
  dot: { position: 'absolute', backgroundColor: colors.signal },
});
