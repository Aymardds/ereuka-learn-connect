import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { kpis, cycles, classes, recentActivity, school } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const totalStudents = cycles.reduce((s, c) => s + c.students, 0);
  const maxCycle = Math.max(...cycles.map((c) => c.students));

  return (
    <AppShell
      title="Tableau de bord"
      subtitle={`${school.year} · ${school.trimester} · vue direction`}
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
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Établissement multi-cycles
            </div>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight md:text-4xl">
              Bonne journée, M. Konan.
            </h2>
            <p className="mt-2 max-w-lg text-sm text-primary-foreground/70">
              Vos équipes ont saisi <b className="text-primary-foreground">312 notes</b> et validé{" "}
              <b className="text-primary-foreground">68 émargements</b> depuis ce matin. Trois conseils de classe sont programmés cette semaine.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-95">
                Ouvrir la programmation pédagogique <ArrowUpRight className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/20 bg-primary-foreground/5 px-4 py-2 text-sm text-primary-foreground/90 hover:bg-primary-foreground/10">
                Publier un communiqué
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            <div className="rounded-xl bg-primary-foreground/10 p-4">
              <div className="text-xs text-primary-foreground/60">Effectif total</div>
              <div className="mt-1 font-display text-2xl font-semibold">{totalStudents.toLocaleString("fr-FR")}</div>
            </div>
            <div className="rounded-xl bg-accent/95 p-4 text-accent-foreground">
              <div className="text-xs opacity-70">Encaissements du jour</div>
              <div className="mt-1 font-display text-2xl font-semibold">2,4M FCFA</div>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-4">
              <div className="text-xs text-primary-foreground/60">Impayés</div>
              <div className="mt-1 font-display text-2xl font-semibold">18,7M</div>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-4">
              <div className="text-xs text-primary-foreground/60">Bulletins prêts</div>
              <div className="mt-1 font-display text-2xl font-semibold">412</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="font-display text-3xl font-semibold">{k.value}</div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <TrendingUp className="h-3 w-3" /> {k.delta}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{k.hint}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Répartition par cycle */}
        <div className="rounded-2xl border border-border bg-card p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Répartition par cycle</h3>
              <p className="text-sm text-muted-foreground">Effectifs et nombre de classes par niveau</p>
            </div>
            <span className="text-xs text-muted-foreground">Année {school.year}</span>
          </div>
          <div className="mt-6 space-y-4">
            {cycles.map((c, i) => (
              <div key={c.name}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.classes} classes</span>
                  </div>
                  <span className="font-medium tabular-nums">{c.students} élèves</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(c.students / maxCycle) * 100}%`,
                      background: i % 2 === 0 ? "var(--gradient-warm)" : "var(--gradient-amber)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Programmation</div>
              <div className="mt-1 font-display text-xl font-semibold">72%</div>
              <div className="text-xs text-muted-foreground">exécution moyenne</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Conseils de classe</div>
              <div className="mt-1 font-display text-xl font-semibold">3</div>
              <div className="text-xs text-muted-foreground">cette semaine</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Absences non justifiées</div>
              <div className="mt-1 font-display text-xl font-semibold text-destructive">27</div>
              <div className="text-xs text-muted-foreground">à traiter</div>
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Activité récente</h3>
          <p className="text-sm text-muted-foreground">Événements des dernières heures</p>
          <ul className="mt-5 space-y-4">
            {recentActivity.map((a, i) => (
              <li key={i} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0">
                  <div className="text-sm leading-snug">{a.detail}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-medium text-primary">{a.type}</span> · {a.time}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Alerts + classes highlight */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5 lg:col-span-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-accent-foreground" />
            <span className="text-sm font-semibold">Retards pédagogiques</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            2 matières présentent un taux d'exécution &lt; 60% du programme national.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between rounded-lg bg-card px-3 py-2">
              <span>SVT — 3ème 2</span><span className="font-semibold text-destructive">54%</span>
            </div>
            <div className="flex justify-between rounded-lg bg-card px-3 py-2">
              <span>H-G — Tle L</span><span className="font-semibold text-destructive">58%</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Classes à surveiller</h3>
            <span className="text-xs text-muted-foreground">Moyennes et présence</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 font-medium">Classe</th>
                  <th className="pb-2 font-medium">Titulaire</th>
                  <th className="pb-2 font-medium text-right">Effectif</th>
                  <th className="pb-2 font-medium text-right">Moyenne</th>
                  <th className="pb-2 font-medium text-right">Présence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classes.slice(0, 5).map((c) => (
                  <tr key={c.name}>
                    <td className="py-2.5 font-medium">{c.name}</td>
                    <td className="py-2.5 text-muted-foreground">{c.teacher}</td>
                    <td className="py-2.5 text-right tabular-nums">{c.students}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium">{c.avg.toFixed(1)}</td>
                    <td className="py-2.5 text-right tabular-nums">{c.presence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
