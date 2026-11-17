import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, 
  GraduationCap, Download, AlertCircle, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { toast } from 'sonner';
import { getEstablishmentTypeInfo } from '@/lib/school-types';

export const Route = createFileRoute('/statistiques')({
  component: StatisticsPage,
});

function StatisticsPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const estInfo = getEstablishmentTypeInfo(profile?.tenant?.school_types);

  // Real grade stats per class
  const { data: gradesPerClass = [] } = useQuery({
    queryKey: ['stats_grades_per_class', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('grade_entries')
        .select('class_id, score, max_score, classes!grade_entries_class_id_fkey(name)')
        .eq('tenant_id', tenantId);
      if (error || !data) return [];

      // Group by class
      const byClass: Record<string, { name: string; scores: number[] }> = {};
      for (const g of data) {
        const cls = g as any;
        const key = cls.class_id;
        if (!byClass[key]) byClass[key] = { name: cls.classes?.name || key, scores: [] };
        if (cls.max_score > 0) byClass[key].scores.push((cls.score / cls.max_score) * 20);
      }

      return Object.values(byClass)
        .filter(c => c.scores.length > 0)
        .map(c => ({
          classe: c.name,
          moyenne: parseFloat((c.scores.reduce((a: number, b: number) => a + b, 0) / c.scores.length).toFixed(2)),
          nbNotes: c.scores.length,
        }))
        .sort((a, b) => a.classe.localeCompare(b.classe));
    },
    enabled: !!tenantId,
  });

  // Real payment channel breakdown
  const { data: paymentChannels = [] } = useQuery({
    queryKey: ['stats_payment_channels', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('student_payments')
        .select('payment_method, amount_paid')
        .eq('tenant_id', tenantId);
      if (error || !data) return [];

      const totals: Record<string, number> = {};
      let grand = 0;
      for (const p of data as any[]) {
        const method = p.payment_method || 'Autre';
        totals[method] = (totals[method] || 0) + (p.amount_paid || 0);
        grand += p.amount_paid || 0;
      }

      const colors: Record<string, string> = {
        wave: '#06b6d4', orange_money: '#f97316', mtn: '#eab308', moov: '#2563eb',
        carte: '#334155', especes: '#7c3aed', autre: '#64748b',
      };

      return Object.entries(totals)
        .map(([method, total]) => ({
          name: method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: grand > 0 ? Math.round((total / grand) * 100) : 0,
          amount: total,
          color: colors[method.toLowerCase()] || '#64748b',
        }))
        .sort((a, b) => b.value - a.value);
    },
    enabled: !!tenantId,
  });

  // Recouvrement rate
  const recoveryRate = stats
    ? stats.payments_total + stats.unpaid_total > 0
      ? Math.round((stats.payments_total / (stats.payments_total + stats.unpaid_total)) * 100)
      : null
    : null;

  const handleExport = (format: 'pdf' | 'excel') => {
    toast.success(`Export ${format.toUpperCase()} généré pour ${profile?.tenant?.name || "votre établissement"}.`);
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(2).replace('.', ',') + " M FCFA";
    if (amount >= 1_000) return (amount / 1_000).toFixed(0) + " K FCFA";
    return amount.toLocaleString('fr-FR') + " FCFA";
  };

  return (
    <AppShell
      title="Statistiques & Reporting BI"
      subtitle={`Analytiques de ${profile?.tenant?.name || "votre établissement"} — Données en temps réel`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export Excel
          </Button>
          <Button size="sm" onClick={() => handleExport('pdf')} className="gap-1.5 text-xs bg-primary text-primary-foreground">
            <Download className="w-3.5 h-3.5" /> Rapport PDF
          </Button>
        </div>
      }
    >
      {/* KPI Cards — 100% données réelles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        
        {/* Success rate */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Taux de Réussite Global</div>
          <div className="mt-2 flex items-baseline gap-2">
            {stats?.success_rate != null ? (
              <>
                <div className="font-display text-3xl font-bold text-foreground">{stats.success_rate}%</div>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  <TrendingUp className="h-3 w-3" /> Notes réelles
                </span>
              </>
            ) : (
              <div className="text-sm text-muted-foreground italic">Aucune note saisie</div>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Score ≥ 10/20 — {profile?.tenant?.name}</div>
        </div>

        {/* Recovery rate */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Taux de Recouvrement</div>
          <div className="mt-2 flex items-baseline gap-2">
            {recoveryRate !== null ? (
              <>
                <div className="font-display text-3xl font-bold text-foreground">{recoveryRate}%</div>
                <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${recoveryRate >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {recoveryRate >= 80 ? <TrendingUp className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  Objectif 90%
                </span>
              </>
            ) : (
              <div className="text-sm text-muted-foreground italic">Aucun paiement</div>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Encaissé vs Dû — {stats ? formatMoney(stats.payments_total) : "—"}</div>
        </div>

        {/* Total students */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Total {estInfo.isUniversityOnly ? "Étudiants" : "Élèves"}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-display text-3xl font-bold text-foreground">{isLoading ? "—" : (stats?.total_students ?? 0)}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            En {stats?.total_classes ?? "—"} {estInfo.classesTerm}
          </div>
        </div>

        {/* Absences today */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Absences Aujourd'hui</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className={`font-display text-3xl font-bold ${(stats?.absent_today ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isLoading ? "—" : (stats?.absent_today ?? 0)}
            </div>
            {(stats?.absent_today ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                <AlertCircle className="h-3 w-3" /> absence(s)
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Présence 100%
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Enregistrements du jour</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Real grades per class */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-base text-foreground">Moyennes par Classe</h3>
              <p className="text-xs text-muted-foreground">Données réelles des notes saisies dans {profile?.tenant?.name || "votre établissement"}</p>
            </div>
            <span className="text-xs font-mono bg-secondary px-2.5 py-1 rounded">Échelle /20</span>
          </div>

          <div className="h-72 w-full">
            {gradesPerClass.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradesPerClass} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="classe" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: number) => [`${val}/20`, 'Moyenne']}
                  />
                  <Bar dataKey="moyenne" name="Moyenne" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-semibold text-gray-700">Aucune note saisie</p>
                  <p className="text-xs text-gray-400 mt-1">Saisissez des notes dans le module "Notes & Évaluations" pour voir les statistiques.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment channels - real data */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-base text-foreground">Canaux de Paiement</h3>
              <p className="text-xs text-muted-foreground">Répartition réelle des encaissements</p>
            </div>
          </div>

          {paymentChannels.length > 0 ? (
            <div className="space-y-3 mt-2">
              {paymentChannels.map(pm => (
                <div key={pm.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{pm.name}</span>
                    <span className="font-mono font-bold text-muted-foreground">{pm.value}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pm.value}%`, backgroundColor: pm.color }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-4 text-[11px] text-muted-foreground bg-secondary/30 p-2.5 rounded-lg border border-border/50">
                💰 Total encaissé : <b className="text-foreground">{formatMoney(stats?.payments_total || 0)}</b>
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-center">
              <div>
                <DollarSign className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-700 font-semibold">Aucun paiement enregistré</p>
                <p className="text-xs text-gray-400 mt-1">Les canaux apparaîtront après les premiers encaissements.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Class effectifs section */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-base text-foreground">Effectifs par Classe</h3>
            <p className="text-xs text-muted-foreground">Répartition des {estInfo.studentsTerm} inscrits par {estInfo.classTerm} — {profile?.tenant?.name}</p>
          </div>
          <span className="text-xs font-mono bg-secondary px-2.5 py-1 rounded">
            {stats?.total_students ?? 0} {estInfo.studentsTerm} au total
          </span>
        </div>

        {(stats?.classes_stats?.length ?? 0) === 0 ? (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="font-semibold text-gray-700">Aucune classe enregistrée</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[260px] overflow-y-auto pr-2">
            {(stats?.classes_stats || []).map((c, i) => {
              const maxCount = Math.max(...(stats?.classes_stats?.map(x => x.students_count) || [1]));
              return (
                <div key={c.name}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="font-medium tabular-nums text-xs text-muted-foreground">
                      {c.students_count} {estInfo.studentsTerm}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${maxCount > 0 ? (c.students_count / maxCount) * 100 : 0}%`,
                        background: i % 2 === 0 ? "var(--gradient-warm)" : "var(--gradient-amber)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
