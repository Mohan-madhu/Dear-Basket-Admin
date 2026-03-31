import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Config } from "../../config";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  Linking,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Platform,
} from "react-native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Image } from "expo-image";
import Storage from "../../App_Utils/Services/StorageService";
import { useNavigation } from "@react-navigation/native";

const ViewPartnerOrderScreen = () => {
  const [allusers, setAllUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerOrders, setPartnerOrders] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { setLoading } = useLoading();
  const hasFetchedOrdersRef = useRef(false);
  const nav = useNavigation();
  const userMap = useMemo(() => {
    const map = new Map();
    allusers.forEach((user) => map.set(user.transid, user));
    return map;
  }, [allusers]);

  const partners = useMemo(
    () => allusers.filter((user) => user.usertype.toLowerCase() === "partner"),
    [allusers]
  );

  const fetchPartners = async () => {
    try {
      setLoading(true, "Fetching partners...");
      const res = await API.GET("User");
      setAllUsers(res.Response);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch partners");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    if (hasFetchedOrdersRef.current) return;

    try {
      setLoading(true, "Fetching orders...");
      hasFetchedOrdersRef.current = true;

      const USERDATA = await Storage.getData("DATA");
      const USER = USERDATA?.transid;
      const userType = USERDATA?.usertype;

      console.log("Fetching orders...");
      const res = await API.GET("ProductOrder/pending_orders_with_dailymilk");

      var responsebeforefilter = res.Response;
      var apiresponse = [];

      // Filter for only pending orders (orderdelivered !== 1)
      if (userType === "ADMIN") {
        console.log("ADMIN ACCESS - PENDING ORDERS ONLY");
        apiresponse = responsebeforefilter.filter(order => order.orderdelivered !== 1);
      } else {
        apiresponse = responsebeforefilter.filter(
          (order) => order.mappedpartnerid === USER && order.orderdelivered !== 1
        );
      }

      const updatedData = apiresponse.map((order) => {
        let type = "";

        switch (order.isdailymilkuser) {
          case 1:
            type = "Daily Milk";
            break;
          case 0:
            type = "Fast Grocery Delivery";
            break;
          case 2:
            type = "Demo Daily Milk";
            break;
          case 3:
            type = "Milk"; // Pure Daily Milk
            break;
          default:
            type = "Unknown";
        }

        return { ...order, type };
      });

      setOrders(updatedData);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch orders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const openMaps = (latitude, longitude) => {
    if (!latitude || !longitude) {
      Alert.alert("Error", "Location coordinates not available");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch((err) => {
      Alert.alert("Error", "Could not open maps");
      console.error(err);
    });
  };

  const handlePartnerSelect = (partner) => {
    // setSelectedPartner(partner);
    // // Filter orders for selected partner
    // const filteredOrders = orders.filter(
    //   (order) => order.mappedpartnerid === partner.transid
    // );
    // setPartnerOrders(filteredOrders);
    // setIsModalVisible(true);
    nav.navigate("PartnerLandingScreen", { partnerid: partner.transid, partnername: partner.name });
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedPartner(null);
  };

  useEffect(() => {
    fetchPartners();
    fetchOrders();
  }, []);

  const getOrderCountForPartner = (partnerId) => {
    return orders.filter(order =>
      order.ordercancelled !== 1 &&
      order.orderdelivered !== 1 &&
      order.orderpacked === 1 &&
      ((order.isdailymilkuser === 0 && order.orderoutofdeliveryby === null && order.outofdeliveryby === null) || order.mappedpartnerid === partnerId || order.orderoutofdeliveryby === partnerId)).length;
  };

  const renderProfileImage = (profile) => {
    if (!profile || profile === "No File Uploaded") {
      return (
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center border-2 border-white shadow-sm">
          <Icon name="person" size={28} color="#6b7280" />
        </View>
      );
    }

    const profileurl =
      profile.startsWith("~/") || profile.startsWith("/")
        ? Config.BASE_URL + profile.slice(1)
        : profile;

    return (
      <Image
        source={{ uri: profileurl }}
        contentFit="cover"
        cachePolicy="memory-disk"
        className="w-20 h-20 rounded-full border-2 border-white mr-4 shadow-sm"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      />
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOrderStatusInfo = (status) => {
    switch (status) {
      case "Out Of Delivery":
        return {
          color: "#3B82F6",
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: "delivery-dining",
          gradient: ["#3B82F6", "#1D4ED8"],
        };
      case "Order Placed":
        return {
          color: "#F59E0B",
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: "shopping-cart",
          gradient: ["#F59E0B", "#D97706"],
        };
      case "Order Confirmed":
        return {
          color: "#8B5CF6",
          bg: "bg-purple-50",
          text: "text-purple-700",
          border: "border-purple-200",
          icon: "check-circle",
          gradient: ["#8B5CF6", "#7C3AED"],
        };
      case "Order Packed":
        return {
          color: "#6366F1",
          bg: "bg-indigo-50",
          text: "text-indigo-700",
          border: "border-indigo-200",
          icon: "inventory",
          gradient: ["#6366F1", "#4F46E5"],
        };
      case "Delivered":
        return {
          color: "#10B981",
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          icon: "check-circle-outline",
          gradient: ["#10B981", "#059669"],
        };
      case "Cancelled":
        return {
          color: "#EF4444",
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
          icon: "cancel",
          gradient: ["#EF4444", "#DC2626"],
        };
      default:
        return {
          color: "#6B7280",
          bg: "bg-gray-50",
          text: "text-gray-700",
          border: "border-gray-200",
          icon: "help-outline",
          gradient: ["#6B7280", "#4B5563"],
        };
    }
  };

  const parseDailyMilkJson = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      return parsed[0]; // Return first item
    } catch (error) {
      return null;
    }
  };

  const getOrderTypeColor = (type) => {
    switch (type) {
      case "Milk":
        return {
          bg: "bg-blue-100",
          text: "text-blue-800",
          gradient: ["#60A5FA", "#3B82F6"],
        };
      case "Daily Milk":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          gradient: ["#34D399", "#10B981"],
        };
      case "Fast Grocery Delivery":
        return {
          bg: "bg-purple-100",
          text: "text-purple-800",
          gradient: ["#A78BFA", "#8B5CF6"],
        };
      case "Demo Daily Milk":
        return {
          bg: "bg-amber-100",
          text: "text-amber-800",
          gradient: ["#FBBF24", "#F59E0B"],
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          gradient: ["#9CA3AF", "#6B7280"],
        };
    }
  };

  const GradientButton = ({ title, icon, onPress, gradient = ["#3B82F6", "#1D4ED8"] }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="mt-4"
    >
      <View
        className="rounded-xl py-4 px-4 shadow-lg"
        style={{
          backgroundColor: gradient[0],
          shadowColor: gradient[0],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <View className="flex-row items-center justify-center">
          <Icon name={icon} size={22} color="white" />
          <Text className="text-black font-bold text-base ml-3">{title}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderOrderCard = (order, index) => {
    const dailyMilkData = parseDailyMilkJson(order.dailymilk_json);
    const statusInfo = getOrderStatusInfo(order.orderstatus);
    const orderTypeColor = getOrderTypeColor(order.type);

    return (
      <Animated.View
        key={order.productorderid + index}
        entering={FadeIn.delay(index * 50)}
        className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden"
      >
        {/* Order Header */}
        <View className="p-4 border-b border-gray-100">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center mr-2 shadow-sm">
                  <Text className="text-gray-700 font-bold">{index + 1}</Text>
                </View>
                <View>
                  <Text className="font-bold text-gray-800 text-base">
                    {order.name}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    {order.user_mobile}
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-row items-center">
              <View
                className="rounded-full px-3 py-1"
                style={{
                  backgroundColor: orderTypeColor.gradient[0],
                }}
              >
                <Text className="text-white text-xs font-bold">{order.type}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Content */}
        <View className="p-4">
          {/* Status & Time Row */}
          <View className="flex-row justify-between items-center mb-4">
            <View
              className="rounded-lg px-3 py-2 shadow-md"
              style={{
                backgroundColor: statusInfo.gradient[0],
                shadowColor: statusInfo.gradient[0],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View className="flex-row items-center">
                <Icon name={statusInfo.icon} size={18} color="white" />
                <Text className="ml-2 font-bold text-sm text-white">
                  {order.orderstatus}
                </Text>
              </View>
            </View>
            <View className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <Text className="text-gray-600 text-sm font-medium">
                {formatTime(order.ordertime)}
              </Text>
            </View>
          </View>

          {/* Order IDs */}
          <View className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
            <View className="flex-row items-center mb-2">
              <Icon name="receipt" size={18} color="#6b7280" />
              <Text className="text-gray-700 ml-2 font-bold">Order Details</Text>
            </View>
            <View className="space-y-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Product Order ID:</Text>
                <Text className="text-gray-800 font-medium bg-gray-200 px-2 py-1 rounded text-xs">
                  {order.productorderid.substring(0, 10)}...
                </Text>
              </View>
              {order.dailymilkorderid && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Daily Milk ID:</Text>
                  <Text className="text-blue-800 font-medium bg-blue-100 px-2 py-1 rounded text-xs">
                    {order.dailymilkorderid}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Daily Milk Details */}
          {dailyMilkData && (
            <View className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full bg-blue-200 items-center justify-center mr-2">
                  <Icon name="local-drink" size={20} color="#1D4ED8" />
                </View>
                <Text className="text-blue-900 font-bold text-base">Daily Milk Details</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="items-center flex-1">
                  <Text className="text-gray-500 text-xs mb-1">Quantity</Text>
                  <View className="bg-white px-3 py-2 rounded-lg border border-blue-100">
                    <Text className="text-blue-900 font-bold text-lg">
                      {dailyMilkData.quantity}L
                    </Text>
                  </View>
                </View>
                <View className="h-10 w-px bg-blue-300 mx-2" />
                <View className="items-center flex-1">
                  <Text className="text-gray-500 text-xs mb-1">Date</Text>
                  <View className="bg-white px-3 py-2 rounded-lg border border-blue-100">
                    <Text className="text-blue-900 font-medium">
                      {formatDate(dailyMilkData.date)}
                    </Text>
                  </View>
                </View>
                <View className="h-10 w-px bg-blue-300 mx-2" />
                <View className="items-center flex-1">
                  <Text className="text-gray-500 text-xs mb-1">Amount</Text>
                  <View className="bg-white px-3 py-2 rounded-lg border border-blue-100">
                    <Text className="text-blue-900 font-bold text-lg">
                      ₹{dailyMilkData.amount}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Payment Summary */}
          <View className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-300">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-2">
                <Icon name="payments" size={20} color="#4B5563" />
              </View>
              <Text className="text-gray-800 font-bold text-base">Payment Summary</Text>
            </View>
            <View className="space-y-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Item Total</Text>
                <Text className="text-gray-800 font-medium bg-white px-3 py-1.5 rounded border border-gray-200">
                  ₹{order.itemtotal}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Delivery Charge</Text>
                <Text className="text-gray-800 font-medium bg-white px-3 py-1.5 rounded border border-gray-200">
                  ₹{order.deliverycharge}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Tax</Text>
                <Text className="text-gray-800 font-medium bg-white px-3 py-1.5 rounded border border-gray-200">
                  ₹{order.tax}
                </Text>
              </View>
              <View className="h-px bg-gray-400 my-2" />
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-800 font-bold text-base">Total Amount</Text>
                <View className="bg-green-100 px-4 py-2 rounded-lg border border-green-200">
                  <Text className="text-gray-800 font-bold text-lg">
                    ₹{order.itemtotal + order.deliverycharge + order.tax}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Address & Map */}
          <View className="space-y-3">
            <View className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-2">
                  <Icon name="location-on" size={20} color="#DC2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 font-bold mb-1">Delivery Address</Text>
                  <Text className="text-gray-800">{order.deliveryaddress}</Text>
                </View>
              </View>
            </View>

            {order.latitude && order.longitude && (
              <GradientButton
                title="View on Map"
                icon="map"
                onPress={() => openMaps(order.latitude, order.longitude)}
                gradient={["#EF4444", "#DC2626"]}
              />
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar backgroundColor="#3B82F6" barStyle="light-content" />
      <View className="flex-1">
        {/* Header - FIXED WITH PROPER STYLING */}
        <View className="pt-4 pb-6 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
          <Animated.View entering={FadeIn.duration(500)}>
            <Text className="text-2xl font-bold text-black mb-1">
              Partner Orders
            </Text>
            <Text className="text-blue-500 text-sm mb-4">
              Manage pending orders for delivery partners
            </Text>
            <View className="flex-row items-center">
              <View className="bg-blue-500/80 px-3 py-1.5 rounded-full">
                <Text className="text-white text-sm font-bold">
                  {partners.length} Partners
                </Text>
              </View>
              <View className="bg-amber-500/80 px-3 py-1.5 rounded-full ml-2">
                <Text className="text-white text-sm font-bold">
                  {orders.length} Pending Orders
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        <ScrollView className="px-4 pt-6" showsVerticalScrollIndicator={false}>
          {partners.length === 0 ? (
            <View className="items-center justify-center mt-20 py-12">
              <View className="bg-gray-100 p-8 rounded-full shadow-lg">
                <Icon name="group" size={56} color="#9ca3af" />
              </View>
              <Text className="text-gray-500 text-lg mt-8 font-medium">
                No partners found
              </Text>
              <Text className="text-gray-400 mt-1 text-center max-w-xs">
                There are currently no partner users in the system
              </Text>
            </View>
          ) : (
            <View className="pb-6">
              <Text className="text-gray-700 font-bold text-lg mb-4">Delivery Partners</Text>
              {partners.map((partner, index) => {
                const orderCount = getOrderCountForPartner(partner.transid);
                return (
                  <Animated.View
                    key={partner.transid}
                    entering={FadeIn.delay(100 * index)}
                    exiting={FadeOut}
                    layout={Layout.springify()}
                    className="mb-3"
                  >
                    <TouchableOpacity
                      onPress={() => handlePartnerSelect(partner)}
                      activeOpacity={0.7}
                      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
                    >
                      <View className="p-4">
                        <View className="flex-row items-center">
                          {renderProfileImage(partner.profile)}
                          <View className="flex-1">
                            <View className="flex-row justify-between items-start">
                              <View className="flex-1">
                                <Text className="text-lg font-bold text-gray-800">
                                  {partner.name}
                                </Text>
                                <Text className="text-gray-500 text-sm mt-1">
                                  ID: {partner.transid.substring(0, 10)}...
                                </Text>
                                <View className="flex-row items-center mt-2">
                                  <Icon name="phone" size={16} color="#6b7280" />
                                  <Text className="text-gray-600 ml-2">
                                    {partner.mobile}
                                  </Text>
                                </View>
                              </View>
                              <View className="items-end">
                                <View
                                  className={`px-3 py-1.5 rounded-full border ${partner.status === 1
                                    ? "bg-green-100 border-green-300"
                                    : "bg-red-100 border-red-300"
                                    }`}
                                >
                                  <Text
                                    className={`font-bold text-xs ${partner.status === 1 ? "text-green-800" : "text-red-800"
                                      }`}
                                  >
                                    {partner.status === 1 ? "ACTIVE" : "INACTIVE"}
                                  </Text>
                                </View>
                                <View className="mt-3 flex-row items-center bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                                  <Icon name="shopping-cart" size={18} color="#3B82F6" />
                                  <Text className="text-blue-800 font-bold ml-2 text-lg">
                                    {orderCount}
                                  </Text>
                                  <Text className="text-blue-600 ml-1">
                                    order{orderCount !== 1 ? "s" : ""}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {orderCount > 0 && (
                              <View className="mt-3 flex-row items-center bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                                <Icon name="info" size={16} color="#D97706" />
                                <Text className="text-amber-800 ml-2 text-sm font-medium">
                                  Tap to view {orderCount} pending order{orderCount !== 1 ? "s" : ""}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Orders Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Modal Header - FIXED WITH PROPER STYLING */}
          <View className="pt-4 px-4 pb-4 bg-gradient-to-r from-blue-600 to-indigo-700">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={handleCloseModal}
                    className="p-2 -ml-2 mr-2"
                  >
                    <Icon name="arrow-back" size={24} color="white" />
                  </TouchableOpacity>
                  <View>
                    <Text className="text-xl font-bold text-black">
                      {selectedPartner?.name}
                    </Text>
                    <Text className="text-blue-600 text-sm">
                      {partnerOrders.length} pending order{partnerOrders.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleCloseModal}
                className="p-2 ml-2"
              >
                <Icon name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
            {partnerOrders.length === 0 ? (
              <View className="items-center justify-center mt-20 py-12">
                <View className="bg-gray-100 p-8 rounded-full shadow-lg">
                  <Icon name="shopping-cart-check" size={56} color="#10B981" />
                </View>
                <Text className="text-gray-500 text-lg mt-8 font-medium">
                  No pending orders
                </Text>
                <Text className="text-gray-400 mt-1 text-center max-w-xs">
                  All orders have been delivered for this partner
                </Text>
                <GradientButton
                  title="Back to Partners"
                  icon="arrow-back"
                  onPress={handleCloseModal}
                  gradient={["#6B7280", "#4B5563"]}
                />
              </View>
            ) : (
              <View className="pb-6">
                <View className="mb-4 bg-green-50 p-4 rounded-xl border border-green-200">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-full bg-green-200 items-center justify-center mr-3">
                      <Icon name="shopping-cart" size={24} color="#059669" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-green-900 font-bold text-base">Pending Orders</Text>
                      <Text className="text-green-700 text-sm">
                        Showing {partnerOrders.length} order{partnerOrders.length !== 1 ? "s" : ""} for {selectedPartner?.name}
                      </Text>
                    </View>
                    <View className="bg-white px-3 py-2 rounded-lg border border-green-300">
                      <Text className="text-green-900 font-bold">{partnerOrders.length}</Text>
                    </View>
                  </View>
                </View>

                {partnerOrders.map((order, index) => renderOrderCard(order, index))}
              </View>
            )}
          </ScrollView>

          {partnerOrders.length > 0 && (
            <View className="p-4 border-t border-gray-200 bg-white">
              <GradientButton
                title="Back to Partners"
                icon="arrow-back"
                onPress={handleCloseModal}
                gradient={["#6B7280", "#4B5563"]}
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default ViewPartnerOrderScreen;