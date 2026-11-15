import { Image } from 'expo-image';
import { Camera, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvailabilityPicker, GenrePicker, SlugPicker, TagInput } from '../components/profile/Pickers';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Chip, ChipGroup } from '../components/ui/Chip';
import { Field } from '../components/ui/Field';
import { IconButton } from '../components/ui/IconButton';
import { Header, Loading, SectionTitle } from '../components/ui/Layout';
import { PressableScale } from '../components/ui/PressableScale';
import { Text } from '../components/ui/Text';
import { useMyLinks, useMyProfile, useSaveProfile, useSetLinks, useUploadImage } from '../data/queries';
import { detectPlatform, normalizeUrl } from '../domain/links';
import { COLLAB_MODES, GOALS, LANGUAGES, LIMITS, ROLES, SKILLS, type LinkPlatform } from '../domain/taxonomy';
import type { Profile, ProfileDraft } from '../domain/types';
import { slugifyHandle, validateDraft } from '../domain/validation';
import { useT } from '../i18n';
import { pickImage } from '../lib/files';
import { errorMessage, toast, toastError } from '../state/toast';
import { colors, layout, radius, space } from '../theme/tokens';
import { goBack } from '../lib/nav';

export default function EditProfile() {
  const me = useMyProfile();
  const links = useMyLinks();
  if (!me.data || links.isLoading) return <Loading />;
  return <Editor profile={me.data} initialLinks={(links.data ?? []).map((l) => l.url)} />;
}

