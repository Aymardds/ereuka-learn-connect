import { useState } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Database,
  ArrowUpCircle,
} from 'lucide-react';

interface OfflineSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfflineSyncModal({ open, onOpenChange }: OfflineSyncModalProps) {
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingCount,
    cloudReachable,
    queue,
    sync,
    clearQueue,
    retryAll,
    checkCloud,
  } = useOfflineSync();

  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    await checkCloud();
    setIsChecking(false);
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Jamais';
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(isoString));
    } catch (e) {
      return isoString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Centre de Synchronisation</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Gestion du mode hors-ligne et synchronisation cloud Supabase
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Connectivity Status Cards */}
        <div className="grid grid-cols-2 gap-3 my-3">
          <div className="rounded-xl border border-border p-3.5 bg-card/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Wifi className="h-4 w-4" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                  <WifiOff className="h-4 w-4" />
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground font-medium">Connexion Internet</div>
                <div className="text-sm font-semibold text-foreground">
                  {isOnline ? 'En ligne' : 'Hors-ligne'}
                </div>
              </div>
            </div>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </div>

          <div className="rounded-xl border border-border p-3.5 bg-card/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {cloudReachable ? (
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Cloud className="h-4 w-4" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <CloudOff className="h-4 w-4" />
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground font-medium">Cloud Supabase</div>
                <div className="text-sm font-semibold text-foreground">
                  {cloudReachable ? 'Connecté' : isOnline ? 'En attente' : 'Inaccessible'}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCheck}
              disabled={isChecking || !isOnline}
              className="h-7 px-2 text-xs"
              title="Tester la connexion au serveur"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Sync Summary Banner */}
        <div className="rounded-xl bg-secondary/40 border border-border/80 p-3.5 flex items-center justify-between text-xs mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Dernière synchronisation :</span>
            <span className="font-semibold text-foreground">{formatDate(lastSyncTime)}</span>
          </div>
          <div className="font-semibold">
            {pendingCount > 0 ? (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {pendingCount} en attente
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                À jour
              </span>
            )}
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px] max-h-[220px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Modifications en file d'attente ({queue.length})
          </div>

          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border border-dashed rounded-xl">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-medium">Toutes les données sont synchronisées</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vos saisies récentes sont enregistrées en sécurité dans le Cloud Eurêka.
              </p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border p-3 bg-card text-xs flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground truncate">{item.description}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-[10px]">
                      {item.table}
                    </span>
                    <span>•</span>
                    <span>{formatDate(item.timestamp)}</span>
                    {item.lastError && (
                      <span className="text-rose-500 truncate max-w-[200px]" title={item.lastError}>
                        ⚠️ {item.lastError}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {item.status === 'syncing' ? (
                    <span className="inline-flex items-center gap-1 text-primary text-[11px] font-medium">
                      <RefreshCw className="h-3 w-3 animate-spin" /> En cours...
                    </span>
                  ) : item.status === 'error' ? (
                    <span className="inline-flex items-center gap-1 text-rose-500 text-[11px] font-medium bg-rose-500/10 px-2 py-0.5 rounded">
                      Erreur
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-500 text-[11px] font-medium bg-amber-500/10 px-2 py-0.5 rounded">
                      En attente
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="mt-4 pt-3 border-t border-border flex items-center justify-between sm:justify-between w-full">
          <div>
            {queue.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearQueue}
                className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Vider la file
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {queue.some((q) => q.status === 'error') && (
              <Button variant="outline" size="sm" onClick={retryAll} className="text-xs gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Réessayer les erreurs
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => sync()}
              disabled={isSyncing || !isOnline || pendingCount === 0}
              className="text-xs font-semibold gap-2 bg-primary text-primary-foreground"
            >
              <ArrowUpCircle className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
