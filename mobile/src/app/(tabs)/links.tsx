import { router, useLocalSearchParams } from 'expo-router';
import { MessageCircle, Unlink } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { PlayButton } from '../../components/audio/PlayButton';
import { trackItem } from '../../components/audio/playable';
import { Waveform } from '../../components/audio/Waveform';
import { FitTier } from '../../components/profile/Fit';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { EmptyState, Loading, Screen } from '../../components/ui/Layout';
import { confirm } from '../../components/ui/Overlays';
import { PressableScale } from '../../components/ui/PressableScale';
import { Segmented } from '../../components/ui/Segmented';
import { Text } from '../../components/ui/Text';
import {
  useCollaborations,
  useConnections,
  useFavorites,
  useRemoveConnection,
  useRequests,
  useRespondRequest,
  useSetCollaborationStatus,
  useWithdrawRequest,
} from '../../data/queries';
import type { CollabRequest, ProfileMini } from '../../domain/types';
import { useT } from '../../i18n';
import { formatDate, formatRelative } from '../../lib/format';
import { useItemPlayback, usePlayer } from '../../state/player';
import { toast, toastError } from '../../state/toast';
import { colors, radius, space } from '../../theme/tokens';

type Seg = 'connections' | 'requests' | 'projects' | 'saved';

export default function Links() {
  const t = useT();
  const params = useLocalSearchParams<{ segment?: Seg }>();
  const [seg, setSeg] = useState<Seg>(params.segment ?? 'connections');
  const received = useRequests('received');

  useEffect(() => {
    if (params.segment) setSeg(params.segment);
  }, [params.segment]);

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Text variant="title" accessibilityRole="header">
          {t('tabs.links')}
        </Text>
      </View>
      <Segmented<Seg>
        value={seg}
        onChange={setSeg}
        segments={[
          { key: 'connections', label: t('links.segments.connections') },
          { key: 'requests', label: t('links.segments.requests'), count: received.data?.length, attention: !!received.data?.length },
          { key: 'projects', label: t('links.segments.projects') },
          { key: 'saved', label: t('links.segments.saved') },
        ]}
      />
      <View style={styles.body}>
        {seg === 'connections' ? <Connections /> : null}
        {seg === 'requests' ? <Requests /> : null}
        {seg === 'projects' ? <Projects /> : null}
        {seg === 'saved' ? <Saved /> : null}
      </View>
    </Screen>
  );
}

function PersonRow({ person, subtitle, right, onPress }: { person: ProfileMini; subtitle?: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <PressableScale style={styles.row} onPress={onPress ?? (() => router.push(`/profile/${person.id}`))} pressedScale={0.98} accessibilityRole="button" accessibilityLabel={person.displayName}>
      <Avatar source={person.avatar} name={person.displayName} size={48} />
      <View style={styles.rowText}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {person.displayName}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="mist" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </PressableScale>
  );
}

function Connections() {
  const t = useT();
  const q = useConnections();
  const remove = useRemoveConnection();
  if (q.isLoading) return <Loading />;
  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.signal} />}
      ListEmptyComponent={<EmptyState body={t('links.emptyConnections')} action={{ label: t('tabs.discover'), onPress: () => router.navigate('/discover') }} />}
      renderItem={({ item: c }) => (
        <PersonRow
          person={c.other}
          subtitle={`${c.other.roles.map((r) => t(`roles.${r}`)).join(', ')}  ${t('links.linkedOn', { date: formatDate(c.createdAt, t.locale) })}${c.origin === 'collab_request' ? ` ${t('links.viaProposal')}` : ''}`}
          right={
            <View style={styles.rowActions}>
              {c.conversationId ? (
                <IconButton icon={MessageCircle} label={t('links.openChat')} variant="filled" size={40} onPress={() => router.push(`/chat/${c.conversationId}`)} />
              ) : null}
              <IconButton
                icon={Unlink}
                label={t('links.unlink')}
                size={40}
                color={colors.mist}
                onPress={async () => {
                  const ok = await confirm({
                    title: t('links.unlinkTitle', { name: c.other.displayName }),
                    body: t('links.unlinkBody'),
                    confirmLabel: t('links.unlink'),
                    cancelLabel: t('common.cancel'),
                    destructive: true,
                  });
                  if (ok) remove.mutate(c.id, { onError: toastError });
                }}
              />
            </View>
          }
        />
      )}
    />
  );
}

function RequestTrack({ request }: { request: CollabRequest }) {
  const tr = request.track!;
  const owner = request.direction === 'received' ? request.other : null;
  const item = trackItem(tr, { id: owner?.id, displayName: owner?.displayName ?? '', artwork: owner?.avatar ?? null }, 'request');
  const p = useItemPlayback(item.key);
  const toggle = usePlayer((s) => s.toggle);
  return (
    <View style={styles.reqTrack}>
      <PlayButton playing={p.playing} loading={p.loading} onPress={() => void toggle(item)} size={36} tone="rack" />
      <View style={styles.flex}>
        <Text variant="caption" tone="mist" numberOfLines={1}>
          {tr.title}
        </Text>
        <Waveform peaks={tr.waveform} progress={p.progress} active={p.isCurrent} height={22} barWidth={2} />
      </View>
    </View>
  );
}

