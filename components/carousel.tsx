import { usePalette } from '@/hooks/use-palette';
import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

type CarouselProps<T> = {
  data: T[];
  renderItem: (info: { item: T; index: number; size: number }) => React.ReactElement | null;
  keyExtractor?: (item: T, index: number) => string;
  pageWidth?: number; // if not provided, uses screenWidth - 2*horizontalPadding
  horizontalPadding?: number; // default 16; pageWidth = screenWidth - 2*horizontalPadding
  initialIndex?: number; // index within data
  pagingEnabled?: boolean; // default true
  decelerationRate?: 'fast' | number; // default 'fast'
  showsHorizontalScrollIndicator?: boolean; // default false
  containerStyle?: ViewStyle;
  onIndexChange?: (index: number) => void;
  renderPagination?: (activeIndex: number, count: number) => React.ReactNode;
  showPagination?: boolean; // default: true
  dotActiveColor?: string; // defaults to the strong primary-purple token
  dotInactiveColor?: string; // defaults to the muted primary-purple token
  dotSize?: number; // default: 8
  dotSpacing?: number; // default: 8
  paginationContainerStyle?: ViewStyle;
  showControls?: boolean;
};

export default function Carousel<T>({
  data,
  renderItem,
  keyExtractor,
  pageWidth,
  horizontalPadding = 16,
  initialIndex = 0,
  pagingEnabled = true,
  decelerationRate = 'fast',
  showsHorizontalScrollIndicator = false,
  containerStyle,
  onIndexChange,
  renderPagination,
  showPagination = true,
  dotActiveColor,
  dotInactiveColor,
  dotSize = 8,
  dotSpacing = 8,
  paginationContainerStyle,
  showControls = false,
}: CarouselProps<T>) {
  const { c } = usePalette();
  const activeDot = dotActiveColor ?? c.accentDeep;
  const inactiveDot = dotInactiveColor ?? c.accentFaint;
  const flatListRef = useRef<FlatList<T>>(null);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, Math.min(initialIndex, Math.max(0, data.length - 1))));
  const isAdjustingRef = useRef(false);

  const screenWidth = Dimensions.get('window').width;
  const itemSize = Math.max(1, pageWidth ?? screenWidth - 2 * horizontalPadding);

  const extendedData = useMemo(() => {
    if (!data || data.length === 0) return [] as T[];
    return [...data, ...data, ...data];
  }, [data]);

  if (!data || data.length === 0) {
    return <View style={[styles.container, containerStyle]} />;
  }

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / itemSize);
    const normalized = ((index % data.length) + data.length) % data.length;
    setActiveIndex((prev) => {
      if (prev !== normalized) onIndexChange?.(normalized);
      return normalized;
    });

    if (index >= data.length * 2 || index < data.length) {
      if (isAdjustingRef.current) return;
      isAdjustingRef.current = true;
      const target = index >= data.length * 2 ? index - data.length : index + data.length;
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index: target, animated: false });
        isAdjustingRef.current = false;
      });
    }
  };

  const initialScrollIndex = data.length + activeIndex;

  const moveBy = (delta: number) => {
    const next = (activeIndex + delta + data.length) % data.length;
    setActiveIndex(next);
    onIndexChange?.(next);
    flatListRef.current?.scrollToIndex({
      index: data.length + next,
      animated: true,
    });
  };

  // Build unique keys for extended (looped) items to avoid duplicate keys
  const getExtendedKey = (_: T, extendedIndex: number) => {
    const baseIndex = data.length > 0 ? extendedIndex % data.length : 0;
    const baseItem = data[baseIndex];
    const userKey = keyExtractor ? keyExtractor(baseItem, baseIndex) : String(baseIndex);
    const cycle = Math.floor(extendedIndex / data.length);
    return `${cycle}-${userKey}`;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <FlatList
        ref={flatListRef}
        data={extendedData}
        horizontal
        pagingEnabled={pagingEnabled}
        decelerationRate={decelerationRate}
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        keyExtractor={getExtendedKey}
        initialScrollIndex={initialScrollIndex}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({
          length: itemSize,
          offset: itemSize * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <View style={{ width: itemSize }}>
            {renderItem({ item, index: index % data.length, size: itemSize })}
          </View>
        )}
      />

      {showControls && Platform.OS === 'web' && data.length > 1 && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous topic"
            onPress={() => moveBy(-1)}
            style={({ pressed }) => [styles.control, styles.controlPrevious, pressed && styles.controlPressed]}
          >
            <Text style={styles.controlText}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next topic"
            onPress={() => moveBy(1)}
            style={({ pressed }) => [styles.control, styles.controlNext, pressed && styles.controlPressed]}
          >
            <Text style={styles.controlText}>›</Text>
          </Pressable>
        </>
      )}

      {renderPagination
        ? renderPagination(activeIndex, data.length)
        : showPagination && data.length > 1 && (
            <View style={[styles.pagination, paginationContainerStyle]}>
              {Array.from({ length: data.length }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                      marginHorizontal: dotSpacing / 2,
                      backgroundColor: i === activeIndex ? activeDot : inactiveDot,
                    },
                  ]}
                />
              ))}
            </View>
          )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  dot: {
    // sized dynamically
  },
  control: {
    position: 'absolute',
    top: '50%',
    width: 32,
    height: 32,
    marginTop: -16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    cursor: 'pointer',
  },
  controlPrevious: {
    left: 24,
  },
  controlNext: {
    right: 24,
  },
  controlPressed: {
    opacity: 0.65,
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 27,
    lineHeight: 28,
    fontWeight: '600',
    marginTop: -2,
  },
});
