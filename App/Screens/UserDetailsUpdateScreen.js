import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import Storage from "../../App_Utils/Services/StorageService";
import { API } from "../../App_Utils/Services/APIService";
import Toaster from "../../App_Utils/Services/ToastService";
import LocationService from "../../App_Utils/Services/LocationService";

const editableKeys = [
  "name",
  "mobile",
  "latitude",
  "longitude",
  "deliveryaddress",
  "deliverycity",
  "deliverystate",
  "deliverypincode",
  "familymembers",
];

const labelMap = {
  name: "Name",
  mobile: "Mobile",
  latitude: "Latitude",
  longitude: "Longitude",
  deliveryaddress: "Delivery Address",
  deliverycity: "Delivery City",
  deliverystate: "Delivery State",
  deliverypincode: "Delivery Pincode",
  familymembers: "Family Members",
};

const normalize = (val) => (val === null || val === undefined ? "" : String(val));

export default function UserDetailsUpdateScreen({ navigation }) {
  const { setLoading } = useLoading();
  const [userid, setUserid] = useState("");
  const [registrationid, setRegistrationid] = useState("");
  const [mappedpartnerid, setMappedpartnerid] = useState("");
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    latitude: "",
    longitude: "",
    deliveryaddress: "",
    deliverycity: "",
    deliverystate: "",
    deliverypincode: "",
    familymembers: "",
  });

  const getUserDetailsFromApi = async (id) => {
    try {
      return await API.GET(`user/user-details/${id}`);
    } catch {
      return await API.GET(`USER/user-details/${id}`);
    }
  };

  const updateUserDetailsInApi = async (payload) => {
    try {
      return await API.PUT("user/user-details", payload);
    } catch {
      return await API.PUT("USER/user-details", payload);
    }
  };

  const fetchUserDetails = async () => {
    try {
      setLoading(true, "Loading your details...");
      const data = await Storage.getData("DATA");
      const id = data?.transid || (await Storage.getData("USERID"));

      if (!id) {
        Alert.alert("Error", "User ID not found. Please login again.");
        navigation.goBack();
        return;
      }

      const res = await getUserDetailsFromApi(id);
      const user = res?.Response?.[0];

      if (!user) {
        Alert.alert("Error", "No user details found.");
        return;
      }

      setUserid(normalize(user.userid));
      setRegistrationid(normalize(user.registrationid));
      setMappedpartnerid(normalize(user.mappedpartnerid));
      setForm({
        name: normalize(user.name),
        mobile: normalize(user.mobile),
        latitude: normalize(user.latitude),
        longitude: normalize(user.longitude),
        deliveryaddress: normalize(user.deliveryaddress),
        deliverycity: normalize(user.deliverycity),
        deliverystate: normalize(user.deliverystate),
        deliverypincode: normalize(user.deliverypincode),
        familymembers: normalize(user.familymembers),
      });
    } catch (error) {
      console.error("Fetch user details error:", error);
      Alert.alert("Error", error?.message || "Failed to fetch user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!userid) return "User ID is missing.";
    if (!form.name.trim()) return "Name is required.";
    if (!form.mobile.trim()) return "Mobile is required.";
    if (!/^\d{10}$/.test(form.mobile.trim())) return "Mobile must be 10 digits.";
    if (!form.deliveryaddress.trim()) return "Delivery address is required.";
    if (!form.deliverycity.trim()) return "Delivery city is required.";
    if (!form.deliverystate.trim()) return "Delivery state is required.";
    if (!form.deliverypincode.trim()) return "Delivery pincode is required.";
    if (!/^\d{6}$/.test(form.deliverypincode.trim())) return "Pincode must be 6 digits.";
    if (form.familymembers && isNaN(Number(form.familymembers))) {
      return "Family members must be a number.";
    }
    return null;
  };

  const handleUpdate = async () => {
    const errorMessage = validate();
    if (errorMessage) {
      Alert.alert("Validation Error", errorMessage);
      return;
    }

    try {
      setLoading(true, "Updating details...");
      const actor = await Storage.getData("DATA");

      const payload = {
        userid,
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        latitude: form.latitude.trim(),
        longitude: form.longitude.trim(),
        deliveryaddress: form.deliveryaddress.trim(),
        deliverycity: form.deliverycity.trim(),
        deliverystate: form.deliverystate.trim(),
        deliverypincode: form.deliverypincode.trim(),
        familymembers: Number(form.familymembers || 0),
        luu: actor?.transid || actor?.name || userid,
      };

      const res = await updateUserDetailsInApi(payload);

      const existing = (await Storage.getData("DATA")) || {};
      const merged = {
        ...existing,
        name: payload.name,
        mobile: payload.mobile,
        latitude: payload.latitude,
        longitude: payload.longitude,
        deliveryaddress: payload.deliveryaddress,
        deliverycity: payload.deliverycity,
        deliverystate: payload.deliverystate,
        deliverypincode: payload.deliverypincode,
        familymembers: String(payload.familymembers),
      };
      await Storage.storeData("DATA", merged);
      await Storage.storeData("USER", payload.name);

      Toaster.successtop(res?.Message || "User details updated successfully");
      Alert.alert("Success", "Your details were updated successfully.");
    } catch (error) {
      console.error("Update user details error:", error);
      Alert.alert("Error", error?.message || "Failed to update user details");
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      await LocationService({
        setLoading,
        setLatitude: (val) => setField("latitude", val),
        setLongitude: (val) => setField("longitude", val),
      });
    } catch (error) {
      console.error("Location fetch error:", error);
      Alert.alert("Error", "Failed to fetch current location");
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-5 pt-5 pb-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
              <Ionicons name="person-circle-outline" size={22} color="#2563EB" />
            </View>
            <View>
              <Text className="text-xl font-bold text-gray-900">Update Profile</Text>
              <Text className="text-gray-500 text-xs mt-1">Edit delivery and contact details</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={fetchUserDetails}
            className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100"
          >
            <Text className="text-blue-700 font-semibold text-xs">Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <Text className="text-sm text-gray-500 mb-2">User ID (Read Only)</Text>
          <TextInput
            value={userid}
            editable={false}
            className="border border-gray-200 bg-gray-100 rounded-xl px-4 py-3 text-gray-600"
          />

          <View className="flex-row mt-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-500 mb-1">Registration ID</Text>
              <TextInput
                value={registrationid}
                editable={false}
                className="border border-gray-200 bg-gray-100 rounded-xl px-3 py-2 text-gray-600"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs text-gray-500 mb-1">Mapped Partner</Text>
              <TextInput
                value={mappedpartnerid}
                editable={false}
                className="border border-gray-200 bg-gray-100 rounded-xl px-3 py-2 text-gray-600"
              />
            </View>
          </View>
        </View>

        <View className="bg-white rounded-2xl border border-gray-200 p-4">
          <TouchableOpacity
            onPress={handleUseCurrentLocation}
            activeOpacity={0.85}
            className="mb-4 bg-indigo-600 rounded-xl py-3 px-4 flex-row items-center justify-center"
          >
            <Ionicons name="locate-outline" size={18} color="#fff" />
            <Text className="text-white font-bold ml-2">Use Current GPS Location</Text>
          </TouchableOpacity>

          {editableKeys.map((key) => {
            const isNumeric =
              key === "mobile" ||
              key === "latitude" ||
              key === "longitude" ||
              key === "deliverypincode" ||
              key === "familymembers";
            const keyboardType =
              key === "latitude" || key === "longitude"
                ? "decimal-pad"
                : isNumeric
                ? "number-pad"
                : "default";

            return (
              <View key={key} className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {labelMap[key]}
                </Text>
                <TextInput
                  value={form[key]}
                  onChangeText={(val) => setField(key, val)}
                  keyboardType={keyboardType}
                  multiline={key === "deliveryaddress"}
                  numberOfLines={key === "deliveryaddress" ? 3 : 1}
                  textAlignVertical={key === "deliveryaddress" ? "top" : "center"}
                  className={`border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white ${
                    key === "deliveryaddress" ? "min-h-[96px]" : ""
                  }`}
                  placeholder={`Enter ${labelMap[key].toLowerCase()}`}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleUpdate}
          className="mt-5 bg-blue-600 py-4 rounded-xl"
          activeOpacity={0.85}
        >
          <Text className="text-white text-center font-bold text-base">Update Details</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
