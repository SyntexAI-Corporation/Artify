
export interface GalleryItem {
  id: string;
  url: string; // Base64 data URL
  type: 'generated' | 'edited';
  timestamp: number;
  prompt?: string;
}

export interface SketchbookDraft {
  id: string; // 'latest'
  layers: { id: string; visible: boolean; opacity: number }[];
  canvasSize: { width: number; height: number };
  layerImages: Record<string, string>; // id -> base64
  backgroundColor: 'white' | 'black' | 'transparent';
  timestamp: number;
}

const DB_NAME = 'ArtifyDB';
const STORE_NAME = 'images';
const DRAFT_STORE = 'drafts';
const DB_VERSION = 2; // Bump version to add drafts store

// Initialize IndexedDB
export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error initializing DB');
  });
};

// Helper to convert Blob URL or Remote URL to Base64
export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
            resolve(reader.result as string);
        } else {
            reject("Failed to convert blob to base64");
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Conversion failed", e);
    // If it's already a data URL or fails fetch, try returning as is if valid
    if (url.startsWith('data:')) return url;
    throw e;
  }
};

export const saveToGallery = async (item: GalleryItem): Promise<void> => {
  await initDB();
  
  // Ensure we are storing Base64, not blob URLs that expire
  let storageItem = { ...item };
  if (!item.url.startsWith('data:')) {
     try {
         const base64 = await urlToBase64(item.url);
         storageItem.url = base64;
     } catch (e) {
         console.warn("Could not convert to base64, attempting to store original URL", e);
     }
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(storageItem);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject('Error saving to gallery');
    };
    request.onerror = () => reject('Error opening DB for save');
  });
};

export const getGalleryImages = async (): Promise<GalleryItem[]> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        // Sort by timestamp desc
        const items = getAll.result as GalleryItem[];
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items);
      };
      getAll.onerror = () => reject('Error fetching gallery');
    };
    request.onerror = () => reject('Error opening DB for fetch');
  });
};

export const deleteFromGallery = async (id: string): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject('Error deleting item from gallery');
    };
    request.onerror = () => reject('Error opening DB for deletion');
  });
};

export const clearGallery = async (): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject('Error clearing gallery');
    };
    request.onerror = () => reject('Error opening DB for clear');
  });
};

// --- Draft Methods ---

export const saveSketchbookDraft = async (draft: SketchbookDraft): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      const store = tx.objectStore(DRAFT_STORE);
      store.put({ ...draft, id: 'latest' }); // Always overwrite 'latest'
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject('Error saving draft');
    };
    request.onerror = () => reject('Error opening DB for draft save');
  });
};

export const getSketchbookDraft = async (): Promise<SketchbookDraft | null> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(DRAFT_STORE, 'readonly');
      const store = tx.objectStore(DRAFT_STORE);
      const get = store.get('latest');
      get.onsuccess = () => resolve(get.result || null);
      get.onerror = () => reject('Error fetching draft');
    };
    request.onerror = () => reject('Error opening DB for draft fetch');
  });
};

export const deleteSketchbookDraft = async (): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      const store = tx.objectStore(DRAFT_STORE);
      store.delete('latest');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject('Error deleting draft');
    };
    request.onerror = () => reject('Error opening DB for draft delete');
  });
};
