import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, GraduationCap, Users, BookOpen, ClipboardList, FileText, Bell, Search, Settings, LogOut, DollarSign, CreditCard } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { school } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type NavItem = { to: string; label: string; icon: React.ElementType; roles?: string[] };

const ALL_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, roles: ['admin', 'director', 'accountant'] },
  { to: "/modalites", label: "Modalités Scolarité", icon: DollarSign, roles: ['admin', 'accountant'] },
  { to: "/paiement", label: "Portail Paiements", icon: CreditCard, roles: ['admin', 'director', 'accountant', 'cashier', 'responsible'] },
  { to: "/eleves", label: "Élèves", icon: GraduationCap, roles: ['admin', 'director', 'accountant', 'teacher'] },
  { to: "/classes", label: "Classes", icon: Users, roles: ['admin', 'director', 'accountant', 'teacher'] },
  { to: "/matieres", label: "Matières", icon: BookOpen, roles: ['admin', 'director', 'teacher'] },
  { to: "/notes", label: "Notes & Évaluations", icon: ClipboardList, roles: ['admin', 'director', 'teacher'] },
  { to: "/bulletins", label: "Bulletins", icon: FileText, roles: ['admin', 'director'] },
  { to: "/equipe", label: "Équipe & Rôles", icon: Users, roles: ['admin', 'director'] },
];

export function AppShell({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useAuth();

  // Redirect logic inside useEffect to avoid updating state during render
  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login" });
    } else if (!isLoading && profile?.role === 'superadmin') {
      navigate({ to: "/superadmin" });
    }
  }, [isLoading, user, profile?.role, navigate]);

  // Show loading state while fetching auth
  if (isLoading || (!user && !isLoading) || (profile?.role === 'superadmin' && !isLoading)) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Chargement...</div>;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const nav = ALL_NAV_ITEMS.filter(item => !item.roles || (profile?.role && item.roles.includes(profile.role)));

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
            {(profile?.role === 'admin' || profile?.role === 'director') && (
              <Link 
                to="/parametres" 
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <Settings className="h-4 w-4" />
                Paramètres
              </Link>
            )}
            <button 
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold uppercase">
                {profile?.full_name ? profile.full_name.substring(0, 2) : user?.email?.substring(0, 2) || 'U'}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{profile?.full_name || user?.email}</div>
                <div className="truncate text-xs text-sidebar-foreground/60 capitalize">{profile?.role || 'Utilisateur'}</div>
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