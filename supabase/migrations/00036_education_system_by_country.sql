-- ============================================================
-- MIGRATION 00036 : Système Éducatif par Pays
-- Conforme aux standards des Ministères de l'Éducation
-- des pays d'Afrique francophone et bilingue.
-- ============================================================

-- 1. Ajouter country_code sur tenants (ISO 3166-1 alpha-2)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'CI',
  ADD COLUMN IF NOT EXISTS grading_scale TEXT DEFAULT 'out_of_20'
    CHECK (grading_scale IN ('out_of_20','out_of_100','letter','percentage')),
  ADD COLUMN IF NOT EXISTS passing_grade NUMERIC(5,2) DEFAULT 10.0;

-- 2. Enrichir la table classes avec le niveau officiel
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS level_code  TEXT,       -- 'maternelle','primaire','college','lycee','universite'
  ADD COLUMN IF NOT EXISTS class_code  TEXT,       -- id interne (ex: 'tle-c', '5eme', 'cm2')
  ADD COLUMN IF NOT EXISTS typical_age INTEGER,
  ADD COLUMN IF NOT EXISTS exam_at_end TEXT,       -- 'BEPC', 'BAC C', 'CEPE'...
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'CI';

-- Index pour requêtes par niveau
CREATE INDEX IF NOT EXISTS idx_classes_level_code ON public.classes(level_code);
CREATE INDEX IF NOT EXISTS idx_classes_country_code ON public.classes(country_code);

-- 3. Référentiel officiel des classes (table de référence, lecture seule pour les tenants)
CREATE TABLE IF NOT EXISTS public.ref_class_levels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code  TEXT NOT NULL,     -- 'CI', 'SN', 'CM', etc.
  class_code    TEXT NOT NULL,     -- 'cp1', '5eme', 'tle-c', etc.
  label         TEXT NOT NULL,     -- 'CP1', '5ème', 'Terminale C'
  short_label   TEXT,
  level_code    TEXT NOT NULL,     -- 'maternelle','primaire','college','lycee','universite'
  sort_order    INTEGER NOT NULL,
  typical_age   INTEGER,
  exam_at_end   TEXT,
  UNIQUE(country_code, class_code)
);

-- RLS : lecture publique pour tenants authentifiés
ALTER TABLE public.ref_class_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read ref_class_levels"
  ON public.ref_class_levels FOR SELECT
  TO authenticated USING (true);

-- 4. Seed des classes de référence pour CÔTE D'IVOIRE (CI)
INSERT INTO public.ref_class_levels
  (country_code, class_code, label, short_label, level_code, sort_order, typical_age, exam_at_end)
VALUES
  -- Maternelle
  ('CI','ps',    'Petite Section (PS)',              'PS',     'maternelle', 1,  3,  NULL),
  ('CI','ms',    'Moyenne Section (MS)',             'MS',     'maternelle', 2,  4,  NULL),
  ('CI','gs',    'Grande Section (GS)',              'GS',     'maternelle', 3,  5,  NULL),
  -- Primaire
  ('CI','cp1',   'CP1',                             'CP1',    'primaire',   4,  6,  NULL),
  ('CI','cp2',   'CP2',                             'CP2',    'primaire',   5,  7,  NULL),
  ('CI','ce1',   'CE1',                             'CE1',    'primaire',   6,  8,  NULL),
  ('CI','ce2',   'CE2',                             'CE2',    'primaire',   7,  9,  NULL),
  ('CI','cm1',   'CM1',                             'CM1',    'primaire',   8,  10, NULL),
  ('CI','cm2',   'CM2',                             'CM2',    'primaire',   9,  11, 'CEPE'),
  -- Collège
  ('CI','6eme',  '6ème',                            '6ème',   'college',    10, 12, NULL),
  ('CI','5eme',  '5ème',                            '5ème',   'college',    11, 13, NULL),
  ('CI','4eme',  '4ème',                            '4ème',   'college',    12, 14, NULL),
  ('CI','3eme',  '3ème',                            '3ème',   'college',    13, 15, 'BEPC'),
  -- Lycée
  ('CI','2nde-a','Seconde A',                       '2nde A', 'lycee',      14, 16, NULL),
  ('CI','2nde-c','Seconde C',                       '2nde C', 'lycee',      15, 16, NULL),
  ('CI','2nde-d','Seconde D',                       '2nde D', 'lycee',      16, 16, NULL),
  ('CI','1ere-a','Première A',                      '1ère A', 'lycee',      17, 17, NULL),
  ('CI','1ere-b','Première B',                      '1ère B', 'lycee',      18, 17, NULL),
  ('CI','1ere-c','Première C',                      '1ère C', 'lycee',      19, 17, NULL),
  ('CI','1ere-d','Première D',                      '1ère D', 'lycee',      20, 17, NULL),
  ('CI','1ere-f','Première F (Sciences Techniques)','1ère F', 'lycee',      21, 17, NULL),
  ('CI','1ere-g','Première G (Gestion)',            '1ère G', 'lycee',      22, 17, NULL),
  ('CI','tle-a', 'Terminale A (Lettres & Philo)',   'Tle A',  'lycee',      23, 18, 'BAC A'),
  ('CI','tle-b', 'Terminale B (Économie)',          'Tle B',  'lycee',      24, 18, 'BAC B'),
  ('CI','tle-c', 'Terminale C (Maths-Sc. Phys.)',  'Tle C',  'lycee',      25, 18, 'BAC C'),
  ('CI','tle-d', 'Terminale D (SVT)',               'Tle D',  'lycee',      26, 18, 'BAC D'),
  ('CI','tle-f', 'Terminale F (Techniques Ind.)',   'Tle F',  'lycee',      27, 18, 'BAC F'),
  ('CI','tle-g2','Terminale G2 (Comptabilité)',     'Tle G2', 'lycee',      28, 18, 'BAC G2')
