import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  useWindowDimensions,
} from "react-native";
import { MapPin, Info, ChevronLeft, X } from "react-native-feather";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  Layout,
  SlideInUp,
} from "react-native-reanimated";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import { useNavigation } from "@react-navigation/native";

const PartnerMilkOrderList = () => {
   const navigation = useNavigation();
  const { setLoading } = useLoading();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const { width } = useWindowDimensions();

  function getFormattedDateInTimezone(date, offsetHours, offsetMinutes = 0) {
    const utcMillis = date.getTime() + date.getTimezoneOffset() * 60 * 1000; // Current UTC time
    const desiredOffsetMillis =
      offsetHours * 60 * 60 * 1000 + offsetMinutes * 60 * 1000; // IST offset
    const dateInDesiredTimezone = new Date(utcMillis + desiredOffsetMillis); // Date object for IST

    const year = dateInDesiredTimezone.getFullYear();
    const month = String(dateInDesiredTimezone.getMonth() + 1).padStart(2, "0");
    const day = String(dateInDesiredTimezone.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const GetOrders = async () => {
    setLoading(true, "Fetching Daily Milk Orders");

    try {
      const today = new Date();
      // const startDateFormatted = getFormattedDateInTimezone(today, 5, 30); // IST: UTC+5:30
      const startDateFormatted = "2025-07-04";

      var { Response } = await API.POST("DailyMilkOrders", {
        // Ensure "DailyMilkOrders" is the correct endpoint
        startDate: startDateFormatted,
        endDate: startDateFormatted,
      });

      setOrders(Response);
    } catch (err) {
      setLoading(false);
      console.error("Error fetching booking status:", err);
      // Optionally show error to user
      Alert.alert("Error", "Failed to fetch booking status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    GetOrders();
  }, []);

  const openDetailsModal = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const openMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(console.error);
  };

  return (
    <View className="flex-1 bg-gray-50 ">
      <Animated.View entering={FadeInUp.duration(800)} className="mb-6">
        <Text className="text-3xl font-bold text-gray-800 mt-4">
          Partner Dashboard
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
            <Text
              style={{ color: "red", textAlign: "center", fontWeight: "600" }}
            >
              Logout
            </Text>
          </TouchableOpacity>
      </Animated.View>
      {/* Header */}
      <View className="bg-white p-4 shadow-sm ">
        <Text className="text-xl font-bold text-gray-800">Milk Orders</Text>
      </View>

      {/* Order List */}
      <ScrollView className="flex-1 p-4 ">
        {orders.map((order, idx) => (
          <Animated.View
            key={order.OrderId}
            entering={FadeIn.delay(idx * 100)}
            layout={Layout.springify()}
            className="bg-white rounded-xl mb-4 overflow-hidden shadow"
            style={{ width: width - 32 }}
          >
            {/* Card Header */}
            <View className="flex-row justify-between items-center border-b border-gray-100 p-3">
              <View>
                <Text className="text-xs text-gray-500">S.No: {order.SNo}</Text>
                <Text className="text-lg font-semibold text-gray-800">
                  {order.CustomerName}
                </Text>
                <Text className="text-xs text-gray-500">
                  {order.RegistrationTransId}
                </Text>
              </View>
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  className="p-2 bg-blue-100 rounded-full mr-2"
                  onPress={() => openMaps(order.latitude, order.longitude)}
                >
                  <MapPin width={18} height={18} color="#4F46E5" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="p-2 bg-gray-100 rounded-full"
                  onPress={() => openDetailsModal(order)}
                >
                  <Info width={18} height={18} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Card Body */}
            <View className="p-4 space-y-1">
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-xs text-gray-500">Phone</Text>
                  <Text className="text-base text-gray-800">
                    {order.ContactNumber}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-gray-500">Address</Text>
                  <Text className="text-base text-gray-800">
                    {order.FullAddress}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between">
                <View>
                  <Text className="text-xs text-gray-500">Type</Text>
                  <Text className="text-base text-gray-800">
                    {order.DeliveryType}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-gray-500">Quantity</Text>
                  <Text className="text-lg font-bold text-gray-800">
                    {order.BaseQuantity}L
                    {order.ExtraQuantity > 0 && (
                      <Text className="text-green-500 ml-1">
                        (+{order.ExtraQuantity}L)
                      </Text>
                    )}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs text-gray-500">Amount</Text>
                  <Text className="text-lg font-bold text-gray-800">
                    ₹{order.UnitPrice * order.BaseQuantity}
                    {order.ExtraAmount > 0 && (
                      <Text className="text-green-500">
                        (+₹{order.ExtraAmount})
                      </Text>
                    )}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between">
                <View>
                  <Text className="text-xs text-gray-500">
                    Bottle Description
                  </Text>
                  <Text className="text-lg font-bold text-gray-800">
                    {order.BottleDescription}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        ))}
        <View className="mb-10"></View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1  bg-opacity-20 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[90%] shadow-lg">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">
                Order Details
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <ChevronLeft className="text-gray-500" width={24} height={24} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView>
                {/* Grid container */}
                <View className="flex-row flex-wrap -mx-3">
                  {[
                    ["Customer Name", selectedOrder.CustomerName],
                    ["Registration ID", selectedOrder.RegistrationTransId],
                    ["Phone", selectedOrder.ContactNumber],
                    ["Address", selectedOrder.FullAddress],
                    [
                      "Coordinates",
                      `${selectedOrder.latitude}, ${selectedOrder.longitude}`,
                    ],
                    ["Family Size", <Text>{selectedOrder.FamilySize}</Text>],
                    ["Product", selectedOrder.ProductName],
                    ["Delivery Type", selectedOrder.DeliveryType],
                    [
                      "Subscription",
                      `${selectedOrder.SubscriptionStart.split("T")[0]} to ${
                        selectedOrder.SubscriptionEnd.split("T")[0]
                      }`,
                    ],

                    [
                      "Total Qty",
                      <>
                        <Text className="font-bold">
                          {selectedOrder.BaseQuantity}L
                          {selectedOrder.ExtraQuantity > 0 && (
                            <Text className="text-green-500">
                              (+{selectedOrder.ExtraQuantity}L)
                            </Text>
                          )}
                        </Text>
                      </>,
                    ],
                    [
                      "Bottles",
                      <Text className="font-bold">
                        {selectedOrder.BottleDescription}
                      </Text>,
                    ],

                    [
                      "Total Amount",
                      <>
                        <Text className="font-bold">
                          ₹{selectedOrder.TotalAmount}
                        </Text>
                        {selectedOrder.ExtraAmount > 0 && (
                          <Text className="text-green-500">
                            (+₹{selectedOrder.ExtraAmount})
                          </Text>
                        )}
                      </>,
                    ],
                    [
                      "Status",
                      <View className="flex-row items-center">
                        {selectedOrder.IsDelivered ? (
                          <>
                            <Check
                              className="text-green-500 mr-1"
                              width={16}
                              height={16}
                            />
                            <Text className="text-green-500">Delivered</Text>
                          </>
                        ) : (
                          <>
                            <X
                              className="text-red-500 mr-1"
                              width={16}
                              height={16}
                            />
                            <Text className="text-red-500">Not Delivered</Text>
                          </>
                        )}
                      </View>,
                    ],
                    [
                      "Cancelled",
                      <View className="flex-row items-center">
                        {selectedOrder.IsCancelled ? (
                          <>
                            <Check
                              className="text-green-500 mr-1"
                              width={16}
                              height={16}
                            />
                            <Text className="text-green-500">Cancelled</Text>
                          </>
                        ) : (
                          <>
                            <X
                              className="text-red-500 mr-1"
                              width={16}
                              height={16}
                            />
                            <Text className="text-red-500">Active</Text>
                          </>
                        )}
                      </View>,
                    ],
                  ].map(([label, value], i) => (
                    <View key={i} className="w-1/2 px-3 mb-4">
                      <Text className="text-gray-500">{label}:</Text>
                      <View className="mt-1">
                        {typeof value === "string" ? (
                          <Text className="text-gray-800">{value}</Text>
                        ) : (
                          value
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View className="mt-6 flex-row justify-between space-x-4">
                  <TouchableOpacity
                    className="flex-1 bg-gray-200 py-3 rounded-lg items-center  mx-3"
                    onPress={() => setModalVisible(false)}
                  >
                    <Text className="text-gray-800">Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-blue-500 py-3 rounded-lg items-center  mx-3"
                    onPress={() =>
                      openMaps(selectedOrder.latitude, selectedOrder.longitude)
                    }
                  >
                    <Text className="text-white">Open in Maps</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PartnerMilkOrderList;
