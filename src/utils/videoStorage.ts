const DB_NAME = "JumonVideoDB";
const STORE_NAME = "videos";
const VIDEO_KEY = "avatar_video";
const DB_VERSION = 1;

interface VideoRecord {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
}

/**
 * Permanently save a video file/blob to browser IndexedDB
 */
export async function saveVideoPermanently(file: File | Blob, name: string = "avatar.mp4"): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const record: VideoRecord = {
      id: VIDEO_KEY,
      blob: file,
      name,
      type: file.type || "video/mp4",
      size: file.size,
      updatedAt: Date.now(),
    };

    const request = store.put(record);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to save video to IndexedDB"));
    };

    tx.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Retrieve the permanently saved video from IndexedDB as an object URL
 */
export async function getPermanentlySavedVideo(): Promise<{ url: string; name: string; size: number } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(VIDEO_KEY);

      request.onsuccess = () => {
        const record = request.result as VideoRecord | undefined;
        if (record && record.blob) {
          const url = URL.createObjectURL(record.blob);
          resolve({
            url,
            name: record.name,
            size: record.size,
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(request.error || new Error("Failed to get video from IndexedDB"));
      };

      tx.oncomplete = () => {
        db.close();
      };
    });
  } catch (err) {
    console.error("Error retrieving saved video:", err);
    return null;
  }
}

/**
 * Delete the permanently saved video
 */
export async function deletePermanentlySavedVideo(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(VIDEO_KEY);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error || new Error("Failed to delete video from IndexedDB"));
      };

      tx.oncomplete = () => {
        db.close();
      };
    });
  } catch (err) {
    console.error("Error deleting saved video:", err);
  }
}
