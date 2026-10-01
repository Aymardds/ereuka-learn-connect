import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useTimetable } from '@/hooks/useTimetable';
import { useCourseLogs } from '@/hooks/useCourseLogs';
import { useGrades } from '@/hooks/useGrades';
import { 
  GraduationCap, Calendar, BookOpen, Clock, FileText, 
  Award, CheckCircle2, AlertCircle, ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/portail-etudiant')({
  component: StudentPortalPage,
});

function StudentPortalPage() {
  const { slots } = useTimetable();
  const { courseLogs } = useCourseLogs();
  const { grades } = useGrades();

  const currentDay = new Date().getDay(); // 1=Lundi, 6=Samedi
  const todaySlots = slots.filter(s => s.day_of_week === (currentDay === 0 ? 1 : currentDay));
  const pendingHomework = courseLogs.filter(l => l.homework_assigned).slice(0, 3);

  return (
    <AppShell
      title="Espace Étudiant / Élève"
      subtitle="Emploi du temps du jour, devoirs à rendre, notes et bulletins"
    >
      {/* Student Welcome Banner */}
      <div className="mb-6 rounded-2xl bg-primary text-primary-foreground p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent">
              <GraduationCap className="w-4 h-4" /> Année Académique 2025-2026
            </span>
            <h2 className="mt-2 font-display text-2xl md:text-3xl font-bold">
              Bienvenue sur votre espace étudiant Eurêka
            </h2>
            <p className="mt-1 text-xs md:text-sm text-primary-foreground/70 max-w-xl">
              Consultez vos cours de la journée, soumettez vos devoirs et suivez votre progression trimestrielle en direct.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-foreground/10 p-3 text-center min-w-24">
              <div className="text-[10px] uppercase text-primary-foreground/60 font-semibold">Moyenne T1</div>
              <div className="mt-1 font-display text-2xl font-bold text-accent">14.60</div>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-3 text-center min-w-24">
              <div className="text-[10px] uppercase text-primary-foreground/60 font-semibold">Rang</div>
              <div className="mt-1 font-display text-2xl font-bold">3ème</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-sm text-foreground">Programme des cours d'aujourd'hui</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {todaySlots.length} cours programmés
            </span>
          </div>

          {todaySlots.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground italic">
              Aucun cours programmé pour cette journée. Profitez-en pour réviser !
            </div>
          ) : (
            <div className="space-y-3">
              {todaySlots.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-secondary/30 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-primary">
                      {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                    </span>
                    <div>
                      <div className="font-semibold text-foreground">{s.subject?.name || 'Matière'}</div>
                      <div className="text-[11px] text-muted-foreground">Salle : {s.room_name || 'Standard'}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                    Présence requise
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recent Marks */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-accent" /> Dernières notes obtenues
              </h4>
              <span className="text-xs text-muted-foreground font-mono">Trimestre 1</span>
            </div>

            {grades.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {grades.slice(0, 4).map((g) => (
                  <div key={g.id} className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs hover:border-primary/30 transition-colors">
                    <div>
                      <div className="font-semibold text-foreground">{g.subject?.name || 'Matière'}</div>
                      <div className="text-[10px] text-muted-foreground">{g.evaluation_name || 'Évaluation continue'}</div>
                    </div>
                    <div className={`font-mono font-bold text-sm ${Number(g.score) >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {Number(g.score).toFixed(1)} / {g.max_score || 20}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-foreground">Mathématiques</div>
                    <div className="text-[10px] text-muted-foreground">Devoir sur table N°2</div>
                  </div>
                  <div className="font-mono font-bold text-sm text-emerald-600">16.5 / 20</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-foreground">Algorithmique & C</div>
                    <div className="text-[10px] text-muted-foreground">TP Programmation</div>
                  </div>
                  <div className="font-mono font-bold text-sm text-emerald-600">15.0 / 20</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-foreground">Systèmes Informatiques</div>
                    <div className="text-[10px] text-muted-foreground">Évaluation continue</div>
                  </div>
                  <div className="font-mono font-bold text-sm text-foreground">13.0 / 20</div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-foreground">Anglais Technique</div>
                    <div className="text-[10px] text-muted-foreground">Compréhension orale</div>
                  </div>
                  <div className="font-mono font-bold text-sm text-accent">14.0 / 20</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Homework & Bulletins sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-500" /> Devoirs à rendre
            </h3>

            {pendingHomework.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                Aucun travail de maison en attente.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {pendingHomework.map(h => (
                  <div key={h.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>{h.subject?.name}</span>
                      {h.homework_due_date && (
                        <span className="text-[10px] font-mono text-amber-800 dark:text-amber-300">
                          Pour le {h.homework_due_date}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{h.homework_assigned}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LMD Credits & University Section */}
          <div className="rounded-2xl border border-emerald-500/30 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" /> Système LMD (Supérieur)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                Licence 1
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Crédits validés Semestre 1 :</span>
                <span className="font-bold font-mono text-emerald-600">30 / 30 ECTS</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full w-full" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Progression totale Licence :</span>
                <span className="font-mono font-semibold">30 / 180 ECTS (17%)</span>
              </div>
            </div>
            <Link to="/lmd" className="mt-4 block">
              <Button size="sm" className="w-full text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
                <GraduationCap className="w-3.5 h-3.5" /> Relevé LMD & Maquette
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" /> Bulletins & Relevés
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Consultez ou téléchargez vos relevés officiels signés par la direction de l'école.
            </p>
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Télécharger Bulletin T1 (PDF)
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
