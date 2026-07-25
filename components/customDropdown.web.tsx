import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

type Props = {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  containerStyle?: ViewStyle;
  title?: string;
  subtitle?: string;
};

export function CustomDropdown({
  options,
  value,
  onValueChange,
  containerStyle,
  title = 'Choose an option',
  subtitle,
}: Props) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <ThemedText numberOfLines={1} style={styles.value}>{value}</ThemedText>
        <IconSymbol name="chevron.down" size={18} color={c.primary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.dialog} onPress={(event) => event.stopPropagation()}>
            <View style={styles.header}>
              <View style={styles.headingCopy}>
                <ThemedText style={styles.title}>{title}</ThemedText>
                {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              >
                <IconSymbol name="xmark" size={19} color={c.muted} />
              </Pressable>
            </View>

            <View style={styles.options}>
              {options.map((option) => {
                const selected = option === value;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      onValueChange(option);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <ThemedText style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  trigger: {
    minWidth: 210,
    maxWidth: 300,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.surfaceMuted,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  value: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.scrim,
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.overlayCard,
    padding: 20,
    boxShadow: `0 12px 30px ${c.shadow}3D`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  headingCopy: {
    flex: 1,
  },
  title: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceMuted,
  },
  options: {
    gap: 7,
  },
  option: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  optionSelected: {
    borderColor: c.cardBorder,
    backgroundColor: c.accentSoftBg,
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: c.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: c.primary,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: c.primary,
  },
  optionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: c.primary,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.62,
  },
});
