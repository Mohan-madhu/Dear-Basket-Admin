import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Platform,
  Button,
} from "react-native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

const Tab = createMaterialTopTabNavigator();

const RegistrationList = ({ status }) => {
  const [registrations, setRegistrations] = useState([]);
  const { setLoading } = useLoading();

  const fetchRegistrations = async () => {
    try {
      setLoading(true, "Fetching registrations...");
      const res = await API.GET("DailyMilkRegistration");
      const filtered = res.Response.filter((item) => item.status === status);
      setRegistrations(filtered);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch registrations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openMap = (latitude, longitude) => {
    if (!latitude || !longitude) {
      Alert.alert("Error", "Location coordinates not available");
      return;
    }

    const url = Platform.select({
      ios: `maps://app?ll=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
    });

    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open maps app")
    );
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const startNavigation = () => {
    const originLat = 12.2253;
    const originLng = 79.0747;
    const destLat = 13.0827;
    const destLng = 80.2707;

    const url = Platform.select({
      ios: `http://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=d`,
      android: `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`,
    });

    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not launch navigation")
    );
  };

  return (
    <ScrollView className="bg-gray-50 p-4">
      {/* <Button title="Start Navigation" onPress={startNavigation} /> */}

      {registrations.length === 0 ? (
        <View className="items-center justify-center mt-16">
          <Icon
            name={status === 1 ? "check-circle" : "cancel"}
            size={48}
            color="#d1d5db"
          />
          <Text className="text-gray-500 text-lg mt-4">
            No {status === 1 ? "approved" : "rejected"} registrations
          </Text>
        </View>
      ) : (
        <View className="space-y-4">
          {registrations.map((item) => (
            <Animated.View
              key={item.transid}
              entering={FadeIn.delay(100)}
              exiting={FadeOut}
              layout={Layout.springify()}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-800">
                    {item.name}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    ID: {item.transid}
                  </Text>
                  <Text className="text-gray-600 mt-1">
                    <Icon name="phone" size={14} color="#4b5563" />{" "}
                    {item.mobile}
                  </Text>
                </View>
                <Text
                  className={`text-xs px-2 py-1 rounded-full ${
                    item.status === 1
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {item.status === 1 ? "Approved" : "Rejected"}
                </Text>
              </View>

              <View className="mt-3 space-y-1">
                <Text className="text-gray-600" numberOfLines={2}>
                  <Icon name="home" size={14} color="#4b5563" /> {item.address}
                </Text>
                <Text className="text-gray-600">
                  <Icon name="people" size={14} color="#4b5563" />{" "}
                  {item.familymembers} family members
                </Text>
                <Text className="text-gray-600">
                  <Icon name="cake" size={14} color="#4b5563" />{" "}
                  {new Date(item.dob).toLocaleDateString()}
                </Text>
              </View>

              <View className="flex-row justify-between mt-4 space-x-2">
                <TouchableOpacity
                  className="flex-row items-center justify-center flex-1 px-4 py-3 bg-blue-500 rounded-lg shadow-sm"
                  onPress={() => openMap(item.latitude, item.longitude)}
                >
                  <Icon name="map" size={18} color="white" />
                  <Text className="text-white font-medium ml-2">
                    View Location
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const ApprovedRegistrations = () => <RegistrationList status={1} />;
const RejectedRegistrations = () => <RegistrationList status={2} />;

const ManageDailyMilkRegistrationScreen = () => {
  return (
    <Tab.Navigator
      className="mt-10"
      screenOptions={{
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#6b7280",
        tabBarIndicatorStyle: { backgroundColor: "#3b82f6" },
        tabBarLabelStyle: { fontWeight: "bold", textTransform: "none" },
      }}
    >
      <Tab.Screen
        name="Approved"
        component={ApprovedRegistrations}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="check-circle" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Rejected"
        component={RejectedRegistrations}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="cancel" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default ManageDailyMilkRegistrationScreen;
