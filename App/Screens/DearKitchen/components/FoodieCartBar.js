import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function FoodieCartBar({ count, total }) {
  if (count <= 0) return null;

  return (
    <View className="absolute bottom-3 left-4 right-4 min-h-16 flex-row items-center justify-between rounded-lg bg-slate-900 px-4 py-2.5">
      <View>
        <Text className="text-[15px] font-extrabold text-white">
          {count} items added
        </Text>
        <Text className="mt-0.5 text-slate-300">
          Estimated total: Rs. {total}
        </Text>
      </View>
      <TouchableOpacity className="rounded-lg bg-orange-500 px-4 py-2.5">
        <Text className="font-extrabold text-white">Review</Text>
      </TouchableOpacity>
    </View>
  );
}
