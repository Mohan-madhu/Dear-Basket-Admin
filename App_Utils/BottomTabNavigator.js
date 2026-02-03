import React, { useRef, useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import LottieView from "lottie-react-native";
import { View } from "react-native";

import AdminDashboard from "../App/Screens/AdminDashboard";
import PartnerDashboard from "../App/Screens/PartnerDashboard";
import UserDashboard from "../App/Screens/UserDashboard";
import QRCodeScreen from "../App/Screens/QRCodeScreen";
import ScannerScreen from "../App/Screens/QRCodeScreen";
import HomeScreen from "../App/Screens/HomeScreen";
import MyOrdersScreen from "../App/Screens/UserOrdersScreen";
const Tab = createBottomTabNavigator();

const LottieTabIcon = ({
  source,
  focused,
  freezeAt = 2000,
  duration = 4000,
  size = 50,
}) => {
  const animationRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressValue = freezeAt / duration;
    setProgress(progressValue);
  }, [freezeAt, duration]);

  useEffect(() => {
    if (focused) {
      animationRef.current?.play();
    } else {
      animationRef.current?.reset();
    }
  }, [focused]);

  return (
    <View style={{ width: size, height: size }}>
      <LottieView
        ref={animationRef}
        source={source}
        autoPlay={false}
        loop={focused}
        progress={!focused ? progress : undefined}
        style={{ width: "100%", height: "100%", resizeMode: "contain" }}
      />
    </View>
  );
};

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: true,
        headerShown: false,
        tabBarStyle: { height: 60, paddingBottom: 5 },
        tabBarIcon: ({ focused }) => {
          if (route.name === "Home")
            return (
              <LottieTabIcon
                source={require("../assets/animations/home.json")}
                focused={focused}
                size={50}
                freezeAt={35}
                duration={120}
              />
            );
          else if (route.name === "Order History")
            return (
              <LottieTabIcon
                source={require("../assets/animations/orderhistory.json")}
                focused={focused}
                size={40}
                freezeAt={41}
                duration={49}
              />
            );
          else if (route.name === "Settings")
            return (
              <LottieTabIcon
                source={require("../assets/animations/settings.json")}
                focused={focused}
                size={34}
                freezeAt={38}
                duration={40}
              />
            );
          else if (route.name === "QR Code")
            return (
              <LottieTabIcon
                source={require("../assets/animations/qr.json")}
                focused={focused}
                size={33}
                freezeAt={60}
                duration={150}
              />
            );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      {/* <Tab.Screen name="Order History" component={PartnerDashboard} /> */}
      <Tab.Screen name="Order History" component={MyOrdersScreen} />
      <Tab.Screen name="Settings" component={UserDashboard} />
      <Tab.Screen name="QR Code" component={ScannerScreen} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