function Editor({ profile, initialLinks }: { profile: Profile; initialLinks: string[] }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const save = useSaveProfile();
  const setLinks = useSetLinks();
  const upload = useUploadImage();
  const [d, setD] = useState<ProfileDraft>({
    handle: profile.handle ?? '',
    displayName: profile.displayName,
    bio: profile.bio ?? '',
    lookingFor: profile.lookingFor ?? '',
    city: profile.city ?? '',
    countryCode: profile.countryCode ?? '',
    languages: profile.languages,
    roles: profile.roles,
    genres: profile.genres,
    influences: profile.influences,
    skills: profile.skills,
    goals: profile.goals,
    availability: profile.availability,
    collabMode: profile.collabMode,
    isDiscoverable: profile.isDiscoverable,
  });
  const [urls, setUrls] = useState<string[]>(initialLinks.length ? initialLinks : ['']);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  const changeImage = async (kind: 'avatar' | 'banner') => {
    try {
      const file = await pickImage(kind === 'avatar' ? [1, 1] : [3, 2]);
      if (file) await upload.mutateAsync({ kind, file });
    } catch (e) {
      toastError(e);
    }
  };

  const submit = async () => {
    setError(null);
    for (const step of ['identity', 'craft', 'sound', 'intent'] as const) {
      const issue = validateDraft(d, step);
      if (issue) return setError(t(`errors.${issue}`));
    }
    const cleaned = urls.map((u) => u.trim()).filter(Boolean);
    const normalized = cleaned.map(normalizeUrl);
    if (normalized.some((u) => !u)) return setError(t('editProfile.invalidUrl'));
    const byPlatform = new Map<LinkPlatform, string>();
    for (const u of normalized as string[]) {
      const p = detectPlatform(u);
      if (p && !byPlatform.has(p)) byPlatform.set(p, u);
    }
    try {
      await save.mutateAsync(d);
      await setLinks.mutateAsync([...byPlatform.entries()].map(([platform, url]) => ({ platform, url })));
      toast(t('editProfile.saved'));
      goBack('/me');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={t('editProfile.title')} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <PressableScale style={styles.banner} onPress={() => void changeImage('banner')} accessibilityRole="button" accessibilityLabel={t('editProfile.changeBanner')} pressedScale={0.99}>
          {profile.banner ? <Image source={profile.banner} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <View style={styles.bannerLabel}>
            <Camera size={16} color={colors.paper} />
            <Text variant="label">{t('editProfile.changeBanner')}</Text>
          </View>
        </PressableScale>
        <PressableScale style={styles.avatarRow} onPress={() => void changeImage('avatar')} accessibilityRole="button">
          <Avatar source={profile.avatar} name={d.displayName} size={72} />
          <Text variant="label" tone="signal">
            {t('editProfile.changePhoto')}
          </Text>
        </PressableScale>

        <Field label={t('onboarding.identity.displayName')} value={d.displayName} onChangeText={(v) => set('displayName', v)} max={LIMITS.displayName} />
        <Field label={t('onboarding.identity.handle')} prefix="@" value={d.handle} autoCapitalize="none" onChangeText={(v) => set('handle', slugifyHandle(v))} max={LIMITS.handle.max} />
        <Field label={t('onboarding.identity.bio')} value={d.bio} onChangeText={(v) => set('bio', v)} multiline max={LIMITS.bio} />
        <Field label={t('onboarding.intent.lookingFor')} placeholder={t('onboarding.intent.lookingForPh')} value={d.lookingFor} onChangeText={(v) => set('lookingFor', v)} multiline max={LIMITS.lookingFor} />
        <View style={styles.twoCols}>
          <View style={styles.flex2}>
            <Field label={t('onboarding.identity.city')} value={d.city} onChangeText={(v) => set('city', v)} max={LIMITS.city} />
          </View>
          <View style={styles.flex1}>
            <Field label={t('onboarding.identity.country')} value={d.countryCode} maxLength={2} autoCapitalize="characters" onChangeText={(v) => set('countryCode', v.replace(/[^a-z]/gi, '').toUpperCase())} />
          </View>
        </View>

        <Block title={t('onboarding.intent.availability')}>
          <AvailabilityPicker value={d.availability} onChange={(v) => set('availability', v)} />
        </Block>
        <Block title={t('onboarding.craft.roles')}>
          <SlugPicker options={ROLES} value={d.roles} onChange={(v) => set('roles', v)} label={(r) => t(`roles.${r}`)} max={LIMITS.roles} numbered />
        </Block>
        <Block title={t('onboarding.craft.skills')}>
          <SlugPicker options={SKILLS} value={d.skills} onChange={(v) => set('skills', v)} label={(s) => t(`skills.${s}`)} max={LIMITS.skills} />
        </Block>
        <Block title={t('onboarding.sound.genres')}>
          <GenrePicker value={d.genres} onChange={(v) => set('genres', v)} />
        </Block>
        <Block title={t('onboarding.sound.influences')}>
          <TagInput value={d.influences} onChange={(v) => set('influences', v)} placeholder={t('onboarding.sound.influencesPh')} hint={t('onboarding.sound.influencesHint')} max={LIMITS.influences} maxLength={LIMITS.influenceLength} />
        </Block>
        <Block title={t('onboarding.intent.goals')}>
          <SlugPicker options={GOALS} value={d.goals} onChange={(v) => set('goals', v)} label={(g) => t(`goals.${g}`)} />
        </Block>
        <Block title={t('onboarding.intent.collabMode')}>
          <ChipGroup>
            {COLLAB_MODES.map((m) => (
              <Chip key={m} label={t(`collabModes.${m}`)} selected={d.collabMode === m} onPress={() => set('collabMode', m)} />
            ))}
          </ChipGroup>
        </Block>
        <Block title={t('onboarding.identity.languages')}>
          <SlugPicker options={LANGUAGES} value={d.languages} onChange={(v) => set('languages', v)} label={(l) => t(`languages.${l}`)} max={LIMITS.languages} />
        </Block>

        <Block title={t('editProfile.elsewhere')}>
          <View style={styles.links}>
            <Text variant="caption" tone="dim">
              {t('editProfile.elsewhereHint')}
            </Text>
            {urls.map((u, i) => {
              const norm = u.trim() ? normalizeUrl(u) : null;
              const platform = norm ? detectPlatform(norm) : null;
              return (
                <View key={i} style={styles.linkRow}>
                  <View style={styles.flex2}>
                    <Field
                      value={u}
                      onChangeText={(v) => setUrls(urls.map((x, j) => (j === i ? v : x)))}
                      placeholder={t('editProfile.urlPh')}
                      autoCapitalize="none"
                      keyboardType="url"
                      hint={platform ? t(`platforms.${platform}`) : undefined}
                      error={u.trim() && !norm ? t('editProfile.invalidUrl') : null}
                    />
                  </View>
                  <IconButton icon={X} label={t('common.remove')} onPress={() => setUrls(urls.filter((_, j) => j !== i))} color={colors.mist} />
                </View>
              );
            })}
            {urls.length < 9 ? (
              <PressableScale onPress={() => setUrls([...urls, ''])} style={styles.addLink} accessibilityRole="button">
                <Plus size={16} color={colors.signal} />
                <Text variant="label" tone="signal">
                  {t('editProfile.addLink')}
                </Text>
              </PressableScale>
            ) : null}
          </View>
        </Block>
        {error ? (
          <Text variant="label" tone="clip" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <Button label={t('editProfile.save')} full onPress={() => void submit()} loading={save.isPending || setLinks.isPending} testID="edit-save" />
      </View>
    </KeyboardAvoidingView>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.booth },
  body: { padding: space.xl, gap: space.xl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingBottom: space.xxxl },
  banner: { height: 140, borderRadius: radius.tile, overflow: 'hidden', backgroundColor: colors.desk, justifyContent: 'flex-end' },
  bannerLabel: { flexDirection: 'row', alignItems: 'center', gap: space.sm, margin: space.md, alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.scrim },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  twoCols: { flexDirection: 'row', gap: space.md },
  flex2: { flex: 2 },
  flex1: { flex: 1 },
  links: { gap: space.md },
  linkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, alignSelf: 'flex-start' },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
});
