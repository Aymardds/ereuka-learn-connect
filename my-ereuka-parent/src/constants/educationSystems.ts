/**
 * RÉFÉRENTIEL DES CLASSES PAR PAYS
 * Conforme aux standards des Ministères de l'Éducation Nationale
 * d'Afrique francophone subsaharienne.
 *
 * Sources :
 *  - Côte d'Ivoire  : MENA (Ministère de l'Éducation Nationale et de l'Alphabétisation)
 *  - Sénégal        : MEN (Ministère de l'Éducation Nationale)
 *  - Cameroun       : MINESEC / MINESUP (système bilingue Fr/En)
 *  - Burkina Faso   : MENAPLN
 *  - Mali           : MEN
 *  - Guinée Conakry : MEPUA
 *  - Togo           : MEPS
 *  - Bénin          : MEMP
 *  - Congo-Brazza   : MEPSA
 *  - RDC            : MEPSP
 *  - Gabon          : MEN
 *  - Niger          : MEN
 */

export type SchoolLevel = 'maternelle' | 'primaire' | 'college' | 'lycee' | 'universite';

export interface ClassItem {
  /** Identifiant unique (utilisé en DB / slug) */
  id: string;
  /** Nom officiel affiché */
  label: string;
  /** Niveau scolaire */
  level: SchoolLevel;
  /** Âge typique de l'élève */
  typicalAge?: number;
  /** Abréviation courante */
  short?: string;
  /** Examen national de fin de cycle */
  examAtEnd?: string;
}

