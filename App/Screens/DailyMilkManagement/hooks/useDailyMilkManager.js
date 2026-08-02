import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import Storage from "../../../../App_Utils/Services/StorageService";
import { API, getUserFacingErrorMessage } from "../../../../App_Utils/Services/APIService";
import { getFeatureSettings } from "../../../../App_Utils/Services/FeatureSettingsService";

export default function useDailyMilkManager({ refreshKey, setLoading }) {
  const mountedRef = useRef(false);
  const [userData, setUserData] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [demoOrders, setDemoOrders] = useState([]);
  const [featureSettings, setFeatureSettings] = useState(null);
  const [screenLoading, setScreenLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadUser = useCallback(async () => {
    const data = await Storage.getData("DATA");
    if (!data?.transid) {
      const userId = await Storage.getData("USERID");
      if (userId) return { transid: userId };
      return null;
    }
    return data;
  }, []);

  const fetchDemoOrders = useCallback(async (userid) => {
    if (!userid) return [];
    try {
      const { Response } = await API.GET(`ProductOrder/demo-daily-milk/${userid}`);
      return Array.isArray(Response) ? Response : [];
    } catch (error) {
      console.warn("DailyMilkManager demo order fetch failed:", error);
      return [];
    }
  }, []);

  const refreshAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setScreenLoading(true);
    setRefreshing(true);

    try {
      const [user, settings] = await Promise.all([
        loadUser(),
        getFeatureSettings({ fresh: true }),
      ]);

      if (!mountedRef.current) return;
      setUserData(user);
      setFeatureSettings(settings);

      if (!user?.transid) {
        setRegistration(null);
        setBookings([]);
        setDemoOrders([]);
        return;
      }

      const registrationRes = await API.GET(
        `DailyMilkRegistration/CheckUserForRegistration/${user.transid}`
      );
      const registrations = Array.isArray(registrationRes?.Response)
        ? registrationRes.Response
        : [];
      const currentRegistration = registrations[0] || null;

      if (!mountedRef.current) return;
      setRegistration(currentRegistration);

      if (Number(currentRegistration?.status) === 1 && currentRegistration?.transid) {
        const [bookingRes, demoList] = await Promise.all([
          API.GET(`DailyMilkBooking/UserBookings/${currentRegistration.transid}`),
          fetchDemoOrders(user.transid),
        ]);

        if (!mountedRef.current) return;
        setBookings(Array.isArray(bookingRes?.Response) ? bookingRes.Response : []);
        setDemoOrders(demoList);
      } else {
        const demoList = await fetchDemoOrders(user.transid);
        if (!mountedRef.current) return;
        setBookings([]);
        setDemoOrders(demoList);
      }
    } catch (error) {
      console.error("DailyMilkManager refresh error:", error);
      Alert.alert(
        "Daily Milk",
        getUserFacingErrorMessage(error, "Failed to load Daily Milk details.")
      );
    } finally {
      if (mountedRef.current) {
        setScreenLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetchDemoOrders, loadUser]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll, refreshKey]);

  const submitDemo = useCallback(async (deliveryType) => {
    if (!userData?.transid) {
      Alert.alert("Session Error", "Please login again.");
      return;
    }

    const payload = {
      productorderid: uuidv4(),
      userid: userData.transid,
      name: userData.name || "",
      isdailymilkuser: 2,
      mappedpartnerid: userData.mappedpartnerid || registration?.mappedpartnerid || "",
      itemtotal: null,
      deliverycharge: "",
      tax: "",
      deliveryaddress:
        registration?.address ||
        userData.deliveryaddress ||
        userData.address ||
        "",
      deliverycity: userData.deliverycity || "",
      deliverystate: userData.deliverystate || "TAMIL NADU",
      deliverypincode: userData.deliverypincode || "",
      latitude: String(registration?.latitude || userData.latitude || ""),
      longitude: String(registration?.longitude || userData.longitude || ""),
      orderstatus: `Demo Milk Order Placed by ${userData.name || ""}`.trim(),
      orderplaced: 1,
      orderplacedby: userData.name || "",
      rcu: userData.name || userData.transid,
      orderdata: deliveryType,
    };

    setLoading(true, "Requesting Demo Daily Milk...");
    try {
      await API.POST("ProductOrder/demo-daily-milk", payload);
      Alert.alert("Done", "Demo Daily Milk request submitted.");
      await refreshAll({ silent: true });
    } catch (error) {
      Alert.alert(
        "Error",
        getUserFacingErrorMessage(error, "Failed to request demo Daily Milk.")
      );
    } finally {
      setLoading(false);
    }
  }, [refreshAll, registration, setLoading, userData]);

  return {
    userData,
    registration,
    bookings,
    demoOrders,
    featureSettings,
    screenLoading,
    refreshing,
    refreshAll,
    submitDemo,
  };
}
