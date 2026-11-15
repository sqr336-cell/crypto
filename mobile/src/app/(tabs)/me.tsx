import { router } from 'expo-router';
import { Pencil, Plus, Settings } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileBody } from '../../components/profile/ProfileBody';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Loading, Screen } from '../../components/ui/Layout';
import { confirm } from '../../components/ui/Overlays';
import { PressableScale } from '../../components/ui/PressableScale';
import { Text } from '../../components/ui/Text';
import { useDeleteTrack, useMyLinks, useMyProfile, useMyTracks, useUsage } from '../../data/queries';
import { useT } from '../../i18n';
import { toast, toastError } from '../../state/toast';
import { colors, radius, space } from '../../theme/tokens';

export default function Me() {
  const t = useT();
  const me = useMyProfile();
  const tracks = useMyTracks();
  const links = useMyLinks();
  const usage = useUsage();
  const del = useDeleteTrack();
  const insets = useSafeAreaInsets();
  if (!me.data) return <Loading />;
  const p = me.data;
  const count = tracks.data?.length ?? 0;
  const limit = usage.data?.tracksLimit ?? 3;

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileBody
          profile={p}
          tracks={tracks.data ?? []}
          links={links.data ?? []}
          actions={
            <View style={styles.actions}>
              <Button label={t('profile.edit')} icon={Pencil} variant="secondary" size="sm" onPress={() => router.push('/edit-profile')} testID="me-edit" />
              {!p.isDiscoverable ? (
                <Text variant="caption" tone="mist" style={styles.flex}>
                  {t('profile.paused')}
                </Text>
              ) : null}
            </View>
          }
          soundsAction={
            <Text variant="caption" tone="dim" tabular>
              {t('profile.soundsCount', { used: count, limit })}
            </Text>
          }
          soundsFooter={
            count < limit ? (
              <View style={styles.addWrap}>
                {count === 0 ? (
                  <Text variant="label" tone="mist">
                    {t('profile.incomplete')}
                  </Text>
                ) : null}
                <PressableScale onPress={() => router.push('/add-sound')} style={styles.add} accessibilityRole="button" testID="me-add-sound">
                  <Plus size={18} color={colors.signal} />
                  <Text variant="labelStrong" tone="signal">
                    {t('profile.addSound')}
                  </Text>
                </PressableScale>
              </View>
            ) : null
          }
          onDeleteTrack={async (track) => {
            const ok = await confirm({
              title: t('profile.removeTrackTitle', { title: track.title }),
              body: t('profile.removeTrackBody'),
              confirmLabel: t('common.remove'),
              cancelLabel: t('common.cancel'),
              destructive: true,
            });
            if (ok) del.mutate(track.id, { onSuccess: () => toast(t('profile.removeTrack')), onError: toastError });
          }}
        />
      </ScrollView>
      <View style={[styles.topBar, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <IconButton icon={Settings} label={t('profile.settings')} variant="filled" onPress={() => router.push('/settings')} testID="me-settings" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxxl },
  topBar: { position: 'absolute', right: space.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  flex: { flex: 1 },
  addWrap: { gap: space.md },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: 56,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.signalLine,
  },
});
