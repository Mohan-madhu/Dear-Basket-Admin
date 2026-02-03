import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Storage from "../../App_Utils/Services/StorageService";

const colors = {
  background: "#F9FAFB",
  text: "#111827",
  card: "#FFFFFF",
  accent: "#10B981",
  muted: "#6B7280",
  danger: "#EF4444",
};

export default function UserDashboard({ navigation }) {
  const [ROLE, setROLE] = useState(null);

  const getRole = async () => {
    const role = await Storage.getData("ROLE");
    console.log(role);
    setROLE(role);
  };

  useEffect(() => {
    getRole();
  }, []);

  return (
    <View
      className="mt-3"
      style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          color: colors.text,
          marginBottom: 16,
        }}
      >
        👋 Welcome {ROLE}
      </Text>

      <View
        style={{
          backgroundColor: colors.card,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 18, color: colors.accent, marginBottom: 8 }}>
          My Profile
        </Text>
        <Text style={{ color: colors.muted }}>
          View or update your personal details.
        </Text>
      </View>

      <View
        style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12 }}
      >
        <Text style={{ fontSize: 18, color: colors.accent, marginBottom: 8 }}>
          My Activity
        </Text>
        <Text style={{ color: colors.muted }}>
          See your usage history and stats.
        </Text>
      </View>

      {/* NEW: Raise Ticket Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate("RaiseTicket")}
        style={{
          marginTop: 24,
          backgroundColor: colors.accent,
          paddingVertical: 14,
          borderRadius: 10,
        }}
        activeOpacity={0.8}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          🛠️ Raise a Ticket
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          Storage.removeData("USER");
          Storage.removeData("ROLE");
          Storage.removeData("DATA");
          navigation.navigate("Login");
        }}
        style={{ marginTop: 32 }}
      >
        <Text style={{ color: colors.danger, textAlign: "center", fontWeight: "600" }}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}
