# MD JUMON - AI Voice Assistant (Android Native App)

JUMON AI is a sassy, witty, and intelligent Bangladeshi female AI voice assistant powered by Google Gemini, created for **MD Jumon**. Built with React 19, Vite, Tailwind CSS, and packaged as a native Android APK using Capacitor.

---

## 📱 Pre-Built APK

The debug APK is already built and ready in the project root:
- `./app-debug.apk`

---

## 🚀 How to Build the APK

### Prerequisites
1. **Node.js**: v18 or v20+
2. **Java Development Kit**: OpenJDK 21
3. **Android SDK**: Android 14+ (API 34/36) build tools and platform tools
4. **Android Command-line tools**: `cmdline-tools;latest`

### Option 1: Automated Script (Recommended)
From the root directory of the project, run:
```bash
./build-apk.sh
```
This script will:
- Check and prepare OpenJDK 21 and Android SDK command-line tools.
- Auto-generate the release keystore (`android/app/release.keystore`) if not already present.
- Build the web assets with `npm run build`.
- Synchronize Capacitor native assets with `npx cap sync android`.
- Compile both the **Signed Release APK** and **Debug APK** using Gradle.
- Output:
  - `./app-release.apk` (Signed Release APK ready for distribution)
  - `./app-debug.apk` (Debug APK for testing)

---

### Option 2: Step-by-Step Shell Commands from a Clean Clone

```bash
# 1. Install dependencies
npm install

# 2. Build web bundle
npm run build

# 3. Synchronize native Android platform
npx cap sync android

# 4. Generate release keystore (one-time setup if not present)
keytool -genkeypair -v \
  -keystore android/app/release.keystore \
  -alias jumonkey \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass jumon1234 \
  -keypass jumon1234 \
  -dname "CN=MD JUMON, OU=Engineering, O=Jumon, L=Dhaka, S=Dhaka, C=BD"

# 5. Build Signed Release APK
cd android
chmod +x gradlew
./gradlew assembleRelease

# 6. Build Debug APK (for quick testing)
./gradlew assembleDebug

# Return to root
cd ..
```

---

## 📲 How to Run on a Device / Emulator

### Via ADB Command-line
Connect your Android device with USB debugging enabled (or boot an Android Virtual Device):
```bash
# Check connected devices
adb devices

# Install Signed Release APK
adb install -r ./app-release.apk

# Or install Debug APK
adb install -r ./app-debug.apk

# Launch the app
adb shell monkey -p com.mdjumon.app -c android.intent.category.LAUNCHER 1
```

### Via Android Studio
```bash
npx cap open android
```
Select your connected phone or emulator and click the green **Run (▶)** button.

---

## 🔒 Native Permissions & Manifest Entries

The following native permissions and feature declarations are configured in `android/app/src/main/AndroidManifest.xml`:

| Permission / Feature | Reason |
| --- | --- |
| `android.permission.INTERNET` | Mandatory for streaming audio to Gemini Multimodal Live WebSocket and Gemini TTS endpoints. |
| `android.permission.RECORD_AUDIO` | Required by Android runtime (API 23+) for microphone audio streaming. |
| `android.permission.MODIFY_AUDIO_SETTINGS` | Ensures low latency (16kHz PCM), acoustic echo cancellation, and noise suppression. |
| `android.permission.READ_EXTERNAL_STORAGE` (maxSdkVersion 32) | Allows selecting custom background video avatars on older Android versions. |
| `android.permission.READ_MEDIA_VIDEO` | Modern granular media permission for video avatar selection on Android 13+ (API 33+). |
| `<uses-feature android:name="android.hardware.microphone" android:required="false" />` | Declares microphone usage with `required="false"` so the app installs on devices with external/Bluetooth mics or text-only fallback. |
| `@capacitor/splash-screen` & `@capacitor/network` | Native splash screen prevents white flash on boot; network monitor alerts user when offline since Gemini requires internet. |
