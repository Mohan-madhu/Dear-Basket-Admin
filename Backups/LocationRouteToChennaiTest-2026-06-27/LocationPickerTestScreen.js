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
import MapView, { Marker, Polyline } from "react-native-maps";
import { Check, Clock3, Crosshair, MapPin, Route as RouteIcon } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SAVED_LOCATION_KEY = "test_selected_map_location";
const CHENNAI_DESTINATION = {
  latitude: 13.0827,
  longitude: 80.2707,
};
const MAP_DELTA = {
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

const normalizeCoordinate = (coordinate) => ({
  latitude: Number(coordinate.latitude),
  longitude: Number(coordinate.longitude),
});

const formatDistance = (distanceInMeters) => {
  if (distanceInMeters < 1000) return `${Math.round(distanceInMeters)} m`;
  return `${(distanceInMeters / 1000).toFixed(1)} km`;
};

const formatDuration = (durationInSeconds) => {
  const totalMinutes = Math.max(1, Math.round(durationInSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  return `${hours} hr ${minutes} min`;
};

export default function LocationPickerTestScreen() {
  const mapRef = useRef(null);
  const isMountedRef = useRef(true);
  const routeRequestRef = useRef(0);
  const [pin, setPin] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const clearRoute = useCallback(() => {
    routeRequestRef.current += 1;
    setRouteCoordinates([]);
    setRouteSummary(null);
    setRouteError("");
    setRouteLoading(false);
  }, []);

  const updatePin = useCallback((coordinate, animate = false) => {
    const nextPin = normalizeCoordinate(coordinate);
    setPin(nextPin);
    setIsSaved(false);
    clearRoute();

    if (animate) {
      mapRef.current?.animateToRegion({ ...nextPin, ...MAP_DELTA }, 450);
    }
  }, [clearRoute]);

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

  const calculateRouteToChennai = async () => {
    if (!pin || routeLoading) return;

    const requestId = routeRequestRef.current + 1;
    routeRequestRef.current = requestId;
    setRouteLoading(true);
    setRouteError("");
    setRouteCoordinates([]);
    setRouteSummary(null);

    const coordinates = `${pin.longitude},${pin.latitude};${CHENNAI_DESTINATION.longitude},${CHENNAI_DESTINATION.latitude}`;
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=simplified&geometries=geojson&steps=false`;

    try {
      const response = await fetch(routeUrl);
      const data = await response.json();
      const route = data?.routes?.[0];

      if (!response.ok || data?.code !== "Ok" || !route?.geometry?.coordinates?.length) {
        throw new Error("No driving route was found for these coordinates.");
      }

      const nextRouteCoordinates = route.geometry.coordinates.map(
        ([longitude, latitude]) => ({ latitude, longitude })
      );

      if (!isMountedRef.current || requestId !== routeRequestRef.current) return;

      setRouteCoordinates(nextRouteCoordinates);
      setRouteSummary({
        distance: formatDistance(route.distance),
        duration: formatDuration(route.duration),
      });

      requestAnimationFrame(() => {
        mapRef.current?.fitToCoordinates(nextRouteCoordinates, {
          edgePadding: { top: 100, right: 45, bottom: 320, left: 45 },
          animated: true,
        });
      });
    } catch (error) {
      if (!isMountedRef.current || requestId !== routeRequestRef.current) return;
      console.log("Route calculation failed:", error?.message || error);
      setRouteError("Unable to calculate the road route right now. Please try again.");
    } finally {
      if (isMountedRef.current && requestId === routeRequestRef.current) {
        setRouteLoading(false);
      }
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
          pinColor="#0891b2"
          draggable
          title="Selected location"
          description="Drag to adjust the pin"
          onDragStart={() => setIsSaved(false)}
          onDragEnd={(event) => updatePin(event.nativeEvent.coordinate)}
        />
        <Marker
          coordinate={CHENNAI_DESTINATION}
          pinColor="#ef4444"
          title="Chennai"
          description="Fixed destination"
        />
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#0891b2"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MapPin size={20} color="#06b6d4" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Route to Chennai</Text>
            <Text style={styles.headerSubtitle}>Choose the start point and confirm the route</Text>
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
                <Text style={styles.panelLabel}>START LOCATION</Text>
                <Text style={styles.panelHint}>Tap the map or drag the start marker</Text>
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

            <View style={styles.destinationRow}>
              <View style={styles.destinationIcon}>
                <MapPin size={16} color="#fecaca" />
              </View>
              <View style={styles.destinationCopy}>
                <Text style={styles.destinationLabel}>FIXED DESTINATION</Text>
                <Text style={styles.destinationValue}>Chennai, Tamil Nadu</Text>
              </View>
              <Text style={styles.destinationCoordinate}>13.0827, 80.2707</Text>
            </View>

            {routeSummary && (
              <View style={styles.routeSummary}>
                <View style={styles.routeMetric}>
                  <RouteIcon size={17} color="#22d3ee" />
                  <View>
                    <Text style={styles.routeMetricLabel}>ROAD DISTANCE</Text>
                    <Text style={styles.routeMetricValue}>{routeSummary.distance}</Text>
                  </View>
                </View>
                <View style={styles.routeMetricDivider} />
                <View style={styles.routeMetric}>
                  <Clock3 size={17} color="#22d3ee" />
                  <View>
                    <Text style={styles.routeMetricLabel}>ESTIMATED TIME</Text>
                    <Text style={styles.routeMetricValue}>{routeSummary.duration}</Text>
                  </View>
                </View>
              </View>
            )}

            {!!routeError && <Text style={styles.routeError}>{routeError}</Text>}

            <TouchableOpacity
              style={[styles.routeButton, routeLoading && styles.disabledButton]}
              onPress={calculateRouteToChennai}
              activeOpacity={0.88}
              disabled={routeLoading}
            >
              {routeLoading ? (
                <ActivityIndicator size="small" color="#083344" />
              ) : (
                <RouteIcon size={18} color="#083344" />
              )}
              <Text style={styles.routeButtonText}>
                {routeLoading ? "Calculating Route..." : "Confirm & Show Route"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveLink} onPress={savePinnedLocation} activeOpacity={0.78}>
              <MapPin size={14} color="#67e8f9" />
              <Text style={styles.saveLinkText}>Save start coordinates on this device</Text>
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
  destinationRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  destinationIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#7f1d1d",
    alignItems: "center",
    justifyContent: "center",
  },
  destinationCopy: { flex: 1, marginLeft: 9 },
  destinationLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "800" },
  destinationValue: { color: "#f8fafc", fontSize: 13, fontWeight: "800", marginTop: 2 },
  destinationCoordinate: { color: "#94a3b8", fontSize: 10 },
  routeSummary: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  routeMetric: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  routeMetricDivider: { width: 1, height: 32, backgroundColor: "#334155", marginHorizontal: 10 },
  routeMetricLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "800" },
  routeMetricValue: { color: "#f8fafc", fontSize: 14, fontWeight: "900", marginTop: 2 },
  routeError: { color: "#fca5a5", fontSize: 11, lineHeight: 16, marginTop: 10 },
  routeButton: {
    minHeight: 48,
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: "#22d3ee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledButton: { opacity: 0.7 },
  routeButtonText: { color: "#083344", fontSize: 14, fontWeight: "900" },
  saveLink: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 5,
  },
  saveLinkText: { color: "#67e8f9", fontSize: 11, fontWeight: "700" },
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
