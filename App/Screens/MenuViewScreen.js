// ParentScreen.jsx
import React, { useState, useEffect } from "react";
import SectionComponent from "../Components/SectionComponent";
import DailyMilkManagerScreen from "./DailyMilkManagement/DailyMilkManagerScreen";
import Storage from "../../App_Utils/Services/StorageService";
import ViewDailyMilkRegistration from "./ViewDailyMilkRegistration";
import DearFoodieScreen from "./DearKitchen/DearFoodieScreen.js";
import {
  FEATURE_KEYS,
  getFeatureSettings,
  isFeatureEnabled,
} from "../../App_Utils/Services/FeatureSettingsService";
import { Text, View } from "react-native";

const DAILY_MILK_MENU_ID = "376A5632-41F7-489C-9522-D6293A61D1E0";
const DEAR_FOODIE_MENU_ID = "7B7A4417-266F-4D2B-88CB-F1BD590BF799";

const log = (val = "", msg = "") => {
  console.log(`[MENU VIEW SCREEN] ${msg}`, val);
};

export default function MenuViewScreen({ MENU, dailyMilkRefreshKey }) {
  //log(MENU);
  const [ROLE, setROLE] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [featureSettings, setFeatureSettings] = useState(null);

  const getRole = async () => {
    try {
      const role = await Storage.getData("ROLE");
      setROLE(role || null);
    } catch (error) {
      log(error, "Failed to get ROLE");
      setROLE(null);
    }
  };

  useEffect(() => {
    getRole();
  }, []);

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
    // Simulate fetch safely and avoid state update after unmount
    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      setSections([]);
      setLoading(true);
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (MENU && MENU.id === DEAR_FOODIE_MENU_ID) {
    if (!isFeatureEnabled(featureSettings, FEATURE_KEYS.DEAR_KITCHEN)) {
      return (
        <View className="flex-1 items-center justify-center bg-slate-50 px-6">
          <Text className="text-center text-xl font-black text-slate-900">
            Dear Kitchen is currently unavailable
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
            Food ordering has been paused by the admin. Please check again later.
          </Text>
        </View>
      );
    }
    return <DearFoodieScreen />;
  }

  if (ROLE && MENU && MENU.id === DAILY_MILK_MENU_ID) {
    if (!isFeatureEnabled(featureSettings, FEATURE_KEYS.DAILY_MILK)) {
      return (
        <View className="flex-1 items-center justify-center bg-slate-950 px-6">
          <Text className="text-center text-xl font-black text-white">
            Daily Milk is currently unavailable
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-slate-300">
            Daily Milk booking and renewal have been paused by the admin.
          </Text>
        </View>
      );
    }
    if (ROLE === "ADMIN") {
      return <ViewDailyMilkRegistration />;
    } else {
      return <DailyMilkManagerScreen refreshKey={dailyMilkRefreshKey} />;
    }
  }
  return (
    <SectionComponent
      loading={loading}
      MENU={MENU}
      // placeholder="Search for atta, dal, coke…"
      onSearchPress={() => {}}
    />
  );
}
