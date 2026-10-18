import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';

/**
 * Initializes native Capacitor capabilities when running inside Android or iOS.
 * Safely handles web browsers without crashing.
 */
export async function initNativeFeatures() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Hide splash screen smoothly after app mounts
    await SplashScreen.hide({
      fadeOutDuration: 400
    });
  } catch (e) {
    console.warn("Could not hide native splash screen:", e);
  }
}

/**
 * Requests microphone permission natively on Android (API 23+ runtime permission).
 * Falls back gracefully to browser getUserMedia when running in standard browser.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  // If running on native platform (Android/Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      }
    } catch (err) {
      console.warn("Native microphone permission request failed:", err);
      return false;
    }
  }

  // Web fallback
  try {
    if (navigator?.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Web microphone permission request failed:", err);
    return false;
  }
}

/**
 * Checks current network connectivity status.
 */
export async function checkNetworkStatus(): Promise<{ connected: boolean; connectionType: string }> {
  try {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType
    };
  } catch (e) {
    // Fallback to browser navigator.onLine
    return {
      connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionType: 'unknown'
    };
  }
}

/**
 * Subscribes to network status changes.
 */
export function onNetworkStatusChange(callback: (connected: boolean) => void) {
  try {
    const listener = Network.addListener('networkStatusChange', status => {
      callback(status.connected);
    });
    return () => {
      listener.then(handle => handle.remove()).catch(() => {});
    };
  } catch (e) {
    const onlineHandler = () => callback(true);
    const offlineHandler = () => callback(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }
}
