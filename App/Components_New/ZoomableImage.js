import React from "react";
import { Dimensions } from "react-native";
import { Image } from "expo-image";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const ZoomableImage = ({ source, style }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // Add bounds checking function
  const clampTranslation = (translationValue, scaledSize, containerSize) => {
    "worklet";
    const maxTranslation = (scaledSize - containerSize) / 2;
    return Math.max(-maxTranslation, Math.min(maxTranslation, translationValue));
  };

  // Pinch zoom with constraints
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      // Constrain scale between 0.5 and 5
      scale.value = Math.max(0.5, Math.min(5, newScale));
    })
    .onEnd(() => {
      // Ensure minimum scale of 1
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture with bounds checking
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        const newX = savedX.value + e.translationX;
        const newY = savedY.value + e.translationY;
        
        // Apply bounds checking
        const scaledWidth = width * scale.value;
        const scaledHeight = height * scale.value;
        
        translateX.value = clampTranslation(newX, scaledWidth, width);
        translateY.value = clampTranslation(newY, scaledHeight, height);
      }
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        // Reset position when not zoomed
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
      } else {
        savedX.value = translateX.value;
        savedY.value = translateY.value;
      }
    });

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        // Reset to original size and position
        scale.value = withTiming(1, { duration: 300 });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 300 });
        translateY.value = withTiming(0, { duration: 300 });
        savedX.value = 0;
        savedY.value = 0;
      } else {
        // Zoom in to 2x
        scale.value = withTiming(2, { duration: 300 });
        savedScale.value = 2;
        // Center the zoom
        translateX.value = withTiming(0, { duration: 300 });
        translateY.value = withTiming(0, { duration: 300 });
        savedX.value = 0;
        savedY.value = 0;
      }
    });

  // Use Race instead of Simultaneous for better gesture handling
  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          { 
            width, 
            height, 
            justifyContent: "center", 
            alignItems: "center",
            overflow: 'hidden' // Prevent content from going outside bounds
          },
          style
        ]}
      >
        <Animated.View style={animatedStyle}>
          <Image
            source={source}
            style={{ width: width, height: height }}
            contentFit="contain"
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

export default ZoomableImage;