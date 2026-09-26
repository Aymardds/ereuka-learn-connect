-- ============================================================
-- MIGRATION 00029 : Associations Enseignant ↔ Classe
-- ============================================================
-- Permet d'associer un enseignant à plusieurs classes selon
-- son niveau d'intervention (ex: un prof de maths peut enseigner
-- en 3ème A et 3ème B). Différent du teacher_id dans classes
-- (titulaire) : ici c'est la liste des cours intervenants.

CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    -- Role de l'enseignant dans cette classe
    role_in_class TEXT DEFAULT 'intervenant' CHECK (role_in_class IN ('titulaire', 'intervenant', 'surveillant')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (teacher_id, class_id, subject_id)
);

-- RLS
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view tenant teacher_class_assignments" ON public.teacher_class_assignments
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins manage teacher_class_assignments" ON public.teacher_class_assignments
    FOR ALL USING (tenant_id = public.get_user_tenant_id());

GRANT ALL ON TABLE public.teacher_class_assignments TO anon, authenticated, service_role;

-- Vue pratique : liste des enseignants avec leurs classes
CREATE OR REPLACE VIEW public.teacher_class_overview AS
SELECT 
    tca.id,
    tca.tenant_id,
    tca.teacher_id,
    up.full_name AS teacher_name,
    up.email AS teacher_email,
    tca.class_id,
    c.name AS class_name,
    c.level_type,
    tca.subject_id,
    s.name AS subject_name,
    tca.role_in_class,
    tca.created_at
FROM public.teacher_class_assignments tca
JOIN public.user_profiles up ON up.id = tca.teacher_id
JOIN public.classes c ON c.id = tca.class_id
LEFT JOIN public.subjects s ON s.id = tca.subject_id;

GRANT SELECT ON public.teacher_class_overview TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
