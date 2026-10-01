import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { usePaymentTerminals, CreateSessionParams } from '@/hooks/usePaymentTerminals';
import { useStudents } from '@/hooks/useStudents';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  QrCode, Terminal, Plus, Copy, ExternalLink, Clock, CheckCircle2,
  XCircle, RefreshCw, Loader2, CreditCard, Search, Banknote,
  Smartphone, Filter, AlertCircle, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Route = createFileRoute('/terminaux-paiement')({
  head: () => ({
    meta: [
      { title: 'Terminaux de Paiement — Eurêka' },
      { name: 'description', content: 'Gérez les terminaux de paiement et générez des QR codes pour les parents.' },
    ],
  }),
  component: TerminauxPaiementPage,
});

const STATUS_CONFIG = {
  pending:   { label: 'En attente', icon: Clock,        color: 'bg-amber-100 text-amber-800 border-amber-200' },
  paid:      { label: 'Payé',       icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  expired:   { label: 'Expiré',     icon: XCircle,      color: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled: { label: 'Annulé',     icon: XCircle,      color: 'bg-red-100 text-red-700 border-red-200' },
} as const;

function TerminauxPaiementPage() {
  const { profile } = useAuth();
  const { students } = useStudents();
  const { terminals, sessions, isLoading, createSession, isCreating, cancelSession } = usePaymentTerminals();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeQR, setActiveQR] = useState<{ token: string; amount: number; studentName: string; url: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New session form
  const [form, setForm] = useState({
    studentId: '',
    scheduleId: '',
    terminalId: '',
    amount: '',
    description: 'Frais de scolarité',
  });

  // Payment schedules for the selected student
  const schedulesQuery = useQuery({
    queryKey: ['payment_schedules_for_terminal', form.studentId],
    queryFn: async () => {
      if (!form.studentId) return [];
      const { data, error } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('student_id', form.studentId)
        .neq('status', 'paid')
        .order('due_date');
      if (error) throw error;
      return data || [];
    },
    enabled: !!form.studentId,
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.eureka.ci';

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.amount) {
      toast.error('Veuillez sélectionner un élève et saisir un montant.');
      return;
    }
    try {
      const result = await createSession({
        studentId: form.studentId,
        amount: parseFloat(form.amount),
        description: form.description,
        scheduleId: form.scheduleId || undefined,
        terminalId: form.terminalId || undefined,
      } as CreateSessionParams);

      const student = students.find((s: any) => s.id === form.studentId);
      const payUrl = `${baseUrl}/pay/${result.token}`;

      setActiveQR({
        token: result.token,
        amount: result.amount,
        studentName: student ? `${student.first_name} ${student.last_name}` : 'Élève',
        url: payUrl,
      });

      setIsCreateOpen(false);
      setForm({ studentId: '', scheduleId: '', terminalId: '', amount: '', description: 'Frais de scolarité' });
      toast.success('Session de paiement créée ! QR code disponible.');
    } catch (err: any) {
      // Handled in hook
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Lien copié dans le presse-papier !');
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchSearch = !searchQuery || (
        `${s.students?.first_name} ${s.students?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  return (
    <AppShell
      title="Terminaux de Paiement"
      subtitle="Générez des QR codes ou liens pour encaisser les frais directement auprès des parents"
      actions={
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 bg-primary text-primary-foreground font-bold text-xs shadow-sm"
        >
          <QrCode className="w-4 h-4" /> Générer un QR Code
        </Button>
      }
    >
      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Sessions aujourd\'hui',
            value: sessions.filter(s => s.created_at.startsWith(new Date().toISOString().slice(0, 10))).length,
            icon: QrCode,
            color: 'text-primary bg-primary/10'
          },
          {
            label: 'Paiements reçus',
            value: sessions.filter(s => s.status === 'paid').length,
            icon: CheckCircle2,
            color: 'text-emerald-600 bg-emerald-100'
          },
          {
            label: 'En attente',
            value: sessions.filter(s => s.status === 'pending').length,
            icon: Clock,
            color: 'text-amber-600 bg-amber-100'
          },
          {
            label: 'Total encaissé',
            value: `${sessions.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.amount, 0).toLocaleString('fr-FR')} F`,
            icon: Banknote,
            color: 'text-blue-600 bg-blue-100'
          },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold text-foreground font-mono">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active QR Modal ── */}
      {activeQR && (
        <div className="mb-6 rounded-2xl border-2 border-primary bg-primary/5 p-6 animate-in fade-in">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">QR Code actif — {activeQR.studentName}</h3>
                <p className="text-sm text-muted-foreground font-mono">{activeQR.amount.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => copyLink(activeQR.url)}
              >
                <Copy className="w-3.5 h-3.5" /> Copier le lien
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => window.open(activeQR.url, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Ouvrir le lien
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={() => setActiveQR(null)}
              >
                Fermer
              </Button>
            </div>
          </div>

          {/* QR Code visual (SVG placeholder — in prod use a QR library) */}
          <div className="mt-4 flex flex-wrap gap-6 items-start">
            <div className="bg-white border border-border rounded-xl p-4 flex flex-col items-center gap-2">
              <div className="w-40 h-40 bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300">
                <QrCode className="w-16 h-16 text-gray-400" />
                <p className="text-[10px] text-gray-400 text-center px-2">QR Code généré automatiquement</p>
              </div>
              <p className="text-[10px] text-muted-foreground text-center max-w-[160px] break-all font-mono">
                {activeQR.token.slice(0, 16)}…
              </p>
            </div>

            <div className="flex-1 min-w-[200px] space-y-3">
              <div className="bg-white rounded-xl border border-border p-4 text-sm space-y-2.5">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide">Instructions pour le parent</h4>
                <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Scannez le QR code avec l'application appareil photo</li>
                  <li>Choisissez votre moyen de paiement (Wave, Orange Money, MTN, Moov…)</li>
                  <li>Entrez votre numéro Mobile Money</li>
                  <li>Confirmez le paiement de <strong className="text-foreground">{activeQR.amount.toLocaleString('fr-FR')} FCFA</strong></li>
                  <li>Un reçu officiel est automatiquement généré</li>
                </ol>
              </div>
              <div className="bg-white rounded-xl border border-border p-3 text-xs space-y-1">
                <p className="text-muted-foreground">Lien direct :</p>
                <p className="font-mono text-primary break-all">{activeQR.url}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sessions list ── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-sm text-foreground">Historique des sessions</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un élève…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs w-48"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="paid">Payés</SelectItem>
                <SelectItem value="expired">Expirés</SelectItem>
                <SelectItem value="cancelled">Annulés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <QrCode className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Aucune session trouvée</p>
            <Button size="sm" className="gap-2 mt-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Créer une session
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredSessions.map(session => {
              const cfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const payUrl = `${baseUrl}/pay/${session.token}`;
              const isExpired = session.status === 'pending' && new Date(session.expires_at) < new Date();

              return (
                <div key={session.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <QrCode className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {session.students?.first_name} {session.students?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{session.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground font-mono">{session.amount.toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                      <Icon className="w-3 h-3" />
                      {isExpired ? 'Expiré' : cfg.label}
                    </span>

                    <div className="flex items-center gap-1">
                      {session.status === 'pending' && !isExpired && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setActiveQR({
                              token: session.token,
                              amount: session.amount,
                              studentName: `${session.students?.first_name} ${session.students?.last_name}`,
                              url: payUrl,
                            })}
                            title="Voir QR"
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => copyLink(payUrl)}
                            title="Copier le lien"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => cancelSession(session.id)}
                            title="Annuler"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {session.status === 'paid' && session.payment_method && (
                        <span className="text-xs text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                          via {session.payment_method}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE SESSION DIALOG ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateSession}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" /> Nouveau QR de Paiement
              </DialogTitle>
              <DialogDescription>
                Sélectionnez l'élève et le montant à encaisser. Un QR code unique sera généré valable 2 heures.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Student */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Élève *</Label>
                <Select
                  value={form.studentId}
                  onValueChange={v => setForm(f => ({ ...f, studentId: v, scheduleId: '', amount: '' }))}
                  required
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Sélectionner l'élève…" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} · {s.classes?.name || '—'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule (optional) */}
              {form.studentId && schedulesQuery.data && schedulesQuery.data.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Échéance en cours (optionnel)</Label>
                  <Select
                    value={form.scheduleId}
                    onValueChange={v => {
                      const sched = schedulesQuery.data?.find((s: any) => s.id === v);
                      setForm(f => ({
                        ...f,
                        scheduleId: v,
                        amount: sched ? String(sched.amount_due) : f.amount,
                        description: sched ? sched.description || 'Frais de scolarité' : f.description,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choisir une échéance…" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedulesQuery.data?.map((sched: any) => (
                        <SelectItem key={sched.id} value={sched.id}>
                          {sched.description || 'Échéance'} — {Number(sched.amount_due).toLocaleString('fr-FR')} FCFA
                          {sched.due_date && ` (${new Date(sched.due_date).toLocaleDateString('fr-FR')})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Terminal (optional) */}
              {terminals.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Terminal de caisse (optionnel)</Label>
                  <Select value={form.terminalId} onValueChange={v => setForm(f => ({ ...f, terminalId: v }))}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Terminal non spécifié" />
                    </SelectTrigger>
                    <SelectContent>
                      {terminals.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}{t.location && ` — ${t.location}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Montant à encaisser (FCFA) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 35000"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="h-10 font-mono text-sm font-bold"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Libellé</Label>
                <Input
                  placeholder="Ex: 1ère tranche — Trimestre 1"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary shrink-0" />
                Le QR code sera valable <strong>2 heures</strong>. Le parent n'a pas besoin de compte pour payer.
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isCreating} className="gap-2">
                {isCreating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</>
                ) : (
                  <><QrCode className="w-4 h-4" /> Générer le QR Code</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
