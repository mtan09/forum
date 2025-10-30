import { useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet } from 'react-native';
import ScalableImage from './scalable-image';
import { ThemedView } from './themed-view';

type ImageCarouselProps = {
  images: string[];
  height?: number;
};

export default function ImageCarousel({ images, height = 300 }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = screenWidth - 32;
  const isAdjustingRef = useRef(false);
  const showDots = images.length > 1;

  // Create extended array for infinite scroll effect
  const extendedImages = [...images, ...images, ...images];

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
          <ThemedView style={{ width: itemWidth, height }}>
            <ThemedView style={[
              styles.imageContainer,
              { width: itemWidth, height}
            ]}>
              <ScalableImage
                source={{ uri: item }}
                type="width"
                dimension={itemWidth}
                style={styles.image}
              />
            </ThemedView>
          </ThemedView>
        )}
        getItemLayout={(_, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
      />
      
      {/* Dots indicator */}
      {showDots ? (
        <ThemedView style={styles.pagination}>
          {images.map((_, index) => (
            <ThemedView
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === activeIndex ? '#B647FF' : '#E9C8FF' }
              ]}
            />
          ))}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  image: {
    borderRadius: 16,
  },
  imageContainer: {
    paddingBottom: 16,
    overflow: 'hidden',
    borderRadius: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});