import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DailyMilkStatus from "../../Components/DailyMilkStatus";
import { useLoading } from "../../../App_Utils/Contexts/LoadingContext";
import {
  FEATURE_KEYS,
  isFeatureEnabled,
} from "../../../App_Utils/Services/FeatureSettingsService";
import DailyMilkBooking from "../DailyMilkUserBooking30Days";
import DailyMilkRenewalBooking from "../DailyMilkUserBooking30Days_Renewal";
import DailyMilkActionHub from "./DailyMilkActionHub";
import DailyMilkRegistrationForm from "./DailyMilkRegistrationForm";
import CenterState from "./components/CenterState";
import useDailyMilkManager from "./hooks/useDailyMilkManager";
import { getBookingPhase, hasValidBookingDates } from "./dailyMilkUtils";

export default function DailyMilkManagerScreen({ refreshKey }) {
  const { setLoading } = useLoading();
  const {
    userData,
    registration,
    bookings,
    demoOrders,
    featureSettings,
    screenLoading,
    refreshing,
    refreshAll,
    submitDemo,
  } = useDailyMilkManager({ refreshKey, setLoading });
  const [modeOverride, setModeOverride] = useState(null);

  const phaseInfo = useMemo(() => getBookingPhase(bookings), [bookings]);
  const registrationStatus = Number(registration?.status);
  const renewalSource = useMemo(() => {
    if (hasValidBookingDates(phaseInfo.latestBooking)) return [phaseInfo.latestBooking];
    return phaseInfo.validBookings.filter(hasValidBookingDates);
  }, [phaseInfo.latestBooking, phaseInfo.validBookings]);
  const statusKey = useMemo(() => {
    const ids = phaseInfo.activeBookings.map((item) => item?.transid).filter(Boolean).join("-");
    return ids || phaseInfo.latestBooking?.transid || "daily-milk-status";
  }, [phaseInfo.activeBookings, phaseInfo.latestBooking?.transid]);

  const handleBookingCompleted = useCallback(async () => {
    setLoading(true, "Refreshing Daily Milk...");
    try {
      setModeOverride(null);
      await refreshAll({ silent: true });
    } finally {
      setLoading(false);
    }
  }, [refreshAll, setLoading]);

  const askDemo = useCallback(() => {
    Alert.alert("Demo Daily Milk", "Select delivery batch.", [
      { text: "Morning", onPress: () => submitDemo("Morning") },
      { text: "Evening", onPress: () => submitDemo("Evening") },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [submitDemo]);

  if (screenLoading && !refreshing) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator color="#22d3ee" size="large" />
        <Text className="text-slate-300 mt-4 font-semibold">
          Loading Daily Milk...
        </Text>
      </View>
    );
  }

  if (!userData?.transid) {
    return (
      <CenterState
        icon="person-circle-outline"
        title="Login required"
        subtitle="Please login again to manage Daily Milk."
        actionLabel="Refresh"
        onAction={() => refreshAll()}
      />
    );
  }

  if (!isFeatureEnabled(featureSettings, FEATURE_KEYS.DAILY_MILK)) {
    return (
      <CenterState
        icon="lock-closed-outline"
        title="Daily Milk is currently unavailable"
        subtitle="Daily Milk booking and renewal have been paused by the admin."
        actionLabel="Refresh"
        onAction={() => refreshAll()}
      />
    );
  }

  if (!registration) {
    return (
          <DailyMilkRegistrationForm
        userData={userData}
        onRegistered={() => refreshAll()}
      />
    );
  }

  if (registrationStatus === 0) {
    return (
      <CenterState
        icon="hourglass-outline"
        title="Waiting for approval"
        subtitle="Your Daily Milk registration is pending admin approval."
        actionLabel="Refresh"
        onAction={() => refreshAll()}
      />
    );
  }

  if (registrationStatus === 2) {
    return (
      <CenterState
        icon="close-circle-outline"
        title="Registration rejected"
        subtitle="Please contact admin to update your registration details."
        actionLabel="Refresh"
        onAction={() => refreshAll()}
      />
    );
  }

  if (modeOverride === "new_booking") {
    return (
      <ScrollView
        className="flex-1 bg-slate-950"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 pt-4">
          <TouchableOpacity
            className="self-start rounded-full bg-slate-800 px-4 py-2 mb-2"
            onPress={() => setModeOverride(null)}
          >
            <Text className="text-cyan-200 font-bold">Back</Text>
          </TouchableOpacity>
        </View>
        <DailyMilkBooking
          DailyMilkRegistrationID={registration.transid}
          setupd={() => refreshAll({ silent: true })}
          CheckAlreadyRegistered={() => refreshAll({ silent: true })}
          onBookingCompleted={handleBookingCompleted}
        />
      </ScrollView>
    );
  }

  if (modeOverride === "renewal") {
    if (renewalSource.length === 0) {
      return (
        <CenterState
          icon="alert-circle-outline"
          title="Renewal data unavailable"
          subtitle="Please refresh Daily Milk details before renewing."
          actionLabel="Refresh"
          onAction={() => {
            setModeOverride(null);
            refreshAll({ silent: true });
          }}
        />
      );
    }

    return (
      <View className="flex-1 bg-slate-950">
        <View className="px-4 pt-4">
          <TouchableOpacity
            className="self-start rounded-full bg-slate-800 px-4 py-2 mb-2"
            onPress={() => setModeOverride(null)}
          >
            <Text className="text-cyan-200 font-bold">Back</Text>
          </TouchableOpacity>
        </View>
        <DailyMilkRenewalBooking
          key={renewalSource[0]?.transid || "daily-milk-renewal"}
          UserBooked={renewalSource}
          onBookingCompleted={handleBookingCompleted}
        />
      </View>
    );
  }

  if (phaseInfo.phase === "active") {
    return (
      <View className="flex-1 bg-slate-950">
        <DailyMilkStatus
          key={statusKey}
          BookingData={phaseInfo.activeBookings}
        />
      </View>
    );
  }

  if (phaseInfo.phase === "future") {
    return (
      <DailyMilkActionHub
        registration={registration}
        phase={phaseInfo.phase}
        latestBooking={phaseInfo.latestBooking}
        featureSettings={featureSettings}
        demoOrders={demoOrders}
        refreshing={refreshing}
        onBook={() => setModeOverride("new_booking")}
        onRenew={() => setModeOverride("renewal")}
        onDemo={askDemo}
        onRefresh={() => refreshAll({ silent: true })}
      />
    );
  }

  return (
    <DailyMilkActionHub
      registration={registration}
      phase={phaseInfo.phase}
      latestBooking={phaseInfo.latestBooking}
      featureSettings={featureSettings}
      demoOrders={demoOrders}
      refreshing={refreshing}
      onBook={() => setModeOverride("new_booking")}
      onRenew={() => setModeOverride("renewal")}
      onDemo={askDemo}
      onRefresh={() => refreshAll({ silent: true })}
    />
  );
}
