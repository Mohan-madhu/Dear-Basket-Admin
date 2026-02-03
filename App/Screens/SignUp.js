// Signup.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";

import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import Toaster from "../../App_Utils/Services/ToastService";

const { width } = Dimensions.get('window');

const Signup = () => {
  const nav = useNavigation();
  const { setLoading } = useLoading();

  const [ROLE, setROLE] = useState(null);
  const [fullname, setFullname] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const usertype = "USER";

  // header squash on scroll
  const y = useSharedValue(0);
  const onScroll = (e) => {
    y.value = e.nativeEvent.contentOffset.y || 0;
  };
  const headerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withTiming(y.value > 40 ? -12 : 0, { duration: 180 }) },
      { scale: withTiming(y.value > 40 ? 0.98 : 1, { duration: 180 }) },
    ],
    opacity: withTiming(y.value > 80 ? 0.92 : 1, { duration: 180 }),
  }));

  // CTA press feedback
  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  useEffect(() => {
    (async () => {
      const r = await Storage.getData("ROLE");
      setROLE(r);
    })();
  }, []);

  const validate = () => {
    if (!fullname.trim()) return Toaster.errortop("Full name is required"), false;
    if (!mobile.trim()) return Toaster.errortop("Mobile is required"), false;
    if (mobile.length < 10) return Toaster.errortop("Valid mobile number is required"), false;
    if (!password.trim()) return Toaster.errortop("Password is required"), false;
    if (password.length < 6) return Toaster.errortop("Password must be at least 6 characters"), false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true, "Creating User Account…");
    try {
      const CURRENT = await Storage.getData("USER");
      const rcuValue = ROLE !== "ADMIN" ? "SELF" : CURRENT;

      const payload = {
        fullname,
        dob: "",
        profile: "No File Uploaded",
        address: "",
        mobile,
        usertype,
        username: mobile, // username mirrors mobile
        password,
        rcu: rcuValue,
      };

      const res = await API.POST("UserSignUp", payload);

      if (res?.Message === "User inserted successfully.") {
        Alert.alert(
          "User Created 🎉",
          `Username: ${mobile}\nPassword: ${password}`,
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
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#0f172a]"
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <Animated.View
          entering={FadeInDown.duration(450)}
          style={headerStyle}
          className="mx-5 mt-8 rounded-3xl overflow-hidden border border-indigo-500/20 bg-gradient-to-b from-indigo-900/30 to-indigo-800/10"
        >
          <View className="p-6 items-center">
            <View className="w-16 h-16 rounded-full bg-indigo-700/20 items-center justify-center mb-4 border border-indigo-500/30">
              <Feather name="user-plus" size={28} color="#818cf8" />
            </View>
            <Text className="text-white text-2xl font-bold text-center tracking-tight">
              Create Account
            </Text>
            <Text className="text-indigo-200/80 text-center mt-2 text-sm">
              Simple, secure account setup
            </Text>
          </View>
        </Animated.View>

        {/* card */}
        <Animated.View
          entering={FadeInUp.delay(80).duration(500)}
          exiting={FadeOut}
          className="mx-5 mt-6 rounded-3xl bg-slate-800/40 border border-slate-700/50 p-6 shadow-lg"
        >
          <Text className="text-white font-medium text-lg mb-5">Account Information</Text>
          
          {/* Full Name */}
          <View className="mb-5">
            <View className="flex-row items-center mb-2">
              <Text className="text-slate-300 text-sm font-medium">
                Full Name
              </Text>
              <Text className="text-red-400 ml-1">*</Text>
            </View>
            <View className="flex-row items-center bg-slate-800/50 rounded-xl border border-slate-700/70 px-4 h-14">
              <Ionicons name="person-outline" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
              <TextInput
                placeholder="e.g. Priya Sharma"
                placeholderTextColor="#94a3b8"
                value={fullname}
                onChangeText={setFullname}
                className="flex-1 text-white text-base"
              />
            </View>
          </View>

          {/* Mobile */}
          <View className="mb-5">
            <View className="flex-row items-center mb-2">
              <Text className="text-slate-300 text-sm font-medium">
                Mobile Number
              </Text>
              <Text className="text-red-400 ml-1">*</Text>
            </View>
            <View className="flex-row items-center bg-slate-800/50 rounded-xl border border-slate-700/70 px-4 h-14">
              <Feather name="phone" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
              <TextInput
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                value={mobile}
                onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                maxLength={10}
                className="flex-1 text-white text-base"
              />
            </View>
          </View>

          {/* Username (read-only = mobile) */}
          <View className="mb-5">
            <View className="flex-row items-center mb-2">
              <Text className="text-slate-300 text-sm font-medium">
                Username
              </Text>
              <Text className="text-slate-500 text-xs ml-2">(auto-generated)</Text>
            </View>
            <View className="flex-row items-center bg-slate-800/30 rounded-xl border border-slate-700/50 px-4 h-14">
              <Ionicons name="at-circle-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
              <TextInput
                placeholder="Will mirror mobile number"
                placeholderTextColor="#64748b"
                value={mobile}
                editable={false}
                className="flex-1 text-slate-400 text-base"
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-2">
            <View className="flex-row items-center mb-2">
              <Text className="text-slate-300 text-sm font-medium">
                Password
              </Text>
              <Text className="text-red-400 ml-1">*</Text>
            </View>
            <View className="flex-row items-center bg-slate-800/50 rounded-xl border border-slate-700/70 px-4 h-14">
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
              <TextInput
                placeholder="Set a secure password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                className="flex-1 text-white text-base"
              />
              <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                <Ionicons 
                  name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#94a3b8" 
                />
              </Pressable>
            </View>
            <Text className="text-slate-500 text-xs mt-2">
              Must be at least 6 characters
            </Text>
          </View>
        </Animated.View>

        {/* actions */}
        <View className="mx-5 mt-7">
          <Animated.View style={ctaStyle}>
            <Pressable
              onPressIn={() => (ctaScale.value = withTiming(0.97))}
              onPressOut={() => (ctaScale.value = withTiming(1))}
              onPress={handleSubmit}
              className="rounded-2xl overflow-hidden shadow-lg shadow-emerald-500/20"
            >
              <LinearGradient
                colors={["#4ade80", "#22c55e", "#16a34a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 px-6 items-center justify-center flex-row"
              >
                <Text className="text-white font-semibold text-base mr-2">
                  Create Account
                </Text>
                <Feather name="check-circle" size={20} color="white" />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Pressable
            onPress={() => nav.goBack()}
            className="rounded-2xl overflow-hidden mt-4 border border-rose-500/30"
          >
            <View className="py-4 px-6 items-center justify-center flex-row bg-rose-900/20">
              <Text className="text-rose-300 font-medium text-base mr-2">
                Cancel
              </Text>
              <Ionicons name="close-circle-outline" size={20} color="#fda4af" />
            </View>
          </Pressable>
        </View>

        {/* info footer */}
        <View className="mx-5 mt-8 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
          <View className="flex-row items-start mb-3">
            <Ionicons name="information-circle-outline" size={18} color="#818cf8" style={{ marginTop: 2, marginRight: 8 }} />
            <Text className="text-slate-400 text-xs flex-1">
              Your mobile number will be used as your username for login. Please ensure it's accurate and accessible.
            </Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons name="shield-checkmark-outline" size={18} color="#818cf8" style={{ marginTop: 2, marginRight: 8 }} />
            <Text className="text-slate-400 text-xs flex-1">
              We prioritize your privacy and security. Your information is encrypted and protected.
            </Text>
          </View>
        </View>

        {/* footer */}
        <View className="items-center mt-8 mb-2">
          <Text className="text-slate-500 text-xs">
            © {new Date().getFullYear()} • Dear Basket
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Signup;