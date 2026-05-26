import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function DearFoodieHeader({ query, setQuery }) {
  return (
    <LinearGradient
      colors={["#fff7ed", "#ffffff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="px-4 py-2"
    >
      <View className="min-h-12 flex-row items-center rounded-xl border border-orange-200 bg-white px-3.5">
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sweets, snacks, meals..."
          placeholderTextColor="#94a3b8"
          className="ml-2.5 flex-1 py-2.5 text-[15px] text-slate-900"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
        {!query ? (
          <View className="ml-2 flex-row items-center rounded-full bg-orange-100 px-2 py-1">
            <Ionicons name="fast-food" size={12} color="#ea580c" />
            <Text className="ml-1 text-[10px] font-extrabold uppercase text-orange-700">
              Curated
            </Text>
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}
