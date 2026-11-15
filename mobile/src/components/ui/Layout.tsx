import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, useReducedMotion } from 'react-native-reanimated';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../../i18n';
import { colors, layout, radius, space } from '../../theme/tokens';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { goBack } from '../../lib/nav';

/** Screen container: booth background, safe areas, centred max width on large screens. */
export function Screen({
  children,
  scroll,
  edges = ['top'],
  contentStyle,
  scrollProps,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: ScrollViewProps;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: edges.includes('top') ? insets.top : 0, paddingBottom: edges.includes('bottom') ? insets.bottom : 0 };
  return (
    <View style={[styles.screen, pad]}>
      {scroll ? (
        <ScrollView
          {...scrollProps}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
      )}
      {footer}
    </View>
  );
}

export function Header({ title, right, back = true, onBack }: { title?: string; right?: ReactNode; back?: boolean; onBack?: () => void }) {
  const t = useT();
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {back ? (
          <IconButton
            icon={ChevronLeft}
            label={t('common.back')}
            onPress={onBack ?? (() => goBack())}
            iconSize={24}
            testID="header-back"
          />
        ) : null}
      </View>
      {title ? (
        <Text variant="heading" numberOfLines={1} style={styles.headerTitle} accessibilityRole="header">
          {title}
        </Text>
      ) : (
        <View style={styles.flex} />
      )}
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="label" tone="mist" accessibilityRole="header">
        {children}
      </Text>
      {action}
    </View>
  );
}

export function EmptyState({ title, body, action }: { title?: string; body: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}>
        {[0.4, 0.7, 1, 0.55, 0.3].map((h, i) => (
          <View key={i} style={[styles.emptyBar, { height: 28 * h }]} />
        ))}
      </View>
      {title ? (
        <Text variant="heading" align="center">
          {title}
        </Text>
      ) : null}
      <Text variant="body" tone="mist" align="center" style={styles.emptyBody}>
        {body}
      </Text>
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" style={styles.centerSelf} /> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.signal} />
    </View>
  );
}

/** Placeholder block with a slow breathing opacity (static when reduced motion is on). */
export function Skeleton({ height, width = '100%', rounded = radius.tile, style }: { height: number; width?: number | `${number}%`; rounded?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(0.5);
  useEffect(() => {
    if (!reduced) o.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [o, reduced]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ height, width, borderRadius: rounded, backgroundColor: colors.desk }, a, style]} />;
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.booth },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm },
  headerSide: { minWidth: 48, flexDirection: 'row', alignItems: 'center' },
  headerRight: { justifyContent: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center' },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  empty: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xxl, paddingVertical: space.xxxl },
  emptyMark: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: space.sm },
  emptyBar: { width: 4, borderRadius: 2, backgroundColor: colors.fader },
  emptyBody: { maxWidth: 320 },
  centerSelf: { alignSelf: 'center', marginTop: space.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairlineStrong },
});
