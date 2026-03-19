import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./App_Utils/StackNavigator";
import "./global.css";
import Toast from "react-native-toast-message";
import { LoadingProvider } from "./App_Utils/Contexts/LoadingContext";
import Loading from "./App_Utils/UI/Loading";
import { Provider } from "react-redux";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { store } from "./ReduxStore";
import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import NoInternetScreen from "./App_Utils/UI/NoInternetScreen";
import ErrorScreen from "./App_Utils/UI/ErrorScreen";
import GlobalErrorBoundary from "./App_Utils/UI/GlobalErrorBoundary";

// ✅ NEW: Paper + dates locale
import { Provider as PaperProvider } from "react-native-paper";
import { en, registerTranslation } from "react-native-paper-dates";
import { LoadCartComponent } from "./App_Utils/LoadCartComponent";

// Register a locale ONCE before render
registerTranslation("en", en);

export default function App() {
  const netInfo = useNetInfo();
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    const previousHandler = global.ErrorUtils?.getGlobalHandler?.();
    if (global.ErrorUtils?.setGlobalHandler) {
      global.ErrorUtils.setGlobalHandler((error) => {
        setGlobalError(error);
        console.error("Global error:", error);
      });
    }

    return () => {
      if (global.ErrorUtils?.setGlobalHandler && previousHandler) {
        global.ErrorUtils.setGlobalHandler(previousHandler);
      }
    };
  }, []);

  const isOffline =
    netInfo.isConnected === false || netInfo.isInternetReachable === false;

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        {/* UI Theme & Paper components */}
        <PaperProvider>
          {/* ✅ Safe area applied to top + bottom + sides */}
          <SafeAreaView
            style={styles.container}
            edges={["top", "bottom", "left", "right"]}
          >
            <LoadingProvider>
              <Loading />
              <StatusBar style="auto" />

              {globalError ? (
                <ErrorScreen
                  error={globalError}
                  onRetry={() => setGlobalError(null)}
                />
              ) : isOffline ? (
                <NoInternetScreen onRetry={() => NetInfo.fetch()} />
              ) : (
                <GlobalErrorBoundary
                  onError={(error) => setGlobalError(error)}
                  onRetry={() => setGlobalError(null)}
                >
                  <NavigationContainer>
                    <StackNavigator />
                  </NavigationContainer>
                </GlobalErrorBoundary>
              )}

              <Toast />
            </LoadingProvider>
          </SafeAreaView>

          {/* Stays inside Provider, outside SafeAreaView if you want it as an overlay */}
          <LoadCartComponent />
        </PaperProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});