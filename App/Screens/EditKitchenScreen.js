import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { DearKitchenAPI } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import Toaster from "../../App_Utils/Services/ToastService";

const getAdminId = async () => {
  const data = await Storage.getData("DATA");
  const userId = await Storage.getData("USERID");
  const user = await Storage.getData("USER");
  return data?.transid || userId || user || "ADMIN";
};

const getKitchenId = (item) => item?.kitchenid || item?.transid || item?.id || "";
const shortKitchenId = (id) => {
  const value = String(id || "");
  return value ? `#${value.slice(-5).toUpperCase()}` : "#-----";
};

const toText = (value) => (value === null || value === undefined ? "" : String(value));
const toFlag = (value) => (Number(value || 0) === 1 ? 1 : 0);
const cookGenderOptions = ["Male", "Female", "Other"];

const buildFormFromKitchen = (kitchen = {}) => ({
  kitchenid: getKitchenId(kitchen),
  partneruserid: toText(kitchen.partneruserid),
  kitchenname: toText(kitchen.kitchenname),
  description: toText(kitchen.description),
  cuisinetype: toText(kitchen.cuisinetype),
  cookgender: toText(kitchen.cookgender),
  fssainumber: toText(kitchen.fssainumber),
  profileimage: toText(kitchen.profileimage),
  coverimage: toText(kitchen.coverimage),
  address: toText(kitchen.address || kitchen.addressline1),
  city: toText(kitchen.city),
  state: toText(kitchen.state),
  pincode: toText(kitchen.pincode),
  latitude: toText(kitchen.latitude),
  longitude: toText(kitchen.longitude),
  ishalal: toFlag(kitchen.ishalal),
  ispureveg: toFlag(kitchen.ispureveg),
  isactive: toFlag(kitchen.isactive),
  isapproved: toFlag(kitchen.isapproved),
  isopen: toFlag(kitchen.isopen),
  allowprebooking: toFlag(kitchen.allowprebooking),
  rating: toText(kitchen.rating ?? "0"),
  totalorders: toText(kitchen.totalorders ?? "0"),
  payoutaccountname: toText(kitchen.payoutaccountname),
  payoutgpaynumber: toText(kitchen.payoutgpaynumber),
  payoutbankname: toText(kitchen.payoutbankname),
  payoutaccountnumber: toText(kitchen.payoutaccountnumber),
  payoutifsc: toText(kitchen.payoutifsc),
  rcu: toText(kitchen.rcu),
  rcm: toText(kitchen.rcm),
  luu: toText(kitchen.luu),
  lum: toText(kitchen.lum),
});

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  editable = true,
}) => (
  <View className="mb-4">
    <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      multiline={multiline}
      editable={editable}
      numberOfLines={multiline ? 4 : 1}
      textAlignVertical={multiline ? "top" : "center"}
      placeholderTextColor="#9ca3af"
      className={`border border-gray-300 rounded-xl px-3 text-base ${
        editable ? "bg-white text-gray-900" : "bg-gray-100 text-gray-500"
      } ${multiline ? "py-3 min-h-[96px]" : "py-4"}`}
    />
  </View>
);

const ToggleRow = ({ label, value, onPress, activeText = "Yes", inactiveText = "No" }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    className="flex-row items-center justify-between border border-gray-200 rounded-xl px-3 py-3 mb-3 bg-white"
  >
    <View>
      <Text className="text-sm font-bold text-gray-800">{label}</Text>
      <Text className={`text-xs mt-1 ${value ? "text-green-700" : "text-gray-500"}`}>
        {value ? activeText : inactiveText}
      </Text>
    </View>
    <Icon
      name={value ? "toggle-on" : "toggle-off"}
      size={34}
      color={value ? "#16a34a" : "#9ca3af"}
    />
  </TouchableOpacity>
);

const ChoiceChip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
      selected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
    }`}
  >
    <Text className={`text-xs font-bold ${selected ? "text-white" : "text-gray-700"}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

const EditKitchenScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { setLoading } = useLoading();
  const [form, setForm] = useState(buildFormFromKitchen(route.params?.kitchen));
  const savingRef = useRef(false);
  const kitchenid = getKitchenId(route.params?.kitchen);

  useEffect(() => {
    setForm(buildFormFromKitchen(route.params?.kitchen));
  }, [route.params?.kitchen]);

  useEffect(() => {
    const fetchKitchenDetails = async () => {
      if (!kitchenid) return;

      try {
        setLoading(true, "Fetching kitchen details...");
        const res = await DearKitchenAPI.GET(`Kitchens/${kitchenid}`);
        const kitchen = Array.isArray(res?.Response) ? res.Response[0] : res?.Response;
        if (kitchen) {
          setForm(buildFormFromKitchen(kitchen));
        }
      } catch (error) {
        console.error("EditKitchen detail fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchKitchenDetails();
  }, [kitchenid]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!form.kitchenid) return "Kitchen id is missing.";
    if (!form.kitchenname.trim()) return "Kitchen name is required.";
    if (!form.address.trim()) return "Address is required.";
    if (!form.city.trim()) return "City is required.";
    if (!form.state.trim()) return "State is required.";
    if (!form.pincode.trim()) return "Pincode is required.";
    return null;
  };

  const handleSubmit = async () => {
    if (savingRef.current) return;

    const validationMessage = validateForm();
    if (validationMessage) {
      Toaster.errortop("Validation", validationMessage);
      return;
    }

    try {
      savingRef.current = true;
      setLoading(true, "Updating kitchen...");
      const adminId = await getAdminId();

      await DearKitchenAPI.PUT("Kitchens", {
        kitchenid: form.kitchenid,
        kitchenname: form.kitchenname.trim(),
        description: form.description.trim(),
        cuisinetype: form.cuisinetype.trim(),
        cookgender: form.cookgender.trim(),
        fssainumber: form.fssainumber.trim(),
        profileimage: form.profileimage.trim(),
        coverimage: form.coverimage.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        latitude: form.latitude.trim(),
        longitude: form.longitude.trim(),
        ishalal: form.ishalal ? 1 : 0,
        ispureveg: form.ispureveg ? 1 : 0,
        isactive: form.isactive ? 1 : 0,
        isapproved: form.isapproved ? 1 : 0,
        isopen: form.isopen ? 1 : 0,
        allowprebooking: form.allowprebooking ? 1 : 0,
        rating: Number(form.rating || 0),
        totalorders: Number(form.totalorders || 0),
        payoutaccountname: form.payoutaccountname.trim(),
        payoutgpaynumber: form.payoutgpaynumber.trim(),
        payoutbankname: form.payoutbankname.trim(),
        payoutaccountnumber: form.payoutaccountnumber.trim(),
        payoutifsc: form.payoutifsc.trim(),
        luu: adminId,
      });

      Toaster.successtop("Kitchen updated");
      navigation.goBack();
    } catch (error) {
      console.error("EditKitchen error:", error);
      Alert.alert("Error", error?.message || "Failed to update kitchen.");
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="mx-4 mt-5 mb-4 bg-white rounded-2xl border border-gray-200 p-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
            >
              <Icon name="arrow-back" size={20} color="#111827" />
            </TouchableOpacity>
          <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">Edit Kitchen</Text>
              <Text className="text-sm text-gray-500 mt-1">
                Partner {form.partneruserid || "-"} • {shortKitchenId(form.kitchenid)}
              </Text>
            </View>
          </View>
        </View>

        <View className="mx-4 mb-4 bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-base font-bold text-gray-900 mb-4">Kitchen Profile</Text>
          <Field label="Partner User ID" value={form.partneruserid} onChangeText={() => {}} editable={false} />
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Kitchen Code</Text>
            <View className="self-start bg-gray-100 border border-gray-200 rounded-full px-3 py-1.5">
              <Text className="text-xs font-extrabold text-gray-700">{shortKitchenId(form.kitchenid)}</Text>
            </View>
          </View>
          <Field label="Kitchen Name *" value={form.kitchenname} onChangeText={(v) => updateForm("kitchenname", v)} placeholder="Kitchen name" />
          <Field label="Cuisine Type" value={form.cuisinetype} onChangeText={(v) => updateForm("cuisinetype", v)} placeholder="Cuisine type" />
          <Text className="text-sm font-semibold text-gray-700 mb-2">Cook Gender</Text>
          <View className="flex-row flex-wrap mb-3">
            {cookGenderOptions.map((gender) => (
              <ChoiceChip
                key={gender}
                label={gender}
                selected={form.cookgender === gender}
                onPress={() => updateForm("cookgender", form.cookgender === gender ? "" : gender)}
              />
            ))}
          </View>
          <Field label="FSSAI Number" value={form.fssainumber} onChangeText={(v) => updateForm("fssainumber", v)} placeholder="FSSAI number" />
          <Field label="Description" value={form.description} onChangeText={(v) => updateForm("description", v)} placeholder="Description" multiline />
          <Field label="Profile Image" value={form.profileimage} onChangeText={(v) => updateForm("profileimage", v)} placeholder="Profile image path" />
          <Field label="Cover Image" value={form.coverimage} onChangeText={(v) => updateForm("coverimage", v)} placeholder="Cover image path" />
          <Field label="Rating" value={form.rating} onChangeText={(v) => updateForm("rating", v)} placeholder="Rating" keyboardType="decimal-pad" />
          <Field label="Total Orders" value={form.totalorders} onChangeText={(v) => updateForm("totalorders", v.replace(/[^0-9]/g, ""))} placeholder="Total orders" keyboardType="number-pad" />
        </View>

        <View className="mx-4 mb-4 bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-base font-bold text-gray-900 mb-4">Address</Text>
          <Field label="Address *" value={form.address} onChangeText={(v) => updateForm("address", v)} placeholder="Address" multiline />
          <Field label="City *" value={form.city} onChangeText={(v) => updateForm("city", v)} placeholder="City" />
          <Field label="State *" value={form.state} onChangeText={(v) => updateForm("state", v)} placeholder="State" />
          <Field label="Pincode *" value={form.pincode} onChangeText={(v) => updateForm("pincode", v.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="Pincode" keyboardType="number-pad" />
          <Field label="Latitude" value={form.latitude} onChangeText={(v) => updateForm("latitude", v)} placeholder="Latitude" keyboardType="decimal-pad" />
          <Field label="Longitude" value={form.longitude} onChangeText={(v) => updateForm("longitude", v)} placeholder="Longitude" keyboardType="decimal-pad" />
        </View>

        <View className="mx-4 mb-4 bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-base font-bold text-gray-900 mb-4">Flags</Text>
          <ToggleRow label="Halal" value={form.ishalal === 1} onPress={() => updateForm("ishalal", form.ishalal ? 0 : 1)} />
          <ToggleRow label="Pure Veg" value={form.ispureveg === 1} onPress={() => updateForm("ispureveg", form.ispureveg ? 0 : 1)} />
          <ToggleRow label="Active" value={form.isactive === 1} onPress={() => updateForm("isactive", form.isactive ? 0 : 1)} activeText="Active" inactiveText="Inactive" />
          <ToggleRow label="Approved" value={form.isapproved === 1} onPress={() => updateForm("isapproved", form.isapproved ? 0 : 1)} activeText="Approved" inactiveText="Suspended" />
          <ToggleRow label="Open" value={form.isopen === 1} onPress={() => updateForm("isopen", form.isopen ? 0 : 1)} activeText="Open" inactiveText="Closed" />
          <ToggleRow label="Allow Prebooking" value={form.allowprebooking === 1} onPress={() => updateForm("allowprebooking", form.allowprebooking ? 0 : 1)} activeText="Allowed" inactiveText="Disabled" />
        </View>

        <View className="mx-4 mb-4 bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-base font-bold text-gray-900 mb-4">Payout Details</Text>
          <Field label="Account Name" value={form.payoutaccountname} onChangeText={(v) => updateForm("payoutaccountname", v)} placeholder="Account holder name" />
          <Field label="GPay Number" value={form.payoutgpaynumber} onChangeText={(v) => updateForm("payoutgpaynumber", v)} placeholder="GPay number" keyboardType="phone-pad" />
          <Field label="Bank Name" value={form.payoutbankname} onChangeText={(v) => updateForm("payoutbankname", v)} placeholder="Bank name" />
          <Field label="Account Number" value={form.payoutaccountnumber} onChangeText={(v) => updateForm("payoutaccountnumber", v)} placeholder="Account number" keyboardType="number-pad" />
          <Field label="IFSC" value={form.payoutifsc} onChangeText={(v) => updateForm("payoutifsc", v.toUpperCase())} placeholder="IFSC code" />
        </View>

        <View className="mx-4 mb-4 bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-base font-bold text-gray-900 mb-4">Audit Details</Text>
          <Field label="Created By" value={form.rcu} onChangeText={() => {}} editable={false} />
          <Field label="Created Time" value={form.rcm} onChangeText={() => {}} editable={false} />
          <Field label="Last Updated By" value={form.luu} onChangeText={() => {}} editable={false} />
          <Field label="Last Updated Time" value={form.lum} onChangeText={() => {}} editable={false} />
        </View>

        <View className="mx-4">
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.9}
            className="bg-blue-600 rounded-xl py-4 items-center justify-center"
          >
            <View className="flex-row items-center">
              <Icon name="save" size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">Update Kitchen</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditKitchenScreen;