function Requests() {
  const t = useT();
  const [box, setBox] = useState<'received' | 'sent'>('received');
  const q = useRequests(box);
  const respond = useRespondRequest();
  const withdraw = useWithdrawRequest();
  return (
    <View style={styles.flex}>
      <View style={styles.subTabs}>
        {(['received', 'sent'] as const).map((b) => (
          <PressableScale key={b} onPress={() => setBox(b)} accessibilityRole="tab" accessibilityState={{ selected: box === b }} style={[styles.subTab, box === b && styles.subTabOn]} testID={`requests-${b}`}>
            <Text variant="label" tone={box === b ? 'paper' : 'mist'}>
              {t(`links.${b}`)}
            </Text>
          </PressableScale>
        ))}
      </View>
      {q.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.signal} />}
          ListEmptyComponent={<EmptyState body={box === 'received' ? t('links.emptyReceived') : t('links.emptySent')} />}
          renderItem={({ item: r }) => (
            <View style={styles.card} testID="request-card">
              <PersonRow person={r.other} subtitle={formatRelative(r.createdAt, t.locale)} />
              {r.projectTitle ? <Text variant="heading">{r.projectTitle}</Text> : null}
              <Text variant="body">{r.message}</Text>
              {r.track ? <RequestTrack request={r} /> : null}
              {box === 'received' ? (
                <View style={styles.cardActions}>
                  <Button
                    label={t('links.decline')}
                    variant="ghost"
                    size="sm"
                    onPress={() => respond.mutate({ id: r.id, accept: false }, { onError: toastError })}
                  />
                  <Button
                    label={t('links.accept')}
                    size="sm"
                    testID="request-accept"
                    loading={respond.isPending && respond.variables?.id === r.id}
                    onPress={() =>
                      respond.mutate(
                        { id: r.id, accept: true },
                        {
                          onSuccess: (res) => {
                            toast(t('links.accepted'));
                            if (res.conversationId) router.push(`/chat/${res.conversationId}`);
                          },
                          onError: toastError,
                        },
                      )
                    }
                  />
                </View>
              ) : (
                <View style={styles.cardActions}>
                  <Text variant="caption" tone={r.status === 'declined' ? 'clip' : 'mist'} style={styles.flex}>
                    {r.status === 'declined' ? t('links.declined') : t('links.waiting')}
                  </Text>
                  {r.status === 'pending' ? (
                    <Button label={t('links.withdraw')} variant="ghost" size="sm" onPress={() => withdraw.mutate(r.id, { onError: toastError })} />
                  ) : null}
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

function Projects() {
  const t = useT();
  const q = useCollaborations();
  const setStatus = useSetCollaborationStatus();
  if (q.isLoading) return <Loading />;
  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.signal} />}
      ListEmptyComponent={<EmptyState body={t('links.emptyProjects')} />}
      renderItem={({ item: c }) => (
        <View style={styles.card}>
          <View style={styles.projectHead}>
            <View style={[styles.status, c.status === 'active' && styles.statusOn]} />
            <Text variant="caption" tone={c.status === 'active' ? 'signal' : 'mist'}>
              {c.status === 'active' ? t('links.projectActive') : t('links.projectCompleted')}
            </Text>
          </View>
          <Text variant="heading">{c.title}</Text>
          <View style={styles.members}>
            {c.members.map((m) => (
              <Avatar key={m.id} source={m.avatar} name={m.displayName} size={28} />
            ))}
            <Text variant="caption" tone="mist" style={styles.flex}>
              {t('links.with', { names: c.members.map((m) => m.displayName).join(', ') })}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <Button
              label={c.status === 'active' ? t('links.markDone') : t('links.reopen')}
              variant="ghost"
              size="sm"
              onPress={() => setStatus.mutate({ id: c.id, status: c.status === 'active' ? 'completed' : 'active' }, { onError: toastError })}
            />
            {c.conversationId ? <Button label={t('links.openChat')} variant="secondary" size="sm" onPress={() => router.push(`/chat/${c.conversationId}`)} /> : null}
          </View>
        </View>
      )}
    />
  );
}

function Saved() {
  const t = useT();
  const q = useFavorites();
  if (q.isLoading) return <Loading />;
  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(f) => f.profile.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.signal} />}
      ListEmptyComponent={<EmptyState body={t('links.emptySaved')} />}
      renderItem={({ item: f }) => (
        <PersonRow
          person={f.profile}
          subtitle={f.profile.roles.map((r) => t(`roles.${r}`)).join(', ')}
          right={f.fit ? <FitTier fit={f.fit} /> : undefined}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  titleRow: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.lg },
  body: { flex: 1, paddingTop: space.md },
  flex: { flex: 1 },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.sm, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  rowText: { flex: 1, gap: 2 },
  rowActions: { flexDirection: 'row', gap: space.xs },
  card: { padding: space.lg, gap: space.md, borderRadius: radius.tile, backgroundColor: colors.desk },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.sm },
  subTabs: { flexDirection: 'row', gap: space.xs, paddingHorizontal: space.lg, paddingBottom: space.md },
  subTab: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.hairlineStrong },
  subTabOn: { borderColor: colors.faderHigh, backgroundColor: colors.rack },
  reqTrack: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.input, backgroundColor: colors.booth },
  projectHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  status: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.faderHigh },
  statusOn: { backgroundColor: colors.signal },
  members: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
