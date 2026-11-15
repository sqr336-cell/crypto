import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState, Loading, Screen } from '../../components/ui/Layout';
import { PressableScale } from '../../components/ui/PressableScale';
import { Text } from '../../components/ui/Text';
import { useConversations } from '../../data/queries';
import type { ConversationSummary, Message } from '../../domain/types';
import { useT } from '../../i18n';
import { formatRelative } from '../../lib/format';
import { useSession } from '../../state/session';
import { colors, space } from '../../theme/tokens';

export function messagePreview(m: Message | null, myId: string | undefined, t: ReturnType<typeof useT>): string {
  if (!m) return '';
  const mine = m.senderId && m.senderId === myId ? t('messages.youPrefix') : '';
  switch (m.kind) {
    case 'text':
    case 'link':
      return `${mine}${m.body ?? ''}`;
    case 'audio':
      return `${mine}${t('messages.sentSound')}`;
    case 'track':
      return `${mine}${t('messages.sharedTrack')}${m.track?.title ? `: ${m.track.title}` : ''}`;
    case 'system':
      if (m.system?.event === 'project_started') return t('messages.projectStarted', { title: m.system.title });
      if (m.system?.event === 'project_completed') return t('messages.projectCompleted', { title: m.system.title });
      return t('messages.linked');
  }
}

export default function Messages() {
  const t = useT();
  const q = useConversations();
  const myId = useSession((s) => s.session?.userId);

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Text variant="title" accessibilityRole="header">
          {t('tabs.messages')}
        </Text>
      </View>
      {q.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.signal} />}
          ListEmptyComponent={<EmptyState body={t('messages.empty')} action={{ label: t('tabs.discover'), onPress: () => router.navigate('/discover') }} />}
          renderItem={({ item }) => <Row c={item} myId={myId} />}
        />
      )}
    </Screen>
  );
}

function Row({ c, myId }: { c: ConversationSummary; myId?: string }) {
  const t = useT();
  const unread = c.unreadCount > 0;
  const name = c.other?.displayName ?? '?';
  return (
    <PressableScale
      style={styles.row}
      onPress={() => router.push(`/chat/${c.id}`)}
      pressedScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${name}${unread ? `, ${c.unreadCount} ${t('messages.newMessages')}` : ''}`}
      testID="conversation-row"
    >
      <Avatar source={c.other?.avatar ?? null} name={name} size={52} />
      <View style={styles.text}>
        <View style={styles.top}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {name}
          </Text>
          <Text variant="caption" tone={unread ? 'signal' : 'dim'}>
            {formatRelative(c.lastMessageAt ?? c.createdAt, t.locale)}
          </Text>
        </View>
        <View style={styles.top}>
          <Text variant="label" tone={unread ? 'paper' : 'mist'} numberOfLines={1} style={styles.flex}>
            {c.canPost ? messagePreview(c.lastMessage, myId, t) : t('messages.closed')}
          </Text>
          {unread ? <View style={styles.dot} /> : null}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  titleRow: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.md },
  list: { paddingHorizontal: space.md, paddingBottom: space.xxxl, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: 18 },
  text: { flex: 1, gap: 3 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.signal },
});
