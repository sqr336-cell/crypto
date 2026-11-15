import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import type { MediaSource, Message } from '../../domain/types';
import { hostOf, splitLinks } from '../../domain/links';
import { useT } from '../../i18n';
import { formatDuration, formatTime } from '../../lib/format';
import { useItemPlayback, usePlayer } from '../../state/player';
import { colors, radius, space } from '../../theme/tokens';
import { messageAudioItem, trackItem } from '../audio/playable';
import { PlayButton } from '../audio/PlayButton';
import { Waveform } from '../audio/Waveform';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';

interface Props {
  message: Message;
  mine: boolean;
  senderName: string;
  senderArtwork: MediaSource | null;
  onLongPress?: () => void;
}

export function MessageBubble({ message: m, mine, senderName, senderArtwork, onLongPress }: Props) {
  const t = useT();
  if (m.kind === 'system') {
    const text =
      m.system?.event === 'project_started'
        ? t('messages.projectStarted', { title: m.system.title })
        : m.system?.event === 'project_completed'
          ? t('messages.projectCompleted', { title: m.system.title })
          : t('messages.linked');
    return (
      <View style={styles.system} accessibilityRole="text">
        <View style={styles.systemDot} />
        <Text variant="caption" tone="mist" align="center">
          {text}
        </Text>
      </View>
    );
  }

  return (
    <PressableScale
      onLongPress={onLongPress}
      delayLongPress={350}
      pressedScale={onLongPress ? 0.98 : 1}
      style={[styles.wrap, mine ? styles.mineWrap : styles.theirsWrap]}
      accessibilityHint={onLongPress ? t('messages.report') : undefined}
    >
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs, m.pending && styles.pending]}>
        {m.kind === 'text' ? <RichText text={m.body ?? ''} /> : null}
        {m.kind === 'link' && m.body ? <LinkCard url={m.body} platform={m.linkPlatform ?? null} /> : null}
        {m.kind === 'audio' ? <AudioContent message={m} senderName={senderName} artwork={senderArtwork} /> : null}
        {m.kind === 'track' && m.track ? <TrackContent message={m} senderName={senderName} artwork={senderArtwork} /> : null}
        <Text variant="micro" tone="dim" style={styles.time}>
          {m.pending ? '…' : formatTime(m.createdAt, t.locale)}
        </Text>
      </View>
    </PressableScale>
  );
}

function RichText({ text }: { text: string }) {
  return (
    <Text variant="body">
      {splitLinks(text).map((part, i) =>
        part.url ? (
          <Text key={i} variant="body" tone="signal" onPress={() => void WebBrowser.openBrowserAsync(part.url!)} accessibilityRole="link">
            {part.text}
          </Text>
        ) : (
          <Text key={i} variant="body">
            {part.text}
          </Text>
        ),
      )}
    </Text>
  );
}

function LinkCard({ url, platform }: { url: string; platform: string | null }) {
  const t = useT();
  return (
    <PressableScale style={styles.link} onPress={() => void WebBrowser.openBrowserAsync(url)} accessibilityRole="link" accessibilityLabel={url}>
      <View style={styles.flex}>
        <Text variant="labelStrong">{platform ? t(`platforms.${platform}`) : hostOf(url)}</Text>
        <Text variant="caption" tone="mist" numberOfLines={1}>
          {url.replace(/^https?:\/\//, '')}
        </Text>
      </View>
      <ExternalLink size={16} color={colors.mist} />
    </PressableScale>
  );
}

function Player({ itemKey, onToggle, title, peaks, durationMs }: { itemKey: string; onToggle: () => void; title: string; peaks: number[] | null; durationMs: number | null }) {
  const p = useItemPlayback(itemKey);
  const seekTo = usePlayer((s) => s.seekTo);
  const pos = usePlayer((s) => (s.current?.key === itemKey ? s.positionMs : 0));
  return (
    <View style={styles.player}>
      <PlayButton playing={p.playing} loading={p.loading} onPress={onToggle} size={38} />
      <View style={styles.flex}>
        <Text variant="caption" tone="paper" numberOfLines={1}>
          {title}
        </Text>
        <Waveform
          peaks={peaks}
          progress={p.progress}
          active={p.isCurrent}
          height={26}
          barWidth={2}
          onSeek={(f) => (p.isCurrent ? seekTo(f) : onToggle())}
          accessibilityLabel={title}
        />
      </View>
      <Text variant="micro" tone="mist" tabular>
        {formatDuration(p.isCurrent ? pos : durationMs)}
      </Text>
    </View>
  );
}

function AudioContent({ message, senderName, artwork }: { message: Message; senderName: string; artwork: MediaSource | null }) {
  const t = useT();
  const item = messageAudioItem(message, senderName, artwork);
  const toggle = usePlayer((s) => s.toggle);
  if (message.pending) {
    return (
      <Text variant="caption" tone="mist">
        {t('messages.uploading')}
      </Text>
    );
  }
  return <Player itemKey={item.key} onToggle={() => void toggle(item)} title={item.title} peaks={message.audio?.waveform ?? null} durationMs={message.audio?.durationMs ?? null} />;
}

function TrackContent({ message, senderName, artwork }: { message: Message; senderName: string; artwork: MediaSource | null }) {
  const tr = message.track!;
  const item = trackItem({ id: tr.trackId, title: tr.title, durationMs: tr.durationMs, waveform: tr.waveform, storagePath: tr.storagePath }, { id: message.senderId ?? undefined, displayName: senderName, artwork }, 'message');
  const toggle = usePlayer((s) => s.toggle);
  return <Player itemKey={item.key} onToggle={() => void toggle(item)} title={tr.title} peaks={tr.waveform} durationMs={tr.durationMs} />;
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '84%', marginVertical: 2 },
  mineWrap: { alignSelf: 'flex-end' },
  theirsWrap: { alignSelf: 'flex-start' },
  bubble: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: 6, borderRadius: 20, gap: 4, minWidth: 64 },
  mine: { backgroundColor: colors.rack, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.desk, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.hairline },
  pending: { opacity: 0.6 },
  time: { alignSelf: 'flex-end' },
  system: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: space.sm, paddingVertical: space.md, paddingHorizontal: space.xl },
  systemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.signal },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.input, backgroundColor: colors.booth, minWidth: 220 },
  flex: { flex: 1, gap: 2 },
  player: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 240, paddingVertical: 2 },
});
