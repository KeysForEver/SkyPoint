import { PunchRecord } from '../types';
import { savePunchRecordToFirestore } from './firebase';

const OFFLINE_PUNCHES_KEY = 'skypoint_offline_punches_queue';
const USERS_CACHE_KEY = 'skypoint_users_cache';

export function getOfflinePunches(): PunchRecord[] {
  try {
    const raw = localStorage.getItem(OFFLINE_PUNCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading offline punches:', err);
    return [];
  }
}

export function saveOfflinePunch(punch: PunchRecord): void {
  try {
    const current = getOfflinePunches();
    current.push(punch);
    localStorage.setItem(OFFLINE_PUNCHES_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Error saving offline punch:', err);
  }
}

export function removeOfflinePunch(punchId: string): void {
  try {
    const current = getOfflinePunches();
    const filtered = current.filter(p => p.id !== punchId);
    localStorage.setItem(OFFLINE_PUNCHES_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Error removing offline punch:', err);
  }
}

export function clearOfflinePunches(): void {
  localStorage.removeItem(OFFLINE_PUNCHES_KEY);
}

/**
 * Synchronizes queued offline punches to Firestore
 */
export async function syncOfflinePunches(
  onProgress?: (syncedCount: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const offlineList = getOfflinePunches();
  if (offlineList.length === 0) return { success: 0, failed: 0 };

  let successCount = 0;
  let failedCount = 0;

  for (const item of [...offlineList]) {
    try {
      const syncItem = {
        ...item,
        isOfflineSynced: true,
        syncedAt: new Date().toISOString(),
      };
      
      // Remove temporary client ID if needed, or save with original
      await savePunchRecordToFirestore(syncItem);
      removeOfflinePunch(item.id);
      successCount++;
      if (onProgress) {
        onProgress(successCount, offlineList.length);
      }
    } catch (err) {
      console.error('Failed to sync punch record:', item.id, err);
      failedCount++;
    }
  }

  return { success: successCount, failed: failedCount };
}

// User Cache for Offline Login Capability
export function cacheUsersForOffline(users: any[]): void {
  try {
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed caching users:', err);
  }
}

export function getCachedUsers(): any[] {
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
