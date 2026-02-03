import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Storage from "../../App_Utils/Services/StorageService";
import PartnerMilkOrderList from "./PartnerMilkOrderList";
const colors = {
  background: "#F9FAFB",
  text: "#111827",
  card: "#FFFFFF",
  accent: "#F59E0B",
  muted: "#6B7280",
};

export default function PartnerDashboard({ navigation }) {
  const [ROLE, setROLE] = useState(null);
  const getRole = async () => {
    var ROLE = await Storage.getData("ROLE");
    console.log(ROLE);
    setROLE(ROLE);
  };

  useEffect(() => {
    getRole();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {ROLE === "USER" ? (
        <View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            🤝 Partner Dashboard
          </Text>

          <View
            style={{
              backgroundColor: colors.card,
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text
              style={{ fontSize: 18, color: colors.accent, marginBottom: 8 }}
            >
              My Listings
            </Text>
            <Text style={{ color: colors.muted }}>
              Manage your products and services.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              padding: 16,
              borderRadius: 12,
            }}
          >
            <Text
              style={{ fontSize: 18, color: colors.accent, marginBottom: 8 }}
            >
              Earnings
            </Text>
            <Text style={{ color: colors.muted }}>
              Track your revenue and payments.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              Storage.removeData("USER");
              Storage.removeData("ROLE");
              Storage.removeData("DATA");
              navigation.navigate("Login");
            }}
            style={{ marginTop: 32 }}
          >
            <Text
              style={{ color: "red", textAlign: "center", fontWeight: "600" }}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PartnerMilkOrderList />
      )}
    </View>
  );
}
