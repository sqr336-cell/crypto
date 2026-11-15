/**
 * TanStack Query hooks over the backend. Query keys are centralised so
 * mutations can invalidate exactly what they change.
 */
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { backend } from './index';
import type { SaveProfileInput, SendRequestInput } from './backend';
import type { CollaborationStatus, DiscoverFilters, LocalFile, Message, NewTrackInput, ReportInput } from '../domain/types';
import type { LinkPlatform } from '../domain/taxonomy';
import { useSession } from '../state/session';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export const keys = {
  me: ['me'] as const,
  myTracks: ['me', 'tracks'] as const,
  myLinks: ['me', 'links'] as const,
  usage: ['me', 'usage'] as const,
  feed: (f: DiscoverFilters) => ['feed', f] as const,
  feedAll: ['feed'] as const,
  profile: (id: string) => ['profile', id] as const,
  requests: (box: 'received' | 'sent') => ['requests', box] as const,
  requestsAll: ['requests'] as const,
  connections: ['connections'] as const,
  collaborations: ['collaborations'] as const,
  favorites: ['favorites'] as const,
  conversations: ['conversations'] as const,
  messages: (id: string) => ['messages', id] as const,
  blocked: ['blocked'] as const,
};

function useAuthed() {
  return !!useSession((s) => s.session);
}

export function useMyProfile() {
  const authed = useAuthed();
  return useQuery({ queryKey: keys.me, queryFn: () => backend.getMyProfile(), enabled: authed, staleTime: 60_000 });
}

export function useMyTracks() {
  return useQuery({ queryKey: keys.myTracks, queryFn: () => backend.listMyTracks(), enabled: useAuthed() });
}

export function useMyLinks() {
  return useQuery({ queryKey: keys.myLinks, queryFn: () => backend.listMyLinks(), enabled: useAuthed() });
}

export function useUsage() {
  return useQuery({ queryKey: keys.usage, queryFn: () => backend.getUsage(), enabled: useAuthed() });
}

export function useFeed(filters: DiscoverFilters) {
  return useQuery({ queryKey: keys.feed(filters), queryFn: () => backend.discoverFeed(filters, 20), enabled: useAuthed(), staleTime: Infinity });
}

export function useProfileBundle(id: string | undefined) {
  return useQuery({ queryKey: keys.profile(id ?? ''), queryFn: () => backend.getProfileBundle(id!), enabled: !!id && useAuthed() });
}

export function useRequests(box: 'received' | 'sent') {
  return useQuery({ queryKey: keys.requests(box), queryFn: () => backend.listRequests(box), enabled: useAuthed() });
}

export function useConnections() {
  return useQuery({ queryKey: keys.connections, queryFn: () => backend.listConnections(), enabled: useAuthed() });
}

export function useCollaborations() {
  return useQuery({ queryKey: keys.collaborations, queryFn: () => backend.listCollaborations(), enabled: useAuthed() });
}

export function useFavorites() {
  return useQuery({ queryKey: keys.favorites, queryFn: () => backend.listFavorites(), enabled: useAuthed() });
}

export function useConversations() {
  return useQuery({ queryKey: keys.conversations, queryFn: () => backend.listConversations(), enabled: useAuthed() });
}

export function useMessages(conversationId: string) {
  return useQuery({ queryKey: keys.messages(conversationId), queryFn: () => backend.listMessages(conversationId), enabled: useAuthed() && !!conversationId });
}

export function useBlocked() {
  return useQuery({ queryKey: keys.blocked, queryFn: () => backend.listBlocked(), enabled: useAuthed() });
}

// Mutations -------------------------------------------------------------------

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveProfileInput) => backend.saveMyProfile(input),
    onSuccess: (profile) => {
      qc.setQueryData(keys.me, profile);
      void qc.invalidateQueries({ queryKey: keys.feedAll });
      void qc.invalidateQueries({ queryKey: keys.requestsAll });
    },
  });
}

export function useUploadImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, file }: { kind: 'avatar' | 'banner'; file: LocalFile }) => backend.uploadProfileImage(kind, file),
    onSuccess: (profile) => qc.setQueryData(keys.me, profile),
  });
}

