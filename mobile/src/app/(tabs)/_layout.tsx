import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { AudioLines, Link2, MessageCircle, UserRound, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '../../components/audio/MiniPlayer';
import { PressableScale } from '../../components/ui/PressableScale';
import { Text } from '../../components/ui/Text';
import { useConversations, useRequests } from '../../data/queries';
import { useT, type TKey } from '../../i18n';
import { colors, layout, space } from '../../theme/tokens';

const TABS: { name: string; label: TKey; icon: LucideIcon }[] = [
  { name: 'discover', label: 'tabs.discover', icon: AudioLines },
  { name: 'links', label: 'tabs.links', icon: Link2 },
  { name: 'messages', label: 'tabs.messages', icon: MessageCircle },
  { name: 'me', label: 'tabs.profile', icon: UserRound },
];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.booth } }} tabBar={(props) => <TabBar {...props} />}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const received = useRequests('received');
  const conversations = useConversations();
  const badges: Record<string, number> = {
    links: received.data?.length ?? 0,
    messages: (conversations.data ?? []).reduce((n, c) => n + c.unreadCount, 0),
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <MiniPlayer />
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const tab = TABS.find((x) => x.name === route.name);
          if (!tab) return null;
          const focused = state.index === i;
          const badge = badges[route.name] ?? 0;
          const Icon = tab.icon;
          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${t(tab.label)}, ${badge}` : t(tab.label)}
              onPress={() => {
                if (!focused) navigateToTab(route.key);
              }}
              haptic="selection"
              pressedScale={0.92}
              style={styles.item}
              testID={`tab-${route.name}`}
            >
              <View>
                <Icon size={22} color={focused ? colors.paper : colors.mist} strokeWidth={focused ? 2.1 : 1.8} />
                {badge > 0 ? (
                  <View style={styles.badge}>
                    <Text variant="micro" tone="ink" tabular>
                      {badge > 9 ? '9+' : badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="micro" tone={focused ? 'paper' : 'mist'}>
                {t(tab.label)}
              </Text>
              <View style={[styles.indicator, focused && styles.indicatorOn]} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.booth, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: space.xs },
  bar: { height: layout.tabBarHeight - 8, flexDirection: 'row', width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.signal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  indicatorOn: { backgroundColor: colors.signal },
});
