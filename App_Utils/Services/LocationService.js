import * as Location from "expo-location";
import { Alert } from "react-native";

// Module-scoped “inFlight” flag to prevent duplicate calls
let inFlight = false;

const LocationService = async ({
  setLoading,
  setLatitude,
  setLongitude,
  setAddress, // optional: fn to store a human-readable address
}) => {
  if (inFlight) return;    // already running?
  inFlight = true;

  setLoading(true, "Fetching location…");
  let isFinalized = false;
  let hardTimeout = null;
  let fallbackSubscription = null;

  const finalize = () => {
    if (isFinalized) return;
    isFinalized = true;
    if (hardTimeout) clearTimeout(hardTimeout);
    if (fallbackSubscription) {
      try {
        fallbackSubscription.remove();
      } catch {
        // ignore cleanup errors
      }
    }
    setLoading(false);
    inFlight = false;
  };

  // Hard stop: never keep UI blocked beyond 10 seconds
  hardTimeout = setTimeout(() => {
    finalize();
    Alert.alert(
      "Location taking too long",
      "Could not get precise GPS in 10 seconds. You can continue and try again."
    );
  }, 10000);

  try {
    // 1️⃣ Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Please enable location permissions to automatically fill your coordinates."
      );
      return;
    }

    // 2️⃣ One-shot high-accuracy fetch
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      maximumAge: 3000,
      timeout: 8000,
    });
    const { latitude, longitude } = loc.coords;
    setLatitude(latitude.toString());
    setLongitude(longitude.toString());
    console.log("Location fetched (one-shot):", loc.coords);

    // 3️⃣ Reverse-geocode (if desired)
    if (setAddress) {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const humanAddr = [
        place.name,
        place.street,
        place.subregion,
        place.region,
        place.country,
      ]
        .filter(Boolean)
        .join(", ");
      setAddress(humanAddr);
      console.log("Resolved address:", humanAddr);
    }
  } catch (err) {
    console.warn("One-shot failed; falling back to watcher:", err);

    // Quick fallback: use last known location first (usually instant)
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        const { latitude, longitude } = lastKnown.coords;
        setLatitude(latitude.toString());
        setLongitude(longitude.toString());
      }
    } catch (lastErr) {
      console.warn("Last known location fetch failed:", lastErr);
    }

    // 4️⃣ Fallback: watch until we get ≤50 m accuracy
    fallbackSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
      },
      async (loc) => {
        if (isFinalized) return;
        const { latitude, longitude, accuracy } = loc.coords;
        if (accuracy <= 50) {
          setLatitude(latitude.toString());
          setLongitude(longitude.toString());
          console.log("Location fetched (watch):", loc.coords);
          if (fallbackSubscription) {
            fallbackSubscription.remove();
            fallbackSubscription = null;
          }

          if (setAddress) {
            const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
            const humanAddr = [
              place.name,
              place.street,
              place.subregion,
              place.region,
              place.country,
            ]
              .filter(Boolean)
              .join(", ");
            setAddress(humanAddr);
            console.log("Resolved address (watch):", humanAddr);
          }
          finalize();
        }
      }
    );
  } finally {
    // Keep watcher alive for a short period only; hard timeout/finalize will close it.
    if (!fallbackSubscription) {
      finalize();
    }
  }
};

export default LocationService;
