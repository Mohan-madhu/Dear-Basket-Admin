// import React, { useEffect, useState } from "react";
// import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useLoading } from "../../../App_Utils/Contexts/LoadingContext";
// import Storage from "../../../App_Utils/Services/StorageService";
// import { API } from "../../../App_Utils/Services/APIService";
// import Toaster from "../../../App_Utils/Services/ToastService";

// export default function LoginScreen({ navigation }) {
//   const [phone, setPhone] = useState("");
//   const [password, setPassword] = useState("");

//   const { setLoading } = useLoading();

//   const colors = {
//     background: "#F3F4F6",
//     primary: "#2563EB",
//     primaryDark: "#1D4ED8",
//     inputBg: "#E5E7EB",
//     text: "#1F2937",
//     muted: "#6B7280",
//     link: "#3B82F6",
//   };

//   const CheckAlreadyLoggedIn = async () => {
//     console.log("Checking logged status");
//     try {
//       const data = await Storage.getData("USER");
//       const ROLE = await Storage.getData("ROLE");
//       console.log(`Found ROLE=${ROLE}, userdata=${!!data}`);
//       if (ROLE && data) {
//         switch (ROLE.toUpperCase()) {
//           case "ADMIN":
//             navigation.replace("AdminDashboardScreen");
//             break;
//           case "PARTNER":
//             navigation.replace("PartnerDashboard");
//             break;
//           // case "ACCOUNTS":
//           //   navigation.replace("AccountsDashboard");
//           //   break;
//           // case "SALESMAN":
//           //   navigation.replace("SalesmanDashboard");
//           //   break;
//           // case "PRODUCTION":
//           //   navigation.replace("ProductionDashboard");
//           //   break;
//           // case "DISPATCH":
//           //   navigation.replace("DispatchDashboard");
//           //   break;
//           // case "DELIVERY":
//           //   navigation.replace("DeliveryDashboard");
//           //   break;
//           default:
//             navigation.replace("Main");
//             break;
//         }
//       }
//     } catch (err) {
//       Toaster.errortop("Failed to check login status");
//       console.log(`CheckLoggedStatus error: ${err.message}`);
//     }
//   };

//   useEffect(() => {
//     CheckAlreadyLoggedIn();
//   }, []);

//   const handleLogin = async () => {
//     try {
//       setLoading(true, "Checking the Credentials");

//       if (!phone || !password) {
//         Alert.alert("Error", "Please enter phone number and password");
//         setLoading(false);
//         return;
//       }

//       // In a real application, you would authenticate against a backend
//       console.log("Logging in with:", phone, password);
//       const payload = {
//         username: phone,
//         password: password,
//       };

//       console.log(payload);

//       var res = await API.POST("Login", payload);
//       console.log(res);

//       if (res.Message.toLowerCase() === "login successful") {
//         await Storage.storeData("USER", res.Response[0].name);
//         await Storage.storeData("USERID", res.Response[0].transid);
//         await Storage.storeData("ROLE", res.Response[0].usertype);
//         await Storage.storeData("DATA", res.Response[0]);

//         Toaster.successtop(res.Message);
//         navigation.replace("Main");

//         switch (res.Response[0].usertype.toUpperCase()) {
//           case "ADMIN":
//             navigation.replace("AdminDashboardScreen");
//             break;
//           case "PARTNER":
//             navigation.replace("PartnerDashboard");
//             break;
//           // case "SALESMAN":
//           //   navigation.replace("SalesmanDashboard");
//           //   break;
//           // case "PRODUCTION":
//           //   navigation.replace("ProductionDashboard");
//           //   break;
//           // case "DISPATCH":
//           //   navigation.replace("DispatchDashboard");
//           //   break;
//           // case "DELIVERY":
//           //   navigation.replace("DeliveryDashboard");
//           //   break;
//           default:
//             navigation.replace("Main");
//             break;
//         }
//       } else {
//         Toaster.errortop(res.Message);
//       }
//     } catch (err) {
//       setLoading(false);
//       console.log(err);
//       Alert.alert("Error", err);
//     } finally {
//       setLoading(false);
//     }

//     setLoading(false);
//   };

//   useEffect(() => {
//     CheckAlreadyLoggedIn();
//   }, []);

//   return (
//     <View
//       style={{
//         flex: 1,
//         backgroundColor: colors.background,
//         justifyContent: "center",
//         paddingHorizontal: 24,
//       }}
//     >
//       <Text
//         style={{
//           fontSize: 32,
//           fontWeight: "bold",
//           color: colors.text,
//           textAlign: "center",
//           marginBottom: 8,
//         }}
//       >
//         Welcome Back
//       </Text>
//       <Text
//         style={{
//           fontSize: 14,
//           color: colors.muted,
//           textAlign: "center",
//           marginBottom: 24,
//         }}
//       >
//         Login to continue
//       </Text>


