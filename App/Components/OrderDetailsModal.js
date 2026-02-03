// components/OrderDetailsModal.js
import React from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { height } = Dimensions.get('window');

const OrderDetailsModal = ({ isVisible, onClose, order }) => {
  const translateY = useSharedValue(height);

  React.useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    } else {
      translateY.value = withTiming(height, { duration: 300 });
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!order) {
    return null; // Don't render if no order is selected
  }

  const openMap = () => {
    if (order.latitude && order.longitude) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${order.latitude},${order.longitude}`;
      const label = encodeURIComponent(order.CustomerName);
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`,
      });

      Linking.openURL(url).catch(err => console.error('An error occurred opening map', err));
    } else {
      console.warn('Latitude or longitude not available for this order.');
    }
  };

  const getStatusIcon = (status) => (status ? '✓' : '✗');

  return (
    <View className={`absolute inset-0 ${isVisible ? 'flex' : 'hidden'} items-center justify-end`}>
      <TouchableOpacity
        className="absolute inset-0 bg-black/50"
        onPress={onClose}
        activeOpacity={1} // Prevents extra opacity change on touch
      />
      <Animated.View
        className="w-full bg-white rounded-t-3xl p-6 shadow-xl max-h-[90%]"
        style={animatedStyle}
      >
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-800">Order Details</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Text className="text-gray-500 text-3xl font-light">×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-grow">
          <Section title="Customer Information">
            <Detail label="Name" value={order.CustomerName} />
            <Detail label="DOB" value={order.CustomerDOB} />
            <Detail label="Contact" value={order.ContactNumber} />
            <Detail label="Address" value={order.FullAddress} />
            <Detail label="Family Size" value={order.FamilySize} />
          </Section>

          <Section title="Order Information">
            <Detail label="Order ID" value={order.OrderId} />
            <Detail label="Product" value={order.ProductName} />
            <Detail label="Unit Price" value={`₹${order.UnitPrice.toFixed(2)}`} />
            <Detail label="Delivery Type" value={order.DeliveryType} />
            <Detail label="Subscription" value={`${order.SubscriptionStart} to ${order.SubscriptionEnd}`} />
            <Detail label="Delivery Date" value={order.DeliveryDate} />
            <Detail label="Reg. Trans. ID" value={order.RegistrationTransId} />
            <Detail label="Reg. User ID" value={order.RegistrationUserId} />
            <Detail label="Product ID" value={order.ProductId} />
          </Section>

          <Section title="Quantity & Bottles">
            <Detail label="Base Quantity" value={`${order.BaseQuantity} L`} />
            <Detail label="Extra Quantity" value={`${order.ExtraQuantity} L`} />
            <Detail label="Total Delivered" value={`${order.TotalDeliveredQuantity} L`} />
            <Detail label="Bottle Description" value={order.BottleDescription} />
            <Detail label="1L Bottles" value={order.Full1LBottles} />
            <Detail label="½L Bottles" value={order.HalfLBottles} />
          </Section>

          <Section title="Financials">
            <Detail label="Total Amount" value={`₹${order.TotalAmount.toFixed(2)}`} />
            <Detail label="Calculated Unit Price" value={`₹${order.CalculatedUnitPrice.toFixed(2)}`} />
            <Detail label="Extra Amount" value={`₹${order.ExtraAmount.toFixed(2)}`} />
          </Section>

          <Section title="Status">
            <Detail label="Is Delivered" value={getStatusIcon(order.IsDelivered)} />
            <Detail label="Is Cancelled" value={getStatusIcon(order.IsCancelled)} />
            <Detail label="Delivery Time" value={order.DeliveryTime || 'N/A'} />
            <Detail label="Received Timestamp" value={order.ReceivedTimestamp || 'N/A'} />
          </Section>
        </ScrollView>

        <View className="flex-row justify-between mt-6">
          <TouchableOpacity
            onPress={onClose}
            className="flex-1 mr-2 py-3 bg-gray-200 rounded-lg items-center"
          >
            <Text className="text-gray-700 font-semibold text-lg">Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openMap}
            className="flex-1 ml-2 py-3 bg-blue-600 rounded-lg items-center"
          >
            <Text className="text-white font-semibold text-lg">Open in Maps</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const Section = ({ title, children }) => (
  <View className="mb-4 bg-gray-50 p-4 rounded-lg">
    <Text className="text-lg font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2">{title}</Text>
    {children}
  </View>
);

const Detail = ({ label, value }) => (
  <View className="flex-row justify-between py-1 border-b border-gray-100 last:border-b-0">
    <Text className="text-gray-600 font-medium text-base">{label}:</Text>
    <Text className="text-gray-800 text-base flex-shrink ml-2 text-right">{value}</Text>
  </View>
);

export default OrderDetailsModal;