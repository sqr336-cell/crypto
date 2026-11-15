import { StyleSheet, View } from 'react-native';
import { FIT_CRITERIA, FIT_WEIGHTS, fitReasons, type FitReason } from '../../domain/matching';
import type { Fit } from '../../domain/types';
import { joinList, useT } from '../../i18n';
import { colors, space } from '../../theme/tokens';
import { Text } from '../ui/Text';

type T = ReturnType<typeof useT>;

export function reasonText(r: FitReason, t: T, city: string | null): string {
  switch (r.kind) {
    case 'genres': {
      const items = joinList(r.items.map((g) => t(`genres.${g}`)), t.locale);
      return r.items.length === 1 ? t('fit.genres_one', { items }) : t('fit.genres_other', { count: r.items.length, items });
    }
    case 'influences':
      return t('fit.influences', { items: joinList(r.items.slice(0, 3), t.locale) });
    case 'skills':
      return t('fit.skills', { items: joinList(r.items.map((s) => t(`skills.${s}`).toLowerCase()), t.locale) });
    case 'goals_shared':
      return t('fit.goals_shared', { items: joinList(r.items.map((g) => t(`goalVerbs.${g}`)), t.locale) });
    case 'same_city':
      return t('fit.same_city', { city: city ?? '' });
    default:
      return t(`fit.${r.kind}`);
  }
}

/** Tier label with a 3-step level, never a pseudo-precise percentage. */
export function FitTier({ fit }: { fit: Fit }) {
  const t = useT();
  const level = fit.tier === 'strong' ? 3 : fit.tier === 'good' ? 2 : 1;
  return (
    <View style={styles.tier}>
      <View style={styles.tierMeter}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.tierDot, { backgroundColor: i <= level ? colors.signal : colors.faderHigh }]} />
        ))}
      </View>
      <Text variant="labelStrong" tone={fit.tier === 'explore' ? 'mist' : 'paper'}>
        {t(`discover.tiers.${fit.tier}`)}
      </Text>
    </View>
  );
}

export function FitReasons({ fit, city, max = 3 }: { fit: Fit; city: string | null; max?: number }) {
  const t = useT();
  const reasons = fitReasons(fit, max);
  if (!reasons.length) {
    return (
      <Text variant="caption" tone="mist">
        {t('fit.nothingShared')}
      </Text>
    );
  }
  return (
    <View style={styles.reasons}>
      {reasons.map((r, i) => (
        <View key={i} style={styles.reason}>
          <View style={styles.reasonMark} />
          <Text variant="label" tone="paper" style={styles.reasonText}>
            {reasonText(r, t, city)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Full, honest breakdown: each criterion, its points and its maximum. */
export function FitBreakdown({ fit }: { fit: Fit }) {
  const t = useT();
  return (
    <View style={styles.breakdown}>
      <Text variant="body" tone="mist">
        {t('fit.explain')}
      </Text>
      {FIT_CRITERIA.map((key) => {
        const pts = fit[key].points;
        const max = FIT_WEIGHTS[key];
        return (
          <View key={key} style={styles.criterion} accessibilityLabel={`${t(`fit.criteria.${key}`)}: ${pts} / ${max}`}>
            <View style={styles.criterionHead}>
              <Text variant="label">{t(`fit.criteria.${key}`)}</Text>
              <Text variant="label" tone="mist" tabular>
                {pts} / {max}
              </Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${(pts / max) * 100}%` }]} />
            </View>
          </View>
        );
      })}
      <View style={[styles.criterionHead, styles.total]}>
        <Text variant="bodyStrong">{t('fit.total')}</Text>
        <Text variant="bodyStrong" tabular>
          {fit.score} / 100
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tier: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tierMeter: { flexDirection: 'row', gap: 3 },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  reasons: { gap: 6 },
  reason: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  reasonMark: { width: 2, alignSelf: 'stretch', borderRadius: 1, backgroundColor: colors.signalLine, marginVertical: 2 },
  reasonText: { flex: 1 },
  breakdown: { gap: space.lg },
  criterion: { gap: space.sm },
  criterionHead: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.fader, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2, backgroundColor: colors.signal },
  total: { paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairlineStrong },
});

