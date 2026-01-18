/**
 * IndexedDB storage service for canvas persistence.
 * Handles storage of canvas state and blob files (images, videos, etc.)
 */

const DB_NAME = 'flowscape-persistence';
const DB_VERSION = 1;
const STORE_CANVAS = 'canvas';
const STORE_BLOBS = 'blobs';

const getIndexedDB = (): IDBFactory => {
  if (typeof globalThis.indexedDB !== 'undefined') {
    return globalThis.indexedDB;
  }
  throw new Error('IndexedDB is not available in this environment');
};

export interface StoredCanvasState {
  id: string;
  state: string; // JSON serialized canvas state
  updatedAt: number;
}

export interface StoredBlob {
  id: string;
  blob: Blob;
  mimeType: string;
  originalUrl?: string | undefined;
}

export class PersistenceStorage {
  private _db: IDBDatabase | null = null;
  private _dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private _dbName: string = DB_NAME) {}

  /**
   * Initialize IndexedDB connection
   */
  public async init(): Promise<void> {
    if (this._db) return;
    if (this._dbPromise) {
      await this._dbPromise;
      return;
    }

    this._dbPromise = this._openDatabase();
    this._db = await this._dbPromise;
  }

  private _openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      let idb: IDBFactory;
      try {
        idb = getIndexedDB();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      const request = idb.open(this._dbName, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Canvas state store
        if (!db.objectStoreNames.contains(STORE_CANVAS)) {
          db.createObjectStore(STORE_CANVAS, { keyPath: 'id' });
        }

        // Blobs store
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
        }
      };
    });
  }

  private _getDb(): IDBDatabase {
    if (!this._db) {
      throw new Error('PersistenceStorage not initialized. Call init() first.');
    }
    return this._db;
  }

  // ==================== Canvas State Operations ====================

  /**
   * Save canvas state to IndexedDB
   */
  public async saveCanvasState(id: string, state: string): Promise<void> {
    const db = this._getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CANVAS], 'readwrite');
      const store = transaction.objectStore(STORE_CANVAS);

      const data: StoredCanvasState = {
        id,
        state,
        updatedAt: Date.now(),
      };

      const request = store.put(data);

      request.onerror = () => {
        reject(
          new Error(`Failed to save canvas state: ${request.error?.message ?? 'Unknown error'}`),
        );
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Load canvas state from IndexedDB
   */
  public async loadCanvasState(id: string): Promise<StoredCanvasState | null> {
    const db = this._getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CANVAS], 'readonly');
      const store = transaction.objectStore(STORE_CANVAS);
      const request = store.get(id);

      request.onerror = () => {
        reject(
          new Error(`Failed to load canvas state: ${request.error?.message ?? 'Unknown error'}`),
        );
      };

      request.onsuccess = () => {
        resolve(request.result as StoredCanvasState | null);
      };
    });
  }

  /**
   * Delete canvas state from IndexedDB
   */
  public async deleteCanvasState(id: string): Promise<void> {
    const db = this._getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CANVAS], 'readwrite');
      const store = transaction.objectStore(STORE_CANVAS);
      const request = store.delete(id);

      request.onerror = () => {
        reject(
          new Error(`Failed to delete canvas state: ${request.error?.message ?? 'Unknown error'}`),
        );
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * List all canvas states
   */
  public async listCanvasStates(): Promise<StoredCanvasState[]> {
    const db = this._getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CANVAS], 'readonly');
      const store = transaction.objectStore(STORE_CANVAS);
      const request = store.getAll();

      request.onerror = () => {
        reject(
          new Error(`Failed to list canvas states: ${request.error?.message ?? 'Unknown error'}`),
        );
      };

      request.onsuccess = () => {
        resolve(request.result as StoredCanvasState[]);
      };
    });
  }

  // ==================== Blob Operations ====================

  /**
   * Save blob to IndexedDB
   */
  public async saveBlob(id: string, blob: Blob, originalUrl?: string): Promise<void> {
    const db = this._getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_BLOBS], 'readwrite');
      const store = transaction.objectStore(STORE_BLOBS);

      const data: StoredBlob = {
        id,
        blob,
        mimeType: blob.type,
        originalUrl,
      };

      const request = store.put(data);

      request.onerror = () => {
        reject(new Error(`Failed to save blob: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Load blob from IndexedDB
   */
  public async loadBlob(id: string): Promise<StoredBlob | null> {
    const db = this._getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_BLOBS], 'readonly');
      const store = transaction.objectStore(STORE_BLOBS);
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error(`Failed to load blob: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve(request.result as StoredBlob | null);
      };
    });
  }

  /**
   * Delete blob from IndexedDB
   */
  public async deleteBlob(id: string): Promise<void> {
    const db = this._getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_BLOBS], 'readwrite');
      const store = transaction.objectStore(STORE_BLOBS);
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error(`Failed to delete blob: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Load multiple blobs by IDs
   */
  public async loadBlobs(ids: string[]): Promise<Map<string, StoredBlob>> {
    const result = new Map<string, StoredBlob>();

    for (const id of ids) {
      const blob = await this.loadBlob(id);
      if (blob) {
        result.set(id, blob);
      }
    }

    return result;
  }

  /**
   * Save multiple blobs
   */
  public async saveBlobs(blobs: Map<string, { blob: Blob; originalUrl?: string }>): Promise<void> {
    for (const [id, data] of blobs) {
      await this.saveBlob(id, data.blob, data.originalUrl);
    }
  }

  /**
   * List all blob IDs
   */
  public async listBlobIds(): Promise<string[]> {
    const db = this._getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_BLOBS], 'readonly');
      const store = transaction.objectStore(STORE_BLOBS);
      const request = store.getAllKeys();

      request.onerror = () => {
        reject(new Error(`Failed to list blob IDs: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }

  /**
   * Clear all blobs not referenced in the given set
   */
  public async cleanupUnusedBlobs(usedBlobIds: Set<string>): Promise<number> {
    const allIds = await this.listBlobIds();
    let deletedCount = 0;

    for (const id of allIds) {
      if (!usedBlobIds.has(id)) {
        await this.deleteBlob(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // ==================== Utility Methods ====================

  /**
   * Clear all data (canvas states and blobs)
   */
  public async clearAll(): Promise<void> {
    const db = this._getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CANVAS, STORE_BLOBS], 'readwrite');

      transaction.onerror = () => {
        reject(
          new Error(`Failed to clear storage: ${transaction.error?.message ?? 'Unknown error'}`),
        );
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.objectStore(STORE_CANVAS).clear();
      transaction.objectStore(STORE_BLOBS).clear();
    });
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this._db) {
      this._db.close();
      this._db = null;
      this._dbPromise = null;
    }
  }

  /**
   * Delete the entire database
   */
  public async deleteDatabase(): Promise<void> {
    this.close();

    return new Promise((resolve, reject) => {
      const request = getIndexedDB().deleteDatabase(this._dbName);

      request.onerror = () => {
        reject(
          new Error(`Failed to delete database: ${request.error?.message ?? 'Unknown error'}`),
        );
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
}
