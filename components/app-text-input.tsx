import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import type { ComponentProps } from 'react';
import { forwardRef, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { ThemedView } from './themed-view';

type IconName = ComponentProps<typeof IconSymbol>['name'];

type AppTextInputProps = TextInputProps & {
  leadingIcon?: IconName;
  actionIcon?: IconName;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  containerStyle?: ViewStyle;
};

/**
 * The shared forum input shell used by search, comments, and forumAI.
 * Accessories may differ by task, but size, typography, spacing, border,
 * surfaces, and enabled/disabled action treatment stay identical.
 */
const AppTextInput = forwardRef<TextInput, AppTextInputProps>(function AppTextInput(
  {
    leadingIcon,
    actionIcon,
    actionLabel,
    actionDisabled = false,
    onAction,
    containerStyle,
    multiline = false,
    style,
    ...inputProps
  },
  ref,
) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <ThemedView style={[styles.shell, multiline && styles.shellMultiline, containerStyle]}>
      {leadingIcon ? (
        <ThemedView style={styles.accessory}>
          <IconSymbol name={leadingIcon} size={19} color={c.primary} />
        </ThemedView>
      ) : null}
      <TextInput
        ref={ref}
        multiline={multiline}
        placeholderTextColor={c.muted}
        textAlignVertical="center"
        style={[styles.input, multiline && styles.inputMultiline, style]}
        {...inputProps}
      />
      {actionIcon && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          disabled={actionDisabled}
          onPress={onAction}
          style={[
            styles.action,
            { backgroundColor: actionDisabled ? c.surfaceMuted : c.primary },
          ]}
        >
          <IconSymbol
            name={actionIcon}
            size={18}
            color={actionDisabled ? c.textDisabled : c.onPrimary}
          />
        </Pressable>
      ) : null}
    </ThemedView>
  );
});

export default AppTextInput;

const makeStyles = (c: Palette) => StyleSheet.create({
  shell: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.accentFaint,
    backgroundColor: c.card,
    paddingLeft: 8,
    paddingRight: 7,
    paddingVertical: 7,
  },
  shellMultiline: {
    alignItems: 'flex-end',
  },
  accessory: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.accentSoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 38,
    color: c.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  inputMultiline: {
    maxHeight: 96,
  },
  action: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
