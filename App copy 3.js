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


import React from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet,View,Text } from "react-native";
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

// ✅ NEW: Paper + dates locale
import { Provider as PaperProvider } from "react-native-paper";
import { en, registerTranslation } from "react-native-paper-dates";

// Register a locale ONCE before render
registerTranslation("en", en);

export default function App() {
  return (


    <View className="flex-1 justify-center items-center bg-red-500">
    <Text>Test</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
