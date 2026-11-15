import { FileAudio, X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Waveform } from '../components/audio/Waveform';
import { Button } from '../components/ui/Button';
import { Chip, ChipGroup } from '../components/ui/Chip';
import { Field } from '../components/ui/Field';
import { IconButton } from '../components/ui/IconButton';
import { SectionTitle } from '../components/ui/Layout';
import { PressableScale } from '../components/ui/PressableScale';
import { Text } from '../components/ui/Text';
import { useAddTrack, useMyProfile } from '../data/queries';
import { LIMITS, MUSICAL_KEYS, type GenreSlug } from '../domain/taxonomy';
import type { LocalFile } from '../domain/types';
import { parseBpm } from '../domain/validation';
import { useT } from '../i18n';
import { analyseAudio, pickAudioFile, type AudioAnalysis } from '../lib/files';
import { formatDuration } from '../lib/format';
import { errorMessage, toast } from '../state/toast';
import { colors, layout, radius, space } from '../theme/tokens';
import { goBack } from '../lib/nav';

export default function AddSound() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const me = useMyProfile();
  const add = useAddTrack();
  const [file, setFile] = useState<LocalFile | null>(null);
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [reading, setReading] = useState(false);
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState<string | null>(null);
  const [genre, setGenre] = useState<GenreSlug | null>(me.data?.genres[0] ?? null);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    setError(null);
    try {
      const f = await pickAudioFile();
      if (!f) return;
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, LIMITS.trackTitle));
      setReading(true);
      setAnalysis(await analyseAudio(f));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setReading(false);
    }
  };

  const submit = () => {
    if (!file) return;
    setError(null);
    add.mutate(
      { file, title: title.trim() || file.name, bpm: parseBpm(bpm), musicalKey: key, genre, durationMs: analysis?.durationMs ?? null, waveform: analysis?.waveform ?? null },
      {
        onSuccess: () => {
          toast(t('addTrack.added'));
          goBack();
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  const seconds = analysis?.durationMs ? Math.round(analysis.durationMs / 1000) : null;

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: Platform.OS === 'ios' ? space.md : insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text variant="heading">{t('addTrack.title')}</Text>
        <IconButton icon={X} label={t('common.close')} onPress={() => goBack()} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <PressableScale onPress={() => void choose()} style={[styles.drop, file && styles.dropFilled]} accessibilityRole="button" testID="add-sound-pick">
          <FileAudio size={22} color={file ? colors.paper : colors.signal} />
          <View style={styles.flex}>
            <Text variant="bodyStrong" tone={file ? 'paper' : 'signal'} numberOfLines={1}>
              {file ? file.name : t('addTrack.pick')}
            </Text>
            <Text variant="caption" tone="mist">
              {file ? (reading ? t('addTrack.reading') : `${formatDuration(analysis?.durationMs)}  ${t('addTrack.change')}`) : t('addTrack.hint')}
            </Text>
          </View>
        </PressableScale>

        {file && !reading ? (
          analysis?.waveform ? (
            <Waveform peaks={analysis.waveform} progress={0} height={44} />
          ) : (
            <Text variant="caption" tone="mist">
              {t('addTrack.noWaveform')}
            </Text>
          )
        ) : null}
        {seconds && seconds > LIMITS.trackMaxSeconds ? (
          <Text variant="caption" tone="clip">
            {t('addTrack.tooLong', { s: seconds })}
          </Text>
        ) : null}

        <Field label={t('addTrack.trackTitle')} value={title} onChangeText={setTitle} max={LIMITS.trackTitle} testID="add-sound-title" />
        <View style={styles.row}>
          <View style={styles.bpm}>
            <Field label={t('addTrack.bpm')} optionalLabel={t('common.optional')} value={bpm} onChangeText={(v) => setBpm(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="92" />
          </View>
        </View>
        <View>
          <SectionTitle
            action={
              <Text variant="caption" tone="mist">
                {t('common.optional')}
              </Text>
            }
          >
            {t('addTrack.key')}
          </SectionTitle>
          <ChipGroup>
            {MUSICAL_KEYS.map((k) => (
              <Chip key={k} label={k} selected={key === k} onPress={() => setKey(key === k ? null : k)} />
            ))}
          </ChipGroup>
        </View>
        {me.data?.genres.length ? (
          <View>
            <SectionTitle>{t('addTrack.genre')}</SectionTitle>
            <ChipGroup>
              {me.data.genres.map((g) => (
                <Chip key={g} label={t(`genres.${g}`)} selected={genre === g} onPress={() => setGenre(genre === g ? null : g)} />
              ))}
            </ChipGroup>
          </View>
        ) : null}
        <Text variant="caption" tone="mist">
          {t('addTrack.rights')}
        </Text>
        {error ? (
          <Text variant="label" tone="clip" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button label={add.isPending ? t('addTrack.uploading') : t('addTrack.upload')} full onPress={submit} loading={add.isPending} disabled={!file || reading} testID="add-sound-submit" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.booth },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.xl, paddingRight: space.sm, height: 56 },
  body: { padding: space.xl, gap: space.xl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  drop: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.tile, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.signalLine },
  dropFilled: { borderStyle: 'solid', borderColor: colors.hairlineStrong, backgroundColor: colors.desk },
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', gap: space.md },
  bpm: { width: 140 },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
});
