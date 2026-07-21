export const school = {
  name: "Groupe Scolaire Les Baobabs",
  city: "Abidjan, Côte d'Ivoire",
  year: "2025 — 2026",
  trimester: "Trimestre 2",
};

export const kpis = [
  { label: "Élèves inscrits", value: 1247, delta: "+42", hint: "vs. trimestre précédent" },
  { label: "Enseignants", value: 68, delta: "+3", hint: "3 nouvelles recrues" },
  { label: "Taux de présence", value: "94,2 %", delta: "+1,8 pt", hint: "moyenne du mois" },
  { label: "Taux de réussite", value: "81 %", delta: "+4 pt", hint: "moyenne générale ≥ 10" },
];

export const cycles = [
  { name: "Maternelle", classes: 4, students: 132 },
  { name: "Primaire", classes: 12, students: 486 },
  { name: "Collège", classes: 10, students: 402 },
  { name: "Lycée", classes: 8, students: 227 },
];

export const classes = [
  { name: "CP1 A", cycle: "Primaire", teacher: "Mme Aïcha Koné", students: 38, avg: 13.4, presence: 96 },
  { name: "CE2 B", cycle: "Primaire", teacher: "M. Ibrahim Diallo", students: 41, avg: 12.1, presence: 92 },
  { name: "CM2 A", cycle: "Primaire", teacher: "Mme Fatou Sy", students: 36, avg: 14.2, presence: 95 },
  { name: "6ème 1", cycle: "Collège", teacher: "M. Serge Kouamé", students: 44, avg: 11.8, presence: 93 },
  { name: "3ème 2", cycle: "Collège", teacher: "Mme Awa Traoré", students: 39, avg: 12.7, presence: 91 },
  { name: "Tle S", cycle: "Lycée", teacher: "M. Adama Bamba", students: 28, avg: 13.9, presence: 97 },
  { name: "Tle L", cycle: "Lycée", teacher: "Mme Mariam Ouédraogo", students: 31, avg: 12.5, presence: 89 },
];

export const subjects = [
  { code: "MATH", name: "Mathématiques", coef: 5 },
  { code: "FR", name: "Français", coef: 4 },
  { code: "PC", name: "Physique-Chimie", coef: 4 },
  { code: "SVT", name: "Sciences de la Vie et de la Terre", coef: 3 },
  { code: "HG", name: "Histoire-Géographie", coef: 3 },
  { code: "ANG", name: "Anglais", coef: 2 },
  { code: "EPS", name: "Éducation Physique", coef: 1 },
];

export const students = [
  { matricule: "ERK-2025-0142", nom: "Kouassi", prenom: "Aïcha", classe: "Tle S", moyenne: 15.2, rang: 1, presence: 98, sexe: "F" },
  { matricule: "ERK-2025-0087", nom: "Traoré", prenom: "Moussa", classe: "Tle S", moyenne: 14.6, rang: 2, presence: 95, sexe: "M" },
  { matricule: "ERK-2025-0231", nom: "Diallo", prenom: "Fatoumata", classe: "3ème 2", moyenne: 14.1, rang: 1, presence: 96, sexe: "F" },
  { matricule: "ERK-2025-0198", nom: "Kouamé", prenom: "Jean-Baptiste", classe: "6ème 1", moyenne: 13.4, rang: 3, presence: 91, sexe: "M" },
  { matricule: "ERK-2025-0322", nom: "Ouédraogo", prenom: "Salimata", classe: "CM2 A", moyenne: 15.8, rang: 1, presence: 99, sexe: "F" },
  { matricule: "ERK-2025-0410", nom: "Bamba", prenom: "Ismaël", classe: "CE2 B", moyenne: 11.2, rang: 12, presence: 87, sexe: "M" },
  { matricule: "ERK-2025-0505", nom: "Sy", prenom: "Awa", classe: "CP1 A", moyenne: 13.9, rang: 4, presence: 94, sexe: "F" },
  { matricule: "ERK-2025-0611", nom: "Koffi", prenom: "Emmanuel", classe: "Tle L", moyenne: 12.3, rang: 8, presence: 90, sexe: "M" },
];

export const recentActivity = [
  { time: "il y a 12 min", type: "Notes", detail: "Mme Traoré a saisi les notes de Composition — 3ème 2 / Français" },
  { time: "il y a 34 min", type: "Présence", detail: "Émargement validé pour 42 enseignants du matin" },
  { time: "il y a 1 h", type: "Inscription", detail: "Nouvelle inscription : Djeneba Cissé — CP1 B" },
  { time: "il y a 2 h", type: "Bulletin", detail: "Bulletins Trimestre 1 générés — CM2 A (36 élèves)" },
  { time: "il y a 3 h", type: "Programme", detail: "Programmation hebdo mise à jour — 6ème / Mathématiques" },
];

export const bulletin = {
  eleve: "Kouassi Aïcha",
  matricule: "ERK-2025-0142",
  classe: "Terminale S",
  effectif: 28,
  trimestre: "Trimestre 2 — 2025/2026",
  notes: [
    { matiere: "Mathématiques", coef: 5, note: 15.5, moyClasse: 12.4, appreciation: "Excellent travail, continue ainsi." },
    { matiere: "Physique-Chimie", coef: 4, note: 14.8, moyClasse: 11.9, appreciation: "Très bon niveau, restez concentrée." },
    { matiere: "SVT", coef: 3, note: 16.2, moyClasse: 13.1, appreciation: "Résultats remarquables." },
    { matiere: "Français", coef: 4, note: 13.5, moyClasse: 12.0, appreciation: "Bon trimestre." },
    { matiere: "Histoire-Géo", coef: 3, note: 14.0, moyClasse: 11.7, appreciation: "Travail sérieux." },
    { matiere: "Anglais", coef: 2, note: 16.5, moyClasse: 13.4, appreciation: "Très bonne participation." },
    { matiere: "EPS", coef: 1, note: 15.0, moyClasse: 14.2, appreciation: "Élève dynamique." },
  ],
  moyenne: 15.2,
  moyClasse: 12.3,
  rang: "1er / 28",
  appreciationGenerale: "Trimestre remarquable. Aïcha fait preuve de rigueur et de constance. Encouragements du Conseil de Classe.",
};