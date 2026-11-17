import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStudents, StudentWithClass } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useAuth } from "@/hooks/useAuth";
import { StudentDossierDialog } from "@/components/StudentDossierDialog";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import {
  HeartPulse, Search, Stethoscope, AlertTriangle, Shield, Activity,
  Clock, ChevronRight, User, FileText, Users, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/sante")({
  head: () => ({
    meta: [
      { title: "Infirmerie & Santé Scolaire — Eurêka" },
      { name: "description", content: "Module médecin scolaire : dossiers santé, visites infirmerie et suivi des élèves." },
    ],
  }),
  component: SantePage,
});

function SantePage() {
  const { profile } = useAuth();
  const { studentsQuery } = useStudents();
  const { classesQuery } = useClasses();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [alertFilter, setAlertFilter] = useState<"all" | "allergies" | "dispense" | "condition">("all");
  const [dossierStudent, setDossierStudent] = useState<StudentWithClass | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const tenantId = profile?.tenant_id;

  // Fetch recent medical visits
  const { data: recentVisits = [] } = useQuery({
    queryKey: ["recent_medical_visits", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("medical_visits")
        .select("*, students(first_name, last_name, classes(name))")
        .eq("tenant_id", tenantId)
        .order("visit_date", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch student health stats
  const { data: healthStats } = useQuery({
    queryKey: ["health_stats", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { count: totalVisits } = await supabase
        .from("medical_visits")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      const { count: visitsThisMonth } = await supabase
        .from("medical_visits")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("visit_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      const { count: dispenses } = await supabase
        .from("medical_visits")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("eps_dispense", true);
      return { totalVisits: totalVisits || 0, visitsThisMonth: visitsThisMonth || 0, dispenses: dispenses || 0 };
    },
    enabled: !!tenantId,
  });

  const students = studentsQuery.data || [];
  const classes = classesQuery.data || [];

  const filtered = students.filter((s) => {
    const matchSearch =
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchClass = classFilter === "all" || s.class_id === classFilter;
    const matchAlert =
      alertFilter === "all" ||
      (alertFilter === "allergies" && s.allergies) ||
      (alertFilter === "condition" && s.medical_conditions) ||
      (alertFilter === "dispense" && s.eps_aptitude !== "Apte");
    return matchSearch && matchClass && matchAlert;
  });

  const studentsWithAlerts = students.filter(
    (s) => s.allergies || s.medical_conditions || (s.eps_aptitude && s.eps_aptitude !== "Apte")
  );

  const isDoctorOrAdmin = ["admin", "director", "doctor", "medecin", "superadmin"].includes(profile?.role || "");

  return (
    <AppShell
      title="Infirmerie & Santé Scolaire"
      subtitle="Module médecin scolaire — Suivi médical, dossiers santé et registre infirmerie"
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs"
            onClick={() => window.print()}
          >
            <FileText className="w-3.5 h-3.5" /> Exporter Registre Médical
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-100 text-rose-700">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Élèves Suivis</div>
              <div className="text-2xl font-black text-foreground">{students.length}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Alertes Médicales</div>
              <div className="text-2xl font-black text-amber-700">{studentsWithAlerts.length}</div>
              <div className="text-[11px] text-muted-foreground">Allergies, pathologies, dispenses</div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Visites ce Mois</div>
              <div className="text-2xl font-black text-indigo-700">{healthStats?.visitsThisMonth ?? "—"}</div>
              <div className="text-[11px] text-muted-foreground">{healthStats?.totalVisits ?? 0} visites totales</div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Dispenses EPS actives</div>
              <div className="text-2xl font-black text-emerald-700">{healthStats?.dispenses ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left: Student Health Registry */}
          <div className="xl:col-span-2 space-y-4">
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              {/* Header + Filters */}
              <div className="p-4 border-b border-border flex flex-wrap items-center gap-3 bg-gray-50/50">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-sm">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-xs"
                    placeholder="Rechercher un élève..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-40 h-8 text-xs bg-white">
                    <SelectValue placeholder="Toutes classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border">
                  {[
                    { id: "all", label: "Tous" },
                    { id: "allergies", label: "Allergies" },
                    { id: "condition", label: "Pathologies" },
                    { id: "dispense", label: "Dispenses EPS" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setAlertFilter(f.id as typeof alertFilter)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                        alertFilter === f.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Élève</th>
                      <th className="px-4 py-3 font-semibold">Classe</th>
                      <th className="px-4 py-3 font-semibold">Gr. Sanguin</th>
                      <th className="px-4 py-3 font-semibold">Alertes Santé</th>
                      <th className="px-4 py-3 font-semibold">Aptitude EPS</th>
                      <th className="px-4 py-3 font-semibold text-right">Dossier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                          <Stethoscope className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                          <p className="font-semibold text-gray-700">Aucun élève trouvé</p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((s) => {
                        const initials = `${s.first_name[0]}${s.last_name[0]}`.toUpperCase();
                        const hasAlert = s.allergies || s.medical_conditions;
                        const epsAptitude = s.eps_aptitude || "Apte";
                        return (
                          <tr
                            key={s.id}
                            className={`hover:bg-secondary/30 transition-colors ${hasAlert ? "bg-amber-50/40" : ""}`}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${hasAlert ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"}`}>
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground">{s.first_name} {s.last_name}</div>
                                  <div className="text-[11px] text-muted-foreground font-mono">
                                    {s.student_code || `EUR-${s.id.slice(0, 5).toUpperCase()}`}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800 border">
                                {s.classes?.name || "—"}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${s.blood_group ? "text-rose-700 bg-rose-50 border border-rose-200" : "text-gray-400"}`}>
                                {s.blood_group || "—"}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="space-y-1">
                                {s.allergies && (
                                  <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 w-fit">
                                    <AlertTriangle className="w-3 h-3" />
                                    Allergies signalées
                                  </div>
                                )}
                                {s.medical_conditions && (
                                  <div className="flex items-center gap-1 text-[11px] font-semibold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200 w-fit">
                                    <Activity className="w-3 h-3" />
                                    Pathologie connue
                                  </div>
                                )}
                                {!s.allergies && !s.medical_conditions && (
                                  <span className="text-xs text-muted-foreground">Aucune alerte</span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 border ${
                                epsAptitude === "Apte"
                                  ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                                  : epsAptitude === "Inapte partiel"
                                  ? "text-amber-800 bg-amber-50 border-amber-200"
                                  : "text-rose-800 bg-rose-50 border-rose-200"
                              }`}>
                                {epsAptitude}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setDossierStudent(s); setIsDossierOpen(true); }}
                                className="h-7 px-2.5 text-xs gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold"
                              >
                                <Stethoscope className="w-3 h-3" /> Dossier Santé
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Recent Visits Feed */}
          <div className="space-y-4">
            {/* Alerts Panel */}
            {studentsWithAlerts.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <h3 className="text-sm font-bold text-amber-900">
                    Élèves à Surveiller ({studentsWithAlerts.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {studentsWithAlerts.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => { setDossierStudent(s); setIsDossierOpen(true); }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-200 cursor-pointer hover:bg-amber-50/80 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.first_name} {s.last_name}</p>
                        <p className="text-[10px] text-amber-700 font-medium">
                          {s.allergies ? "Allergie" : ""}{s.allergies && s.medical_conditions ? " · " : ""}{s.medical_conditions ? "Pathologie" : ""}
                          {s.eps_aptitude && s.eps_aptitude !== "Apte" ? ` · ${s.eps_aptitude}` : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                  ))}
                  {studentsWithAlerts.length > 5 && (
                    <p className="text-[11px] text-center text-amber-700 font-semibold pt-1">
                      + {studentsWithAlerts.length - 5} autres alertes médicales
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recent Visits */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground">Dernières Consultations</h3>
              </div>

              {recentVisits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <Stethoscope className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Aucune consultation enregistrée.</p>
                  <p className="mt-1">Ouvrez le dossier d'un élève pour saisir une visite.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentVisits.map((v: any) => (
                    <div key={v.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-secondary/30 border border-border">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {v.students?.first_name} {v.students?.last_name}
                          {v.students?.classes?.name && (
                            <span className="font-normal text-muted-foreground"> · {v.students.classes.name}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{v.reason}</p>
                        {v.eps_dispense && (
                          <span className="inline-block text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded mt-0.5">
                            Dispense EPS {v.eps_dispense_days}j
                          </span>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
                          {new Date(v.visit_date).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Student Dossier Dialog (tab Santé auto-focused would be ideal) */}
      <StudentDossierDialog
        student={dossierStudent}
        open={isDossierOpen}
        onOpenChange={(open) => {
          setIsDossierOpen(open);
          if (!open) setDossierStudent(null);
        }}
      />
    </AppShell>
  );
}
