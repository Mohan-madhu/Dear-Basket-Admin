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

export default function DailyMilkStatus({ BookingData, FromAdmin }) {
  // --- 1) Booking-status state ---
  const { setLoading } = useLoading();
  const [UserBooked, setUserBooked] = useState({});
  const [bookingStatus, setBookingStatus] = useState({});
  const [bookingDate, setbookingDate] = useState(null);
  const [selectedCancelDates, setSelectedCancelDates] = useState(() => new Set());
  const [finalExtraEntries, setFinalExtraEntries] = useState([]);
  const [bookingStatusTable, setBookingStatusTable] = useState();
  const [upd, setupd] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    GetBookingStatus();
  }, [BookingData, upd]);

  const GetBookingStatus = async () => {
    setLoading(true, "Fetching Booking Status");
    try {
      var { Response } = await API.GET(
        "DailyMilkStatus/Dates/" + BookingData[0].transid
      );

      setBookingStatusTable(Response);

      console.log(Response, " Booking Status Response");

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

  // Prepare marked dates for the calendar
  const markedDates = useMemo(() => {
    const marked = {};

    Object.keys(bookingStatus).forEach(date => {
      const statusData = bookingStatus[date];
      let dotColor = '';
      let statusText = '';

      switch (statusData.status) {
        case 1:
          dotColor = '#16a34a'; // Green for delivered
          statusText = 'Delivered';
          break;
        case -1:
          dotColor = '#dc2626'; // Red for cancelled
          statusText = 'Cancelled';
          break;
        case 0:
          dotColor = '#4b5563'; // Gray for pending
          statusText = 'Pending';
          break;
        case 3:
          dotColor = '#FFA500'; // Orange for missed
          statusText = 'Missed';
          break;
        default:
          dotColor = '#9ca3af'; // Light gray for no data
          statusText = 'No Data';
      }

      // Check if it's today
      const today = new Date().toDateString();
      const currentDate = new Date(date).toDateString();
      const isToday = today === currentDate;

      marked[date] = {
        customStyles: {
          container: {
            backgroundColor: isToday ? '#dbeafe' : 'transparent',
            borderRadius: 8,
            borderWidth: isToday ? 2 : 0,
            borderColor: isToday ? '#3b82f6' : 'transparent',
          },
          text: {
            color: isToday ? '#1e40af' : '#1f2937',
            fontWeight: isToday ? 'bold' : 'normal',
          },
        },
        dots: [
          {
            key: 'status',
            color: dotColor,
            selectedColor: dotColor,
          },
          ...(finalExtraEntries.find(e => e.date === date) ? [{
            key: 'extra',
            color: '#22c55e',
            selectedColor: '#22c55e',
          }] : [])
        ],
      };
    });

    return marked;
  }, [bookingStatus, finalExtraEntries]);


  function findActiveBooking(bookingsData) {
    const now = new Date();
    const currentDateNormalized = normalizeDate(now);

    const activeBookings = [];

    function normalizeToDateOnly(date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    for (const booking of bookingsData) {
      const startDate = normalizeToDateOnly(booking.bookingstartdate);
      const endDate = normalizeToDateOnly(booking.bookingenddate);
      const currentDateOnly = normalizeToDateOnly(currentDateNormalized);

      const isActive =
        currentDateOnly.getTime() >= startDate.getTime() &&
        currentDateOnly.getTime() <= endDate.getTime();

      if (isActive) {
        activeBookings.push(booking);
      }
    }

    return activeBookings.length > 0 ? activeBookings : null;
  }


  const CheckAlreadyRegistered = async () => {
    // console.log("Checking user registration status for USER:", USER);
    if (!USER) return;

    setLoading(true, "Checking User Registration Status and Fetching Location…");

    try {


      //sts = 0 - not registered
      //sts = 1 - pending
      //sts = 2 - approved
      //sts = 3 - rejected

      const res = await API.GET("DailyMilkRegistration/CheckUserForRegistration/" + USER);
      //console.log("CheckAlreadyRegistered Response:", res);
      if (res.Response.length === 0) {
        setUserStatus(0);
        setLoading(false);
      } else if (res.Response[0].status === 1) {
        // console.log("User already registered:", res.Response[0]);

        setDailyMilkRegistrationID(res.Response[0].transid);

        const { Response: bookings } = await API.GET(
          "DailyMilkBooking/UserBookings/" + res.Response[0].transid
        );
        console.log("User Bookings as  soon as egistartin:", bookings);
        const active = findActiveBooking(bookings);
        setUserBookings(bookings);
        if (active) setUserBooked(active);



        setUserStatus(2);
      } else if (res.Response[0].status === 0) {
        // console.log("User registration pending:", res.Response[0]);
        setUserStatus(1);
        setLoading(false);

      }
      else if (res.Response[0].status === 2) {
        //console.log("User registration rejected:", res.Response[0]);
        setUserStatus(3);
        setLoading(false);
      }
    } catch {
      setLoading(false);
      // handle error if needed
    } finally {

    }
  };

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
      <View className={`flex-1 items-center justify-start p-1 m-0.5 rounded-lg ${isToday ? 'bg-blue-50 border-2 border-blue-500' : 'bg-transparent'
        }`}>
        <Text className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'
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
        <View className={`flex-1 items-center justify-start p-1 m-0.5 rounded-lg ${isToday ? 'bg-blue-50 border-2 border-blue-500' : 'bg-transparent'
          }`}>
          <Text className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'
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


  const StableMilkTable = React.memo(({ data }) => {
    return (
      <View className="mb-5 flex-1">
        <MilkStatusTable_Admin data={data} />
      </View>
    );
  });

  const memoizedCalendar = useMemo(() => {
    return (
      <MilkCalendar
        bookingStatus={bookingStatus}
        finalExtraEntries={finalExtraEntries}
      />
    );
  }, [bookingStatus, finalExtraEntries]);



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

      {memoizedCalendar}

      {/* <View className="mb-5">
        <MilkStatusTable data={bookingStatusTable} />
      </View> */}

      <StableMilkTable data={bookingStatusTable} />
    </ScrollView>
  );
}