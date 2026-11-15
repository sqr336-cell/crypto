import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space } from '../../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text, type Tone } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const palette: Record<Variant, { bg: string; fg: Tone; icon: string; border?: string }> = {
  primary: { bg: colors.signal, fg: 'ink', icon: colors.signalInk },
  secondary: { bg: colors.rack, fg: 'paper', icon: colors.paper, border: colors.hairlineStrong },
  ghost: { bg: 'transparent', fg: 'paper', icon: colors.paper },
  danger: { bg: colors.clipSoft, fg: 'clip', icon: colors.clip },
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', icon: Icon, loading, disabled, full, style, accessibilityHint, testID }: ButtonProps) {
  const p = palette[variant];
  const height = size === 'md' ? 52 : 38;
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: !!loading }}
      onPress={loading ? undefined : onPress}
      disabled={disabled}
      haptic={variant === 'primary' ? 'light' : false}
      style={[
        styles.base,
        {
          height,
          paddingHorizontal: size === 'md' ? space.xl : space.lg,
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
        },
        full && styles.full,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.icon} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={size === 'md' ? 19 : 16} color={p.icon} strokeWidth={2} /> : null}
          <Text variant={size === 'md' ? 'bodyStrong' : 'labelStrong'} tone={p.fg} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
