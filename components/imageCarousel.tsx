import { useMemo, useRef, useState } from 'react';
import { FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

type ImageCarouselProps = {
  images: string[];
  height?: number;
};

export default function ImageCarousel({ images: allImages, height = 300 }: ImageCarouselProps) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const itemWidth = containerWidth || Math.max(1, windowWidth - 32);
  const isAdjustingRef = useRef(false);

  // Article media URLs aren't guaranteed to load (dead links, hotlink
  // blocking) — anything that errors is dropped instead of showing a
  // blank frame.
  const [failedUris, setFailedUris] = useState<Set<string>>(new Set());
  const images = useMemo(
    () => allImages.filter((u) => !failedUris.has(u)),
    [allImages, failedUris]
  );

  // Create extended array for infinite scroll effect
  const extendedImages = [...images, ...images, ...images];

  if (images.length === 0) return null;

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / itemWidth);
    const normalized = ((index % images.length) + images.length) % images.length;
    setActiveIndex(normalized);

    // Re-center when hitting the edges of the extended list, without animation
    if (index >= images.length * 2 || index < images.length) {
      if (isAdjustingRef.current) return;
      isAdjustingRef.current = true;
      const target =
        index >= images.length * 2 ? index - images.length : index + images.length;
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index: target, animated: false });
        isAdjustingRef.current = false;
      });
    }
  };

  const moveBy = (delta: number) => {
    const next = (activeIndex + delta + images.length) % images.length;
    setActiveIndex(next);
    flatListRef.current?.scrollToIndex({
      index: images.length + next,
      animated: true,
    });
  };

  return (
    <ThemedView
      style={styles.container}
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        if (next > 0 && next !== containerWidth) setContainerWidth(next);
      }}
    >
      <FlatList
        key={`carousel-${itemWidth}`}
        ref={flatListRef}
        data={extendedImages}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        removeClippedSubviews={false}
        keyExtractor={(_, i) => String(i)}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={images.length}
        onMomentumScrollEnd={handleMomentumEnd}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <ThemedView style={[styles.imageContainer, { width: itemWidth, height }]}>
            {/* Fixed frame + cover crop: every slide occupies the same
                space regardless of the source image's dimensions */}
            <Image
              source={{ uri: item }}
              style={[styles.image, { width: itemWidth, height }]}
              resizeMode="cover"
              onError={() => setFailedUris((prev) => new Set(prev).add(item))}
            />
          </ThemedView>
        )}
        getItemLayout={(_, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
      />

      {/* Counter pill instead of dots — scales to any number of images */}
      {images.length > 1 && (
        <>
          <ThemedView style={styles.counter}>
            <ThemedText style={styles.counterText}>
              {Math.min(activeIndex + 1, images.length)} / {images.length}
            </ThemedText>
          </ThemedView>
          {Platform.OS === 'web' && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous image"
                onPress={() => moveBy(-1)}
                style={({ pressed }) => [styles.control, styles.previous, pressed && styles.pressed]}
              >
                <IconSymbol name="chevron.left" size={20} color={c.onImage} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next image"
                onPress={() => moveBy(1)}
                style={({ pressed }) => [styles.control, styles.next, pressed && styles.pressed]}
              >
                <IconSymbol name="chevron.right" size={20} color={c.onImage} />
              </Pressable>
            </>
          )}
        </>
      )}
    </ThemedView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 8,
  },
  image: {
    borderRadius: 16,
  },
  imageContainer: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: c.imageControlBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  counterText: {
    color: c.onImage,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  control: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    marginTop: -20,
    borderRadius: 20,
    backgroundColor: c.imageControlBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previous: {
    left: 12,
  },
  next: {
    right: 12,
  },
  pressed: {
    opacity: 0.62,
  },
});
