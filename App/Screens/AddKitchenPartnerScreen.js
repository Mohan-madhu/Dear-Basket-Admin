import React, { useRef, useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { API, DearKitchenAPI, getUserFacingErrorMessage } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import Toaster from "../../App_Utils/Services/ToastService";

const emptyForm = {
  name: "",
  mobile: "",
  password: "",
  address: "",
  city: "",
  state: "Tamil Nadu",
  pincode: "",
  kitchenname: "",
  cookgender: "",
};

const cookGenderOptions = ["Male", "Female", "Other"];

const getAdminId = async () => {
  const data = await Storage.getData("DATA");
  const userId = await Storage.getData("USERID");
  const user = await Storage.getData("USER");
  return data?.transid || userId || user || "ADMIN";
};

const pickReturnedId = (res) =>
  res?.UserId ||
  res?.userid ||
  res?.userId ||
  res?.Response?.[0]?.transid ||
  res?.Response?.[0]?.userid ||
  res?.Response?.[0]?.id ||
  res?.Response?.transid ||
  res?.Response?.userid ||
  res?.Response?.id ||
  res?.transid ||
  res?.userid ||
  res?.id ||
  null;

const normalizeMobile = (value) => String(value || "").replace(/[^0-9]/g, "");

const findCreatedKitchenPartnerId = async (mobile) => {
  const usersRes = await API.GET("User");
  const users = Array.isArray(usersRes?.Response) ? usersRes.Response : [];
  const targetMobile = normalizeMobile(mobile);
  const mobileMatches = users.filter((item) => {
    const itemMobile = normalizeMobile(item?.mobile);
    return (
      itemMobile === targetMobile ||
      itemMobile.endsWith(targetMobile) ||
      targetMobile.endsWith(itemMobile)
    );
  });

  const createdUser =
    mobileMatches.find((item) => {
    const userType = String(item?.usertype || "").trim().toLowerCase();
      return userType.includes("kitchen");
    }) || mobileMatches[0];

  return createdUser?.transid || createdUser?.userid || createdUser?.id || null;
};

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  multiline = false,
  rightElement,
}) => (
  <View className="mb-4">
    <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>
    <View className="border border-gray-300 rounded-xl bg-white px-3 flex-row items-center">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor="#9ca3af"
        className={`flex-1 text-base text-gray-900 ${
          multiline ? "py-3 min-h-[96px]" : "py-4"
        }`}
      />
      {rightElement}
    </View>
  </View>
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

const AddKitchenPartnerScreen = () => {
  const navigation = useNavigation();
  const { setLoading } = useLoading();
  const [form, setForm] = useState(emptyForm);
  const submittingRef = useRef(false);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Partner name is required.";
    if (!form.mobile.trim() || form.mobile.trim().length < 10) return "Valid mobile is required.";
    if (!form.password.trim()) return "Password is required.";
    if (!form.address.trim()) return "Address is required.";
    if (!form.city.trim()) return "City is required.";
    if (!form.state.trim()) return "State is required.";
    if (!form.pincode.trim()) return "Pincode is required.";
    if (!form.kitchenname.trim()) return "Kitchen name is required.";
    return null;
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;

    const validationMessage = validateForm();
    if (validationMessage) {
      Toaster.errortop("Validation", validationMessage);
      return;
    }

    try {
      submittingRef.current = true;
      setLoading(true, "Creating kitchen partner...");
      const adminId = await getAdminId();
      const mobile = form.mobile.trim();

      const signupPayload = {
        fullname: form.name.trim(),
        dob: "",
        profile: "No File Uploaded",
        mobile,
        username: mobile,
        password: form.password.trim(),
        address: form.address.trim(),
        usertype: "kitchenpartner",
        rcu: adminId,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      };

      const userRes = await API.POST("UserSignUp", signupPayload);
      console.log("Kitchen partner signup response:", userRes);
      const signupFailed =
        Number(userRes?.Status ?? 1) === 0 ||
        String(userRes?.Message || "").toLowerCase().includes("invalid");

      if (signupFailed) {
        throw new Error(userRes?.Message || "Failed to create partner login.");
      }

      const partnerUserId = pickReturnedId(userRes) || await findCreatedKitchenPartnerId(mobile);

      if (!partnerUserId) {
        throw new Error(
          userRes?.Message ||
            userRes?.message ||
            "Kitchen partner user id was not returned."
        );
      }

      await DearKitchenAPI.POST("Kitchens", {
        partneruserid: partnerUserId,
        kitchenname: form.kitchenname.trim(),
        description: "",
        cuisinetype: "",
        cookgender: form.cookgender.trim(),
        fssainumber: "",
        profileimage: "",
        coverimage: "",
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        latitude: "",
        longitude: "",
        ishalal: 0,
        ispureveg: 0,
        isactive: 1,
        isapproved: 1,
        isopen: 0,
        allowprebooking: 0,
        payoutaccountname: "",
        payoutgpaynumber: "",
        payoutbankname: "",
        payoutaccountnumber: "",
        payoutifsc: "",
        rcu: adminId,
      });

      Toaster.successtop("Kitchen partner created");
      navigation.goBack();
    } catch (error) {
      console.error("AddKitchenPartner error:", error);
      Alert.alert("Error", getUserFacingErrorMessage(error, "Failed to create kitchen partner."));
    } finally {
      submittingRef.current = false;
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
              <Text className="text-2xl font-bold text-gray-900">Add Kitchen Partner</Text>
              <Text className="text-sm text-gray-500 mt-1">
                Create login and basic kitchen onboarding details.
              </Text>
            </View>
          </View>
        </View>

        <View className="mx-4 mb-4 bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-base font-bold text-gray-900 mb-4">Partner Account</Text>
          <Field label="Name *" value={form.name} onChangeText={(v) => updateForm("name", v)} placeholder="Partner name" />
          <Field
            label="Mobile *"
            value={form.mobile}
            onChangeText={(v) => updateForm("mobile", v.replace(/[^0-9]/g, "").slice(0, 10))}
            placeholder="10 digit mobile"
            keyboardType="phone-pad"
            rightElement={
              form.mobile.length > 0 ? (
                <Text className="text-xs font-semibold text-gray-500 ml-2">
                  {form.mobile.length}/10
                </Text>
              ) : null
            }
          />
          <Field
            label="Password *"
            value={form.password}
            onChangeText={(v) => updateForm("password", v)}
            placeholder="Login password"
            secureTextEntry
          />
        </View>

        <View className="mx-4 mb-4 bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-base font-bold text-gray-900 mb-4">Kitchen Details</Text>
          <Field label="Kitchen Name *" value={form.kitchenname} onChangeText={(v) => updateForm("kitchenname", v)} placeholder="Kitchen name" />
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
        </View>

        <View className="mx-4 mb-4 bg-white rounded-2xl border border-gray-200 p-4">
          <Text className="text-base font-bold text-gray-900 mb-4">Address</Text>
          <Field label="Address *" value={form.address} onChangeText={(v) => updateForm("address", v)} placeholder="Address line" multiline />
          <Field label="City *" value={form.city} onChangeText={(v) => updateForm("city", v)} placeholder="City" />
          <Field label="State *" value={form.state} onChangeText={(v) => updateForm("state", v)} placeholder="State" />
          <Field label="Pincode *" value={form.pincode} onChangeText={(v) => updateForm("pincode", v.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="Pincode" keyboardType="number-pad" />
        </View>

        <View className="mx-4">
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.9}
            className="bg-blue-600 rounded-xl py-4 items-center justify-center"
          >
            <View className="flex-row items-center">
              <Icon name="restaurant" size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">Create Kitchen Partner</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AddKitchenPartnerScreen;
