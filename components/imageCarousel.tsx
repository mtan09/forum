import { useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, ViewToken } from 'react-native';
import ScalableImage from './scalable-image';
import { ThemedView } from './themed-view';

type ImageCarouselProps = {
  images: string[];
  height?: number;
};

export default function ImageCarousel({ images, height = 200 }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get('window').width;

  // Create extended array for infinite scroll effect
  const extendedImages = [...images, ...images, ...images];

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      setActiveIndex(newIndex % images.length);
      
      // If we're at the end of extended array, jump back to middle set
      if (newIndex >= images.length * 2) {
        flatListRef.current?.scrollToIndex({
          index: newIndex - images.length,
          animated: false
        });
      }
      // If we're at the start, jump to middle set
      else if (newIndex < images.length) {
        flatListRef.current?.scrollToIndex({
          index: newIndex + images.length,
          animated: false
        });
      }
    }
  }).current;

  return (
    <ThemedView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={extendedImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={images.length}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <ThemedView style={{ width: screenWidth - 32, height }}>
            <ThemedView style={[
              styles.imageContainer,
              { width: screenWidth - 32, height}
            ]}>
              <ScalableImage
                source={{ uri: item }}
                type="width"
                dimension={screenWidth - 32}
                style={styles.image}
              />
            </ThemedView>
          </ThemedView>
        )}
        getItemLayout={(_, index) => ({
          length: screenWidth - 32,
          offset: (screenWidth - 32) * index,
          index,
        })}
      />
      
      {/* Dots indicator */}
      <ThemedView style={styles.pagination}>
        {images.map((_, index) => (
          <ThemedView
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index === activeIndex ? '#592EDC' : '#BAA8F0' }
            ]}
          />
        ))}
      </ThemedView>
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