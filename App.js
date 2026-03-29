import React, { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
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

const navigationRef = createNavigationContainerRef();

const toErrorObject = (value, fallbackMessage = "Unknown error") => {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  try {
    return new Error(JSON.stringify(value) || fallbackMessage);
  } catch {
    return new Error(fallbackMessage);
  }
};

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable payload]";
  }
};

export default function App() {
  const netInfo = useNetInfo();
  const [globalError, setGlobalError] = useState(null);
  const routeNameRef = useRef(null);

  useEffect(() => {
    const previousHandler = global.ErrorUtils?.getGlobalHandler?.();
    const previousUnhandledRejection = globalThis.onunhandledrejection;

    if (global.ErrorUtils?.setGlobalHandler) {
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        const safeError = toErrorObject(error, "Global JS error");
        const routeName = routeNameRef.current || "UnknownRoute";
        safeError.message = `[${routeName}] ${safeError.message}${
          isFatal ? " (fatal)" : ""
        }`;
        setGlobalError(safeError);
        console.error("Global error:", safeError);
      });
    }

    globalThis.onunhandledrejection = (event) => {
      const reason = event?.reason ?? "Unhandled promise rejection";
      const safeError = toErrorObject(reason, "Unhandled promise rejection");
      const routeName = routeNameRef.current || "UnknownRoute";
      safeError.message = `[${routeName}] ${safeError.message}`;
      console.error("Unhandled rejection:", safeError);
      setGlobalError(safeError);
    };

    return () => {
      if (global.ErrorUtils?.setGlobalHandler && previousHandler) {
        global.ErrorUtils.setGlobalHandler(previousHandler);
      }
      globalThis.onunhandledrejection = previousUnhandledRejection;
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
                  <NavigationContainer
                    ref={navigationRef}
                    onReady={() => {
                      try {
                        routeNameRef.current =
                          navigationRef.getCurrentRoute()?.name || null;
                      } catch (error) {
                        console.error("Navigation onReady tracking error:", error);
                      }
                    }}
                    onStateChange={() => {
                      try {
                        routeNameRef.current =
                          navigationRef.getCurrentRoute()?.name || null;
                      } catch (error) {
                        console.error(
                          "Navigation onStateChange tracking error:",
                          error
                        );
                      }
                    }}
                    onUnhandledAction={(action) => {
                      try {
                        const routeName = routeNameRef.current || "UnknownRoute";
                        const type = action?.type || "UNKNOWN_ACTION";
                        const payload = action?.payload
                          ? safeStringify(action.payload)
                          : "{}";
                        const navError = new Error(
                          `[${routeName}] Unhandled navigation action: ${type} ${payload}`
                        );
                        console.error("Navigation unhandled action:", navError);
                        setGlobalError(navError);
                      } catch (error) {
                        console.error("Navigation onUnhandledAction error:", error);
                      }
                    }}
                  >
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
