import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView, RefreshControl, Linking, Platform } from "react-native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Animated, { FadeIn, FadeOut, Layout, SlideInRight } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Image } from 'expo-image';
import { useNavigation, useRoute } from "@react-navigation/native";

const Tab = createMaterialTopTabNavigator();

const litresText = (value) => `${Number(value || 0).toFixed(2)}L`;

const getProductLabel = (order) =>
  String(order?.productname || order?.product_name || order?.daily_milk_product || "Milk").trim() || "Milk";

const getProductKey = (order) =>
  String(
    order?.productid ||
      order?.product_id ||
      order?.daily_milk_product_id ||
      getProductLabel(order)
  )
    .trim()
    .toLowerCase();

const buildProductFilters = (orders) => {
  const map = new Map();

  (orders || []).forEach((order) => {
    const key = getProductKey(order);
    if (!key) return;

    const existing = map.get(key) || {
      key,
      label: getProductLabel(order),
      litres: 0,
      orders: 0,
    };

    existing.litres += Number(order?.quantity || order?.total_qty || 0);
    existing.orders += 1;
    map.set(key, existing);
  });

  return [
    {
      key: "all",
      label: "All Products",
      litres: (orders || []).reduce(
        (sum, order) => sum + Number(order?.quantity || order?.total_qty || 0),
        0
      ),
      orders: (orders || []).length,
    },
    ...Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label)),
  ];
};