//       {/* <View
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           backgroundColor: colors.inputBg,
//           padding: 12,
//           borderRadius: 12,
//           marginBottom: 16,
//         }}
//       >
//         <Ionicons name="call-outline" size={20} color={colors.muted} />
//         <TextInput
//           placeholder="Phone Number"
//           placeholderTextColor={colors.muted}
//           keyboardType="phone-pad"
//           style={{ marginLeft: 10, flex: 1 }}
//           value={phone}
//           onChangeText={setPhone}
//         />
//       </View>


//       <View
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           backgroundColor: colors.inputBg,
//           padding: 12,
//           borderRadius: 12,
//           marginBottom: 8,
//         }}
//       >
//         <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
//         <TextInput
//           placeholder="Password"
//           placeholderTextColor={colors.muted}
//           secureTextEntry
//           style={{ marginLeft: 10, flex: 1 }}
//           value={password}
//           onChangeText={setPassword}
//         />
//       </View> */}

//       {/* Phone Input */}
//       <View
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           backgroundColor: colors.inputBg,
//           padding: 12,
//           borderRadius: 12,
//           marginBottom: 16,
//         }}
//       >
//         <Ionicons name="call-outline" size={20} color={colors.muted} />
//         <TextInput
//           placeholder="Phone Number"
//           placeholderTextColor={colors.muted}
//           keyboardType="phone-pad"
//           style={{ marginLeft: 10, flex: 1, color: "#000" }}  // 👈 force black text
//           value={phone}
//           onChangeText={setPhone}
//         />
//       </View>

//       {/* Password Input */}
//       <View
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           backgroundColor: colors.inputBg,
//           padding: 12,
//           borderRadius: 12,
//           marginBottom: 8,
//         }}
//       >
//         <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
//         <TextInput
//           placeholder="Password"
//           placeholderTextColor={colors.muted}
//           secureTextEntry
//           style={{ marginLeft: 10, flex: 1, color: "#000" }}  // 👈 force black text
//           value={password}
//           onChangeText={setPassword}
//         />
//       </View>



//       {/* Forgot Password */}
//       <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
//         <Text
//           style={{ color: colors.link, textAlign: "right", marginBottom: 24 }}
//         >
//           Forgot Password?
//         </Text>
//       </TouchableOpacity>

//       {/* Login Button */}
//       <TouchableOpacity
//         onPress={handleLogin}
//         style={{
//           backgroundColor: colors.primary,
//           paddingVertical: 14,
//           borderRadius: 12,
//           shadowColor: "#000",
//           shadowOpacity: 0.1,
//           shadowOffset: { width: 0, height: 2 },
//           elevation: 4,
//         }}
//       >
//         <Text
//           style={{
//             textAlign: "center",
//             color: "#fff",
//             fontSize: 18,
//             fontWeight: "bold",
//           }}
//         >
//           Login
//         </Text>
//       </TouchableOpacity>

//       {/* Signup Link */}
//       <View
//         style={{
//           marginTop: 28,
//           flexDirection: "row",
//           justifyContent: "center",
//         }}
//       >
//         <Text style={{ color: colors.muted }}>Don't have an account? </Text>
//         <TouchableOpacity onPress={() => navigation.navigate("NewUser")}>
//           <Text style={{ color: colors.link, fontWeight: "600" }}>Sign Up</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }


