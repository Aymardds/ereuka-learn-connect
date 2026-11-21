import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, GraduationCap, Users, BookOpen, ClipboardList,
  FileText, Bell, Search, Settings, LogOut, DollarSign, CreditCard,
  CalendarDays, BookCheck, Briefcase, MessageSquare, BarChart3,
  Building, UserCheck, RefreshCw, Award, QrCode,
  UtensilsCrossed, Bus, HeartPulse, Menu, X, ChevronDown,
  ArrowDownToLine,
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

// ── Nav groups for visual separation ──────────────────────────────────────
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    items: [
      { to: "/", label: "Tableau de bord", icon: LayoutDashboard, roles: ['admin', 'director', 'accountant', 'teacher', 'dean', 'department_head'] },
      {
        to: "/portail-parent",
        label: "Portail Parent",
        icon: UserCheck,
        roles: ['parent', 'responsible', 'admin', 'director'],
        requiresK12: true,
      },
      {
        to: "/portail-etudiant",
        label: "Portail Étudiant",
        icon: GraduationCap,
        roles: ['student', 'admin', 'director'],
        getDynamicLabel: (info) => info.isUniversityOnly ? "Portail Étudiant" : "Portail Élève",
      },
    ],
  },
  {
    label: "Pédagogie",
    items: [
      {
        to: "/eleves",
        label: "Élèves & Inscriptions",
        icon: Users,
        roles: ['admin', 'director', 'accountant', 'teacher', 'surveillance', 'secretary', 'dean', 'doctor', 'medecin'],
        getDynamicLabel: (info, role) => role === 'teacher' ? "Dossiers Élèves" : (info.isUniversityOnly ? "Étudiants & Dossiers" : (info.isMixed ? "Élèves & Étudiants" : "Élèves & Inscriptions")),
      },
      {
        to: "/classes",
        label: "Classes & Niveaux",
        icon: Building,
        roles: ['admin', 'director', 'accountant', 'dean', 'department_head'],
        getDynamicLabel: (info) => info.isUniversityOnly ? "Filières & Promotions" : (info.isMixed ? "Classes & Filières" : "Classes & Niveaux"),
      },
      { to: "/emploi-du-temps", label: "Emploi du Temps", icon: CalendarDays, roles: ['admin', 'director', 'teacher', 'student', 'parent', 'surveillance', 'dean', 'secretary'] },
      {
        to: "/matieres",
        label: "Matières & Coeff.",
        icon: BookOpen,
        roles: ['admin', 'director', 'teacher', 'dean', 'department_head'],
        getDynamicLabel: (info) => info.isUniversityOnly ? "Matières & Modules" : "Matières & Coeff.",
      },
      {
        to: "/cahier-de-texte",
        label: "Cahier de Texte",
        icon: BookCheck,
        roles: ['admin', 'director', 'teacher', 'student', 'parent', 'dean', 'department_head'],
        requiresK12: true,
      },
      { to: "/notes", label: "Notes & Évaluations", icon: ClipboardList, roles: ['admin', 'director', 'teacher', 'dean', 'department_head'] },
      {
        to: "/bulletins",
        label: "Bulletins & Moyennes",
        icon: FileText,
        roles: ['admin', 'director', 'teacher', 'dean', 'secretary'],
        getDynamicLabel: (info) => info.isUniversityOnly ? "Relevés LMD & PV" : "Bulletins & Moyennes",
      },
      {
        to: "/lmd",
        label: "Système LMD",
        icon: Award,
        roles: ['admin', 'director', 'accountant', 'teacher', 'dean', 'department_head', 'student'],
        requiresSuperieur: true,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        to: "/modalites",
        label: "Modalités Scolarité",
        icon: DollarSign,
        roles: ['admin', 'director', 'accountant'],
        getDynamicLabel: (info) => info.isUniversityOnly ? "Frais Universitaires" : "Modalités Scolarité",
      },
      { to: "/paiement", label: "Caisse & Paiements", icon: CreditCard, roles: ['admin', 'director', 'accountant', 'cashier', 'responsible', 'parent'] },
      { to: "/decaissement", label: "Décaissements", icon: ArrowDownToLine, roles: ['admin', 'director', 'accountant'] },
      { to: "/terminaux-paiement", label: "Terminaux QR", icon: QrCode, roles: ['admin', 'director', 'accountant', 'cashier'] },
      {
        to: "/cantine",
        label: "Cantine Scolaire",
        icon: UtensilsCrossed,
        roles: ['admin', 'director', 'accountant', 'cashier', 'responsible', 'parent'],
        getDynamicLabel: (info) => info.isUniversityOnly ? "Restaurant Campus" : "Cantine Scolaire",
      },
      {
        to: "/transport",
        label: "Transport Scolaire",
        icon: Bus,
        roles: ['admin', 'director', 'accountant', 'cashier', 'responsible', 'parent', 'teacher'],
        getDynamicLabel: (info) => info.isUniversityOnly ? "Navettes Campus" : "Transport Scolaire",
      },
      {
        to: "/sante",
        label: "Infirmerie & Santé",
        icon: HeartPulse,
        roles: ['admin', 'director', 'doctor', 'medecin'],
      },
      { to: "/rh", label: "RH & Personnel", icon: Briefcase, roles: ['admin', 'director', 'accountant'] },
      { to: "/communication", label: "Communication & SMS", icon: MessageSquare, roles: ['admin', 'director', 'secretary', 'dean'] },
      { to: "/statistiques", label: "Statistiques & BI", icon: BarChart3, roles: ['admin', 'director', 'accountant', 'dean'] },
      { to: "/equipe", label: "Équipe & Accès", icon: Users, roles: ['admin', 'director'] },
    ],
  },
];

