import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, layout, radius } from '../../theme/tokens';
import { PressableScale } from './PressableScale';

type Variant = 'plain' | 'filled' | 'outline' | 'signal';

export interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: number;
  iconSize?: number;
  color?: string;
  disabled?: boolean;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: 'light' | 'medium' | 'selection' | false;
  testID?: string;
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  variant = 'plain',
  size = 44,
  iconSize,
  color,
  disabled,
  active,
  style,
  haptic = 'light',
  testID,
}: IconButtonProps) {
  const bg =
    variant === 'signal' ? colors.signal : variant === 'filled' ? colors.rack : active ? colors.signalSoft : 'transparent';
  const border = variant === 'outline' ? (active ? colors.signalLine : colors.hairlineStrong) : 'transparent';
  const fg = color ?? (variant === 'signal' ? colors.signalInk : active ? colors.signal : colors.paper);
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      hitSlop={layout.hitSlop}
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      pressedScale={0.9}
      style={[styles.base, { width: size, height: size, backgroundColor: bg, borderColor: border }, style]}
    >
      <Icon size={iconSize ?? Math.round(size * 0.45)} color={fg} strokeWidth={1.9} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
