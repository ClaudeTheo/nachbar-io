// lib/offline-queue.ts
// Nachbar.io — Offline-Queue: speichert fehlgeschlagene POSTs in IndexedDB
// und sendet sie bei Reconnect nach.

const DB_NAME = "nachbar_offline";
const STORE_NAME = "queue";
const DB_VERSION = 1;

interface QueueEntry {
  id?: number;
  url: string;
  body: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class OfflineQueue {
  async enqueue(url: string, body: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry: QueueEntry = { url, body, createdAt: Date.now() };
    store.add(entry);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async flush(): Promise<void> {
    const db = await openDB();
    const entries = await this.getAll(db);

    for (const entry of entries) {
      try {
        const res = await fetch(entry.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: entry.body,
        });
        if (!res.ok) {
          break;
        }
        await this.delete(db, entry.id!);
      } catch {
        break;
      }
    }
    db.close();
  }

  async count(): Promise<number> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();
    const result = await new Promise<number>((resolve, reject) => {
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => reject(countReq.error);
    });
    db.close();
    return result;
  }

  private getAll(db: IDBDatabase): Promise<QueueEntry[]> {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private delete(db: IDBDatabase, id: number): Promise<void> {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/** Singleton fuer App-weite Nutzung */
export const offlineQueue = new OfflineQueue();
