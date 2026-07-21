import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, GraduationCap, Users, BookOpen, ClipboardList, FileText, Bell, Search, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { school } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/eleves", label: "Élèves", icon: GraduationCap },
  { to: "/classes", label: "Classes", icon: Users },
  { to: "/matieres", label: "Matières", icon: BookOpen },
  { to: "/notes", label: "Notes & Évaluations", icon: ClipboardList },
  { to: "/bulletins", label: "Bulletins", icon: FileText },
] as const;

export function AppShell({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <div className="flex items-center gap-3 px-6 pt-7 pb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-display text-lg font-bold">
              E
            </div>
            <div>
              <div className="font-display text-lg font-semibold leading-none">Ereuka</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-sidebar-foreground/60">ERP scolaire</div>
            </div>
          </div>

          <div className="mx-4 mb-4 rounded-lg bg-sidebar-accent/60 px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">Établissement</div>
            <div className="mt-1 text-sm font-medium leading-tight">{school.name}</div>
            <div className="mt-0.5 text-xs text-sidebar-foreground/60">{school.year} · {school.trimester}</div>
          </div>

          <nav className="flex-1 space-y-0.5 px-3">
            {nav.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Settings className="h-4 w-4" />
              Paramètres
            </button>
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                KM
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">Konan Michel</div>
                <div className="truncate text-xs text-sidebar-foreground/60">Directeur</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="flex items-center gap-4 px-4 py-4 md:px-8">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
                {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground w-72">
                <Search className="h-4 w-4" />
                <span>Rechercher un élève, une classe…</span>
              </div>
              <button className="relative rounded-lg border border-border bg-card p-2 hover:bg-secondary" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">7</span>
              </button>
              {actions}
            </div>
          </header>

          <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-border bg-card/95 backdrop-blur lg:hidden">
        {nav.slice(0, 5).map((item) => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}