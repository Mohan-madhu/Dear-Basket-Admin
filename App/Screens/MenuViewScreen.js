// ParentScreen.jsx
import React, { useState, useEffect } from "react";
import SectionComponent from "../Components/SectionComponent";
import DailyMilkRegistrationScreen from "./DailyMilkRegistrationScreen";
import Storage from "../../App_Utils/Services/StorageService";
import ViewDailyMilkRegistration from "./ViewDailyMilkRegistration";

const log = (val = "", msg = "") => {
  console.log(`[MENU VIEW SCREEN] ${msg}`, val);
};

export default function MenuViewScreen({ MENU }) {
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

  if (ROLE && MENU && MENU.id === "376A5632-41F7-489C-9522-D6293A61D1E0") {
    if (ROLE === "ADMIN") {
      return <ViewDailyMilkRegistration />;
    } else {
      return <DailyMilkRegistrationScreen />;
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
