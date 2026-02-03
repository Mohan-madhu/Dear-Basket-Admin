import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function EachOrderDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const { details } = route.params; // passed from CategoryPickerScreen

  return (
    <ScrollView className="flex-1 bg-white p-6">
      <Text className="text-2xl font-bold mb-6 text-center">Details</Text>

      {details && Object.entries(details).length > 0 ? (
        Object.entries(details).map(([key, value]) => (
          <View key={key} className="mb-4">
            <Text className="text-lg font-medium">{key}</Text>
            <Text className="text-base text-gray-700">{String(value)}</Text>
          </View>
        ))
      ) : (
        <Text className="text-center text-gray-500">No details available.</Text>
      )}

      <Pressable
        onPress={() => navigation.goBack()}
        className="mt-8 bg-gray-300 py-3 rounded-lg items-center"
      >
        <Text className="text-gray-800 text-lg">Close</Text>
      </Pressable>
    </ScrollView>
  );
}
