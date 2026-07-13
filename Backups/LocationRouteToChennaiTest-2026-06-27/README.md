# Location Route to Chennai Test Backup

This backup preserves the approved standalone map test with:

- Current GPS location
- Movable start pin
- Fixed Chennai destination at `13.0827, 80.2707`
- Free OSRM driving-route calculation
- Route polyline, road distance, and estimated time
- Device storage for selected start coordinates

## Restore

1. Install `react-native-maps` using `npx expo install react-native-maps`.
2. Copy `LocationPickerTestScreen.js` to `App/Screens/LocationPickerTestScreen.js`.
3. Import and render `LocationPickerTestScreen` from `App.js`.
4. Ensure Android and iOS location permissions are configured in `app.json`.

The normal application was restored after this backup was created.
