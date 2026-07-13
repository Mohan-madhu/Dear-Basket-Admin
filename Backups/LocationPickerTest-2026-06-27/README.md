# Location Picker Test Backup

This folder preserves the standalone location picker approved on 27 June 2026.

## Restore

1. Copy `LocationPickerTestScreen.js` to `App/Screens/LocationPickerTestScreen.js`.
2. Ensure these packages are installed:
   - `react-native-maps`
   - `expo-location`
   - `@react-native-async-storage/async-storage`
   - `lucide-react-native`
3. Render only the picker from `App.js` when test mode is needed:

```jsx
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LocationPickerTestScreen />
    </SafeAreaProvider>
  );
}
```

The selected coordinates are stored in AsyncStorage under
`test_selected_map_location`.
