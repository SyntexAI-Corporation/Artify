
export interface Note {
  id: string;
  content: string;
  timestamp: number;
}

const DB_NAME = 'ArtifyNotesDB';
const STORE_NAME = 'notes';
const DB_VERSION = 1;

const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error initializing Notes DB');
  });
};

export const getNotes = async (): Promise<Note[]> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        const notes = getAll.result as Note[];
        // Sort by timestamp desc
        notes.sort((a, b) => b.timestamp - a.timestamp);
        resolve(notes);
      };
      getAll.onerror = () => reject('Error fetching notes');
    };
    request.onerror = () => reject('Error opening DB for fetch');
  });
};

export const saveNote = async (note: Note): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ ...note, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject('Error saving note');
    };
    request.onerror = () => reject('Error opening DB for save');
  });
};

export const deleteNote = async (id: string): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject('Error deleting note');
    };
    request.onerror = () => reject('Error opening DB for delete');
  });
};

export const clearNotes = async (): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject('Error clearing notes');
    };
    request.onerror = () => reject('Error opening DB for clear');
  });
};
