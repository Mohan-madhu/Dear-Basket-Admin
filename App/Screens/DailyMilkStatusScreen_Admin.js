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
import MilkStatusTable_Admin from "../Components/DailyMilkStatusTable_Admin";



// Format an ISO string as "Jun 07, 2025"
function formatFriendly(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Separate Calendar Component
const MilkCalendar = ({ bookingStatus, finalExtraEntries }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Custom day component to show status clearly
  const renderDay = (day) => {
    if (!day.date) {
      return <View className="flex-1 items-center justify-center p-1" />;
    }

    const dateStr = day.date.dateString;
    const statusData = bookingStatus[dateStr];
    const isToday = new Date(dateStr).toDateString() === new Date().toDateString();
    const hasExtra = finalExtraEntries.find(e => e.date === dateStr);

    let statusIcon = 'circle';
    let statusColor = '#9ca3af';
    let statusText = 'No Data';

    if (statusData) {
      switch (statusData.status) {
        case 1:
          statusIcon = 'check-circle';
          statusColor = '#16a34a';
          statusText = 'Delivered';
          break;
        case -1:
          statusIcon = 'times-circle';
          statusColor = '#dc2626';
          statusText = 'Cancelled';
          break;
        case 0:
          statusIcon = 'clock-o';
          statusColor = '#4b5563';
          statusText = 'Pending';
          break;
        case 3:
          statusIcon = 'exclamation-triangle';
          statusColor = '#FFA500';
          statusText = 'Missed';
          break;
      }
    }

    return (
      <View className={`flex-1 items-center justify-start p-1 m-0.5 rounded-lg ${
        isToday ? 'bg-blue-50 border-2 border-blue-500' : 'bg-transparent'
      }`}>
        <Text className={`text-sm font-medium ${
          isToday ? 'text-blue-600' : 'text-gray-700'
        }`}>
          {day.date.day}
        </Text>

        {statusData && (
          <View className="items-center mt-1">
            <Icon
              name={statusIcon}
              size={12}
              color={statusColor}
            />
            {hasExtra && (
              <View className="mt-0.5 bg-green-100 px-1 rounded">
                <Text className="text-xs text-green-800 font-bold">+{hasExtra.qty}L</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="bg-white rounded-xl shadow mb-6 p-4">
      <Calendar
        current={currentDate.toISOString().split('T')[0]}
        onDayPress={(day) => {
          console.log('Selected day:', day);
        }}
        monthFormat={'MMMM yyyy'}
        hideArrows={false}
        hideExtraDays={true}
        disableMonthChange={false}
        firstDay={1}
        hideDayNames={false}
        showWeekNumbers={false}
        disableArrowLeft={false}
        disableArrowRight={false}
        disableAllTouchEventsForDisabledDays={true}
        enableSwipeMonths={true}
        dayComponent={({ date, state }) => renderDay({ date, state })}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#374151',
          selectedDayBackgroundColor: '#3b82f6',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#3b82f6',
          dayTextColor: '#1f2937',
          textDisabledColor: '#d1d5db',
          dotColor: '#3b82f6',
          selectedDotColor: '#ffffff',
          arrowColor: '#3b82f6',
          monthTextColor: '#1f2937',
          indicatorColor: '#3b82f6',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
          'stylesheet.calendar.header': {
            week: {
              marginTop: 5,
              flexDirection: 'row',
              justifyContent: 'space-around',
            },
          },
        }}
        style={{
          borderRadius: 10,
        }}
      />

      {/* Status Legend */}
      <View className="mt-4 pt-4 border-t border-gray-200">
        <Text className="text-sm font-semibold text-gray-700 mb-3 text-center">Status Legend</Text>
        <View className="flex-row flex-wrap justify-between">
          <View className="flex-row items-center mb-2 w-1/2 justify-center">
            <Icon name="check-circle" size={14} color="#16a34a" />
            <Text className="text-xs text-gray-600 ml-1">Delivered</Text>
          </View>
          <View className="flex-row items-center mb-2 w-1/2 justify-center">
            <Icon name="times-circle" size={14} color="#dc2626" />
            <Text className="text-xs text-gray-600 ml-1">Cancelled</Text>
          </View>
          <View className="flex-row items-center mb-2 w-1/2 justify-center">
            <Icon name="clock-o" size={14} color="#4b5563" />
            <Text className="text-xs text-gray-600 ml-1">Pending</Text>
          </View>
          <View className="flex-row items-center mb-2 w-1/2 justify-center">
            <Icon name="exclamation-triangle" size={14} color="#FFA500" />
            <Text className="text-xs text-gray-600 ml-1">Missed</Text>
          </View>
          <View className="flex-row items-center mb-2 w-1/2 justify-center">
            <Icon name="circle" size={14} color="#9ca3af" />
            <Text className="text-xs text-gray-600 ml-1">No Data</Text>
          </View>
          <View className="flex-row items-center mb-2 w-1/2 justify-center">
            <View className="bg-green-100 px-1 py-0.5 rounded">
              <Text className="text-xs text-green-800 font-bold">+XL</Text>
            </View>
            <Text className="text-xs text-gray-600 ml-1">Extra Milk</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// Memoized Table Component
const StableMilkTable = React.memo(({ data }) => {
  return (
    <View className="mb-5 flex-1 bg-red-500">
      <MilkStatusTable_Admin data={data} />
    </View>
  );
});

// Main Screen Component
export default function DailyMilkStatusScreen({ route, navigation }) {
  // Get data passed from navigation
  const { BookingData, DailyMilkBookingID } = route.params;
  
  // --- State ---
  const { setLoading } = useLoading();
  const [bookingStatus, setBookingStatus] = useState({});
  const [bookingDate, setbookingDate] = useState(null);
  const [selectedCancelDates, setSelectedCancelDates] = useState(() => new Set());
  const [finalExtraEntries, setFinalExtraEntries] = useState([]);
  const [bookingStatusTable, setBookingStatusTable] = useState();
  const [upd, setupd] = useState(0);

  useEffect(() => {
    // Set screen title based on data
    if (BookingData && BookingData.length > 0) {
      navigation.setOptions({
        title: `Milk Status - ${BookingData[0].productname}`,
      });
    }
    GetBookingStatus();
  }, [BookingData, upd]);

  const GetBookingStatus = async () => {
    // if (!BookingData || BookingData.length === 0) {
    //   Alert.alert("Error", "No booking data provided");
    //   return;
    // }

    setLoading(true, "Fetching Booking Status");
    try {
      var { Response } = await API.GET(
        "DailyMilkStatus/Dates/" + DailyMilkBookingID
      );

      setBookingStatusTable(Response);

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
      Alert.alert("Error", "Failed to fetch booking status");
    } finally {
      setLoading(false);
    }
  };

  // Memoize the calendar to prevent unnecessary re-renders
  const memoizedCalendar = useMemo(() => {
    return (
      <MilkCalendar
        bookingStatus={bookingStatus}
        finalExtraEntries={finalExtraEntries}
      />
    );
  }, [bookingStatus, finalExtraEntries]);

  // Add header back button if needed
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="ml-2 p-2"
        >
          <Icon name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <ScrollView className="flex-1 px-4 pt-2 w-full bg-gray-900">
      {/* ─── Header ─── */}
      <Text className="text-xl font-semibold mb-4 text-center text-white">
        Daily Milk Order Status - {BookingData[0]?.name}
      </Text>

      {/* ─── Booking Details Cards ─── */}
      {BookingData && BookingData.length > 0 ? (
        <FlatList
          data={BookingData}
          keyExtractor={(item) => item.bookingid}
          className="mb-2"
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View className="bg-white p-4 rounded-xl shadow mb-4">
              <Text className="text-lg font-bold mb-1">
                {item.productname} ({item.deliverytype})
              </Text>
              <Text className="text-sm text-gray-600">
                    Registration ID: {item.userid} ({item.dailymilkregistrationid})
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
      ) : (
        <View className="bg-white p-4 rounded-xl shadow mb-4">
          <Text className="text-lg font-bold text-center text-gray-500">
            No Booking Data Available
          </Text>
        </View>
      )}

      {/* ─── Calendar ─── */}
      {memoizedCalendar}

      {/* ─── Status Table ─── */}
      <StableMilkTable data={bookingStatusTable} />
    </ScrollView>
  );
}