const ProductFilterBar = ({ products, selectedFilter, onChange }) => {
  if (!products?.length) return null;

  return (
    <View className="bg-white border-b border-gray-200 py-3">
      <View className="px-4 mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-bold text-gray-700 uppercase">
          Product Filter
        </Text>
        <Text className="text-[11px] font-semibold text-gray-400">
          {products.length - 1} products
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4"
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {products.map((item) => {
          const active = selectedFilter === item.key;

          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.85}
              onPress={() => onChange(item.key)}
              className={`mr-2 rounded-2xl border px-4 py-3 min-w-[130px] ${
                active ? "bg-cyan-600 border-cyan-600" : "bg-gray-50 border-gray-200"
              }`}
            >
              <View className="flex-row items-center mb-1">
                <Icon
                  name={active ? "check-circle" : "local-drink"}
                  size={15}
                  color={active ? "#fff" : "#0891b2"}
                />
                <Text
                  numberOfLines={1}
                  className={`ml-2 text-xs font-bold flex-1 ${
                    active ? "text-white" : "text-gray-900"
                  }`}
                >
                  {item.label}
                </Text>
              </View>
              <Text
                className={`text-[11px] font-semibold ${
                  active ? "text-cyan-50" : "text-gray-500"
                }`}
              >
                {litresText(item.litres)} • {item.orders} orders
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const getActualBalanceDue = (order) => {
  const price = Number(order?.price || 0);
  const receivedValue = order?.received_fullamount !== undefined
    ? Number(order.received_fullamount)
    : (Number(order?.received_quantity || 0) * price);
  const paidAmount = Number(order?.paidamount || 0);
  const actualBalance = receivedValue - paidAmount;
  return actualBalance > 0 ? actualBalance : 0;
};

const isDailyMilkPaymentPaid = (order) => {
  const receivedValue = order?.received_fullamount !== undefined
    ? Number(order.received_fullamount)
    : (Number(order?.received_quantity || 0) * Number(order?.price || 0));
  const paidAmount = Number(order?.paidamount || 0);
  const status = String(order?.payment_status ?? "").trim().toLowerCase();

  return receivedValue > 0 && (
    status === "1" ||
    status === "paid" ||
    paidAmount >= receivedValue - 0.009
  );
};

// OrderList Component for Daily Milk Accounts
const OrderList = ({ orders, paymentStatusFilter ,navigation }) => {
  // Filter orders based on payment status
  const filteredOrders = orders.filter(order => {
    const actualBalance = getActualBalanceDue(order);
    if (paymentStatusFilter === 'all') return true;
    if (paymentStatusFilter === 'paid') return isDailyMilkPaymentPaid(order);
    if (paymentStatusFilter === 'pending') return !isDailyMilkPaymentPaid(order) && actualBalance > 0;
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

  const getBookingStatusColor = (matchStatus) => {
    if (matchStatus === "No Match") return "bg-red-50 text-red-700 border-red-100";
    if (matchStatus === "Match Found") return "bg-green-50 text-green-700 border-green-100";
    return "bg-gray-50 text-gray-700 border-gray-100";
  };

  const getBookingStatusText = (matchStatus) => {
    if (matchStatus === "No Match") return "No Booking Found";
    if (matchStatus === "Match Found") return "Booking Confirmed";
    return matchStatus || "Unknown Status";
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
            const paymentPaid = isDailyMilkPaymentPaid(order);

            return (
            <Animated.View
              key={order.orderid || index}
              entering={FadeIn.delay(100 * index)}
              exiting={FadeOut}
              layout={Layout.springify()}
              className={`bg-white p-5 rounded-2xl shadow-sm border ${paymentPaid
                ? "border-green-100"
                : "border-yellow-100"
                }`}
            >
              {/* Header Section - Customer Name & Order ID */}
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-800">
                    {order.name || "Unknown Customer"}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Order: {order.orderid || "N/A"}
                  </Text>
                </View>
                <View className="flex-row space-x-2">
                  <Text
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPaymentStatusColor(paymentPaid ? 1 : 0)} border`}
                  >
                    {getPaymentStatusText(paymentPaid ? 1 : 0)}
                  </Text>
                </View>
              </View>

              {/* Contact Section - Phone & Maps */}
              <View className="flex-row space-x-3 mb-4">
                <TouchableOpacity
                  className="flex-row items-center flex-1 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 mx-2"
                  activeOpacity={0.7}
                  onPress={() => handleCall(order.phonenumber)}
                >
                  <Icon name="phone" size={16} color="#3b82f6" />
                  <Text className="text-blue-600 font-medium ml-2 text-sm">
                    {order.phonenumber || "No Phone"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-3 py-2 bg-green-50 rounded-lg border border-green-100 mx-1"
                  activeOpacity={0.7}
                  onPress={() => handleOpenMaps(order.latitude, order.longitude, order.address)}
                >
                  <Icon name="location-on" size={16} color="#10b981" />
                  <Text className="text-green-600 font-medium ml-2 text-sm">
                    Maps
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Product & Delivery Information */}
              {order.productname && (
                <View className="bg-gray-50 p-3 rounded-lg mb-3">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="text-gray-800 font-medium">
                        {order.productname}
                        {order.quantity && ` • ${order.quantity}L`}
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">
                        {order.deliverytype || "Delivery type not specified"}
                      </Text>
                    </View>
                    <Text className="text-gray-800 font-bold text-lg">
                      ₹{calculateProductTotal(order.price, order.quantity)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Booking Dates */}
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <Icon name="calendar-today" size={14} color="#6b7280" />
                  <Text className="text-gray-600 text-sm ml-1.5">
                    {formatDate(order.bookingstartdate)}
                  </Text>
                </View>
                <Icon name="arrow-forward" size={14} color="#9ca3af" />
                <View className="flex-row items-center">
                  <Icon name="event" size={14} color="#6b7280" />
                  <Text className="text-gray-600 text-sm ml-1.5">
                    {formatDate(order.bookingenddate)}
                  </Text>
                </View>
              </View>

              {/* Booking Status */}
              <View className="mb-3">
                <Text
                  className={`text-xs px-3 py-2 rounded-full font-medium text-center border ${getBookingStatusColor(order.match_status)}`}
                >
                  {getBookingStatusText(order.match_status)}
                </Text>
              </View>

              {/* ADD THIS NEW SECTION - Navigation Buttons for Matched Users */}
              {order.match_status === "Match Found" && (
                <View className="flex-row space-x-2 mb-3">
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center bg-blue-500 px-3 py-2 rounded-lg mx-2"
                    onPress={() => navigation.navigate('DailyMilkStatus_Admin', {
                      BookingData: [{
                        bookingid: order.bookingid,
                        productname: order.productname,
                        deliverytype: order.deliverytype,
                        dailymilkregistrationid: order.orderid || "65312",
                        bookingstartdate: order.bookingstartdate,
                        bookingenddate: order.bookingenddate,
                        quantity: order.quantity,
                        price: order.price,
                        transid: order.transid,
                        name:order.name
                      }],
                      FromAdmin: true,
                      DailyMilkBookingID: order.dailymilkstatusid
                    })}
                  >
                    <Icon name="history" size={16} color="#fff" />
                    <Text className="text-white font-medium ml-2 text-sm">
                      Milk History
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center bg-green-500 px-3 py-2 rounded-lg mx-2"
                    onPress={() => {
                      // Add your payment navigation logic here
                      // navigation.navigate('PaymentScreen', { orderData: order });
                    }}
                  >
                    <Icon name="payment" size={16} color="#fff" />
                    <Text className="text-white font-medium ml-2 text-sm">
                      Show Payment
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Address */}
              <View className="flex-row items-start mb-3">
                <Icon name="location-pin" size={14} color="#6b7280" className="mt-0.5" />
                <Text className="text-gray-600 text-sm ml-2 flex-1" numberOfLines={2}>
                  {order.address || "Address not provided"}
                </Text>
              </View>

              {/* Amount Section */}
              <View className="border-t border-gray-200 pt-3">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600 font-medium">Total Amount:</Text>
                  <Text className="text-gray-800 font-bold text-lg">
                    ₹{order.totalamount || 0}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600 font-medium">Balance Due:</Text>
                  <Text className={`font-bold text-lg ${getActualBalanceDue(order) > 0 ? "text-red-600" : "text-green-600"
                    }`}>
                    ₹{getActualBalanceDue(order)}
                  </Text>
                </View>
              </View>

              {/* Additional Info */}
              {(order.total_qty !== null || order.received_quantity !== null) && (
                <View className="mt-3 pt-3 border-t border-gray-100">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500 text-xs">
                      Ordered: {order.total_qty || 0}L
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      Delivered: {order.received_quantity || 0}L
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          );
          })}
        </View>
      )}
    </Animated.ScrollView>
  );
};




const PendingPaymentUsers = ({ DailyMilkAccounts, navigation }) => {
  return (
    <OrderList
      orders={DailyMilkAccounts || []}
      paymentStatusFilter="pending"
      navigation={navigation}
    />
  );
};

const PaidPaymentUsers = ({ DailyMilkAccounts, navigation }) => {
  return (
    <OrderList
      orders={DailyMilkAccounts || []}
      paymentStatusFilter="paid"
      navigation={navigation}
    />
  );
};

const DailyMilk_User_AccountsManage = ({ navigation }) => {
  const [DailyMilkAccounts, setDailyMilkAccounts] = useState([]);
  const [selectedProductFilter, setSelectedProductFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const { setLoading } = useLoading();

  const route = useRoute();
   const { userid } = route.params;

console.log(userid, " UserID in DailyMilk_User_AccountsManage Screen");
  const fetchDailyMilkAccounts = async () => {
    try {
      setLoading(true, "Fetching DailyMilk Users Accounts...");
      setRefreshing(true);
      const res = await API.GET("DailyMilkStatus/DailyMilkAccountsDashboard");

      const filtered = res.Response.filter(item => item.userid === userid);
      setDailyMilkAccounts(filtered || []);
      setSelectedProductFilter("all");
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

  const productFilters = useMemo(
    () => buildProductFilters(DailyMilkAccounts),
    [DailyMilkAccounts]
  );

  useEffect(() => {
    if (!productFilters.some((item) => item.key === selectedProductFilter)) {
      setSelectedProductFilter("all");
    }
  }, [productFilters, selectedProductFilter]);

  const productFilteredAccounts = useMemo(() => {
    if (selectedProductFilter === "all") return DailyMilkAccounts;
    return DailyMilkAccounts.filter((order) => getProductKey(order) === selectedProductFilter);
  }, [DailyMilkAccounts, selectedProductFilter]);

  // Calculate counts for summary
  const pendingCount = productFilteredAccounts.filter(order => !isDailyMilkPaymentPaid(order) && getActualBalanceDue(order) > 0).length;
  const paidCount = productFilteredAccounts.filter(order => isDailyMilkPaymentPaid(order)).length;
  const totalCount = productFilteredAccounts.length;

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

      <ProductFilterBar
        products={productFilters}
        selectedFilter={selectedProductFilter}
        onChange={setSelectedProductFilter}
      />

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
          children={() => <PendingPaymentUsers DailyMilkAccounts={productFilteredAccounts} navigation={navigation} />}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name="pending-actions" size={22} color={color} />
            ),
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
          children={() => <PaidPaymentUsers DailyMilkAccounts={productFilteredAccounts} navigation={navigation} />}
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

export default DailyMilk_User_AccountsManage;
