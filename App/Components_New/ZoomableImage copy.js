// import React, { useRef } from 'react';
// import { View, PanResponder, Dimensions } from 'react-native';
// import { Image } from "expo-image";

// const ZoomableImage = ({ source, style }) => {
//   const scale = useRef(1).current;
//   const position = useRef({ x: 0, y: 0 }).current;
//   const lastScale = useRef(1).current;
//   const lastPosition = useRef({ x: 0, y: 0 }).current;

//   const panResponder = PanResponder.create({
//     onStartShouldSetPanResponder: () => true,
//     onPanResponderMove: (evt, gestureState) => {
//       position.x = lastPosition.x + gestureState.dx;
//       position.y = lastPosition.y + gestureState.dy;

//       // Update the view
//       this._root.setNativeProps({
//         style: {
//           transform: [
//             { translateX: position.x },
//             { translateY: position.y },
//             { scale: scale }
//           ]
//         }
//       });
//     },
//     onPanResponderRelease: () => {
//       lastPosition.x = position.x;
//       lastPosition.y = position.y;
//     },
//     onPanResponderTerminate: () => {
//       lastPosition.x = position.x;
//       lastPosition.y = position.y;
//     }
//   });

//   return (
//     <View
//       ref={ref => this._root = ref}
//       {...panResponder.panHandlers}
//       style={{ transform: [{ scale }] }}
//     >


//       <Image
//         cachePolicy="memory-disk"
//         source={source}
//         style={style}
//         contentFit='contain'
//         resizeMode="contain"
//       />
//     </View>
//   );
// };

// export default ZoomableImage;

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
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const ZoomableImage = ({ source, style }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // Pinch zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Pan (drag) when zoomed
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedX.value + e.translationX;
        translateY.value = savedY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  // Double tap to zoom in/out
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
      } else {
        scale.value = withTiming(2); // zoom in
        savedScale.value = 2;
      }
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
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
          { width, height, justifyContent: "center", alignItems: "center" },
          animatedStyle,
        ]}
      >
        <Image
          source={source}
          style={[{ width: width, height: height }, style]}
          contentFit="contain"
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
};

export default ZoomableImage;
  