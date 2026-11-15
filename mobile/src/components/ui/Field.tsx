import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { colors, fonts, radius, space } from '../../theme/tokens';
import { Text } from './Text';

export interface FieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  /** Shows a live character counter against this limit. */
  max?: number;
  optionalLabel?: string;
  prefix?: string;
}

export const Field = forwardRef<TextInputInstance, FieldProps>(function Field(
  { label, hint, error, max, optionalLabel, multiline, prefix, style, value, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const length = typeof value === 'string' ? value.length : 0;
  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.labelRow}>
          <Text variant="label" tone="mist">
            {label}
          </Text>
          {optionalLabel ? (
            <Text variant="caption" tone="dim">
              {optionalLabel}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          styles.box,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
      >
        {prefix ? (
          <Text variant="body" tone="dim">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          {...rest}
          value={value}
          multiline={multiline}
          maxLength={max}
          placeholderTextColor={colors.dim}
          selectionColor={colors.signal}
          cursorColor={colors.signal}
          accessibilityLabel={label ?? rest.placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
      </View>
      {error || hint || max ? (
        <View style={styles.footer}>
          <Text variant="caption" tone={error ? 'clip' : 'dim'} style={styles.footerText}>
            {error ?? hint ?? ''}
          </Text>
          {max && focused ? (
            <Text variant="caption" tone={length >= max ? 'clip' : 'dim'} tabular>
              {length}/{max}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.input,
    backgroundColor: colors.rack,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  multiline: { alignItems: 'flex-start', paddingVertical: space.md },
  focused: { borderColor: colors.signalLine },
  errored: { borderColor: colors.clip },
  input: {
    flex: 1,
    color: colors.paper,
    fontFamily: fonts.ui,
    fontSize: 16,
    paddingVertical: 12,
    outlineStyle: 'none',
  } as object,
  inputMultiline: { minHeight: 96, textAlignVertical: 'top', paddingVertical: 0, lineHeight: 22 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  footerText: { flex: 1 },
});
