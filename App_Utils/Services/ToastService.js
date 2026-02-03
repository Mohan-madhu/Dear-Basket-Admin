import Toast from "react-native-toast-message";

const Toaster = {
  successtop: (title, message) => {
    Toast.show({
      type: "success",
      text1: title || "Success",
      text2: message || "Operation was successful 🎉",
      visibilityTime: 3000, // Show for 3 seconds
      position: "top",
      topOffset: 50,
      text1Style: { fontSize: 16, fontWeight: "bold", color: "black" },
      text2Style: { fontSize: 14, color: "green" },
      style: { backgroundColor: "green", borderRadius: 10, padding: 10 },
    });
  },

  errortop: (title, message) => {
    Toast.show({
      type: "error",
      text1: title || "Error",
      text2: message || "Something went wrong ❌",
      visibilityTime: 3000,
      position: "top",
      topOffset: 50,
      
      text1Style: { fontSize: 16, fontWeight: "bold", color: "black" },
      text2Style: { fontSize: 14, color: "red" },
      style: { backgroundColor: "red", borderRadius: 10, padding: 10 },
    });
  },

  infotop: (title, message) => {
    Toast.show({
      type: "info",
      text1: title || "Info",
      text2: message || "This is an information message ℹ️",
      visibilityTime: 3000,
      position: "top",
      topOffset: 50,
      text1Style: { fontSize: 16, fontWeight: "bold", color: "black" },
      text2Style: { fontSize: 14, color: "blue" },
      style: { backgroundColor: "blue", borderRadius: 10, padding: 10 },
    });
  },

  success: (title, message) => {
    Toast.show({
      type: "success",
      text1: title || "Success",
      text2: message || "Operation was successful 🎉",
      visibilityTime: 3000, // Show for 3 seconds
      position: "bottom",
      topOffset: 50,
      text1Style: { fontSize: 16, fontWeight: "bold", color: "black" },
      text2Style: { fontSize: 14, color: "green" },
      style: { backgroundColor: "green", borderRadius: 10, padding: 10 },
    });
  },

  error: (title, message) => {
    Toast.show({
      type: "error",
      text1: title || "Error",
      text2: message || "Something went wrong ❌",
      visibilityTime: 3000,
      position: "bottom",
      topOffset: 50,
      text1Style: { fontSize: 16, fontWeight: "bold", color: "black" },
      text2Style: { fontSize: 14, color: "red" },
      style: { backgroundColor: "red", borderRadius: 10, padding: 10 },
    });
  },

  info: (title, message) => {
    Toast.show({
      type: "info",
      text1: title || "Info",
      text2: message || "This is an information message ℹ️",
      visibilityTime: 3000,
      position: "bottom",
      topOffset: 50,
      text1Style: { fontSize: 16, fontWeight: "bold", color: "black" },
      text2Style: { fontSize: 14, color: "blue" },
      style: { backgroundColor: "blue", borderRadius: 10, padding: 10 },
    });
  },
};

export default Toaster;
