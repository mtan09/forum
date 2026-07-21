import { useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, StyleSheet } from 'react-native';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type ImageCarouselProps = {
  images: string[];
  height?: number;
};

export default function ImageCarousel({ images: allImages, height = 300 }: ImageCarouselProps) {
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = screenWidth - 32;
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

  return (
    <ThemedView style={styles.container}>
      <FlatList
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
        <ThemedView style={styles.counter}>
          <ThemedText style={styles.counterText}>
            {Math.min(activeIndex + 1, images.length)} / {images.length}
          </ThemedText>
        </ThemedView>
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
});
