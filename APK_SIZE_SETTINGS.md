# APK Size Settings To Copy

The main setting that reduced this APK is in `android/gradle.properties`:

```properties
reactNativeArchitectures=arm64-v8a
```

This builds the release APK only for 64-bit ARM Android devices instead of bundling all CPU architectures:

```properties
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
```

A universal APK with all four architectures can be around 120 MB because it includes multiple copies of native libraries. The single `arm64-v8a` APK from this project is about 50 MB.

Also keep these current settings:

```properties
hermesEnabled=true
android.enablePngCrunchInReleaseBuilds=true
expo.useLegacyPackaging=false
```

Optional extra shrinking, if the other app works correctly with R8/resource shrinking:

```properties
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
```

After changing the other app, clean and rebuild:

```powershell
cd android
.\gradlew clean
.\gradlew assembleRelease
```

Note: `arm64-v8a` APKs are good for most modern phones, but they will not install on old 32-bit-only Android devices or x86 emulators. If uploading to Play Store, prefer an Android App Bundle (`.aab`) so Google Play can split architectures automatically.
