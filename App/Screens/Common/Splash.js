import React, { useEffect, useState } from "react";
import { View, Text, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  ZoomIn,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Toaster from "../../../App_Utils/Services/ToastService";
import Storage from "../../../App_Utils/Services/StorageService";

const { width } = Dimensions.get("window");

const emojiData = [
  { emoji: "🥦", top: 20, left: 20, speed: 2000 },
  { emoji: "🥛", top: 20, right: 20, speed: 2500 },
  { emoji: "🧺", bottom: 30, left: 25, speed: 2200 },
  { emoji: "🍚", bottom: 40, right: 30, speed: 1800 },
  { emoji: "🧼", top: "45%", left: 10, speed: 2300 },
  { emoji: "🛒", top: "45%", right: 10, speed: 2600 },
  { emoji: "📦", bottom: 100, alignSelf: "center", speed: 2000 },
];

function PositionedEmoji({ emoji, speed, ...position }) {
  const rotate = useSharedValue(0);
  const translate = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(10, { duration: speed, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    translate.value = withRepeat(
      withTiming(10, { duration: speed, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotate.value}deg` },
      { translateY: translate.value },
    ],
    position: "absolute",
    ...position,
  }));

  return (
    <Animated.Text style={animatedStyle} className="text-5xl p-2 opacity-95">
      {emoji}
    </Animated.Text>
  );
}

export default function Splash() {
  const navigation = useNavigation();
  const [typedText, setTypedText] = useState("");
  const slogan = "OOur goal is your Satisfaction";

  const gradientOffset = useSharedValue(0);



  const CheckAlreadyLoggedIn = async () => {
    console.log("Checking logged status");
    try {
      const data = await Storage.getData("USER");
      const ROLE = await Storage.getData("ROLE");
      console.log(`Found ROLE=${ROLE}, userdata=${!!data}`);
      if (ROLE && data) {
        switch (ROLE.toUpperCase()) {
          case "ADMIN":
            navigation.replace("AdminDashboardScreen");
            break;
          case "PARTNER":
            navigation.replace("PartnerDashboard");
            break;
          case "USER":
            navigation.replace("Main");
            break;
          // case "ACCOUNTS":
          //   navigation.replace("AccountsDashboard");
          //   break;
          // case "SALESMAN":
          //   navigation.replace("SalesmanDashboard");
          //   break;
          // case "PRODUCTION":
          //   navigation.replace("ProductionDashboard");
          //   break;
          // case "DISPATCH":
          //   navigation.replace("DispatchDashboard");
          //   break;
          // case "DELIVERY":
          //   navigation.replace("DeliveryDashboard");
          //   break;
          default:
            navigation.replace("Login");
            break;
        }
      } else {
        navigation.replace("Login");
      }
    } catch (err) {
      Toaster.errortop("Failed to check login status");
      console.log(`CheckLoggedStatus error: ${err.message}`);
    }
  };

  // useEffect(() => {
  //   CheckAlreadyLoggedIn();
  // }, []);


  useEffect(() => {
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index < slogan.length - 1) {
        setTypedText((prev) => prev + slogan[index]);
        index++;
      } else {
        clearInterval(typeInterval);
      }
    }, 100);

    return () => clearInterval(typeInterval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      CheckAlreadyLoggedIn()
      // navigation.replace("Login");
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    gradientOffset.value = withRepeat(
      withTiming(width, {
        duration: 8000,
        easing: Easing.linear,
      }),
      -1
    );
  }, []);

  const gradientStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -gradientOffset.value }],
  }));

  return (
    <View className="flex-1">
      {/* Animated Gradient Background */}
      <Animated.View style={[{ position: "absolute", width: width * 2, height: "100%" }, gradientStyle]}>
        <LinearGradient
          colors={["#a18cd1", "#fbc2eb", "#a18cd1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: "100%", height: "100%" }}
        />
      </Animated.View>

      {/* Foreground Content */}
      <View className="flex-1 justify-center items-center">
        {emojiData.map((item, index) => (
          <PositionedEmoji key={index} {...item} />
        ))}

        <Animated.View entering={ZoomIn.delay(100)}>
          <Image cachePolicy="disk"
            source={require("../../../assets/logo.jpg")}
            className="w-48 h-48 mb-6"

            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          entering={FadeIn.delay(300)}
          className="text-4xl font-extrabold text-green-600 tracking-wider"
          style={{
            textShadowColor: "rgba(34,197,94,0.5)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
          }}
        >
          Dear Basket
        </Animated.Text>

        <Text
          className="text-base text-gray-700 mt-2 tracking-wide font-medium text-center"
          style={{
            textShadowColor: "rgba(0,0,0,0.05)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}
        >
          {typedText}
        </Text>
      </View>
    </View>
  );
}
