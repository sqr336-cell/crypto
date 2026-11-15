import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Fit, Profile, ProfileLink, Track } from '../../domain/types';
import { hostOf } from '../../domain/links';
import { useT } from '../../i18n';
import { colors, fonts, radius, space } from '../../theme/tokens';
import { trackItem } from '../audio/playable';
import { TrackRow } from '../audio/TrackRow';
import { AvailabilityMeter } from '../ui/AvailabilityMeter';
import { Avatar } from '../ui/Avatar';
import { Tag } from '../ui/Chip';
import { SectionTitle } from '../ui/Layout';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { CoverFallback } from './CoverFallback';
import { FitReasons, FitTier } from './Fit';

interface Props {
  profile: Profile;
  tracks: Track[];
  links: ProfileLink[];
  fit?: Fit | null;
  /** Viewer's own lists, to highlight what is shared. */
  mine?: Pick<Profile, 'genres' | 'influences'> | null;
  onDeleteTrack?: (track: Track) => void;
  onOpenFit?: () => void;
  /** Rendered right after the identity block (actions). */
  actions?: ReactNode;
  /** Rendered at the top of the Sounds section (e.g. "Add a sound"). */
  soundsAction?: ReactNode;
  soundsFooter?: ReactNode;
}

/** The artist showcase: identity, intent, sounds first, then the details. */
export function ProfileBody({ profile, tracks, links, fit, mine, onDeleteTrack, onOpenFit, actions, soundsAction, soundsFooter }: Props) {
  const t = useT();
  const artwork = profile.avatar ?? profile.banner;
  const mineInfl = new Set((mine?.influences ?? []).map((i) => i.toLowerCase()));

  return (
    <View>
      <View style={styles.banner}>
        {profile.banner ? (
          <Image source={profile.banner} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <CoverFallback seed={profile.id} />
        )}
        <LinearGradient colors={['rgba(14,13,18,0.1)', 'rgba(14,13,18,1)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
      </View>

      <View style={styles.identity}>
        <Avatar source={profile.avatar} name={profile.displayName} size={84} />
        <View style={styles.nameBlock}>
          {profile.isDemo ? (
            <View style={styles.demoBadge}>
              <Text variant="micro" tone="mist">
                {t('common.demoProfile')}
              </Text>
            </View>
          ) : null}
          <Text style={styles.name} accessibilityRole="header">
            {profile.displayName}
          </Text>
          {profile.handle ? (
            <Text variant="label" tone="mist">
              @{profile.handle}
            </Text>
          ) : null}
        </View>
        <Text variant="body">{profile.roles.map((r) => t(`roles.${r}`)).join(', ')}</Text>
        <View style={styles.statusRow}>
          <AvailabilityMeter value={profile.availability} />
          {profile.city ? (
            <Text variant="label" tone="mist">
              {profile.city}
              {profile.countryCode ? `, ${profile.countryCode}` : ''}
            </Text>
          ) : null}
        </View>
        {actions}
      </View>

      {fit ? (
        <PressableScale style={styles.fitCard} onPress={onOpenFit} pressedScale={0.99} accessibilityRole="button" accessibilityLabel={t('discover.howScored')}>
          <View style={styles.fitHead}>
            <Text variant="label" tone="mist">
              {t('profile.yourFit')}
            </Text>
            <FitTier fit={fit} />
          </View>
          <FitReasons fit={fit} city={profile.city} max={4} />
          <Text variant="caption" tone="signal">
            {t('discover.howScored')}
          </Text>
        </PressableScale>
      ) : null}

      {profile.lookingFor ? (
        <Section title={t('profile.lookingFor')}>
          <Text variant="heading" style={styles.lookingFor}>
            {profile.lookingFor}
          </Text>
        </Section>
      ) : null}

      <Section title={t('profile.sounds')} action={soundsAction}>
        <View style={styles.tracks}>
          {tracks.map((tr) => (
            <TrackRow
              key={tr.id}
              track={tr}
              item={trackItem(tr, { id: profile.id, displayName: profile.displayName, artwork }, 'profile')}
              onDelete={onDeleteTrack ? () => onDeleteTrack(tr) : undefined}
            />
          ))}
          {!tracks.length && !soundsFooter ? (
            <Text variant="body" tone="mist">
              {t('discover.noSounds')}
            </Text>
          ) : null}
          {soundsFooter}
        </View>
      </Section>

      <Section title={t('profile.about')}>
        <Text variant="body" tone={profile.bio ? 'paper' : 'mist'}>
          {profile.bio ?? t('profile.noBio')}
        </Text>
      </Section>

      {profile.genres.length ? (
        <Section title={t('profile.genres')}>
          <View style={styles.tags}>
            {profile.genres.map((g) => (
              <Tag key={g} label={t(`genres.${g}`)} highlighted={mine?.genres.includes(g)} />
            ))}
          </View>
        </Section>
      ) : null}

      {profile.influences.length ? (
        <Section title={t('profile.influences')}>
          <View style={styles.tags}>
            {profile.influences.map((i) => (
              <Tag key={i} label={i} highlighted={mineInfl.has(i.toLowerCase())} />
            ))}
          </View>
        </Section>
      ) : null}

      {profile.skills.length ? (
        <Section title={t('profile.skills')}>
          <View style={styles.tags}>
            {profile.skills.map((s) => (
              <Tag key={s} label={t(`skills.${s}`)} />
            ))}
          </View>
        </Section>
      ) : null}

      {profile.goals.length ? (
        <Section title={t('profile.goals')}>
          <View style={styles.tags}>
            {profile.goals.map((g) => (
              <Tag key={g} label={t(`goals.${g}`)} />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title={t('profile.details')}>
        <View style={styles.details}>
          {profile.languages.length ? (
            <Detail label={t('profile.languages')} value={profile.languages.map((l) => t(`languages.${l}`)).join(', ')} />
          ) : null}
          <Detail label={t('profile.workMode')} value={t(`collabModes.${profile.collabMode}`)} />
        </View>
      </Section>

      {links.length ? (
        <Section title={t('profile.elsewhere')}>
          <View style={styles.links}>
            {links.map((l) => (
              <PressableScale
                key={l.id}
                style={styles.link}
                onPress={() => void WebBrowser.openBrowserAsync(l.url)}
                accessibilityRole="link"
                accessibilityLabel={`${t(`platforms.${l.platform}`)}, ${hostOf(l.url)}`}
              >
                <View style={styles.linkText}>
                  <Text variant="labelStrong">{t(`platforms.${l.platform}`)}</Text>
                  <Text variant="caption" tone="mist" numberOfLines={1}>
                    {hostOf(l.url)}
                  </Text>
                </View>
                <ExternalLink size={16} color={colors.mist} />
              </PressableScale>
            ))}
          </View>
        </Section>
      ) : null}
    </View>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionTitle action={action}>{title}</SectionTitle>
      {children}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text variant="label" tone="mist" style={styles.detailLabel}>
        {label}
      </Text>
      <Text variant="label" style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { height: 200, backgroundColor: colors.desk },
  identity: { paddingHorizontal: space.xl, marginTop: -60, gap: space.sm },
  nameBlock: { gap: 2, marginTop: space.sm },
  demoBadge: { alignSelf: 'flex-start', paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.hairlineStrong, marginBottom: space.xs },
  name: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.8, color: colors.paper },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' },
  fitCard: { marginHorizontal: space.xl, marginTop: space.xl, padding: space.lg, gap: space.md, borderRadius: radius.tile, backgroundColor: colors.desk },
  fitHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { paddingHorizontal: space.xl, paddingTop: space.xxl },
  lookingFor: { fontFamily: fonts.displayBold },
  tracks: { gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  details: { gap: space.sm },
  detail: { flexDirection: 'row', gap: space.lg },
  detailLabel: { width: 110 },
  detailValue: { flex: 1 },
  links: { gap: space.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.tile, backgroundColor: colors.desk },
  linkText: { flex: 1, gap: 2 },
});
