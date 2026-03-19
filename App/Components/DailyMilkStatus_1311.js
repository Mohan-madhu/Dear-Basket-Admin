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
  // --- 1) Booking-status state ---
  const { setLoading } = useLoading();

  const [bookingStatus, setBookingStatus] = useState({});
  const [bookingDate, setbookingDate] = useState(null);

  const [isCancelModalVisible, setCancelModalVisible] = useState(false);
  const [isExtraModalVisible, setExtraModalVisible] = useState(false);

  const [selectedCancelDates, setSelectedCancelDates] = useState(
    () => new Set()
  );
  const [currentExtraDate, setCurrentExtraDate] = useState(null);
  const [extraQtyInput, setExtraQtyInput] = useState("");
  const [finalExtraEntries, setFinalExtraEntries] = useState([]);

  const [bookingStatusTable, setBookingStatusTable] = useState();
  const [upd, setupd] = useState(0);

  useEffect(() => {
    GetBookingStatus();
  }, [BookingData, upd]);



  const GetBookingStatus = async () => {
    setLoading(true, "Fetching Booking Status");
    console.log(upd);
    try {
      var { Response } = await API.GET(
        "DailyMilkStatus/Dates/" + BookingData[0].transid
      );

      setBookingStatusTable(Response);

      console.log(Response," Booking Status Response");

      const CancelledDatesSet = new Set();
      const ExtraMilkEntries = [];
      const dataByDate = Response.reduce((acc, currentItem) => {
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

      setBookingStatus(dataByDate);
      setSelectedCancelDates(CancelledDatesSet);
      setFinalExtraEntries(ExtraMilkEntries);
    } catch (err) {
      setLoading(false);
      console.error("Error fetching booking status:", err);
      // Optionally show error to user
      Alert.alert("Error", "Failed to fetch booking status");
    } finally {
      setLoading(false);
    }
  };
  const UpdateBookingConfigurations = async (bookingid) => {
    try {
      setLoading(true, "Updating Booking Configurations");
      const myArray = [...selectedCancelDates];

      console.log(finalExtraEntries);
      console.log(cancelEnabledDates);

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
      setLoading(false);
    }
    setupd((prev) => prev + 1);
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

    setbookingDate(BookingData[0].bookingstartdate.split("T")[0]);
  }, []);

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

  return (
    <ScrollView className="flex-1 px-4 pt-2 w-full">
      {/* ─── Header ─── */}
      <Text className="text-xl font-semibold mb-4 text-center text-white">
        Daily Milk Order Status
      </Text>

      {/* ─── 1) Booking Details Cards ─── */}
      <FlatList
        data={BookingData}
        keyExtractor={(item) => item.bookingid}
        className="mb-2"
        renderItem={({ item }) => (
          <View className="bg-white p-4 rounded-xl shadow mb-4">
            <Text className="text-lg font-bold mb-1">
              {item.productname} ({item.deliverytype})
            </Text>
            <Text className="text-sm text-gray-600">
              Registration ID: {item.dailymilkregistrationid}
            </Text>
            <View className="flex-row mt-2">
              <View className="flex-1">
                <Text className="text-xs text-gray-500">Start</Text>
                <Text className="text-base">
                  {formatFriendly(item.bookingstartdate)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500">End</Text>
                <Text className="text-base">
                  {formatFriendly(item.bookingenddate)}
                </Text>
              </View>
            </View>
            <View className="flex-row mt-2 justify-between">
              <Text className="text-sm">Qty: {item.quantity} L</Text>
              <Text className="text-sm font-semibold">₹{item.price}</Text>
            </View>
          </View>
        )}
      />

      {/* ─── 2) Weekly Status Grid ─── */}
      <View className="flex-row justify-between p-2 bg-gray-50 rounded-xl shadow mb-6">
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
              className={`flex-1 items-center justify-center p-2 rounded-lg mx-0.2 ${isToday ? "bg-blue-50 border-2 border-blue-500" : "bg-gray-50"
                }`}
            >
              <Text
                className={`text-xs font-semibold uppercase ${isToday ? "text-blue-600" : "text-gray-500"
                  }`}
              >
                {dayLabel}
              </Text>
              <Text
                className={`text-base font-bold mt-1 ${isToday ? "text-blue-800" : "text-gray-700"
                  }`}
              >
                {d.getDate()}
              </Text>
              <Icon
                name={iconName}
                size={20}
                color={iconColor}
                className="mt-1.5"
              />
              {extra != null && (
                <View className="mt-1.5 bg-green-50 px-1.5 py-0.5 rounded">
                  <Text className="text-xs text-green-800 font-medium">
                    +{extra}L
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ─── 3) Action Buttons ─── */}

      {FromAdmin !== 1 && (
        <>
          <View className="flex-row px-1 justify-between mb-2">
            <TouchableOpacity
              className="flex-1 bg-red-400 mr-1 py-3 rounded-lg items-center"
              onPress={() => setCancelModalVisible(true)}
            >
              <Text className="text-white text-base font-semibold">
                Cancel Date
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-green-500 ml-1 py-3 rounded-lg items-center"
              onPress={() => setExtraModalVisible(true)}
            >
              <Text className="text-white text-base font-semibold">
                Add Extra Milk
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row px-1 justify-between mb-6">
            <TouchableOpacity
              className="flex-1 bg-blue-500 mr-1 py-3 rounded-lg items-center"
              onPress={() => UpdateBookingConfigurations(BookingData[0].transid)}
            >
              <Text className="text-white text-base font-semibold">
                Save Booking Configurations
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}


      <View className="mb-5">
        <MilkStatusTable data={bookingStatusTable} />
      </View>

      {/* ─── Cancel Date Modal ─── */}
      <Modal
        visible={isCancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View className="flex-1 justify-center bg-black/50">
          <View className="bg-white m-4 p-4 rounded-xl">
            <Text className="text-lg font-semibold mb-2">
              Select Dates to Cancel
            </Text>
            <Calendar
              minDate={bookingDate}
              maxDate={nextMonthDate}
              onDayPress={toggleCancelDate}
              markingType="multi-dot"
              markedDates={cancelMarkedDates}
              theme={{
                selectedDayBackgroundColor: "#ff6b6b",
                todayTextColor: "#ef4444",
                dotColor: "#ff375f",
              }}
            />

            <View className="flex-row mt-4 justify-end">
              <TouchableOpacity
                className="px-4 py-2 mr-2"
                onPress={() => setCancelModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 bg-red-500 rounded"
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
          <View className="bg-white m-4 p-4 rounded-xl">
            <Text className="text-lg font-semibold mb-2">Add Extra Milk</Text>

            <Calendar
              minDate={formatDateYYYYMMDD(
                new Date(new Date().setDate(new Date().getDate() + 1))
              )}
              maxDate={nextMonthDate}
              onDayPress={onDayPressExtra}
              markingType="multi-dot"
              markedDates={extraMarkedDates}
              theme={{
                selectedDayBackgroundColor: "#16a34a",
                todayTextColor: "#ef4444",
                dotColor: "#16a34a",
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
              <Text>Same for all upcoming days</Text>
            </View>

            {applyToAllUpcoming ? (
              <View className="mt-2">
                <Text className="mb-1">
                  Quantity for all upcoming days (liters):
                </Text>
                <TextInput
                  className="border border-gray-300 rounded p-2 mb-4"
                  keyboardType="numeric"
                  placeholder="e.g. 0.5"
                  value={allUpcomingQty}
                  onChangeText={setAllUpcomingQty}
                />
                <TouchableOpacity
                  className="px-4 py-2 bg-green-500 rounded items-center"
                  onPress={handleApplyToAllUpcoming}
                >
                  <Text className="text-white">Apply to All</Text>
                </TouchableOpacity>
              </View>
            ) : (
              currentExtraDate && (
                <View className="mt-4">
                  <Text className="mb-1">
                    How many liters on {currentExtraDate}?
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded p-2 mb-4"
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
                      <Text>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="px-4 py-2 bg-green-500 rounded"
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
                className="px-4 py-2 bg-gray-200 rounded"
                onPress={() => {
                  setExtraModalVisible(false);
                  setCurrentExtraDate(null);
                  setExtraQtyInput("");
                  setApplyToAllUpcoming(false);
                  setAllUpcomingQty("");
                }}
              >
                <Text>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