ON CONFLICT (country_code, class_code) DO UPDATE
  SET label=EXCLUDED.label, short_label=EXCLUDED.short_label,
      level_code=EXCLUDED.level_code, sort_order=EXCLUDED.sort_order,
      typical_age=EXCLUDED.typical_age, exam_at_end=EXCLUDED.exam_at_end;

-- 5. Seed SÉNÉGAL (SN)
INSERT INTO public.ref_class_levels
  (country_code, class_code, label, short_label, level_code, sort_order, typical_age, exam_at_end)
VALUES
  ('SN','ps',    'Petite Section',              'PS',    'maternelle', 1,  3,  NULL),
  ('SN','ms',    'Moyenne Section',             'MS',    'maternelle', 2,  4,  NULL),
  ('SN','gs',    'Grande Section',              'GS',    'maternelle', 3,  5,  NULL),
  ('SN','ci',    'CI (Cours d''Initiation)',    'CI',    'primaire',   4,  6,  NULL),
  ('SN','cp',    'CP',                          'CP',    'primaire',   5,  7,  NULL),
  ('SN','ce1',   'CE1',                         'CE1',   'primaire',   6,  8,  NULL),
  ('SN','ce2',   'CE2',                         'CE2',   'primaire',   7,  9,  NULL),
  ('SN','cm1',   'CM1',                         'CM1',   'primaire',   8,  10, NULL),
  ('SN','cm2',   'CM2',                         'CM2',   'primaire',   9,  11, 'CFEE'),
  ('SN','6eme',  '6ème',                        '6ème',  'college',   10,  12, NULL),
  ('SN','5eme',  '5ème',                        '5ème',  'college',   11,  13, NULL),
  ('SN','4eme',  '4ème',                        '4ème',  'college',   12,  14, NULL),
  ('SN','3eme',  '3ème',                        '3ème',  'college',   13,  15, 'BFEM'),
  ('SN','2nde',  'Seconde',                     '2nde',  'lycee',     14,  16, NULL),
  ('SN','1ere-l','Première L',                  '1ère L','lycee',     15,  17, NULL),
  ('SN','1ere-s1','Première S1 (Maths-Phys.)', '1ère S1','lycee',    16,  17, NULL),
  ('SN','1ere-s2','Première S2 (SVT)',          '1ère S2','lycee',    17,  17, NULL),
  ('SN','tle-l', 'Terminale L',                 'Tle L', 'lycee',     18,  18, 'BAC L'),
  ('SN','tle-s1','Terminale S1 (Maths-Phys.)', 'Tle S1','lycee',     19,  18, 'BAC S1'),
  ('SN','tle-s2','Terminale S2 (SVT)',          'Tle S2','lycee',     20,  18, 'BAC S2'),
  ('SN','tle-s3','Terminale S3 (Techn. Ind.)', 'Tle S3','lycee',     21,  18, 'BAC S3'),
  ('SN','tle-g', 'Terminale G (Gestion)',       'Tle G', 'lycee',     22,  18, 'BAC G')
ON CONFLICT (country_code, class_code) DO NOTHING;

-- 6. Seed CAMEROUN (CM) — francophone uniquement
INSERT INTO public.ref_class_levels
  (country_code, class_code, label, short_label, level_code, sort_order, typical_age, exam_at_end)
