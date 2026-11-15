import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUp, Ban, ChevronLeft, Ellipsis, Flag, FolderPlus, Paperclip } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { IconButton } from '../../components/ui/IconButton';
import { Loading } from '../../components/ui/Layout';
import { Menu } from '../../components/ui/Menu';
import { confirm } from '../../components/ui/Overlays';
import { PressableScale } from '../../components/ui/PressableScale';
import { Text } from '../../components/ui/Text';
import { backend } from '../../data';
import { keys, useBlock, useConversations, useMessages, useMyProfile, useStartCollaboration } from '../../data/queries';
import { LIMITS } from '../../domain/taxonomy';
import type { Message } from '../../domain/types';
import { useT } from '../../i18n';
import { analyseAudio, pickAudioFile } from '../../lib/files';
import { formatDayLabel } from '../../lib/format';
import { useSession } from '../../state/session';
import { toast, toastError } from '../../state/toast';
import { colors, fonts, layout, radius, space } from '../../theme/tokens';
import { goBack } from '../../lib/nav';

type Row = { type: 'message'; message: Message } | { type: 'day'; label: string; key: string };

export default function Chat() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const myId = useSession((s) => s.session?.userId);
  const me = useMyProfile();
  const conversations = useConversations();
  const messages = useMessages(id);
  const block = useBlock();
  const startProject = useStartCollaboration();
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  const conv = conversations.data?.find((c) => c.id === id) ?? null;
  const other = conv?.other ?? null;

  // Mark as read on open and whenever new messages arrive while the thread is visible.
  const count = messages.data?.length ?? 0;
  useEffect(() => {
    if (!id || !count) return;
    void backend.markRead(id).then(() => {
      qc.setQueryData(keys.conversations, (prev: typeof conversations.data) => prev?.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    });
  }, [id, count, qc]);

  useEffect(() => {
    if (conversations.isFetched && !conv) void conversations.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.isFetched, conv]);

  const rows = useMemo<Row[]>(() => {
    const list = messages.data ?? [];
    const out: Row[] = [];
    let lastDay = '';
    for (const m of list) {
      const day = m.createdAt.slice(0, 10);
      if (day !== lastDay) {
        out.push({ type: 'day', label: formatDayLabel(m.createdAt, t.locale), key: `day-${day}` });
        lastDay = day;
      }
      out.push({ type: 'message', message: m });
    }
    return out.reverse();
  }, [messages.data, t.locale]);

  const appendLocal = (m: Message, replaceId?: string) =>
    qc.setQueryData<Message[]>(keys.messages(id), (prev) => {
      const base = (prev ?? []).filter((x) => x.id !== replaceId && x.id !== m.id);
      return [...base, m];
    });

  const send = async () => {
    const body = text.trim();
    if (!body || !id) return;
    setText('');
    const tempId = `pending-${Date.now()}`;
    appendLocal({ id: tempId, conversationId: id, senderId: myId ?? null, kind: 'text', body, attachmentPath: null, createdAt: new Date().toISOString(), pending: true });
    try {
      const sent = await backend.sendText(id, body);
      appendLocal(sent, tempId);
      void qc.invalidateQueries({ queryKey: keys.conversations });
    } catch (e) {
      qc.setQueryData<Message[]>(keys.messages(id), (prev) => (prev ?? []).filter((x) => x.id !== tempId));
      setText(body);
      toastError(e);
    }
  };

  const sendSound = async () => {
    if (!id) return;
    try {
      const file = await pickAudioFile(LIMITS.messageAudioMaxBytes);
      if (!file) return;
      setUploading(true);
      const tempId = `pending-${Date.now()}`;
      appendLocal({ id: tempId, conversationId: id, senderId: myId ?? null, kind: 'audio', body: null, attachmentPath: 'pending', createdAt: new Date().toISOString(), pending: true });
      try {
        const analysis = await analyseAudio(file);
        const sent = await backend.sendAudio(id, file, analysis);
        appendLocal(sent, tempId);
        void qc.invalidateQueries({ queryKey: keys.conversations });
      } catch (e) {
        qc.setQueryData<Message[]>(keys.messages(id), (prev) => (prev ?? []).filter((x) => x.id !== tempId));
        throw e;
      }
    } catch (e) {
      toastError(e);
    } finally {
      setUploading(false);
    }
  };

  const doBlock = async () => {
    if (!other) return;
    const ok = await confirm({
      title: t('profile.blockTitle', { name: other.displayName }),
      body: t('profile.blockBody'),
      confirmLabel: t('profile.block'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok)
      block.mutate(other.id, {
        onSuccess: () => {
          toast(t('profile.blocked', { name: other.displayName }));
          goBack('/messages');
        },
        onError: toastError,
      });
  };

  const nameOf = (m: Message) => (m.senderId === myId ? me.data?.displayName ?? '' : other?.displayName ?? '');
  const artOf = (m: Message) => (m.senderId === myId ? me.data?.avatar ?? null : other?.avatar ?? null);
  const canPost = conv?.canPost ?? true;

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} label={t('common.back')} onPress={() => goBack('/messages')} iconSize={24} />
        <PressableScale style={styles.who} onPress={() => other && router.push(`/profile/${other.id}`)} accessibilityRole="button" pressedScale={0.98}>
          <Avatar source={other?.avatar ?? null} name={other?.displayName ?? '?'} size={36} />
          <View style={styles.flex}>
            <Text style={styles.whoName} numberOfLines={1}>
              {other?.displayName ?? ''}
            </Text>
            {other?.roles.length ? (
              <Text variant="caption" tone="mist" numberOfLines={1}>
                {other.roles.map((r) => t(`roles.${r}`)).join(', ')}
              </Text>
            ) : null}
          </View>
        </PressableScale>
        <IconButton icon={Ellipsis} label={t('common.more')} onPress={() => setMenu(true)} testID="chat-menu" />
      </View>

      {messages.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          inverted
          data={rows}
          keyExtractor={(r) => (r.type === 'day' ? r.key : r.message.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) =>
            item.type === 'day' ? (
              <Text variant="micro" tone="dim" align="center" style={styles.day}>
                {item.label}
              </Text>
            ) : (
              <MessageBubble
                message={item.message}
                mine={item.message.senderId === myId}
                senderName={nameOf(item.message)}
                senderArtwork={artOf(item.message)}
                onLongPress={
                  item.message.senderId && item.message.senderId !== myId && !item.message.pending
                    ? () => router.push({ pathname: '/report', params: { messageId: item.message.id, profileId: item.message.senderId ?? '', name: other?.displayName ?? '' } })
                    : undefined
                }
              />
            )
          }
        />
      )}

      {canPost ? (
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          <IconButton icon={Paperclip} label={t('messages.attachSound')} onPress={() => void sendSound()} disabled={uploading} variant="filled" size={42} testID="chat-attach" />
          <View style={styles.inputBox}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('messages.placeholder')}
              placeholderTextColor={colors.dim}
              selectionColor={colors.signal}
              multiline
              maxLength={LIMITS.messageBody}
              style={styles.input}
              accessibilityLabel={t('messages.placeholder')}
              onKeyPress={(e) => {
                const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) {
                  (e as unknown as { preventDefault: () => void }).preventDefault();
                  void send();
                }
              }}
              testID="chat-input"
            />
          </View>
          <IconButton icon={ArrowUp} label={t('common.send')} variant="signal" size={42} onPress={() => void send()} disabled={!text.trim()} testID="chat-send" />
        </View>
      ) : (
        <View style={[styles.closed, { paddingBottom: insets.bottom + space.lg }]}>
          <Text variant="label" tone="mist" align="center">
            {t('messages.closed')}
          </Text>
        </View>
      )}

      <Menu
        visible={menu}
        onClose={() => setMenu(false)}
        cancelLabel={t('common.cancel')}
        actions={[
          ...(canPost ? [{ label: t('messages.startProject'), icon: FolderPlus, onPress: () => setProjectOpen(true), testID: 'chat-start-project' }] : []),
          ...(other
            ? [
                { label: t('profile.report'), icon: Flag, onPress: () => router.push({ pathname: '/report', params: { profileId: other.id, name: other.displayName } }) },
                { label: t('profile.block'), icon: Ban, onPress: () => void doBlock(), destructive: true },
              ]
            : []),
        ]}
      />

      {projectOpen ? (
        <View style={styles.projectLayer}>
          <View style={styles.projectSheet}>
            <Text variant="heading">{t('messages.projectPrompt')}</Text>
            <Field value={projectTitle} onChangeText={setProjectTitle} placeholder={t('request.projectTitlePh')} max={LIMITS.projectTitle} autoFocus testID="project-title" />
            <View style={styles.projectActions}>
              <Button label={t('common.cancel')} variant="ghost" onPress={() => setProjectOpen(false)} />
              <Button
                label={t('messages.startProject')}
                loading={startProject.isPending}
                disabled={!projectTitle.trim()}
                onPress={() =>
                  startProject.mutate(
                    { conversationId: id, title: projectTitle },
                    {
                      onSuccess: () => {
                        setProjectOpen(false);
                        setProjectTitle('');
                        toast(t('messages.projectCreated'));
                      },
                      onError: toastError,
                    },
                  )
                }
                testID="project-create"
              />
            </View>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.booth },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  whoName: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.paper },
  flex: { flex: 1 },
  list: { paddingHorizontal: space.md, paddingVertical: space.md, width: '100%', maxWidth: layout.maxContentWidth + 80, alignSelf: 'center' },
  day: { paddingVertical: space.md },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  inputBox: { flex: 1, minHeight: 42, maxHeight: 140, justifyContent: 'center', borderRadius: radius.tile, backgroundColor: colors.rack, paddingHorizontal: space.lg },
  input: { color: colors.paper, fontFamily: fonts.ui, fontSize: 16, paddingVertical: 10, outlineStyle: 'none' } as object,
  closed: { paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  projectLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay, justifyContent: 'center', padding: space.xl },
  projectSheet: { gap: space.lg, padding: space.xl, borderRadius: radius.card, backgroundColor: colors.desk, width: '100%', maxWidth: 420, alignSelf: 'center' },
  projectActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
});