import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLoading } from "../../../App_Utils/Contexts/LoadingContext";
import Storage from "../../../App_Utils/Services/StorageService";
import { API } from "../../../App_Utils/Services/APIService";
import Toaster from "../../../App_Utils/Services/ToastService";
import { useDispatch } from "react-redux";
import { clearCart } from "../../Redux/CartReducer";

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const { setLoading } = useLoading();
  const dispatch = useDispatch();
  // refs to control focus for showing keyboard again on errors
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);

  const colors = {
    background: "#F3F4F6",
    primary: "#2563EB",
    primaryDark: "#1D4ED8",
    inputBg: "#E5E7EB",
    text: "#1F2937",
    muted: "#6B7280",
    link: "#3B82F6",
  };

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
          // case "ACCOUNTS":
          //   navigation.replace("AccountsDashboard");
          //   break;
          // case "SALESMAN":
          //   navigation.replace("SalesmanDashboard");
          //   break;
          // case "PRODUCTION":
          //   navigation.replace("ProductionDashboard");
          //   break;
          // case "DISPATCH":
          //   navigation.replace("DispatchDashboard");
          //   break;
          // case "DELIVERY":
          //   navigation.replace("DeliveryDashboard");
          //   break;
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

  const handleLogin = async () => {
    try {
      // Hide keyboard immediately on login press
      Keyboard.dismiss();

      setLoading(true, "Checking the Credentials");

      if (!phone || !password) {
        Alert.alert("Error", "Please enter phone number and password");
        setLoading(false);
        // Re-show keyboard and focus the missing field
        if (!phone) {
          setTimeout(() => phoneRef.current?.focus(), 0);
        } else {
          setTimeout(() => passwordRef.current?.focus(), 0);
        }
        return;
      }

      // In a real application, you would authenticate against a backend
      console.log("Logging in with:", phone, password);
      const payload = {
        username: phone,
        password: password,
      };

      console.log(payload);

      var res = await API.POST("Login", payload);
      console.log(res);

      if (res.Message.toLowerCase() === "login successful") {
        dispatch(clearCart())
        await Storage.storeData("USER", res.Response[0].name);
        await Storage.storeData("USERID", res.Response[0].transid);
        await Storage.storeData("ROLE", res.Response[0].usertype);
        await Storage.storeData("DATA", res.Response[0]);

        Toaster.successtop(res.Message);
        navigation.replace("Main");

        switch (res.Response[0].usertype.toUpperCase()) {
          case "ADMIN":
            navigation.replace("AdminDashboardScreen");
            break;
          case "PARTNER":
            navigation.replace("PartnerDashboard");
            break;
          // case "SALESMAN":
          //   navigation.replace("SalesmanDashboard");
          //   break;
          // case "PRODUCTION":
          //   navigation.replace("ProductionDashboard");
          //   break;
          // case "DISPATCH":
          //   navigation.replace("DispatchDashboard");
          //   break;
          // case "DELIVERY":
          //   navigation.replace("DeliveryDashboard");
          //   break;
          default:
            navigation.replace("Main");
            break;
        }
      } else {
        Toaster.errortop(res.Message);
        // Bring back keyboard to let user correct quickly
        setTimeout(() => passwordRef.current?.focus(), 0);
      }
    } catch (err) {
      setLoading(false);
      console.log(err);
      Alert.alert("Error", err);
      // Re-open keyboard on error
      setTimeout(() => phoneRef.current?.focus(), 0);
    } finally {
      setLoading(false);
    }

    setLoading(false);
  };

  useEffect(() => {
    CheckAlreadyLoggedIn();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          fontSize: 32,
          fontWeight: "bold",
          color: colors.text,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Welcome Back
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.muted,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        Login to continue
      </Text>


      {/* <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBg,
          padding: 12,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Ionicons name="call-outline" size={20} color={colors.muted} />
        <TextInput
          placeholder="Phone Number"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          style={{ marginLeft: 10, flex: 1 }}
          value={phone}
          onChangeText={setPhone}
        />
      </View>


      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBg,
          padding: 12,
          borderRadius: 12,
          marginBottom: 8,
        }}
      >
        <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={{ marginLeft: 10, flex: 1 }}
          value={password}
          onChangeText={setPassword}
        />
      </View> */}

      {/* Phone Input */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBg,
          padding: 12,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Ionicons name="call-outline" size={20} color={colors.muted} />
        <TextInput
          ref={phoneRef}
          placeholder="Phone Number"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          style={{ marginLeft: 10, flex: 1, color: "#000" }}  // 👈 force black text
          value={phone}
          onChangeText={setPhone}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
      </View>

      {/* Password Input */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBg,
          padding: 12,
          borderRadius: 12,
          marginBottom: 8,
        }}
      >
        <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
        <TextInput
          ref={passwordRef}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={{ marginLeft: 10, flex: 1, color: "#000" }}  // 👈 force black text
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
      </View>



      {/* Forgot Password */}
      <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
        <Text
          style={{ color: colors.link, textAlign: "right", marginBottom: 24 }}
        >
          Forgot Password?
        </Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity
        onPress={handleLogin}
        style={{
          backgroundColor: colors.primary,
          paddingVertical: 14,
          borderRadius: 12,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
          }}
        >
          Login
        </Text>
      </TouchableOpacity>

      {/* Signup Link */}
      <View
        style={{
          marginTop: 28,
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.muted }}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("NewUser")}>
          <Text style={{ color: colors.link, fontWeight: "600" }}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
