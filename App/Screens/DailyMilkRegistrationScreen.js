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
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import LocationService from "../../App_Utils/Services/LocationService";
import DailyMilkBookingScreen from "./DailyMilkBooking";
import ConfettiCannon from "react-native-confetti-cannon";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import NowInIST from "../../App_Utils/Services/DateService";

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

// Function to check if booking is expiring soon (within 7 days)
function isBookingExpiringSoon(bookingData) {
  if (!bookingData || !bookingData.length) return false;

  const now = new Date();
  const today = normalizeDate(now);

  // Get the earliest end date from all active bookings
  let earliestEndDate = null;

  for (const booking of bookingData) {
    const endDate = normalizeDate(new Date(booking.bookingenddate));
    if (!earliestEndDate || endDate < earliestEndDate) {
      earliestEndDate = endDate;
    }
  }

  if (!earliestEndDate) return false;

  // Calculate days difference
  const timeDiff = earliestEndDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  // Show notification if booking expires in 7 days or less
  return daysDiff <= 7 && daysDiff >= 0;
}

// Function to get days remaining
function getDaysRemaining(bookingData) {
  if (!bookingData || !bookingData.length) return 0;

  const now = new Date();
  const today = normalizeDate(now);

  let earliestEndDate = null;

  for (const booking of bookingData) {
    const endDate = normalizeDate(new Date(booking.bookingenddate));
    if (!earliestEndDate || endDate < earliestEndDate) {
      earliestEndDate = endDate;
    }
  }

  if (!earliestEndDate) return 0;

  const timeDiff = earliestEndDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  return daysDiff;
}