export function useSetLinks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (links: { platform: LinkPlatform; url: string }[]) => backend.setMyLinks(links),
    onSuccess: (links) => qc.setQueryData(keys.myLinks, links),
  });
}

export function useAddTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTrackInput) => backend.addTrack(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.myTracks });
      void qc.invalidateQueries({ queryKey: keys.usage });
    },
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackId: string) => backend.deleteTrack(trackId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.myTracks });
      void qc.invalidateQueries({ queryKey: keys.usage });
    },
  });
}

export function useSendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendRequestInput) => backend.sendRequest(input),
    onSuccess: (_r, input) => {
      void qc.invalidateQueries({ queryKey: keys.requestsAll });
      void qc.invalidateQueries({ queryKey: keys.profile(input.targetId) });
      void qc.invalidateQueries({ queryKey: keys.conversations });
      void qc.invalidateQueries({ queryKey: keys.connections });
      void qc.invalidateQueries({ queryKey: keys.usage });
    },
  });
}

export function useRespondRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => backend.respondRequest(id, accept),
    onSuccess: () => invalidateNetwork(qc),
  });
}

export function useWithdrawRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => backend.withdrawRequest(id), onSuccess: () => invalidateNetwork(qc) });
}

export function useRemoveConnection() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => backend.removeConnection(id), onSuccess: () => invalidateNetwork(qc) });
}

export function useSetCollaborationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CollaborationStatus }) => backend.setCollaborationStatus(id, status),
    onSuccess: () => invalidateNetwork(qc),
  });
}

export function useStartCollaboration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) => backend.startCollaboration(conversationId, title),
    onSuccess: (_id, { conversationId }) => {
      void qc.invalidateQueries({ queryKey: keys.collaborations });
      void qc.invalidateQueries({ queryKey: keys.messages(conversationId) });
      void qc.invalidateQueries({ queryKey: keys.conversations });
    },
  });
}

export function useSetSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => backend.setSaved(id, saved),
    onSuccess: (_r, { id }) => {
      void qc.invalidateQueries({ queryKey: keys.favorites });
      void qc.invalidateQueries({ queryKey: keys.profile(id) });
    },
  });
}

export function useBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => backend.block(userId),
    onSuccess: (_r, userId) => {
      qc.removeQueries({ queryKey: keys.profile(userId) });
      invalidateNetwork(qc);
      void qc.invalidateQueries({ queryKey: keys.feedAll });
      void qc.invalidateQueries({ queryKey: keys.blocked });
      void qc.invalidateQueries({ queryKey: keys.favorites });
    },
  });
}

export function useUnblock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => backend.unblock(userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.blocked });
      void qc.invalidateQueries({ queryKey: keys.feedAll });
    },
  });
}

export function useReport() {
  return useMutation({ mutationFn: (input: ReportInput) => backend.report(input) });
}

export function invalidateNetwork(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: keys.requestsAll });
  void qc.invalidateQueries({ queryKey: keys.connections });
  void qc.invalidateQueries({ queryKey: keys.collaborations });
  void qc.invalidateQueries({ queryKey: keys.conversations });
  void qc.invalidateQueries({ queryKey: ['profile'] });
}

/**
 * Keeps conversation lists and open threads fresh from realtime inserts,
 * and request/link badges fresh from network changes.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  const authed = useAuthed();
  useEffect(() => {
    if (!authed) return;
    const offMessages = backend.subscribeToMessages((m: Message) => {
      qc.setQueryData<Message[]>(keys.messages(m.conversationId), (prev) => {
        if (!prev) return prev;
        if (prev.some((x) => x.id === m.id)) return prev;
        return [...prev.filter((x) => !(x.pending && x.senderId === m.senderId && x.body === m.body)), m];
      });
      void qc.invalidateQueries({ queryKey: keys.conversations });
    });
    const offNetwork = backend.subscribeToNetwork(() => invalidateNetwork(qc));
    return () => {
      offMessages();
      offNetwork();
    };
  }, [authed, qc]);
}
