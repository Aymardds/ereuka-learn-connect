import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { 
  LayoutDashboard, GraduationCap, Users, BookOpen, ClipboardList, 
  FileText, Bell, Search, Settings, LogOut, DollarSign, CreditCard,
  CalendarDays, BookCheck, Briefcase, MessageSquare, BarChart3, 
  Building, UserCheck, Wifi, WifiOff, RefreshCw, Award
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { school } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCampuses } from "@/hooks/useCampuses";

type NavItem = { to: string; label: string; icon: React.ElementType; roles?: string[]; badge?: string };

const ALL_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, roles: ['admin', 'director', 'accountant', 'dean', 'department_head'] },
  { to: "/portail-parent", label: "Portail Parent", icon: UserCheck, roles: ['parent', 'responsible', 'admin', 'director'], badge: 'Famille' },
  { to: "/portail-etudiant", label: "Portail Étudiant", icon: GraduationCap, roles: ['student', 'admin', 'director'], badge: 'Élève' },
  { to: "/lmd", label: "Système LMD (Supérieur)", icon: Award, roles: ['admin', 'director', 'accountant', 'teacher', 'dean', 'department_head', 'student'], badge: 'LMD' },
  { to: "/modalites", label: "Modalités Scolarité", icon: DollarSign, roles: ['admin', 'director', 'accountant'] },
  { to: "/paiement", label: "Caisse & CinetPay", icon: CreditCard, roles: ['admin', 'director', 'accountant', 'cashier', 'responsible', 'parent'] },
  { to: "/eleves", label: "Élèves & Inscriptions", icon: GraduationCap, roles: ['admin', 'director', 'accountant', 'teacher', 'surveillance', 'secretary', 'dean'] },
  { to: "/classes", label: "Classes & Niveaux", icon: Users, roles: ['admin', 'director', 'accountant', 'teacher', 'dean', 'department_head'] },
  { to: "/emploi-du-temps", label: "Emploi du Temps", icon: CalendarDays, roles: ['admin', 'director', 'teacher', 'student', 'parent', 'surveillance', 'dean', 'secretary'] },
  { to: "/cahier-de-texte", label: "Cahier de Texte", icon: BookCheck, roles: ['admin', 'director', 'teacher', 'student', 'parent', 'dean', 'department_head'] },
  { to: "/matieres", label: "Matières & Coeff.", icon: BookOpen, roles: ['admin', 'director', 'teacher', 'dean', 'department_head'] },
  { to: "/notes", label: "Notes & Évaluations", icon: ClipboardList, roles: ['admin', 'director', 'teacher', 'dean', 'department_head'] },
  { to: "/bulletins", label: "Bulletins & Moyennes", icon: FileText, roles: ['admin', 'director', 'teacher', 'dean', 'secretary'] },
  { to: "/rh", label: "RH & Personnel", icon: Briefcase, roles: ['admin', 'director', 'accountant'] },
  { to: "/communication", label: "Communication & SMS", icon: MessageSquare },
  { to: "/statistiques", label: "Statistiques & BI", icon: BarChart3, roles: ['admin', 'director', 'accountant', 'dean'] },
  { to: "/equipe", label: "Équipe & Accès", icon: Users, roles: ['admin', 'director'] },
];

export function AppShell({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useAuth();
  const { campuses } = useCampuses();
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all');
  const [isOnline, setIsOnline] = useState(true);

  // Monitor network status for offline-first responsiveness
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Chargement d'Eurêka...</div>;
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
          {/* Brand header */}
          <div className="flex items-center justify-between px-5 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground font-display text-xl font-bold shadow-md">
                E
              </div>
              <div>
                <div className="font-display text-lg font-bold tracking-tight text-sidebar-foreground">Eurêka</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-accent">ERP Éducatif SaaS</div>
              </div>
            </div>
          </div>

          {/* School & Campus Switcher */}
          <div className="mx-3 mb-3 rounded-xl bg-sidebar-accent/60 p-3 border border-sidebar-border/40">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-sidebar-foreground/70 mb-1">
              <span className="truncate font-semibold">{profile?.tenant?.name || school.name}</span>
              <span className="font-mono text-[10px] bg-sidebar-primary/20 text-accent px-1.5 py-0.5 rounded">2025-2026</span>
            </div>
            {campuses.length > 0 ? (
              <select
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
                className="w-full mt-1.5 text-xs bg-sidebar-accent border border-sidebar-border/60 rounded px-2 py-1 text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="all">Tous les campus ({campuses.length})</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.city ? `(${c.city})` : ''}</option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-sidebar-foreground/60 flex items-center gap-1 mt-1">
                <Building className="w-3.5 h-3.5 text-accent" /> Campus Principal
              </div>
            )}
          </div>

          {/* Navigation Links with custom scrollbar */}
          <nav className="flex-1 space-y-1 px-3 overflow-y-auto custom-scrollbar">
            {nav.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all",
                    active
                      ? "bg-accent text-accent-foreground font-semibold shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                      active ? "bg-accent-foreground/20 text-accent-foreground" : "bg-sidebar-primary/30 text-accent"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sync & Connectivity status */}
          <div className="px-3 pt-2 pb-1">
            <div className={cn(
              "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium border",
              isOnline 
                ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300"
                : "bg-amber-950/40 border-amber-800/40 text-amber-300"
            )}>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                    <span>Synchronisé (En ligne)</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse-dot" />
                    <span>Mode Hors-ligne (Cache)</span>
                  </>
                )}
              </div>
              <button 
                title="Actualiser la synchronisation" 
                onClick={() => window.location.reload()}
                className="opacity-70 hover:opacity-100 p-0.5"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* User profile & actions */}
          <div className="p-3 border-t border-sidebar-border/40">
            {(profile?.role === 'admin' || profile?.role === 'director') && (
              <Link 
                to="/parametres" 
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <Settings className="h-3.5 w-3.5" />
                Paramètres Établissement
              </Link>
            )}
            <button 
              onClick={handleSignOut}
              className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </button>
            <div className="mt-2.5 flex items-center gap-2.5 rounded-lg bg-sidebar-accent/50 p-2 border border-sidebar-border/30">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase">
                {profile?.full_name ? profile.full_name.substring(0, 2) : user?.email?.substring(0, 2) || 'ED'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{profile?.full_name || user?.email}</div>
                <div className="truncate text-[10px] text-accent uppercase font-medium">{profile?.role || 'Utilisateur'}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="min-w-0 flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-md">
            <div className="flex items-center gap-4 px-4 py-3.5 md:px-8">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                  <span className="hidden sm:inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Eurêka
                  </span>
                </div>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>

              {/* Fast Search */}
              <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground w-64 focus-within:ring-1 focus-within:ring-primary">
                <Search className="h-3.5 w-3.5" />
                <input 
                  type="text" 
                  placeholder="Élève, classe, matricule..." 
                  className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full"
                />
              </div>

              {/* Notifications */}
              <Link 
                to={'/communication' as any} 
                className="relative rounded-lg border border-border bg-card p-2 hover:bg-secondary transition-colors" 
                aria-label="Notifications & Annonces"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  3
                </span>
              </Link>
              {actions}
            </div>
          </header>

          <main className="px-4 py-6 md:px-8 md:py-8 flex-1">{children}</main>
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
                "flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium",
                active ? "text-primary font-bold" : "text-muted-foreground",
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