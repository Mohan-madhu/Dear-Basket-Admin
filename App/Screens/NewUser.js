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
  Dimensions,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { DatePickerInput } from "react-native-paper-dates";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";

import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import Toaster from "../../App_Utils/Services/ToastService";

const { width } = Dimensions.get("window");

/** ─── Enhanced Animation Hook ─── */
const useSlideFade = (delay = 0, from = 40, duration = 550) => {
  const slide = useRef(new Animated.Value(from)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.back(1.2)),
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
  }, [delay]);

  return { slide, fade };
};

const NewUser = () => {
  const nav = useNavigation();
  const { setLoading } = useLoading();
  const [ROLE, setROLE] = useState(null);

  // Form state
  const [fullname, setFullname] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [usertype, setUsertype] = useState("USER");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rcu, setRcu] = useState("SELF");
  const [fileInfo, setFileInfo] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  // Enhanced animations with staggered timing
  const headerAnim = useSlideFade(0, 30, 600);
  const personalAnim = useSlideFade(150, 40, 500);
  const roleAnim = useSlideFade(250, 40, 500);
  const loginAnim = useSlideFade(350, 40, 500);
  const buttonsAnim = useSlideFade(450, 50, 600);

  // Pulse animation for profile photo with spring effect
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseAnim = () => {
    Animated.loop(
      Animated.sequence([
        Animated.spring(pulse, {
          toValue: 1.1,
          friction: 2,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(pulse, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    ).start();
  };

  // Press animation with spring
  const scaleOnPress = (pressed) => ({
    transform: [
      {
        scale: pressed
          ? Animated.spring(pulse, {
            toValue: 0.95,
            friction: 3,
            useNativeDriver: true,
          })
          : Animated.spring(pulse, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }),
      },
    ],
    opacity: pressed ? 0.8 : 1,
  });

  // Get user role
  const getRole = async () => {
    const ROLE = await Storage.getData("ROLE");
    setROLE(ROLE);
  };

  useEffect(() => {
    getRole();
    pulseAnim();
  }, []);

  // Image picker with enhanced error handling
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

      // Success feedback animation
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(pulse, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err) {
      Toaster.errortop("Failed to select image");
      console.error("Image picker error:", err);
    }
  };

  // Form validation
  const validateForm = () => {
    if (!fullname.trim()) {
      Toaster.errortop("Full name is required");
      return false;
    }
    if (!password.trim()) {
      Toaster.errortop("Password is required");
      return false;
    }
    if (!mobile.trim()) {
      Toaster.errortop("Mobile is required");
      return false;
    }
    if (mobile.length < 10) {
      Toaster.errortop("Valid mobile number is required");
      return false;
    }
    return true;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true, "Uploading Profile Image…");
    let profilePath = "";

    try {
      if (fileInfo) {
        const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
          path: "User Profile",
        });
        profilePath = uploadRes.virtualPath;
        setFileInfo(null);
      }
    } catch (err) {
      console.error("Upload error:", err);
      Toaster.errortop("Profile upload failed");
    } finally {
      setLoading(false);
    }

    setLoading(true, "Creating User Account…");

    try {
      const CURRENT = await Storage.getData("USER");
      const rcuValue = ROLE !== "ADMIN" ? "SELF" : CURRENT;

      const payload = {
        fullname,
        dob: dob ? dob.toISOString().split("T")[0] : "",
        profile: profilePath || "No File Uploaded",
        address,
        mobile,
        usertype,
        username: mobile,
        password,
        rcu: rcuValue,
      };

      console.log(payload)
      const res = await API.POST("UserSignUp", payload);

      if (res.Message === "User inserted successfully.") {
        // Success animation
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.5,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(pulse, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }),
        ]).start();

        Alert.alert(
          "User Created 🎉",
          `Username: ${mobile}\nPassword: ${password}`,
          [{ text: "OK", onPress: () => nav.goBack() }]
        );
      } else {
        Toaster.errortop(res.Message || "Failed to create user");
      }
    } catch (err) {
      console.error("Submission error:", err);
      Toaster.errortop("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  // Section header component
  const SectionHeader = ({ title, anim }) => (
    <Animated.View
      style={[
        styles.sectionHeader,
        {
          opacity: anim.fade,
          transform: [{ translateY: anim.slide }],
        },
      ]}
    >
      <LinearGradient
        colors={["#FF6B6B", "#FF8E8E"]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with animated gradient */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim.fade,
              transform: [{ translateY: headerAnim.slide }],
            },
          ]}
        >
          <LinearGradient
            colors={["#4A6FA5", "#3A5673"]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.headerText}>Create New User</Text>
          </LinearGradient>
        </Animated.View>

        {ROLE === "ADMIN" && (
          <View style={styles.sectionContainer}>
            <SectionHeader title="User Role Settings" anim={roleAnim} />

            <Animated.View
              style={{
                opacity: roleAnim.fade,
                transform: [{ translateY: roleAnim.slide }],
              }}
            >
              <Text style={styles.label}>User Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={usertype}
                  onValueChange={setUsertype}
                  style={styles.picker}
                  dropdownIconColor="#4A6FA5"
                  itemStyle={{ color: "#333", fontSize: 12 }}
                >
                  <Picker.Item label="User" value="USER" />
                  <Picker.Item label="Partner" value="PARTNER" />
                  <Picker.Item label="Administrator" value="ADMIN" />
                </Picker>
              </View>
            </Animated.View>
          </View>
        )}


        {/* Personal Details Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Personal Details" anim={personalAnim} />

          {ROLE !== "USER" && ROLE !== null && usertype !== "USER" && (
            <Animated.View
              style={[
                styles.profileContainer,
                {
                  opacity: personalAnim.fade,
                  transform: [
                    { translateY: personalAnim.slide },
                    { scale: pulse },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                onPress={pickImage}
                style={styles.profileButton}
                activeOpacity={0.7}
              >
                {profileImage ? (
                  <Animated.Image
                    source={{ uri: profileImage }}
                    style={[
                      styles.profileImage,
                      { transform: [{ scale: pulse }] },
                    ]}
                  />
                ) : (
                  <View style={styles.uploadContainer}>
                    <MaterialIcons name="add-a-photo" size={32} color="#4A6FA5" />
                    <Text style={styles.uploadText}>Upload Profile Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
          <Animated.View
            style={{
              opacity: personalAnim.fade,
              transform: [{ translateY: personalAnim.slide }],
            }}
          >
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              placeholder="Enter full name"
              value={fullname}
              onChangeText={setFullname}
              style={styles.input}
              placeholderTextColor="#999"
            />

            {/* <Text style={styles.label}>Date of Birth</Text>
            <View style={styles.dateInput}>
              <DatePickerInput
                locale="en"
                label=""
                value={dob}
                onChange={setDob}
                inputMode="start"
                style={styles.datePicker}
              />
            </View>

            <Text style={styles.label}>Address</Text>
            <TextInput
              placeholder="Enter address"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.multilineInput]}
              placeholderTextColor="#999"
            /> */}

            <Text style={styles.label}>Mobile *</Text>
            <TextInput
              placeholder="Enter mobile number"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.input}
              placeholderTextColor="#999"
            />
          </Animated.View>
        </View>

        {/* Role Section (Conditional) */}

        {/* Login Details Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Login Details" anim={loginAnim} />

          <Animated.View
            style={{
              opacity: loginAnim.fade,
              transform: [{ translateY: loginAnim.slide }],
            }}
          >
            <Text style={styles.label}>Username</Text>
            <TextInput
              placeholder="Will be same as mobile"
              value={mobile}
              editable={false}
              style={[styles.input, styles.disabledInput]}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Password *</Text>
            <TextInput
              placeholder="Set a secure password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#999"
            />
          </Animated.View>
        </View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: buttonsAnim.fade,
              transform: [{ translateY: buttonsAnim.slide }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.submitButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#4CAF50", "#2E7D32"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Create {usertype}</Text>
              <MaterialIcons name="person-add" size={24} color="white" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={styles.cancelButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#F44336", "#D32F2F"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
              <MaterialIcons name="cancel" size={24} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  // Main container styles
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  scrollContainer: {
    paddingBottom: 40,
    paddingTop: 10,
  },

  // Header styles
  header: {
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerGradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Section container styles
  sectionContainer: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionHeader: {
    marginBottom: 20,
    borderRadius: 8,
    overflow: "hidden",
  },
  gradientHeader: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },

  // Profile image styles
  profileContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E9F0F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4A6FA5",
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  uploadContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  uploadText: {
    marginTop: 8,
    color: "#4A6FA5",
    fontWeight: "500",
    fontSize: 14,
    textAlign: "center",
  },

  // Form input styles
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A6FA5",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: "white",
    color: "#333",
  },
  disabledInput: {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    overflow: "hidden",
  },
  datePicker: {
    backgroundColor: "white",
  },

  // Picker styles
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
    color: "#333",
  },

  // Button styles
  buttonContainer: {
    marginTop: 30,
    marginHorizontal: 16,
    marginBottom: 40,
  },
  submitButton: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
  },
  cancelButton: {
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
  },
  buttonGradient: {
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 10,
  },

  // Utility styles
  requiredIndicator: {
    color: "#F44336",
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  icon: {
    marginRight: 8,
  },
});
export default NewUser;
