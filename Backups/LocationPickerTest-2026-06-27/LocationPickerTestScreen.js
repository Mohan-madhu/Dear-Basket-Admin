import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { Check, Crosshair, MapPin } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SAVED_LOCATION_KEY = "test_selected_map_location";
const MAP_DELTA = {
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

const normalizeCoordinate = (coordinate) => ({
  latitude: Number(coordinate.latitude),
  longitude: Number(coordinate.longitude),
});

export default function LocationPickerTestScreen() {
  const mapRef = useRef(null);
  const isMountedRef = useRef(true);
  const [pin, setPin] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const updatePin = useCallback((coordinate, animate = false) => {
    const nextPin = normalizeCoordinate(coordinate);
    setPin(nextPin);
    setIsSaved(false);

    if (animate) {
      mapRef.current?.animateToRegion({ ...nextPin, ...MAP_DELTA }, 450);
    }
  }, []);

  const loadCurrentLocation = useCallback(async () => {
    try {
      setLoadingLocation(true);
      setLocationError("");

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationError("Location permission is required to show your current position.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (isMountedRef.current) {
        updatePin(location.coords, true);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setLocationError("Unable to get your current location. Check GPS and try again.");
      }
      console.log("Location picker GPS error:", error?.message || error);
    } finally {
      if (isMountedRef.current) setLoadingLocation(false);
    }
  }, [updatePin]);

  useEffect(() => {
    loadCurrentLocation();
  }, [loadCurrentLocation]);

  const savePinnedLocation = async () => {
    if (!pin) return;

    try {
      await AsyncStorage.setItem(
        SAVED_LOCATION_KEY,
        JSON.stringify({ ...pin, savedAt: new Date().toISOString() })
      );
      setIsSaved(true);
      Alert.alert("Location Saved", "The pinned latitude and longitude were saved on this device.");
    } catch (error) {
      console.log("Location picker save error:", error?.message || error);
      Alert.alert("Save Failed", "Unable to save this location. Please try again.");
    }
  };

  if (!pin && loadingLocation) {
    return (
      <SafeAreaView style={styles.centeredState}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.stateTitle}>Finding your location</Text>
        <Text style={styles.stateText}>Keep GPS enabled while the map is prepared.</Text>
      </SafeAreaView>
    );
  }

  if (!pin) {
    return (
      <SafeAreaView style={styles.centeredState}>
        <View style={styles.stateIcon}>
          <MapPin size={30} color="#0891b2" />
        </View>
        <Text style={styles.stateTitle}>Location unavailable</Text>
        <Text style={styles.stateText}>{locationError}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={loadCurrentLocation} activeOpacity={0.85}>
          <Crosshair size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Try Current Location</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={Linking.openSettings} activeOpacity={0.75}>
          <Text style={styles.settingsText}>Open device settings</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...pin, ...MAP_DELTA }}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={(event) => updatePin(event.nativeEvent.coordinate)}
      >
        <Marker
          coordinate={pin}
          draggable
          title="Selected location"
          description="Drag to adjust the pin"
          onDragStart={() => setIsSaved(false)}
          onDragEnd={(event) => updatePin(event.nativeEvent.coordinate)}
        />
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MapPin size={20} color="#06b6d4" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Pin Delivery Location</Text>
            <Text style={styles.headerSubtitle}>Tap the map or drag the marker</Text>
          </View>
        </View>

        <View style={styles.bottomArea} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.locateButton}
            onPress={loadCurrentLocation}
            activeOpacity={0.85}
            accessibilityLabel="Use current location"
          >
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Crosshair size={21} color="#0f172a" />
            )}
          </TouchableOpacity>

          <View style={styles.coordinatePanel}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelLabel}>SELECTED COORDINATES</Text>
                <Text style={styles.panelHint}>Stored locally when you press save</Text>
              </View>
              {isSaved && (
                <View style={styles.savedBadge}>
                  <Check size={13} color="#0f766e" />
                  <Text style={styles.savedBadgeText}>Saved</Text>
                </View>
              )}
            </View>

            <View style={styles.coordinateRow}>
              <View style={styles.coordinateBlock}>
                <Text style={styles.coordinateLabel}>Latitude</Text>
                <Text selectable style={styles.coordinateValue}>{pin.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordinateDivider} />
              <View style={styles.coordinateBlock}>
                <Text style={styles.coordinateLabel}>Longitude</Text>
                <Text selectable style={styles.coordinateValue}>{pin.longitude.toFixed(6)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={savePinnedLocation}
              activeOpacity={0.88}
            >
              <MapPin size={18} color="#083344" />
              <Text style={styles.saveButtonText}>Save Pinned Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e2e8f0" },
  overlay: { flex: 1, justifyContent: "space-between" },
  header: {
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    flexDirection: "row",
    alignItems: "center",
    elevation: 8,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#164e63",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, marginLeft: 11 },
  headerTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
  headerSubtitle: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  bottomArea: { paddingHorizontal: 14, paddingBottom: 10 },
  locateButton: {
    alignSelf: "flex-end",
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 7,
  },
  coordinatePanel: {
    borderRadius: 8,
    padding: 15,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    elevation: 12,
  },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  panelLabel: { color: "#67e8f9", fontSize: 11, fontWeight: "900" },
  panelHint: { color: "#94a3b8", fontSize: 11, marginTop: 3 },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ccfbf1",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  savedBadgeText: { color: "#0f766e", fontSize: 11, fontWeight: "800" },
  coordinateRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  coordinateBlock: { flex: 1 },
  coordinateDivider: { width: 1, backgroundColor: "#334155", marginHorizontal: 12 },
  coordinateLabel: { color: "#94a3b8", fontSize: 11, marginBottom: 5 },
  coordinateValue: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
  saveButton: {
    minHeight: 48,
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: "#22d3ee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonText: { color: "#083344", fontSize: 14, fontWeight: "900" },
  centeredState: {
    flex: 1,
    paddingHorizontal: 30,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#cffafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  stateTitle: { color: "#0f172a", fontSize: 20, fontWeight: "900", marginTop: 18 },
  stateText: { color: "#64748b", fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 7 },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    marginTop: 22,
    borderRadius: 8,
    backgroundColor: "#0891b2",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  settingsText: { color: "#0e7490", fontSize: 13, fontWeight: "700", marginTop: 18 },
});
