import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API, getUserFacingErrorMessage } from "../../../App_Utils/Services/APIService";
import { useLoading } from "../../../App_Utils/Contexts/LoadingContext";
import LocationService from "../../../App_Utils/Services/LocationService";
import FormInput from "./components/FormInput";
import RegistrationIntroCard from "./components/RegistrationIntroCard";

const formatDateForApi = (date) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DailyMilkRegistrationForm({ userData, onRegistered }) {
  const { setLoading } = useLoading();
  const [name, setName] = useState(userData?.name || "");
  const [dob, setDob] = useState(userData?.dob || "");
  const [address, setAddress] = useState(userData?.deliveryaddress || userData?.address || "");
  const [mobile, setMobile] = useState(userData?.mobile || "");
  const [latitude, setLatitude] = useState(userData?.latitude || "");
  const [longitude, setLongitude] = useState(userData?.longitude || "");
  const [familymembers, setFamilyMembers] = useState("");

  useEffect(() => {
    setName(userData?.name || "");
    setDob(userData?.dob || "");
    setAddress(userData?.deliveryaddress || userData?.address || "");
    setMobile(userData?.mobile || "");
    setLatitude(userData?.latitude || "");
    setLongitude(userData?.longitude || "");
  }, [userData?.transid]);

  const fetchLocation = async () => {
    try {
      await LocationService({
        setLoading,
        setLatitude,
        setLongitude,
        setAddress,
      });
    } catch (error) {
      console.error("DailyMilkRegistrationForm location error:", error);
      setLoading(false);
      Alert.alert("Location", "Unable to fetch location right now.");
    }
  };

  const submit = async () => {
    if (!userData?.transid) {
      Alert.alert("Session Error", "Please login again.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Validation", "Name is required.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Validation", "Address is required.");
      return;
    }
    if (!mobile.trim()) {
      Alert.alert("Validation", "Mobile number is required.");
      return;
    }

    const payload = {
      userid: userData.transid,
      name: name.trim(),
      dob: formatDateForApi(dob),
      address: address.trim(),
      mobile: mobile.trim(),
      latitude: String(latitude || ""),
      longitude: String(longitude || ""),
      status: 1,
      familymembers: parseInt(familymembers, 10) || 0,
      rcu: "SELF",
    };

    setLoading(true, "Submitting Daily Milk Registration...");
    try {
      await API.POST("DailyMilkRegistration", payload);
      Alert.alert("Done", "Daily Milk registration saved successfully.", [
        {
          text: "OK",
          onPress: () => {
            if (typeof onRegistered === "function") onRegistered();
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Error",
        getUserFacingErrorMessage(error, "Failed to save registration.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-950"
    >
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 44 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <RegistrationIntroCard />

        <FormInput label="Name" value={name} onChangeText={setName} placeholder="Customer name" />
        <FormInput label="Date of Birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
        <FormInput label="Mobile" value={mobile} onChangeText={setMobile} placeholder="Mobile number" keyboardType="phone-pad" />
        <FormInput label="Address" value={address} onChangeText={setAddress} placeholder="Delivery address" multiline />
        <FormInput label="Family Members" value={familymembers} onChangeText={setFamilyMembers} placeholder="0" keyboardType="numeric" />

        <View className="flex-row mb-4">
          <View className="flex-1 mr-2">
            <FormInput label="Latitude" value={String(latitude || "")} onChangeText={setLatitude} placeholder="Latitude" keyboardType="numeric" />
          </View>
          <View className="flex-1 ml-2">
            <FormInput label="Longitude" value={String(longitude || "")} onChangeText={setLongitude} placeholder="Longitude" keyboardType="numeric" />
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={fetchLocation}
          className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-4 flex-row items-center justify-center mb-3"
        >
          <Ionicons name="locate-outline" size={18} color="#22d3ee" />
          <Text className="text-cyan-200 font-bold ml-2">Use Current Location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={submit}
          className="rounded-2xl bg-cyan-500 px-4 py-4 items-center"
        >
          <Text className="text-slate-950 font-black text-base">
            Submit Registration
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
