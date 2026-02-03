import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native"; // Import here
import StackNavigator from "./App_Utils/StackNavigator";
import "./global.css"; // Assuming you’re using NativeWind
import Toast from "react-native-toast-message";
import { LoadingProvider } from "./App_Utils/Contexts/LoadingContext";
import Loading from "./App_Utils/UI/Loading";
import { Provider, useDispatch } from "react-redux";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { loadCart } from "./App/Redux/CartReducer";

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadCart());
  }, [dispatch]);
  return (
    <SafeAreaProvider>
      {/* 2. Use SafeAreaView from safe-area-context */}
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Provider store={Store}>
          <LoadingProvider>
            {/* Loading Screen */}
            <Loading />
            <StatusBar style="auto" />

            {/* Wrap your StackNavigator inside NavigationContainer */}
            <NavigationContainer>
              <StackNavigator />
            </NavigationContainer>

            <Toast />
          </LoadingProvider>
        </Provider>
      </SafeAreaView>
    </SafeAreaProvider >
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
