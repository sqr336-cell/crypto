import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { IconButton } from '../components/ui/IconButton';
import { SectionTitle } from '../components/ui/Layout';
import { PressableScale } from '../components/ui/PressableScale';
import { Text } from '../components/ui/Text';
import { Toggle } from '../components/ui/Toggle';
import { useBlock, useReport } from '../data/queries';
import { LIMITS, REPORT_REASONS, type ReportReason } from '../domain/taxonomy';
import { useT } from '../i18n';
import { errorMessage, toast } from '../state/toast';
import { colors, layout, radius, space } from '../theme/tokens';
import { goBack } from '../lib/nav';

export default function Report() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { profileId, messageId, trackId, name } = useLocalSearchParams<{ profileId?: string; messageId?: string; trackId?: string; name?: string }>();
  const report = useReport();
  const block = useBlock();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) return;
    setError(null);
    try {
      await report.mutateAsync({ reason, targetProfileId: profileId || undefined, messageId: messageId || undefined, trackId: trackId || undefined, details: details.trim() || undefined });
      if (alsoBlock && profileId) await block.mutateAsync(profileId);
      toast(t('report.sent'));
      if (alsoBlock) router.dismissAll();
      else goBack();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="heading">
          {t('report.title')}
          {name ? ` ${name}` : ''}
        </Text>
        <IconButton icon={X} label={t('common.close')} onPress={() => goBack()} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="body" tone="mist">
          {t('report.subtitle')}
        </Text>
        <View>
          <SectionTitle>{t('report.reason')}</SectionTitle>
          <View style={styles.reasons} accessibilityRole="radiogroup">
            {REPORT_REASONS.map((r) => (
              <PressableScale
                key={r}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === r }}
                onPress={() => setReason(r)}
                style={[styles.reason, reason === r && styles.reasonOn]}
                pressedScale={0.98}
                testID={`report-${r}`}
              >
                <Text variant="body">{t(`reportReasons.${r}`)}</Text>
                <View style={[styles.dot, reason === r && styles.dotOn]} />
              </PressableScale>
            ))}
          </View>
        </View>
        <Field label={t('report.details')} optionalLabel={t('common.optional')} placeholder={t('report.detailsPh')} value={details} onChangeText={setDetails} multiline max={LIMITS.reportDetails} />
        {profileId ? <Toggle label={t('report.alsoBlock')} value={alsoBlock} onChange={setAlsoBlock} /> : null}
        {error ? (
          <Text variant="label" tone="clip" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button label={t('report.send')} full disabled={!reason} loading={report.isPending || block.isPending} onPress={() => void submit()} testID="report-send" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.booth },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.xl, paddingRight: space.sm, height: 56 },
  body: { padding: space.xl, gap: space.xl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  reasons: { gap: space.xs },
  reason: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space.lg, borderRadius: radius.tile, backgroundColor: colors.desk, borderWidth: 1, borderColor: 'transparent' },
  reasonOn: { borderColor: colors.signalLine },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.faderHigh },
  dotOn: { borderWidth: 5, borderColor: colors.signal },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
});
