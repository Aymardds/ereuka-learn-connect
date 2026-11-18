import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { 
  LayoutDashboard, GraduationCap, Users, BookOpen, ClipboardList, 
  FileText, Bell, Search, Settings, LogOut, DollarSign, CreditCard,
  CalendarDays, BookCheck, Briefcase, MessageSquare, BarChart3, 
  Building, UserCheck, Wifi, WifiOff, RefreshCw, Award, QrCode,
  UtensilsCrossed, Bus, HeartPulse
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { school } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCampuses } from "@/hooks/useCampuses";
import { getEstablishmentTypeInfo, type EstablishmentTypeInfo } from "@/lib/school-types";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { OfflineSyncModal } from "./OfflineSyncModal";

type NavItem = { 
  to: string; 
  label: string; 
  icon: React.ElementType; 
  roles?: string[]; 
  badge?: string;
  requiresSuperieur?: boolean;
  requiresK12?: boolean;
  getDynamicLabel?: (info: EstablishmentTypeInfo, role?: string) => string;
  getDynamicBadge?: (info: EstablishmentTypeInfo) => string | undefined;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, roles: ['admin', 'director', 'accountant', 'teacher', 'dean', 'department_head'] },
  { 
    to: "/portail-parent", 
    label: "Portail Parent", 
    icon: UserCheck, 
    roles: ['parent', 'responsible', 'admin', 'director'], 
    badge: 'Famille',
    requiresK12: true, // Caché dans une université pure
  },
  { 
    to: "/portail-etudiant", 
    label: "Portail Étudiant", 
    icon: GraduationCap, 
    roles: ['student', 'admin', 'director'], 
    getDynamicLabel: (info) => info.isUniversityOnly ? "Portail Étudiant" : "Portail Élève",
    getDynamicBadge: (info) => info.isUniversityOnly ? "Campus" : "Élève",
  },
  { 
    to: "/lmd", 
    label: "Système LMD (Supérieur)", 
    icon: Award, 
    roles: ['admin', 'director', 'accountant', 'teacher', 'dean', 'department_head', 'student'], 
    badge: 'LMD',
    requiresSuperieur: true, // EXCLUSIVEMENT pour Supérieur / Université : invisible dans un Groupe Scolaire
  },
  { 
    to: "/modalites", 
    label: "Modalités Scolarité", 
    icon: DollarSign, 
    roles: ['admin', 'director', 'accountant'],
    getDynamicLabel: (info) => info.isUniversityOnly ? "Frais Universitaires" : "Modalités Scolarité",
  },
  { to: "/paiement", label: "Caisse & CinetPay", icon: CreditCard, roles: ['admin', 'director', 'accountant', 'cashier', 'responsible', 'parent'] },
  { to: "/terminaux-paiement", label: "Terminaux QR", icon: QrCode, roles: ['admin', 'director', 'accountant', 'cashier'], badge: 'QR' },
  { 
    to: "/cantine", 
    label: "Cantine Scolaire", 
    icon: UtensilsCrossed, 
    roles: ['admin', 'director', 'accountant', 'cashier', 'responsible', 'parent'],
    badge: "Service",
    getDynamicLabel: (info) => info.isUniversityOnly ? "Restaurant Campus" : "Cantine Scolaire",
  },
  { 
    to: "/transport", 
    label: "Transport Scolaire", 
    icon: Bus, 
    roles: ['admin', 'director', 'accountant', 'cashier', 'responsible', 'parent', 'teacher'],
    badge: "Navette",
    getDynamicLabel: (info) => info.isUniversityOnly ? "Navettes Campus" : "Transport Scolaire",
  },
  { 
    to: "/eleves", 
    label: "Élèves & Inscriptions", 
    icon: GraduationCap, 
    roles: ['admin', 'director', 'accountant', 'teacher', 'surveillance', 'secretary', 'dean', 'doctor', 'medecin'],
    getDynamicLabel: (info, role) => role === 'teacher' ? "Dossiers Élèves" : (info.isUniversityOnly ? "Étudiants & Dossiers" : (info.isMixed ? "Élèves & Étudiants" : "Élèves & Inscriptions")),
  },
  { 
    to: "/sante", 
    label: "Infirmerie & Santé", 
    icon: HeartPulse, 
    roles: ['admin', 'director', 'doctor', 'medecin'],
    badge: "Santé",
  },
  { 
    to: "/classes", 
    label: "Classes & Niveaux", 
    icon: Users, 
    roles: ['admin', 'director', 'accountant', 'dean', 'department_head'],
    getDynamicLabel: (info) => info.isUniversityOnly ? "Filières & Promotions" : (info.isMixed ? "Classes & Filières" : "Classes & Niveaux"),
  },
  { to: "/emploi-du-temps", label: "Emploi du Temps", icon: CalendarDays, roles: ['admin', 'director', 'teacher', 'student', 'parent', 'surveillance', 'dean', 'secretary'] },
  { 
    to: "/cahier-de-texte", 
    label: "Cahier de Texte", 
    icon: BookCheck, 
    roles: ['admin', 'director', 'teacher', 'student', 'parent', 'dean', 'department_head'],
    requiresK12: true, // Enseignement primaire/secondaire
  },
  { 
    to: "/matieres", 
    label: "Matières & Coeff.", 
    icon: BookOpen, 
    roles: ['admin', 'director', 'teacher', 'dean', 'department_head'],
    getDynamicLabel: (info) => info.isUniversityOnly ? "Matières & Modules" : "Matières & Coeff.",
  },
  { to: "/notes", label: "Notes & Évaluations", icon: ClipboardList, roles: ['admin', 'director', 'teacher', 'dean', 'department_head'] },
  { 
    to: "/bulletins", 
    label: "Bulletins & Moyennes", 
    icon: FileText, 
    roles: ['admin', 'director', 'teacher', 'dean', 'secretary'],
    getDynamicLabel: (info) => info.isUniversityOnly ? "Relevés LMD & PV" : "Bulletins & Moyennes",
  },
  { to: "/rh", label: "RH & Personnel", icon: Briefcase, roles: ['admin', 'director', 'accountant'] },
  { to: "/communication", label: "Communication & SMS", icon: MessageSquare, roles: ['admin', 'director', 'secretary', 'dean'] },
  { to: "/statistiques", label: "Statistiques & BI", icon: BarChart3, roles: ['admin', 'director', 'accountant', 'dean'] },
  { to: "/equipe", label: "Équipe & Accès", icon: Users, roles: ['admin', 'director'] },
];

