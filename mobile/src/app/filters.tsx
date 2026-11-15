import { X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvailabilityMeter } from '../components/ui/AvailabilityMeter';
import { Button } from '../components/ui/Button';
import { ChipGroup } from '../components/ui/Chip';
import { IconButton } from '../components/ui/IconButton';
import { SectionTitle } from '../components/ui/Layout';
import { PressableScale } from '../components/ui/PressableScale';
import { Text } from '../components/ui/Text';
import { Switch } from '../components/ui/Toggle';
import { SlugPicker } from '../components/profile/Pickers';
import { AVAILABILITIES, GENRES, ROLES } from '../domain/taxonomy';
import { EMPTY_FILTERS } from '../domain/types';
import { useT } from '../i18n';
import { useFilters } from '../state/filters';
import { colors, layout, radius, space } from '../theme/tokens';
import { goBack } from '../lib/nav';

export default function Filters() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const current = useFilters((s) => s.filters);
  const apply = useFilters((s) => s.set);
  const [f, setF] = useState(current);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="heading">{t('filters.title')}</Text>
        <IconButton icon={X} label={t('common.close')} onPress={() => goBack()} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View>
          <SectionTitle>{t('filters.roles')}</SectionTitle>
          <SlugPicker options={ROLES} value={f.roles} onChange={(roles) => setF({ ...f, roles })} label={(r) => t(`roles.${r}`)} testPrefix="filter-role" />
        </View>
        <View>
          <SectionTitle>{t('filters.genres')}</SectionTitle>
          <SlugPicker options={GENRES} value={f.genres} onChange={(genres) => setF({ ...f, genres })} label={(g) => t(`genres.${g}`)} testPrefix="filter-genre" />
        </View>
        <View>
          <SectionTitle>{t('filters.availability')}</SectionTitle>
          <ChipGroup>
            {AVAILABILITIES.filter((a) => a !== 'unavailable').map((a) => {
              const on = f.availability.includes(a);
              return (
                <PressableScale
                  key={a}
                  onPress={() => setF({ ...f, availability: on ? f.availability.filter((x) => x !== a) : [...f.availability, a] })}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.avail, on && styles.availOn]}
                >
                  <AvailabilityMeter value={a} size="sm" />
                </PressableScale>
              );
            })}
          </ChipGroup>
        </View>
        <Switch label={t('filters.remoteOnly')} value={f.remoteOnly} onChange={(remoteOnly) => setF({ ...f, remoteOnly })} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button label={t('filters.clear')} variant="ghost" onPress={() => setF(EMPTY_FILTERS)} />
        <Button
          label={t('filters.apply')}
          onPress={() => {
            apply(f);
            goBack();
          }}
          testID="filters-apply"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.booth },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.xl, paddingRight: space.sm, height: 56 },
  body: { padding: space.xl, gap: space.xxl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  avail: { paddingHorizontal: space.lg, height: 40, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.hairlineStrong, backgroundColor: colors.desk },
  availOn: { borderColor: colors.signalLine, backgroundColor: colors.signalSoft },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
});
