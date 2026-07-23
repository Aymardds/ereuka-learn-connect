-- ============================================================
-- MIGRATION 00014 : Invitations Parents
-- Création de la table pour gérer les invitations des parents
-- ============================================================

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

-- Index pour accélérer la recherche par token
CREATE INDEX IF NOT EXISTS idx_parent_invitations_token ON public.parent_invitations(token);
CREATE INDEX IF NOT EXISTS idx_parent_invitations_student_id ON public.parent_invitations(student_id);

-- Enable RLS
ALTER TABLE public.parent_invitations ENABLE ROW LEVEL SECURITY;

-- Les administrateurs peuvent voir, créer et gérer les invitations de leur établissement
CREATE POLICY "Admins view tenant invitations" ON public.parent_invitations
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins insert tenant invitations" ON public.parent_invitations
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins update tenant invitations" ON public.parent_invitations
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

-- Lecture publique par token (pour la page /invite)
CREATE POLICY "Anyone can read invitation by token" ON public.parent_invitations
  FOR SELECT USING (true);

-- Grant privileges
GRANT ALL ON TABLE public.parent_invitations TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────
-- FONCTION RPC POUR ACCEPTER L'INVITATION
-- ────────────────────────────────────────────────────────────
-- Cette fonction est appelée par le frontend APRÈS que le parent 
-- se soit inscrit via Supabase Auth (signUp) ou connecté (signIn).
-- Elle doit s'exécuter avec SECURITY DEFINER pour contourner les RLS 
-- et pouvoir insérer dans user_profiles et mettre à jour students.
CREATE OR REPLACE FUNCTION public.accept_parent_invitation(invitation_token UUID, parent_full_name TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Exécute avec les droits du créateur (postgres)
AS $$
DECLARE
  v_invitation RECORD;
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- 1. Récupérer l'invitation
  SELECT * INTO v_invitation 
  FROM public.parent_invitations 
  WHERE token = invitation_token AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide, expirée ou déjà acceptée.';
  END IF;

  IF v_invitation.expires_at < NOW() THEN
    RAISE EXCEPTION 'Cette invitation a expiré.';
  END IF;

  -- 2. Créer ou mettre à jour le user_profile
  INSERT INTO public.user_profiles (id, email, full_name, role, tenant_id)
  VALUES (v_uid, v_invitation.email, parent_full_name, 'responsible', v_invitation.tenant_id)
  ON CONFLICT (id) DO UPDATE 
  SET full_name = EXCLUDED.full_name,
      role = 'responsible'; -- S'assurer qu'il a le bon rôle

  -- 3. Lier l'élève au parent
  UPDATE public.students
  SET responsible_id = v_uid
  WHERE id = v_invitation.student_id;

  -- 4. Marquer l'invitation comme acceptée
  UPDATE public.parent_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'student_id', v_invitation.student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_parent_invitation(UUID, TEXT) TO authenticated;

-- Force Schema Reload
NOTIFY pgrst, 'reload schema';
