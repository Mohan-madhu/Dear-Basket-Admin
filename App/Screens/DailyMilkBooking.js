// DailyMilkBookingScreen.js

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Alert,
  ScrollView,
  Animated,
} from "react-native";

import DailyMilkStatus from "../Components/DailyMilkStatus";
import { API, getUserFacingErrorMessage } from "../../App_Utils/Services/APIService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";

import "react-native-get-random-values";
import DailyMilkBooking from "./DailyMilkUserBooking30Days";
import DailyMilkRenewalBooking from "./DailyMilkUserBooking30Days_Renewal";


import Storage from "../../App_Utils/Services/StorageService";
import * as Location from "expo-location";
import { Image } from 'expo-image';
import CartScreen from "../Components/CartItems";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../../App_Utils/Utils/logger";
import Toaster from "../../App_Utils/Services/ToastService";
import OrderCard from "../Components_New/OrdersCard";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  FEATURE_KEYS,
  getFeatureSettings,
  isFeatureEnabled,
} from "../../App_Utils/Services/FeatureSettingsService";

const OVERLAY_Z = 9999;

const overlayRootStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: OVERLAY_Z,
  elevation: OVERLAY_Z, // <- critical for Android
};

const overlaySheetStyle = {
  zIndex: OVERLAY_Z + 1,
  elevation: OVERLAY_Z + 1, // make sure sheet is above the dim background too
};


// ---------- small presentational helpers ----------
const PrimaryButton = ({ title, onPress, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    className={`mt-4  w-full rounded-md px-4 py-3 ${disabled ? "bg-gray-600" : "bg-green-600"
      }`}
    activeOpacity={0.8}
  >
    <Text className="text-white text-center font-semibold">{title}</Text>
  </TouchableOpacity>
);

const GhostButton = ({ title, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    className="mt-3 rounded-md px-4 py-3 border border-gray-500"
    activeOpacity={0.8}
  >
    <Text className="text-white text-center">{title}</Text>
  </TouchableOpacity>
);

const CheckRow = ({ checked, onPress, label }) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center mt-3"
    android_ripple={{ color: "#333" }}
  >
    <View
      className={`w-5 h-5 rounded border border-gray-400 mr-3 items-center justify-center ${checked ? "bg-green-600" : ""
        }`}
    >
      {checked ? <Text className="text-white">✓</Text> : null}
    </View>
    <Text className="text-white flex-1">{label}</Text>
  </Pressable>
);

const RadioRow = ({ selected, onPress, label }) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center mt-3"
    android_ripple={{ color: "#333" }}
  >
    <View className="w-5 h-5 rounded-full border border-gray-400 mr-3 items-center justify-center">
      {selected ? <View className="w-3 h-3 rounded-full bg-green-600" /> : null}
    </View>
    <Text className="text-white">{label}</Text>
  </Pressable>
);

const ActionTile = ({
  icon,
  title,
  subtitle,
  badge,
  accentColor,
  iconBg,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.88}
    className="w-full bg-white rounded-xl px-4 py-4 mb-3 flex-row items-center shadow border border-gray-100"
    style={{ borderLeftWidth: 5, borderLeftColor: accentColor }}
  >
    <View
      className="w-12 h-12 rounded-full items-center justify-center mr-4"
      style={{ backgroundColor: iconBg }}
    >
      <Ionicons name={icon} size={24} color={accentColor} />
    </View>

    <View className="flex-1 pr-3">
      {badge ? (
        <Text className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: accentColor }}>
          {badge}
        </Text>
      ) : null}
      <Text className="text-gray-900 text-base font-bold">{title}</Text>
      <Text className="text-gray-500 text-xs mt-1 leading-4">{subtitle}</Text>
    </View>

    <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
      <Ionicons name="chevron-forward" size={18} color="#374151" />
    </View>
  </TouchableOpacity>
);

