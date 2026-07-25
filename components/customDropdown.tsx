import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

interface CustomDropdownProps {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  containerStyle?: ViewStyle;
  title?: string;
  subtitle?: string;
}

export function CustomDropdown({ 
  options, 
  value, 
  onValueChange,
  containerStyle,
  title = 'Choose an option',
  subtitle,
}: CustomDropdownProps) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <Pressable 
        style={styles.trigger}
        onPress={() => setIsOpen(!isOpen)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <ThemedText style={styles.selectedText}>{value}</ThemedText>
        <IconSymbol 
          name="chevron.down"
          size={18}
          color={c.primary}
        />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>{title}</ThemedText>
              {subtitle && <ThemedText style={styles.sheetSubtitle}>{subtitle}</ThemedText>}
            </View>
            <View style={styles.optionsContainer}>
            {options.map((option) => (
              <Pressable
                key={option}
                style={({ pressed }) => [
                  styles.option,
                  value === option && styles.selectedOption,
                  pressed && styles.pressedOption,
                ]}
                onPress={() => {
                  onValueChange(option);
                  setIsOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: value === option }}
              >
                <ThemedText style={[styles.optionText, value === option && styles.selectedOptionText]}>
                  {option}
                </ThemedText>
                <View style={[styles.radio, value === option && styles.radioSelected]}>
                  {value === option && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingHorizontal: 12,
    minHeight: 40,
    borderRadius: 12,
    minWidth: 190,
  },
  selectedText: {
    color: c.text,
    fontSize: 14,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: c.scrim,
  },
  sheet: {
    backgroundColor: c.overlayCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.faint,
    marginBottom: 18,
  },
  sheetHeader: {
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  sheetSubtitle: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  option: {
    minHeight: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  selectedOption: {
    backgroundColor: c.accentSoftBg,
  },
  pressedOption: {
    opacity: 0.65,
  },
  optionText: {
    color: c.text,
    fontSize: 15,
    fontWeight: '600',
  },
  selectedOptionText: {
    color: c.primary,
    fontWeight: '800',
  },
  optionsContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
  },
  radio: {
    width: 20,
    height: 20,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.primary,
  },
});
