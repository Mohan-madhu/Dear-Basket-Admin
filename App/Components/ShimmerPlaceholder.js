// ShimmerPlaceholder.jsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const ShimmerPlaceholder = ({ style, loading, children }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      // start shimmering
      progress.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      // reset progress so the gradient is off-screen
      progress.value = 0;
    }
  }, [loading]);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-style.width, style.width]
    );
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={[style, { backgroundColor: '#E1E9EE', overflow: 'hidden' }]}>
      {loading && (
        <Animated.View style={[{ width: '30%', height: '100%' }, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
            start={[0, 0.5]}
            end={[1, 0.5]}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
      {!loading && children}
    </View>
  );
};

export default ShimmerPlaceholder;