export function AppShell({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useAuth();
  const { campuses } = useCampuses();
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all');
  const { isOnline, isSyncing, pendingCount, sync } = useOfflineSync();
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  // Redirect logic inside useEffect to avoid updating state during render
  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login" });
    } else if (!isLoading && profile?.role === 'superadmin') {
      navigate({ to: "/superadmin" });
    } else if (!isLoading && (profile?.role === 'doctor' || profile?.role === 'medecin')) {
      // Doctors land on the health/infirmary page by default
      if (pathname === '/') navigate({ to: "/sante" });
    }
  }, [isLoading, user, profile?.role, pathname, navigate]);

  // Show loading state while fetching auth
  if (isLoading || (!user && !isLoading) || (profile?.role === 'superadmin' && !isLoading)) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Chargement d'Eurêka...</div>;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const estInfo = getEstablishmentTypeInfo(profile?.tenant?.school_types);

  const nav = ALL_NAV_ITEMS
    .filter(item => {
      // 1. Filtrer selon les rôles utilisateurs
      if (item.roles && profile?.role && !item.roles.includes(profile.role)) {
        return false;
      }
      // 2. Filtrer selon le type d'établissement :
      // Les universités n'ont pas les modules K12 et le groupe scolaire n'a JAMAIS de Système LMD
      if (item.requiresSuperieur && !estInfo.hasSuperieur) {
        return false;
      }
      if (item.requiresK12 && !estInfo.hasK12) {
        return false;
      }
      return true;
    })
    .map(item => ({
      ...item,
      label: item.getDynamicLabel ? item.getDynamicLabel(estInfo, profile?.role) : item.label,
      badge: item.getDynamicBadge ? item.getDynamicBadge(estInfo) : item.badge,
    }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          {/* Brand header */}
          <div className="flex items-center justify-between px-5 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="Eurêka" className="h-10 w-10 rounded-xl shadow-md object-contain" />
              <div>
                <div className="font-display text-lg font-bold tracking-tight text-sidebar-foreground">Eurêka</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-accent">ERP Éducatif SaaS</div>
              </div>
            </div>
          </div>

          {/* School & Campus Switcher */}
          <div className="mx-3 mb-3 rounded-xl bg-sidebar-accent/60 p-3 border border-sidebar-border/40 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-sidebar-foreground/70">
              <span className="truncate font-semibold">{profile?.tenant?.name || school.name}</span>
              <span className="font-mono text-[10px] bg-sidebar-primary/20 text-accent px-1.5 py-0.5 rounded shrink-0">2025-2026</span>
            </div>

            {/* Badge type d'établissement */}
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight",
                estInfo.isUniversityOnly 
                  ? "bg-purple-900/40 text-purple-200 border border-purple-700/50" 
                  : estInfo.isMixed
                    ? "bg-amber-900/40 text-amber-200 border border-amber-700/50"
                    : "bg-emerald-900/40 text-emerald-200 border border-emerald-700/50"
              )}>
                {estInfo.badgeLabel}
              </span>
            </div>
            <p className="text-[10px] text-sidebar-foreground/60 truncate" title={estInfo.levelsSummary}>
              Niveaux : {estInfo.levelsSummary}
            </p>
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
            <button
              onClick={() => setSyncModalOpen(true)}
              className={cn(
                "w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-[11px] font-medium border transition-all text-left group cursor-pointer",
                !isOnline
                  ? "bg-amber-950/40 border-amber-800/40 text-amber-300 hover:bg-amber-900/50"
                  : pendingCount > 0
                  ? "bg-amber-950/30 border-amber-500/50 text-amber-200 hover:bg-amber-900/40"
                  : "bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/40"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin text-amber-400 shrink-0" />
                    <span className="truncate">Synchronisation ({pendingCount})...</span>
                  </>
                ) : !isOnline ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
                    <span className="truncate">Hors-ligne ({pendingCount} attente)</span>
                  </>
                ) : pendingCount > 0 ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="truncate">{pendingCount} en attente d'envoi</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">Synchronisé (En ligne)</span>
                  </>
                )}
              </div>
              <span className="text-[10px] opacity-60 group-hover:opacity-100 uppercase tracking-wider shrink-0 ml-1">
                Gérer
              </span>
            </button>
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
                  placeholder={estInfo.isUniversityOnly ? "Étudiant, filière, matricule..." : "Élève, classe, matricule..."} 
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
              {/* Offline / Pending indicator in header if active */}
              {(!isOnline || pendingCount > 0) && (
                <button
                  onClick={() => setSyncModalOpen(true)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer",
                    !isOnline 
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  )}
                  title="Cliquer pour gérer la synchronisation"
                >
                  <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                  <span className="hidden sm:inline">
                    {!isOnline ? `Hors-ligne (${pendingCount})` : `${pendingCount} en attente`}
                  </span>
                </button>
              )}
              {actions}
            </div>
          </header>

          <main className="px-4 py-6 md:px-8 md:py-8 flex-1">{children}</main>
        </div>
      </div>

      {/* Offline Sync Center Modal */}
      <OfflineSyncModal open={syncModalOpen} onOpenChange={setSyncModalOpen} />

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