import type { Slot } from '../types'

// 직접 추가한 프레임은 용량이 커서 localStorage 대신 IndexedDB 에 보관한다

export interface FrameRecord {
  id: string
  name: string
  kind: 'overlay' | 'background'
  /** 긴 변 1800px 로 맞춘 PNG */
  blob: Blob
  width: number
  height: number
  /** overlay: 투명한 사진 칸 위치 */
  slots: Slot[]
  textColor: string
  createdAt: number
}

const DB_NAME = 'four-cut-studio'
const STORE = 'frames'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = action(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export function loadFrameRecords(): Promise<FrameRecord[]> {
  return run('readonly', (store) => store.getAll() as IDBRequest<FrameRecord[]>)
}

export function saveFrameRecord(record: FrameRecord): Promise<IDBValidKey> {
  return run('readwrite', (store) => store.put(record))
}

export function deleteFrameRecord(id: string): Promise<undefined> {
  return run('readwrite', (store) => store.delete(id))
}
