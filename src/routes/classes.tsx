import { createFileRoute } from "@tanstack/react-router";
import { Users, ArrowUpRight, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { classes, cycles } from "@/lib/mock-data";

export const Route = createFileRoute("/classes")({
  head: () => ({
    meta: [
      { title: "Classes — Ereuka" },
      { name: "description", content: "Vue d'ensemble des classes, titulaires et effectifs." },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  return (
    <AppShell
      title="Classes"
      subtitle="34 classes réparties sur 4 cycles"
      actions={
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95">
          <Plus className="h-4 w-4" /> Créer une classe
        </button>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cycles.map((c) => (
          <div key={c.name} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.name}</div>
            <div className="mt-2 font-display text-3xl font-semibold">{c.students}</div>
            <div className="text-xs text-muted-foreground">{c.classes} classes actives</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((c) => (
          <div key={c.name} className="group rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                  {c.cycle}
                </div>
                <h3 className="mt-2 font-display text-2xl font-semibold">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Titulaire · {c.teacher}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Users className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Effectif</div>
                <div className="mt-0.5 font-display text-lg font-semibold">{c.students}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Moyenne</div>
                <div className="mt-0.5 font-display text-lg font-semibold">{c.avg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Présence</div>
                <div className="mt-0.5 font-display text-lg font-semibold">{c.presence}%</div>
              </div>
            </div>

            <button className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80">
              Ouvrir la classe <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}