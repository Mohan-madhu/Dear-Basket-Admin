import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLoading } from "../../../App_Utils/Contexts/LoadingContext";
import Storage from "../../../App_Utils/Services/StorageService";
import { API, getUserFacingErrorMessage } from "../../../App_Utils/Services/APIService";
import Toaster from "../../../App_Utils/Services/ToastService";
import { useDispatch } from "react-redux";
import { clearCart } from "../../Redux/CartReducer";

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { setLoading } = useLoading();
  const dispatch = useDispatch();
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);

  const CheckAlreadyLoggedIn = async () => {
    console.log("Checking logged status");
    try {
      const data = await Storage.getData("USER");
      const ROLE = await Storage.getData("ROLE");
      console.log(`Found ROLE=${ROLE}, userdata=${!!data}`);
      if (ROLE && data) {
        switch (ROLE.toUpperCase()) {
          case "ADMIN":
            navigation.replace("AdminDashboardScreen");
            break;
          case "PARTNER":
            navigation.replace("PartnerDashboard");
            break;
          default:
            navigation.replace("Main");
            break;
        }
      }
    } catch (err) {
      Toaster.errortop("Failed to check login status");
      console.log(`CheckLoggedStatus error: ${err.message}`);
    }
  };

  useEffect(() => {
    CheckAlreadyLoggedIn();
  }, []);

  const handlePhoneChange = (text) => {
    // Remove non-numeric characters
    const numericText = text.replace(/[^0-9]/g, '');
    // Limit to 10 digits
    if (numericText.length <= 10) {
      setPhone(numericText);
    }
  };

  const handleLogin = async () => {
    try {
      Keyboard.dismiss();
      setLoading(true, "Checking the Credentials");

      if (!phone || !password) {
        Alert.alert("Error", "Please enter phone number and password");
        setLoading(false);
        if (!phone) {
          setTimeout(() => phoneRef.current?.focus(), 0);
        } else {
          setTimeout(() => passwordRef.current?.focus(), 0);
        }
        return;
      }

      // Validate phone number length
      if (phone.length !== 10) {
        Alert.alert("Error", "Please enter a valid 10-digit phone number");
        setLoading(false);
        setTimeout(() => phoneRef.current?.focus(), 0);
        return;
      }

      console.log("Logging in with:", phone, password);
      const payload = {
        username: phone,
        password: password,
      };

      console.log(payload);

      var res = await API.POST("Login", payload);
      console.log(res);

      if (res.Message.toLowerCase() === "login successful") {
        const account = res.Response?.[0];
        const isDisabled = Number(account?.status) !== 1;
        const isLocked = Number(account?.islocked || 0) === 1;
        const isDeleted = Number(account?.isdeleted || 0) === 1;

        if (!account || isDisabled || isLocked || isDeleted) {
          const message = isDeleted
            ? "This account has been deleted. Please contact admin."
            : isLocked || isDisabled
              ? "This account is disabled. Please contact admin."
              : "Unable to login. Please contact admin.";

          Toaster.errortop(message);
          Alert.alert("Login Blocked", message);
          setTimeout(() => phoneRef.current?.focus(), 0);
          return;
        }

        dispatch(clearCart());
        await Storage.storeData("USER", account.name);
        await Storage.storeData("USERID", account.transid);
        await Storage.storeData("ROLE", account.usertype);
        await Storage.storeData("DATA", account);


        // navigation.replace("Main");

        switch (account.usertype.toUpperCase()) {
          case "ADMIN":
            Toaster.successtop(res.Message);
            navigation.replace("AdminDashboardScreen");
            break;
          case "PARTNER":
            Toaster.errortop("Partner login is not supported.");
            Alert.alert("Info", "Partner login is not supported in this app.");
            //navigation.replace("PartnerDashboard");
            break;
          default:
            Toaster.successtop(res.Message);
            navigation.replace("Main");
            break;
        }
      } else {
        Toaster.errortop(res.Message);
        setTimeout(() => passwordRef.current?.focus(), 0);
      }
    } catch (err) {
      setLoading(false);
      console.log(err);
      Alert.alert("Error", getUserFacingErrorMessage(err, "Login failed. Please try again."));
      setTimeout(() => phoneRef.current?.focus(), 0);
    } finally {
      setLoading(false);
    }

    setLoading(false);
  };

  const handleForgotPassword = () => {
    try {
      const state = navigation?.getState?.();
      const routeNames = state?.routeNames || [];
      if (routeNames.includes("ForgotPassword")) {
        navigation.navigate("ForgotPassword");
        return;
      }
      Alert.alert(
        "Not Available",
        "Forgot Password screen is not configured in this build."
      );
    } catch (error) {
      console.error("Forgot password navigation error:", error);
      Alert.alert("Error", "Unable to open Forgot Password right now.");
    }
  };

  return (
    <View className="flex-1 bg-gray-100 justify-center px-6">
      <Text className="text-3xl font-bold text-gray-800 text-center mb-2">
        Welcome Back
      </Text>
      <Text className="text-sm text-gray-500 text-center mb-6">
        Login to continue
      </Text>

      {/* Phone Input */}
      <View className="flex-row items-center bg-gray-200 p-3 rounded-xl mb-4">
        <Ionicons name="call-outline" size={20} color="#6B7280" />
        <TextInput
          ref={phoneRef}
          placeholder="Phone Number"
          placeholderTextColor="#6B7280"
          keyboardType="phone-pad"
          className="ml-3 flex-1 text-black"
          value={phone}
          onChangeText={handlePhoneChange}
          maxLength={10}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        {phone.length > 0 && (
          <Text className="text-gray-500 text-sm">
            {phone.length}/10
          </Text>
        )}
      </View>

      {/* Password Input */}
      <View className="flex-row items-center bg-gray-200 p-3 rounded-xl mb-2">
        <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
        <TextInput
          ref={passwordRef}
          placeholder="Password"
          placeholderTextColor="#6B7280"
          secureTextEntry={!showPassword}
          className="ml-3 flex-1 text-black"
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity
          onPress={() => setShowPassword((current) => !current)}
          className="pl-3 py-1"
          activeOpacity={0.75}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={21}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {/* Forgot Password */}
      <TouchableOpacity
        onPress={handleForgotPassword}
        className="mb-6"
      >
        <Text className="text-blue-500 text-right">
          Forgot Password?
        </Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity
        onPress={handleLogin}
        className="bg-blue-600 py-4 rounded-xl shadow shadow-black/10 elevation-4"
      >
        <Text className="text-white text-center text-lg font-bold">
          Login
        </Text>
      </TouchableOpacity>

      {/* Signup Link */}
      <View className="mt-7 flex-row justify-center">
        <Text className="text-gray-500">Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("NewUser")}>
          <Text className="text-blue-500 font-semibold">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
