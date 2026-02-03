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
  Modal,
  Dimensions,
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
import ConfettiCannon from "react-native-confetti-cannon";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

// Birthday Overlay Component

const EMOJIS = ["🎉", "🎊", "🎈", "🎂", "🎁", "⭐", "✨", "🥳", "🎇", "🎆"];

const BirthdayOverlay = ({ userName, visible, onAnimationComplete }) => {
  const [showConfetti, setShowConfetti] = useState(true);

  // Pre-generate emoji data once (no random in render)
  const [emojiData] = useState(() =>
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      top: Math.random() * SCREEN_HEIGHT * 0.7,
      left: Math.random() * SCREEN_WIDTH * 0.9,
      size: 24 + Math.random() * 18,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    }))
  );

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // reset values
    scaleAnim.setValue(0.8);
    opacityAnim.setValue(0);
    floatAnim.setValue(0);
    setShowConfetti(true);

    // main pop-in animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // looped floating animation for emojis
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    // stop confetti after 4s
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 6000); 

    // close overlay after ~7s
    const closeTimer = setTimeout(() => {
      floatLoop.stop();
      onAnimationComplete?.();
    }, 7000);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(closeTimer);
      floatLoop.stop();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      {/* 70% black background */}
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.9)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Confetti (reduced for smoother performance) */}
        {showConfetti && (
          <>
            <ConfettiCannon
              count={50}
              origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
              explosionSpeed={200}
              fallSpeed={1500}
              fadeOut
              autoStart
            />
            {/* optional side cannon; comment out if still heavy */}
            <ConfettiCannon
              count={80}
              origin={{ x: SCREEN_WIDTH * 0.1, y: -50 }}
              explosionSpeed={350}
              fallSpeed={2600}
              fadeOut
              autoStart
            />

            <ConfettiCannon
              count={20}
              origin={{ x: SCREEN_WIDTH * 0.9, y: -90 }}
              explosionSpeed={400}
              fallSpeed={100}
              fadeOut
              autoStart
            />
          </>
        )}

        {/* Floating emojis */}
        {/* <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            pointerEvents: "none",
          }}
        >
          {emojiData.map((item) => (
            <Animated.Text
              key={item.id}
              style={{
                position: "absolute",
                top: item.top,
                left: item.left,
                fontSize: item.size,
                opacity: 0.6,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -40],
                    }),
                  },
                  {
                    rotate: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "15deg"],
                    }),
                  },
                ],
              }}
            >
              {item.emoji}
            </Animated.Text>
          ))}
        </View> */}

        {/* Main content */}
        <View style={{ alignItems: "center", paddingHorizontal: 24 }}>
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 999,
                padding: 24,
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.4)",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 64 }}>🎂</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              alignItems: "center",
              marginBottom: 32,
            }}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Happy Birthday!
            </Text>

            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 16,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.4)",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                {userName || "Dear Customer"}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.9)",
                textAlign: "center",
                lineHeight: 24,
              }}
            >
              Wishing you a day filled with{"\n"}
              joy, laughter, and wonderful surprises! 🎈🎁✨
            </Text>
          </Animated.View>

          <Animated.View
            style={{
              opacity: opacityAnim,
              backgroundColor: "#facc15",
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderWidth: 3,
              borderColor: "#fbbf24",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#1f2933",
                textAlign: "center",
              }}
            >
              🎊 Enjoy your special day! 🎊
            </Text>
          </Animated.View>

          {/* <View style={{ position: "absolute", bottom: 40 }}>
            <Text
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
            >
              This message will auto-close in a few moments...
            </Text>
          </View> */}
        </View>
      </View>
    </Modal>
  );
};

// Function to check if today is birthday
const isTodayBirthday = (dobString) => {
  if (!dobString) return false;

  try {
    const dob = new Date(dobString);
    const today = new Date();

    // Compare month and day only (ignore year)
    return (
      dob.getMonth() === today.getMonth() &&
      dob.getDate() === today.getDate()
    );
  } catch (error) {
    console.log("Error parsing DOB:", error);
    return false;
  }
};

