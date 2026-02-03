import React from 'react';
import { View, Button, ScrollView, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { useToast } from 'react-native-toast-notifications';
import RootToast from 'react-native-root-toast';

const ToastDemoScreen = () => {
  const toast = useToast(); // For react-native-toast-notifications

  // 🟢 react-native-toast-message - Fully Customizable Toasts
  const showToastMessage = (type, text1, text2, bgColor) => {
    Toast.show({
      type,
      text1,
      text2,
      position: 'bottom',
      visibilityTime: 4000,
      autoHide: true,
      backgroundColor: "red", // Custom background color
    });
  };

  // 🟡 react-native-toast-notifications - Swipeable & Smooth Animations
  const showToastNotification = (type, message, bgColor, textColor) => {
    toast.show(message, {
      type,
      placement: 'top',
      duration: 4000,
      animationType: 'slide-in',
      swipeEnabled: true,
      style: { backgroundColor: bgColor },
      textStyle: { color: textColor },
    });
  };

  // 🔵 react-native-root-toast - Minimal & Fast
  const showRootToast = (message, bgColor, textColor, position) => {
    RootToast.show(message, {
      duration: RootToast.durations.LONG,
      position: position,
      backgroundColor: bgColor,
      textColor: textColor,
      opacity: 0.9,
      shadow: true,
      animation: true,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 🟢 react-native-toast-message */}
      <Button title="Toast Message (Success)" onPress={() => showToastMessage('success', 'Success!', 'This is a success toast 🎉', 'green')} />
      <Button title="Toast Message (Error)" onPress={() => showToastMessage('error', 'Error!', 'Something went wrong ❌', 'red')} />
      <Button title="Toast Message (Info)" onPress={() => showToastMessage('info', 'Info', 'This is an info message ℹ️', 'blue')} />

      {/* 🟡 react-native-toast-notifications */}
      <Button title="Toast Notifications (Success)" onPress={() => showToastNotification('success', 'Success toast 🎉', 'green', 'white')} />
      <Button title="Toast Notifications (Warning)" onPress={() => showToastNotification('warning', 'Warning toast ⚠️', 'orange', 'black')} />
      <Button title="Toast Notifications (Danger)" onPress={() => showToastNotification('danger', 'Error toast ❌', 'red', 'white')} />

      {/* 🔵 react-native-root-toast */}
      <Button title="Root Toast (Bottom)" onPress={() => showRootToast('Bottom Toast 🍞', 'black', 'white', RootToast.positions.BOTTOM)} />
      <Button title="Root Toast (Center)" onPress={() => showRootToast('Center Toast 😎', 'purple', 'white', RootToast.positions.CENTER)} />
      <Button title="Root Toast (Top)" onPress={() => showRootToast('Top Toast 🚀', 'blue', 'yellow', RootToast.positions.TOP)} />

      {/* Add Toast Component for react-native-toast-message */}
      <Toast />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
});

export default ToastDemoScreen;
