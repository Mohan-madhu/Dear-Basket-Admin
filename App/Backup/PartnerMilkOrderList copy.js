import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  useWindowDimensions,
} from "react-native";
import { MapPin, Info } from "react-native-feather";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInUp,
} from "react-native-reanimated";

const PartnerMilkOrderList = () => {
  const orders = [
    {
      OrderId: "52E13426-D724-4A66-8F8B-1D7DDA2C7B60",
      SNo: 2,
      RegistrationTransId: "A-bz3699944889239",
      RegistrationUserId: "E83AE99F-8E20-43E8-A89F-2F87085496B3",
      CustomerName: "Raj",
      CustomerDOB: "1999-04-30",
      FullAddress: "Middle street vengur",
      ContactNumber: "9944889239",
      latitude: 15.85,
      longitude: 45.5,
      FamilySize: 5,
      ProductId: "87F61FC5-5E8E-4C94-A654-33A7AEDC7311",
      ProductName: "Milk",
      UnitPrice: 40.0,
      DeliveryType: "Morning",
      SubscriptionStart: "2025-06-15",
      SubscriptionEnd: "2025-07-14",
      DeliveryDate: "2025-06-22",
      BaseQuantity: 1.0,
      ExtraQuantity: 0.0,
      TotalDeliveredQuantity: 1.0,
      TotalAmount: 40.0,
      CalculatedUnitPrice: 40.0,
      ExtraAmount: 0.0,
      BottleDescription: "1 litre bottle (1 × 1L)",
      Full1LBottles: 1,
      HalfLBottles: 0,
      IsDelivered: 0,
      IsCancelled: 0,
      DeliveryTime: null,
      ReceivedTimestamp: null,
    },
    {
      OrderId: "FB9FAA4F-8B70-47AF-A26A-CE71332775A5",
      SNo: 3,
      RegistrationTransId: "A-bz3699944889239",
      RegistrationUserId: "E83AE99F-8E20-43E8-A89F-2F87085496B3",
      CustomerName: "Raj",
      CustomerDOB: "1999-04-30",
      FullAddress: "Middle street vengur",
      ContactNumber: "9944889239",
      latitude: 15.85,
      longitude: 45.5,
      FamilySize: 5,
      ProductId: "87F61FC5-5E8E-4C94-A654-33A7AEDC7311",
      ProductName: "Milk",
      UnitPrice: 40.0,
      DeliveryType: "Morning",
      SubscriptionStart: "2025-06-15",
      SubscriptionEnd: "2025-07-14",
      DeliveryDate: "2025-06-22",
      BaseQuantity: 1.0,
      ExtraQuantity: 0.0,
      TotalDeliveredQuantity: 1.0,
      TotalAmount: 40.0,
      CalculatedUnitPrice: 40.0,
      ExtraAmount: 0.0,
      BottleDescription: "1 litre bottle (1 × 1L)",
      Full1LBottles: 1,
      HalfLBottles: 0,
      IsDelivered: 0,
      IsCancelled: 0,
      DeliveryTime: null,
      ReceivedTimestamp: null,
    },
    {
      OrderId: "B3440A31-F72A-48B9-97F0-8A5ABE9A2B9E",
      SNo: 4,
      RegistrationTransId: "A-az3698220348218",
      RegistrationUserId: "8012CCC8-54CD-4B22-B75C-DF5DEA83B1B0",
      CustomerName: "Mohan",
      CustomerDOB: "2025-06-04",
      FullAddress: "Krishnapuram",
      ContactNumber: "8220348218",
      latitude: 12.6766,
      longitude: 79.646,
      FamilySize: 4,
      ProductId: "87F61FC5-5E8E-4C94-A654-33A7AEDC7311",
      ProductName: "Milk",
      UnitPrice: 40.0,
      DeliveryType: "Morning",
      SubscriptionStart: "2025-06-14",
      SubscriptionEnd: "2025-07-13",
      DeliveryDate: "2025-06-23",
      BaseQuantity: 0.5,
      ExtraQuantity: 0.0,
      TotalDeliveredQuantity: 0.5,
      TotalAmount: 20.0,
      CalculatedUnitPrice: 40.0,
      ExtraAmount: 0.0,
      BottleDescription: "½ litre bottle (1 × ½L)",
      Full1LBottles: 0,
      HalfLBottles: 1,
      IsDelivered: 0,
      IsCancelled: 0,
      DeliveryTime: null,
      ReceivedTimestamp: null,
    },
  ];
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { width } = useWindowDimensions();



  const openDetailsModal = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const openMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(console.error);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4 shadow-sm">
        <Text className="text-xl font-bold text-gray-800">Milk Orders</Text>
      </View>

      {/* Order List */}
      <ScrollView className="flex-1 p-4">
        {orders.map((order, idx) => (
          <Animated.View
            key={order.OrderId}
            entering={FadeIn.delay(idx * 100)}
            layout={Layout.springify()}
            className="bg-white rounded-xl mb-4 overflow-hidden shadow"
            style={{ width: width - 32 }}
          >
            {/* Card Header */}
            <View className="flex-row justify-between items-center border-b border-gray-100 p-4">
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
                  className="p-2 bg-blue-100 rounded-full"
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
            <View className="p-4 space-y-3">
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
                      <Text className="text-green-500">
                        {" "}
                        = +{order.ExtraQuantity}L
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
                        {" "}
                        = +₹{order.ExtraAmount}
                      </Text>
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Details Modal */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-30 p-2">
          <Animated.View
            entering={SlideInUp.duration(300)}
            exiting={FadeOut.duration(200)}
            className="bg-gradient-to-b from-white to-gray-100 rounded-t-3xl p-6 max-h-[85%] mx-2"
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                Order Details
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text className="text-2xl text-gray-500">×</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView className="space-y-5">
              {[
                ["Customer", selectedOrder?.CustomerName],
                ["Reg. ID", selectedOrder?.RegistrationTransId],
                ["Phone", selectedOrder?.ContactNumber],
                ["Address", selectedOrder?.FullAddress],
                [
                  "Coordinates",
                  `${selectedOrder?.latitude}, ${selectedOrder?.longitude}`,
                ],
                ["Family Size", selectedOrder?.FamilySize],
                ["Product", selectedOrder?.ProductName],
                ["Delivery Type", selectedOrder?.DeliveryType],
                [
                  "Subscription",
                  `${selectedOrder?.SubscriptionStart} → ${selectedOrder?.SubscriptionEnd}`,
                ],
              ].map(([label, val], i) => (
                <View key={i} className="flex-row justify-between items-start">
                  <Text className="text-sm text-gray-500">{label}:</Text>
                  <Text className="text-sm text-gray-800 text-right flex-1 ml-4">
                    {val}
                  </Text>
                </View>
              ))}

              {/* Quantity & Amount Emphasis */}
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-500">Quantity:</Text>
                <Text className="text-lg font-bold text-gray-800">
                  {selectedOrder?.BaseQuantity}L
                  {selectedOrder?.ExtraQuantity > 0 && (
                    <Text className="text-green-500">
                      {" "}
                      = +{selectedOrder.ExtraQuantity}L
                    </Text>
                  )}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-500">Amount:</Text>
                <Text className="text-lg font-bold text-gray-800">
                  ₹
                  {(selectedOrder?.TotalAmount ?? 0) -
                    (selectedOrder?.ExtraAmount ?? 0)}
                  {selectedOrder?.ExtraAmount > 0 && (
                    <Text className="text-green-500">
                      {" "}
                      = +₹{selectedOrder.ExtraAmount}
                    </Text>
                  )}
                </Text>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View className="flex-row space-x-4 mt-6">
              <TouchableOpacity
                className="flex-1 py-3 bg-gray-200 rounded-lg items-center"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-gray-800">Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 bg-blue-500 rounded-lg items-center"
                onPress={() =>
                  openMaps(selectedOrder?.latitude, selectedOrder?.longitude)
                }
              >
                <Text className="text-white">Open in Maps</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default PartnerMilkOrderList;
