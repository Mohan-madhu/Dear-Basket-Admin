import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera"; // Using the new permission hook
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import Storage from "../../App_Utils/Services/StorageService";

const { width, height } = Dimensions.get("window");
const SCAN_BOX_SIZE = Math.min(width * 0.8, 300);

export default function QRScanner() {
  const navigation = useNavigation;
  const [permission, requestPermission] = useCameraPermissions(); // New permission hook
  const [scanned, setScanned] = useState(false);
  const [ROLE, setROLE] = useState("");
  const [qrData, setQrData] = useState("user-id-12345");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isReady, setIsReady] = useState(false); // Added ready state
  const scanLinePosition = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(1);
  const cameraRef = React.useRef(null);

  const getRole = async () => {
    const ROLE = await Storage.getData("ROLE");
    const id = await Storage.getData("USERID");
    setROLE(ROLE);
    setQrData(id);
  };

  useEffect(() => {
    getRole();
  }, []);

  useEffect(() => {
    // Initialize camera only when permission is granted
    if (permission?.granted) {
      setIsReady(true);

      scanLinePosition.value = withRepeat(
        withTiming(SCAN_BOX_SIZE - 4, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );

      if (ROLE === "USER") {
        scaleValue.value = withRepeat(
          withTiming(1.05, { duration: 2000, easing: Easing.ease }),
          -1,
          true
        );
      }
    }
  }, [permission, ROLE]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePosition.value }],
    opacity: interpolate(
      scanLinePosition.value,
      [0, SCAN_BOX_SIZE / 2, SCAN_BOX_SIZE],
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    ),
  }));

  const qrCodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: opacityValue.value,
  }));

  const nav = useNavigation();

  const handleBarcodeScanned = ({ type, data }) => {
    setScanned(true);
    opacityValue.value = withTiming(0.5, { duration: 300 });
    setTimeout(() => {
      opacityValue.value = withTiming(1, { duration: 300 });
    }, 1000);
    alert(`QR Code Scanned!\nType: ${type}\nData: ${data}`);

    nav.navigate("QR_Popup", {
      type, // hard-coded sample type
      data, // hard-coded sample data
    });
  };

  const toggleTorch = () => {
    setTorchEnabled(!torchEnabled);
  };

  if (!permission) {
    // Still loading permission state
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-lg text-gray-800 mt-4">
          Checking camera permissions...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Permission not granted
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-6">
        <Ionicons
          name="camera-off"
          size={48}
          color="#ef4444"
          className="mb-4"
        />
        <Text className="text-xl font-bold text-gray-800 mb-2">
          Camera Access Required
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          We need camera permissions to scan QR codes.
        </Text>
        <TouchableOpacity
          className="bg-blue-500 px-6 py-3 rounded-full"
          onPress={requestPermission}
        >
          <Text className="text-white font-medium">
            Grant Camera Permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isReady) {
    // Camera is not ready yet
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-lg text-gray-800 mt-4">Preparing camera...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      {ROLE === "USER" ? (
        <LinearGradient
          colors={["#1e3a8a", "#3b82f6"]}
          className="flex-1 justify-center items-center p-6"
        >
          <Animated.View
            style={[qrCodeStyle]}
            className="bg-white p-6 rounded-2xl shadow-xl"
          >
            <Text className="text-xl font-bold text-center text-blue-900 mb-4">
              Your Identity QR Code
            </Text>

            <QRCode
              value={qrData}
              size={SCAN_BOX_SIZE * 0.9}
              color="#1e40af"
              backgroundColor="white"
              ecl="L"
            />

            <Text className="mt-4 text-blue-800 text-center">
              Show this code to verify your identity
            </Text>
          </Animated.View>

          <View className="mt-8 flex-row items-center">
            <Ionicons name="information-circle" size={24} color="white" />
            <Text className="text-white ml-2 text-center">
              This QR contains your unique identification code
            </Text>
          </View>
        </LinearGradient>
      ) : (
        <View className="flex-1">
          <CameraView
            ref={cameraRef}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr", "pdf417"] }}
            style={StyleSheet.absoluteFill}
            torchEnabled={torchEnabled}
            onCameraReady={() => setIsReady(true)}
          />

          {/* Overlay with cutout */}
          <View className="absolute top-0 left-0 right-0 bottom-0 justify-center items-center">
            {/* Semi-transparent overlay */}
            <View
              style={StyleSheet.absoluteFillObject}
              className="bg-black opacity-50"
            />

            {/* Transparent cutout */}
            <View
              className="rounded-xl"
              style={{
                width: SCAN_BOX_SIZE,
                height: SCAN_BOX_SIZE,
                backgroundColor: "transparent",
              }}
            >
              {/* Animated scan line */}
              <Animated.View
                style={[
                  styles.scanLine,
                  scanLineStyle,
                  { width: SCAN_BOX_SIZE - 8 },
                ]}
              />

              {/* Corner decorations */}
              <View className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-400 rounded-tl-xl" />
              <View className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-400 rounded-tr-xl" />
              <View className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-400 rounded-bl-xl" />
              <View className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-400 rounded-br-xl" />
            </View>

            {/* Instructions */}
            <View className="absolute top-16 w-full px-8">
              <Text className="text-white text-center text-xl font-bold">
                Scan QR Code
              </Text>
              <Text className="text-gray-300 text-center mt-2">
                Align the QR code within the frame
              </Text>
            </View>

            {/* Flash toggle */}
            {/* <TouchableOpacity
              className="absolute top-12 right-6 bg-gray-800 p-3 rounded-full"
              onPress={toggleTorch}
            >
              <Ionicons
                name={torchEnabled ? "flashlight" : "flashlight-outline"}
                size={24}
                color="white"
              />
            </TouchableOpacity> */}
          </View>

          {scanned && (
            <Animated.View
              style={[{ opacity: opacityValue.value }]}
              className="absolute bottom-24 self-center bg-white px-6 py-3 rounded-full shadow-lg"
            >
              <TouchableOpacity onPress={() => setScanned(false)}>
                <Text className="text-blue-600 font-bold">
                  Tap to Scan Again
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scanLine: {
    height: 3,
    backgroundColor: "#3b82f6",
    borderRadius: 3,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
});
