import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bookmark, BookmarkCheck, Send, SlidersHorizontal, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { trackItem } from '../../components/audio/playable';
import { DiscoverCard, type DiscoverCardHandle } from '../../components/profile/DiscoverCard';
import { IconButton } from '../../components/ui/IconButton';
import { EmptyState, Screen, Skeleton } from '../../components/ui/Layout';
import { PressableScale } from '../../components/ui/PressableScale';
import { Text } from '../../components/ui/Text';
import { Wordmark } from '../../components/ui/Wordmark';
import { backend } from '../../data';
import { keys, useFeed, useUsage } from '../../data/queries';
import { useT } from '../../i18n';
import { activeFilterCount, useFilters } from '../../state/filters';
import { usePlayer } from '../../state/player';
import { toast, toastError } from '../../state/toast';
import { colors, radius, space } from '../../theme/tokens';

export default function Discover() {
  const t = useT();
  const qc = useQueryClient();
  const filters = useFilters((s) => s.filters);
  const clearFilters = useFilters((s) => s.clear);
  const feed = useFeed(filters);
  const usage = useUsage();
  const card = useRef<DiscoverCardHandle>(null);
  const [decided, setDecided] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [stageHeight, setStageHeight] = useState(0);
  const density = stageHeight === 0 || stageHeight >= 560 ? 'regular' : stageHeight >= 470 ? 'compact' : 'tight';

  const deck = useMemo(() => (feed.data ?? []).filter((c) => !decided.has(c.profile.id)), [feed.data, decided]);
  const current = deck[0] ?? null;
  const isSaved = current ? (saved[current.profile.id] ?? current.isSaved) : false;

  // Fetch more before the deck runs out.
  useEffect(() => {
    if (feed.data && deck.length <= 2 && feed.data.length > 0 && !feed.isFetching) void feed.refetch();
  }, [deck.length, feed]);

  // Continuous listening: if a Discover sound was playing, the next card starts playing too.
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (!current || lastId.current === current.profile.id) return;
    const previous = lastId.current;
    lastId.current = current.profile.id;
    const p = usePlayer.getState();
    if (previous && p.playing && p.current?.context === 'discover' && current.tracks[0]) {
      const pr = current.profile;
      void p.play(trackItem(current.tracks[0], { id: pr.id, displayName: pr.displayName, artwork: pr.avatar ?? pr.banner }, 'discover'));
    }
  }, [current]);

  const decide = async (decision: 'pass' | 'interest') => {
    if (!current) return;
    const id = current.profile.id;
    const name = current.profile.displayName;
    setDecided((s) => new Set(s).add(id));
    try {
      const res = await backend.swipe(id, decision);
      qc.setQueryData(keys.usage, res.usage);
      if (res.connected) {
        void qc.invalidateQueries({ queryKey: keys.connections });
        void qc.invalidateQueries({ queryKey: keys.conversations });
        router.push({ pathname: '/linked', params: { id, name, conversationId: res.conversationId ?? '' } });
      }
    } catch (e) {
      setDecided((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      toastError(e);
    }
  };

  const toggleSave = async () => {
    if (!current) return;
    const id = current.profile.id;
    const next = !isSaved;
    setSaved((s) => ({ ...s, [id]: next }));
    try {
      await backend.setSaved(id, next);
      void qc.invalidateQueries({ queryKey: keys.favorites });
      toast(next ? t('discover.saved') : t('discover.unsave'));
    } catch (e) {
      setSaved((s) => ({ ...s, [id]: !next }));
      toastError(e);
    }
  };

  const filterCount = activeFilterCount(filters);
  const linksLeft = usage.data?.interestsLimit != null ? usage.data.interestsLimit - usage.data.interestsUsed : null;

  return (
    <Screen>
      <View style={styles.header}>
        <Wordmark size={22} />
        <View style={styles.headerRight}>
          <IconButton icon={Bookmark} label={t('discover.saved')} onPress={() => router.push({ pathname: '/links', params: { segment: 'saved' } })} testID="discover-saved" />
          <View>
            <IconButton icon={SlidersHorizontal} label={t('discover.filters')} onPress={() => router.push('/filters')} active={filterCount > 0} testID="discover-filters" />
            {filterCount > 0 ? <View style={styles.filterDot} /> : null}
          </View>
        </View>
      </View>

      <View style={styles.stage} onLayout={(e) => setStageHeight(e.nativeEvent.layout.height)}>
        {feed.isLoading ? (
          <View style={styles.skeleton}>
            <Skeleton height={0} style={styles.flex} rounded={radius.card} />
          </View>
        ) : current ? (
          <DiscoverCard
            key={current.profile.id}
            ref={card}
            candidate={current}
            density={density}
            onDecide={(d) => void decide(d)}
            onOpenFit={() => router.push(`/fit/${current.profile.id}`)}
          />
        ) : (
          <Animated.View entering={FadeIn} style={[styles.flex, styles.center]}>
            <EmptyState
              title={t('discover.emptyTitle')}
              body={t('discover.emptyBody')}
              action={filterCount ? { label: t('discover.clearFilters'), onPress: clearFilters } : { label: t('common.retry'), onPress: () => void feed.refetch() }}
            />
          </Animated.View>
        )}
      </View>

      {current ? (
        <View style={styles.actions}>
          <IconButton icon={X} label={t('discover.pass')} variant="outline" size={56} iconSize={24} onPress={() => card.current?.fling('left')} testID="discover-pass" />
          <IconButton
            icon={isSaved ? BookmarkCheck : Bookmark}
            label={isSaved ? t('discover.unsave') : t('discover.save')}
            variant="outline"
            active={isSaved}
            size={48}
            onPress={() => void toggleSave()}
            testID="discover-save"
          />
          <IconButton icon={Send} label={t('discover.propose')} variant="outline" size={48} onPress={() => router.push(`/propose/${current.profile.id}`)} testID="discover-propose" />
          <PressableScale
            style={styles.link}
            onPress={() => card.current?.fling('right')}
            haptic="medium"
            accessibilityRole="button"
            accessibilityLabel={t('discover.link')}
            testID="discover-link"
          >
            <View style={styles.linkDot} />
            <Text variant="bodyStrong" tone="ink">
              {t('discover.link')}
            </Text>
          </PressableScale>
        </View>
      ) : null}
      {current && linksLeft != null && linksLeft <= 10 ? (
        <Text variant="caption" tone="dim" align="center" style={styles.left}>
          {t('discover.linksLeft', { n: Math.max(0, linksLeft) })}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.xl, paddingRight: space.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  filterDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.signal },
  stage: { flex: 1, paddingHorizontal: space.md },
  flex: { flex: 1 },
  center: { justifyContent: 'center' },
  skeleton: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, paddingVertical: space.md },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 56,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.signal,
  },
  linkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.signalInk },
  left: { marginTop: -space.sm, marginBottom: space.xs },
});
