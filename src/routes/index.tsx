import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, TrendingUp, AlertCircle, Calendar, GraduationCap, Users, Banknote, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading || !stats) {
    return (
      <AppShell title="Tableau de bord">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-muted-foreground">Chargement des statistiques...</div>
        </div>
      </AppShell>
    );
  }

  const formatMoney = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2).replace('.', ',') + "M FCFA";
    }
    return amount.toLocaleString("fr-FR") + " FCFA";
  };

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoString));
  };

  const maxClassSize = Math.max(...(stats.classes_stats.map(c => c.students_count) || [1]));

  return (
    <AppShell
      title="Tableau de bord"
      subtitle={`Vue direction`}
      actions={
        <button className="hidden md:inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95">
          <Calendar className="h-4 w-4" />
          Rapport du jour
        </button>
      }
    >
      {/* Hero card */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-warm)]">
        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground/90">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Connecté au réseau Ereuka
            </div>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight md:text-4xl">
              Bonne journée, {profile?.full_name || 'Direction'}.
            </h2>
            <p className="mt-2 max-w-lg text-sm text-primary-foreground/70">
              Voici le résumé des activités récentes de votre établissement. Vous avez actuellement <b className="text-primary-foreground">{stats.total_students} élèves</b> inscrits répartis dans <b className="text-primary-foreground">{stats.total_classes} classes</b>.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-95">
                Voir les élèves <ArrowUpRight className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/20 bg-primary-foreground/5 px-4 py-2 text-sm text-primary-foreground/90 hover:bg-primary-foreground/10">
                Gérer les paiements
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            <div className="rounded-xl bg-primary-foreground/10 p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-primary-foreground/60">
                <Users className="w-3.5 h-3.5" /> Effectif total
              </div>
              <div className="mt-1 font-display text-2xl font-semibold">{stats.total_students.toLocaleString("fr-FR")}</div>
            </div>
            <div className="rounded-xl bg-accent/95 p-4 text-accent-foreground flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs opacity-70">
                <Banknote className="w-3.5 h-3.5" /> Encaissements du jour
              </div>
              <div className="mt-1 font-display text-xl sm:text-2xl font-semibold truncate" title={formatMoney(stats.payments_today)}>
                {formatMoney(stats.payments_today)}
              </div>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-primary-foreground/60">
                <AlertCircle className="w-3.5 h-3.5" /> Impayés
              </div>
              <div className="mt-1 font-display text-xl sm:text-2xl font-semibold text-amber-300 truncate" title={formatMoney(stats.unpaid_total)}>
                {formatMoney(stats.unpaid_total)}
              </div>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-primary-foreground/60">
                <GraduationCap className="w-3.5 h-3.5" /> Classes actives
              </div>
              <div className="mt-1 font-display text-2xl font-semibold">{stats.total_classes}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Recouvré</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-display text-3xl font-semibold">{formatMoney(stats.payments_total)}</div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <TrendingUp className="h-3 w-3" />
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Depuis la création</div>
        </div>
        
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Taux de Remplissage</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-display text-3xl font-semibold">
              {stats.total_classes > 0 ? Math.round(stats.total_students / stats.total_classes) : 0}
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Élèves par classe en moyenne</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Bulletins & Moyennes</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-display text-3xl font-semibold text-muted-foreground">N/A</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Module en cours de préparation</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Répartition par classe */}
        <div className="rounded-2xl border border-border bg-card p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Effectifs par classe</h3>
              <p className="text-sm text-muted-foreground">Aperçu visuel du remplissage des classes</p>
            </div>
          </div>
          
          {stats.classes_stats.length === 0 ? (
            <div className="mt-8 text-center text-muted-foreground py-8 border-2 border-dashed rounded-xl">
              Aucune classe enregistrée pour le moment.
            </div>
          ) : (
            <div className="mt-6 space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {stats.classes_stats.map((c, i) => (
                <div key={c.name}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">{c.students_count} élèves</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${maxClassSize > 0 ? (c.students_count / maxClassSize) * 100 : 0}%`,
                        background: i % 2 === 0 ? "var(--gradient-warm)" : "var(--gradient-amber)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Activité récente</h3>
              <p className="text-sm text-muted-foreground">Transactions financières</p>
            </div>
            <Clock className="w-5 h-5 text-muted-foreground opacity-50" />
          </div>
          
          <ul className="mt-5 space-y-4">
            {stats.recent_activities.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Aucune activité récente.
              </div>
            ) : (
              stats.recent_activities.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0">
                    <div className="text-sm leading-snug">{a.detail}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-primary">{a.type}</span> · {formatDate(a.time)}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
