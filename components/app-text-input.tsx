import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import type { ComponentProps } from 'react';
import { forwardRef, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { ThemedView } from './themed-view';
import { tapLight } from '@/lib/haptics';

type IconName = ComponentProps<typeof IconSymbol>['name'];

type AppTextInputProps = TextInputProps & {
  leadingIcon?: IconName;
  actionIcon?: IconName;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
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
    scrollEnabled = multiline ? false : undefined,
    onContentSizeChange,
    style,
    ...inputProps
  },
  ref,
) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const measuredText = typeof inputProps.value === 'string'
    ? inputProps.value
    : typeof inputProps.defaultValue === 'string'
      ? inputProps.defaultValue
      : '';

  return (
    <ThemedView style={[styles.shell, multiline && styles.shellMultiline, containerStyle]}>
      {leadingIcon ? (
        <ThemedView style={styles.accessory}>
          <IconSymbol name={leadingIcon} size={19} color={c.primary} />
        </ThemedView>
      ) : null}
      <View style={styles.inputWrap}>
        {multiline ? (
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={[styles.measureText, style, styles.measureHidden]}
          >
            {measuredText || ' '}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          multiline={multiline}
          scrollEnabled={scrollEnabled}
          onContentSizeChange={onContentSizeChange}
          placeholderTextColor={c.muted}
          textAlignVertical="center"
          style={[styles.input, multiline && styles.inputMultiline, style]}
          {...inputProps}
        />
      </View>
      {actionIcon && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          disabled={actionDisabled}
          onPress={() => { tapLight(); onAction(); }}
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
  inputWrap: {
    flex: 1,
    minHeight: 38,
    minWidth: 0,
  },
  measureText: {
    minHeight: 38,
    color: c.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  measureHidden: { opacity: 0 },
  input: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    color: c.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  inputMultiline: {
    minHeight: 38,
  },
  action: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
