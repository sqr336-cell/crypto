import { useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FitBreakdown, FitTier } from '../../components/profile/Fit';
import { IconButton } from '../../components/ui/IconButton';
import { Loading, Screen } from '../../components/ui/Layout';
import { Text } from '../../components/ui/Text';
import { useProfileBundle } from '../../data/queries';
import { useT } from '../../i18n';
import { space } from '../../theme/tokens';
import { goBack } from '../../lib/nav';

/** Transparent explanation of a compatibility score. */
export default function FitScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useProfileBundle(id);
  if (q.isLoading) return <Loading />;
  const fit = q.data?.fit;
  return (
    <Screen edges={['bottom']}>
      <View style={styles.header}>
        <IconButton icon={X} label={t('common.close')} onPress={() => goBack()} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="title" accessibilityRole="header">
          {t('fit.breakdownTitle', { name: q.data?.profile.displayName ?? '' })}
        </Text>
        {fit ? (
          <>
            <FitTier fit={fit} />
            <FitBreakdown fit={fit} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: space.sm },
  body: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: space.xl },
});
