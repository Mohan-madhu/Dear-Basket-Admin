import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView,  Animated } from 'react-native';
import { Image } from 'expo-image';
const ImageCarousel = ({ images, time = 3 }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Duplicate the images array for infinite scrolling
  const extendedImages = [...images, ...images];

  // Auto-scroll logic
  useEffect(() => {
    const autoScroll = setInterval(() => {
      scrollViewRef.current.scrollTo({
        x: (activeIndex + 1) * containerWidth,
        animated: true
      });
    }, time * 1000); // Change image every 3 seconds

    return () => clearInterval(autoScroll);
  }, [activeIndex, containerWidth]);

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / containerWidth) % images.length; // Use modulo for infinite scroll effect
    setActiveIndex(currentIndex);
  };

  const handleMomentumScrollEnd = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const totalWidth = containerWidth * images.length;

    if (contentOffsetX >= totalWidth) {
      scrollViewRef.current.scrollTo({ x: 0, animated: false }); // Reset to first image
    }
  };

  return (
    <View 
      style={styles.container}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width); // Dynamically set the width based on parent container size
      }}
    >
      {containerWidth > 0 && (
        <>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false, listener: handleScroll }
            )}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            contentContainerStyle={{ width: containerWidth * extendedImages.length }}
          >
            {extendedImages.map((image, index) => (
              <Image  cachePolicy="memory-disk" key={index} source={{ uri: image }} style={[styles.image, { width: containerWidth }]} />
            ))}
          </ScrollView>
          <View style={styles.pagination}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { opacity: index === activeIndex ? 1 : 0.3 }
                ]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    height: 250,
    borderRadius: 7,
    resizeMode: 'cover'
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10
  },
  dot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    marginHorizontal: 5
  }
});

export default ImageCarousel;
