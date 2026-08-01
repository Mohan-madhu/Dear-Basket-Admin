import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  ScrollView,
} from "react-native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInRight,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

const Tab = createMaterialTopTabNavigator();

/* ----------------------------- HELPERS ----------------------------- */

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

const calculateProductTotal = (price, quantity) => {
  if (price == null || quantity == null) return "N/A";
  return (Number(price) * Number(quantity)).toFixed(2);
};

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

const getPaymentStatusText = (status) => {
  if (status === 1) return "Paid";
  if (status === 0 || status === null) return "Pending";
  return "Unknown";
};

const getPaymentStatusColor = (status) => {
  if (status === 1) return "bg-green-50 text-green-700 border-green-100";
  if (status === 0 || status === null)
    return "bg-yellow-50 text-yellow-700 border-yellow-100";
  return "bg-gray-50 text-gray-700 border-gray-100";
};

const getBookingStatusColor = (matchStatus) => {
  if (matchStatus === "No Match") return "bg-red-50 text-red-700 border-red-100";
  if (matchStatus === "Match Found")
    return "bg-green-50 text-green-700 border-green-100";
  return "bg-gray-50 text-gray-700 border-gray-100";
};

const getBookingStatusText = (matchStatus) => {
  if (matchStatus === "No Match") return "No Booking Found";
  if (matchStatus === "Match Found") return "Booking Confirmed";
  return matchStatus || "Unknown Status";
};

const handleCall = (phoneNumber) => {
  if (!phoneNumber) {
    Alert.alert("Error", "Phone number not available");
    return;
  }

  const phoneUrl =
    Platform.OS === "ios" ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;

  Linking.openURL(phoneUrl).catch((err) => {
    Alert.alert("Error", "Unable to make a call");
    console.error("Error opening phone:", err);
  });
};

