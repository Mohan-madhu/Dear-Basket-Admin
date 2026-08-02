import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ActionTile({
  icon,
  title,
  subtitle,
  accentColor,
  onPress,
  disabled,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={disabled}
      onPress={onPress}
      className={`rounded-3xl border px-4 py-4 mb-3 flex-row items-center ${
        disabled ? "border-slate-800 bg-slate-900/60" : "border-slate-700 bg-slate-900"
      }`}
    >
      <View
        className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
        style={{ backgroundColor: `${accentColor}22` }}
      >
        <Ionicons
          name={icon}
          size={24}
          color={disabled ? "#64748b" : accentColor}
        />
      </View>
      <View className="flex-1">
        <Text className={`text-base font-black ${disabled ? "text-slate-500" : "text-white"}`}>
          {title}
        </Text>
        <Text className={`text-xs mt-1 leading-4 ${disabled ? "text-slate-600" : "text-slate-400"}`}>
          {subtitle}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={disabled ? "#475569" : accentColor}
      />
    </TouchableOpacity>
  );
}
