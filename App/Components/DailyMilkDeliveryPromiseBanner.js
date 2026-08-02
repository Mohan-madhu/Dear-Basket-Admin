import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import { getDailyMilkDeliveryPromise } from "../../App_Utils/Utils/dailyMilkDeliverySchedule";

const DAILY_MILK_MENU_ID = "376A5632-41F7-489C-9522-D6293A61D1E0";
const DEAR_FOODIE_MENU_ID = "7B7A4417-266F-4D2B-88CB-F1BD590BF799";

const hiddenRoutePatterns = [
  /^Login$/i,
  /^Splash$/i,
  /^NewUser$/i,
  /DailyMilk/i,
  /DearKitchen/i,
  /DearFoodie/i,
  /Foodie/i,
];

const isHiddenRoute = (route) => {
  const routeName = String(route?.name || "");
  const activeMenuId = route?.params?.activeMenuId || route?.params?.params?.activeMenuId;

  if (!routeName) return true;

  if (activeMenuId === DAILY_MILK_MENU_ID || activeMenuId === DEAR_FOODIE_MENU_ID) {
    return true;
  }

  return hiddenRoutePatterns.some((pattern) => pattern.test(routeName));
};

const getUserDeliveryType = (userData, activeRegistration) =>
  activeRegistration?.deliverytype ||
  activeRegistration?.milkdeliverytype ||
  userData?.milkdeliverytype ||
  userData?.deliverytype ||
  "Morning";

export default function DailyMilkDeliveryPromiseBanner({ route }) {
  const [bannerState, setBannerState] = useState({
    active: false,
    deliveryType: "Morning",
  });

  const hidden = useMemo(() => isHiddenRoute(route), [route]);

  useEffect(() => {
    let mounted = true;

    const loadDailyMilkStatus = async () => {
      if (hidden) return;

      try {
        const [role, userData] = await Promise.all([
          Storage.getData("ROLE"),
          Storage.getData("DATA"),
        ]);
        const normalizedRole = String(role || userData?.usertype || "").toUpperCase();

        if (normalizedRole !== "USER" || !userData?.transid) {
          if (mounted) {
            setBannerState((current) =>
              current.active ? { active: false, deliveryType: "Morning" } : current
            );
          }
          return;
        }

        const response = await API.GET_FRESH(`user/dailymilk-active-check/${userData.transid}`);
        const activeRegistration = response?.Response?.find((item) => Number(item?.status) === 1);

        if (!mounted) return;

        if (activeRegistration) {
          setBannerState({
            active: true,
            deliveryType: getUserDeliveryType(userData, activeRegistration),
          });
        } else {
          setBannerState({ active: false, deliveryType: "Morning" });
        }
      } catch (error) {
        console.log("Daily milk delivery promise banner error:", error?.message || error);
        if (mounted) setBannerState({ active: false, deliveryType: "Morning" });
      }
    };

    loadDailyMilkStatus();

    return () => {
      mounted = false;
    };
  }, [hidden, route?.name, route?.params?.activeMenuId]);

  if (hidden || !bannerState.active) return null;

  const promise = getDailyMilkDeliveryPromise(bannerState.deliveryType);

  return (
    <View className="bg-emerald-700 border-b border-emerald-900 px-3 py-2">
      <View className="flex-row items-center justify-center">
        <View className="w-6 h-6 rounded-full bg-amber-300 items-center justify-center mr-2">
          <Ionicons name="time-outline" size={15} color="#065f46" />
        </View>
        <Text className="text-white text-xs font-extrabold text-center flex-shrink">
          {promise.headline}
        </Text>
      </View>
    </View>
  );
}
