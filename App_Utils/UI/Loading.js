import React, { useEffect, useRef, useState } from "react";
import { Animated, Text } from "react-native";
import { useLoading } from "../Contexts/LoadingContext";
import LottieView from "lottie-react-native";

export default function Loading() {
  const { loading, loadingText } = useLoading();
  if (loading)
    console.log(" ----------- " + loadingText);
  const animations = [
    {
      source: require("../../assets/animations/milk.json"),
      width: 500,
      height: 500,
      mt: "30%",
    },
    // {
    //   source: require("../../assets/milk.json"),
    //   width: 900,
    //   height: 900,
    //   mt: "60%",
    // },
    // {
    //   source: require("../../assets/milk.json"),
    //   width: 600,
    //   height: 600,
    //   mt: "40%",
    // },
    // {
    //   source: require("../../assets/milk.json"),
    //   width: 500,
    //   height: 500,
    //   mt: "30%",
    // },
  ];

  const [currentAnimation, setCurrentAnimation] = useState(animations[0]); // Initialize with the first animation

  useEffect(() => {
    // Pick a random animation when the component mounts (or re-renders)
    const randomIndex = Math.floor(Math.random() * animations.length);
    setCurrentAnimation(animations[randomIndex]);
    //console.log(randomIndex);
  }, [loading]); // Empty dependency array ensures this runs only once after the initial render

  // keep the Animated.Value stable across renders
  const opacity = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef(null);

  useEffect(() => {
    if (loading) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start(() => lottieRef.current?.play());
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => lottieRef.current?.reset());
    }
  }, [loading, opacity]);

  if (!loading) return null;

  return (
    <Animated.View
      className="absolute inset-0 z-50  flex-1 items-center justify-center bg-white/70"
      style={{ opacity }} // Animated style stays outside className
    >
      {/* <LottieView
        className="mb-20"
        source={require("../../assets/loading.json")}
        autoPlay
        loop
        speed={1.5}
        style={{ width: 450, height: 450 }}
      /> */}
      <LottieView
        source={currentAnimation.source}
        autoPlay
        loop
        speed={1.5}
        style={{
          width: currentAnimation.width,
          height: currentAnimation.height,
        }}
      />
      {loadingText && (
        <Text
          className={`pt-5 text-2xl font-extrabold text-black text-center self-center`}
          style={{ marginTop: `-${currentAnimation.mt}`, textAlign: "center" }}
        >
          {loadingText}
        </Text>
      )}
    </Animated.View>
  );
}
