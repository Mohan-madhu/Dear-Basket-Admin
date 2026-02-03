import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import Toaster from "../../../App_Utils/Services/ToastService";
import Storage from "../../../App_Utils/Services/StorageService";

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const { width } = Dimensions.get("window");
  const cardWidth = width * 0.45;

  // Gradient color pairs for cards
  const gradientPairs = [
    // ["#4FACFE", "#00F2FE"], // Blue gradient
    // ["#43CBFF", "#9708CC"], // Purple-blue
    // ["#F97794", "#623AA2"], // Pink-purple
    // ["#FF9472", "#F2709C"], // Orange-pink
    // ["#FF5858", "#F09819"], // Red-orange
    // ["#16BFFD", "#CB3066"], // Blue-red
    // ["#F5CBFF", "#C346C2"], // Light purple-dark purple
    // ["#00CDAC", "#02AAB0"], // Teal gradient

    ["#4FACFE", "#00F2FE"],    // 0 Blue
    ["#43CBFF", "#9708CC"],    // 1 Purple-blue
    ["#F97794", "#623AA2"],    // 2 Pink-purple
    ["#FF9472", "#F2709C"],    // 3 Orange-pink
    ["#FF5858", "#F09819"],    // 4 Red-orange
    ["#16BFFD", "#CB3066"],    // 5 Blue-red
    ["#F5CBFF", "#C346C2"],    // 6 Light purple-dark purple
    ["#00CDAC", "#02AAB0"],    // 7 Teal
    ["#3399FF", "#FF99CC"],    // 8 Custom: blue-pink
    ["#FFD700", "#FF6347"],    // 9 Custom: gold-red
    ["#66FFB6", "#075053"],    // 10 Green-teal
    ["#FFCC70", "#C850C0"],    // 11 Yellow-purple

  ];

  // Grouped card data with navigation targets
  const userManagementCards = [
    {
      id: 1,
      title: "Add New User / Partner / Admin",
      gradient: gradientPairs[0],
      screen: "NewUser",
      icon: "👥",
    },
    {
      id: 2,
      title: "Manage Users",
      gradient: gradientPairs[1],
      screen: "ManageUsersScreen",
      icon: "🛠️",
    },
    {
      id: 3,
      title: "User - Partner Mapping",
      gradient: gradientPairs[2],
      screen: "PartnerUserMappingScreen",
      icon: "🔗",
    },
    {
      id: 4,
      title: "View User - Partner Mapping",
      gradient: gradientPairs[3],
      screen: "ViewPartnerUserMappingScreen",
      icon: "🔍",
    },
  ];

  const milkManagementCards = [
    {
      id: 5,
      title: "Daily Milk Approval",
      gradient: gradientPairs[4],
      screen: "DailyMilkRegistrationApprovalScreen",
      icon: "🥛",
    },
    {
      id: 6,
      title: "Manage Daily Milk Registrations",
      gradient: gradientPairs[5],
      screen: "ManageDailyMilkRegistrationScreen",
      icon: "📝",
    },
    {
      id: 7,
      title: "View Daily Milk Registered Users",
      gradient: gradientPairs[6],
      screen: "ViewDailyMilkRegisteredUsersScreen",
      icon: "📦",
    },
    {
      id: 8,
      title: "Manage Products and Daily Milk",
      gradient: gradientPairs[7],
      screen: "Main",
      icon: "📦",
    },
  ];

  const deliveryOrdersCards = [
    {
      id: 9,
      title: "View Fast Delivery Orders",
      gradient: gradientPairs[0],
      screen: "ViewFastDeliveryOrdersScreen",
      icon: "🚚",
    },
    {
      id: 10,
      title: "View Daily Milk Orders",
      gradient: gradientPairs[1],
      screen: "ViewDailyMilkDeliveryOrdersScreen",
      icon: "📦",
    },
  ];

  const handleCardPress = (screenName) => {
    try {
      console.log(`Navigating to ${screenName}`);
      navigation.navigate(screenName);
    } catch (err) {
      Toaster.errortop(`Failed to navigate to ${screenName}`);
      console.error("Navigation error:", err);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 mt-2">
      <ScrollView className="flex-1 p-3">
        <Animated.View entering={FadeInUp.duration(800)} className="mb-6">
          <Text className="text-3xl font-bold text-gray-800 mt-4">
            Admin Dashboard
          </Text>
          <Text className="text-lg text-gray-600">
            Manage your dairy operations
          </Text>
          <TouchableOpacity
            onPress={() => {
              Storage.removeData("USER");
              Storage.removeData("ROLE");
              Storage.removeData("DATA");
              navigation.navigate("Login");
            }}
            style={{ marginTop: 32 }}
          >
            <Text style={{ color: "red", textAlign: "center", fontWeight: "600" }}>
              Logout
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Text className="text-xl text-gray-700 font-bold mb-4">Partner and User Management</Text>
        <View className="flex-row flex-wrap justify-between">
          {userManagementCards.map((card, index) => (
            <Animated.View
              key={card.id}
              entering={FadeInDown.delay(index * 100).duration(500)}
              style={{ width: cardWidth }}
              className="mb-5"
            >
              <TouchableOpacity onPress={() => handleCardPress(card.screen)} activeOpacity={0.8}>
                <Animated.View entering={ZoomIn.delay(index * 150)} className="rounded-xl overflow-hidden shadow-lg min-h-[130px]">
                  <LinearGradient
                    colors={card.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="flex-1 p-4 justify-center items-center"
                  >
                    <Text className="text-3xl mb-2">{card.icon}</Text>
                    <Text className="text-white text-center font-semibold text-lg">
                      {card.title}
                    </Text>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Text className="text-xl text-gray-700 font-bold mb-4">Products and Daily Milk Management</Text>
        <View className="flex-row flex-wrap justify-between">
          {milkManagementCards.map((card, index) => (
            <Animated.View
              key={card.id}
              entering={FadeInDown.delay(index * 100).duration(500)}
              style={{ width: cardWidth }}
              className="mb-5"
            >
              <TouchableOpacity onPress={() => handleCardPress(card.screen)} activeOpacity={0.8}>
                <Animated.View entering={ZoomIn.delay(index * 150)} className="rounded-xl overflow-hidden shadow-lg min-h-[130px]">
                  <LinearGradient
                    colors={card.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="flex-1 p-4 justify-center items-center"
                  >
                    <Text className="text-3xl mb-2">{card.icon}</Text>
                    <Text className="text-white text-center font-semibold text-lg">
                      {card.title}
                    </Text>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Text className="text-xl text-gray-700 font-bold mb-4">Delivery Orders</Text>
        <View className="flex-row flex-wrap justify-between">
          {deliveryOrdersCards.map((card, index) => (
            <Animated.View
              key={card.id}
              entering={FadeInDown.delay(index * 100).duration(500)}
              style={{ width: cardWidth }}
              className="mb-5"
            >
              <TouchableOpacity onPress={() => handleCardPress(card.screen)} activeOpacity={0.8}>
                <Animated.View entering={ZoomIn.delay(index * 150)} className="rounded-xl overflow-hidden shadow-lg min-h-[130px]">
                  <LinearGradient
                    colors={card.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="flex-1 p-4 justify-center items-center"
                  >
                    <Text className="text-3xl mb-2">{card.icon}</Text>
                    <Text className="text-white text-center font-semibold text-lg">
                      {card.title}
                    </Text>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
};

export default AdminDashboardScreen;
