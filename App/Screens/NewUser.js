// NewUser.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import Toaster from "../../App_Utils/Services/ToastService";

/* ----------------------------- HELPERS ----------------------------- */

const useSlideFade = (delay = 0, from = 24, duration = 400) => {
  const slide = useRef(new Animated.Value(from)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, fade, slide]);

  return { slide, fade };
};

const formatDateForApi = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (date) => {
  if (!date) return "Select date of birth";
  try {
    const day = `${date.getDate()}`.padStart(2, "0");
    const month = date.toLocaleDateString("en-IN", { month: "long" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return "Select date of birth";
  }
};

const scaleOnPress = (pressed) => ({
  transform: [{ scale: pressed ? 0.98 : 1 }],
});

const roleOptions = [
  { label: "User", value: "USER" },
  { label: "Partner", value: "PARTNER" },
  { label: "Admin", value: "ADMIN" },
];

/* ----------------------------- UI PIECES ----------------------------- */

const Section = ({ title, children, anim }) => (
  <Animated.View
    className="mx-4 mb-4 bg-white rounded-2xl border border-gray-200 p-4"
    style={{
      opacity: anim.fade,
      transform: [{ translateY: anim.slide }],
    }}
  >
    <Text className="text-base font-bold text-gray-900 mb-4">{title}</Text>
    {children}
  </Animated.View>
);

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  maxLength,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  secureTextEntry = false,
  leftIcon,
  rightElement,
}) => (
  <View className="mb-4">
    <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>

    <View
      className={`border border-gray-300 rounded-xl bg-white px-3 flex-row items-center ${
        multiline ? "py-3" : ""
      }`}
    >
      {leftIcon ? (
        <MaterialIcons
          name={leftIcon}
          size={18}
          color="#6b7280"
          style={{ marginRight: 8 }}
        />
      ) : null}

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        secureTextEntry={secureTextEntry}
        textAlignVertical={multiline ? "top" : "center"}
        className={`flex-1 text-base text-gray-900 ${
          multiline ? "min-h-[90px]" : "py-4"
        } ${!editable ? "text-gray-500" : ""}`}
        placeholderTextColor="#9ca3af"
      />

      {rightElement}
    </View>
  </View>
);

/* ----------------------------- MAIN ----------------------------- */

