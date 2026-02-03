import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView, RefreshControl, Linking, Platform } from "react-native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Animated, { FadeIn, FadeOut, Layout, SlideInRight } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Image } from 'expo-image';

const Tab = createMaterialTopTabNavigator();

// OrderList Component for Daily Milk Accounts
const OrderList = ({ orders, paymentStatusFilter }) => {
  // Filter orders based on payment status
  const filteredOrders = orders.filter(order => {
    if (paymentStatusFilter === 'all') return true;
    if (paymentStatusFilter === 'paid') return order.payment_status === 1;
    if (paymentStatusFilter === 'pending') return order.payment_status === 0 || order.payment_status === null;
    return true;
  });

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert("Error", "Phone number not available");
      return;
    }

    const phoneUrl = Platform.OS === 'ios'
      ? `telprompt:${phoneNumber}`
      : `tel:${phoneNumber}`;

    Linking.openURL(phoneUrl).catch(err => {
      Alert.alert("Error", "Unable to make a call");
      console.error('Error opening phone:', err);
    });
  };

  const handleOpenMaps = (latitude, longitude, address) => {
    if (!latitude || !longitude) {
      Alert.alert("Error", "Location coordinates not available");
      return;
    }

    const url = Platform.OS === 'ios'
      ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(address)}`
      : `geo:${latitude},${longitude}?q=${encodeURIComponent(address)}`;

    Linking.openURL(url).catch(err => {
      // Fallback to Google Maps in browser
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(fallbackUrl).catch(() => {
        Alert.alert("Error", "Unable to open maps");
      });
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const calculateProductTotal = (price, quantity) => {
    if (!price || !quantity) return "N/A";
    return (price * quantity).toFixed(2);
  };

  const getPaymentStatusText = (status) => {
    if (status === 1) return "Paid";
    if (status === 0) return "Pending";
    return "Unknown";
  };

  const getPaymentStatusColor = (status) => {
    if (status === 1) return "bg-green-50 text-green-700 border-green-100";
    if (status === 0) return "bg-yellow-50 text-yellow-700 border-yellow-100";
    return "bg-gray-50 text-gray-700 border-gray-100";
  };

  const getBookingStatusColor = (status) => {
    if (status === "current booking") return "bg-blue-50 text-blue-700 border-blue-100";
    if (status === "Match Found") return "bg-purple-50 text-purple-700 border-purple-100";
    if (status === "No Match") return "bg-red-50 text-red-700 border-red-100";
    return "bg-gray-50 text-gray-700 border-gray-100";
  };

  return (
    <Animated.ScrollView
      className="bg-gray-50 px-4 pt-4"
      entering={SlideInRight.duration(300)}
      showsVerticalScrollIndicator={false}
    >
      {filteredOrders.length === 0 ? (
        <Animated.View
          className="items-center justify-center mt-16 py-8"
          entering={FadeIn.delay(100)}
          exiting={FadeOut}
        >
          <View className="bg-gray-100 p-6 rounded-full">
            <Icon
              name="receipt-long"
              size={48}
              color="#9ca3af"
            />
          </View>
          <Text className="text-gray-500 text-lg mt-6 font-medium">
            No orders found
          </Text>
          <Text className="text-gray-400 mt-1 text-center">
            {paymentStatusFilter === 'paid' ? 'No paid orders' :
              paymentStatusFilter === 'pending' ? 'No pending orders' :
                'No orders available'}
          </Text>
        </Animated.View>
      ) : (
        <View className="space-y-5 pb-6">
          {filteredOrders.map((order, index) => (
            <Animated.View
              key={order.orderid || index}
              entering={FadeIn.delay(100 * index)}
              exiting={FadeOut}
              layout={Layout.springify()}
              className={`bg-white p-5 rounded-2xl shadow-sm border ${order.payment_status === 1
                ? "border-green-100"
                : "border-yellow-100"
                }`}
            >
              {/* Header Section */}
              <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-800">
                    {order.name || "Unknown Customer"}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Order ID: {order.orderid || "N/A"}
                  </Text>
                </View>
                <View className="flex-row space-x-2">
                  <Text
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPaymentStatusColor(order.payment_status)} border`}
                  >
                    {getPaymentStatusText(order.payment_status)}
                  </Text>
                  <Text
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${getBookingStatusColor(order.booking_status)} border`}
                  >
                    {order.booking_status || "No Status"}
                  </Text>
                </View>
              </View>

              {/* Contact Section */}
              <View className="flex-row space-x-3 mb-4">
                <TouchableOpacity
                  className="flex-row items-center flex-1 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100"
                  activeOpacity={0.7}
                  onPress={() => handleCall(order.phonenumber)}
                >
                  <Icon name="phone" size={16} color="#3b82f6" />
                  <Text className="text-blue-600 font-medium ml-2 text-sm">
                    {order.phonenumber || "No Phone"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-3 py-2 bg-green-50 rounded-lg border border-green-100"
                  activeOpacity={0.7}
                  onPress={() => handleOpenMaps(order.latitude, order.longitude, order.address)}
                >
                  <Icon name="location-on" size={16} color="#10b981" />
                  <Text className="text-green-600 font-medium ml-2 text-sm">
                    Maps
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Order Details Section */}
              <View className="space-y-3 mb-4">
                <View className="flex-row items-start">
                  <Icon name="location-pin" size={16} color="#6b7280" className="mt-0.5" />
                  <Text className="text-gray-600 ml-2 flex-1" numberOfLines={2}>
                    {order.address || "Address not provided"}
                  </Text>
                </View>

                {order.productname && (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <Icon name="local-drink" size={16} color="#6b7280" />
                      <Text className="text-gray-600 ml-2">
                        {order.productname}
                        {order.quantity && ` (${order.quantity}L)`}
                        {order.deliverytype && ` • ${order.deliverytype}`}
                      </Text>
                    </View>
                    <Text className="text-gray-800 font-medium">
                      ₹{calculateProductTotal(order.price, order.quantity)}
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between">
                  <View className="flex-row items-center">
                    <Icon name="calendar-today" size={16} color="#6b7280" />
                    <Text className="text-gray-600 ml-2">
                      Start: {formatDate(order.bookingstartdate)}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Icon name="event" size={16} color="#6b7280" />
                    <Text className="text-gray-600 ml-2">
                      End: {formatDate(order.bookingenddate)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Amount Section */}
              <View className="border-t border-gray-100 pt-3">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600">Total Amount:</Text>
                  <Text className="text-gray-800 font-bold">
                    ₹{order.totalamount || 0}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Balance Amount:</Text>
                  <Text className={`font-bold ${order.balanceamount > 0 ? "text-red-600" : "text-green-600"
                    }`}>
                    ₹{order.balanceamount || 0}
                  </Text>
                </View>
              </View>

              {/* Additional Info */}
              <View className="mt-3 pt-3 border-t border-gray-100">
                <View className="flex-row justify-between">
                  <Text className="text-gray-500 text-xs">
                    Match Status: {order.match_status || "N/A"}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    Delivery: {order.deliverytype || "N/A"}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      )}
    </Animated.ScrollView>
  );
};

// Tab Components for Daily Milk
const PendingPaymentUsers = ({ DailyMilkAccounts }) => {
  return (
    <OrderList
      orders={DailyMilkAccounts || []}
      paymentStatusFilter="pending"
    />
  );
};

const PaidPaymentUsers = ({ DailyMilkAccounts }) => {
  return (
    <OrderList
      orders={DailyMilkAccounts || []}
      paymentStatusFilter="paid"
    />
  );
};

const DailyMilk_AccountsManage = () => {
  const [DailyMilkAccounts, setDailyMilkAccounts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { setLoading } = useLoading();

  const fetchDailyMilkAccounts = async () => {
    try {
      setLoading(true, "Fetching DailyMilk Users Accounts...");
      setRefreshing(true);
      const res = await API.GET("DailyMilkStatus/DailyMilkAccountsDashboard");
      setDailyMilkAccounts(res.Response || []);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch DailyMilk users. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDailyMilkAccounts();
  }, []);

  // Calculate counts for summary
  const pendingCount = DailyMilkAccounts.filter(order => order.payment_status === 0 || order.payment_status === null).length;
  const paidCount = DailyMilkAccounts.filter(order => order.payment_status === 1).length;
  const totalCount = DailyMilkAccounts.length;

  return (
    <View className="flex-1 bg-white">
      {/* Header Section */}
      <View className="flex-row items-center justify-center bg-blue-50 py-4 border-b border-gray-200">
        <Icon name="local-drink" size={24} color="#3b82f6" />
        <Text className="text-lg font-bold text-gray-800 ml-2">
          Daily Milk Payment Status
        </Text>
        <Icon name="payments" size={24} color="#3b82f6" className="ml-2" />
      </View>

      {/* Summary Stats */}
      <View className="flex-row justify-around py-3 bg-gray-50 border-b border-gray-200">
        <View className="items-center">
          <Text className="text-gray-600 text-sm">Total Orders</Text>
          <Text className="text-lg font-bold text-gray-800">{totalCount}</Text>
        </View>
        <View className="items-center">
          <Text className="text-yellow-600 text-sm">Pending</Text>
          <Text className="text-lg font-bold text-yellow-600">{pendingCount}</Text>
        </View>
        <View className="items-center">
          <Text className="text-green-600 text-sm">Completed</Text>
          <Text className="text-lg font-bold text-green-600">{paidCount}</Text>
        </View>
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#6b7280",
          tabBarIndicatorStyle: {
            backgroundColor: "#3b82f6",
            height: 3,
          },
          tabBarLabelStyle: {
            fontWeight: "600",
            textTransform: "none",
            fontSize: 14,
          },
          tabBarStyle: {
            backgroundColor: "white",
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          },
          tabBarItemStyle: {
            paddingHorizontal: 8,
          },
          // tabBarGap: 8,
        }}
      >
        <Tab.Screen
          name="Pending"
          children={() => <PendingPaymentUsers DailyMilkAccounts={DailyMilkAccounts} />}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name="pending-actions" size={22} color={color} />
            ),
            // tabBarBadge: pendingCount > 0 ? pendingCount : undefined,

            tabBarLabel: ({ color }) => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color, fontWeight: "600" }}>Pending</Text>
                {pendingCount > 0 && (
                  <View style={{ marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: "#ef4444" }}>
                    <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>{pendingCount}</Text>
                  </View>
                )}
              </View>
            ),

          }}
        />
        <Tab.Screen
          name="Completed"
          children={() => <PaidPaymentUsers DailyMilkAccounts={DailyMilkAccounts} />}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name="check-circle" size={22} color={color} />
            ),
            tabBarLabel: ({ color }) => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color, fontWeight: "600" }}>Completed</Text>
                {paidCount > 0 && (
                  <View style={{ marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: "#10b981" }}>
                    <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>{paidCount}</Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};



export default DailyMilk_AccountsManage;