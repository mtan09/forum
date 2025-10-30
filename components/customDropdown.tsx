import React, { useState } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

interface CustomDropdownProps {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  containerStyle?: ViewStyle;
}

export function CustomDropdown({ 
  options, 
  value, 
  onValueChange,
  containerStyle 
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <Pressable 
        style={styles.trigger}
        onPress={() => setIsOpen(!isOpen)}
      >
        <ThemedText style={styles.selectedText}>{value}</ThemedText>
        <IconSymbol 
          name={isOpen ? "chevron.up" : "chevron.right"} 
          size={16} 
          color="#592EDC" 
        />
      </Pressable>

      {isOpen && (
        <ThemedView style={styles.optionsList}>
          <ThemedView style={styles.optionsContainer}>
            {options.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.option,
                  value === option && styles.selectedOption
                ]}
                onPress={() => {
                  onValueChange(option);
                  setIsOpen(false);
                }}
              >
                <ThemedText style={[
                  styles.optionText,
                  value === option && styles.selectedOptionText
                ]}>
                  {option}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E9C8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 200,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionsList: {
    position: 'absolute',
    bottom: "100%",
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  option: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#f5f0ff',
  },
  optionText: {
    fontSize: 14,
  },
  selectedOptionText: {
    color: '#B647FF',
    fontWeight: '600',
  },
  optionsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
});