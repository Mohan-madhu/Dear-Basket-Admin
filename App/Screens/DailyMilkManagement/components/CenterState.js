import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CenterState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <View className="flex-1 bg-slate-950 items-center justify-center px-6">
      <View className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 items-center justify-center mb-5">
        <Ionicons name={icon} size={30} color="#22d3ee" />
      </View>
      <Text className="text-white text-xl font-black text-center">{title}</Text>
      {subtitle ? (
        <Text className="text-slate-400 text-sm leading-6 text-center mt-3">
          {subtitle}
        </Text>
      ) : null}
      {actionLabel ? (
        <TouchableOpacity
          onPress={onAction}
          className="mt-5 rounded-2xl bg-cyan-500 px-5 py-3"
        >
          <Text className="text-slate-950 font-black">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
