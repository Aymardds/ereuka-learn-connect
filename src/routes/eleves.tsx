import { createFileRoute } from "@tanstack/react-router";
import { Search, Filter, Plus, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { students } from "@/lib/mock-data";

export const Route = createFileRoute("/eleves")({
  head: () => ({
    meta: [
      { title: "Élèves — Ereuka" },
      { name: "description", content: "Dossiers élèves, inscriptions et suivi individuel dans Ereuka." },
    ],
  }),
  component: ElevesPage,
});

function ElevesPage() {
  return (
    <AppShell
      title="Élèves"
      subtitle={`${students.length * 156} dossiers actifs · 42 préinscriptions en attente`}
      actions={
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95">
          <Plus className="h-4 w-4" /> Nouvelle inscription
        </button>
      }
    >
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Rechercher par nom, matricule, classe…" />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
            <Filter className="h-4 w-4" /> Filtres
          </button>
          <div className="flex gap-1 rounded-lg border border-border p-1 text-xs">
            {["Tous", "Maternelle", "Primaire", "Collège", "Lycée"].map((t, i) => (
              <button key={t} className={i === 0 ? "rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground" : "px-3 py-1.5 text-muted-foreground hover:text-foreground"}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-4 py-3 font-medium">Matricule</th>
                <th className="px-4 py-3 font-medium">Classe</th>
                <th className="px-4 py-3 font-medium text-right">Moyenne</th>
                <th className="px-4 py-3 font-medium text-right">Rang</th>
                <th className="px-4 py-3 font-medium text-right">Présence</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => {
                const initials = (s.prenom[0] + s.nom[0]).toUpperCase();
                const bg = s.sexe === "F" ? "bg-accent/30 text-accent-foreground" : "bg-primary/15 text-primary";
                return (
                  <tr key={s.matricule} className="hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${bg} text-xs font-semibold`}>{initials}</div>
                        <div>
                          <div className="font-medium">{s.nom} {s.prenom}</div>
                          <div className="text-xs text-muted-foreground">{s.sexe === "F" ? "Fille" : "Garçon"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.matricule}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">{s.classe}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{s.moyenne.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.rang}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`tabular-nums ${s.presence >= 95 ? "text-primary" : s.presence >= 90 ? "" : "text-destructive"}`}>{s.presence}%</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>Affichage de 1 à {students.length} sur 1 247 élèves</span>
          <div className="flex gap-1">
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-secondary">Précédent</button>
            <button className="rounded-md border border-border bg-secondary px-2.5 py-1">1</button>
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-secondary">2</button>
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-secondary">3</button>
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-secondary">Suivant</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}