// import React from "react";
// import { StatusBar } from "expo-status-bar";
// import { StyleSheet, View } from "react-native";
// import { NavigationContainer } from "@react-navigation/native"; // Import here
// import StackNavigator from "./App_Utils/StackNavigator";
// import "./global.css"; // Assuming you’re using NativeWind
// import Toast from "react-native-toast-message";
// import { LoadingProvider } from "./App_Utils/Contexts/LoadingContext";
// import Loading from "./App_Utils/UI/Loading";
// import { Provider } from "react-redux";
// import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
// import { store } from "./ReduxStore";  // Ensure this is correct path
// import { LoadCartComponent } from "./App/Components/LoadCartComponent";  // Component for loading cart

// export default function App() {
//   return (
//     <Provider store={store}> {/* Make sure the Provider is wrapping the entire app */}
//       <SafeAreaProvider>
//         <SafeAreaView style={styles.container} edges={[""]}>
//           <LoadingProvider>
//             <Loading />
//             <StatusBar style="auto" />

//             {/* Wrap your StackNavigator inside NavigationContainer */}
//             <NavigationContainer>
//               <StackNavigator />
//             </NavigationContainer>

//             <Toast />
//           </LoadingProvider>
//         </SafeAreaView>
//         <LoadCartComponent /> {/* Place this component after the Provider */}
//       </SafeAreaProvider>
//     </Provider>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });


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
import { LoadCartComponent } from "./App/Components/LoadCartComponent";
import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import NoInternetScreen from "./App_Utils/UI/NoInternetScreen";
import ErrorScreen from "./App_Utils/UI/ErrorScreen";
import GlobalErrorBoundary from "./App_Utils/UI/GlobalErrorBoundary";

// ✅ NEW: Paper + dates locale
import { Provider as PaperProvider } from "react-native-paper";
import { en, registerTranslation } from "react-native-paper-dates";

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
        {/* Wrap the UI tree in PaperProvider */}
        <PaperProvider>
          <SafeAreaView style={styles.container} /* edges={['top','bottom']} */>
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
          {/* If this needs access to the Redux store (it probably does), keep it under <Provider/> */}
          <LoadCartComponent />
        </PaperProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