const DailyMilkRegistrationScreen = () => {
  const nav = useNavigation();
  const { setLoading } = useLoading();
  const [UserStatus, setUserStatus] = useState(null);

  const [showBirthdayOverlay, setShowBirthdayOverlay] = useState(false);
  const [birthdayUserName, setBirthdayUserName] = useState("");
  const [isProcessingBirthday, setIsProcessingBirthday] = useState(false);

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
    console.log("Fetching location…");
    try {
      await LocationService({
        setLoading,
        setLatitude,
        setLongitude,
        setAddress,
      });
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
    setName(data.name);
    setMobile(data.mobile);
  };

  useEffect(() => {
    getRole();
  }, []);

  const [DailyMilkRegistrationID, setDailyMilkRegistrationID] = useState(null);
  const [UserBooked, setUserBooked] = useState({});
  const [UserBookings, setUserBookings] = useState({});

  // Check and show birthday (no blocking)
  const checkAndShowBirthday = (userData) => {
    if (!userData || !userData.dob) return;

    console.log("🎂 Checking birthday for DOB:", userData.dob);
    const birthday = isTodayBirthday(userData.dob);

   //if (!birthday) return;

    console.log("🎂 Birthday detected! Starting celebration...");
    setIsProcessingBirthday(true);
    setBirthdayUserName(userData.name || "Valued Customer");
    setShowBirthdayOverlay(true);
  };

  const handleBirthdayAnimationComplete = () => {
    console.log("🎂 Birthday animation complete callback");
    setShowBirthdayOverlay(false);
    setIsProcessingBirthday(false);
  };

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
    if (!USER) return;

    setLoading(true, "Checking User Registration Status and Fetching Location…");

    try {
      const res = await API.GET(
        "DailyMilkRegistration/CheckUserForRegistration/" + USER
      );

      if (res.Response.length === 0) {
        setUserStatus(0);
        setLoading(false);
      } else if (res.Response[0].status === 1) {
        setDailyMilkRegistrationID(res.Response[0].transid);

        const { Response: bookings } = await API.GET(
          "DailyMilkBooking/UserBookings/" + res.Response[0].transid
        );
        console.log("User Bookings as soon as registration:", bookings);
        const active = findActiveBooking(bookings);
        setUserBookings(bookings);
        if (active) setUserBooked(active);
        console.log("Active Bookings after registration:", active);

        setUserStatus(2);

        // Check birthday after registration data
        checkAndShowBirthday(res.Response[0]);
      } else if (res.Response[0].status === 0) {
        setUserStatus(1);
        setLoading(false);
        checkAndShowBirthday(res.Response[0]);
      } else if (res.Response[0].status === 2) {
        setUserStatus(3);
        setLoading(false);
        checkAndShowBirthday(res.Response[0]);
      }
    } catch (error) {
      console.error("Error in CheckAlreadyRegistered:", error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Don't allow registration during birthday animation
    if (isProcessingBirthday) {
      Alert.alert("Please wait", "Birthday celebration in progress...");
      return;
    }

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
        {
          text: "OK",
          onPress: () => {
            CheckAlreadyRegistered();
          },
        },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      {/* Birthday Overlay - Full Screen */}
      <BirthdayOverlay
        userName={birthdayUserName}
        visible={showBirthdayOverlay}
        onAnimationComplete={handleBirthdayAnimationComplete}
      />

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
            <Text className="text-white text-lg text-center">
              Your registration is waiting for approval by the admin.
            </Text>
          </View>
        ) : UserStatus === 3 ? (
          <View className="flex-1  bg-gray-800 text-center align-middle justify-center">
            <Text className="text-white text-lg text-center">
              Your registration has been rejected by the admin.
            </Text>
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

              <Text className="font-semibold text-gray-700">
                Date of Birth
              </Text>
              <DatePickerInput
                label="Date of Birth"
                value={dob}
                onChange={setDob}
                inputMode="start"
                locale="en"
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
                disabled={isProcessingBirthday}
              >
                <Text className="text-white text-center text-2xl font-semibold">
                  {isProcessingBirthday ? "🎂 Celebrating..." : "Register"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => nav.goBack()}
                className="bg-red-500 py-3 rounded-lg mt-6"
                style={({ pressed }) => scaleOnPress(pressed)}
                disabled={isProcessingBirthday}
              >
                <Text className="text-white text-center text-2xl font-semibold">
                  {isProcessingBirthday ? "Please Wait..." : "Cancel"}
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
