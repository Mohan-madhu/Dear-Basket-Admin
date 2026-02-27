import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export default function NoInternetScreen({ onRetry }) {
  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
      return;
    }
    await NetInfo.fetch();
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-black mb-2">No Internet Connection</Text>
      <Text className="text-gray-600 text-center mb-6">
        Please check your connection and try again.
      </Text>
      <TouchableOpacity
        onPress={handleRetry}
        className="bg-black px-6 py-3 rounded-full"
      >
        <Text className="text-white font-semibold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}
