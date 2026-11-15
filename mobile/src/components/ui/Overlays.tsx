/**
 * App-wide overlays: toasts and confirmation dialogs.
 * React Native's Alert does not support multi-button dialogs on the web,
 * so confirmations use this cross-platform dialog instead.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { useToast } from '../../state/toast';
import { colors, layout, radius, space } from '../../theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export function ToastHost() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.toastLayer, { top: insets.top + space.sm }]}>
      {toasts.map((x) => (
        <Animated.View key={x.id} entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(160)}>
          <Pressable
            onPress={() => dismiss(x.id)}
            accessibilityRole="alert"
            style={[styles.toast, x.tone === 'error' && styles.toastError]}
          >
            {x.tone === 'neutral' ? <View style={styles.toastDot} /> : null}
            <Text variant="label" tone={x.tone === 'error' ? 'clip' : 'paper'} style={styles.toastText}>
              {x.message}
            </Text>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

interface DialogRequest {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
}

const useDialog = create<{ current: DialogRequest | null; set: (d: DialogRequest | null) => void }>((set) => ({
  current: null,
  set: (current) => set({ current }),
}));

export function confirm(opts: Omit<DialogRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => useDialog.getState().set({ ...opts, resolve }));
}

export function DialogHost() {
  const current = useDialog((s) => s.current);
  const set = useDialog((s) => s.set);
  const close = (ok: boolean) => {
    current?.resolve(ok);
    set(null);
  };
  return (
    <Modal visible={!!current} transparent animationType="fade" onRequestClose={() => close(false)}>
      <Pressable style={styles.backdrop} onPress={() => close(false)} accessibilityLabel={current?.cancelLabel}>
        <Pressable style={styles.dialog} onPress={() => undefined} accessibilityViewIsModal>
          <Text variant="heading">{current?.title}</Text>
          {current?.body ? (
            <Text variant="body" tone="mist">
              {current.body}
            </Text>
          ) : null}
          <View style={styles.dialogActions}>
            <Button label={current?.cancelLabel ?? ''} variant="ghost" onPress={() => close(false)} testID="dialog-cancel" />
            <Button
              label={current?.confirmLabel ?? ''}
              variant={current?.destructive ? 'danger' : 'primary'}
              onPress={() => close(true)}
              testID="dialog-confirm"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toastLayer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: space.sm, zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: layout.maxContentWidth - 32,
    marginHorizontal: space.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.tile,
    backgroundColor: colors.rack,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  toastError: { borderColor: 'rgba(255,107,115,0.35)' },
  toastDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.signal },
  toastText: { flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: space.xl },
  dialog: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.card,
    backgroundColor: colors.desk,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, marginTop: space.sm },
});
