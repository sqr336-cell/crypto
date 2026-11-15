import { X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AVAILABILITIES,
  FEATURED_GENRES,
  GENRES,
  LIMITS,
  type Availability,
  type GenreSlug,
} from '../../domain/taxonomy';
import { useT } from '../../i18n';
import { colors, radius, space } from '../../theme/tokens';
import { AvailabilityMeter } from '../ui/AvailabilityMeter';
import { Chip, ChipGroup } from '../ui/Chip';
import { Field } from '../ui/Field';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';

/** Multi-select over a list of slugs, with an optional maximum. Order of selection is kept. */
export function SlugPicker<S extends string>({
  options,
  value,
  onChange,
  label,
  max,
  numbered,
  testPrefix,
}: {
  options: readonly S[];
  value: S[];
  onChange: (v: S[]) => void;
  label: (s: S) => string;
  max?: number;
  numbered?: boolean;
  testPrefix?: string;
}) {
  return (
    <ChipGroup>
      {options.map((o) => {
        const i = value.indexOf(o);
        const selected = i >= 0;
        return (
          <Chip
            key={o}
            label={label(o)}
            selected={selected}
            badge={numbered && selected ? String(i + 1) : undefined}
            disabled={!selected && !!max && value.length >= max}
            onPress={() => onChange(selected ? value.filter((x) => x !== o) : [...value, o])}
            testID={testPrefix ? `${testPrefix}-${o}` : undefined}
          />
        );
      })}
    </ChipGroup>
  );
}

export function GenrePicker({ value, onChange }: { value: GenreSlug[]; onChange: (v: GenreSlug[]) => void }) {
  const t = useT();
  const [all, setAll] = useState(value.some((g) => !FEATURED_GENRES.includes(g)));
  const options = all ? GENRES : FEATURED_GENRES;
  return (
    <View style={styles.gap}>
      <SlugPicker options={options} value={value} onChange={onChange} label={(g) => t(`genres.${g}`)} max={LIMITS.genres} testPrefix="genre" />
      <PressableScale onPress={() => setAll(!all)} accessibilityRole="button" style={styles.more}>
        <Text variant="label" tone="signal">
          {all ? t('onboarding.sound.fewerGenres') : t('onboarding.sound.moreGenres')}
        </Text>
      </PressableScale>
    </View>
  );
}

export function AvailabilityPicker({ value, onChange }: { value: Availability; onChange: (v: Availability) => void }) {
  return (
    <View style={styles.radios} accessibilityRole="radiogroup">
      {AVAILABILITIES.map((a) => (
        <PressableScale
          key={a}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === a }}
          onPress={() => onChange(a)}
          haptic="selection"
          pressedScale={0.98}
          style={[styles.radio, value === a && styles.radioOn]}
          testID={`availability-${a}`}
        >
          <AvailabilityMeter value={a} />
          <View style={[styles.radioDot, value === a && styles.radioDotOn]} />
        </PressableScale>
      ))}
    </View>
  );
}

/** Free-text tags (influences): type, press return, remove with ×. */
export function TagInput({ value, onChange, placeholder, hint, max, maxLength }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; hint: string; max: number; maxLength: number }) {
  const t = useT();
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (!v || value.length >= max) return;
    if (!value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setText('');
  };
  return (
    <View style={styles.gap}>
      <Field
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        hint={hint}
        onSubmitEditing={add}
        blurOnSubmit={false}
        returnKeyType="done"
        maxLength={maxLength}
        editable={value.length < max}
        testID="tag-input"
      />
      {value.length ? (
        <View style={styles.tags}>
          {value.map((v) => (
            <View key={v} style={styles.tag}>
              <Text variant="label">{v}</Text>
              <PressableScale onPress={() => onChange(value.filter((x) => x !== v))} accessibilityRole="button" accessibilityLabel={`${t('common.remove')} ${v}`} hitSlop={8}>
                <X size={14} color={colors.mist} />
              </PressableScale>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.md },
  more: { alignSelf: 'flex-start', paddingVertical: space.xs },
  radios: { gap: space.sm },
  radio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    borderRadius: radius.tile,
    backgroundColor: colors.desk,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radioOn: { borderColor: colors.signalLine, backgroundColor: colors.rack },
  radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.faderHigh },
  radioDotOn: { borderWidth: 5, borderColor: colors.signal },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.md,
    paddingRight: space.sm,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.rack,
  },
});
