#!/usr/bin/env bash
set -e

echo "=========================================="
echo " JUMON AI Native Android APK Build Script"
echo "=========================================="

echo "=== 1. Checking / Installing OpenJDK 21 ==="
if ! command -v java >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq --no-install-recommends openjdk-21-jdk-headless unzip curl >/dev/null 2>&1
fi

export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
ln -sf $JAVA_HOME/bin/java /usr/local/bin/java 2>/dev/null || true
ln -sf $JAVA_HOME/bin/javac /usr/local/bin/javac 2>/dev/null || true
ln -sf $JAVA_HOME/bin/keytool /usr/local/bin/keytool 2>/dev/null || true

echo "=== 2. Setting up Android SDK Command-Line Tools ==="
export ANDROID_HOME=/opt/android-sdk
mkdir -p $ANDROID_HOME/cmdline-tools
if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
  curl -fsSL -o /tmp/cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q /tmp/cmdline-tools.zip -d $ANDROID_HOME/cmdline-tools
  mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest
  rm -f /tmp/cmdline-tools.zip
fi

echo "=== 3. Installing SDK Platforms & Build Tools ==="
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null 2>&1 || true
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-36" "build-tools;35.0.0" >/dev/null 2>&1

ln -sf $ANDROID_HOME/platform-tools/adb /usr/local/bin/adb 2>/dev/null || true

echo "sdk.dir=$ANDROID_HOME" > android/local.properties

echo "=== 4. Ensuring Release Keystore Exists ==="
if [ ! -f "android/app/release.keystore" ]; then
  keytool -genkeypair -v \
    -keystore android/app/release.keystore \
    -alias jumonkey \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass jumon1234 \
    -keypass jumon1234 \
    -dname "CN=MD JUMON, OU=Engineering, O=Jumon, L=Dhaka, S=Dhaka, C=BD"
fi

echo "=== 5. Building Web Frontend & Syncing Capacitor ==="
npm run build
npx cap sync android

echo "=== 6. Building Signed Release APK & Debug APK ==="
cd android
chmod +x gradlew
./gradlew assembleRelease assembleDebug

cd ..
cp -f android/app/build/outputs/apk/release/app-release.apk ./app-release.apk
cp -f android/app/build/outputs/apk/debug/app-debug.apk ./app-debug.apk

echo "=========================================="
echo " BUILD SUCCESSFUL!"
echo " Signed Release APK: $(pwd)/app-release.apk"
echo " Debug APK:          $(pwd)/app-debug.apk"
echo "=========================================="
ls -lh ./app-release.apk ./app-debug.apk
