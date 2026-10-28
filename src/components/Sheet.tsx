import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { AppText, Button, FormAlert } from "@/components/ui";
import { colors, radius } from "@/lib/colors";

/** Website Modal, as a bottom sheet. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  scroll = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.root}>
          <Pressable
            accessibilityLabel="Close dialog"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.grabber} />
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <AppText variant="title" style={{ fontSize: 18 }}>
                  {title}
                </AppText>
                {description ? (
                  <AppText variant="caption" style={{ marginTop: 4, lineHeight: 18 }}>
                    {description}
                  </AppText>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel="Close"
                onPress={onClose}
                hitSlop={10}
                style={styles.close}
              >
                <Icon name="close" size={14} color={colors.muted} weight="bold" />
              </Pressable>
            </View>
            {scroll ? (
              <ScrollView
                style={{ flexGrow: 0 }}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.body, { flexShrink: 1 }]}>{children}</View>
            )}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Website ConfirmModal. */
export function ConfirmModal({
  open,
  title,
  question,
  detail,
  confirmLabel,
  cancelLabel = "Cancel",
  pendingLabel,
  pending = false,
  error = null,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  question: string;
  detail?: string;
  confirmLabel: string;
  cancelLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={title}
      footer={
        <>
          <Button
            label={pending ? pendingLabel ?? confirmLabel : confirmLabel}
            variant="danger"
            full
            loading={false}
            disabled={pending}
            onPress={onConfirm}
          />
          <Button
            label={cancelLabel}
            variant="secondary"
            full
            disabled={pending}
            onPress={onClose}
          />
        </>
      }
    >
      <AppText variant="body" style={{ fontSize: 15 }}>
        {question}
      </AppText>
      {detail ? (
        <AppText variant="caption" style={{ marginTop: 8, fontSize: 13, lineHeight: 19 }}>
          {detail}
        </AppText>
      ) : null}
      {error ? (
        <View style={{ marginTop: 12 }}>
          <FormAlert error={error} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    maxHeight: "88%",
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  body: { paddingHorizontal: 20, paddingVertical: 16 },
  footer: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
});