const DailyMilkBookingScreen = ({
  DailyMilkRegistrationID_Parent,
  BookingData,
  UserBookings,
  setupd,
}) => {
  // --------- original state ---------
  const [isBooked, setIsBooked] = useState(false);
  const [DailyMilkRegistrationID, setDailyMilkRegistrationID] = useState(
    DailyMilkRegistrationID_Parent
  );
  const [UserBooked, setUserBooked] = useState([]);
  const [UserStatus, setUserStatus] = useState(null);
  const [bookingStatus, setBookingStatus] = useState([]);
  const [userBookingStatus, setUserBookingStatus] = useState(null);
  const [featureSettings, setFeatureSettings] = useState(null);

  const log = createLogger("DailyMilkBooking");

  const { setLoading } = useLoading();

  const navigation = useNavigation();
  const route = useRoute();
  const routeUserBooked = route?.params?.UserBooked;
  const effectiveBookingData = useMemo(() => {
    const hasValidDateRange = (booking) => booking?.transid && booking?.bookingstartdate && booking?.bookingenddate;
    const normalizeList = (value) => Array.isArray(value) ? value.filter(hasValidDateRange) : [];
    const userBookedList = normalizeList(UserBooked);
    const bookingDataList = normalizeList(BookingData);
    const userBookingsList = normalizeList(UserBookings);
    const routeUserBookedList = normalizeList(routeUserBooked);

    if (userBookedList.length > 0) return userBookedList;
    if (bookingDataList.length > 0) return bookingDataList;
    if (userBookingsList.length > 0) return userBookingsList;
    if (routeUserBookedList.length > 0) return routeUserBookedList;
    return [];
  }, [UserBooked, BookingData, UserBookings, routeUserBooked]);

  useEffect(() => {
    let mounted = true;
    getFeatureSettings({ fresh: true }).then((settings) => {
      if (mounted) setFeatureSettings(settings);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const routeBooking = Array.isArray(routeUserBooked) ? routeUserBooked[0] : null;
    if (!DailyMilkRegistrationID && routeBooking?.dailymilkregistrationid) {
      setDailyMilkRegistrationID(routeBooking.dailymilkregistrationid);
    }
  }, [DailyMilkRegistrationID, routeUserBooked]);
  // --------- UI/Overlay state (using animation instead of Modal) ---------
  const [showBookingTerms, setShowBookingTerms] = useState(false);
  const [showDemoTerms, setShowDemoTerms] = useState(false);
  const [agreedBooking, setAgreedBooking] = useState(false);
  const [agreedDemo, setAgreedDemo] = useState(false);
  const [showBookingUI, setShowBookingUI] = useState(false);
  const [isrenewal, setIsrenewal] = useState(false);

  const [demoShift, setDemoShift] = useState(null); // "Morning" | "Evening"
  const [requestingDemo, setRequestingDemo] = useState(false);

  // Animation values for smooth slide-up
  const bookingTermsAnim = useRef(new Animated.Value(1000)).current;
  const demoTermsAnim = useRef(new Animated.Value(1000)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // A single flag we can use everywhere to "freeze" background work while overlays are up
  const anyOverlayOpen = useMemo(
    () => showBookingTerms || showDemoTerms,
    [showBookingTerms, showDemoTerms]
  );
  const demoDailyMilkEnabled = isFeatureEnabled(featureSettings, FEATURE_KEYS.DEMO_DAILY_MILK);
  const dailyMilkEnabled = isFeatureEnabled(featureSettings, FEATURE_KEYS.DAILY_MILK);


  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("TAMILNADU");
  ;
  const [postalcode, setPostalcode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const addressRef = useRef(null);
  const cityRef = useRef(null);
  const stateRef = useRef(null);
  const postalCodeRef = useRef(null);
  const [orders, setOrders] = useState([]);

  {
    /* USER SESSION */
  }

  const [userData, setUserData] = useState(null);
  const [USERTYPE, SETUSERTYPE] = useState();

  const getUserData = async () => {
    try {
      var userData = await Storage.getData("DATA");
      log("User Data Retrieved:", userData);
      setUserData(userData);
      setAddress(userData?.deliveryaddress)
      setCity(userData?.deliverycity)
      setState(userData?.deliverystate || "TAMIL NADU")
      setPostalcode(userData?.deliverypincode)
      setLatitude(userData?.latitude);
      setLongitude(userData?.longitude);
      // log(userData, "User Data in View Cart");
    } catch (error) {
      log("Error getting user data:", error);
    }
  };

  useEffect(() => {
    getUserData();
    fetchOrders();
  }, []);


  const fetchOrders = async () => {
    try {
      const USERDATA = await Storage.getData("DATA");
      const USER = USERDATA.transid
      log("User ID:", USER);



      const endpoint = `ProductOrder/demo-daily-milk/${USER}`;

      log("Fetching Demo Daily Milk Orders from:", endpoint);
      const res = await API.GET(endpoint);
      const response = res.Response;



      if (response && Array.isArray(response)) {


        setOrders(response);
        log("Demo Daily Milk Orders Retrieved:", response);
      } else {
        setOrders([]);
      }
    } catch (error) {
      log("Error fetching orders :", error);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };





  // Ref that mirrors anyOverlayOpen to guard async completions
  const overlayOpenRef = useRef(anyOverlayOpen);
  useEffect(() => {
    overlayOpenRef.current = anyOverlayOpen;
  }, [anyOverlayOpen]);

  // --------- Overlay animation effects ---------
  useEffect(() => {
    if (showBookingTerms) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bookingTermsAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bookingTermsAnim, {
          toValue: 1000,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showBookingTerms]);

  useEffect(() => {
    if (showDemoTerms) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(demoTermsAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(demoTermsAnim, {
          toValue: 1000,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showDemoTerms]);

  // --------- helpers ---------
  const normalizeDate = (input) => {
    if (!input) return null;
    const d =
      typeof input === "string" || typeof input === "number"
        ? new Date(input)
        : input;
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const findActiveBooking = (bookingsData) => {
    const now = new Date();
    const currentDateNormalized = normalizeDate(now);
    if (!currentDateNormalized) return null;
    const normalizeToDateOnly = (date) => {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const activeBookings = [];
    for (const booking of Array.isArray(bookingsData) ? bookingsData : []) {
      if (!booking?.bookingstartdate || !booking?.bookingenddate) continue;
      const startDate = normalizeToDateOnly(booking.bookingstartdate);
      const endDate = normalizeToDateOnly(booking.bookingenddate);
      if (!startDate || !endDate) continue;
      const current = normalizeToDateOnly(currentDateNormalized);
      if (!current) continue;
      const isActive =
        current.getTime() >= startDate.getTime() &&
        current.getTime() <= endDate.getTime();
      if (isActive) activeBookings.push(booking);
    }
    return activeBookings.length > 0 ? activeBookings : null;
  };

  // Safe setLoading that never fires while an overlay is visible
  const safeSetLoading = (flag, msg) => {
    if (overlayOpenRef.current) return;
    setLoading(flag, msg);
  };

  // --------- effects ---------
  // If incoming BookingData says booked, reflect it (but don't touch loading here)
  useEffect(() => {
    if (Array.isArray(BookingData) && BookingData.length > 0) {
      setIsBooked(true);
    }
  }, [BookingData]);

  // Debounced "check already registered" that pauses while overlays are open
  useEffect(() => {
    if (!DailyMilkRegistrationID || anyOverlayOpen) return;
    const t = setTimeout(() => {
      CheckAlreadyRegistered();
    }, 150); // debounce to avoid thrash from quick state flips
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DailyMilkRegistrationID, anyOverlayOpen]);

  function toISTMidnight(dateInput) {
    const dt = new Date(dateInput);

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(dt);

    const y = Number(parts.find(p => p.type === "year").value);
    const m = Number(parts.find(p => p.type === "month").value);
    const d = Number(parts.find(p => p.type === "day").value);

    // Create the instant for 00:00 IST
    return new Date(Date.UTC(y, m - 1, d, -5, -30));
  }


  // --------- network/checks ---------
  const CheckAlreadyRegistered = async () => {

    console.warn("DailyMilkRegistrationID", DailyMilkRegistrationID);
    if (!DailyMilkRegistrationID) return;

    safeSetLoading(true, "Checking User Registration Status");
    try {
      const { Response: bookings } = await API.GET(
        "DailyMilkBooking/UserBookings/" + DailyMilkRegistrationID
      );

      console.warn("Bookings Data:", bookings);

      if (!bookings || !bookings.length) {
        // no bookings found – keep going to status check
      } else {
        function istDateOnlyMs(dateInput) {
          const dt = new Date(dateInput);

          // Get the IST calendar date (YYYY-MM-DD)
          const ymd = dt.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // "2026-01-29"
          // Convert that IST date to a comparable number (ms)
          return Date.parse(ymd + "T00:00:00+05:30");
        }

        const record = bookings.find((item) => item?.bookingstartdate && item?.bookingenddate);
        if (!record) {
          setBookingStatus("Booking details are not available yet");
          setUserBookingStatus(0);
        } else {

        console.warn("22222222222222222222222", record)


        const todayMs = istDateOnlyMs(new Date());
        const startMs = istDateOnlyMs(record.bookingstartdate);
        const endMs = istDateOnlyMs(record.bookingenddate);

        // (Optional) friendly IST logs
        console.log("Booking Dates (IST):", {
          today: new Date(todayMs).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          start: new Date(startMs).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          end: new Date(endMs).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        });

        if (todayMs < startMs) {
          const daysUntilStart = Math.ceil((startMs - todayMs) / 86400000);
          setBookingStatus(`📅 Booking starts in ${daysUntilStart} days`);
          setUserBookingStatus(-1);
        } else if (todayMs >= startMs && todayMs <= endMs) {
          const daysLeft = Math.ceil((endMs - todayMs) / 86400000);
          setBookingStatus(`✅ Booking active — ${daysLeft} days left`);
          setUserBookingStatus(1);
        } else {
          setBookingStatus(`❌ Booking has ended`);
          setUserBookingStatus(2);
        }
        }

      }

      // user registration status
      const res = await API.GET(
        "DailyMilkBooking/CheckUser1/" + DailyMilkRegistrationID
      );
      const bookingCheck = Array.isArray(res?.Response) ? res.Response : [];
      const bookingRegistration = bookingCheck[0];


      if (bookingCheck.length > 0) {
        setIsBooked(true);
      }

      if (bookingCheck.length === 0) {
        setUserStatus(0); // not registered
      } else if (bookingRegistration?.status === 1) {
        setUserStatus(2); // approved
        const { Response: bookings2 } = await API.GET(
          "DailyMilkBooking/UserBookings/" + bookingRegistration.transid
        );
        const active = findActiveBooking(bookings2 || []);

        setUserBooked(active || []);
      } else if (bookingRegistration?.status === 0) {
        setUserStatus(1); // pending
      } else if (bookingRegistration?.status === 2) {
        setUserStatus(3); // rejected
      }
    } catch (e) {
      // optionally surface an error if you have a toast
    } finally {
      safeSetLoading(false);
    }
  };

  // --------- actions ---------
  const openDemo = () => {
    setShowDemoTerms(true);
    setAgreedDemo(false);
    setDemoShift(null);
  };

  const openBooking = () => {
    setShowBookingTerms(true);
    setAgreedBooking(false);
  };

  const handleProceedBooking = () => {
    setShowBookingTerms(false);
    setShowBookingUI(true);
  };

  const handleRequestDemo = async () => {
    if (!agreedDemo || !demoShift) return;
    try {
      setRequestingDemo(true);

      try {
        const ProductOrderid = uuidv4();

        const res1 = await API.GET("DailyMilkRegistration/CheckUserForRegistration/" + userData?.transid);
        const registrations = Array.isArray(res1?.Response) ? res1.Response : [];
        log("User Registration Check:", registrations);
        var dailymilkregistrationdata = registrations[0];

        if (!dailymilkregistrationdata || !dailymilkregistrationdata.transid) {
          Alert.alert("Not Registered", "You need to register first before requesting a demo.");
          return;
        }
        const data = {
          "productorderid": ProductOrderid,
          "userid": userData?.transid,
          "name": userData?.name,
          "isdailymilkuser": 2,
          "mappedpartnerid": userData?.mappedpartnerid,
          "itemtotal": null,
          "deliverycharge": "",
          "tax": "",
          "deliveryaddress": dailymilkregistrationdata?.address,
          "deliverycity": city,
          "deliverystate": state || "TAMIL NADU",
          "deliverypincode": postalcode,
          "latitude": dailymilkregistrationdata?.latitude != null ? dailymilkregistrationdata.latitude.toString() : "",
          "longitude": dailymilkregistrationdata?.longitude != null ? dailymilkregistrationdata.longitude.toString() : "",

          "orderstatus": "Demo Milk Order Placed by " + userData.name,
          "orderplaced": 1,
          "orderplacedby": userData.name,

          "rcu": userData.name,

          "orderdata": demoShift
        }

        log("Creating Daily Milk Demo Order ...")

        const res = await API.POST("ProductOrder/demo-daily-milk", data);

        var msg = res.message || res.Response;
        log("Daily Milk Order Response :", msg)
        if (msg === "Daily Milk Demo Order Created successfully.") {
          Toaster.successtop("Daily Milk Demo Order Created Successfully. ");
          log(" Daily Milk Demo Order Created Successfully ",);
          Alert.alert(
            "Demo Requested",
            `Your free 0.5L demo milk (${demoShift}) has been requested.`
          );
          // navigation.navigate("MyOrdersScreen");
        } else {
          Toaster.infotop(msg)
          log(msg, "ERROR");
          return
        }

      } catch (error) {
        log(error.message, "ERROR");
        Alert.alert(
          "ERROR",
          getUserFacingErrorMessage(error)
        );
      } finally {
        setLoading(false);
      }
      fetchOrders()
      setShowDemoTerms(false);
      setAgreedDemo(false);
      setDemoShift(null);
    } catch (e) {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setRequestingDemo(false);
    }
  };



  // --------- Overlay Components (Animated Views instead of Modals) ---------
  const BookingTermsOverlay = () => (
    <Animated.View
      style={{
        ...overlayRootStyle,
        opacity: showBookingTerms ? overlayOpacity : 0,
        pointerEvents: showBookingTerms ? "auto" : "none",
      }}
      className="flex-1 bg-black/60 items-center justify-end"
    >
      <Pressable
        onPress={() => setShowBookingTerms(false)}
        className="absolute inset-0"
      />
      <Animated.View
        style={{
          transform: [{ translateY: bookingTermsAnim }],
          ...overlaySheetStyle,
        }}
        className="w-full bg-gray-800 rounded-t-2xl p-5 max-h-[85%]"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Before You Book
        </Text>
        <ScrollView className="mt-4">
          <Text className="text-white">
            • You must book at least <Text className="font-semibold">3 days in advance</Text>.
          </Text>
          <Text className="text-white mt-2">
            • Delivery shifts: <Text className="font-semibold">Morning</Text> or <Text className="font-semibold">Evening</Text>.
          </Text>
          <Text className="text-white mt-2">
            • Enter your location/address <Text className="font-semibold">accurately</Text>.
          </Text>
          <Text className="text-white mt-2">
            • Once booking is confirmed, you <Text className="font-semibold">cannot cancel the entire booking</Text>.
          </Text>
          <Text className="text-white mt-2">
            • You can <Text className="font-semibold">pause/cancel individual days</Text> and{" "}
            <Text className="font-semibold">add extra milk per day</Text>.
          </Text>

          <CheckRow
            checked={agreedBooking}
            onPress={() => setAgreedBooking((v) => !v)}
            label="I have read and agree to the terms to proceed."
          />
        </ScrollView>

        <PrimaryButton
          title="Proceed to Booking"
          disabled={!agreedBooking}
          onPress={handleProceedBooking}
        />
        <GhostButton title="Close" onPress={() => setShowBookingTerms(false)} />
      </Animated.View>
    </Animated.View>
  );

  const DemoTermsOverlay = () => (
    <Animated.View
      style={{
        ...overlayRootStyle,
        opacity: showDemoTerms ? overlayOpacity : 0,
        pointerEvents: showDemoTerms ? "auto" : "none",
      }}
      className="flex-1 bg-black/60 items-center justify-end"
    >
      <Pressable
        onPress={() => setShowDemoTerms(false)}
        className="absolute inset-0"
      />
      <Animated.View
        style={{
          transform: [{ translateY: demoTermsAnim }],
          ...overlaySheetStyle,
        }}
        className="w-full bg-gray-800 rounded-t-2xl p-5 max-h-[95%]"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Ask for Demo Milk
        </Text>
        <ScrollView className="mt-4">
          <Text className="text-white">
            • We provide a <Text className="font-semibold">free 0.5L demo milk</Text>.
          </Text>
          <Text className="text-white mt-2">
            • Choose either <Text className="font-semibold">Morning</Text> or{" "}
            <Text className="font-semibold">Evening</Text> shift.
          </Text>
          <Text className="text-white mt-2">• No charges for demo.</Text>
          <Text className="text-white mt-2">
            • You can request a demo <Text className="font-semibold">only once</Text>.
          </Text>
          <Text className="text-white mt-2">
            • Demo will be delivered to your <Text className="font-semibold">permanent home/office address only</Text>.
          </Text>

          <CheckRow
            checked={agreedDemo}
            onPress={() => setAgreedDemo((v) => !v)}
            label="I agree to the demo terms."
          />

          <View className="mt-4">
            <Text className="text-white font-semibold">Select a shift:</Text>
            <RadioRow
              selected={demoShift === "Morning"}
              onPress={() => setDemoShift("Morning")}
              label="Morning"
            />
            <RadioRow
              selected={demoShift === "Evening"}
              onPress={() => setDemoShift("Evening")}
              label="Evening"
            />
          </View>
        </ScrollView>

        <PrimaryButton
          title={requestingDemo ? "Requesting..." : "Request Demo"}
          disabled={!agreedDemo || !demoShift || requestingDemo}
          onPress={handleRequestDemo}
        />
        <GhostButton title="Close" onPress={() => setShowDemoTerms(false)} />
      </Animated.View>
    </Animated.View>
  );


  // --------- render ---------
  return (
    <View style={{ flex: 1 }}>
      {isBooked ? (
        <View className="flex-1 bg-gray-950">
          {UserStatus === 2 ? (
            <View className="flex-1 bg-gray-950">
              {userBookingStatus === -1 ? (
                <View className="flex-1 bg-gray-950 items-center justify-center px-4">
                  <Text className="text-white text-lg text-center">
                    Your booking has not started yet.
                  </Text>
                  <Text className="text-white text-lg text-center">
                    {bookingStatus}
                  </Text>
                </View>
              ) : userBookingStatus === 1 ? (
                <View className="flex-1 bg-gray-950">
                  {/* <Text className="text-white text-lg text-center">
                    Your booking is currently active.
                  </Text>
                  <Text className="text-white text-lg text-center">
                    {bookingStatus}
                  </Text> */}

                  <DailyMilkStatus
                    DailyMilkRegistrationID={DailyMilkRegistrationID}
                    BookingData={effectiveBookingData}
                  />

                </View>
              ) : userBookingStatus === 2 ? (
                <View className="flex-1 bg-gray-950 w-full">
                  {showBookingUI ? (
                    <View className="flex-1 w-full">
                      <DailyMilkRenewalBooking UserBooked={effectiveBookingData} />
                    </View>
                  ) : (
                    <View className="flex-1 items-center justify-center px-4">
                      <Text className="text-white text-lg text-center">
                        Your booking has ended.
                      </Text>
                      <Text className="text-white text-lg text-center">
                        {bookingStatus}
                      </Text>

                      <PrimaryButton title="Renew Your Daily Milk Subscription" onPress={() => { setAgreedBooking(true); handleProceedBooking(); setIsrenewal(true); }} />
                    </View>
                  )}
                </View>
              ) : (
                <DailyMilkStatus
                  DailyMilkRegistrationID={DailyMilkRegistrationID}
                  BookingData={effectiveBookingData}
                />
              )}
            </View>
          ) : UserStatus === 1 ? (
            <View className="flex-1 bg-gray-950 items-center justify-center px-4">
              <Text className="text-white text-lg text-center">
                Your registration is waiting for approval by the admin.
              </Text>
            </View>
          ) : UserStatus === 3 ? (
            <View className="flex-1 bg-gray-950 items-center justify-center px-4">
              <Text className="text-white text-lg text-center">
                Your registration has been rejected by the admin.
              </Text>
            </View>
          )
            : (
              // ---------- NOT BOOKED YET ----------
              <View className="flex-1 bg-gray-800 px-4 py-6">
                <Text className="text-white text-center text-lg">
                  You're not registered yet. Choose an option below.
                </Text>

                {demoDailyMilkEnabled ? (
                  <PrimaryButton title="Ask for Demo Daily Milk" onPress={openDemo} />
                ) : null}

                {dailyMilkEnabled ? (
                  <GhostButton title="Book for Daily Milk" onPress={openBooking} />
                ) : null}

                {/* Reveal booking UI only after agreeing  to terms */}
                {showBookingUI && (
                  <View className="mt-6">
                    <DailyMilkBooking
                      DailyMilkRegistrationID={DailyMilkRegistrationID}
                      setupd={setupd}
                      CheckAlreadyRegistered={CheckAlreadyRegistered}
                    />
                  </View>
                )}




              </View>
            )
          }
        </View>
      ) : (
        // previously it showed booking UI immediately; now we gate behind terms
        //workingg

        // <View className="flex-1 bg-gray-800 px-4 py-6">
        //   {!showBookingUI && (
        //     <View>
        //       <Text className="text-white text-center text-lg">
        //         Choose how you'd like to proceed.
        //       </Text>

        //       <PrimaryButton title="Ask for Demo Daily Milk" onPress={openDemo} />
        //       <GhostButton title="Book for Daily Milk" onPress={openBooking} />

        //       <View style={{ flex: 1, zIndex: 0, elevation: 0 }}>
        //         <Text className="text-white text-center text-lg my-2">
        //           Demo Daily Milk Order Details
        //         </Text>
        //         {orders.length > 0 && (
        //           <OrderCard order={orders[0]} onOrderUpdate={fetchOrders} />)}

        //         {orders.length === 0 && (
        //           <Text className="text-white text-center text-sm ">
        //             No Demo Daily Milk Orders Found.
        //           </Text>
        //         )}
        //       </View>
        //     </View>
        //   )}

        //   {showBookingUI && (
        //     <View className="mt-6">
        //       {/* Back Button */}
        //       <GhostButton title="← Back" onPress={() => setShowBookingUI(false)} />

        //       {/* Booking UI */}
        //       <DailyMilkBooking
        //         DailyMilkRegistrationID={DailyMilkRegistrationID}
        //         setupd={setupd}
        //         CheckAlreadyRegistered={CheckAlreadyRegistered}
        //       />
        //     </View>
        //   )}
        // </View>

        <View className="flex-1 bg-gray-800 px-4 py-6">
          {!showBookingUI && (
            <View>
              <Text className="text-white text-center text-2xl font-bold">
                Daily Milk Service
              </Text>
              <Text className="text-gray-300 text-center text-sm mt-2 mb-5">
                Choose the next step for your subscription.
              </Text>

              {demoDailyMilkEnabled ? (
                <ActionTile
                  icon="flask-outline"
                  title="Ask for Demo Daily Milk"
                  subtitle="Request a free 0.5L sample for morning or evening delivery."
                  badge="Free sample"
                  accentColor="#16a34a"
                  iconBg="#dcfce7"
                  onPress={openDemo}
                />
              ) : null}

              {dailyMilkEnabled ? (
                <ActionTile
                  icon="calendar-number-outline"
                  title="Book for Daily Milk"
                  subtitle="Start a monthly milk plan with your preferred product and date."
                  badge="New booking"
                  accentColor="#2563eb"
                  iconBg="#dbeafe"
                  onPress={openBooking}
                />
              ) : null}

              <ActionTile
                icon="card-outline"
                title="Daily Milk Payment"
                subtitle="Review pending balances and complete your payment."
                badge="Payments"
                accentColor="#ea580c"
                iconBg="#ffedd5"
                onPress={() => navigation.navigate("DailyMilkPayment")}
              />

              <View style={{ flex: 1, zIndex: 0, elevation: 0 }}>
                <Text className="text-white text-center text-lg my-2">
                  Demo Daily Milk Order Details
                </Text>
                {orders.length > 0 && (
                  <OrderCard order={orders[0]} onOrderUpdate={fetchOrders} />
                )}

                {orders.length === 0 && (
                  <Text className="text-white text-center text-sm ">
                    No Demo Daily Milk Orders Found.
                  </Text>
                )}
              </View>
            </View>
          )}

          {showBookingUI && (
            <View className="mt-6">
              {/* Back Button */}
              <GhostButton title="← Back" onPress={() => setShowBookingUI(false)} />

              
              {
              /* Booking UI */}
              <DailyMilkBooking
                DailyMilkRegistrationID={DailyMilkRegistrationID}
                setupd={setupd}
                CheckAlreadyRegistered={CheckAlreadyRegistered}
              />
            </View>
          )}
        </View>
      )}

      {/* Animated Overlays instead of Modals */}
      <BookingTermsOverlay />
      <DemoTermsOverlay />
    </View>
  );
};

export default DailyMilkBookingScreen;
