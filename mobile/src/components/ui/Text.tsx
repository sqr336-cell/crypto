import { Text as RNText, type TextProps } from 'react-native';
import { colors, type, type TypeVariant } from '../../theme/tokens';

export type Tone = 'paper' | 'mist' | 'dim' | 'signal' | 'clip' | 'ink';

const toneColor: Record<Tone, string> = {
  paper: colors.paper,
  mist: colors.mist,
  dim: colors.dim,
  signal: colors.signal,
  clip: colors.clip,
  ink: colors.signalInk,
};

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
  tabular?: boolean;
}

export function Text({ variant = 'body', tone = 'paper', align, tabular, style, ...rest }: AppTextProps) {
  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        { color: toneColor[tone] },
        align && { textAlign: align },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
