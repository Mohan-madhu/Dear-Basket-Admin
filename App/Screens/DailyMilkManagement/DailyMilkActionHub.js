import React from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import OrderCard from "../../Components_New/OrdersCard";
import { FEATURE_KEYS, isFeatureEnabled } from "../../../App_Utils/Services/FeatureSettingsService";
import { formatDisplayDate } from "./dailyMilkUtils";
import ActionTile from "./components/ActionTile";

export default function DailyMilkActionHub({
  registration,
  phase,
  latestBooking,
  featureSettings,
  demoOrders,
  refreshing,
  onBook,
  onRenew,
  onDemo,
  onRefresh,
}) {
  const dailyMilkEnabled = isFeatureEnabled(featureSettings, FEATURE_KEYS.DAILY_MILK);
  const demoEnabled = isFeatureEnabled(featureSettings, FEATURE_KEYS.DEMO_DAILY_MILK);

  const isExpired = phase === "expired";
  const isFuture = phase === "future";

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerStyle={{ padding: 18, paddingBottom: 44 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
      }
    >
      <View className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-5 mb-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-cyan-300 text-xs font-black uppercase tracking-widest">
              Daily Milk
            </Text>
            <Text className="text-white text-2xl font-black mt-2">
              {isExpired ? "Subscription ended" : isFuture ? "Booking scheduled" : "Ready to book"}
            </Text>
            <Text className="text-slate-400 text-sm mt-2 leading-5">
              {isExpired
                ? "Renew from the next available date without reusing stale booking data."
                : isFuture
                  ? `Your booking starts on ${formatDisplayDate(latestBooking?.bookingstartdate)}.`
                  : "Choose a booking option. This page always reloads fresh registration and booking data."}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            className="w-11 h-11 rounded-2xl bg-slate-800 items-center justify-center"
          >
            <Ionicons name="refresh" size={22} color="#22d3ee" />
          </TouchableOpacity>
        </View>

        {registration?.transid ? (
          <View className="mt-4 rounded-2xl bg-slate-800 p-3">
            <Text className="text-slate-400 text-[11px] font-bold uppercase">Registration ID</Text>
            <Text className="text-white font-black mt-1">{registration.transid}</Text>
          </View>
        ) : null}
      </View>

      {isFuture ? (
        <ActionTile
          icon="checkmark-circle-outline"
          title="Booking already scheduled"
          subtitle="New booking and demo request are locked until this booking period is completed."
          accentColor="#22d3ee"
          disabled
        />
      ) : dailyMilkEnabled ? (
        <ActionTile
          icon={isExpired ? "refresh-circle-outline" : "calendar-outline"}
          title={isExpired ? "Renew Daily Milk" : "Book Daily Milk"}
          subtitle={isExpired ? "Create a fresh renewal from the latest completed booking." : "Start a new Daily Milk monthly booking."}
          accentColor="#22d3ee"
          onPress={isExpired ? onRenew : onBook}
        />
      ) : (
        <ActionTile
          icon="lock-closed-outline"
          title="Daily Milk paused"
          subtitle="Booking and renewal are disabled by admin."
          accentColor="#64748b"
          disabled
        />
      )}

      {demoEnabled && !isExpired && !isFuture ? (
        <ActionTile
          icon="sparkles-outline"
          title="Ask for Demo Daily Milk"
          subtitle="Request a one-time sample delivery from the available batch."
          accentColor="#f59e0b"
          onPress={onDemo}
        />
      ) : null}

      {!isExpired && !isFuture && Array.isArray(demoOrders) && demoOrders.length > 0 ? (
        <View className="mt-3">
          <Text className="text-white text-base font-black mb-3">
            Demo Requests
          </Text>
          {demoOrders.map((order, index) => (
            <OrderCard key={order?.productorderid || index} order={order} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
