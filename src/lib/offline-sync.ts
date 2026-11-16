import { supabase } from './supabase';
import { toast } from 'sonner';

export interface OfflineMutationItem {
  id: string;
  table: string;
  action: 'insert' | 'upsert' | 'update' | 'delete';
  data: any;
  options?: any;
  timestamp: string;
  description: string;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  attempts: number;
  lastError?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  cloudReachable: boolean;
}

const STORAGE_KEY_QUEUE = 'eureka_offline_mutation_queue_v1';
const STORAGE_KEY_LAST_SYNC = 'eureka_last_sync_timestamp';

type SyncListener = (status: SyncStatus, queue: OfflineMutationItem[]) => void;

class OfflineSyncManager {
  private queue: OfflineMutationItem[] = [];
  private isSyncing = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private cloudReachable = false;
  private listeners: Set<SyncListener> = new Set();
  private autoSyncInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadQueue();
      this.setupEventListeners();
      this.checkCloudReachability();
    }
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_QUEUE);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load offline sync queue from localStorage', e);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save offline sync queue', e);
    }
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.checkCloudReachability().then(() => {
        if (this.queue.length > 0) {
          toast.info('Connexion internet rétablie. Synchronisation des données en cours...');
          this.sync();
        }
      });
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.cloudReachable = false;
      this.notifyListeners();
    });

    // Auto-sync polling every 45 seconds if online and items are pending
    this.autoSyncInterval = setInterval(() => {
      if (this.isOnline && this.getPendingCount() > 0 && !this.isSyncing) {
        this.sync();
      }
    }, 45000);
  }

  public async checkCloudReachability(): Promise<boolean> {
    if (!this.isOnline) {
      this.cloudReachable = false;
      this.notifyListeners();
      return false;
    }

    try {
      // Ping Supabase to verify active connection
      const { error } = await supabase.from('tenants').select('id').limit(1);
      this.cloudReachable = !error || error.code !== 'PGRST301';
    } catch (e) {
      this.cloudReachable = false;
    }
    this.notifyListeners();
    return this.cloudReachable;
  }

  /**
   * Queue a mutation to be sent to Supabase.
   * If online, attempts immediate sync. If offline, stores safely in localStorage.
   */
  public async enqueue(item: {
    table: string;
    action: 'insert' | 'upsert' | 'update' | 'delete';
    data: any;
    options?: any;
    description: string;
  }): Promise<{ queuedLocally: boolean; success: boolean; error?: string }> {
    const queueItem: OfflineMutationItem = {
      id: crypto.randomUUID(),
      table: item.table,
      action: item.action,
      data: item.data,
      options: item.options,
      description: item.description,
      timestamp: new Date().toISOString(),
      status: 'pending',
      attempts: 0,
    };

    this.queue.push(queueItem);
    this.saveQueue();

    // If online, attempt to sync immediately
    if (this.isOnline) {
      try {
        await this.syncItem(queueItem);
        return { queuedLocally: false, success: true };
      } catch (err: any) {
        console.warn('Immediate sync failed, keeping in offline queue:', err);
        return { queuedLocally: true, success: false, error: err.message };
      }
    } else {
      toast.warning(`Mode Hors-ligne : "${item.description}" sauvegardé localement. Il sera synchronisé dès le retour d'internet.`);
      return { queuedLocally: true, success: true };
    }
  }

  private async syncItem(item: OfflineMutationItem): Promise<void> {
    item.status = 'syncing';
    item.attempts += 1;
    this.saveQueue();

    let query: any;
    switch (item.action) {
      case 'insert':
        query = supabase.from(item.table).insert(item.data);
        break;
      case 'upsert':
        query = supabase.from(item.table).upsert(item.data, item.options);
        break;
      case 'update':
        if (item.options?.match) {
          query = supabase.from(item.table).update(item.data).match(item.options.match);
        } else if (item.data.id) {
          query = supabase.from(item.table).update(item.data).eq('id', item.data.id);
        } else {
          throw new Error('Update requires an id or match criteria');
        }
        break;
      case 'delete':
        if (item.options?.match) {
          query = supabase.from(item.table).delete().match(item.options.match);
        } else if (item.data?.id) {
          query = supabase.from(item.table).delete().eq('id', item.data.id);
        } else {
          throw new Error('Delete requires an id or match criteria');
        }
        break;
      default:
        throw new Error(`Unknown action: ${item.action}`);
    }

    const { error } = await query;
    if (error) {
      item.status = 'error';
      item.lastError = error.message;
      this.saveQueue();
      throw error;
    }

    item.status = 'synced';
    // Remove synced item from active queue
    this.queue = this.queue.filter(q => q.id !== item.id);
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
    this.saveQueue();
  }

  /**
   * Sync all pending items in order
   */
  public async sync(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    if (!this.isOnline) {
      toast.warning('Synchronisation impossible : vous êtes hors-ligne.');
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    let synced = 0;
    let failed = 0;

    const pendingItems = this.queue.filter(q => q.status === 'pending' || q.status === 'error');

    for (const item of pendingItems) {
      try {
        await this.syncItem(item);
        synced += 1;
      } catch (err: any) {
        failed += 1;
        console.error(`Error syncing item ${item.description}:`, err);
        // Break on network error to prevent flooding
        if (!navigator.onLine || err.message?.includes('network') || err.message?.includes('fetch')) {
          this.isOnline = false;
          break;
        }
      }
    }

    this.isSyncing = false;
    this.notifyListeners();

    if (synced > 0) {
      toast.success(`${synced} élément(s) synchronisé(s) avec succès avec la base Eurêka !`);
    }

    return { synced, failed };
  }

  public getPendingCount(): number {
    return this.queue.filter(q => q.status === 'pending' || q.status === 'error').length;
  }

  public getQueue(): OfflineMutationItem[] {
    return [...this.queue];
  }

  public clearQueue() {
    this.queue = [];
    this.saveQueue();
    toast.info('File de synchronisation vidée');
  }

  public retryAll() {
    this.queue.forEach(item => {
      if (item.status === 'error') {
        item.status = 'pending';
        item.lastError = undefined;
      }
    });
    this.saveQueue();
    this.sync();
  }

  public getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LAST_SYNC) : null,
      pendingCount: this.getPendingCount(),
      cloudReachable: this.cloudReachable,
    };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus(), this.getQueue());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const status = this.getStatus();
    const queue = this.getQueue();
    this.listeners.forEach(fn => fn(status, queue));
  }
}

export const offlineSyncManager = new OfflineSyncManager();
