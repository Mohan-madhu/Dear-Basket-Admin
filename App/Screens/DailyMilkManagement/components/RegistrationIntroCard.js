import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RegistrationIntroCard() {
  return (
    <View className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-5 mb-5">
      <View className="w-14 h-14 rounded-2xl bg-cyan-500/15 items-center justify-center mb-4">
        <Ionicons name="water-outline" size={28} color="#22d3ee" />
      </View>
      <Text className="text-white text-2xl font-black">
        Daily Milk Registration
      </Text>
      <Text className="text-slate-400 text-sm mt-2 leading-5">
        Register once. After admin approval, booking and renewal will open here.
      </Text>
    </View>
  );
}
