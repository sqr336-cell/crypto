import type { LucideIcon } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, space } from '../../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface MenuAction {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
  testID?: string;
}

/** Bottom action sheet (works the same on iOS, Android and web). */
export function Menu({ visible, onClose, actions, cancelLabel }: { visible: boolean; onClose: () => void; actions: MenuAction[]; cancelLabel: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={cancelLabel}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          {actions.map((a) => (
            <PressableScale
              key={a.label}
              style={styles.item}
              accessibilityRole="button"
              testID={a.testID}
              onPress={() => {
                onClose();
                a.onPress();
              }}
            >
              <a.icon size={20} color={a.destructive ? colors.clip : colors.paper} />
              <Text variant="bodyStrong" tone={a.destructive ? 'clip' : 'paper'}>
                {a.label}
              </Text>
            </PressableScale>
          ))}
          <PressableScale style={[styles.item, styles.cancel]} onPress={onClose} accessibilityRole="button">
            <Text variant="bodyStrong" tone="mist" align="center" style={styles.flex}>
              {cancelLabel}
            </Text>
          </PressableScale>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    backgroundColor: colors.desk,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: space.lg,
    gap: space.xs,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.lg, height: 56, paddingHorizontal: space.lg, borderRadius: radius.tile },
  cancel: { marginTop: space.sm, backgroundColor: colors.rack },
  flex: { flex: 1 },
});
