// ParentScreen.jsx
import React, { useState, useEffect } from "react";
import SectionComponent from "../Components/SectionComponent";
import DailyMilkRegistrationScreen from "./DailyMilkRegistrationScreen";
import Storage from "../../App_Utils/Services/StorageService";
import ViewDailyMilkRegistration from "./ViewDailyMilkRegistration";
import DearFoodieScreen from "./DearKitchen/DearFoodieScreen.js";

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
    return <DearFoodieScreen />;
  }

  if (ROLE && MENU && MENU.id === DAILY_MILK_MENU_ID) {
    if (ROLE === "ADMIN") {
      return <ViewDailyMilkRegistration />;
    } else {
      return <DailyMilkRegistrationScreen refreshKey={dailyMilkRefreshKey} />;
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
