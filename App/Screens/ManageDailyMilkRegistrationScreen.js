import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView, Linking, Platform } from "react-native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

const Tab = createMaterialTopTabNavigator();

const RegistrationList = ({ status }) => {
  const [registrations, setRegistrations] = useState([]);
  const { setLoading } = useLoading();

  const fetchRegistrations = async () => {
    try {
      setLoading(true, "Fetching registrations...");
      // const res = await API.GET("DailyMilkRegistration");
      const res = await API.GET("DailyMilkBooking/DailyMilkApproval");
      const filtered = res.Response.filter((item) => item.status === status);
      setRegistrations(filtered);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch registrations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);



  // If you're in React Native, make sure these are imported where you use them:
  // import { Linking, Platform } from "react-native";

  // Helpers (put these inside your component file)
  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return isNaN(+d)
      ? "-"
      : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
  };

  const formatDateRange = (start, end) => {
    const s = formatDate(start);
    const e = formatDate(end);
    return `${s} → ${e}`;
  };

  const formatCurrency = (num) =>
    typeof num === "number"
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num)
      : "-";

  const statusInfo = (status) => {
    // 0: pending, 1: approved, 2: rejected (adjust if your API differs)
    switch (status) {
      case 1:
        return { label: "Approved", badgeCls: "bg-green-100 text-green-800" };
      case 2:
        return { label: "Rejected", badgeCls: "bg-red-100 text-red-800" };
      default:
        return { label: "Pending", badgeCls: "bg-amber-100 text-amber-800" };
    }
  };

  // optional: call & map helpers
  const callNumber = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const openMapSafe = (lat, lng, label) => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return;
    const q = encodeURIComponent(label ?? "Location");
    const url =
      Platform.select({
        ios: `http://maps.apple.com/?ll=${latitude},${longitude}&q=${q}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${q})`,
        default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      }) || "";
    Linking.openURL(url);
  };

  // export if needed
  // export { formatDate, formatDateRange, formatCurrency, statusInfo, callNumber, openMapSafe };



  return (
    <ScrollView className="bg-gray-50 p-4">
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
          {/* {registrations.map((item) => (
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
                  className={`text-xs px-2 py-1 rounded-full ${item.status === 1
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
          ))} */}
          {registrations.length === 0 ? (
            <View className="bg-white p-4 rounded-xl border border-gray-200">
              <Text className="text-gray-600 text-center">No pending registrations.</Text>
            </View>
          ) : (
            registrations.map((item) => {
              const s = statusInfo(item.status ?? 0);
              return (
                <Animated.View
                  key={item.transid}
                  entering={FadeIn.delay(100)}
                  exiting={FadeOut}
                  layout={Layout.springify()}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-3"
                >
                  {/* Header */}
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
                      <Text className="text-gray-500 text-xs mt-0.5">ID: {item.userid}</Text>
                      <Text className="text-gray-600 mt-1">
                        <Icon name="phone" size={14} color="#4b5563" /> {item.mobile}
                      </Text>
                    </View>
                    <Text className={`text-xs px-2 py-1 rounded-full ${s.badgeCls}`}>
                      {s.label}
                    </Text>
                  </View>

                  {/* Body */}
                  <View className="mt-3 space-y-1">
                    <Text className="text-gray-600" numberOfLines={2}>
                      <Icon name="home" size={14} color="#4b5563" /> {item.address}
                    </Text>

                    <Text className="text-gray-600">
                      <Icon name="people" size={14} color="#4b5563" /> {item.familymembers} family members
                    </Text>

                    <Text className="text-gray-600">
                      <Icon name="cake" size={14} color="#4b5563" /> {formatDate(item.dob)}
                    </Text>

                    <Text className="text-gray-600">
                      <Icon name="local-shipping" size={14} color="#4b5563" /> Delivery: {item.deliverytype || "-"}
                    </Text>

                    <Text className="text-gray-600">
                      <Icon name="shopping-cart" size={14} color="#4b5563" /> {item.productname} × {item.quantity} @ {formatCurrency(item.price)}
                    </Text>

                    <Text className="text-gray-600">
                      <Icon name="date-range" size={14} color="#4b5563" /> {formatDateRange(item.bookingstartdate, item.bookingenddate)}
                    </Text>

                    <Text className="text-gray-500 text-xs">
                      <Icon name="person" size={12} color="#6b7280" /> Created by {item.rcu} · {formatDate(item.rcm)}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View className="flex-row justify-between mt-4 space-x-2">
                    <TouchableOpacity
                      className="flex-row items-center justify-center flex-1 px-4 py-3 bg-blue-500 rounded-lg shadow-sm"
                      onPress={() => openMapSafe(item.latitude, item.longitude, item.name)}
                    >
                      <Icon name="map" size={18} color="white" />
                      <Text className="text-white font-medium ml-2">View Location</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-row items-center justify-center flex-1 px-4 py-3 bg-gray-800 rounded-lg shadow-sm ml-2"
                      onPress={() => callNumber(item.mobile)}
                    >
                      <Icon name="phone" size={18} color="white" />
                      <Text className="text-white font-medium ml-2">Call</Text>
                    </TouchableOpacity>
                  </View>

                  {/* <View className="flex-row justify-between mt-3">
                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-center px-4 py-3 mr-2 bg-red-500 rounded-lg shadow-sm"
                      onPress={() => handleStatusUpdate(item.transid, 2)}
                    >
                      <Icon name="close" size={20} color="white" />
                      <Text className="text-white font-medium ml-2">Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-center ml-2 px-4 py-3 bg-green-500 rounded-lg shadow-sm"
                      onPress={() => handleStatusUpdate(item.transid, 1)}
                    >
                      <Icon name="check" size={20} color="white" />
                      <Text className="text-white font-medium ml-2">Approve</Text>
                    </TouchableOpacity>
                  </View> */}
                </Animated.View>
              );
            })
          )}

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
