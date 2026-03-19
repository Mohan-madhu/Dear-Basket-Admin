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

  const [selectedCancelDates, setSelectedCancelDates] = useState(
    () => new Set()
  );

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




      <View className="mb-5">
        <MilkStatusTable data={bookingStatusTable} />
      </View>

    </ScrollView>
  );
}
