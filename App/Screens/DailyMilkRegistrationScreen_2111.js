// DailyMilkRegistrationScreen.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { DatePickerInput } from "react-native-paper-dates";
import * as Location from "expo-location";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import DailyMilkBooking from "./DailyMilkBooking";
import LocationService from "../../App_Utils/Services/LocationService";
import DailyMilkBookingScreen from "./DailyMilkBooking";

/* ─── slide+fade hook ─── */
const useSlideFade = (delay = 0, from = 40) => {
  const slide = useRef(new Animated.Value(from)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: 550,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 550,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return { slide, fade };
};

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

const DailyMilkRegistrationScreen = () => {
  const nav = useNavigation();
  const { setLoading } = useLoading();
  const [UserStatus, setUserStatus] = useState(null);


  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [familymembers, setFamilyMembers] = useState("");
  const [upd, setupd] = useState(0);

  /* ── animations ── */
  const headerAnim = useSlideFade(0);
  const personalAnim = useSlideFade(150);
  const locationAnim = useSlideFade(300);
  const familyAnim = useSlideFade(450);
  const buttonsAnim = useSlideFade(600);

  /* ── press-scale helper ── */
  const scaleOnPress = (pressed) => ({
    transform: [{ scale: pressed ? 0.95 : 1 }],
  });

  const fetchLocation = async () => {

    // start the loader
    // setLoading(true, "Fetching location…");

    // // ask for permission
    // let { status } = await Location.requestForegroundPermissionsAsync();
    // if (status !== "granted") {
    //   setLoading(false); // hide on early exit
    //   Alert.alert(
    //     "Permission Denied",
    //     "Please enable location permissions to automatically fill your coordinates."
    //   );
    //   return;
    // }

    // try {
    //   setLoading(true, "Fetching location…");
    //   // actually fetch the device location
    //   let location = await Location.getCurrentPositionAsync({});
    //   setLatitude(location.coords.latitude.toString());
    //   setLongitude(location.coords.longitude.toString());
    //   console.log("Location fetched:", location.coords);
    // } catch (error) {
    //   console.error("Error getting location:", error);
    //   Alert.alert(
    //     "Location Error",
    //     "Could not fetch your location. Please enter coordinates manually."
    //   );
    // } finally {
    //   // stop the loader in both success & error cases
    //   setLoading(false);
    // }

    console.log("Fetching location…");
    try {
      // setLoading(true, "Fetching location…");
      await LocationService({
        setLoading,
        setLatitude,
        setLongitude,
        setAddress,
      });
      // setLoading(false);
    } catch (error) {
      console.error("Error fetching location:", error);
      setLoading(false);
    }

  };



  const [USER, setUSER] = useState(null);
  const getRole = async () => {
    const role = await Storage.getData("ROLE");
    const data = await Storage.getData("DATA");
    setUSER(data.transid);
    setName(data.name)
    setMobile(data.mobile)
  };

  useEffect(() => {
    getRole();
  }, []);



  const [DailyMilkRegistrationID, setDailyMilkRegistrationID] = useState(null);
  const [UserBooked, setUserBooked] = useState({});
  const [UserBookings, setUserBookings] = useState({});

  useEffect(() => {
    async function prereq() {
      await CheckAlreadyRegistered();
      if (!latitude && !longitude) {
        await fetchLocation();
      }
    }
    prereq();
  }, [USER, upd]);


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

  const handleRegister = async () => {
    if (!name.trim())
      return Alert.alert("Validation Error", "Name is required");
    if (!dob)
      return Alert.alert("Validation Error", "Date of Birth is required");
    if (!address.trim())
      return Alert.alert("Validation Error", "Address is required");
    if (!mobile.trim())
      return Alert.alert("Validation Error", "Mobile is required");

    setLoading(true, "Submitting Registration…");
    const payload = {
      userid: USER,
      name: name.trim(),
      dob: typeof dob === "string" ? dob : new Date(dob).toISOString(),
      address: address.trim(),
      mobile: mobile.trim(),
      latitude: latitude.trim(),
      longitude: longitude.trim(),
      status: 1,
      familymembers: parseInt(familymembers, 10) || 0,
      rcu: "SELF",
    };

    try {
      await API.POST("DailyMilkRegistration", payload);
      Alert.alert("Done 🎉", "Registration saved successfully", [
        { text: "OK", onPress: () => { CheckAlreadyRegistered(); } },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save registration.");
    } finally {
      setLoading(false);
    }
  };

  //console.log("User Status:", UserStatus);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {UserStatus === 2 ? (
          <View className="flex-1 bg-gray-800">
            <DailyMilkBookingScreen
              DailyMilkRegistrationID_Parent={DailyMilkRegistrationID}
              BookingData={UserBooked}
              UserBookings={UserBookings}
              setupd={setupd}
            />
          </View>

        ) : UserStatus === 1 ? (
          <View className="flex-1  bg-gray-800 text-center align-middle justify-center">
            <Text className="text-white text-lg text-center">Your registration is waiting for approval by the admin.</Text>
          </View>
        ) : UserStatus === 3 ? (
          <View className="flex-1  bg-gray-800 text-center align-middle justify-center">
            <Text className="text-white text-lg text-center">Your registration has been rejected by the admin.</Text>
          </View>
        ) : UserStatus === 0 ? (
          <View>
            <Animated.View
              className="mt-8"
              style={{
                opacity: headerAnim.fade,
                transform: [{ translateY: headerAnim.slide }],
              }}
            >
              <Text className="text-3xl text-center font-bold text-gray-800">
                Daily Milk Registration
              </Text>
            </Animated.View>

            {/* Personal Details */}
            <Animated.View
              className="px-6 mt-10"
              style={{
                opacity: personalAnim.fade,
                transform: [{ translateY: personalAnim.slide }],
              }}
            >
              <Text className="text-xl underline text-center font-bold text-red-500 mb-6">
                Personal Details
              </Text>

              <Text className="font-semibold text-gray-700">Name</Text>
              <TextInput
                placeholder="Name"
                value={name}
                onChangeText={setName}
                className="border border-gray-300 rounded-lg p-3 mt-2 text-lg mb-4"
              />

              <Text className="font-semibold text-gray-700">Date of Birth</Text>
              {/* <DatePickerInput
                label="Date of Birth"
                value={dob}
                onChange={setDob}
                inputMode="start"
                className="mb-6"
              /> */}

              <DatePickerInput
                label="Date of Birth"
                value={dob}
                onChange={setDob}
                inputMode="start"
                locale="en"           // 👈 important
                className="mb-6"
              />


              <Text className="font-semibold text-gray-700">Address</Text>
              <TextInput
                placeholder="Address"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="border border-gray-300 rounded-lg p-3 h-40 mt-2 text-lg mb-6"
              />

              <Text className="font-semibold text-gray-700">Mobile</Text>
              <TextInput
                placeholder="Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="number-pad"
                className="border border-gray-300 rounded-lg p-3 mt-2 text-lg mb-6"
              />
            </Animated.View>

            {/* Location */}
            <Animated.View
              className="px-6"
              style={{
                opacity: locationAnim.fade,
                transform: [{ translateY: locationAnim.slide }],
              }}
            >
              <Text className="text-xl underline text-center font-bold text-red-500 mb-6">
                Location
              </Text>

              <Text className="font-semibold text-gray-700">Latitude</Text>
              <TextInput
                placeholder="Latitude"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="decimal-pad"
                className="border border-gray-300 rounded-lg p-3 mt-2 text-lg mb-4"
              />

              <Text className="font-semibold text-gray-700">Longitude</Text>
              <TextInput
                placeholder="Longitude"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="decimal-pad"
                className="border border-gray-300 rounded-lg p-3 mt-2 text-lg mb-6"
              />

              <View className="flex-row justify-center mb-2">
                <TouchableOpacity
                  onPress={fetchLocation}
                  className="bg-blue-500 px-3 py-1 rounded"
                >
                  <Text className="text-white">Refresh Location</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Family Info */}
            <Animated.View
              className="px-6"
              style={{
                opacity: familyAnim.fade,
                transform: [{ translateY: familyAnim.slide }],
              }}
            >
              <Text className="text-xl underline text-center font-bold text-red-500 mb-6">
                Family Info
              </Text>

              <Text className="font-semibold text-gray-700">
                Family Members
              </Text>
              <TextInput
                placeholder="Number of Family Members"
                value={familymembers}
                onChangeText={setFamilyMembers}
                keyboardType="number-pad"
                className="border border-gray-300 rounded-lg p-3 mt-2 text-lg mb-6"
              />
            </Animated.View>

            {/* Buttons */}
            <Animated.View
              className="px-6 mb-12"
              style={{
                opacity: buttonsAnim.fade,
                transform: [{ translateY: buttonsAnim.slide }],
              }}
            >
              <TouchableOpacity
                onPress={handleRegister}
                className="bg-green-500 py-3 rounded-lg"
                style={({ pressed }) => scaleOnPress(pressed)}
              >
                <Text className="text-white text-center text-2xl font-semibold">
                  Register
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => nav.goBack()}
                className="bg-red-500 py-3 rounded-lg mt-6"
                style={({ pressed }) => scaleOnPress(pressed)}
              >
                <Text className="text-white text-center text-2xl font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default DailyMilkRegistrationScreen;
