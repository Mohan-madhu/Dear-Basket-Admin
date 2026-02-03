// DailyMilkBookingScreen.js

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Button,
  Alert,
  Platform,
} from "react-native";
import { Calendar } from "react-native-calendars";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import DailyMilkStatus from "../Components/DailyMilkStatus";
import { Picker } from "@react-native-picker/picker";
import Storage from "../../App_Utils/Services/StorageService";
import { API } from "../../App_Utils/Services/APIService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";

import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import DailyMilkBooking from "./DailyMilkUserBooking30Days";



const DailyMilkBookingScreen = ({
  DailyMilkRegistrationID_Parent,
  BookingData,
  UserBookings,
  setupd,
}) => {
  const [isBooked, setIsBooked] = useState(false);
  const [DailyMilkRegistrationID, setDailyMilkRegistrationID] = useState(DailyMilkRegistrationID_Parent);
  const [UserBooked, setUserBooked] = useState({});

  const [UserStatus, setUserStatus] = useState(null);

  const [bookingStatus, setBookingStatus] = useState([]);
  const [userBookingStatus, setUserBookingStatus] = useState(null);
  const { setLoading } = useLoading();
  useEffect(() => {
    // console.log("111111111111111111111", BookingData)
    if (BookingData.length > 0) {
      console.log("Booking data exists", BookingData);
      setIsBooked(true);
      setLoading(false);
    }
  }, [BookingData]);

  function normalizeDate(input) {
    const d =
      typeof input === "string" || typeof input === "number"
        ? new Date(input)
        : input;
    d.setHours(0, 0, 0, 0);
    return d;
  }

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
    console.log("Checking user registration status for ID:", DailyMilkRegistrationID);
    if (!DailyMilkRegistrationID) return;

    setLoading(true, "Checking User Registration Status");
    try {

      const { Response: bookings } = await API.GET(
        "DailyMilkBooking/UserBookings/" + DailyMilkRegistrationID
      );


      console.log("UserBookings", bookings);

      const record = bookings[0]


      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const start = new Date(record.bookingstartdate);
      const end = new Date(record.bookingenddate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (today < start) {
        // Not started yet
        const daysUntilStart = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
        console.log(`📅 Booking starts in ${daysUntilStart} days`);
        setBookingStatus(`📅 Booking starts in ${daysUntilStart} days`);
        setUserBookingStatus(-1);
        setLoading(false);
      } else if (today >= start && today <= end) {
        // Currently active
        const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        console.log(`✅ Booking active — ${daysLeft} days left`);
        setBookingStatus(`✅ Booking active — ${daysLeft} days left`);
        setUserBookingStatus(1);
      } else {
        // Already ended
        console.log(`❌ Booking has ended`);
        setBookingStatus(`❌ Booking has ended`);
        setUserBookingStatus(2);
        setLoading(false);
      }

      console.log("DailyMilkRegistrationID", UserBookings);
      //sts = 0 - not registered
      //sts = 1 - pending
      //sts = 2 - approved
      //sts = 3 - rejected  
      // UserBookingsts = 0 - active booking
      // UserBookingsts = 1 - booking ended
      // UserBookingsts = -1 - booking not started yet
      console.log("DailyMilkRegistrationID - ", DailyMilkRegistrationID);
      const res = await API.GET("DailyMilkBooking/CheckUser1/" + DailyMilkRegistrationID);

      console.log("RESSSS", res)

      if (res.Response.length > 0) {
        setIsBooked(true);
        setLoading(false);
      }


      if (res.Response.length === 0) {
        setUserStatus(0);
        setLoading(false);
      } else if (res.Response[0].status === 1) {
        // console.log("User already registered:", res.Response[0]);
        setUserStatus(2);
        //setDailyMilkRegistrationID(res.Response[0].transid);

        const { Response: bookings } = await API.GET(
          "DailyMilkBooking/UserBookings/" + res.Response[0].transid
        );
        const active = findActiveBooking(bookings);
        if (active) setUserBooked(active);
      } else if (res.Response[0].status === 0) {

        setUserStatus(1);
        setLoading(false);
      }
      else if (res.Response[0].status === 2) {
        //console.log("User registration rejected:", res.Response[0]);
        setUserStatus(3);
        setLoading(false);

      }


      else if (res.Response[0].status === 3) {

      }


      console.log("User status set to:", res.Response[0].status);
    } catch {
      // handle error if needed
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    CheckAlreadyRegistered();
  }, [DailyMilkRegistrationID]);

  //   return (
  //     <View style={{ flex: 1 }}>
  //       {isBooked ? (
  //         <View className="flex-1  px-4 py-1">

  //      {UserStatus === 2 ? (
  //           <View className="flex-1 bg-gray-800">
  //            <DailyMilkStatus
  //             DailyMilkRegistrationID={DailyMilkRegistrationID}
  //             BookingData={BookingData}
  //           />

  //         ) : UserStatus === 1 ? (
  //           <View className="flex-1  bg-gray-800 text-center align-middle justify-center">
  //             <Text className="text-white text-lg text-center">Your registration is waiting for approval by the admin.</Text>
  //           </View>
  //         ) : UserStatus === 3 ? (
  //          <View className="flex-1  bg-gray-800 text-center align-middle justify-center">
  //             <Text className="text-white text-lg text-center">Your registration has been rejected by the admin.</Text>
  //           </View>
  //         ) : UserStatus === 0 ? (
  //           <View>


  //         </View>
  //       ) : (
  //         <DailyMilkBooking
  //           DailyMilkRegistrationID={DailyMilkRegistrationID}
  //           setupd={setupd}
  //           CheckAlreadyRegistered={CheckAlreadyRegistered}
  //         />
  //       )}

  //       {/* <View className="absolute top-90 left-0 right-0 items-center">
  //         <TouchableOpacity
  //           onPress={() => setIsBooked((prev) => !prev)}
  //           className="bg-blue-600 px-4 py-2 rounded"
  //         >
  //           <Text className="text-white">
  //             Toggle isBooked (currently {isBooke ū[yBHJUJ     GG  T VC,PG                                           V  .,.                                               I8O U
  //             [d ? "TRUE" : "FALSE"})
  //           </Text>
  //         </TouchableOpacity>
  //       </View> */}
  //     </View>
  //   );
  // };

  // export default DailyMilkBookingScreen;




  return (
    <View style={{ flex: 1 }}>
      {isBooked ? (
        <View className="flex-1 px-4 py-1">
          {UserStatus === 2 ? (
            <View className="flex-1 bg-gray-800">
              {userBookingStatus === -1 ? (
                <View className="flex-1 bg-gray-800 items-center justify-center">
                  <Text className="text-white text-lg text-center">
                    Your booking has not started yet.

                  </Text>
                  <Text className="text-white text-lg text-center">

                    {bookingStatus}
                  </Text>
                </View>
              ) : userBookingStatus === 1 ? (
                <View className="flex-1 bg-gray-800 items-center justify-center">
                  <Text className="text-white text-lg text-center">
                    Your booking is currently active.
                    {bookingStatus}
                  </Text>
                </View>
              ) : userBookingStatus === 2 ? (
                <View className="flex-1 bg-gray-800 items-center justify-center">
                  <Text className="text-white text-lg text-center">
                    Your booking has ended.
                    {bookingStatus}
                  </Text>
                </View>
              ) : (
                <DailyMilkStatus
                  DailyMilkRegistrationID={DailyMilkRegistrationID}
                  BookingData={BookingData}
                />
              )}
            </View>
          ) : UserStatus === 1 ? (
            <View className="flex-1 bg-gray-800 items-center justify-center">
              <Text className="text-white text-lg text-center">
                Your registration is waiting for approval by the admin.
              </Text>
            </View>
          ) : UserStatus === 3 ? (
            <View className="flex-1 bg-gray-800 items-center justify-center">
              <Text className="text-white text-lg text-center">
                Your registration has been rejected by the admin.
              </Text>
            </View>
          ) : (
            <View className="flex-1 bg-gray-800 items-center justify-center">
              <Text className="text-white text-lg text-center">
                You’re not registered yet. Please complete your booking below.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <DailyMilkBooking
          DailyMilkRegistrationID={DailyMilkRegistrationID}
          setupd={setupd}
          CheckAlreadyRegistered={CheckAlreadyRegistered}
        />
        // <View>  </View>
      )}


      {/* 
    <View className="absolute top-90 left-0 right-0 items-center">
      <TouchableOpacity
        onPress={() => setIsBooked((prev) => !prev)}
        className="bg-blue-600 px-4 py-2 rounded"
      >
        <Text className="text-white">
          Toggle isBooked (currently {isBooked ? "TRUE" : "FALSE"})
        </Text>
      </TouchableOpacity>
    </View>
    */}
    </View>
  );
}

export default DailyMilkBookingScreen;
