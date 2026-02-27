import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function ErrorScreen({ error, onRetry }) {
  const message = error?.message || "Something went wrong.";

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-black mb-2">App Error</Text>
      <Text className="text-gray-600 text-center mb-6">{message}</Text>
      <TouchableOpacity
        onPress={onRetry}
        className="bg-black px-6 py-3 rounded-full"
      >
        <Text className="text-white font-semibold">Reload</Text>
      </TouchableOpacity>
    </View>
  );
}
