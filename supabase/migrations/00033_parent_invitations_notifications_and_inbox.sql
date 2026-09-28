-- =============================================================================
-- Migration 00033 : Boîte de réception des invitations parent & Partage multi-canal
-- 
-- 1. get_parent_pending_invitations() : Récupère les invitations en attente pour le parent connecté
-- 2. decline_parent_invitation() : Permet au parent de refuser une invitation
-- 3. invite_existing_parent_to_school() : Améliorée pour insérer une notification in-app et retourner les métadonnées
-- 4. link_existing_parent_directly() : Permet à l'école d'associer directement un parent Eurêka sans délai
-- 5. RLS notifications : Permet à un utilisateur de voir toutes ses notifications personnelles
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RPC : get_parent_pending_invitations
--    Permet à un parent connecté de voir toutes les invitations envoyées par des
--    écoles pour lier ses enfants à son compte existant.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_parent_pending_invitations();

CREATE OR REPLACE FUNCTION public.get_parent_pending_invitations()
RETURNS TABLE (
    invitation_id    UUID,
    invitation_token UUID,
    school_name      TEXT,
    tenant_id        UUID,
    student_id       UUID,
    student_name     TEXT,
    student_photo    TEXT,
    class_name       TEXT,
    created_at       TIMESTAMP WITH TIME ZONE,
    expires_at       TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_uid   UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Email du parent connecté (user_profiles ou JWT auth)
  SELECT up.email INTO v_email
  FROM user_profiles up
  WHERE up.id = v_uid;

  IF v_email IS NULL THEN
    v_email := auth.jwt()->>'email';
  END IF;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pi.id AS invitation_id,
    pi.token AS invitation_token,
    COALESCE(t.name, 'Établissement scolaire')::TEXT AS school_name,
    pi.tenant_id,
    pi.student_id,
    (s.first_name || ' ' || s.last_name)::TEXT AS student_name,
    s.photo_url::TEXT AS student_photo,
    COALESCE(c.name, 'Non assignée')::TEXT AS class_name,
    pi.created_at,
    pi.expires_at
  FROM parent_invitations pi
  JOIN tenants t ON t.id = pi.tenant_id
  JOIN students s ON s.id = pi.student_id
  LEFT JOIN classes c ON c.id = s.class_id
  WHERE LOWER(TRIM(pi.email)) = LOWER(TRIM(v_email))
    AND pi.status = 'pending'
    AND (pi.expires_at IS NULL OR pi.expires_at > NOW())
  ORDER BY pi.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_pending_invitations() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RPC : decline_parent_invitation
--    Permet au parent de refuser une invitation scolaire
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.decline_parent_invitation(UUID);

CREATE OR REPLACE FUNCTION public.decline_parent_invitation(invitation_token UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT email INTO v_email FROM user_profiles WHERE id = v_uid;
  IF v_email IS NULL THEN
    v_email := auth.jwt()->>'email';
  END IF;

  UPDATE parent_invitations
  SET status = 'declined'
  WHERE token = invitation_token
    AND (
      LOWER(TRIM(email)) = LOWER(TRIM(v_email))
      OR auth.uid() IS NOT NULL
    )
    AND status = 'pending';

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_parent_invitation(UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC : invite_existing_parent_to_school (version enrichie)
--    Génère l'invitation, dépose une notification in-app pour le parent,
--    et renvoie les détails (élève, école, token) pour le partage immédiat.
--    NOTE: Nécessite DROP FUNCTION car le type de retour TABLE a été étendu.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.invite_existing_parent_to_school(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.invite_existing_parent_to_school(UUID, UUID);
DROP FUNCTION IF EXISTS public.invite_existing_parent_to_school;

CREATE OR REPLACE FUNCTION public.invite_existing_parent_to_school(
  p_parent_user_id UUID,
  p_student_id UUID,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  invitation_id UUID,
  invitation_token UUID,
  parent_email TEXT,
  student_name TEXT,
  school_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_parent_email TEXT;
  v_student_name TEXT;
  v_school_name TEXT;
  v_token UUID;
  v_invitation_id UUID;
BEGIN
  -- 1. Résoudre le tenant
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT up.tenant_id INTO v_tenant_id
    FROM user_profiles up
    WHERE up.id = auth.uid();
  END IF;

  -- 2. Email parent
  SELECT up.email INTO v_parent_email
  FROM user_profiles up
  WHERE up.id = p_parent_user_id;

  IF v_parent_email IS NULL THEN
    RAISE EXCEPTION 'Parent introuvable avec l''id %', p_parent_user_id;
  END IF;

  -- 3. Vérifier que l'élève appartient bien au tenant appelant
  SELECT (s.first_name || ' ' || s.last_name) INTO v_student_name
  FROM students s
  WHERE s.id = p_student_id AND s.tenant_id = v_tenant_id;

  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Élève introuvable dans votre établissement';
  END IF;

  -- 4. Nom de l'école
  SELECT name INTO v_school_name
  FROM tenants
  WHERE id = v_tenant_id;

  -- 5. Générer le token
  v_token := gen_random_uuid();

  -- 6. Insérer l'invitation
  INSERT INTO parent_invitations (tenant_id, student_id, email, token, status)
  VALUES (v_tenant_id, p_student_id, v_parent_email, v_token, 'pending')
  RETURNING id INTO v_invitation_id;

  -- 7. Créer la notification in-app dans notifications
  INSERT INTO public.notifications (tenant_id, user_id, title, body, type, link_url)
  VALUES (
    v_tenant_id,
    p_parent_user_id,
    'Nouvelle invitation scolaire 🏫',
    'L''établissement ' || COALESCE(v_school_name, 'Eurêka') || ' vous a invité à rattacher ' || COALESCE(v_student_name, 'votre enfant') || ' à votre compte parent.',
    'system',
    '/portail-parent'
  );

  RETURN QUERY
  SELECT v_invitation_id, v_token, v_parent_email, v_student_name, COALESCE(v_school_name, 'Eurêka');
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_existing_parent_to_school(UUID, UUID, UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC : link_existing_parent_directly
--    Permet à l'école de lier directement un parent Eurêka à un élève
--    (utile lors d'une inscription en direct au secrétariat avec le parent).
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.link_existing_parent_directly(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.link_existing_parent_directly(UUID, UUID);
DROP FUNCTION IF EXISTS public.link_existing_parent_directly;

CREATE OR REPLACE FUNCTION public.link_existing_parent_directly(
  p_parent_user_id UUID,
  p_student_id UUID,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_parent_email TEXT;
  v_parent_name TEXT;
  v_student_name TEXT;
  v_school_name TEXT;
BEGIN
  -- 1. Résoudre tenant
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT up.tenant_id INTO v_tenant_id
    FROM user_profiles up
    WHERE up.id = auth.uid();
  END IF;

  -- 2. Vérifier élève
  SELECT (s.first_name || ' ' || s.last_name) INTO v_student_name
  FROM students s
  WHERE s.id = p_student_id AND s.tenant_id = v_tenant_id;

  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Élève introuvable dans votre établissement';
  END IF;

  -- 3. Récupérer parent
  SELECT up.email, up.full_name INTO v_parent_email, v_parent_name
  FROM user_profiles up
  WHERE up.id = p_parent_user_id;

  IF v_parent_email IS NULL THEN
    RAISE EXCEPTION 'Parent introuvable';
  END IF;

  SELECT name INTO v_school_name FROM tenants WHERE id = v_tenant_id;

  -- 4. Lier l'élève au parent
  UPDATE students
  SET responsible_id = p_parent_user_id,
      guardian_name = COALESCE(v_parent_name, guardian_name),
      guardian_email = v_parent_email
  WHERE id = p_student_id;

  -- 5. Enregistrer dans parent_school_links (multi-école)
  INSERT INTO public.parent_school_links (parent_id, tenant_id)
  VALUES (p_parent_user_id, v_tenant_id)
  ON CONFLICT (parent_id, tenant_id) DO NOTHING;

  -- 6. Fermer les invitations en attente pour cet élève
  UPDATE parent_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE student_id = p_student_id AND status = 'pending';

  -- 7. Notification in-app pour le parent
  INSERT INTO public.notifications (tenant_id, user_id, title, body, type, link_url)
  VALUES (
    v_tenant_id,
    p_parent_user_id,
    'Élève rattaché à votre compte 🎓',
    v_student_name || ' a été rattaché(e) à votre compte par ' || COALESCE(v_school_name, 'votre établissement') || '.',
    'system',
    '/portail-parent'
  );

  RETURN json_build_object(
    'success', true, 
    'student_id', p_student_id, 
    'tenant_id', v_tenant_id,
    'student_name', v_student_name,
    'school_name', v_school_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_existing_parent_directly(UUID, UUID, UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS notifications : Permettre de lire ses notifications de toutes les écoles
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Recharger le schéma PostgREST
NOTIFY pgrst, 'reload schema';
