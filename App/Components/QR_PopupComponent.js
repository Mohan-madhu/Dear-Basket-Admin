import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  useWindowDimensions,
  TouchableOpacity,
} from "react-native";
import Checkbox from "expo-checkbox";
import { useRoute, useNavigation } from "@react-navigation/native";
import { API } from "../../App_Utils/Services/APIService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { MapPin, Info, ChevronLeft, X } from "react-native-feather";
export default function QR_Popup() {
  const { setLoading } = useLoading();
  const route = useRoute();
  const navigation = useNavigation();
  const { type, data } = route.params; // from Scanner screen

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const { width } = useWindowDimensions();

  const [selected, setSelected] = useState({
    milk: false,
    grocery: false,
    laundry: false,
  });

  const GetOrders = async () => {
    setLoading(true, "Fetching Daily Milk Orders");

    try {
      // const startDateFormatted = getFormattedDateInTimezone(today, 5, 30); // IST: UTC+5:30
      const startDateFormatted = "2025-06-23";

      var { Response } = await API.POST("DailyMilkOrders", {
        // Ensure "DailyMilkOrders" is the correct endpoint
        startDate: startDateFormatted,
        endDate: startDateFormatted,
      });

      const filteredOrders = Response.filter(
        (order) => order.RegistrationUserId === data
      );
      setSelectedOrder(filteredOrders[0]);

      setOrders(filteredOrders);
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

  const onViewDetails = async () => {
    // try {
    //   // build comma-separated list of categories
    //   const categories = Object.entries(selected)
    //     .filter(([_, v]) => v)
    //     .map(([k]) => k)
    //     .join(",");

    //   // fetch details from your API
    //   const resp = await fetch(
    //     `https://api.example.com/details?code=${data}&categories=${categories}`
    //   );
    //   const detailsJson = await resp.json();

    //   // navigate to Details screen
    //   navigation.navigate("EachOrderDetails", { details: detailsJson });
    // } catch (err) {
    //   console.error(err);
    //   // you may want to show an error toast here
    // }
    setModalVisible(true);
  };

  return (
    <ScrollView className="flex-1 bg-gray-100 p-6">
      <Text className="text-2xl font-bold mb-6 text-center">
        Select Categories
      </Text>

      {["milk", "grocery", "laundry"].map((key) => (
        <View key={key} className="flex-row items-center mb-4">
          <Checkbox
            value={selected[key]}
            onValueChange={(val) =>
              setSelected((prev) => ({ ...prev, [key]: val }))
            }
            className="mr-3"
          />
          <Text className="text-lg">
            {key === "milk"
              ? "Daily Milk"
              : key === "grocery"
              ? "Grocery"
              : "Laundry"}
          </Text>
        </View>
      ))}

      <Pressable
        onPress={onViewDetails}
        className="bg-blue-600 py-3 rounded-lg items-center mb-4"
      >
        <Text className="text-white text-lg font-semibold">View Details</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.goBack()}
        className="py-3 rounded-lg items-center"
      >
        <Text className="text-blue-600 text-lg">Cancel</Text>
      </Pressable>

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
                    onPress={
                      () => Alert.alert("Delivered")
                      // openMaps(selectedOrder.latitude, selectedOrder.longitude)
                    }
                  >
                    <Text className="text-white">Deliver</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