export interface CountryEducationSystem {
  /** Code ISO 3166-1 alpha-2 */
  countryCode: string;
  /** Nom du pays */
  countryName: string;
  /** Emoji drapeau */
  flag: string;
  /** Langue principale d'enseignement */
  language: 'fr' | 'en' | 'fr-en';
  /** Échelle de notation par défaut */
  gradingScale: 'out_of_20' | 'out_of_100' | 'letter';
  /** Note de passage */
  passingGrade: number;
  /** Périodes / trimestres */
  terms: { code: string; label: string }[];
  /** Toutes les classes, dans l'ordre */
  classes: ClassItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CÔTE D'IVOIRE
// Système : Maternelle (3 ans) + Primaire (6 ans) + Collège (4 ans) + Lycée (3 ans)
// Notation : /20 — Passage : 10/20
// Trimestres : 3
// ─────────────────────────────────────────────────────────────────────────────
const CI_CLASSES: ClassItem[] = [
  // Maternelle
  { id: 'ps',   label: 'Petite Section (PS)',     level: 'maternelle', typicalAge: 3, short: 'PS' },
  { id: 'ms',   label: 'Moyenne Section (MS)',    level: 'maternelle', typicalAge: 4, short: 'MS' },
  { id: 'gs',   label: 'Grande Section (GS)',     level: 'maternelle', typicalAge: 5, short: 'GS' },
  // Primaire
  { id: 'cp1',  label: 'CP1',  level: 'primaire', typicalAge: 6,  short: 'CP1' },
  { id: 'cp2',  label: 'CP2',  level: 'primaire', typicalAge: 7,  short: 'CP2' },
  { id: 'ce1',  label: 'CE1',  level: 'primaire', typicalAge: 8,  short: 'CE1' },
  { id: 'ce2',  label: 'CE2',  level: 'primaire', typicalAge: 9,  short: 'CE2' },
  { id: 'cm1',  label: 'CM1',  level: 'primaire', typicalAge: 10, short: 'CM1' },
  { id: 'cm2',  label: 'CM2',  level: 'primaire', typicalAge: 11, short: 'CM2', examAtEnd: 'CEPE' },
  // Collège (1er cycle secondaire)
  { id: '6eme', label: '6ème', level: 'college', typicalAge: 12, short: '6ème' },
  { id: '5eme', label: '5ème', level: 'college', typicalAge: 13, short: '5ème' },
  { id: '4eme', label: '4ème', level: 'college', typicalAge: 14, short: '4ème' },
  { id: '3eme', label: '3ème', level: 'college', typicalAge: 15, short: '3ème', examAtEnd: 'BEPC' },
  // Lycée – 2nd cycle (Séries : A, B, C, D, E, F, G, T)
  { id: '2nde-a',  label: 'Seconde A',       level: 'lycee', typicalAge: 16, short: '2nde A' },
  { id: '2nde-c',  label: 'Seconde C',       level: 'lycee', typicalAge: 16, short: '2nde C' },
  { id: '2nde-d',  label: 'Seconde D',       level: 'lycee', typicalAge: 16, short: '2nde D' },
  { id: '1ere-a',  label: 'Première A',      level: 'lycee', typicalAge: 17, short: '1ère A' },
  { id: '1ere-b',  label: 'Première B',      level: 'lycee', typicalAge: 17, short: '1ère B' },
  { id: '1ere-c',  label: 'Première C',      level: 'lycee', typicalAge: 17, short: '1ère C' },
  { id: '1ere-d',  label: 'Première D',      level: 'lycee', typicalAge: 17, short: '1ère D' },
  { id: '1ere-f',  label: 'Première F (Sciences Techniques)', level: 'lycee', typicalAge: 17, short: '1ère F' },
  { id: '1ere-g',  label: 'Première G (Gestion)',             level: 'lycee', typicalAge: 17, short: '1ère G' },
  { id: 'tle-a',   label: 'Terminale A (Lettres & Philo)',    level: 'lycee', typicalAge: 18, short: 'Tle A',  examAtEnd: 'BAC A' },
  { id: 'tle-b',   label: 'Terminale B (Économie)',           level: 'lycee', typicalAge: 18, short: 'Tle B',  examAtEnd: 'BAC B' },
  { id: 'tle-c',   label: 'Terminale C (Maths-Sciences Phys)', level: 'lycee', typicalAge: 18, short: 'Tle C', examAtEnd: 'BAC C' },
  { id: 'tle-d',   label: 'Terminale D (SVT)',                level: 'lycee', typicalAge: 18, short: 'Tle D',  examAtEnd: 'BAC D' },
  { id: 'tle-f',   label: 'Terminale F (Techniques Ind.)',    level: 'lycee', typicalAge: 18, short: 'Tle F',  examAtEnd: 'BAC F' },
  { id: 'tle-g2',  label: 'Terminale G2 (Comptabilité)',      level: 'lycee', typicalAge: 18, short: 'Tle G2', examAtEnd: 'BAC G2' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SÉNÉGAL
// Similaire au système français — quelques variantes terminologiques
// Notation : /20 — Passage : 10/20 — Trimestres : 3
// ─────────────────────────────────────────────────────────────────────────────
const SN_CLASSES: ClassItem[] = [
  { id: 'ps',   label: 'Petite Section',  level: 'maternelle', typicalAge: 3, short: 'PS' },
  { id: 'ms',   label: 'Moyenne Section', level: 'maternelle', typicalAge: 4, short: 'MS' },
  { id: 'gs',   label: 'Grande Section',  level: 'maternelle', typicalAge: 5, short: 'GS' },
  { id: 'ci',   label: 'CI (Cours d\'Initiation)', level: 'primaire', typicalAge: 6, short: 'CI' },
  { id: 'cp',   label: 'CP (Cours Préparatoire)',  level: 'primaire', typicalAge: 7, short: 'CP' },
  { id: 'ce1',  label: 'CE1', level: 'primaire', typicalAge: 8,  short: 'CE1' },
  { id: 'ce2',  label: 'CE2', level: 'primaire', typicalAge: 9,  short: 'CE2' },
  { id: 'cm1',  label: 'CM1', level: 'primaire', typicalAge: 10, short: 'CM1' },
  { id: 'cm2',  label: 'CM2', level: 'primaire', typicalAge: 11, short: 'CM2', examAtEnd: 'CFEE' },
  { id: '6eme', label: '6ème', level: 'college', typicalAge: 12, short: '6ème' },
  { id: '5eme', label: '5ème', level: 'college', typicalAge: 13, short: '5ème' },
  { id: '4eme', label: '4ème', level: 'college', typicalAge: 14, short: '4ème' },
  { id: '3eme', label: '3ème', level: 'college', typicalAge: 15, short: '3ème', examAtEnd: 'BFEM' },
  { id: '2nde', label: 'Seconde',         level: 'lycee', typicalAge: 16, short: '2nde' },
  { id: '1ere-l',  label: 'Première L (Littéraire)',   level: 'lycee', typicalAge: 17, short: '1ère L' },
  { id: '1ere-s1', label: 'Première S1 (Maths-Physique)', level: 'lycee', typicalAge: 17, short: '1ère S1' },
  { id: '1ere-s2', label: 'Première S2 (SVT)',          level: 'lycee', typicalAge: 17, short: '1ère S2' },
  { id: 'tle-l',   label: 'Terminale L (Littéraire)',   level: 'lycee', typicalAge: 18, short: 'Tle L',  examAtEnd: 'BAC L' },
  { id: 'tle-s1',  label: 'Terminale S1 (Maths-Physique)', level: 'lycee', typicalAge: 18, short: 'Tle S1', examAtEnd: 'BAC S1' },
  { id: 'tle-s2',  label: 'Terminale S2 (SVT)',          level: 'lycee', typicalAge: 18, short: 'Tle S2', examAtEnd: 'BAC S2' },
  { id: 'tle-s3',  label: 'Terminale S3 (Techn. Ind.)', level: 'lycee', typicalAge: 18, short: 'Tle S3',  examAtEnd: 'BAC S3' },
  { id: 'tle-g',   label: 'Terminale G (Gestion)',      level: 'lycee', typicalAge: 18, short: 'Tle G',   examAtEnd: 'BAC G' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CAMEROUN (Système bilingue Fr/En)
// Notation : /20 (fr) ou /100 (en) — Trimestres : 3
// ─────────────────────────────────────────────────────────────────────────────
const CM_CLASSES: ClassItem[] = [
  // Maternelle
  { id: 'nursery-1', label: 'Nursery 1 / SIL',     level: 'maternelle', typicalAge: 3, short: 'Nursery 1' },
  { id: 'nursery-2', label: 'Nursery 2 / Moyenne',  level: 'maternelle', typicalAge: 4, short: 'Nursery 2' },
  { id: 'gs',        label: 'Grande Section',        level: 'maternelle', typicalAge: 5, short: 'GS' },
  // Primaire francophone
  { id: 'sil', label: 'SIL (Section d\'Initiation à la Lecture)', level: 'primaire', typicalAge: 6, short: 'SIL' },
  { id: 'cp',  label: 'CP',  level: 'primaire', typicalAge: 7,  short: 'CP' },
  { id: 'ce1', label: 'CE1', level: 'primaire', typicalAge: 8,  short: 'CE1' },
  { id: 'ce2', label: 'CE2', level: 'primaire', typicalAge: 9,  short: 'CE2' },
  { id: 'cm1', label: 'CM1', level: 'primaire', typicalAge: 10, short: 'CM1' },
  { id: 'cm2', label: 'CM2', level: 'primaire', typicalAge: 11, short: 'CM2', examAtEnd: 'CEPE / FSLC' },
  // Collège francophone (Première à Quatrième)
  { id: '6eme', label: '6ème', level: 'college', typicalAge: 12, short: '6ème' },
  { id: '5eme', label: '5ème', level: 'college', typicalAge: 13, short: '5ème' },
  { id: '4eme', label: '4ème', level: 'college', typicalAge: 14, short: '4ème' },
  { id: '3eme', label: '3ème', level: 'college', typicalAge: 15, short: '3ème', examAtEnd: 'BEPC / BECE' },
  // Lycée (2nd cycle)
  { id: '2nde',    label: 'Seconde',                level: 'lycee', typicalAge: 16, short: '2nde' },
  { id: '1ere-a',  label: 'Première A (Lettres)',   level: 'lycee', typicalAge: 17, short: '1ère A' },
  { id: '1ere-c',  label: 'Première C (Maths)',     level: 'lycee', typicalAge: 17, short: '1ère C' },
  { id: '1ere-d',  label: 'Première D (SVT)',       level: 'lycee', typicalAge: 17, short: '1ère D' },
  { id: 'tle-a',   label: 'Terminale A',            level: 'lycee', typicalAge: 18, short: 'Tle A', examAtEnd: 'BAC A' },
  { id: 'tle-c',   label: 'Terminale C',            level: 'lycee', typicalAge: 18, short: 'Tle C', examAtEnd: 'BAC C' },
  { id: 'tle-d',   label: 'Terminale D',            level: 'lycee', typicalAge: 18, short: 'Tle D', examAtEnd: 'BAC D' },
  { id: 'tle-f',   label: 'Terminale F (Techniques Industrielles)', level: 'lycee', typicalAge: 18, short: 'Tle F', examAtEnd: 'BAC F' },
  { id: 'tle-g',   label: 'Terminale G (Commerce)', level: 'lycee', typicalAge: 18, short: 'Tle G', examAtEnd: 'BAC G' },
  // Anglophones
  { id: 'form1', label: 'Form 1', level: 'college', typicalAge: 12, short: 'Form 1' },
  { id: 'form2', label: 'Form 2', level: 'college', typicalAge: 13, short: 'Form 2' },
  { id: 'form3', label: 'Form 3', level: 'college', typicalAge: 14, short: 'Form 3' },
  { id: 'form4', label: 'Form 4', level: 'college', typicalAge: 15, short: 'Form 4' },
  { id: 'form5', label: 'Form 5', level: 'college', typicalAge: 16, short: 'Form 5', examAtEnd: 'GCE O-Level' },
  { id: 'ls1',   label: 'Lower Sixth (LS1)', level: 'lycee', typicalAge: 17, short: 'LS1' },
  { id: 'us2',   label: 'Upper Sixth (US2)', level: 'lycee', typicalAge: 18, short: 'US2', examAtEnd: 'GCE A-Level' },
];

// ─────────────────────────────────────────────────────────────────────────────
// BURKINA FASO (identique CI sauf CP1/CP2 → CP)
// ─────────────────────────────────────────────────────────────────────────────
const BF_CLASSES: ClassItem[] = [
  { id: 'ps',  label: 'Petite Section',  level: 'maternelle', typicalAge: 3, short: 'PS' },
  { id: 'ms',  label: 'Moyenne Section', level: 'maternelle', typicalAge: 4, short: 'MS' },
  { id: 'gs',  label: 'Grande Section',  level: 'maternelle', typicalAge: 5, short: 'GS' },
  { id: 'cp',  label: 'CP',  level: 'primaire', typicalAge: 6, short: 'CP' },
  { id: 'ce1', label: 'CE1', level: 'primaire', typicalAge: 7, short: 'CE1' },
  { id: 'ce2', label: 'CE2', level: 'primaire', typicalAge: 8, short: 'CE2' },
  { id: 'cm1', label: 'CM1', level: 'primaire', typicalAge: 9, short: 'CM1' },
  { id: 'cm2', label: 'CM2', level: 'primaire', typicalAge: 10, short: 'CM2', examAtEnd: 'CEPE' },
  { id: '6eme', label: '6ème', level: 'college', typicalAge: 12, short: '6ème' },
  { id: '5eme', label: '5ème', level: 'college', typicalAge: 13, short: '5ème' },
  { id: '4eme', label: '4ème', level: 'college', typicalAge: 14, short: '4ème' },
  { id: '3eme', label: '3ème', level: 'college', typicalAge: 15, short: '3ème', examAtEnd: 'BEPC' },
  { id: '2nde-a', label: 'Seconde A',   level: 'lycee', typicalAge: 16, short: '2nde A' },
  { id: '2nde-c', label: 'Seconde C',   level: 'lycee', typicalAge: 16, short: '2nde C' },
  { id: '2nde-d', label: 'Seconde D',   level: 'lycee', typicalAge: 16, short: '2nde D' },
  { id: '1ere-a', label: 'Première A',  level: 'lycee', typicalAge: 17, short: '1ère A' },
  { id: '1ere-c', label: 'Première C',  level: 'lycee', typicalAge: 17, short: '1ère C' },
  { id: '1ere-d', label: 'Première D',  level: 'lycee', typicalAge: 17, short: '1ère D' },
  { id: 'tle-a',  label: 'Terminale A', level: 'lycee', typicalAge: 18, short: 'Tle A', examAtEnd: 'BAC A' },
  { id: 'tle-c',  label: 'Terminale C', level: 'lycee', typicalAge: 18, short: 'Tle C', examAtEnd: 'BAC C' },
  { id: 'tle-d',  label: 'Terminale D', level: 'lycee', typicalAge: 18, short: 'Tle D', examAtEnd: 'BAC D' },
];

// ─────────────────────────────────────────────────────────────────────────────
// MALI — TOGO — BÉNIN — GUINÉE (systèmes très similaires CI/BF)
// ─────────────────────────────────────────────────────────────────────────────
const ML_CLASSES: ClassItem[] = [
  ...BF_CLASSES.filter(c => c.level === 'maternelle' || c.level === 'primaire'),
  { id: '7eme', label: '7ème', level: 'college', typicalAge: 12, short: '7ème' },
  { id: '8eme', label: '8ème', level: 'college', typicalAge: 13, short: '8ème' },
  { id: '9eme', label: '9ème', level: 'college', typicalAge: 14, short: '9ème', examAtEnd: 'DEF' },
  { id: '10eme', label: '10ème (Seconde)',  level: 'lycee', typicalAge: 15, short: '10ème' },
  { id: '11eme', label: '11ème (Première)', level: 'lycee', typicalAge: 16, short: '11ème' },
  { id: '12eme', label: '12ème (Terminale)', level: 'lycee', typicalAge: 17, short: '12ème', examAtEnd: 'BAC' },
];

// Togo & Bénin = même structure CI
const TG_CLASSES = CI_CLASSES;
const BJ_CLASSES = CI_CLASSES;

// Guinée Conakry
const GN_CLASSES: ClassItem[] = [
  ...BF_CLASSES.filter(c => c.level === 'maternelle' || c.level === 'primaire'),
  { id: '7eme', label: '7ème', level: 'college', typicalAge: 12 },
  { id: '8eme', label: '8ème', level: 'college', typicalAge: 13 },
  { id: '9eme', label: '9ème', level: 'college', typicalAge: 14, examAtEnd: 'BEPC' },
  { id: '2nde', label: 'Seconde',      level: 'lycee', typicalAge: 15 },
  { id: '1ere', label: 'Première',     level: 'lycee', typicalAge: 16 },
  { id: 'tle',  label: 'Terminale',    level: 'lycee', typicalAge: 17, examAtEnd: 'BAC' },
];

// Niger
const NE_CLASSES = CI_CLASSES; // identique système CI/BF

// Congo-Brazzaville & Gabon
const CG_CLASSES = CI_CLASSES;
const GA_CLASSES = CI_CLASSES;

// RDC (Congo-Kinshasa) — système légèrement différent
const CD_CLASSES: ClassItem[] = [
  { id: 'ps', label: 'Petite Section', level: 'maternelle', typicalAge: 3 },
  { id: 'ms', label: 'Moyenne Section', level: 'maternelle', typicalAge: 4 },
  { id: 'gs', label: 'Grande Section',  level: 'maternelle', typicalAge: 5 },
  { id: '1ere-prim', label: '1ère Primaire', level: 'primaire', typicalAge: 6 },
  { id: '2eme-prim', label: '2ème Primaire', level: 'primaire', typicalAge: 7 },
  { id: '3eme-prim', label: '3ème Primaire', level: 'primaire', typicalAge: 8 },
  { id: '4eme-prim', label: '4ème Primaire', level: 'primaire', typicalAge: 9 },
  { id: '5eme-prim', label: '5ème Primaire', level: 'primaire', typicalAge: 10 },
  { id: '6eme-prim', label: '6ème Primaire', level: 'primaire', typicalAge: 11, examAtEnd: 'TENAPH' },
  // Secondaire (Humanités générales)
  { id: '1ere-sec', label: '1ère Secondaire', level: 'college', typicalAge: 12 },
  { id: '2eme-sec', label: '2ème Secondaire', level: 'college', typicalAge: 13 },
  { id: '3eme-sec', label: '3ème Secondaire', level: 'college', typicalAge: 14 },
  { id: '4eme-sec', label: '4ème Secondaire', level: 'college', typicalAge: 15 },
  { id: '5eme-sec', label: '5ème Secondaire', level: 'college', typicalAge: 16 },
  { id: '6eme-sec', label: '6ème Secondaire', level: 'lycee',   typicalAge: 17, examAtEnd: 'État' },
];

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRE CENTRAL — lookup par code pays
// ─────────────────────────────────────────────────────────────────────────────
export const EDUCATION_SYSTEMS: Record<string, CountryEducationSystem> = {
  CI: {
    countryCode: 'CI', countryName: 'Côte d\'Ivoire', flag: '🇨🇮',
    language: 'fr', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: CI_CLASSES,
  },
  SN: {
    countryCode: 'SN', countryName: 'Sénégal', flag: '🇸🇳',
    language: 'fr', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: SN_CLASSES,
  },
  CM: {
    countryCode: 'CM', countryName: 'Cameroun', flag: '🇨🇲',
    language: 'fr-en', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: CM_CLASSES,
  },
  BF: {
    countryCode: 'BF', countryName: 'Burkina Faso', flag: '🇧🇫',
    language: 'fr', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: BF_CLASSES,
  },
  ML: {
    countryCode: 'ML', countryName: 'Mali', flag: '🇲🇱',
    language: 'fr', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: ML_CLASSES,
  },
  GN: {
    countryCode: 'GN', countryName: 'Guinée', flag: '🇬🇳',
    language: 'fr', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: GN_CLASSES,
  },
  TG: {
    countryCode: 'TG', countryName: 'Togo', flag: '🇹🇬',
    language: 'fr', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: TG_CLASSES,
  },
  BJ: {
    countryCode: 'BJ', countryName: 'Bénin', flag: '🇧🇯',
    language: 'fr', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: BJ_CLASSES,
  },
  NE: {
    countryCode: 'NE', countryName: 'Niger', flag: '🇳🇪',
    language: 'fr', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: NE_CLASSES,
  },
  CG: {
    countryCode: 'CG', countryName: 'Congo-Brazzaville', flag: '🇨🇬',
    language: 'fr', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: CG_CLASSES,
  },
  GA: {
    countryCode: 'GA', countryName: 'Gabon', flag: '🇬🇦',
    language: 'fr', gradingScale: 'out_of_20', passingGrade: 10,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: GA_CLASSES,
  },
  CD: {
    countryCode: 'CD', countryName: 'RD Congo (Kinshasa)', flag: '🇨🇩',
    language: 'fr', gradingScale: 'out_of_100', passingGrade: 50,
    terms: [
      { code: 'T1', label: '1er Trimestre' },
      { code: 'T2', label: '2ème Trimestre' },
      { code: 'T3', label: '3ème Trimestre' },
    ],
    classes: CD_CLASSES,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne le système éducatif du pays (défaut : CI)
 */
export function getEducationSystem(countryCode?: string | null): CountryEducationSystem {
  return EDUCATION_SYSTEMS[countryCode?.toUpperCase() ?? 'CI'] ?? EDUCATION_SYSTEMS['CI'];
}

/**
 * Retourne les classes d'un niveau donné pour un pays
 */
export function getClassesByLevel(
  level: SchoolLevel | 'all',
  countryCode?: string | null
): ClassItem[] {
  const sys = getEducationSystem(countryCode);
  return level === 'all' ? sys.classes : sys.classes.filter(c => c.level === level);
}

/**
 * Retourne le label officiel d'une classe par son id
 */
export function getClassLabel(classId: string, countryCode?: string | null): string {
  const sys = getEducationSystem(countryCode);
  return sys.classes.find(c => c.id === classId)?.label ?? classId;
}

/**
 * Labels des niveaux scolaires pour l'UI
 */
export const LEVEL_LABELS: Record<SchoolLevel, string> = {
  maternelle:  '🧒 Maternelle / Préscolaire',
  primaire:    '📗 Primaire',
  college:     '📘 Collège (1er cycle secondaire)',
  lycee:       '📙 Lycée (2nd cycle secondaire)',
  universite:  '🎓 Université / Supérieur',
};

/**
 * Mention depuis une moyenne (système /20)
 */
export function getMention(avg: number): { label: string; color: string } {
  if (avg >= 18) return { label: 'Excellent',    color: '#7C3AED' };
  if (avg >= 16) return { label: 'Très Bien',    color: '#059669' };
  if (avg >= 14) return { label: 'Bien',          color: '#2563EB' };
  if (avg >= 12) return { label: 'Assez Bien',    color: '#D97706' };
  if (avg >= 10) return { label: 'Passable',      color: '#94A3B8' };
  return           { label: 'Insuffisant',         color: '#DC2626' };
}