// Flatten for mobile nav
const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);

// ── Role label map ─────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Administrateur",
  director: "Directeur",
  accountant: "Comptable",
  teacher: "Enseignant",
  secretary: "Secrétaire",
  dean: "Doyen",
  department_head: "Chef de Dpt.",
  doctor: "Médecin",
  medecin: "Médecin",
  cashier: "Caissier",
  surveillance: "Surveillance",
  parent: "Parent",
  responsible: "Responsable",
  student: "Étudiant",
};

// ── Sidebar NavLink avec effet Liquide Glass ──────────────────────────────────────────
function SideNavLink({ item, active, collapsed }: { item: NavItem & { label: string }; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 border",
        collapsed ? "justify-center px-2" : "",
        active
          ? "bg-gradient-to-r from-white/22 via-white/16 to-white/10 backdrop-blur-xl text-white font-bold border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_14px_rgba(0,0,0,0.18)]"
          : "border-transparent text-white/70 hover:text-white hover:bg-white/10 hover:border-white/12 backdrop-blur-sm",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110", active ? "text-amber-300 drop-shadow-sm" : "text-white/65 group-hover:text-white")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {/* Active indicator dot */}
      {active && !collapsed && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)] shrink-0" />
      )}
    </Link>
  );
}

// ── Main AppShell ──────────────────────────────────────────────────────────
export function AppShell({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useAuth();
  const { campuses } = useCampuses();
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all');
  const { isOnline, isSyncing, pendingCount, sync } = useOfflineSync();
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Redirect logic
  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login" });
    } else if (!isLoading && profile?.role === 'superadmin') {
      navigate({ to: "/superadmin" });
    } else if (!isLoading && (profile?.role === 'doctor' || profile?.role === 'medecin')) {
      if (pathname === '/') navigate({ to: "/sante" });
    }
  }, [isLoading, user, profile?.role, pathname, navigate]);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (isLoading || (!user && !isLoading) || (profile?.role === 'superadmin' && !isLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Chargement d'Eurêka…</span>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const estInfo = getEstablishmentTypeInfo(profile?.tenant?.school_types);

  // Build filtered & labelled nav groups
  const filteredGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items
      .filter(item => {
        if (item.roles && profile?.role) {
          const userRoles = [profile.role, ...(profile.assigned_roles || [])];
          const hasAccess = item.roles.some(r => userRoles.includes(r as any));
          if (!hasAccess) return false;
        }
        if (item.requiresSuperieur && !estInfo.hasSuperieur) return false;
        if (item.requiresK12 && !estInfo.hasK12) return false;
        return true;
      })
      .map(item => ({
        ...item,
        label: item.getDynamicLabel ? item.getDynamicLabel(estInfo, profile?.role) : item.label,
        badge: item.getDynamicBadge ? item.getDynamicBadge(estInfo) : item.badge,
      })),
  })).filter(g => g.items.length > 0);

  const allNavItems = filteredGroups.flatMap(g => g.items);

  // User initials
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.substring(0, 2).toUpperCase() || 'ED');

  const roleLabel = ROLE_LABELS[profile?.role || ''] || profile?.role || 'Utilisateur';

  // Sync indicator color
  const syncColor = !isOnline ? 'bg-rose-400' : pendingCount > 0 ? 'bg-amber-400' : 'bg-emerald-400';

  // ── Sidebar JSX (shared between desktop & mobile overlay) ──
  function SidebarContent() {
    return (
      <div className="flex h-full flex-col bg-gradient-to-b from-[#144723]/94 via-[#0e361a]/96 to-[#082210]/98 backdrop-blur-2xl border-r border-white/15 shadow-[inset_-1px_0_0_rgba(255,255,255,0.08),inset_0_1px_1px_rgba(255,255,255,0.2),6px_0_30px_rgba(0,0,0,0.25)] relative overflow-hidden">
        {/* Lueur liquide subtile d'arrière-plan */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-0 -ml-16 w-48 h-48 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        {/* ── Brand ── */}
        <div className={cn("relative z-10 flex items-center gap-3 px-5 py-5", collapsed ? "justify-center px-3" : "")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 shadow-[0_4px_14px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.4)] p-1.5">
            <img src="/favicon.svg" alt="Eurêka" className="h-full w-full object-contain drop-shadow" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display text-lg font-bold text-white tracking-tight leading-tight">Eurêka</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-300/80">ERP Éducatif</div>
            </div>
          )}
          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="ml-auto hidden lg:flex shrink-0 items-center justify-center rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            title={collapsed ? "Agrandir" : "Réduire"}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* ── School card ── */}
        {!collapsed && (
          <div className="relative z-10 mx-3 mb-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-3 space-y-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.25)]">
            <div className="flex items-center justify-between">
              <span className="truncate text-xs font-semibold text-white/95">{profile?.tenant?.name || school.name}</span>
              <span className="ml-2 shrink-0 rounded-md bg-white/20 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-white/90">2025-26</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-tight border backdrop-blur-md",
                estInfo.isUniversityOnly
                  ? "border-purple-400/40 bg-purple-900/40 text-purple-200"
                  : estInfo.isMixed
                    ? "border-amber-400/40 bg-amber-900/40 text-amber-200"
                    : "border-emerald-400/40 bg-emerald-800/40 text-emerald-200"
              )}>
                {estInfo.badgeLabel}
              </span>
              {campuses.length > 0 && (
                <span className="text-[10px] text-white/50">{campuses.length} campus</span>
              )}
            </div>
            {campuses.length > 1 && (
              <select
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 backdrop-blur-md px-2 py-1 text-[11px] text-white/90 focus:outline-none focus:ring-1 focus:ring-amber-300/40"
              >
                <option value="all" className="bg-[#0e361a] text-white">Tous les campus ({campuses.length})</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0e361a] text-white">{c.name}{c.city ? ` — ${c.city}` : ''}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="relative z-10 flex-1 overflow-y-auto px-3 pb-2 space-y-4 custom-scrollbar">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
                  return (
                    <SideNavLink key={item.to} item={item} active={active} collapsed={collapsed} />
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Sync status ── */}
        <div className={cn("relative z-10 px-3 pb-2", collapsed && "flex justify-center")}>
          <button
            onClick={() => setSyncModalOpen(true)}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 backdrop-blur-xl px-3 py-2 text-[11px] text-white/80 hover:bg-white/18 hover:border-white/25 hover:text-white transition-all duration-200 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]",
              collapsed ? "justify-center w-10 h-10 p-0" : "w-full"
            )}
            title="Statut synchronisation"
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", syncColor, (!isOnline || pendingCount > 0) && "animate-pulse")} />
            {!collapsed && (
              <span className="truncate">
                {isSyncing
                  ? `Sync. (${pendingCount})…`
                  : !isOnline
                    ? `Hors-ligne · ${pendingCount} en attente`
                    : pendingCount > 0
                      ? `${pendingCount} en attente`
                      : "Synchronisé"}
              </span>
            )}
          </button>
        </div>

        {/* ── Bottom: Settings + User + Logout ── */}
        <div className="relative z-10 border-t border-white/15 px-3 py-3 space-y-1">
          {/* Settings link */}
          {(profile?.role === 'admin' || profile?.role === 'director') && (
            <Link
              to="/parametres"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/12 hover:text-white transition-colors",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? "Paramètres" : undefined}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Paramètres</span>}
            </Link>
          )}

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-rose-500/20 hover:text-rose-200 transition-colors",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Se déconnecter" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Se déconnecter</span>}
          </button>

          {/* User avatar card */}
          {!collapsed && (
            <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 px-3 py-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-sm font-bold text-white uppercase shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{profile?.full_name || user?.email}</div>
                <div className="truncate text-[11px] text-white/60">{roleLabel}</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center mt-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-sm font-bold text-white uppercase shadow-sm" title={profile?.full_name || user?.email}>
                {initials}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">

        {/* ── Desktop Sidebar ── */}
        <aside className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col lg:flex overflow-hidden transition-all duration-200",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}>
          <SidebarContent />
        </aside>

        {/* ── Mobile Sidebar Overlay ── */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-[240px] overflow-hidden z-50 shadow-2xl">
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* ── Main Workspace ── */}
        <div className="min-w-0 flex-1 flex flex-col min-h-screen">

          {/* Top Header */}
          <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-md">
            <div className="flex items-center gap-3 px-4 py-3 md:px-6">

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(o => !o)}
                className="lg:hidden shrink-0 rounded-lg border border-border p-2 hover:bg-secondary transition-colors"
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              {/* Title */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-bold tracking-tight text-foreground truncate">{title}</h1>
                </div>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
              </div>

              {/* Search */}
              <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground w-56 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input
                  type="text"
                  placeholder={estInfo.isUniversityOnly ? "Étudiant, filière…" : "Élève, classe, matricule…"}
                  className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full"
                />
              </div>

              {/* Notifications */}
              <Link
                to={'/communication' as any}
                className="relative shrink-0 rounded-xl border border-border bg-card p-2 hover:bg-secondary transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  3
                </span>
              </Link>

              {/* Offline badge */}
              {(!isOnline || pendingCount > 0) && (
                <button
                  onClick={() => setSyncModalOpen(true)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer",
                    !isOnline
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  )}
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

          {/* Page content */}
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>

      {/* Offline Sync Modal */}
      <OfflineSyncModal open={syncModalOpen} onOpenChange={setSyncModalOpen} />

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-border bg-card/95 backdrop-blur lg:hidden">
        {allNavItems.slice(0, 5).map((item) => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-[52px] text-center">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}
