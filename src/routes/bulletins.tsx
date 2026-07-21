import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { bulletin, school } from "@/lib/mock-data";

export const Route = createFileRoute("/bulletins")({
  head: () => ({
    meta: [
      { title: "Bulletins — Ereuka" },
      { name: "description", content: "Génération, signature et diffusion des bulletins trimestriels." },
    ],
  }),
  component: BulletinsPage,
});

function BulletinsPage() {
  const total = bulletin.notes.reduce((s, n) => s + n.note * n.coef, 0);
  const totalCoef = bulletin.notes.reduce((s, n) => s + n.coef, 0);
  const moy = (total / totalCoef).toFixed(2);

  return (
    <AppShell
      title="Bulletins scolaires"
      subtitle={`${bulletin.trimestre} · aperçu élève`}
      actions={
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-secondary">
            <Printer className="h-4 w-4" /> Imprimer
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Download className="h-4 w-4" /> Télécharger PDF
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-warm)]">
          {/* Header */}
          <div className="grid gap-4 border-b border-border bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground md:grid-cols-[1fr_auto]">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-primary-foreground/60">République · Ministère de l'Éducation Nationale</div>
              <h2 className="mt-1 font-display text-2xl font-semibold">{school.name}</h2>
              <p className="text-sm text-primary-foreground/70">{school.city} · Année scolaire {school.year}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center self-start rounded-2xl bg-accent font-display text-2xl font-bold text-accent-foreground">
              E
            </div>
          </div>

          {/* Student meta */}
          <div className="grid gap-4 border-b border-border p-6 sm:grid-cols-4">
            <Info label="Élève" value={bulletin.eleve} />
            <Info label="Matricule" value={bulletin.matricule} mono />
            <Info label="Classe" value={bulletin.classe} />
            <Info label="Effectif" value={String(bulletin.effectif)} />
          </div>

          {/* Notes table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Matière</th>
                  <th className="px-3 py-3 text-center font-medium">Coef.</th>
                  <th className="px-3 py-3 text-center font-medium">Note /20</th>
                  <th className="px-3 py-3 text-center font-medium">Moy. classe</th>
                  <th className="px-6 py-3 font-medium">Appréciation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bulletin.notes.map((n) => (
                  <tr key={n.matiere}>
                    <td className="px-6 py-3 font-medium">{n.matiere}</td>
                    <td className="px-3 py-3 text-center tabular-nums">{n.coef}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block rounded-md px-2 py-0.5 font-semibold tabular-nums ${n.note >= 14 ? "bg-primary/10 text-primary" : n.note >= 10 ? "" : "bg-destructive/10 text-destructive"}`}>
                        {n.note.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-muted-foreground">{n.moyClasse.toFixed(1)}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{n.appreciation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="grid gap-4 border-t border-border bg-secondary/30 p-6 sm:grid-cols-3">
            <div className="rounded-xl bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Moyenne trimestrielle</div>
              <div className="mt-1 font-display text-3xl font-semibold text-primary">{moy}</div>
            </div>
            <div className="rounded-xl bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Moyenne de classe</div>
              <div className="mt-1 font-display text-3xl font-semibold">{bulletin.moyClasse.toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-accent p-4 text-accent-foreground">
              <div className="text-xs uppercase tracking-wider opacity-70">Rang</div>
              <div className="mt-1 font-display text-3xl font-semibold">{bulletin.rang}</div>
            </div>
          </div>

          <div className="border-t border-border p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Appréciation générale du conseil de classe</div>
            <p className="mt-2 text-sm italic">« {bulletin.appreciationGenerale} »</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Signature label="Le Directeur" name="M. Konan Michel" />
              <Signature label="Le Professeur Principal" name="M. Adama Bamba" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <div>
            <span className="font-medium">412 bulletins prêts</span>
            <span className="text-muted-foreground"> · à envoyer aux parents via SMS + email</span>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground hover:opacity-95">
            <Send className="h-4 w-4" /> Diffuser aux parents
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Signature({ label, name }: { label: string; name: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-6 border-t border-border pt-2 text-sm font-medium">{name}</div>
    </div>
  );
}