const NewUser = () => {
  const nav = useNavigation();
  const { setLoading } = useLoading();

  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [fullname, setFullname] = useState("");
  const [dob, setDob] = useState(null);
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [usertype, setUsertype] = useState("USER");
  const [password, setPassword] = useState("");
  const [fileInfo, setFileInfo] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [showDOBPicker, setShowDOBPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSubmittingRef = useRef(false);

  const headerAnim = useSlideFade(0);
  const roleAnim = useSlideFade(80);
  const personalAnim = useSlideFade(140);
  const loginAnim = useSlideFade(200);
  const buttonAnim = useSlideFade(260);

  useEffect(() => {
    const getRole = async () => {
      try {
        const storedRole = await Storage.getData("ROLE");
        setRole(storedRole);
      } catch (error) {
        console.error("Error reading role:", error);
      } finally {
        setLoadingRole(false);
      }
    };

    getRole();
  }, []);

  const canUploadProfile =
    role !== "USER" && role !== null && usertype !== "USER";

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/jpg"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const { uri, name, mimeType } = result.assets[0];
      setFileInfo({ uri, name, type: mimeType });
      setProfileImage(uri);
    } catch (err) {
      console.error("Image picker error:", err);
      Toaster.errortop("Failed to select image");
    }
  };

  const validateForm = () => {
    if (!fullname.trim()) {
      Toaster.errortop("Full name is required");
      return false;
    }

    if (!mobile.trim()) {
      Toaster.errortop("Mobile is required");
      return false;
    }

    if (mobile.trim().length < 10) {
      Toaster.errortop("Valid mobile number is required");
      return false;
    }

    if (!password.trim()) {
      Toaster.errortop("Password is required");
      return false;
    }

    return true;
  };

  const handleMobileChange = (text) => {
    const numericText = text.replace(/[^0-9]/g, "").slice(0, 10);
    setMobile(numericText);
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    if (!validateForm()) return;

    isSubmittingRef.current = true;
    let profilePath = "";

    try {
      if (fileInfo) {
        setLoading(true, "Uploading profile image...");
        const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
          path: "User Profile",
        });
        profilePath = uploadRes?.virtualPath || "";
      }

      setLoading(true, "Creating user account...");

      const currentUser = await Storage.getData("USER");
      const rcuValue = role !== "ADMIN" ? "SELF" : currentUser;

      const payload = {
        fullname: fullname.trim(),
        dob: dob ? formatDateForApi(dob) : "",
        profile: profilePath || "No File Uploaded",
        address: address.trim(),
        mobile: mobile.trim(),
        usertype,
        username: mobile.trim(),
        password: password.trim(),
        rcu: rcuValue,
      };

      const res = await API.POST("UserSignUp", payload);

      if (res?.Message === "User inserted successfully.") {
        Alert.alert(
          "User Created",
          `Username: ${mobile.trim()}\nPassword: ${password.trim()}`,
          [{ text: "OK", onPress: () => nav.goBack() }]
        );
      } else {
        Toaster.errortop(res?.Message || "Failed to create user");
      }
    } catch (err) {
      console.error("Submission error:", err);
      Toaster.errortop("Failed to create user");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (loadingRole) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-700 mt-4 text-base">Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {/* Header */}
        <Animated.View
          className="mx-4 mt-5 mb-4"
          style={{
            opacity: headerAnim.fade,
            transform: [{ translateY: headerAnim.slide }],
          }}
        >
          <View className="bg-white border border-gray-200 rounded-2xl p-4">
            <Text className="text-2xl font-bold text-gray-900">
              Create New User
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              Add a new account with basic details and login credentials
            </Text>
          </View>
        </Animated.View>

        {/* Role section */}
        {role === "ADMIN" && (
          <Section title="User Role" anim={roleAnim}>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Select user type
            </Text>

            <View className="border border-gray-300 rounded-xl overflow-hidden bg-white mb-2">
              <Picker
                selectedValue={usertype}
                onValueChange={setUsertype}
                style={{ color: "#111827", height: 54 }}
              >
                {roleOptions.map((item) => (
                  <Picker.Item
                    key={item.value}
                    label={item.label}
                    value={item.value}
                  />
                ))}
              </Picker>
            </View>
          </Section>
        )}

        {/* Personal details */}
        <Section title="Personal Details" anim={personalAnim}>
          {canUploadProfile && (
            <View className="items-center mb-5">
              <TouchableOpacity
                onPress={pickImage}
                activeOpacity={0.85}
                className="w-28 h-28 rounded-full border border-gray-300 bg-gray-100 items-center justify-center overflow-hidden"
              >
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="items-center px-3">
                    <MaterialIcons
                      name="add-a-photo"
                      size={28}
                      color="#6b7280"
                    />
                    <Text className="text-xs text-gray-600 mt-2 text-center">
                      Upload Photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Field
            label="Full Name *"
            value={fullname}
            onChangeText={setFullname}
            placeholder="Enter full name"
            leftIcon="person-outline"
          />

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowDOBPicker(true)}
              className="border border-gray-300 rounded-xl bg-white px-3 py-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <MaterialIcons
                  name="calendar-month"
                  size={18}
                  color="#6b7280"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-base text-gray-900">
                  {formatDateDisplay(dob)}
                </Text>
              </View>

              <Ionicons name="chevron-down" size={18} color="#6b7280" />
            </TouchableOpacity>

            {showDOBPicker && (
              <DateTimePicker
                value={dob || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedDate) => {
                  setShowDOBPicker(false);
                  if (selectedDate) setDob(selectedDate);
                }}
                maximumDate={new Date()}
              />
            )}
          </View>

          <Field
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address"
            multiline
            numberOfLines={4}
            leftIcon="location-on"
          />

          <Field
            label="Mobile Number *"
            value={mobile}
            onChangeText={handleMobileChange}
            placeholder="Enter mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            leftIcon="call"
            rightElement={
              mobile.length > 0 ? (
                <Text className="text-xs font-medium text-gray-500">
                  {mobile.length}/10
                </Text>
              ) : null
            }
          />
          <Text className="text-xs text-gray-500 -mt-2 mb-1">
            {mobile.length} typed, {10 - mobile.length} remaining
          </Text>
        </Section>

        {/* Login details */}
        <Section title="Login Details" anim={loginAnim}>
          <Field
            label="Username"
            value={mobile}
            onChangeText={() => {}}
            placeholder="Will be same as mobile"
            editable={false}
            leftIcon="alternate-email"
          />

          <Field
            label="Password *"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry={!showPassword}
            leftIcon="lock-outline"
            rightElement={
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            }
          />
        </Section>

        {/* Buttons */}
        <Animated.View
          className="mx-4 mt-2"
          style={{
            opacity: buttonAnim.fade,
            transform: [{ translateY: buttonAnim.slide }],
          }}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.9}
            style={({ pressed }) => scaleOnPress(pressed)}
            disabled={isSubmittingRef.current}
            className="bg-blue-600 rounded-xl py-4 items-center justify-center"
          >
            <View className="flex-row items-center">
              <MaterialIcons name="person-add" size={20} color="#fff" />
              <Text className="text-white text-base font-semibold ml-2">
                Create {usertype}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => nav.goBack()}
            activeOpacity={0.9}
            style={({ pressed }) => scaleOnPress(pressed)}
            className="mt-3 bg-white border border-gray-300 rounded-xl py-4 items-center justify-center"
          >
            <View className="flex-row items-center">
              <MaterialIcons name="arrow-back" size={20} color="#374151" />
              <Text className="text-gray-700 text-base font-semibold ml-2">
                Cancel
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default NewUser;
