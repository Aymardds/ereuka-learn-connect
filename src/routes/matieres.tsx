import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/matieres")({
  head: () => ({
    meta: [
      { title: "Matières — Ereuka" },
      { name: "description", content: "Matières, coefficients et programmation pédagogique." },
    ],
  }),
  component: MatieresPage,
});

function MatieresPage() {
  return (
    <AppShell title="Matières" subtitle="Coefficients et exécution du programme national">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((s, i) => {
          const exec = 55 + ((i * 13) % 40);
          return (
            <div key={s.code} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{s.code}</div>
                    <div className="font-display text-lg font-semibold leading-tight">{s.name}</div>
                  </div>
                </div>
                <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                  Coef. {s.coef}
                </span>
              </div>
              <div className="mt-5">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Exécution du programme</span>
                  <span className={`font-semibold ${exec < 65 ? "text-destructive" : "text-primary"}`}>{exec}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${exec}%`, background: exec < 65 ? "var(--color-destructive)" : "var(--gradient-warm)" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}