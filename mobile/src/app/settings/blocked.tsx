import { FlatList, StyleSheet, View } from 'react-native';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState, Header, Loading, Screen } from '../../components/ui/Layout';
import { Text } from '../../components/ui/Text';
import { useBlocked, useUnblock } from '../../data/queries';
import { useT } from '../../i18n';
import { formatDate } from '../../lib/format';
import { toast, toastError } from '../../state/toast';
import { space } from '../../theme/tokens';

export default function Blocked() {
  const t = useT();
  const q = useBlocked();
  const unblock = useUnblock();
  return (
    <Screen>
      <Header title={t('blocked.title')} />
      {q.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(b) => b.profile.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState body={t('blocked.empty')} />}
          renderItem={({ item: b }) => (
            <View style={styles.row}>
              <Avatar source={b.profile.avatar} name={b.profile.displayName} size={44} />
              <View style={styles.text}>
                <Text variant="bodyStrong">{b.profile.displayName}</Text>
                <Text variant="caption" tone="mist">
                  {formatDate(b.blockedAt, t.locale)}
                </Text>
              </View>
              <Button
                label={t('blocked.unblock')}
                variant="secondary"
                size="sm"
                onPress={() =>
                  unblock.mutate(b.profile.id, {
                    onSuccess: () => toast(t('blocked.unblocked', { name: b.profile.displayName })),
                    onError: toastError,
                  })
                }
                testID="unblock"
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  text: { flex: 1, gap: 2 },
});
