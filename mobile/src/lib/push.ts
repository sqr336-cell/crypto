/**
 * Push notifications through Expo Push. Requires the installed app (a
 * development or store build) and an EAS project id in app config
 * (`extra.eas.projectId`). See docs/04-setup.md.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { backend } from '../data';
import { useLocale } from '../i18n';

export type PushState = 'on' | 'denied' | 'unavailable';

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

export function pushSupported(): boolean {
  return Platform.OS !== 'web' && backend.mode === 'supabase' && Device.isDevice && !!projectId();
}

export async function pushStatus(): Promise<PushState> {
  if (!pushSupported()) return 'unavailable';
  const Notifications = await import('expo-notifications');
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'on' : status === 'denied' ? 'denied' : 'unavailable';
}

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unavailable';
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#A99BFF',
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return 'denied';
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: projectId() })).data;
  await backend.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android', useLocale.getState().locale);
  return 'on';
}

/** Opening a notification opens its conversation. */
export function usePushRouting(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !pushSupported()) return;
    let remove: (() => void) | undefined;
    void import('expo-notifications').then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
      });
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const id = (response.notification.request.content.data as { conversationId?: string } | undefined)?.conversationId;
        if (id) router.push(`/chat/${id}`);
      });
      remove = () => sub.remove();
    });
    return () => remove?.();
  }, [enabled]);
}
