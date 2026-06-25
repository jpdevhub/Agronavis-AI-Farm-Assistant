import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OfflineFarm {
  id: string;
  name: string;
  total_area: number;
  location?: {
    latitude?: number;
    longitude?: number;
    state?: string;
    district?: string;
    village?: string;
    polygon?: Array<{ lat: number; lng: number }>;
    center_latitude?: number;
    center_longitude?: number;
    area_acres?: number;
  };
  soil_type?: string;
  irrigation_type?: string;
  [key: string]: any;
}

export interface OfflineCropScan {
  id: string;
  farm_id: string;
  crop_id?: string;
  detected_disease: string;
  confidence_score: number;
  recommendation: string;
  scan_date: string;
  farms?: { name: string };
  [key: string]: any;
}

export interface OfflineField {
  id: string;
  farm_id: string;
  name: string;
  area_acres: number;
  area_hectares?: number;
  polygon: Array<{ lat: number; lng: number }>;
  center_latitude?: number;
  center_longitude?: number;
  [key: string]: any;
}

interface AgroNavisSchema extends DBSchema {
  farms: {
    key: string;
    value: OfflineFarm;
  };
  'crop-scans': {
    key: string;
    value: OfflineCropScan;
    indexes: { 'by-farm': string };
  };
  fields: {
    key: string;
    value: OfflineField;
    indexes: { 'by-farm': string };
  };
}

const DB_NAME = 'agronavis-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AgroNavisSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<AgroNavisSchema>> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available on the server'));
  }
  if (!dbPromise) {
    dbPromise = openDB<AgroNavisSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create farms store
        if (!db.objectStoreNames.contains('farms')) {
          db.createObjectStore('farms', { keyPath: 'id' });
        }
        // Create crop-scans store
        if (!db.objectStoreNames.contains('crop-scans')) {
          const scanStore = db.createObjectStore('crop-scans', { keyPath: 'id' });
          scanStore.createIndex('by-farm', 'farm_id');
        }
        // Create fields store
        if (!db.objectStoreNames.contains('fields')) {
          const fieldStore = db.createObjectStore('fields', { keyPath: 'id' });
          fieldStore.createIndex('by-farm', 'farm_id');
        }
      },
    }).catch((error) => {
      console.error('Failed to open IndexedDB:', error);
      dbPromise = null; // Reset so next call retries
      throw error;
    });
  }
  return dbPromise;
}

// Helper methods for Farms
export async function getOfflineFarms(): Promise<OfflineFarm[]> {
  try {
    const db = await getDB();
    return await db.getAll('farms');
  } catch (error) {
    console.error('Error fetching offline farms:', error);
    return [];
  }
}

export async function saveOfflineFarms(farms: OfflineFarm[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('farms', 'readwrite');
    const store = tx.objectStore('farms');
    
    // Clear old farms and write new ones to maintain sync with latest API fetch
    await store.clear();
    for (const farm of farms) {
      if (farm && farm.id) {
        await store.put(farm);
      }
    }
    await tx.done;
  } catch (error) {
    console.error('Error saving offline farms:', error);
  }
}

// Helper methods for Fields
export async function getOfflineFields(farmId: string): Promise<OfflineField[]> {
  try {
    const db = await getDB();
    return await db.getAllFromIndex('fields', 'by-farm', farmId);
  } catch (error) {
    console.error(`Error fetching offline fields for farm ${farmId}:`, error);
    return [];
  }
}

export async function saveOfflineFields(farmId: string, fields: OfflineField[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('fields', 'readwrite');
    const store = tx.objectStore('fields');
    
    // Delete existing fields for this specific farm first to keep database synced
    const index = store.index('by-farm');
    const keys = await index.getAllKeys(farmId);
    for (const key of keys) {
      await store.delete(key);
    }
    
    // Put the updated ones
    for (const field of fields) {
      if (field && field.id) {
        field.farm_id = farmId;
        await store.put(field);
      }
    }
    await tx.done;
  } catch (error) {
    console.error(`Error saving offline fields for farm ${farmId}:`, error);
  }
}

// Helper methods for Crop Scans
export async function getOfflineCropScans(farmId?: string): Promise<OfflineCropScan[]> {
  try {
    const db = await getDB();
    if (farmId) {
      return await db.getAllFromIndex('crop-scans', 'by-farm', farmId);
    }
    return await db.getAll('crop-scans');
  } catch (error) {
    console.error('Error fetching offline crop scans:', error);
    return [];
  }
}

export async function saveOfflineCropScans(scans: OfflineCropScan[], farmId?: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('crop-scans', 'readwrite');
    const store = tx.objectStore('crop-scans');
    
    if (farmId) {
      // Clear scans specifically for this farm to sync with farm-filtered list
      const index = store.index('by-farm');
      const keys = await index.getAllKeys(farmId);
      for (const key of keys) {
        await store.delete(key);
      }
    } else {
      // Clear all scans if storing a global/all scan list fetch
      await store.clear();
    }
    
    for (const scan of scans) {
      if (scan && scan.id) {
        if (farmId) {
          scan.farm_id = farmId;
        }
        await store.put(scan);
      }
    }
    await tx.done;
  } catch (error) {
    console.error('Error saving offline crop scans:', error);
  }
}

export async function addOfflineCropScan(scan: OfflineCropScan): Promise<void> {
  try {
    const db = await getDB();
    await db.put('crop-scans', scan);
  } catch (error) {
    console.error('Error adding single offline crop scan:', error);
  }
}