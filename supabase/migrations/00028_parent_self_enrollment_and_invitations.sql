-- ============================================================
-- MIGRATION 00028 : Inscription Parents, Auto-Inscription Enfants & Invitations
-- ============================================================

-- 1. Table des invitations parents
CREATE TABLE IF NOT EXISTS public.parent_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_parent_invitations_token ON public.parent_invitations(token);
CREATE INDEX IF NOT EXISTS idx_parent_invitations_student_id ON public.parent_invitations(student_id);

ALTER TABLE public.parent_invitations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_invitations' AND policyname='Admins view tenant invitations') THEN
    CREATE POLICY "Admins view tenant invitations" ON public.parent_invitations FOR SELECT USING (tenant_id = public.get_user_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_invitations' AND policyname='Admins insert tenant invitations') THEN
    CREATE POLICY "Admins insert tenant invitations" ON public.parent_invitations FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_invitations' AND policyname='Admins update tenant invitations') THEN
    CREATE POLICY "Admins update tenant invitations" ON public.parent_invitations FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_invitations' AND policyname='Anyone can read invitation by token') THEN
    CREATE POLICY "Anyone can read invitation by token" ON public.parent_invitations FOR SELECT USING (true);
  END IF;
END $$;

GRANT ALL ON TABLE public.parent_invitations TO anon, authenticated, service_role;

-- 2. Politique explicite permettant aux parents d'inscrire leurs enfants depuis leur compte
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='Parents can enroll own children') THEN
    CREATE POLICY "Parents can enroll own children" ON public.students
      FOR INSERT WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND responsible_id = auth.uid()
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
