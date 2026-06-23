import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Calendar } from "react-native-calendars";
import Icon from "react-native-vector-icons/FontAwesome";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import MilkStatusTable from "./DailyMilkStatusTable";
import { useNavigation } from "@react-navigation/native";

// Format a Date object as "YYYY-MM-DD"
function formatDateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Format an ISO string as "Jun 07, 2025"
function formatFriendly(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DailyMilkStatus({ BookingData, FromAdmin }) {
  console.warn("BookingData in DailyMilkStatus:", BookingData);
  const activeBooking = Array.isArray(BookingData)
    ? BookingData.find((item) => item?.transid && item?.bookingstartdate)
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



  const GetBookingStatus = async () => {

    console.warn("1111111111111111111111111", BookingData)
    if (!activeBooking?.transid) {
      if (isMountedRef.current) setBookingStatusTable([]);
      return;
    }
    if (isMountedRef.current) setLoading(true, "Fetching Booking Status");
   
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
      if (isMountedRef.current) setLoading(false);
    }
  };
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
        err.message || "Failed to update booking configurations"
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

  const SectionToggle = ({ title, subtitle, icon, expanded, onPress, accent = "#60a5fa" }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-row items-center px-3 py-3"
    >
      <View className="w-9 h-9 rounded-lg bg-gray-800 items-center justify-center mr-3 border border-gray-700">
        <Icon name={icon} size={16} color={accent} />
      </View>
      <View className="flex-1 mr-2">
        <Text className="text-sm font-bold text-white">{title}</Text>
        <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>{subtitle}</Text>
      </View>
      <Icon name={expanded ? "chevron-up" : "chevron-down"} size={15} color="#9ca3af" />
    </TouchableOpacity>
  );

  if (!activeBooking) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-white text-base font-semibold text-center">
          Loading daily milk booking details...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 w-full bg-gray-950"
      contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center justify-between mb-3 px-1">
        <View>
          <Text className="text-lg font-black text-white">Daily Milk</Text>
          <Text className="text-xs text-gray-400 mt-0.5">Booking and delivery status</Text>
        </View>
        <View className="bg-green-100 border border-green-200 px-2.5 py-1 rounded-full">
          <Text className="text-[10px] font-bold text-green-700 uppercase">Active</Text>
        </View>
      </View>

      <View className="bg-gray-900 border border-gray-700 rounded-lg mb-2 overflow-hidden">
        <TouchableOpacity
          onPress={() => setShowBookingDetails((value) => !value)}
          activeOpacity={0.88}
          className="p-3"
        >
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-lg bg-blue-950 items-center justify-center mr-3 border border-blue-800">
              <Icon name="tint" size={18} color="#60a5fa" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-black text-white flex-1 mr-2" numberOfLines={1}>
                  {activeBooking.productname || "Daily Milk"}
                </Text>
                <Icon name={showBookingDetails ? "chevron-up" : "chevron-down"} size={15} color="#9ca3af" />
              </View>
              <Text className="text-xs text-gray-300 mt-0.5">
                {activeBooking.quantity || 0} L • {activeBooking.deliverytype || "Delivery slot"} • ₹{Number(activeBooking.price || 0).toFixed(2)}
              </Text>
              <Text className="text-[11px] text-gray-400 mt-2">
                {formatFriendly(activeBooking.bookingstartdate)} - {formatFriendly(activeBooking.bookingenddate)}
              </Text>
            </View>
          </View>

          {showBookingDetails ? (
            <View className="mt-3 pt-3 border-t border-gray-700">
              <View className="flex-row justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-[10px] text-gray-500 uppercase">User ID</Text>
                  <Text className="text-xs font-semibold text-gray-200 mt-0.5" numberOfLines={1}>{activeBooking.userid || "N/A"}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] text-gray-500 uppercase">Registration</Text>
                  <Text className="text-xs font-semibold text-gray-200 mt-0.5" numberOfLines={1}>{activeBooking.dailymilkregistrationid || "N/A"}</Text>
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
        <View className="flex-1 bg-gray-900 border border-gray-700 border-l-4 border-l-green-500 rounded-lg px-3 py-2 mr-1">
          <Text className="text-[10px] text-gray-400">Delivered</Text>
          <Text className="text-lg font-black text-green-400">{deliverySummary.delivered}</Text>
        </View>
        <View className="flex-1 bg-gray-900 border border-gray-700 border-l-4 border-l-amber-500 rounded-lg px-3 py-2 mx-1">
          <Text className="text-[10px] text-gray-400">Pending</Text>
          <Text className="text-lg font-black text-amber-400">{deliverySummary.pending}</Text>
        </View>
        <View className="flex-1 bg-gray-900 border border-gray-700 border-l-4 border-l-red-500 rounded-lg px-3 py-2 ml-1">
          <Text className="text-[10px] text-gray-400">Cancelled</Text>
          <Text className="text-lg font-black text-red-400">{deliverySummary.cancelled}</Text>
        </View>
      </View>

      <View className="bg-gray-900 border border-gray-700 rounded-lg mb-2 overflow-hidden">
        <SectionToggle
          title="This Week"
          subtitle="Seven-day delivery overview"
          icon="calendar"
          expanded={showWeek}
          onPress={() => setShowWeek((value) => !value)}
        />
        {showWeek ? (
          <View className="flex-row justify-between px-2 pb-3 border-t border-gray-700 pt-3">
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
              className={`flex-1 items-center justify-center py-2 rounded-lg mx-0.5 ${isToday ? "bg-blue-950 border border-blue-500" : "bg-gray-800"
                }`}
            >
              <Text
                className={`text-xs font-semibold uppercase ${isToday ? "text-blue-300" : "text-gray-400"
                  }`}
              >
                {dayLabel}
              </Text>
              <Text
                className={`text-base font-bold mt-1 ${isToday ? "text-blue-100" : "text-gray-200"
                  }`}
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
        <View className="bg-gray-900 border border-gray-700 rounded-lg mb-2 overflow-hidden">
          <SectionToggle
            title="Manage Booking"
            subtitle="Cancel dates, add milk, payments and history"
            icon="sliders"
            expanded={showActions}
            onPress={() => setShowActions((value) => !value)}
            accent="#a78bfa"
          />
          {showActions ? (
            <View className="px-3 pb-3 pt-3 border-t border-gray-700">
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
                  className="flex-1 bg-gray-800 border border-gray-700 py-2.5 rounded-lg items-center flex-row justify-center mr-1"
                  onPress={() => navigation.navigate("DailyMilkPayment")}
                >
                  <Icon name="credit-card" size={13} color="#d1d5db" />
                  <Text className="text-gray-200 text-xs font-bold ml-2">Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-gray-800 border border-gray-700 py-2.5 rounded-lg items-center flex-row justify-center ml-1"
                  onPress={() => navigation.navigate("DailyMilk_User_AccountsManage", { userid: activeBooking.userid })}
                >
                  <Icon name="history" size={13} color="#d1d5db" />
                  <Text className="text-gray-200 text-xs font-bold ml-2">Bookings</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      )}

      <View className="bg-gray-900 border border-gray-700 rounded-lg mb-2 overflow-hidden">
        <SectionToggle
          title="Delivery History"
          subtitle={`${deliverySummary.delivered} delivered • ${deliverySummary.pending} pending • ${deliverySummary.extraDays} extra milk`}
          icon="list-alt"
          expanded={showDeliveryHistory}
          onPress={() => setShowDeliveryHistory((value) => !value)}
          accent="#34d399"
        />
        {showDeliveryHistory ? (
          <View className="border-t border-gray-700">
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
