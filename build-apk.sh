#!/usr/bin/env bash
set -e

echo "=== 1. Installing OpenJDK 21 ==="
apt-get update -qq && apt-get install -y -qq --no-install-recommends openjdk-21-jdk-headless unzip curl >/dev/null 2>&1

export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
ln -sf $JAVA_HOME/bin/java /usr/local/bin/java
ln -sf $JAVA_HOME/bin/javac /usr/local/bin/javac

echo "=== 2. Setting up Android SDK ==="
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

ln -sf $ANDROID_HOME/platform-tools/adb /usr/local/bin/adb

echo "sdk.dir=$ANDROID_HOME" > android/local.properties

echo "=== 4. Syncing Web Assets ==="
npm run build
npx cap sync android

echo "=== 5. Building Debug APK with Gradle ==="
cd android
chmod +x gradlew
./gradlew assembleDebug

cd ..
cp -f android/app/build/outputs/apk/debug/app-debug.apk ./app-debug.apk

echo "=== SUCCESS: APK Generated ==="
ls -lh android/app/build/outputs/apk/debug/app-debug.apk ./app-debug.apk
