import React, { use, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import Storage from "../../App_Utils/Services/StorageService";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../App_Utils/Services/APIService";

export default function UserDashboard({ navigation }) {
  const [ROLE, setROLE] = useState(null);
  const [userID, setUserID] = useState(null);

  const getRole = async () => {
    const role = await Storage.getData("ROLE");
    const userId = await Storage.getData("DATA");
    console.log(role);
    setROLE(role);
    setUserID(userId?.transid);

  };

  const handlePregnancyApplication = async () => {
    if (!userID) {
      await getRole()
    }

    const res = await API.GET(`PregnancyApplication/check-is-user-booked/${userID}`);
    console.log("User ID:", `PregnancyApplication/check-is-user-booked/${userID}`);
    console.log("Check Booking Response:", res.Response.length);

    if(res.Response.length > 0) {
      navigation.navigate("PregnancyApplications");
    } else {
      Alert.alert(
        "No Booking Found",
        "You need to have a Active Daily Milk Booking to apply for pregnancy benefits. Please contact support for assistance.",
        [{ text: "OK" }]
      );
    }
    //navigation.navigate("PregnancyApplications")
  };

  useEffect(() => {
    getRole();
  }, []);

  return (
    <View className="flex-1 bg-neutral-50 p-5">
      <Text className="text-3xl font-bold text-gray-900 mb-4">
        👋 Welcome {ROLE}
      </Text>

      {/* My Profile Card */}
      <View className="bg-white p-4 rounded-xl mb-4">
        <Text className="text-lg text-emerald-500 mb-2">My Profile</Text>
        <Text className="text-gray-500">
          View or update your personal details.
        </Text>
      </View>

      {/* My Activity Card */}
      <View className="bg-white p-4 rounded-xl mb-4">
        <Text className="text-lg text-emerald-500 mb-2">My Activity</Text>
        <Text className="text-gray-500">
          See your usage history and stats.
        </Text>
      </View>

      {/* My Favorites Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate("FavoritesScreen")}
        className="bg-white p-4 rounded-xl mb-4 flex-row items-center border-l-4 border-pink-500"
        activeOpacity={0.8}
      >
        <Ionicons
          name="heart"
          size={24}
          color="#EC4899"
          className="mr-3"
        />
        <View>
          <Text className="text-lg text-pink-500 mb-1">My Favorites</Text>
          <Text className="text-gray-500">View your saved favorite items</Text>
        </View>
      </TouchableOpacity>

      {/* NEW: Pregnancy Application Button */}
      <TouchableOpacity
        onPress={handlePregnancyApplication}
        className="bg-white p-4 rounded-xl mb-4 flex-row items-center border-l-4 border-purple-500"
        activeOpacity={0.8}
      >
        <Ionicons
          name="woman"
          size={24}
          color="#8B5CF6"
          className="mr-3"
        />
        <View>
          <Text className="text-lg text-purple-500 mb-1">Pregnancy Benefits Application</Text>
          <Text className="text-gray-500">Apply for daily milk benefits during pregnancy</Text>
        </View>
      </TouchableOpacity>

      {/* Raise Ticket Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate("RaiseTicket")}
        className="mt-2 bg-emerald-500 py-3.5 rounded-lg"
        activeOpacity={0.8}
      >
        <Text className="text-white text-center font-bold text-base">
          🛠️ Raise a Ticket
        </Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        onPress={() => {
          Storage.removeData("USER");
          Storage.removeData("ROLE");
          Storage.removeData("DATA");
          navigation.navigate("Login");
        }}
        className="mt-8"
      >
        <Text className="text-red-500 text-center font-semibold">
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}