import { useState, useEffect } from 'react';
import { offlineSyncManager, SyncStatus, OfflineMutationItem } from '@/lib/offline-sync';

export function useOfflineSync() {
  const [status, setStatus] = useState<SyncStatus>(offlineSyncManager.getStatus());
  const [queue, setQueue] = useState<OfflineMutationItem[]>(offlineSyncManager.getQueue());

  useEffect(() => {
    const unsubscribe = offlineSyncManager.subscribe((newStatus, newQueue) => {
      setStatus(newStatus);
      setQueue(newQueue);
    });
    return unsubscribe;
  }, []);

  return {
    ...status,
    queue,
    sync: () => offlineSyncManager.sync(),
    enqueue: (item: Parameters<typeof offlineSyncManager.enqueue>[0]) => offlineSyncManager.enqueue(item),
    clearQueue: () => offlineSyncManager.clearQueue(),
    retryAll: () => offlineSyncManager.retryAll(),
    checkCloud: () => offlineSyncManager.checkCloudReachability(),
  };
}
