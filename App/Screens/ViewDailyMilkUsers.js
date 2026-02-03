import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
} from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import DailyMilkBooking from "./DailyMilkBooking"; // Make sure the path is correct
import DailyMilkStatus from "../Components/DailyMilkStatus";

const ViewDailyMilkUsers = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const { setLoading } = useLoading();
  const [UserStatus, setUserStatus] = useState(null);
  // State for Daily Milk Registration details and booked data
  const [DailyMilkRegistrationID, setDailyMilkRegistrationID] = useState(null);
  const [UserBooked, setUserBooked] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true, "Fetching daily milk registered users...");
      const res = await API.GET("DailyMilkRegistration/View");

      setUsers(res.Response);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (lat, lon) => {
    if (!lat || !lon) {
      Alert.alert("Error", "Location not available");
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Unable to open maps");
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const CheckAlreadyRegistered = async (userID) => {
    if (!userID) return;

    setLoading(true, "Checking User Registration Status");
    try {
      const res = await API.GET("DailyMilkRegistration/CheckUser/" + userID);

      if (res.Response.length === 0) {
        setUserStatus(0); // Not Registered
      } else if (res.Response[0].status === 1) {
        setUserStatus(2); // Registered and pending
        setDailyMilkRegistrationID(res.Response[0].transid);

        const { Response: bookings } = await API.GET(
          "DailyMilkBooking/UserBookings/" + res.Response[0].transid

        );


        try {

          const active = findActiveBooking(bookings);
          if (active) setUserBooked(active);
        } catch (ex) { setUserStatus(1); }
      } else if (res.Response[0].status === 0) {
        setUserStatus(1); // Pending registration
      } else if (res.Response[0].status === 2) {
        setUserStatus(3); // Rejected registration
      }

      console.log("UserStatus", UserStatus)
    } catch (err) {
      console.error("Error checking registration", err);
    } finally {
      setLoading(false);
    }
  };

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
    console.log("activeBookings", activeBookings.length)
    return activeBookings.length > 0 ? activeBookings : null;
  }



  function normalizeDate(input) {
    const d =
      typeof input === "string" || typeof input === "number"
        ? new Date(input)
        : input;
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="px-4 pt-10">
        <Animated.View
          entering={FadeIn.duration(500)}
          layout={Layout.springify()}
          className="mb-6"
        >
          <Text className="text-2xl font-bold text-gray-800">
            View Daily Milk Registered Users
          </Text>
          <Text className="text-gray-500 mt-1">
            Click a user to view their History
          </Text>
        </Animated.View>

        {users.length === 0 ? (
          <View className="items-center justify-center mt-16 py-8">
            <View className="bg-gray-100 p-6 rounded-full">
              <Icon name="person-off" size={48} color="#9ca3af" />
            </View>
            <Text className="text-gray-500 text-lg mt-6 font-medium">
              No users found
            </Text>
            <Text className="text-gray-400 mt-1 text-center">
              There are currently no registered users
            </Text>
          </View>
        ) : (
          <View className="pb-6 space-y-4">
            {users.map((user, index) => (
              <Animated.View
                key={user.transid}
                entering={FadeIn.delay(index * 100)}
                exiting={FadeOut}
                layout={Layout.springify()}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
              >
                <TouchableOpacity
                  onPress={async () => {
                    await CheckAlreadyRegistered(user.userid);
                    setSelectedUser(user);
                    // Check registration status when a user is selected
                  }}
                  activeOpacity={0.7}
                >
                  <View className="flex-row">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-800">
                        {index + 1 + ". " + user.name}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        ID: {user.userid}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        Mobile: {user.mobile}
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">
                        Family Members: {user.familymembers}
                      </Text>
                      {user.latitude && user.longitude && (
                        <TouchableOpacity
                          className="flex-row items-center mt-3 bg-blue-50 p-2 rounded justify-center border border-blue-100"
                          onPress={() =>
                            openMaps(user.latitude, user.longitude)
                          }
                        >
                          <Icon name="map" size={16} color="#3b82f6" />
                          <Text className="text-blue-600 ml-2 font-medium">
                            View on Map
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={!!selectedUser}
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View className="flex-1  bg-gray-800 p-2">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-white">
              {selectedUser?.name+"'s"} Daily Milk Details
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedUser(null)}
              className="p-2"
            >
              <Icon name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* <View className="space-y-3">
            <View className="bg-gray-100 p-4 rounded-lg border border-gray-200">
              <Text className="text-gray-700 font-semibold">Transaction ID</Text>
              <Text className="text-gray-600 mt-1">{selectedUser?.transid}</Text>
            </View>
            <View className="bg-gray-100 p-4 rounded-lg border border-gray-200">
              <Text className="text-gray-700 font-semibold">User ID</Text>
              <Text className="text-gray-600 mt-1">{selectedUser?.userid}</Text>
            </View>
          </View> */}

          {/* Render DailyMilkBooking component */}
          {UserStatus === 2 ? (
            <View className="flex-1 bg-gray-800">
              <DailyMilkStatus
                DailyMilkRegistrationID={DailyMilkRegistrationID}
                BookingData={UserBooked}
                FromAdmin = {1}
              />
            </View>

          ) : (
            <View className="flex-1  bg-gray-800 text-center align-middle justify-center">
              <Text className="text-white text-lg text-center">User has not Registered or Booked Yet.</Text>
            </View>
          )}






          <View className="mt-6">
            <TouchableOpacity
              className="bg-gray-200 p-3 rounded-lg items-center justify-center"
              onPress={() => setSelectedUser(null)}
            >
              <Text className="text-gray-700 font-medium">Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ViewDailyMilkUsers;
