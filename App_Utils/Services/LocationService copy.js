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

  // 1️⃣ Request permission
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    setLoading(false);
    Alert.alert(
      "Permission Denied",
      "Please enable location permissions to automatically fill your coordinates."
    );
    inFlight = false;
    return;
  }

  try {
    // 2️⃣ One-shot high-accuracy fetch
    const loc = await Location.getCurrentPositionAsync({
    //   accuracy: Location.Accuracy.BestForNavigation,
    //   maximumAge: 0,
    //   timeout: 2000,
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

    // 4️⃣ Fallback: watch until we get ≤50 m accuracy
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
      },
      async (loc) => {
        const { latitude, longitude, accuracy } = loc.coords;
        if (accuracy <= 50) {
          setLatitude(latitude.toString());
          setLongitude(longitude.toString());
          console.log("Location fetched (watch):", loc.coords);
          subscription.remove();

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
        }
      }
    );
  } finally {
    setLoading(false);
    inFlight = false;
  }
};

export default LocationService;
