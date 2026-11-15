import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronRight, Download, LogOut, RotateCcw, Trash2 } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Chip, ChipGroup } from '../../components/ui/Chip';
import { Header, Screen } from '../../components/ui/Layout';
import { confirm } from '../../components/ui/Overlays';
import { PressableScale } from '../../components/ui/PressableScale';
import { Text } from '../../components/ui/Text';
import { Switch } from '../../components/ui/Toggle';
import { backend } from '../../data';
import { config } from '../../data/config';
import { useMyProfile, useSaveProfile, useUsage } from '../../data/queries';
import { LOCALE_NAMES, LOCALES, useLocale, useT } from '../../i18n';
import { enablePush, pushStatus, type PushState } from '../../lib/push';
import { useSession } from '../../state/session';
import { toast, toastError } from '../../state/toast';
import { colors, radius, space } from '../../theme/tokens';

export default function Settings() {
  const t = useT();
  const session = useSession((s) => s.session);
  const me = useMyProfile();
  const usage = useUsage();
  const save = useSaveProfile();
  const setLocale = useLocale((s) => s.setLocale);
  const [push, setPush] = useState<PushState>('unavailable');
  const [busy, setBusy] = useState<string | null>(null);
  const demo = backend.mode === 'demo';

  useEffect(() => {
    void pushStatus().then(setPush);
  }, []);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(null);
    }
  };

  const exportData = () =>
    run('export', async () => {
      const json = await backend.exportMyData();
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `beatlink-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: json, title: 'BEATLINK export' });
      }
      toast(t('settings.exportReady'));
    });

  const deleteAccount = async () => {
    const ok = await confirm({
      title: t('settings.deleteTitle'),
      body: t('settings.deleteBody'),
      confirmLabel: t('settings.deleteCta'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) await run('delete', () => backend.deleteAccount());
  };

  const u = usage.data;
  const of = (used: number, limit: number | null) => `${used} / ${limit ?? t('settings.unlimited')}`;

  return (
    <Screen>
      <Header title={t('settings.title')} />
      <ScrollView contentContainerStyle={styles.body}>
        {demo ? (
          <Group title={t('settings.demo')}>
            <Text variant="label" tone="mist">
              {t('settings.demoBody')}
            </Text>
            <Button
              label={t('settings.demoReset')}
              icon={RotateCcw}
              variant="secondary"
              size="sm"
              loading={busy === 'reset'}
              onPress={() => void run('reset', async () => {
                await backend.resetDemo?.();
                toast(t('settings.demoResetDone'));
              })}
              testID="settings-demo-reset"
            />
          </Group>
        ) : null}

        <Group title={t('settings.account')}>
          <Text variant="body">{session?.email ? t('settings.signedInAs', { email: session.email }) : t('settings.demoAccount')}</Text>
        </Group>

        <Group title={t('settings.plan')}>
          <Text variant="bodyStrong">{t('settings.planFree')}</Text>
          <Text variant="caption" tone="mist">
            {t('settings.planNote')}
          </Text>
          {u ? (
            <View style={styles.usage}>
              <Text variant="label" tone="mist">
                {t('settings.today')}
              </Text>
              <UsageRow label={t('settings.usageLinks')} value={of(u.interestsUsed, u.interestsLimit)} ratio={u.interestsLimit ? u.interestsUsed / u.interestsLimit : 0} />
              <UsageRow label={t('settings.usageRequests')} value={of(u.requestsUsed, u.requestsLimit)} ratio={u.requestsUsed / u.requestsLimit} />
              <UsageRow label={t('settings.usageSounds')} value={of(u.tracksCount, u.tracksLimit)} ratio={u.tracksCount / u.tracksLimit} />
            </View>
          ) : null}
        </Group>

        <Group title={t('settings.discovery')}>
          <Switch
            label={t('settings.visibility')}
            note={t('settings.visibilityNote')}
            value={me.data?.isDiscoverable ?? true}
            onChange={(v) => save.mutate({ isDiscoverable: v }, { onError: toastError })}
            testID="settings-visibility"
          />
        </Group>

        <Group title={t('settings.notifications')}>
          {push === 'on' ? (
            <Text variant="label" tone="mist">
              {t('settings.notificationsOn')}
            </Text>
          ) : push === 'denied' ? (
            <Text variant="label" tone="mist">
              {t('settings.notificationsDenied')}
            </Text>
          ) : Platform.OS === 'web' || demo ? (
            <Text variant="label" tone="mist">
              {t('settings.notificationsUnavailable')}
            </Text>
          ) : (
            <Button label={t('settings.notificationsEnable')} variant="secondary" size="sm" loading={busy === 'push'} onPress={() => void run('push', async () => setPush(await enablePush()))} />
          )}
        </Group>

        <Group title={t('settings.language')}>
          <ChipGroup>
            {LOCALES.map((l) => (
              <Chip key={l} label={LOCALE_NAMES[l]} selected={t.locale === l} onPress={() => setLocale(l)} testID={`locale-${l}`} />
            ))}
          </ChipGroup>
        </Group>

        <Group title={t('settings.safety')}>
          <Row label={t('settings.blocked')} onPress={() => router.push('/settings/blocked')} testID="settings-blocked" />
          <Row label={t('settings.privacy')} onPress={() => void WebBrowser.openBrowserAsync(config.privacyUrl)} />
          <Row label={t('settings.terms')} onPress={() => void WebBrowser.openBrowserAsync(config.termsUrl)} />
          <Row label={t('settings.export')} icon={<Download size={18} color={colors.mist} />} onPress={() => void exportData()} testID="settings-export" />
        </Group>

        <View style={styles.danger}>
          <Button label={t('settings.signOut')} icon={LogOut} variant="secondary" full onPress={() => void run('signout', () => backend.signOut())} testID="settings-signout" />
          <Button label={t('settings.deleteAccount')} icon={Trash2} variant="danger" full loading={busy === 'delete'} onPress={() => void deleteAccount()} testID="settings-delete" />
        </View>
        <Text variant="caption" tone="dim" align="center">
          {t('settings.version', { v: Constants.expoConfig?.version ?? '0.1.0' })}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="label" tone="mist" accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, onPress, icon, testID }: { label: string; onPress: () => void; icon?: ReactNode; testID?: string }) {
  return (
    <PressableScale style={styles.row} onPress={onPress} accessibilityRole="button" pressedScale={0.99} testID={testID}>
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      {icon ?? <ChevronRight size={18} color={colors.mist} />}
    </PressableScale>
  );
}

function UsageRow({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageHead}>
        <Text variant="label">{label}</Text>
        <Text variant="label" tone="mist" tabular>
          {value}
        </Text>
      </View>
      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${Math.min(100, ratio * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.xl, paddingBottom: space.xxxl },
  group: { gap: space.sm },
  card: { padding: space.lg, gap: space.md, borderRadius: radius.tile, backgroundColor: colors.desk },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  flex: { flex: 1 },
  usage: { gap: space.md, marginTop: space.sm },
  usageRow: { gap: 6 },
  usageHead: { flexDirection: 'row', justifyContent: 'space-between' },
  meter: { height: 3, borderRadius: 2, backgroundColor: colors.fader, overflow: 'hidden' },
  meterFill: { height: 3, backgroundColor: colors.signal },
  danger: { gap: space.sm, marginTop: space.md },
});
