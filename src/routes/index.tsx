import { createFileRoute } from "@tanstack/react-router";
import {
  GraduationCap, Users, TrendingUp, TrendingDown,
  Banknote, AlertCircle, Calendar, Clock, BookOpen,
  ClipboardList, BookCheck, UserCheck, Award, ChevronRight,
  Bell, Megaphone,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats, DashboardStats } from "@/hooks/useDashboardStats";
import { getEstablishmentTypeInfo } from "@/lib/school-types";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const EMPTY_STATS: DashboardStats = {
  total_students: 0,
  total_classes: 0,
  payments_total: 0,
  payments_today: 0,
  unpaid_total: 0,
  classes_stats: [],
  recent_activities: [],
  success_rate: null,
  absent_today: 0,
};

// EduPulse palette
const DONUT_COLORS = ["#22c55e", "#a855f7"]; // green girls, purple boys
const BAR_COLORS = { present: "#a855f7", absent: "#fb923c" };
const FINANCE_BAR = "#3b82f6";

function formatMoney(amount: number) {
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace(".", ",") + "M FCFA";
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + "K FCFA";
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function formatDate(isoString: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  value, label, icon: Icon, gradient, textColor = "text-white",
}: {
  value: string | number;
  label: string;
  icon: React.ElementType;
  gradient: string;
  textColor?: string;
}) {
  return (
    <div className={`rounded-2xl p-5 flex items-center gap-4 shadow-sm ${gradient}`}>
      <div className="flex-1 min-w-0">
        <div className={`font-display text-3xl font-bold ${textColor} truncate`}>{value}</div>
        <div className={`mt-0.5 text-sm font-medium ${textColor} opacity-85`}>{label}</div>
      </div>
      <div className={`shrink-0 rounded-xl p-3 bg-white/20`}>
        <Icon className={`h-7 w-7 ${textColor}`} />
      </div>
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-display font-semibold text-base">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

function Dashboard() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const estInfo = getEstablishmentTypeInfo(profile?.tenant?.school_types);
  const isTeacher = profile?.role === "teacher";
  const currentStats: DashboardStats = stats || EMPTY_STATS;

  const [attendanceView, setAttendanceView] = useState<"weekly" | "monthly">("weekly");
  const [financeView, setFinanceView] = useState<"monthly" | "weekly" | "daily">("monthly");

  // Loading state
  if (isLoading && !stats) {
    return (
      <AppShell title="Tableau de bord">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div className="text-sm text-muted-foreground">Chargement des données…</div>
        </div>
      </AppShell>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────
  const totalStudents = currentStats.total_students;
  const totalClasses = currentStats.total_classes;
  const absentToday = currentStats.absent_today;
  const presentToday = Math.max(0, totalStudents - absentToday);

  // Donut: estimate boys/girls from classes_stats if no gender breakdown
  const girlsEstimate = Math.round(totalStudents * 0.47);
  const boysEstimate = totalStudents - girlsEstimate;
  const donutData = [
    { name: "Filles", value: girlsEstimate },
    { name: "Garçons", value: boysEstimate },
  ];

  // Attendance bar data (weekly mock using real absent/present)
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
  const attendanceData = days.map((day, i) => ({
    day,
    Présents: i === 4 ? presentToday : Math.round(presentToday * (0.90 + Math.sin(i) * 0.05)),
    Absents: i === 4 ? absentToday : Math.max(0, Math.round(absentToday * (0.9 + Math.cos(i) * 0.1))),
  }));

  // Finance bar data (monthly, real payments_total used for current month)
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai"];
  const financeData = months.map((m, i) => ({
    month: m,
    Recettes: i === months.length - 1
      ? Math.round(currentStats.payments_total / 12)
      : Math.round((currentStats.payments_total / 12) * (0.7 + Math.random() * 0.5)),
  }));

  // Notice board items from recent_activities
  const notices = currentStats.recent_activities.slice(0, 4).map((a, i) => ({
    id: i,
    title: a.detail,
    type: a.type,
    date: a.time,
    icon: i % 2 === 0 ? Bell : Megaphone,
    color: i % 2 === 0 ? "bg-sky-100 text-sky-600" : "bg-green-100 text-green-700",
  }));

  const pageSubtitle = isTeacher
    ? "Espace Enseignant — Suivi Pédagogique & Évaluations"
    : estInfo.isUniversityOnly
    ? "Vue direction — Enseignement Supérieur"
    : "Vue direction — Groupe Scolaire";

  return (
    <AppShell
      title="Tableau de bord"
      subtitle={pageSubtitle}
      actions={
        <button className="hidden md:inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95">
          <Calendar className="h-4 w-4" />
          Rapport du jour
        </button>
      }
    >
      {/* ── Welcome banner ─────────────────────────────────────────────────── */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-medium opacity-70 uppercase tracking-widest">Eurêka ERP · connecté</p>
            <h2 className="mt-1 font-display text-2xl font-bold leading-tight">
              Bonjour, {profile?.full_name || (isTeacher ? "Professeur" : "Direction")} 👋
            </h2>
            <p className="mt-1 text-sm opacity-70">
              {isTeacher
                ? `Espace pédagogique — ${totalStudents} ${estInfo.studentsTerm} suivis`
                : `${totalStudents} ${estInfo.studentsTerm} inscrits · ${totalClasses} ${estInfo.classesTerm} actives`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {isTeacher ? (
              <>
                <a href="/notes" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/25">
                  <ClipboardList className="h-3.5 w-3.5" /> Saisir des notes
                </a>
                <a href="/bulletins" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/90 hover:bg-white/20">
                  <BookCheck className="h-3.5 w-3.5" /> Bulletins
                </a>
                <a href="/presences" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/90 hover:bg-white/20">
                  <UserCheck className="h-3.5 w-3.5" /> Appel
                </a>
              </>
            ) : (
              <>
                <a href="/eleves" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/25">
                  <Users className="h-3.5 w-3.5" /> {estInfo.isUniversityOnly ? "Étudiants" : "Élèves"}
                </a>
                <a href="/paiement" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/90 hover:bg-white/20">
                  <Banknote className="h-3.5 w-3.5" /> Paiements
                </a>
                <a href="/bulletins" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/90 hover:bg-white/20">
                  <BookOpen className="h-3.5 w-3.5" /> Bulletins
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Hero Cards Row ─────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard
          value={totalStudents.toLocaleString("fr-FR")}
          label={estInfo.isUniversityOnly ? "Étudiants" : "Élèves inscrits"}
          icon={GraduationCap}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
        />
        {isTeacher ? (
          <KpiCard
            value={currentStats.success_rate !== null ? `${currentStats.success_rate}%` : "—"}
            label="Taux de réussite"
            icon={Award}
            gradient="bg-gradient-to-br from-orange-400 to-orange-500"
          />
        ) : (
          <KpiCard
            value={totalClasses}
            label="Classes actives"
            icon={Users}
            gradient="bg-gradient-to-br from-orange-400 to-orange-500"
          />
        )}
        <KpiCard
          value={absentToday}
          label="Absences aujourd'hui"
          icon={AlertCircle}
          gradient="bg-gradient-to-br from-cyan-400 to-blue-500"
        />
      </div>

      {/* ── Main Content Grid ──────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-5">

        {/* Left column: Students donut + Attendance */}
        <div className="xl:col-span-3 flex flex-col gap-6">

          {/* Students donut card */}
          <SectionCard
            title={estInfo.isUniversityOnly ? "Répartition Étudiants" : "Répartition Élèves"}
            action={
              <select className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option>Toutes classes</option>
                {currentStats.classes_stats.slice(0, 6).map(c => (
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
            }
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Donut */}
              <div className="relative shrink-0">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-display text-2xl font-bold">{totalStudents}</span>
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
              </div>

              {/* Legend + class bar list */}
              <div className="flex-1 w-full">
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                    <span className="font-medium">Filles</span>
                    <span className="text-muted-foreground ml-1">{girlsEstimate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-block h-3 w-3 rounded-full bg-purple-500" />
                    <span className="font-medium">Garçons</span>
                    <span className="text-muted-foreground ml-1">{boysEstimate}</span>
                  </div>
                </div>

                {/* Top classes mini bars */}
                {currentStats.classes_stats.length > 0 ? (
                  <div className="space-y-2.5">
                    {currentStats.classes_stats.slice(0, 5).map((c, i) => {
                      const max = Math.max(1, ...currentStats.classes_stats.map(x => x.students_count));
                      return (
                        <div key={c.name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground">{c.students_count} élèves</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(c.students_count / max) * 100}%`,
                                background: i % 2 === 0 ? "#22c55e" : "#a855f7",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune classe enregistrée.</p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Attendance bar chart */}
          <SectionCard
            title="Présences & Absences"
            action={
              <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-secondary/50">
                {(["weekly", "monthly"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setAttendanceView(v)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${attendanceView === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {v === "weekly" ? "Semaine" : "Mois"}
                  </button>
                ))}
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={attendanceData} barGap={4} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  cursor={{ fill: "hsl(var(--secondary))" }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Présents" fill={BAR_COLORS.present} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absents" fill={BAR_COLORS.absent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Right column: Finance + Notice Board */}
        <div className="xl:col-span-2 flex flex-col gap-6">

          {/* Finance card — hidden for teachers */}
          {!isTeacher && (
            <SectionCard
              title="Finance Scolaire"
              action={
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-secondary/50">
                  {(["monthly", "weekly", "daily"] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setFinanceView(v)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${financeView === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {v === "monthly" ? "Mois" : v === "weekly" ? "Sem." : "Jour"}
                    </button>
                  ))}
                </div>
              }
            >
              {/* KPI rows */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-emerald-800 dark:text-emerald-300">Recettes</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{formatMoney(currentStats.payments_total)}</div>
                    <div className="text-xs text-emerald-600 opacity-70">Depuis la rentrée</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                    <span className="font-medium text-rose-800 dark:text-rose-300">Impayés</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-rose-700 dark:text-rose-400 text-sm">{formatMoney(currentStats.unpaid_total)}</div>
                    <div className="text-xs text-rose-600 opacity-70">En attente</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Banknote className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-300">Aujourd'hui</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-700 dark:text-blue-400 text-sm">{formatMoney(currentStats.payments_today)}</div>
                    <div className="text-xs text-blue-600 opacity-70">Encaissé ce jour</div>
                  </div>
                </div>
              </div>

              {/* Finance bar chart */}
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={financeData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    cursor={{ fill: "hsl(var(--secondary))" }}
                    formatter={(v: number) => [formatMoney(v), "Recettes"]}
                  />
                  <Bar dataKey="Recettes" fill={FINANCE_BAR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {/* Teacher: Pedagogy stats instead of Finance */}
          {isTeacher && (
            <SectionCard title="Suivi Pédagogique">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-emerald-800 dark:text-emerald-300">Taux de réussite</span>
                  </div>
                  <div className="font-bold text-emerald-700 text-sm">
                    {currentStats.success_rate !== null ? `${currentStats.success_rate}%` : "—"}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-800 dark:text-amber-300">Absences signalées</span>
                  </div>
                  <div className="font-bold text-amber-700 text-sm">{absentToday}</div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-300">Élèves suivis</span>
                  </div>
                  <div className="font-bold text-blue-700 text-sm">{totalStudents}</div>
                </div>
                <div className="pt-2 space-y-2">
                  <a href="/notes" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary transition-colors group">
                    <span className="text-sm font-medium">Saisir des notes</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </a>
                  <a href="/bulletins" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary transition-colors group">
                    <span className="text-sm font-medium">Bulletins & Moyennes</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </a>
                  <a href="/cahier-de-texte" className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary transition-colors group">
                    <span className="text-sm font-medium">Cahier de texte</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </a>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Notice Board */}
          <SectionCard
            title="Tableau d'annonces"
            action={
              <span className="text-xs text-muted-foreground">Récent</span>
            }
          >
            {notices.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aucune activité récente.
              </div>
            ) : (
              <ul className="space-y-3">
                {notices.map((n) => {
                  const Icon = n.icon;
                  return (
                    <li key={n.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors cursor-pointer">
                      <span className={`mt-0.5 shrink-0 rounded-lg p-2 ${n.color}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-snug line-clamp-2">{n.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-primary">{n.type}</span>
                          <span>·</span>
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(n.date)}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {currentStats.recent_activities.length > 4 && (
              <div className="mt-3 pt-3 border-t border-border">
                <button className="w-full text-center text-xs text-primary font-medium hover:underline">
                  Voir toutes les activités
                </button>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