// Booking Expiry Notification Component
const BookingExpiryNotification = ({
  visible,
  onClose,
  onRenewPress,
  daysRemaining,
  bookingData
}) => {
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 100,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const isExpired = daysRemaining <= 0;
  const isUrgent = daysRemaining <= 3;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50 justify-end items-center"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1}>
          <Animated.View
            className="w-11/12 rounded-2xl p-5 mb-5 border-2 shadow-lg"
            style={{
              transform: [{ translateY: slideAnim }],
              backgroundColor: isExpired ? '#fef2f2' : isUrgent ? '#fffbeb' : '#f0f9ff',
              borderColor: isExpired ? '#fecaca' : isUrgent ? '#fde68a' : '#bae6fd',
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className={`w-10 h-10 rounded-full justify-center items-center mr-3 ${isExpired ? 'bg-red-500' : isUrgent ? 'bg-yellow-500' : 'bg-blue-500'
                }`}>
                <MaterialIcons
                  name={isExpired ? "error-outline" : "notification-important"}
                  size={24}
                  color="white"
                />
              </View>
              <Text className={`flex-1 text-xl font-bold ${isExpired ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                {isExpired ? 'Booking Expired!' : 'Booking Expiring Soon'}
              </Text>
              <TouchableOpacity onPress={onClose} className="p-1">
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-base text-gray-700 mb-4 leading-6">
              {isExpired
                ? 'Your daily milk booking has expired. Please renew to continue receiving milk deliveries.'
                : `Your daily milk booking will expire in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`}
            </Text>

            {bookingData && bookingData.length > 0 && (
              <View className="bg-white/70 rounded-xl p-4 mb-4 border border-gray-200">
                <Text className="text-sm font-semibold text-gray-600 mb-3">
                  Current Booking Details:
                </Text>
                {bookingData.map((booking, index) => (
                  <View key={booking.bookingid} className="bg-white rounded-lg p-3 mb-2 border border-gray-100">
                    <View className="flex-row items-center mb-2">
                      <MaterialIcons
                        name={booking.deliverytype === "Morning" ? "wb-sunny" : "nights-stay"}
                        size={16}
                        color="#4b5563"
                      />
                      <Text className="text-sm font-semibold text-gray-800 ml-2 flex-1">
                        {booking.deliverytype} Delivery
                      </Text>
                      <View className={`px-2 py-1 rounded-full ${booking.status === 1 ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                        <Text className="text-xs text-white font-semibold">
                          {booking.status === 1 ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-sm text-gray-600 mb-1">
                      {booking.quantity} liter(s) • ₹{booking.totalamount}
                    </Text>
                    <Text className="text-xs text-gray-500 italic">
                      Ends: {new Date(booking.bookingenddate).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View className="flex-row justify-between mb-4">
              <TouchableOpacity
                className={`flex-1 flex-row justify-center items-center py-3 px-5 rounded-xl mr-2 ${isExpired ? 'bg-red-600' : isUrgent ? 'bg-yellow-600' : 'bg-blue-600'
                  }`}
                onPress={onRenewPress}
              >
                <MaterialIcons name="autorenew" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">
                  {isExpired ? 'Renew Booking Now' : 'Renew Early'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-3 px-5 rounded-xl bg-gray-50 border border-gray-300"
                onPress={onClose}
              >
                <Text className="text-gray-600 text-sm font-medium">
                  {daysRemaining <= 3 ? 'I understand' : 'Remind me later'}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="pt-3 border-t border-gray-300">
              <Text className="text-xs text-gray-600 text-center">
                {isExpired
                  ? '⚠️ No deliveries will be made until renewal'
                  : '🔔 Renew now to avoid interruption in service'}
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

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
        className="flex-1 bg-black/70 justify-center items-center"
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

        {/* Main content */}
        <View className="items-center px-6">
          <Animated.View
            className="mb-6"
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }}
          >
            <View
              className="bg-white/15 rounded-full p-6 border-3 border-white/40 mb-4"
            >
              <Text className="text-6xl">🎂</Text>
            </View>
          </Animated.View>

          <Animated.View
            className="items-center mb-8"
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }}
          >
            <Text
              className="text-3xl font-bold text-white text-center mb-3"
            >
              Happy Birthday!
            </Text>

            <View
              className="bg-white/15 rounded-2xl px-4 py-2 border-2 border-white/40 mb-3"
            >
              <Text
                className="text-2xl text-white font-bold text-center"
              >
                {userName || "Dear Customer"}
              </Text>
            </View>

            <Text
              className="text-base text-white/90 text-center leading-6"
            >
              Wishing you a day filled with{"\n"}
              joy, laughter, and wonderful surprises! 🎈🎁✨
            </Text>
          </Animated.View>

          <Animated.View
            className="bg-yellow-400 rounded-2xl px-4 py-2 border-3 border-yellow-500"
            style={{ opacity: opacityAnim }}
          >
            <Text
              className="text-base font-bold text-gray-900 text-center"
            >
              🎊 Enjoy your special day! 🎊
            </Text>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

// Function to check if today is birthday
const isTodayBirthday = (dobString) => {
  if (!dobString) return false;

  try {
    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
    });

    const getDayMonth = (date) => {
      const parts = formatter.formatToParts(date);
      return {
        day: parts.find(p => p.type === "day").value,
        month: parts.find(p => p.type === "month").value,
      };
    };

    const dob = getDayMonth(new Date(dobString));
    const today = getDayMonth(new Date());

    return dob.day === today.day && dob.month === today.month;
  } catch (error) {
    console.log("Error parsing DOB:", error);
    return false;
  }
};

const DailyMilkRegistrationScreen = () => {
  const nav = useNavigation();
  const { setLoading } = useLoading();
  const [UserStatus, setUserStatus] = useState(null);

  // States for notifications
  const [showBirthdayOverlay, setShowBirthdayOverlay] = useState(false);
  const [showExpiryNotification, setShowExpiryNotification] = useState(false);
  const [birthdayUserName, setBirthdayUserName] = useState("");
  const [isProcessingBirthday, setIsProcessingBirthday] = useState(false);

  // State for expiry notification
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [expiringBookings, setExpiringBookings] = useState([]);

  const [name, setName] = useState("");
  const [dob, setDob] = useState(new Date());
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [familymembers, setFamilyMembers] = useState("");
  const [upd, setupd] = useState(0);
  const [showDOBPicker, setShowDOBPicker] = useState(false);

  /* ── animations ── */
  const headerAnim = useSlideFade(0);
  const personalAnim = useSlideFade(150);
  const locationAnim = useSlideFade(300);
  const familyAnim = useSlideFade(450);
  const buttonsAnim = useSlideFade(600);

  const handleDOBChange = (event, selectedDate) => {
    setShowDOBPicker(false); // Always hide picker after selection

    if (selectedDate) {
      // Create a new date without timezone conversion
      const localDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        5, 30, 0, 0 // Set to IST time (5:30 AM) to avoid date shift
      );
      setDob(localDate);
    }
  };

  // Update the formatDate function to show Indian date
  const formatDate = (date) => {
    if (!date) return "Select Date";

    try {
      // Format date in Indian style: DD Month YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString("en-IN", { month: "long" });
      const year = date.getFullYear();

      return `${day} ${month} ${year}`;
    } catch (error) {
      console.log("Error formatting date:", error);
      return "Select Date";
    }
  };


  const formatDOBForAPI = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  /* ── press-scale helper ── */
  const scaleOnPress = (pressed) => ({
    transform: [{ scale: pressed ? 0.95 : 1 }],
  });


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

    const birthday = isTodayBirthday(userData.dob);

    if (!birthday) return;

    console.log("🎂 Birthday detected! Starting celebration...");
    setIsProcessingBirthday(true);
    setBirthdayUserName(userData.name || "Valued Customer");
    setShowBirthdayOverlay(true);
  };

  // Check if booking is expiring soon
  const checkBookingExpiry = (bookings, allbookings) => {
    const isValid = hasValidBookings(allbookings);

    console.log("Valid?", isValid);
    if (!bookings || bookings.length === 0) return;

    const expiringSoon = isBookingExpiringSoon(bookings);
    const days = getDaysRemaining(bookings);

    console.log("📅 Booking expiry check:", {
      expiringSoon,
      daysRemaining: days,
      bookings
    });

    if (expiringSoon && isValid) {
      setDaysRemaining(days);
      setExpiringBookings(bookings);

      // Show notification after a short delay (to not interfere with other UI)
      setTimeout(() => {
        setShowExpiryNotification(true);
      }, 1500);
    }
  };

  const handleBirthdayAnimationComplete = () => {
    console.log("🎂 Birthday animation complete callback");
    setShowBirthdayOverlay(false);
    setIsProcessingBirthday(false);
  };

  // Handle renew button press
  const handleRenewPress = () => {
    setShowExpiryNotification(false);


    nav.navigate("DailyMilkBookingScreen", { UserBooked })

  };

  // Handle notification close
  const handleNotificationClose = () => {
    setShowExpiryNotification(false);
  };

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


  useEffect(() => {
    async function prereq() {
      await CheckAlreadyRegistered();
      if (!latitude && !longitude) {
        await fetchLocation();
      }
    }
    prereq();
  }, [USER, upd]);


  function hasValidBookings(bookings) {
    const today = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    for (const b of bookings) {
      const endDate = new Date(b.bookingenddate);

      if (endDate - today > sevenDaysMs) {
        return false; // ❌ Found a booking ending more than 7 days ahead
      }
    }

    return true; // ✅ All bookings end within 7 days
  }



  const CheckAlreadyRegistered = async () => {
    if (!USER) return;

    setLoading(true, "Checking User Registration Status and Fetching Location…");

    try {
      const res = await API.GET(
        "DailyMilkRegistration/CheckUserForRegistration/" + USER
      );
      console.log("Registration Check Response:", res);

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
        console.log("Active Bookings:", active);
        setUserBookings(bookings);
        if (active) setUserBooked(active);
        console.log("Active Bookings after registration:", active);
        setUserStatus(2);

        // Check booking expiry
        if (active) {
          checkBookingExpiry(active, bookings);
        }

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
      dob: formatDOBForAPI(dob),

      address: address.trim(),
      mobile: mobile.trim(),
      latitude: latitude.trim(),
      longitude: longitude.trim(),
      status: 1,
      familymembers: parseInt(familymembers, 10) || 0,
      rcu: "SELF",
    };
    console.log("Registration Payload:", payload);
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

      {/* Booking Expiry Notification - Bottom Popup */}
      <BookingExpiryNotification
        visible={showExpiryNotification}
        onClose={handleNotificationClose}
        onRenewPress={handleRenewPress}
        daysRemaining={daysRemaining}
        bookingData={expiringBookings}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {UserStatus === 2 ? (
          <View className="flex-1 bg-gray-800">
            <DailyMilkBookingScreen
              DailyMilkRegistrationID_Parent={DailyMilkRegistrationID}
              BookingData={UserBooked}
              UserBookings={UserBookings}
              setupd={setupd}
              onBookingUpdate={() => {
                // Refresh bookings and check expiry
                CheckAlreadyRegistered();
              }}
            />
          </View>
        ) : UserStatus === 1 ? (
          <View className="flex-1 bg-gray-800 justify-center items-center">
            <Text className="text-white text-lg text-center">
              Your registration is waiting for approval by the admin.
            </Text>
          </View>
        ) : UserStatus === 3 ? (
          <View className="flex-1 bg-gray-800 justify-center items-center">
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

              <View className="mb-4">
                <Text className="text-gray-700 mb-2">Date of Birth *</Text>
                <TouchableOpacity
                  className="border border-gray-300 rounded-lg p-3 bg-white"
                  onPress={() => setShowDOBPicker(true)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-800 text-base">
                      {formatDate(dob)}
                    </Text>
                    <Ionicons name="calendar" size={20} color="#6B7280" />
                  </View>
                </TouchableOpacity>

                {showDOBPicker && (
                  <DateTimePicker
                    value={dob}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDOBChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>

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