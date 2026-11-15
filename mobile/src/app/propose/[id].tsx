import { useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Chip, ChipGroup } from '../../components/ui/Chip';
import { Field } from '../../components/ui/Field';
import { IconButton } from '../../components/ui/IconButton';
import { Loading, SectionTitle } from '../../components/ui/Layout';
import { Text } from '../../components/ui/Text';
import { useMyTracks, useProfileBundle, useSendRequest } from '../../data/queries';
import { LIMITS } from '../../domain/taxonomy';
import { useT } from '../../i18n';
import { errorMessage, toast } from '../../state/toast';
import { colors, layout, space } from '../../theme/tokens';
import { goBack } from '../../lib/nav';

/** Collaboration request: a message, an optional project title and one of your sounds. */
export default function Propose() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const target = useProfileBundle(id);
  const tracks = useMyTracks();
  const send = useSendRequest();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [trackId, setTrackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (target.isLoading) return <Loading />;
  const p = target.data?.profile;

  const submit = () => {
    setError(null);
    if (!message.trim()) return setError(t('request.messagePh'));
    send.mutate(
      { targetId: id, message: message.trim(), projectTitle: title.trim() || null, trackId },
      {
        onSuccess: (res) => {
          toast(res.connected ? t('request.sentLinked') : t('request.sent'));
          goBack();
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: Platform.OS === 'ios' ? space.md : insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text variant="heading">{t('request.title')}</Text>
        <IconButton icon={X} label={t('common.close')} onPress={() => goBack()} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {p ? (
          <View style={styles.to}>
            <Avatar source={p.avatar} name={p.displayName} size={40} />
            <Text variant="bodyStrong">{t('request.to', { name: p.displayName })}</Text>
          </View>
        ) : null}
        <Field label={t('request.projectTitle')} optionalLabel={t('common.optional')} placeholder={t('request.projectTitlePh')} value={title} onChangeText={setTitle} max={LIMITS.projectTitle} testID="propose-title" />
        <Field
          label={t('request.message')}
          placeholder={t('request.messagePh')}
          value={message}
          onChangeText={setMessage}
          multiline
          max={LIMITS.requestMessage}
          testID="propose-message"
        />
        <View>
          <SectionTitle>{t('request.attach')}</SectionTitle>
          {tracks.data?.length ? (
            <ChipGroup>
              <Chip label={t('request.none')} selected={trackId === null} onPress={() => setTrackId(null)} />
              {tracks.data.map((tr) => (
                <Chip key={tr.id} label={tr.title} selected={trackId === tr.id} onPress={() => setTrackId(tr.id)} />
              ))}
            </ChipGroup>
          ) : (
            <Text variant="caption" tone="mist">
              {t('request.noTracks')}
            </Text>
          )}
        </View>
        {error ? (
          <Text variant="label" tone="clip" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button label={t('request.send')} full onPress={submit} loading={send.isPending} disabled={!message.trim()} testID="propose-send" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.booth },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.xl, paddingRight: space.sm, height: 56 },
  body: { padding: space.xl, gap: space.xl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  to: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
});