const handleOpenMaps = (latitude, longitude, address) => {
  if (!latitude || !longitude) {
    Alert.alert("Error", "Location coordinates not available");
    return;
  }

  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(
          address || "Location"
        )}`
      : `geo:${latitude},${longitude}?q=${encodeURIComponent(address || "Location")}`;

  Linking.openURL(url).catch(() => {
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(fallbackUrl).catch(() => {
      Alert.alert("Error", "Unable to open maps");
    });
  });
};

/* -------------------------- USER DETAIL CARD -------------------------- */

const UserDetailsCard = ({ order, navigation }) => {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      layout={Layout.springify()}
      className="bg-white mt-3 rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
    >
      {/* Top Header */}
      {/* <View className="px-4 py-4 bg-gray-50 border-b border-gray-100">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            <Text className="text-lg font-bold text-gray-800">
              {order.name || "Unknown Customer"}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              Order ID: {order.orderid || "N/A"}
            </Text>
          </View>

          <View>
            <Text
              className={`text-xs px-3 py-1 rounded-full font-semibold border ${getPaymentStatusColor(
                order.payment_status
              )}`}
            >
              {getPaymentStatusText(order.payment_status)}
            </Text>
          </View>
        </View>
      </View> */}

      <View className="p-4">
        {/* Status Row */}
        <View className="flex-row flex-wrap mb-4">
          <View className="bg-blue-50 border border-blue-100 px-3 py-2 rounded-full mr-2 mb-2">
            <Text className="text-blue-700 text-xs font-semibold">
              {order.productname || "Milk"}
            </Text>
          </View>

          <View className="bg-purple-50 border border-purple-100 px-3 py-2 rounded-full mr-2 mb-2">
            <Text className="text-purple-700 text-xs font-semibold">
              {order.deliverytype || "Not Specified"}
            </Text>
          </View>

          <View
            className={`px-3 py-2 rounded-full border mb-2 ${getBookingStatusColor(
              order.match_status
            )}`}
          >
            <Text className="text-xs font-semibold">
              {getBookingStatusText(order.match_status)}
            </Text>
          </View>
        </View>

        {/* Main Info Grid */}
        <View className="flex-row flex-wrap justify-between">
          <View className="w-[48%] bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
            <View className="flex-row items-center mb-1">
              <Icon name="opacity" size={16} color="#2563eb" />
              <Text className="text-gray-500 text-xs ml-2">Quantity</Text>
            </View>
            <Text className="text-gray-800 font-bold text-base">
              {order.quantity ?? 0}L
            </Text>
          </View>

          <View className="w-[48%] bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
            <View className="flex-row items-center mb-1">
              <Icon name="currency-rupee" size={16} color="#16a34a" />
              <Text className="text-gray-500 text-xs ml-2">Rate / Total</Text>
            </View>
            <Text className="text-gray-800 font-bold text-base">
              ₹{order.price || 0}
            </Text>
            <Text className="text-gray-500 text-xs mt-1">
              Total: ₹{order.totalamount || 0}
            </Text>
          </View>

          <View className="w-[48%] bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
            <View className="flex-row items-center mb-1">
              <Icon name="calendar-today" size={15} color="#f59e0b" />
              <Text className="text-gray-500 text-xs ml-2">Start Date</Text>
            </View>
            <Text className="text-gray-800 font-semibold text-sm">
              {formatDate(order.bookingstartdate)}
            </Text>
          </View>

          <View className="w-[48%] bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
            <View className="flex-row items-center mb-1">
              <Icon name="event" size={15} color="#ef4444" />
              <Text className="text-gray-500 text-xs ml-2">End Date</Text>
            </View>
            <Text className="text-gray-800 font-semibold text-sm">
              {formatDate(order.bookingenddate)}
            </Text>
          </View>
        </View>

        {/* Contact & Address */}
        <View className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
          <View className="flex-row items-center mb-2">
            <Icon name="phone" size={16} color="#3b82f6" />
            <Text className="text-gray-800 font-medium ml-2">
              {order.phonenumber || "No Phone"}
            </Text>
          </View>

          <View className="flex-row items-start">
            <Icon name="location-pin" size={16} color="#10b981" />
            <Text className="text-gray-600 text-sm ml-2 flex-1">
              {order.address || "Address not provided"}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row mb-4">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-blue-600 py-3 rounded-xl mr-2"
            activeOpacity={0.8}
            onPress={() => handleCall(order.phonenumber)}
          >
            <Icon name="call" size={18} color="#fff" />
            <Text className="text-white font-semibold ml-2">Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-green-600 py-3 rounded-xl"
            activeOpacity={0.8}
            onPress={() =>
              handleOpenMaps(order.latitude, order.longitude, order.address)
            }
          >
            <Icon name="place" size={18} color="#fff" />
            <Text className="text-white font-semibold ml-2">Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Amount Summary */}
        <View className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-600 font-medium">Total Amount</Text>
            <Text className="text-gray-800 font-bold text-lg">
              ₹{order.totalamount || 0}
            </Text>
          </View>

          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-600 font-medium">Balance Due</Text>
            <Text
              className={`font-bold text-lg ${
                getActualBalanceDue(order) > 0
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              ₹{getActualBalanceDue(order)}
            </Text>
          </View>

          {(order.total_qty !== null || order.received_quantity !== null) && (
            <View className="pt-3 mt-2 border-t border-gray-200 flex-row justify-between">
              <Text className="text-gray-500 text-xs">
                Ordered: {order.total_qty || 0}L
              </Text>
              <Text className="text-gray-500 text-xs">
                Delivered: {order.received_quantity || 0}L
              </Text>
            </View>
          )}
        </View>

        {/* Extra Actions */}
        {order.match_status === "Match Found" && (
          <View className="flex-row mt-4">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-indigo-500 px-3 py-3 rounded-xl mr-2"
              onPress={() =>
                navigation.navigate("DailyMilkStatus_Admin", {
                  BookingData: [
                    {
                      bookingid: order.bookingid,
                      productname: order.productname,
                      deliverytype: order.deliverytype,
                      dailymilkregistrationid: order.orderid || "65312",
                      bookingstartdate: order.bookingstartdate,
                      bookingenddate: order.bookingenddate,
                      quantity: order.quantity,
                      price: order.price,
                      transid: order.transid,
                      name: order.name,
                    },
                  ],
                  FromAdmin: true,
                  DailyMilkBookingID: order.dailymilkstatusid,
                })
              }
            >
              <Icon name="history" size={16} color="#fff" />
              <Text className="text-white font-medium ml-2 text-sm">
                Milk History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-emerald-500 px-3 py-3 rounded-xl"
              onPress={() => {
                // navigation.navigate("PaymentScreen", { orderData: order });
              }}
            >
              <Icon name="payment" size={16} color="#fff" />
              <Text className="text-white font-medium ml-2 text-sm">
                Show Payment
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

/* ---------------------- PARTNER WISE ORDER LIST ---------------------- */

const PartnerWiseOrderList = ({ orders, paymentStatusFilter, navigation }) => {
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);

  const filteredOrders = useMemo(() => {
    return (orders || []).filter((order) => {
      const actualBalance = getActualBalanceDue(order);
      if (paymentStatusFilter === "all") return true;
      if (paymentStatusFilter === "paid") return isDailyMilkPaymentPaid(order);
      if (paymentStatusFilter === "pending")
        return !isDailyMilkPaymentPaid(order) && actualBalance > 0;
      return true;
    });
  }, [orders, paymentStatusFilter]);

  const groupedPartners = useMemo(() => {
    const map = {};

    filteredOrders.forEach((order) => {
      const partnerId = order.booking_status || "No Partner";

      if (!map[partnerId]) {
        map[partnerId] = [];
      }

      map[partnerId].push(order);
    });

    return Object.entries(map).map(([partnerId, users]) => ({
      partnerId,
      users,
    }));
  }, [filteredOrders]);

  const onTogglePartner = (partnerId) => {
    if (expandedPartner === partnerId) {
      setExpandedPartner(null);
      setExpandedUser(null);
    } else {
      setExpandedPartner(partnerId);
      setExpandedUser(null);
    }
  };

  const onToggleUser = (userKey) => {
    setExpandedUser((prev) => (prev === userKey ? null : userKey));
  };

  return (
    <Animated.ScrollView
      className="bg-gray-50 px-4 pt-4"
      entering={SlideInRight.duration(300)}
      showsVerticalScrollIndicator={false}
    >
      {groupedPartners.length === 0 ? (
        <Animated.View
          className="items-center justify-center mt-16 py-8"
          entering={FadeIn.delay(100)}
          exiting={FadeOut}
        >
          <View className="bg-gray-100 p-6 rounded-full">
            <Icon name="receipt-long" size={48} color="#9ca3af" />
          </View>
          <Text className="text-gray-500 text-lg mt-6 font-medium">
            No orders found
          </Text>
          <Text className="text-gray-400 mt-1 text-center">
            {paymentStatusFilter === "paid"
              ? "No paid orders"
              : paymentStatusFilter === "pending"
              ? "No pending orders"
              : "No orders available"}
          </Text>
        </Animated.View>
      ) : (
        <View className="pb-6">
          {groupedPartners.map((partner, partnerIndex) => {
            const isPartnerExpanded = expandedPartner === partner.partnerId;

            return (
              <Animated.View
                key={partner.partnerId}
                entering={FadeIn.delay(100 * partnerIndex)}
                exiting={FadeOut}
                layout={Layout.springify()}
                className="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden"
              >
                {/* Partner Header */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onTogglePartner(partner.partnerId)}
                  className="px-4 py-4 bg-blue-50"
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="text-gray-800 text-base font-bold">
                        {/* Partner ID: */}
                         {partner.partnerId} - {partner.users[0].partner_name || "Unknown Partner"}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        Users: {partner.users.length}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <View className="bg-white px-3 py-1 rounded-full mr-3">
                        <Text className="text-blue-600 font-semibold text-xs">
                          {partner.users.length} Users
                        </Text>
                      </View>
                      <Icon
                        name={isPartnerExpanded ? "expand-less" : "expand-more"}
                        size={26}
                        color="#2563eb"
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Users under Partner */}
                {isPartnerExpanded && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    layout={Layout.springify()}
                    className="px-3 py-3 bg-white"
                  >
                    {partner.users.map((order, userIndex) => {
                      const userKey =
                        order.dailymilkstatusid ||
                        order.bookingid ||
                        `${partner.partnerId}-${order.orderid}-${userIndex}`;

                      const isUserExpanded = expandedUser === userKey;
                      const paymentPaid = isDailyMilkPaymentPaid(order);

                      return (
                        <Animated.View
                          key={userKey}
                          layout={Layout.springify()}
                          className="mb-3 border border-gray-100 rounded-xl overflow-hidden"
                        >
                          {/* User Summary Row */}
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => onToggleUser(userKey)}
                            className="px-4 py-4 bg-gray-50"
                          >
                            <View className="flex-row justify-between items-center">
                              <View className="flex-1 pr-3">
                                <Text className="text-gray-800 font-bold text-base">
                                  {order.name || "Unknown Customer"}
                                </Text>
                                <Text className="text-gray-500 text-sm mt-1">
                                  Order ID: {order.orderid || "N/A"}
                                </Text>
                                <Text className="text-gray-500 text-sm mt-1">
                                  User ID: {order.userid || "N/A"}
                                </Text>
                              </View>

                              <View className="items-end">
                                <Text
                                  className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getPaymentStatusColor(
                                    paymentPaid ? 1 : 0
                                  )}`}
                                >
                                  {getPaymentStatusText(paymentPaid ? 1 : 0)}
                                </Text>

                                <Text className="text-sm font-bold text-gray-800 mt-2">
                                  ₹{getActualBalanceDue(order)}
                                </Text>

                                <Icon
                                  name={
                                    isUserExpanded
                                      ? "keyboard-arrow-up"
                                      : "keyboard-arrow-down"
                                  }
                                  size={24}
                                  color="#6b7280"
                                />
                              </View>
                            </View>
                          </TouchableOpacity>

                          {/* Expanded User Details */}
                          {isUserExpanded && (
                            <UserDetailsCard
                              order={order}
                              navigation={navigation}
                            />
                          )}
                        </Animated.View>
                      );
                    })}
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}
        </View>
      )}
    </Animated.ScrollView>
  );
};

/* ------------------------------ TAB SCREENS ------------------------------ */

const PendingPaymentUsers = ({ DailyMilkAccounts, navigation }) => {
  return (
    <PartnerWiseOrderList
      orders={DailyMilkAccounts || []}
      paymentStatusFilter="pending"
      navigation={navigation}
    />
  );
};

const PaidPaymentUsers = ({ DailyMilkAccounts, navigation }) => {
  return (
    <PartnerWiseOrderList
      orders={DailyMilkAccounts || []}
      paymentStatusFilter="paid"
      navigation={navigation}
    />
  );
};

/* --------------------------- MAIN COMPONENT --------------------------- */

const DailyMilk_AccountsManage = ({ navigation }) => {
  const [DailyMilkAccounts, setDailyMilkAccounts] = useState([]);
  const [selectedProductFilter, setSelectedProductFilter] = useState("all");
  const { setLoading } = useLoading();

  const fetchDailyMilkAccounts = async () => {
    try {
      setLoading(true, "Fetching DailyMilk Users Accounts...");
      const res = await API.GET("DailyMilkStatus/DailyMilkAccountsDashboard");
      setDailyMilkAccounts(res.Response || []);
      setSelectedProductFilter("all");
      console.log("Fetched DailyMilk Accounts:", res.Response);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch DailyMilk users. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
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

  const pendingCount = productFilteredAccounts.filter(
    (order) => !isDailyMilkPaymentPaid(order) && getActualBalanceDue(order) > 0
  ).length;

  const paidCount = productFilteredAccounts.filter(
    (order) => isDailyMilkPaymentPaid(order)
  ).length;

  const totalCount = productFilteredAccounts.length;

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-center bg-blue-50 py-4 border-b border-gray-200">
        <Icon name="local-drink" size={24} color="#3b82f6" />
        <Text className="text-lg font-bold text-gray-800 ml-2">
          Daily Milk Payment Status
        </Text>
        <Icon name="payments" size={24} color="#3b82f6" className="ml-2" />
      </View>

      {/* Summary */}
      <View className="flex-row justify-around py-3 bg-gray-50 border-b border-gray-200">
        <View className="items-center">
          <Text className="text-gray-600 text-sm">Total Orders</Text>
          <Text className="text-lg font-bold text-gray-800">{totalCount}</Text>
        </View>
        <View className="items-center">
          <Text className="text-yellow-600 text-sm">Pending</Text>
          <Text className="text-lg font-bold text-yellow-600">
            {pendingCount}
          </Text>
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
        }}
      >
        <Tab.Screen
          name="Pending"
          children={() => (
            <PendingPaymentUsers
              DailyMilkAccounts={productFilteredAccounts}
              navigation={navigation}
            />
          )}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name="pending-actions" size={22} color={color} />
            ),
            tabBarLabel: ({ color }) => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color, fontWeight: "600" }}>Pending</Text>
                {pendingCount > 0 && (
                  <View
                    style={{
                      marginLeft: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: "#ef4444",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {pendingCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="Completed"
          children={() => (
            <PaidPaymentUsers
              DailyMilkAccounts={productFilteredAccounts}
              navigation={navigation}
            />
          )}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name="check-circle" size={22} color={color} />
            ),
            tabBarLabel: ({ color }) => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color, fontWeight: "600" }}>Completed</Text>
                {paidCount > 0 && (
                  <View
                    style={{
                      marginLeft: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: "#10b981",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {paidCount}
                    </Text>
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
