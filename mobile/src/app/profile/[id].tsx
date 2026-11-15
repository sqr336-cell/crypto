import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ban, Bookmark, BookmarkCheck, ChevronLeft, Ellipsis, Flag, MessageCircle, Send } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '../../components/audio/MiniPlayer';
import { ProfileBody } from '../../components/profile/ProfileBody';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { EmptyState, Loading, Screen } from '../../components/ui/Layout';
import { Menu } from '../../components/ui/Menu';
import { confirm } from '../../components/ui/Overlays';
import { backend } from '../../data';
import { keys, useBlock, useMyProfile, useProfileBundle, useSetSaved } from '../../data/queries';
import { useT } from '../../i18n';
import { errorMessage, toast, toastError } from '../../state/toast';
import { useSession } from '../../state/session';
import { space } from '../../theme/tokens';
import { goBack } from '../../lib/nav';

export default function ProfileScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const myId = useSession((s) => s.session?.userId);
  const me = useMyProfile();
  const q = useProfileBundle(id);
  const setSaved = useSetSaved();
  const block = useBlock();
  const [menu, setMenu] = useState(false);
  const [linking, setLinking] = useState(false);

  if (id && id === myId) return <Redirect href="/me" />;
  if (q.isLoading) return <Loading />;
  if (!q.data) {
    return (
      <Screen>
        <View style={styles.headerStatic}>
          <IconButton icon={ChevronLeft} label={t('common.back')} onPress={() => goBack()} />
        </View>
        <EmptyState body={q.error ? errorMessage(q.error) : t('errors.profile_not_found')} />
      </Screen>
    );
  }

  const b = q.data;
  const p = b.profile;

  const link = async () => {
    setLinking(true);
    try {
      const res = await backend.swipe(p.id, 'interest');
      qc.setQueryData(keys.usage, res.usage);
      void q.refetch();
      void qc.invalidateQueries({ queryKey: keys.feedAll });
      if (res.connected) router.push({ pathname: '/linked', params: { id: p.id, name: p.displayName, conversationId: res.conversationId ?? '' } });
      else toast(t('profile.interestSent'));
    } catch (e) {
      toastError(e);
    } finally {
      setLinking(false);
    }
  };

  const doBlock = async () => {
    const ok = await confirm({
      title: t('profile.blockTitle', { name: p.displayName }),
      body: t('profile.blockBody'),
      confirmLabel: t('profile.block'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    block.mutate(p.id, {
      onSuccess: () => {
        toast(t('profile.blocked', { name: p.displayName }));
        goBack();
      },
      onError: toastError,
    });
  };

  let actions;
  if (b.connection) {
    actions = (
      <View style={styles.actions}>
        {b.connection.conversationId ? (
          <Button label={t('profile.message')} icon={MessageCircle} onPress={() => router.push(`/chat/${b.connection!.conversationId}`)} testID="profile-message" />
        ) : null}
        <Button label={t('discover.propose')} icon={Send} variant="secondary" onPress={() => router.push(`/propose/${p.id}`)} />
      </View>
    );
  } else if (b.pendingReceived) {
    actions = (
      <View style={styles.actions}>
        <Button label={t('profile.answerProposal')} onPress={() => router.push({ pathname: '/links', params: { segment: 'requests' } })} />
      </View>
    );
  } else {
    actions = (
      <View style={styles.actions}>
        {b.myDecision === 'interest' ? (
          <Button label={t('profile.interestSent')} variant="secondary" disabled />
        ) : (
          <Button label={t('discover.link')} onPress={() => void link()} loading={linking} testID="profile-link" />
        )}
        {b.pendingSent ? (
          <Button label={t('profile.proposalSent')} variant="ghost" disabled />
        ) : (
          <Button label={t('discover.propose')} icon={Send} variant="secondary" onPress={() => router.push(`/propose/${p.id}`)} testID="profile-propose" />
        )}
      </View>
    );
  }

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileBody
          profile={p}
          tracks={b.tracks}
          links={b.links}
          fit={b.fit}
          mine={me.data}
          actions={actions}
          onOpenFit={() => router.push(`/fit/${p.id}`)}
        />
      </ScrollView>
      <View style={[styles.header, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <IconButton icon={ChevronLeft} label={t('common.back')} variant="filled" onPress={() => goBack()} />
        <View style={styles.headerRight}>
          <IconButton
            icon={b.isSaved ? BookmarkCheck : Bookmark}
            label={b.isSaved ? t('discover.unsave') : t('discover.save')}
            variant="filled"
            active={b.isSaved}
            onPress={() => setSaved.mutate({ id: p.id, saved: !b.isSaved }, { onError: toastError })}
          />
          <IconButton icon={Ellipsis} label={t('common.more')} variant="filled" onPress={() => setMenu(true)} testID="profile-menu" />
        </View>
      </View>
      <View style={{ paddingBottom: insets.bottom }}>
        <MiniPlayer />
      </View>
      <Menu
        visible={menu}
        onClose={() => setMenu(false)}
        cancelLabel={t('common.cancel')}
        actions={[
          { label: t('profile.report'), icon: Flag, onPress: () => router.push({ pathname: '/report', params: { profileId: p.id, name: p.displayName } }), testID: 'menu-report' },
          { label: t('profile.block'), icon: Ban, onPress: () => void doBlock(), destructive: true, testID: 'menu-block' },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxxl },
  header: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  headerStatic: { padding: space.sm },
  headerRight: { flexDirection: 'row', gap: space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
});

