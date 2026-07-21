import { createFileRoute } from "@tanstack/react-router";
import { Save, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { students, subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes & Évaluations — Ereuka" },
      { name: "description", content: "Saisie des notes, coefficients et calcul automatique des moyennes." },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const cls = students.filter((s) => s.classe === "Tle S");
  return (
    <AppShell
      title="Saisie des notes"
      subtitle="Terminale S · Composition · Trimestre 2"
      actions={
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Save className="h-4 w-4" /> Enregistrer
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option>Terminale S</option><option>Terminale L</option><option>3ème 2</option>
        </select>
        <select className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          {subjects.map(s => <option key={s.code}>{s.name}</option>)}
        </select>
        <select className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option>Composition</option><option>Devoir surveillé</option><option>Interrogation</option>
        </select>
        <div className="ml-auto flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          <Check className="h-4 w-4" /> Auto-enregistrement activé
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Matricule</th>
              <th className="px-4 py-3 font-medium">Élève</th>
              <th className="px-4 py-3 font-medium text-center">Note /20</th>
              <th className="px-4 py-3 font-medium">Appréciation</th>
              <th className="px-4 py-3 font-medium text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cls.map((s, i) => {
              const note = (12 + ((i * 7) % 8) + Math.random() * 0.5).toFixed(1);
              return (
                <tr key={s.matricule}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.matricule}</td>
                  <td className="px-4 py-3 font-medium">{s.nom} {s.prenom}</td>
                  <td className="px-4 py-3">
                    <input defaultValue={note} className="mx-auto block w-20 rounded-md border border-border bg-background px-2 py-1.5 text-center tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
                  </td>
                  <td className="px-4 py-3">
                    <input placeholder="Optionnel…" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Check className="h-3 w-3" /> Enregistré
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-secondary/40 text-sm">
            <tr>
              <td colSpan={2} className="px-4 py-3 font-semibold">Moyenne de classe</td>
              <td className="px-4 py-3 text-center font-display text-lg font-semibold tabular-nums">13,6</td>
              <td colSpan={2} className="px-4 py-3 text-right text-xs text-muted-foreground">Calcul automatique · coefficient appliqué</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </AppShell>
  );
}