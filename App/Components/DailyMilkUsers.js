import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Animated } from 'react-native';
import { SlideInRight, FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';

const DailyMilk_Users_Component = ({ orders, paymentStatusFilter }) => {
  const toAmount = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
  };

  const getDeliveredValue = (order) => {
    if (order?.received_fullamount !== undefined && order?.received_fullamount !== null && order?.received_fullamount !== "") {
      return toAmount(order.received_fullamount);
    }
    return toAmount(order?.received_baseamount) + toAmount(order?.received_extraamount);
  };

  const getPayableBalance = (order) => Math.max(getDeliveredValue(order) - toAmount(order?.paidamount), 0);

  const isPaymentPaid = (order) => {
    const deliveredValue = getDeliveredValue(order);
    const paidAmount = toAmount(order?.paidamount);
    const status = String(order?.payment_status ?? "").trim().toLowerCase();
    return deliveredValue > 0 && (status === "1" || status === "paid" || paidAmount >= deliveredValue - 0.009);
  };

  // Filter orders based on payment status
  const filteredOrders = orders.filter(order => {
    const balanceDue = getPayableBalance(order);
    if (paymentStatusFilter === 'all') return true;
    if (paymentStatusFilter === 'paid') return isPaymentPaid(order);
    if (paymentStatusFilter === 'pending') return !isPaymentPaid(order) && balanceDue > 0;
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
          {filteredOrders.map((order, index) => {
            const payableBalance = getPayableBalance(order);
            const paymentPaid = isPaymentPaid(order);

            return (
            <Animated.View
              key={order.orderid || index}
              entering={FadeIn.delay(100 * index)}
              exiting={FadeOut}
              layout={Layout.springify()}
              className={`bg-white p-5 rounded-2xl shadow-sm border ${
                paymentPaid
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
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPaymentStatusColor(paymentPaid ? 1 : 0)} border`}
                  >
                    {getPaymentStatusText(paymentPaid ? 1 : 0)}
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
                      <Icon name="local-offer" size={16} color="#6b7280" />
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
                  <Text className={`font-bold ${
                    payableBalance > 0 ? "text-red-600" : "text-green-600"
                  }`}>
                    ₹{payableBalance.toFixed(2)}
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
          );
          })}
        </View>
      )}
    </Animated.ScrollView>
  );
};

export default DailyMilk_Users_Component;