VALUES
  ('CM','sil',  'SIL (Section d''Initiation à la Lecture)','SIL',   'primaire', 1,  6,  NULL),
  ('CM','cp',   'CP',   'CP',   'primaire',  2,  7,  NULL),
  ('CM','ce1',  'CE1',  'CE1',  'primaire',  3,  8,  NULL),
  ('CM','ce2',  'CE2',  'CE2',  'primaire',  4,  9,  NULL),
  ('CM','cm1',  'CM1',  'CM1',  'primaire',  5,  10, NULL),
  ('CM','cm2',  'CM2',  'CM2',  'primaire',  6,  11, 'CEPE'),
  ('CM','6eme', '6ème', '6ème', 'college',   7,  12, NULL),
  ('CM','5eme', '5ème', '5ème', 'college',   8,  13, NULL),
  ('CM','4eme', '4ème', '4ème', 'college',   9,  14, NULL),
  ('CM','3eme', '3ème', '3ème', 'college',   10, 15, 'BEPC'),
  ('CM','2nde', 'Seconde',      '2nde',   'lycee', 11, 16, NULL),
  ('CM','1ere-a','Première A',  '1ère A', 'lycee', 12, 17, NULL),
  ('CM','1ere-c','Première C',  '1ère C', 'lycee', 13, 17, NULL),
  ('CM','1ere-d','Première D',  '1ère D', 'lycee', 14, 17, NULL),
  ('CM','tle-a', 'Terminale A', 'Tle A',  'lycee', 15, 18, 'BAC A'),
  ('CM','tle-c', 'Terminale C', 'Tle C',  'lycee', 16, 18, 'BAC C'),
  ('CM','tle-d', 'Terminale D', 'Tle D',  'lycee', 17, 18, 'BAC D'),
  ('CM','tle-f', 'Terminale F', 'Tle F',  'lycee', 18, 18, 'BAC F'),
  ('CM','tle-g', 'Terminale G', 'Tle G',  'lycee', 19, 18, 'BAC G'),
  -- Anglophones
  ('CM','form1', 'Form 1', 'Form 1', 'college', 20, 12, NULL),
  ('CM','form2', 'Form 2', 'Form 2', 'college', 21, 13, NULL),
  ('CM','form3', 'Form 3', 'Form 3', 'college', 22, 14, NULL),
  ('CM','form4', 'Form 4', 'Form 4', 'college', 23, 15, NULL),
  ('CM','form5', 'Form 5', 'Form 5', 'college', 24, 16, 'GCE O-Level'),
  ('CM','ls1',   'Lower Sixth (LS1)', 'LS1',    'lycee',  25, 17, NULL),
  ('CM','us2',   'Upper Sixth (US2)', 'US2',    'lycee',  26, 18, 'GCE A-Level')
ON CONFLICT (country_code, class_code) DO NOTHING;

-- 7. Seed BURKINA FASO (BF)
INSERT INTO public.ref_class_levels
  (country_code, class_code, label, short_label, level_code, sort_order, typical_age, exam_at_end)
VALUES
  ('BF','ps',     'Petite Section',  'PS',    'maternelle', 1,  3,  NULL),
  ('BF','ms',     'Moyenne Section', 'MS',    'maternelle', 2,  4,  NULL),
  ('BF','gs',     'Grande Section',  'GS',    'maternelle', 3,  5,  NULL),
  ('BF','cp',     'CP',   'CP',   'primaire', 4,  6,  NULL),
  ('BF','ce1',    'CE1',  'CE1',  'primaire', 5,  7,  NULL),
  ('BF','ce2',    'CE2',  'CE2',  'primaire', 6,  8,  NULL),
  ('BF','cm1',    'CM1',  'CM1',  'primaire', 7,  9,  NULL),
  ('BF','cm2',    'CM2',  'CM2',  'primaire', 8,  10, 'CEPE'),
  ('BF','6eme',   '6ème', '6ème', 'college',  9,  12, NULL),
  ('BF','5eme',   '5ème', '5ème', 'college',  10, 13, NULL),
  ('BF','4eme',   '4ème', '4ème', 'college',  11, 14, NULL),
  ('BF','3eme',   '3ème', '3ème', 'college',  12, 15, 'BEPC'),
  ('BF','2nde-a', 'Seconde A', '2nde A', 'lycee', 13, 16, NULL),
  ('BF','2nde-c', 'Seconde C', '2nde C', 'lycee', 14, 16, NULL),
  ('BF','2nde-d', 'Seconde D', '2nde D', 'lycee', 15, 16, NULL),
  ('BF','1ere-a', 'Première A', '1ère A', 'lycee', 16, 17, NULL),
  ('BF','1ere-c', 'Première C', '1ère C', 'lycee', 17, 17, NULL),
  ('BF','1ere-d', 'Première D', '1ère D', 'lycee', 18, 17, NULL),
  ('BF','tle-a',  'Terminale A', 'Tle A', 'lycee', 19, 18, 'BAC A'),
  ('BF','tle-c',  'Terminale C', 'Tle C', 'lycee', 20, 18, 'BAC C'),
  ('BF','tle-d',  'Terminale D', 'Tle D', 'lycee', 21, 18, 'BAC D')
ON CONFLICT (country_code, class_code) DO NOTHING;

-- 8. Mettre à jour les classes existantes du tenant par défaut (CI)
-- (ne touche que les tenants dont country_code = 'CI' ou NULL)
UPDATE public.classes c
SET
  level_code  = r.level_code,
  class_code  = r.class_code,
  typical_age = r.typical_age,
  exam_at_end = r.exam_at_end,
  country_code = 'CI'
FROM public.ref_class_levels r
WHERE r.country_code = 'CI'
  AND (
    lower(c.name) = lower(r.label)
    OR lower(c.name) = lower(r.short_label)
    OR lower(c.name) LIKE '%' || lower(r.class_code) || '%'
  )
  AND c.level_type IS NOT NULL;
