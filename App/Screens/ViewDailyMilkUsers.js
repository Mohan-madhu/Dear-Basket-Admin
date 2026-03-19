import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  TextInput,
  Platform,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInUp,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import DailyMilkStatus from "../Components/DailyMilkStatus";

/* -------------------------------- HELPERS -------------------------------- */

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "yearPlus", label: "Year +" },
  { key: "custom", label: "Custom Range" },
];

const formatCurrency = (value) => {
  const num = Number(value || 0);
  return `₹${num.toFixed(2)}`;
};

const formatLitres = (value) => {
  const num = Number(value || 0);
  return `${num.toFixed(2)} L`;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString();
  } catch {
    return "N/A";
  }
};

const normalizeDate = (input) => {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (input) => {
  const d = new Date(input);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getStartOfWeek = (date) => {
  const d = normalizeDate(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  d.setDate(d.getDate() + diff);
  return d;
};

const getEndOfWeek = (date) => {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
};

const getRangeForFilter = (filterKey, customStart, customEnd) => {
  const now = new Date();
  const todayStart = normalizeDate(now);
  const todayEnd = endOfDay(now);

  switch (filterKey) {
    case "today":
      return { start: todayStart, end: todayEnd };

    case "week":
      return { start: getStartOfWeek(now), end: getEndOfWeek(now) };

    case "month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };

    case "year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: endOfDay(new Date(now.getFullYear(), 11, 31)),
      };

    case "yearPlus":
      return { start: null, end: null }; // All time

    case "custom":
      return {
        start: customStart ? normalizeDate(customStart) : null,
        end: customEnd ? endOfDay(customEnd) : null,
      };

    default:
      return { start: null, end: null };
  }
};

const getOverlapDaysInclusive = (startA, endA, startB, endB) => {
  const sA = normalizeDate(startA);
  const eA = normalizeDate(endA);
  const sB = startB ? normalizeDate(startB) : null;
  const eB = endB ? normalizeDate(endB) : null;

  const overlapStart = sB ? new Date(Math.max(sA.getTime(), sB.getTime())) : sA;
  const overlapEnd = eB ? new Date(Math.min(eA.getTime(), eB.getTime())) : eA;

  if (overlapStart > overlapEnd) return 0;

  const diffMs = normalizeDate(overlapEnd).getTime() - normalizeDate(overlapStart).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

const recordMatchesRange = (record, range) => {
  if (!record?.bookingstartdate || !record?.bookingenddate) return false;
  const bookingStart = normalizeDate(record.bookingstartdate);
  const bookingEnd = normalizeDate(record.bookingenddate);

  if (!range.start && !range.end) return true;
  if (range.start && bookingEnd < normalizeDate(range.start)) return false;
  if (range.end && bookingStart > normalizeDate(range.end)) return false;
  return true;
};

const calculateRangeValuesFromRecord = (record, range) => {
  if (!record?.bookingstartdate || !record?.bookingenddate) {
    return { litres: 0, amount: 0, overlapDays: 0, totalDays: 0 };
  }

  const bookingStart = normalizeDate(record.bookingstartdate);
  const bookingEnd = normalizeDate(record.bookingenddate);

  const totalDays = getOverlapDaysInclusive(bookingStart, bookingEnd, bookingStart, bookingEnd);
  const overlapDays = getOverlapDaysInclusive(
    bookingStart,
    bookingEnd,
    range.start,
    range.end
  );

  if (overlapDays <= 0 || totalDays <= 0) {
    return { litres: 0, amount: 0, overlapDays: 0, totalDays };
  }

  const totalQty =
    record.total_qty != null
      ? Number(record.total_qty)
      : Number(record.quantity || 0) * totalDays;

  const totalAmount =
    record.fullamount != null
      ? Number(record.fullamount)
      : record.totalamount != null
      ? Number(record.totalamount)
      : Number(record.price || 0) * totalQty;

  const litresPerDay = totalQty / totalDays;
  const amountPerDay = totalAmount / totalDays;

  return {
    litres: litresPerDay * overlapDays,
    amount: amountPerDay * overlapDays,
    overlapDays,
    totalDays,
  };
};

const getPaymentStatusText = (status) => {
  if (status === 1) return "Paid";
  if (status === 0 || status === null) return "Pending";
  return "Unknown";
};

const getPaymentBadgeClasses = (status) => {
  if (status === 1) return "bg-green-50 border-green-100 text-green-700";
  if (status === 0 || status === null)
    return "bg-yellow-50 border-yellow-100 text-yellow-700";
  return "bg-gray-50 border-gray-100 text-gray-700";
};

const handleCall = (phoneNumber) => {
  if (!phoneNumber) {
    Alert.alert("Error", "Phone number not available");
    return;
  }

  const url =
    Platform.OS === "ios" ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;

  Linking.openURL(url).catch(() => {
    Alert.alert("Error", "Unable to make call");
  });
};

const handleOpenMaps = (latitude, longitude, address) => {
  if (!latitude || !longitude) {
    Alert.alert("Error", "Location not available");
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

/* ------------------------------ SMALL UI ------------------------------ */

const SummaryCard = ({ icon, title, value, subValue, iconColor = "#2563eb" }) => {
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      layout={Layout.springify()}
      className="bg-white rounded-2xl border border-gray-200 p-4 w-[31%]"
    >
      <View className="bg-blue-50 w-10 h-10 rounded-full items-center justify-center mb-3">
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <Text className="text-gray-500 text-xs font-medium">{title}</Text>
      <Text className="text-gray-800 text-lg font-bold mt-1">{value}</Text>
      {!!subValue && <Text className="text-gray-400 text-xs mt-1">{subValue}</Text>}
    </Animated.View>
  );
};

const FilterChip = ({ label, active, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`px-4 py-2.5 rounded-full mr-2 mb-2 border ${
        active
          ? "bg-blue-600 border-blue-600"
          : "bg-white border-gray-200"
      }`}
    >
      <Text
        className={`font-semibold text-sm ${
          active ? "text-white" : "text-gray-700"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

/* ---------------------------- MAIN COMPONENT ---------------------------- */

const ViewDailyMilkUsers = ({ navigation }) => {
  const [dashboardData, setDashboardData] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [UserStatus, setUserStatus] = useState(null);
  const [DailyMilkRegistrationID, setDailyMilkRegistrationID] = useState(null);
  const [UserBooked, setUserBooked] = useState(null);

  const { setLoading } = useLoading();

  const fetchDashboardData = async () => {
    try {
      setLoading(true, "Fetching daily milk dashboard...");
      const res = await API.GET("DailyMilkStatus/DailyMilkAccountsDashboard");
      setDashboardData(res?.Response || []);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to fetch daily milk dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const activeRange = useMemo(() => {
    return getRangeForFilter(selectedFilter, customStart, customEnd);
  }, [selectedFilter, customStart, customEnd]);

  const filteredRecords = useMemo(() => {
    return (dashboardData || []).filter((record) => {
      if (selectedFilter === "custom" && (!customStart || !customEnd)) {
        return false;
      }
      return recordMatchesRange(record, activeRange);
    });
  }, [dashboardData, activeRange, selectedFilter, customStart, customEnd]);

  const dashboardMetrics = useMemo(() => {
    const uniqueUsers = new Set();
    let totalLitres = 0;
    let totalAmount = 0;

    filteredRecords.forEach((record) => {
      const userKey =
        record.userid ||
        record.phonenumber ||
        record.orderid ||
        record.dailymilkstatusid ||
        record.bookingid;

      if (userKey) uniqueUsers.add(userKey);

      const { litres, amount } = calculateRangeValuesFromRecord(record, activeRange);
      totalLitres += litres;
      totalAmount += amount;
    });

    return {
      userCount: uniqueUsers.size,
      totalLitres,
      totalAmount,
    };
  }, [filteredRecords, activeRange]);

  const aggregatedUsers = useMemo(() => {
    const map = {};

    filteredRecords.forEach((record) => {
      const key =
        record.userid ||
        record.phonenumber ||
        record.orderid ||
        record.dailymilkstatusid ||
        `${record.name}-${record.address}`;

      if (!map[key]) {
        map[key] = {
          key,
          userid: record.userid,
          name: record.name || "Unknown User",
          phonenumber: record.phonenumber || "N/A",
          address: record.address || "Address not provided",
          latitude: record.latitude,
          longitude: record.longitude,
          partner_name: record.partner_name,
          payment_status: record.payment_status,
          totalLitres: 0,
          totalAmount: 0,
          balanceAmount: 0,
          bookingCount: 0,
          records: [],
        };
      }

      const values = calculateRangeValuesFromRecord(record, activeRange);

      map[key].totalLitres += values.litres;
      map[key].totalAmount += values.amount;
      map[key].balanceAmount += Number(record.balanceamount || 0);
      map[key].bookingCount += 1;
      map[key].records.push(record);

      if (!map[key].latitude && record.latitude) map[key].latitude = record.latitude;
      if (!map[key].longitude && record.longitude) map[key].longitude = record.longitude;
      if (!map[key].address && record.address) map[key].address = record.address;
      if (!map[key].phonenumber && record.phonenumber) map[key].phonenumber = record.phonenumber;
      if (!map[key].partner_name && record.partner_name) map[key].partner_name = record.partner_name;
      if (record.payment_status != null) map[key].payment_status = record.payment_status;
    });

    return Object.values(map).sort((a, b) => {
      return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
    });
  }, [filteredRecords, activeRange]);

  const monthlyUsageForSelectedUser = useMemo(() => {
    if (!selectedUser?.records?.length) return [];

    const monthMap = {};

    selectedUser.records.forEach((record) => {
      if (!record.bookingstartdate || !record.bookingenddate) return;

      const bookingStart = normalizeDate(record.bookingstartdate);
      const bookingEnd = normalizeDate(record.bookingenddate);

      const cursor = new Date(bookingStart);
      while (cursor <= bookingEnd) {
        const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const monthEnd = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));

        const overlapDays = getOverlapDaysInclusive(
          bookingStart,
          bookingEnd,
          monthStart,
          monthEnd
        );

        if (overlapDays > 0) {
          const totalDays = getOverlapDaysInclusive(
            bookingStart,
            bookingEnd,
            bookingStart,
            bookingEnd
          );

          const totalQty =
            record.total_qty != null
              ? Number(record.total_qty)
              : Number(record.quantity || 0) * totalDays;

          const totalAmount =
            record.fullamount != null
              ? Number(record.fullamount)
              : record.totalamount != null
              ? Number(record.totalamount)
              : Number(record.price || 0) * totalQty;

          const litres = (totalQty / totalDays) * overlapDays;
          const amount = (totalAmount / totalDays) * overlapDays;

          const monthKey = `${cursor.getFullYear()}-${String(
            cursor.getMonth() + 1
          ).padStart(2, "0")}`;

          if (!monthMap[monthKey]) {
            monthMap[monthKey] = {
              monthKey,
              label: new Date(cursor.getFullYear(), cursor.getMonth(), 1).toLocaleString(
                "default",
                { month: "long", year: "numeric" }
              ),
              litres: 0,
              amount: 0,
            };
          }

          monthMap[monthKey].litres += litres;
          monthMap[monthKey].amount += amount;
        }

        cursor.setMonth(cursor.getMonth() + 1);
        cursor.setDate(1);
      }
    });

    return Object.values(monthMap).sort((a, b) =>
      a.monthKey < b.monthKey ? 1 : -1
    );
  }, [selectedUser]);

  const CheckAlreadyRegistered = async (userID) => {
    if (!userID) {
      setUserStatus(null);
      setDailyMilkRegistrationID(null);
      setUserBooked(null);
      return;
    }

    try {
      setLoading(true, "Checking user registration status...");
      const res = await API.GET("DailyMilkRegistration/CheckUser/" + userID);

      if (!res?.Response || res.Response.length === 0) {
        setUserStatus(0);
        setDailyMilkRegistrationID(null);
        setUserBooked(null);
        return;
      }

      const registration = res.Response[0];

      if (registration.status === 1) {
        setUserStatus(2);
        setDailyMilkRegistrationID(registration.transid);

        try {
          const bookingRes = await API.GET(
            "DailyMilkBooking/UserBookings/" + registration.transid
          );
          const active = findActiveBooking(bookingRes?.Response || []);
          setUserBooked(active || null);
        } catch (e) {
          console.error("Booking fetch error", e);
          setUserBooked(null);
        }
      } else if (registration.status === 0) {
        setUserStatus(1);
        setDailyMilkRegistrationID(registration.transid || null);
        setUserBooked(null);
      } else if (registration.status === 2) {
        setUserStatus(3);
        setDailyMilkRegistrationID(registration.transid || null);
        setUserBooked(null);
      } else {
        setUserStatus(null);
        setDailyMilkRegistrationID(null);
        setUserBooked(null);
      }
    } catch (err) {
      console.error("Error checking registration", err);
      setUserStatus(null);
      setDailyMilkRegistrationID(null);
      setUserBooked(null);
    } finally {
      setLoading(false);
    }
  };

  const findActiveBooking = (bookingsData) => {
    const today = normalizeDate(new Date());
    const activeBookings = [];

    for (const booking of bookingsData) {
      if (!booking?.bookingstartdate || !booking?.bookingenddate) continue;

      const startDate = normalizeDate(booking.bookingstartdate);
      const endDate = normalizeDate(booking.bookingenddate);

      const isActive =
        today.getTime() >= startDate.getTime() &&
        today.getTime() <= endDate.getTime();

      if (isActive) {
        activeBookings.push(booking);
      }
    }

    return activeBookings.length > 0 ? activeBookings : null;
  };

  const handleUserPress = async (user) => {
    setSelectedUser(user);
    setUserStatus(null);
    setDailyMilkRegistrationID(null);
    setUserBooked(null);

    if (user?.userid) {
      await CheckAlreadyRegistered(user.userid);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-4 pt-6 pb-3 bg-blue-50 border-b border-blue-100">
          <View className="flex-row items-center">
            <Icon name="local-drink" size={26} color="#2563eb" />
            <Text className="text-xl font-bold text-gray-800 ml-2">
              Daily Milk Users Dashboard
            </Text>
          </View>
          <Text className="text-gray-600 mt-1">
            View usage metrics and user-wise milk details
          </Text>
        </View>

        {/* Summary Cards */}
        <View className="px-4 pt-4">
          <View className="flex-row justify-between">
            <SummaryCard
              icon="groups"
              title="Unique Users"
              value={dashboardMetrics.userCount}
              subValue="Filtered duration"
              iconColor="#2563eb"
            />
            <SummaryCard
              icon="opacity"
              title="Total Litres"
              value={formatLitres(dashboardMetrics.totalLitres)}
              subValue="Across selected range"
              iconColor="#0ea5e9"
            />
            <SummaryCard
              icon="payments"
              title="Total Amount"
              value={formatCurrency(dashboardMetrics.totalAmount)}
              subValue="Across selected range"
              iconColor="#16a34a"
            />
          </View>
        </View>

        {/* Filters */}
        <View className="px-4 pt-5">
          <Text className="text-gray-800 font-bold text-base mb-3">
            Filter by duration
          </Text>

          <View className="flex-row flex-wrap">
            {FILTERS.map((item) => (
              <FilterChip
                key={item.key}
                label={item.label}
                active={selectedFilter === item.key}
                onPress={() => setSelectedFilter(item.key)}
              />
            ))}
          </View>

          {selectedFilter === "custom" && (
            <Animated.View
              entering={FadeIn.duration(200)}
              layout={Layout.springify()}
              className="bg-white border border-gray-200 rounded-2xl p-4 mt-3"
            >
              <Text className="text-gray-700 font-semibold mb-3">
                Enter custom date range
              </Text>

              <View className="mb-3">
                <Text className="text-gray-500 text-xs mb-1">Start Date</Text>
                <TextInput
                  value={customStart}
                  onChangeText={setCustomStart}
                  placeholder="YYYY-MM-DD"
                  className="border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-gray-50"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View>
                <Text className="text-gray-500 text-xs mb-1">End Date</Text>
                <TextInput
                  value={customEnd}
                  onChangeText={setCustomEnd}
                  placeholder="YYYY-MM-DD"
                  className="border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-gray-50"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <Text className="text-gray-400 text-xs mt-3">
                Example: 2026-03-01 to 2026-03-31
              </Text>
            </Animated.View>
          )}
        </View>

        {/* User List */}
        <View className="px-4 pt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-800 font-bold text-base">
              Daily Milk Users
            </Text>
            <View className="bg-white border border-gray-200 px-3 py-1.5 rounded-full">
              <Text className="text-gray-600 font-semibold text-xs">
                {aggregatedUsers.length} Users
              </Text>
            </View>
          </View>

          {aggregatedUsers.length === 0 ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              className="items-center justify-center mt-10 py-10 bg-white rounded-2xl border border-gray-200"
            >
              <View className="bg-gray-100 p-6 rounded-full">
                <Icon name="person-search" size={48} color="#9ca3af" />
              </View>
              <Text className="text-gray-600 text-lg font-semibold mt-5">
                No users found
              </Text>
              <Text className="text-gray-400 text-center mt-1 px-6">
                No daily milk usage records are available for the selected duration
              </Text>
            </Animated.View>
          ) : (
            <View className="pb-6">
              {aggregatedUsers.map((user, index) => (
                <Animated.View
                  key={user.key}
                  entering={FadeIn.delay(index * 50)}
                  exiting={FadeOut}
                  layout={Layout.springify()}
                  className="bg-white border border-gray-200 rounded-2xl p-4 mb-3"
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleUserPress(user)}
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-3">
                        <Text className="text-gray-800 text-base font-bold">
                          {user.name || "Unknown User"}
                        </Text>

                        <Text className="text-gray-500 text-sm mt-1">
                          User ID: {user.userid || "N/A"}
                        </Text>

                        <Text className="text-gray-500 text-sm mt-1">
                          Mobile: {user.phonenumber || "N/A"}
                        </Text>

                        <Text className="text-gray-500 text-sm mt-1">
                          Partner: {user.partner_name || "Unknown Partner"}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text
                          className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getPaymentBadgeClasses(
                            user.payment_status
                          )}`}
                        >
                          {getPaymentStatusText(user.payment_status)}
                        </Text>

                        <Text className="text-gray-800 font-bold text-base mt-3">
                          {formatCurrency(user.totalAmount)}
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          {formatLitres(user.totalLitres)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between mt-4 pt-4 border-t border-gray-100">
                      <View className="items-center flex-1">
                        <Text className="text-gray-400 text-xs">Bookings</Text>
                        <Text className="text-gray-800 font-bold mt-1">
                          {user.bookingCount}
                        </Text>
                      </View>

                      <View className="items-center flex-1">
                        <Text className="text-gray-400 text-xs">Balance</Text>
                        <Text className="text-red-600 font-bold mt-1">
                          {formatCurrency(user.balanceAmount)}
                        </Text>
                      </View>

                      <View className="items-center flex-1">
                        <Text className="text-gray-400 text-xs">View</Text>
                        <View className="flex-row items-center mt-1">
                          <Icon name="visibility" size={16} color="#2563eb" />
                          <Text className="text-blue-600 font-semibold ml-1 text-xs">
                            Details
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* USER DETAILS MODAL */}
      <Modal
        visible={!!selectedUser}
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View className="flex-1 bg-gray-900">
          <View className="px-4 pt-5 pb-4 bg-gray-800 border-b border-gray-700">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text className="text-white text-xl font-bold">
                  {selectedUser?.name || "User"} - Usage Details
                </Text>
                <Text className="text-gray-300 text-sm mt-1">
                  Monthly usage + booking details
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedUser(null)}
                className="bg-gray-700 rounded-full p-2"
              >
                <Icon name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-4 pt-4"
            contentContainerStyle={{ paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
          >
            {/* User Info */}
            <Animated.View
              entering={SlideInUp.duration(250)}
              className="bg-white rounded-2xl border border-gray-200 p-4 mb-4"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-3">
                  <Text className="text-gray-800 text-lg font-bold">
                    {selectedUser?.name || "Unknown User"}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    User ID: {selectedUser?.userid || "N/A"}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Mobile: {selectedUser?.phonenumber || "N/A"}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Address: {selectedUser?.address || "Address not provided"}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-gray-400 text-xs">Total Litres</Text>
                  <Text className="text-sky-600 text-lg font-bold mt-1">
                    {formatLitres(selectedUser?.totalLitres || 0)}
                  </Text>

                  <Text className="text-gray-400 text-xs mt-3">Total Amount</Text>
                  <Text className="text-green-600 text-lg font-bold mt-1">
                    {formatCurrency(selectedUser?.totalAmount || 0)}
                  </Text>
                </View>
              </View>

              <View className="flex-row mt-4">
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center bg-blue-600 py-3 rounded-xl mr-2"
                  onPress={() => handleCall(selectedUser?.phonenumber)}
                >
                  <Icon name="call" size={18} color="#fff" />
                  <Text className="text-white font-semibold ml-2">Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center bg-green-600 py-3 rounded-xl"
                  onPress={() =>
                    handleOpenMaps(
                      selectedUser?.latitude,
                      selectedUser?.longitude,
                      selectedUser?.address
                    )
                  }
                >
                  <Icon name="place" size={18} color="#fff" />
                  <Text className="text-white font-semibold ml-2">Maps</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Monthly Usage */}
            <Animated.View
              entering={FadeIn.duration(250)}
              layout={Layout.springify()}
              className="bg-white rounded-2xl border border-gray-200 p-4 mb-4"
            >
              <View className="flex-row items-center mb-3">
                <Icon name="bar-chart" size={20} color="#2563eb" />
                <Text className="text-gray-800 font-bold text-base ml-2">
                  Monthly Usage
                </Text>
              </View>

              {monthlyUsageForSelectedUser.length === 0 ? (
                <Text className="text-gray-400">No monthly usage found</Text>
              ) : (
                monthlyUsageForSelectedUser.map((month) => (
                  <View
                    key={month.monthKey}
                    className="flex-row justify-between items-center py-3 border-b border-gray-100"
                  >
                    <View>
                      <Text className="text-gray-800 font-semibold">
                        {month.label}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-1">
                        Monthly usage summary
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-sky-600 font-bold">
                        {formatLitres(month.litres)}
                      </Text>
                      <Text className="text-green-600 font-bold mt-1">
                        {formatCurrency(month.amount)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Animated.View>

            {/* Booking Records */}
            <Animated.View
              entering={FadeIn.duration(250)}
              className="bg-white rounded-2xl border border-gray-200 p-4 mb-4"
            >
              <View className="flex-row items-center mb-3">
                <Icon name="receipt-long" size={20} color="#2563eb" />
                <Text className="text-gray-800 font-bold text-base ml-2">
                  Booking Details
                </Text>
              </View>

              {selectedUser?.records?.map((record, index) => {
                const values = calculateRangeValuesFromRecord(record, activeRange);

                return (
                  <View
                    key={`${record.bookingid || record.orderid || index}-${index}`}
                    className="border border-gray-100 rounded-xl p-3 mb-3 bg-gray-50"
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-3">
                        <Text className="text-gray-800 font-bold">
                          {record.productname || "Milk"} - {record.deliverytype || "N/A"}
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          Order ID: {record.orderid || "N/A"}
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          Partner: {record.partner_name || "Unknown"}
                        </Text>
                      </View>

                      <View>
                        <Text
                          className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getPaymentBadgeClasses(
                            record.payment_status
                          )}`}
                        >
                          {getPaymentStatusText(record.payment_status)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row flex-wrap justify-between mt-3">
                      <View className="w-[48%] bg-white rounded-xl p-3 border border-gray-100 mb-2">
                        <Text className="text-gray-400 text-xs">Booking Start</Text>
                        <Text className="text-gray-800 font-semibold mt-1">
                          {formatDate(record.bookingstartdate)}
                        </Text>
                      </View>

                      <View className="w-[48%] bg-white rounded-xl p-3 border border-gray-100 mb-2">
                        <Text className="text-gray-400 text-xs">Booking End</Text>
                        <Text className="text-gray-800 font-semibold mt-1">
                          {formatDate(record.bookingenddate)}
                        </Text>
                      </View>

                      <View className="w-[48%] bg-white rounded-xl p-3 border border-gray-100 mb-2">
                        <Text className="text-gray-400 text-xs">Litres in Filter</Text>
                        <Text className="text-sky-600 font-bold mt-1">
                          {formatLitres(values.litres)}
                        </Text>
                      </View>

                      <View className="w-[48%] bg-white rounded-xl p-3 border border-gray-100 mb-2">
                        <Text className="text-gray-400 text-xs">Amount in Filter</Text>
                        <Text className="text-green-600 font-bold mt-1">
                          {formatCurrency(values.amount)}
                        </Text>
                      </View>

                      <View className="w-[48%] bg-white rounded-xl p-3 border border-gray-100 mb-2">
                        <Text className="text-gray-400 text-xs">Total Qty</Text>
                        <Text className="text-gray-800 font-semibold mt-1">
                          {formatLitres(record.total_qty || 0)}
                        </Text>
                      </View>

                      <View className="w-[48%] bg-white rounded-xl p-3 border border-gray-100 mb-2">
                        <Text className="text-gray-400 text-xs">Balance</Text>
                        <Text className="text-red-600 font-bold mt-1">
                          {formatCurrency(record.balanceamount || 0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </Animated.View>

            {/* Existing DailyMilkStatus feature */}
            <Animated.View
              entering={FadeIn.duration(250)}
              className="bg-white rounded-2xl border border-gray-200 p-4 mb-4"
            >
              <View className="flex-row items-center mb-3">
                <Icon name="history" size={20} color="#2563eb" />
                <Text className="text-gray-800 font-bold text-base ml-2">
                  Current Active Milk Status
                </Text>
              </View>

              {UserStatus === 2 && UserBooked ? (
                <View className="rounded-xl overflow-hidden">
                  <DailyMilkStatus
                    DailyMilkRegistrationID={DailyMilkRegistrationID}
                    BookingData={UserBooked}
                    FromAdmin={1}
                  />
                </View>
              ) : (
                <View className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <Text className="text-gray-600 text-center">
                    User has no active booking / registration details to show
                  </Text>
                </View>
              )}
            </Animated.View>

            <TouchableOpacity
              className="bg-gray-200 py-3 rounded-xl items-center justify-center"
              onPress={() => setSelectedUser(null)}
            >
              <Text className="text-gray-800 font-semibold">Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default ViewDailyMilkUsers;