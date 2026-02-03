import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import SidebarScreen from "./SideBarForHomeScreen";

const colors = {
  background: "#F9FAFB",
  text: "#111827",
  card: "#FFFFFF",
  accent: "#2563EB",
  muted: "#6B7280",
};

export default function AdminDashboard({ navigation, data }) {

  return (
    <View className="bg-green-600">
      <SidebarScreen data={data} />
    </View>
  );
}
