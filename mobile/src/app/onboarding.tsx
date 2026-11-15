import { router } from 'expo-router';
import { Camera, Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrackRow } from '../components/audio/TrackRow';
import { trackItem } from '../components/audio/playable';
import { AvailabilityPicker, GenrePicker, SlugPicker, TagInput } from '../components/profile/Pickers';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Chip, ChipGroup } from '../components/ui/Chip';
import { Field } from '../components/ui/Field';
import { SectionTitle } from '../components/ui/Layout';
import { PressableScale } from '../components/ui/PressableScale';
import { Text } from '../components/ui/Text';
import { Toggle } from '../components/ui/Toggle';
import { backend } from '../data';
import { useMyProfile, useMyTracks, useSaveProfile, useUploadImage } from '../data/queries';
import { COLLAB_MODES, GOALS, LANGUAGES, LIMITS, ROLES, SKILLS } from '../domain/taxonomy';
import type { LocalFile, ProfileDraft } from '../domain/types';
import { slugifyHandle, validateDraft } from '../domain/validation';
import { useT } from '../i18n';
import { pickImage } from '../lib/files';
import { errorMessage, toastError } from '../state/toast';
import { colors, layout, radius, space } from '../theme/tokens';

const STEPS = ['identity', 'craft', 'sound', 'intent', 'sounds'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const me = useMyProfile();
  const tracks = useMyTracks();
  const save = useSaveProfile();
  const upload = useUploadImage();
  const scroll = useRef<ScrollViewInstance>(null);
  const [step, setStep] = useState<Step>('identity');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<LocalFile | null>(null);
  const [handleEdited, setHandleEdited] = useState(false);
  const [adult, setAdult] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>({
    handle: '',
    displayName: '',
    bio: '',
    lookingFor: '',
    city: '',
    countryCode: '',
    languages: t.locale === 'fr' ? ['fr'] : ['en'],
    roles: [],
    genres: [],
    influences: [],
    skills: [],
    goals: [],
    availability: 'available',
    collabMode: 'both',
    isDiscoverable: true,
  });

  // Resume where a previous session stopped.
  useEffect(() => {
    const p = me.data;
    if (!p) return;
    setDraft((d) => ({
      ...d,
      handle: p.handle ?? d.handle,
      displayName: p.displayName || d.displayName,
      bio: p.bio ?? '',
      lookingFor: p.lookingFor ?? '',
      city: p.city ?? '',
      countryCode: p.countryCode ?? '',
      languages: p.languages.length ? p.languages : d.languages,
      roles: p.roles,
      genres: p.genres,
      influences: p.influences,
      skills: p.skills,
      goals: p.goals,
      availability: p.availability,
      collabMode: p.collabMode,
    }));
    setHandleEdited(!!p.handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data?.id]);

  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const index = STEPS.indexOf(step);

  const next = async () => {
    setError(null);
    if (step === 'identity' && !adult && !me.data) return setError(t('errors.age_required'));
    if (step !== 'sounds') {
      const issue = validateDraft(draft, step);
      if (issue) return setError(t(`errors.${issue}`));
    }
    setBusy(true);
    try {
      if (step === 'identity') {
        if (!(await backend.isHandleAvailable(draft.handle))) {
          setError(t('errors.handle_taken'));
          return;
        }
        await save.mutateAsync({
          displayName: draft.displayName,
          handle: draft.handle,
          bio: draft.bio,
          city: draft.city,
          countryCode: draft.countryCode,
          languages: draft.languages,
          confirmAge: adult,
        });
        if (photo) await upload.mutateAsync({ kind: 'avatar', file: photo });
      } else if (step === 'craft') {
        await save.mutateAsync({ roles: draft.roles, skills: draft.skills });
      } else if (step === 'sound') {
        await save.mutateAsync({ genres: draft.genres, influences: draft.influences });
      } else if (step === 'intent') {
        await save.mutateAsync({ goals: draft.goals, availability: draft.availability, lookingFor: draft.lookingFor, collabMode: draft.collabMode });
      } else {
        await save.mutateAsync({ completeOnboarding: true });
        router.replace('/discover');
        return;
      }
      setStep(STEPS[index + 1]);
      scroll.current?.scrollTo({ y: 0, animated: false });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const choosePhoto = async () => {
    try {
      const file = await pickImage([1, 1]);
      if (file) setPhoto(file);
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.progressWrap}>
        <View style={styles.progress} accessibilityLabel={t('onboarding.progress', { n: index + 1, total: STEPS.length })}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.segment, i <= index && styles.segmentOn]} />
          ))}
        </View>
        <Text variant="caption" tone="mist" tabular>
          {t('onboarding.progress', { n: index + 1, total: STEPS.length })}
        </Text>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View key={step} entering={FadeInRight.duration(220)} style={styles.stepBody}>
          {step === 'identity' ? (
            <>
              <StepTitle title={t('onboarding.identity.title')} subtitle={t('onboarding.identity.subtitle')} />
              <PressableScale onPress={() => void choosePhoto()} style={styles.photoRow} accessibilityRole="button" testID="onboarding-photo">
                <Avatar source={photo ? { uri: photo.uri } : me.data?.avatar ?? null} name={draft.displayName || '?'} size={72} />
                <View style={styles.photoText}>
                  <Camera size={18} color={colors.signal} />
                  <Text variant="label" tone="signal">
                    {photo || me.data?.avatar ? t('onboarding.identity.changePhoto') : t('onboarding.identity.addPhoto')}
                  </Text>
                </View>
              </PressableScale>
              <Field
                label={t('onboarding.identity.displayName')}
                placeholder={t('onboarding.identity.displayNamePh')}
                value={draft.displayName}
                max={LIMITS.displayName}
                onChangeText={(v) => {
                  set('displayName', v);
                  if (!handleEdited) set('handle', slugifyHandle(v));
                }}
                testID="onboarding-name"
              />
              <Field
                label={t('onboarding.identity.handle')}
                prefix="@"
                value={draft.handle}
                autoCapitalize="none"
                autoCorrect={false}
                max={LIMITS.handle.max}
                onChangeText={(v) => {
                  setHandleEdited(true);
                  set('handle', slugifyHandle(v));
                }}
                testID="onboarding-handle"
              />
              <View style={styles.twoCols}>
                <View style={styles.flex2}>
                  <Field label={t('onboarding.identity.city')} placeholder={t('onboarding.identity.cityPh')} optionalLabel={t('common.optional')} value={draft.city} max={LIMITS.city} onChangeText={(v) => set('city', v)} />
                </View>
                <View style={styles.flex1}>
                  <Field
                    label={t('onboarding.identity.country')}
                    placeholder={t('onboarding.identity.countryPh')}
                    value={draft.countryCode}
                    autoCapitalize="characters"
                    maxLength={2}
                    onChangeText={(v) => set('countryCode', v.replace(/[^a-z]/gi, '').toUpperCase())}
                  />
                </View>
              </View>
              <View style={styles.block}>
                <SectionTitle>{t('onboarding.identity.languages')}</SectionTitle>
                <SlugPicker options={LANGUAGES} value={draft.languages} onChange={(v) => set('languages', v)} label={(l) => t(`languages.${l}`)} max={LIMITS.languages} />
              </View>
              <Field
                label={t('onboarding.identity.bio')}
                placeholder={t('onboarding.identity.bioPh')}
                optionalLabel={t('common.optional')}
                value={draft.bio}
                multiline
                max={LIMITS.bio}
                onChangeText={(v) => set('bio', v)}
              />
              {!me.data ? <Toggle label={t('onboarding.identity.ageConfirm')} value={adult} onChange={setAdult} testID="onboarding-age" /> : null}
            </>
          ) : null}

          {step === 'craft' ? (
            <>
              <StepTitle title={t('onboarding.craft.title')} subtitle={t('onboarding.craft.subtitle')} />
              <View style={styles.block}>
                <SectionTitle>{t('onboarding.craft.roles')}</SectionTitle>
                <SlugPicker options={ROLES} value={draft.roles} onChange={(v) => set('roles', v)} label={(r) => t(`roles.${r}`)} max={LIMITS.roles} numbered testPrefix="role" />
              </View>
              <View style={styles.block}>
                <SectionTitle>{t('onboarding.craft.skills')}</SectionTitle>
                <SlugPicker options={SKILLS} value={draft.skills} onChange={(v) => set('skills', v)} label={(s) => t(`skills.${s}`)} max={LIMITS.skills} testPrefix="skill" />
              </View>
            </>
          ) : null}

          {step === 'sound' ? (
            <>
              <StepTitle title={t('onboarding.sound.title')} subtitle={t('onboarding.sound.subtitle')} />
              <View style={styles.block}>
                <SectionTitle>{t('onboarding.sound.genres')}</SectionTitle>
                <GenrePicker value={draft.genres} onChange={(v) => set('genres', v)} />
              </View>
              <View style={styles.block}>
                <SectionTitle>{t('onboarding.sound.influences')}</SectionTitle>
                <TagInput
                  value={draft.influences}
                  onChange={(v) => set('influences', v)}
                  placeholder={t('onboarding.sound.influencesPh')}
                  hint={t('onboarding.sound.influencesHint')}
                  max={LIMITS.influences}
                  maxLength={LIMITS.influenceLength}
                />
              </View>
            </>
          ) : null}

          {step === 'intent' ? (
            <>
              <StepTitle title={t('onboarding.intent.title')} subtitle={t('onboarding.intent.subtitle')} />
              <View style={styles.block}>
                <SectionTitle>{t('onboarding.intent.goals')}</SectionTitle>
                <SlugPicker options={GOALS} value={draft.goals} onChange={(v) => set('goals', v)} label={(g) => t(`goals.${g}`)} testPrefix="goal" />
              </View>
              <View style={styles.block}>
                <SectionTitle>{t('onboarding.intent.availability')}</SectionTitle>
                <AvailabilityPicker value={draft.availability} onChange={(v) => set('availability', v)} />
              </View>
              <Field
                label={t('onboarding.intent.lookingFor')}
                placeholder={t('onboarding.intent.lookingForPh')}
                optionalLabel={t('common.optional')}
                value={draft.lookingFor}
                max={LIMITS.lookingFor}
                multiline
                onChangeText={(v) => set('lookingFor', v)}
                testID="onboarding-looking"
              />
              <View style={styles.block}>
                <SectionTitle>{t('onboarding.intent.collabMode')}</SectionTitle>
                <ChipGroup>
                  {COLLAB_MODES.map((m) => (
                    <Chip key={m} label={t(`collabModes.${m}`)} selected={draft.collabMode === m} onPress={() => set('collabMode', m)} />
                  ))}
                </ChipGroup>
              </View>
            </>
          ) : null}

          {step === 'sounds' ? (
            <>
              <StepTitle title={t('onboarding.sounds.title')} subtitle={t('onboarding.sounds.subtitle')} />
              <View style={styles.tracks}>
                {(tracks.data ?? []).map((tr) => (
                  <TrackRow key={tr.id} track={tr} item={trackItem(tr, { id: me.data?.id, displayName: me.data?.displayName ?? '', artwork: me.data?.avatar ?? null }, 'profile')} />
                ))}
              </View>
              <PressableScale onPress={() => router.push('/add-sound')} style={styles.addSound} accessibilityRole="button" testID="onboarding-add-sound">
                <Plus size={20} color={colors.signal} />
                <Text variant="bodyStrong" tone="signal">
                  {t('onboarding.sounds.add')}
                </Text>
              </PressableScale>
            </>
          ) : null}

          {error ? (
            <Text variant="label" tone="clip" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        {index > 0 ? <Button label={t('common.back')} variant="ghost" onPress={() => setStep(STEPS[index - 1])} /> : <View />}
        <Button
          label={step === 'sounds' ? (tracks.data?.length ? t('onboarding.sounds.finish') : t('onboarding.sounds.later')) : t('common.continue')}
          variant={step === 'sounds' && !tracks.data?.length ? 'secondary' : 'primary'}
          onPress={() => void next()}
          loading={busy}
          testID="onboarding-next"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body" tone="mist">
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.booth },
  progressWrap: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: space.xl, paddingTop: space.lg, gap: space.sm },
  progress: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.fader },
  segmentOn: { backgroundColor: colors.signal },
  content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  stepBody: { gap: space.xl, paddingTop: space.xl },
  titleBlock: { gap: space.sm },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  photoText: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  twoCols: { flexDirection: 'row', gap: space.md },
  flex2: { flex: 2 },
  flex1: { flex: 1 },
  block: { gap: 0 },
  tracks: { gap: space.sm },
  addSound: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: 64,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.signalLine,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
});
