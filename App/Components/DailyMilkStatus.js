import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Calendar } from "react-native-calendars";
import Icon from "react-native-vector-icons/FontAwesome";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API, getUserFacingErrorMessage } from "../../App_Utils/Services/APIService";
import MilkStatusTable from "./DailyMilkStatusTable";
import { useNavigation } from "@react-navigation/native";
import { isDailyMilkCancelled } from "../../App_Utils/Utils/dailyMilkCancellation";

// Format a Date object as "YYYY-MM-DD"
function formatDateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Format an ISO string as "Jun 07, 2025"
function formatFriendly(dateString) {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAILY_MILK_STATUS_THEME = {
  page: "#0f172a",
  card: "#1e293b",
  softCard: "#334155",
  border: "#475569",
  accent: "#22d3ee",
  text: "#f8fafc",
  mutedText: "#cbd5e1",
  subtleText: "#94a3b8",
};

export default function DailyMilkStatus({ BookingData, FromAdmin }) {
  console.warn("BookingData in DailyMilkStatus:", BookingData);
  const activeBooking = Array.isArray(BookingData)
    ? BookingData.find((item) => item?.transid && item?.bookingstartdate && item?.bookingenddate)
    : null;
  // --- 1) Booking-status state ---
  const { setLoading } = useLoading();

  const [bookingStatus, setBookingStatus] = useState({});
  const [bookingDate, setbookingDate] = useState(null);
  const navigation = useNavigation();
  const isMountedRef = React.useRef(false);
  const [isCancelModalVisible, setCancelModalVisible] = useState(false);
  const [isExtraModalVisible, setExtraModalVisible] = useState(false);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDeliveryHistory, setShowDeliveryHistory] = useState(false);

  const [selectedCancelDates, setSelectedCancelDates] = useState(
    () => new Set()
  );
  const [currentExtraDate, setCurrentExtraDate] = useState(null);
  const [extraQtyInput, setExtraQtyInput] = useState("");
  const [finalExtraEntries, setFinalExtraEntries] = useState([]);

  const [bookingStatusTable, setBookingStatusTable] = useState([]);
  const [upd, setupd] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!activeBooking?.transid) return;
    GetBookingStatus();
  }, [activeBooking?.transid, upd]);



  const GetBookingStatus = async ({ showGlobalLoading = true } = {}) => {

    console.warn("1111111111111111111111111", BookingData)
    if (!activeBooking?.transid) {
      if (isMountedRef.current) setBookingStatusTable([]);
      return;
    }
    if (isMountedRef.current && showGlobalLoading) setLoading(true, "Fetching Booking Status");
   
    try {
      var { Response } = await API.GET(
        "DailyMilkStatus/Dates/" + activeBooking.transid
      );

      if (!isMountedRef.current) return;
      const safeResponse = Array.isArray(Response) ? Response : [];
      setBookingStatusTable(safeResponse);

    

      const CancelledDatesSet = new Set();
      const ExtraMilkEntries = [];
      const dataByDate = safeResponse.reduce((acc, currentItem) => {
        let status;

        if (currentItem.cancelled !== null) {
          CancelledDatesSet.add(currentItem.date);
          status = -1;
        } else if (currentItem.received !== null) {
          status = 1;
        } else {
          status = 0;
        }

        // Add to extra milk entries if extra quantity exists
        if (currentItem.extra > 0) {
          ExtraMilkEntries.push({
            date: currentItem.date,
            qty: currentItem.extra,
          });
        }

        acc[currentItem.date] = { ...currentItem, status: status };
        return acc;
      }, {});

      if (isMountedRef.current) {
        setBookingStatus(dataByDate);
        setSelectedCancelDates(CancelledDatesSet);
        setFinalExtraEntries(ExtraMilkEntries);
      }
    } catch (err) {
      console.error("Error fetching booking status:", err);
      // Optionally show error to user
      if (isMountedRef.current && activeBooking?.transid) {
        Alert.alert("Error", "Failed to fetch booking status");
      }
    } finally {
      if (isMountedRef.current) {
        if (showGlobalLoading) setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const refreshBookingStatus = React.useCallback(() => {
    if (!activeBooking?.transid || refreshing) return;
    setRefreshing(true);
    GetBookingStatus({ showGlobalLoading: false });
  }, [activeBooking?.transid, refreshing]);
  const UpdateBookingConfigurations = async (bookingid) => {
    try {
      setLoading(true, "Updating Booking Configurations");
      const myArray = [...selectedCancelDates];


      // Prepare the extramilk data in the required format
      const extramilkData = finalExtraEntries.map((item) => ({
        date: item.date,
        qty: item.qty, // Make sure this matches your data structure
      }));

      console.log({
        transid: bookingid,
        dates: myArray,
        extramilk: extramilkData, // Add the extramilk data to the payload
      });

      const res = await API.PUT("DailyMilkStatus/cancel-dates-and-extra-milk", {
        transid: bookingid,
        dates: myArray,
        extramilk: extramilkData, // Add the extramilk data to the payload
      });

      console.log(res);
      Alert.alert("Message", res.message);
    } catch (err) {
      console.log(err);
      Alert.alert(
        "Error",
        getUserFacingErrorMessage(err, "Failed to update booking configurations")
      );
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
    if (isMountedRef.current) setupd((prev) => prev + 1);
  };

  const nextMonthDate = useMemo(() => {
    if (bookingDate) {
      const [y, m, d] = bookingDate.split("-").map((x) => parseInt(x, 10));
      const initialDate = new Date(y, m - 1, d);
      initialDate.setDate(initialDate.getDate() + 29);
      return formatDateYYYYMMDD(initialDate);
    }
    return null;
  }, [bookingDate]);

  // --- 2) Build the current week (Mon–Sun) around today ---
  const [weekArray, setWeekArray] = useState([]);
  useEffect(() => {
    const today = new Date();
    const dow = today.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(today);
    mon.setDate(today.getDate() + diffToMon);
    const tmp = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      tmp.push(d);
    }
    setWeekArray(tmp);

    if (activeBooking?.bookingstartdate) {
      setbookingDate(String(activeBooking.bookingstartdate).split("T")[0]);
    }
  }, [activeBooking?.bookingstartdate]);

  // --- 3) Which dates you're allowed to cancel? (only booked days) ---
  const cancelEnabledDates = useMemo(() => {
    if (bookingDate && nextMonthDate) {
      const set = new Set();
      const [y, m, d] = bookingDate.split("-").map((x) => parseInt(x, 10));
      const cursor = new Date(y, m - 1, d);
      const today = new Date();
      while (true) {
        const s = formatDateYYYYMMDD(cursor);
        if (today < cursor) set.add(s);
        if (s === nextMonthDate) break;
        cursor.setDate(cursor.getDate() + 1);
      }
      return set;
    }
  }, [nextMonthDate]);

  // --- Handlers for Cancel-modal ---
  function toggleCancelDate(day) {
    const date = day.dateString;
    if (!cancelEnabledDates.has(date)) return;

    setSelectedCancelDates((prev) => {
      const c = new Set(prev);
      c.has(date) ? c.delete(date) : c.add(date);
      return c;
    });
  }

  function confirmCancellations() {
    setBookingStatus((prev) => {
      const next = { ...prev };
      selectedCancelDates.forEach((d) => {
        next[d] = false;
      });
      return next;
    });
    setCancelModalVisible(false);
  }

  // --- Handlers for Extra-modal ---
  const extraMilkEnabledDates = useMemo(() => {
    if (bookingDate && nextMonthDate) {
      const set = new Set();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [y, m, d] = nextMonthDate.split("-").map((x) => parseInt(x, 10));
      const endDate = new Date(y, m - 1, d);

      const cursor = new Date(tomorrow);
      while (cursor <= endDate) {
        const s = formatDateYYYYMMDD(cursor);
        set.add(s);
        cursor.setDate(cursor.getDate() + 1);
      }
      return set;
    }
    return new Set();
  }, [bookingDate, nextMonthDate]);



  function onDayPressExtra(day) {
    const date = day.dateString;

    // Check if date is enabled for extra milk
    if (!extraMilkEnabledDates.has(date)) {
      return;
    }

    // Check if date is cancelled
    if (selectedCancelDates.has(date)) {
      Alert.alert(
        "Date Cancelled",
        `The date ${date} has been cancelled and cannot be modified.`,
        [{ text: "OK" }]
      );
      return;
    }

    setCurrentExtraDate(date);
    const existingEntry = finalExtraEntries.find((e) => e.date === date);
    setExtraQtyInput(existingEntry ? String(existingEntry.qty) : "");
  }

  const handleAddExtraEntry = () => {
    const qty = parseFloat(extraQtyInput);

    if (!currentExtraDate || isNaN(qty) || qty < 0) {
      Alert.alert(
        "Invalid Input",
        "Please enter a valid positive quantity (0 to remove entry)."
      );
      return;
    }

    setFinalExtraEntries((prevEntries) => {
      if (qty <= 0) {
        return prevEntries.filter((e) => e.date !== currentExtraDate);
      }
      const filtered = prevEntries.filter((e) => e.date !== currentExtraDate);
      return [...filtered, { date: currentExtraDate, qty }];
    });

    setCurrentExtraDate(null);
    setExtraQtyInput("");
  };

  const cancelMarkedDates = useMemo(() => {
    if (cancelEnabledDates) {
      const m = {};
      cancelEnabledDates.forEach((dateStr) => {
        m[dateStr] = { disabled: false, disableTouchEvent: false };
      });
      const [oneDate] = cancelEnabledDates;
      if (oneDate) {
        const [yStr, mStr] = oneDate
          .split("-")
          .map((x, i) => (i < 2 ? parseInt(x, 10) : null));
        const daysInThisMonth = new Date(yStr, mStr, 0).getDate();
        for (let dd = 1; dd <= daysInThisMonth; dd++) {
          const candidate = `${yStr}-${String(mStr).padStart(2, "0")}-${String(
            dd
          ).padStart(2, "0")}`;
          if (!cancelEnabledDates.has(candidate)) {
            m[candidate] = { disabled: true, disableTouchEvent: true };
          }
        }
      }
      selectedCancelDates.forEach((dateStr) => {
        m[dateStr] = {
          ...(m[dateStr] || {}),
          selected: true,
          selectedColor: "#ff5252",
        };
      });
      return m;
    }
  }, [cancelEnabledDates, selectedCancelDates]);


  const extraMarkedDates = useMemo(() => {
    const marked = {};

    // Mark disabled dates (dates not in extraMilkEnabledDates)
    if (extraMilkEnabledDates.size > 0) {
      const [oneDate] = extraMilkEnabledDates;
      const [yStr, mStr] = oneDate
        .split("-")
        .map((x, i) => (i < 2 ? parseInt(x, 10) : null));
      const daysInThisMonth = new Date(yStr, mStr, 0).getDate();

      for (let dd = 1; dd <= daysInThisMonth; dd++) {
        const candidate = `${yStr}-${String(mStr).padStart(2, "0")}-${String(
          dd
        ).padStart(2, "0")}`;
        if (!extraMilkEnabledDates.has(candidate)) {
          marked[candidate] = { disabled: true, disableTouchEvent: true };
        }
      }
    }

    // Mark cancelled dates (assuming cancelledDates is a Set)
    selectedCancelDates.forEach((date) => {
      marked[date] = {
        ...marked[date],
        disabled: true,
        disableTouchEvent: true,
        dotColor: "red",
        marked: true,
        customStyles: {
          container: {
            backgroundColor: "#ffebee", // Light red background
            borderRadius: 5,
          },
          text: {
            color: "#d32f2f", // Darker red text
            textDecorationLine: "line-through",
          },
        },
      };
    });

    // Mark dates with extra milk (only if not cancelled)
    finalExtraEntries.forEach((e) => {
      if (e.qty > 0 && !selectedCancelDates.has(e.date)) {
        marked[e.date] = {
          ...marked[e.date],
          selected: true,
          selectedColor: "#16a34a",
          marked: true,
          dotColor: "#16a34a",
        };
      }
    });

    // Current selected date (only if not cancelled)
    if (
      currentExtraDate &&
      extraMilkEnabledDates.has(currentExtraDate) &&
      !selectedCancelDates.has(currentExtraDate)
    ) {
      marked[currentExtraDate] = {
        ...(marked[currentExtraDate] || {}),
        selected: true,
        selectedColor: "#3498db",
      };
    }

    return marked;
  }, [
    finalExtraEntries,
    currentExtraDate,
    extraMilkEnabledDates,
    selectedCancelDates,
  ]);

  const [applyToAllUpcoming, setApplyToAllUpcoming] = useState(false);
  const [allUpcomingQty, setAllUpcomingQty] = useState("");

  // Add this function to handle applying to all upcoming days
  const handleApplyToAllUpcoming = () => {
    const qty = parseFloat(allUpcomingQty);
    if (isNaN(qty)) return;

    const today = new Date();
    today.setDate(today.getDate() + 1); // Start from tomorrow

    const [y, m, d] = nextMonthDate.split("-").map((x) => parseInt(x, 10));
    const endDate = new Date(y, m - 1, d);

    const newEntries = [];
    const cursor = new Date(today);
    while (cursor <= endDate) {
      const dateStr = formatDateYYYYMMDD(cursor);
      newEntries.push({ date: dateStr, qty });
      cursor.setDate(cursor.getDate() + 1);
    }

    if (qty === 0) {
      setFinalExtraEntries([]);
    } else {
      setFinalExtraEntries((prev) => [
        ...prev.filter((e) => {
          const entryDate = new Date(e.date);
          return entryDate < today || entryDate > endDate;
        }),
        ...newEntries,
      ]);
    }
    setApplyToAllUpcoming(false);
    setAllUpcomingQty("");
  };

  console.warn("BookingStatusTable:", bookingStatusTable);

  const deliverySummary = (Array.isArray(bookingStatusTable) ? bookingStatusTable : []).reduce(
    (summary, item) => {
      if (item?.cancelled != null) summary.cancelled += 1;
      else if (item?.received != null) summary.delivered += 1;
      else summary.pending += 1;
      if (Number(item?.extra || 0) > 0) summary.extraDays += 1;
      return summary;
    },
    { delivered: 0, pending: 0, cancelled: 0, extraDays: 0 }
  );
  const milkValueSummary = (Array.isArray(bookingStatusTable) ? bookingStatusTable : []).reduce(
    (summary, item) => {
      if (isDailyMilkCancelled(item?.cancelled)) return summary;

      const quantity = Number(item?.quantity || 0);
      const extra = Number(item?.extra || 0);
      const amount = Number(item?.amount || 0);
      const unitPrice = quantity > 0 ? amount / quantity : 0;
      const totalLitres = quantity + extra;
      const totalAmount = amount + (unitPrice * extra);

      summary.totalLitres += totalLitres;
      summary.totalAmount += totalAmount;
      if (item?.received) {
        summary.receivedLitres += totalLitres;
        summary.receivedAmount += totalAmount;
      }
      return summary;
    },
    { totalLitres: 0, totalAmount: 0, receivedLitres: 0, receivedAmount: 0 }
  );
  milkValueSummary.remainingLitres = Math.max(0, milkValueSummary.totalLitres - milkValueSummary.receivedLitres);
  milkValueSummary.remainingAmount = Math.max(0, milkValueSummary.totalAmount - milkValueSummary.receivedAmount);
  const bookingQuantity = Number(activeBooking?.quantity || 0);
  const bookingUnitPrice = Number(activeBooking?.price || 0);
  const bookingDailyAmount = bookingQuantity * bookingUnitPrice;
  const deliveryBatch = String(activeBooking?.deliverytype || '').trim();
  const isEveningBatch = deliveryBatch.toLowerCase().includes('evening');
  const isMorningBatch = deliveryBatch.toLowerCase().includes('morning');
  const batchIcon = isEveningBatch ? 'moon-o' : isMorningBatch ? 'sun-o' : 'clock-o';
  const batchWrapClass = isEveningBatch
    ? 'bg-indigo-950 border-indigo-800'
    : isMorningBatch
      ? 'bg-amber-950 border-amber-800'
      : 'bg-gray-800 border-gray-700';
  const batchTextClass = isEveningBatch
    ? 'text-indigo-200'
    : isMorningBatch
      ? 'text-amber-200'
      : 'text-gray-300';
  const batchIconColor = isEveningBatch ? '#a5b4fc' : isMorningBatch ? '#fbbf24' : '#d1d5db';
  const previewTheme = DAILY_MILK_STATUS_THEME;
  const themedCardStyle = {
    backgroundColor: previewTheme.card,
    borderColor: previewTheme.border,
  };
  const themedSoftCardStyle = {
    backgroundColor: previewTheme.softCard,
    borderColor: previewTheme.border,
  };
  const themedTextStyle = { color: previewTheme.text };
  const themedMutedTextStyle = { color: previewTheme.mutedText };
  const themedSubtleTextStyle = { color: previewTheme.subtleText };

  const SectionToggle = ({ title, subtitle, icon, expanded, onPress, accent = "#60a5fa" }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-row items-center px-3 py-3"
    >
      <View
        className="w-9 h-9 rounded-lg items-center justify-center mr-3 border"
        style={themedSoftCardStyle}
      >
        <Icon name={icon} size={16} color={accent} />
      </View>
      <View className="flex-1 mr-2">
        <Text className="text-sm font-bold" style={themedTextStyle}>{title}</Text>
        <Text className="text-[11px] mt-0.5" style={themedSubtleTextStyle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Icon name={expanded ? "chevron-up" : "chevron-down"} size={15} color={previewTheme.subtleText} />
    </TouchableOpacity>
  );

  if (!activeBooking) {
    return (
      <View className="flex-1 items-center justify-center px-4" style={{ backgroundColor: previewTheme.page }}>
        <Text className="text-base font-semibold text-center" style={themedTextStyle}>
          Loading daily milk booking details...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 w-full"
      style={{ backgroundColor: previewTheme.page }}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 32,
        minHeight: "100%",
        backgroundColor: previewTheme.page,
      }}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshBookingStatus}
          tintColor={previewTheme.accent}
          colors={[previewTheme.accent]}
          progressBackgroundColor={previewTheme.card}
        />
      }
    >
      <View className="flex-row items-center justify-between mb-3 px-1">
        <View>
          <Text className="text-lg font-black" style={themedTextStyle}>Daily Milk</Text>
          <Text className="text-xs mt-0.5" style={themedSubtleTextStyle}>Booking and delivery status</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={refreshBookingStatus}
            disabled={refreshing}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Refresh daily milk status"
            className="w-8 h-8 rounded-full border items-center justify-center mr-2"
            style={{
              backgroundColor: previewTheme.softCard,
              borderColor: previewTheme.border,
              opacity: refreshing ? 0.7 : 1,
            }}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={previewTheme.accent} />
            ) : (
              <Icon name="refresh" size={13} color={previewTheme.accent} />
            )}
          </TouchableOpacity>
          <View
            className="px-2.5 py-1 rounded-full border"
            style={{
              backgroundColor: previewTheme.softCard,
              borderColor: previewTheme.accent,
            }}
          >
            <Text className="text-[10px] font-black uppercase" style={{ color: previewTheme.accent }}>Active</Text>
          </View>
        </View>
      </View>

      <View className="border rounded-lg mb-2 overflow-hidden" style={themedCardStyle}>
        <TouchableOpacity
          onPress={() => setShowBookingDetails((value) => !value)}
          activeOpacity={0.88}
          className="p-3"
        >
          <View className="flex-row items-start">
            <View
              className="w-10 h-10 rounded-lg items-center justify-center mr-3 border"
              style={{
                backgroundColor: previewTheme.softCard,
                borderColor: previewTheme.accent,
              }}
            >
              <Icon name="tint" size={18} color={previewTheme.accent} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-black flex-1 mr-2" style={themedTextStyle} numberOfLines={1}>
                  {activeBooking.productname || "Daily Milk"}
                </Text>
                <Icon name={showBookingDetails ? "chevron-up" : "chevron-down"} size={15} color={previewTheme.subtleText} />
              </View>
              <View className="flex-row items-center flex-wrap mt-1">
                <Text className="text-xs mr-2" style={themedMutedTextStyle}>
                  {bookingQuantity.toFixed(1)} L
                </Text>
                <Text className="text-xs mr-2" style={themedMutedTextStyle}>
                  ₹{bookingUnitPrice.toFixed(2)}/L
                </Text>
                <Text className="text-xs font-bold mr-2" style={{ color: previewTheme.accent }}>
                  ₹{bookingDailyAmount.toFixed(2)}/day
                </Text>
                <View className={`flex-row items-center border rounded-full px-2 py-1 ${batchWrapClass}`}>
                  <Icon name={batchIcon} size={11} color={batchIconColor} />
                  <Text className={`text-[10px] font-bold ml-1 ${batchTextClass}`}>
                    {deliveryBatch || 'Delivery'} Batch
                  </Text>
                </View>
              </View>
              <Text className="text-[11px] mt-2" style={themedSubtleTextStyle}>
                {formatFriendly(activeBooking.bookingstartdate)} - {formatFriendly(activeBooking.bookingenddate)}
              </Text>
            </View>
          </View>

          {showBookingDetails ? (
            <View className="mt-3 pt-3 border-t" style={{ borderTopColor: previewTheme.border }}>
              <View className="flex-row justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-[10px] uppercase" style={themedSubtleTextStyle}>User ID</Text>
                  <Text className="text-xs font-semibold mt-0.5" style={themedMutedTextStyle} numberOfLines={1}>{activeBooking.userid || "N/A"}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] uppercase" style={themedSubtleTextStyle}>Registration</Text>
                  <Text className="text-xs font-semibold mt-0.5" style={themedMutedTextStyle} numberOfLines={1}>{activeBooking.dailymilkregistrationid || "N/A"}</Text>
                </View>
              </View>
              <View className="flex-row mt-3">
                <View className="flex-1 rounded-lg border px-2.5 py-2 mr-1" style={themedSoftCardStyle}>
                  <Text className="text-[10px] uppercase" style={themedSubtleTextStyle}>Rate for 1 L</Text>
                  <Text className="text-sm font-black mt-0.5" style={themedTextStyle}>₹{bookingUnitPrice.toFixed(2)}</Text>
                </View>
                <View className="flex-1 rounded-lg border px-2.5 py-2 ml-1" style={themedSoftCardStyle}>
                  <Text className="text-[10px] uppercase" style={themedSubtleTextStyle}>Your daily amount</Text>
                  <Text className="text-sm font-black mt-0.5" style={{ color: previewTheme.accent }}>
                    ₹{bookingDailyAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
              {Number(activeBooking.pregnancy_status || 0) === 1 ? (
                <View className="flex-row items-center bg-amber-950 border border-amber-800 px-2.5 py-2 rounded-lg mt-3">
                  <Icon name="heart" size={13} color="#fbbf24" />
                  <Text className="text-[11px] font-semibold text-amber-200 ml-2">Pregnancy care: complimentary 250 ml daily</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View className="flex-row mb-2">
        <View className="flex-1 border border-l-4 border-l-green-500 rounded-lg px-3 py-2 mr-1" style={themedCardStyle}>
          <Text className="text-[10px]" style={themedSubtleTextStyle}>Delivered</Text>
          <Text className="text-lg font-black text-green-400">{deliverySummary.delivered}</Text>
        </View>
        <View className="flex-1 border border-l-4 border-l-amber-500 rounded-lg px-3 py-2 mx-1" style={themedCardStyle}>
          <Text className="text-[10px]" style={themedSubtleTextStyle}>Pending</Text>
          <Text className="text-lg font-black text-amber-400">{deliverySummary.pending}</Text>
        </View>
        <View className="flex-1 border border-l-4 border-l-red-500 rounded-lg px-3 py-2 ml-1" style={themedCardStyle}>
          <Text className="text-[10px]" style={themedSubtleTextStyle}>Cancelled</Text>
          <Text className="text-lg font-black text-red-400">{deliverySummary.cancelled}</Text>
        </View>
      </View>

      <View className="flex-row mb-2">
        <View className="flex-1 border rounded-lg px-2.5 py-2 mr-1" style={themedCardStyle}>
          <Text className="text-[10px]" style={themedSubtleTextStyle}>Total</Text>
          <Text className="text-sm font-black text-blue-300 mt-0.5">
            {milkValueSummary.totalLitres.toFixed(1)} L
          </Text>
          <Text className="text-[10px]" style={themedSubtleTextStyle}>₹{milkValueSummary.totalAmount.toFixed(2)}</Text>
        </View>
        <View className="flex-1 border rounded-lg px-2.5 py-2 mx-1" style={themedCardStyle}>
          <Text className="text-[10px]" style={themedSubtleTextStyle}>Received</Text>
          <Text className="text-sm font-black text-green-300 mt-0.5">
            {milkValueSummary.receivedLitres.toFixed(1)} L
          </Text>
          <Text className="text-[10px]" style={themedSubtleTextStyle}>₹{milkValueSummary.receivedAmount.toFixed(2)}</Text>
        </View>
        <View className="flex-1 border rounded-lg px-2.5 py-2 ml-1" style={themedCardStyle}>
          <Text className="text-[10px]" style={themedSubtleTextStyle}>Remaining</Text>
          <Text className="text-sm font-black text-amber-300 mt-0.5">
            {milkValueSummary.remainingLitres.toFixed(1)} L
          </Text>
          <Text className="text-[10px]" style={themedSubtleTextStyle}>₹{milkValueSummary.remainingAmount.toFixed(2)}</Text>
        </View>
      </View>

      <View className="border rounded-lg mb-2 overflow-hidden" style={themedCardStyle}>
        <SectionToggle
          title="This Week"
          subtitle="Seven-day delivery overview"
          icon="calendar"
          expanded={showWeek}
          onPress={() => setShowWeek((value) => !value)}
        />
        {showWeek ? (
          <View className="flex-row justify-between px-2 pb-3 border-t pt-3" style={{ borderTopColor: previewTheme.border }}>
            {weekArray.map((d) => {
          const ds = formatDateYYYYMMDD(d);
          const dayLabel = dayNames[d.getDay()];
          const dayData = bookingStatus[ds];
          var status = dayData ? dayData.status : 2;
          const isToday = d.toDateString() === new Date().toDateString();
          const extra = finalExtraEntries.find((e) => e.date === ds)?.qty;

          if (status === 0 && new Date() > new Date(d)) {
            status = 3;
          }

          let iconName;
          let iconColor;
          switch (status) {
            case 1:
              iconName = "check-circle";
              iconColor = "#16a34a";
              break;
            case -1:
              iconName = "times-circle";
              iconColor = "#dc2626";
              break;
            case 0:
              iconName = "clock-o";
              iconColor = "#4b5563";
              break;
            case 2:
              iconName = "minus-circle";
              iconColor = "#4b5563";
              break;
            case 3:
              iconName = "exclamation-triangle";
              iconColor = "#FFA500";
              break;
            default:
              iconName = "ban";
              iconColor = "#9ca3af";
          }

          return (
              <View
              key={ds}
              className={`flex-1 items-center justify-center py-2 rounded-lg mx-0.5 ${isToday ? "border" : ""
                }`}
              style={
                isToday
                  ? { backgroundColor: previewTheme.softCard, borderColor: previewTheme.accent }
                  : { backgroundColor: previewTheme.softCard }
              }
            >
              <Text
                className="text-xs font-semibold uppercase"
                style={{ color: isToday ? previewTheme.accent : previewTheme.subtleText }}
              >
                {dayLabel}
              </Text>
              <Text
                className="text-base font-bold mt-1"
                style={themedTextStyle}
              >
                {d.getDate()}
              </Text>
              <Icon
                name={iconName}
                size={16}
                color={iconColor}
                className="mt-1.5"
              />
              {extra != null && (
                <View className="mt-1.5 bg-green-950 px-1.5 py-0.5 rounded border border-green-800">
                  <Text className="text-xs text-green-300 font-medium">
                    +{extra}L
                  </Text>
                </View>
              )}
            </View>
          );
            })}
          </View>
        ) : null}
      </View>

      {FromAdmin !== 1 && (
        <View className="border rounded-lg mb-2 overflow-hidden" style={themedCardStyle}>
          <SectionToggle
            title="Manage Booking"
            subtitle="Cancel dates, add milk, payments and history"
            icon="sliders"
            expanded={showActions}
            onPress={() => setShowActions((value) => !value)}
            accent="#a78bfa"
          />
          {showActions ? (
            <View className="px-3 pb-3 pt-3 border-t" style={{ borderTopColor: previewTheme.border }}>
              <View className="flex-row mb-2">
            <TouchableOpacity
              className="flex-1 bg-red-950 border border-red-800 mr-1 py-2.5 rounded-lg items-center flex-row justify-center"
              onPress={() => setCancelModalVisible(true)}
            >
              <Icon name="calendar-times-o" size={14} color="#dc2626" />
              <Text className="text-red-300 text-xs font-bold ml-2">Cancel Date</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-green-950 border border-green-800 ml-1 py-2.5 rounded-lg items-center flex-row justify-center"
              onPress={() => setExtraModalVisible(true)}
            >
              <Icon name="plus-circle" size={14} color="#15803d" />
              <Text className="text-green-300 text-xs font-bold ml-2">Extra Milk</Text>
            </TouchableOpacity>
          </View>

            <TouchableOpacity
              className="bg-blue-600 py-3 rounded-lg items-center flex-row justify-center mb-2"
              onPress={() => UpdateBookingConfigurations(activeBooking.transid)}
            >
              <Icon name="save" size={14} color="#ffffff" />
              <Text className="text-white text-xs font-bold ml-2">Save Changes</Text>
            </TouchableOpacity>
              <View className="flex-row">
                <TouchableOpacity
                  className="flex-1 border py-2.5 rounded-lg items-center flex-row justify-center mr-1"
                  style={themedSoftCardStyle}
                  onPress={() => navigation.navigate("DailyMilkPayment")}
                >
                  <Icon name="credit-card" size={13} color={previewTheme.mutedText} />
                  <Text className="text-xs font-bold ml-2" style={themedMutedTextStyle}>Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 border py-2.5 rounded-lg items-center flex-row justify-center ml-1"
                  style={themedSoftCardStyle}
                  onPress={() => navigation.navigate("DailyMilk_User_AccountsManage", { userid: activeBooking.userid })}
                >
                  <Icon name="history" size={13} color={previewTheme.mutedText} />
                  <Text className="text-xs font-bold ml-2" style={themedMutedTextStyle}>Bookings</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                className="mt-2 border py-3 rounded-lg items-center flex-row justify-center"
                style={{
                  backgroundColor: previewTheme.softCard,
                  borderColor: previewTheme.accent,
                }}
                onPress={() =>
                  navigation.navigate("DailyMilkComplaintChat", {
                    mode: "user",
                    userid: activeBooking.userid,
                  })
                }
              >
                <Icon name="comments" size={15} color={previewTheme.accent} />
                <Text className="text-xs font-bold ml-2" style={{ color: previewTheme.accent }}>
                  Daily Milk Complaint
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      <View className="border rounded-lg mb-2 overflow-hidden" style={themedCardStyle}>
        <SectionToggle
          title="Delivery History"
          subtitle={`${deliverySummary.delivered} delivered • ${deliverySummary.pending} pending • ${deliverySummary.extraDays} extra milk`}
          icon="list-alt"
          expanded={showDeliveryHistory}
          onPress={() => setShowDeliveryHistory((value) => !value)}
          accent="#34d399"
        />
        {showDeliveryHistory ? (
          <View className="border-t" style={{ borderTopColor: previewTheme.border }}>
            <MilkStatusTable data={bookingStatusTable || []} embedded />
          </View>
        ) : null}
      </View>

      {/* ─── Cancel Date Modal ─── */}
      <Modal
        visible={isCancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View className="flex-1 justify-center bg-black/50">
          <View className="bg-gray-900 border border-gray-700 m-4 p-4 rounded-lg">
            <Text className="text-lg text-white font-semibold mb-2">
              Select Dates to Cancel
            </Text>
            <Calendar
              minDate={bookingDate}
              maxDate={nextMonthDate}
              onDayPress={toggleCancelDate}
              markingType="multi-dot"
              markedDates={cancelMarkedDates}
              theme={{
                backgroundColor: "#111827",
                calendarBackground: "#111827",
                textSectionTitleColor: "#9ca3af",
                dayTextColor: "#e5e7eb",
                monthTextColor: "#f9fafb",
                arrowColor: "#60a5fa",
                selectedDayBackgroundColor: "#ff6b6b",
                todayTextColor: "#ef4444",
                dotColor: "#ff375f",
                disabledDayTextColor: "#4b5563",
              }}
            />

            <View className="flex-row mt-4 justify-end">
              <TouchableOpacity
                className="px-4 py-2 mr-2"
                onPress={() => setCancelModalVisible(false)}
              >
                <Text className="text-gray-300">Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 bg-red-600 rounded-lg"
                onPress={confirmCancellations}
              >
                <Text className="text-white">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Add Extra Milk Modal ─── */}
      <Modal
        visible={isExtraModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setExtraModalVisible(false);
          setCurrentExtraDate(null);
          setExtraQtyInput("");
          setApplyToAllUpcoming(false);
          setAllUpcomingQty("");
        }}
      >
        <View className="flex-1 justify-center bg-black/50">
          <View className="bg-gray-900 border border-gray-700 m-4 p-4 rounded-lg">
            <Text className="text-lg text-white font-semibold mb-2">Add Extra Milk</Text>

            <Calendar
              minDate={formatDateYYYYMMDD(
                new Date(new Date().setDate(new Date().getDate() + 1))
              )}
              maxDate={nextMonthDate}
              onDayPress={onDayPressExtra}
              markingType="multi-dot"
              markedDates={extraMarkedDates}
              theme={{
                backgroundColor: "#111827",
                calendarBackground: "#111827",
                textSectionTitleColor: "#9ca3af",
                dayTextColor: "#e5e7eb",
                monthTextColor: "#f9fafb",
                arrowColor: "#4ade80",
                selectedDayBackgroundColor: "#16a34a",
                todayTextColor: "#ef4444",
                dotColor: "#16a34a",
                disabledDayTextColor: "#4b5563",
                "stylesheet.calendar.main": {
                  dayContainer: {
                    borderWidth: 1,
                    borderColor: "transparent",
                  },
                  disabledDayText: {
                    color: "#d1d5db",
                  },
                },
              }}
            />

            {/* Add the new "Apply to all" section */}
            <View className="mt-4 flex-row items-center">
              <TouchableOpacity
                onPress={() => setApplyToAllUpcoming(!applyToAllUpcoming)}
                className="mr-2"
              >
                <View
                  className={`w-5 h-5 border rounded ${applyToAllUpcoming
                    ? "bg-green-500 border-green-500"
                    : "border-gray-400"
                    }`}
                >
                  {applyToAllUpcoming && (
                    <Icon name="check" size={14} color="white" />
                  )}
                </View>
              </TouchableOpacity>
              <Text className="text-gray-200">Same for all upcoming days</Text>
            </View>

            {applyToAllUpcoming ? (
              <View className="mt-2">
                <Text className="mb-1 text-gray-300">
                  Quantity for all upcoming days (liters):
                </Text>
                <TextInput
                  className="border border-gray-700 bg-gray-800 text-white rounded-lg p-2 mb-4"
                  placeholderTextColor="#6b7280"
                  keyboardType="numeric"
                  placeholder="e.g. 0.5"
                  value={allUpcomingQty}
                  onChangeText={setAllUpcomingQty}
                />
                <TouchableOpacity
                  className="px-4 py-2 bg-green-600 rounded-lg items-center"
                  onPress={handleApplyToAllUpcoming}
                >
                  <Text className="text-white">Apply to All</Text>
                </TouchableOpacity>
              </View>
            ) : (
              currentExtraDate && (
                <View className="mt-4">
                  <Text className="mb-1 text-gray-300">
                    How many liters on {currentExtraDate}?
                  </Text>
                  <TextInput
                    className="border border-gray-700 bg-gray-800 text-white rounded-lg p-2 mb-4"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    placeholder="e.g. 0.5"
                    value={extraQtyInput}
                    onChangeText={setExtraQtyInput}
                  />
                  <View className="flex-row justify-end">
                    <TouchableOpacity
                      className="px-4 py-2 mr-2"
                      onPress={() => {
                        setCurrentExtraDate(null);
                        setExtraQtyInput("");
                      }}
                    >
                      <Text className="text-gray-300">Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="px-4 py-2 bg-green-600 rounded-lg"
                      onPress={handleAddExtraEntry}
                    >
                      <Text className="text-white">Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            )}

            <View className="flex-row mt-4 justify-end">
              <TouchableOpacity
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                onPress={() => {
                  setExtraModalVisible(false);
                  setCurrentExtraDate(null);
                  setExtraQtyInput("");
                  setApplyToAllUpcoming(false);
                  setAllUpcomingQty("");
                }}
              >
                <Text className="text-gray-200">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
