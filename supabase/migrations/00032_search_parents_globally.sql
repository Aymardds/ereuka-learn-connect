-- =============================================================================
-- Migration 00032: Recherche globale de parents (cross-tenant)
-- Permet à un établissement de rechercher un parent déjà inscrit dans
-- une autre école Eurêka, par nom, email ou numéro de téléphone.
-- =============================================================================

-- RPC : search_parents_globally
-- Retourne les parents trouvés sur TOUTE la plateforme (tous tenants)
-- mais EXCLUT ceux déjà liés au tenant courant (déjà dans l'école).
-- Accessible uniquement aux rôles autorisés via RLS (admin, director, accountant, cashier, responsible_admin).

CREATE OR REPLACE FUNCTION public.search_parents_globally(
  search_query TEXT,
  calling_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  tenant_id UUID,
  tenant_name TEXT,
  already_in_school BOOLEAN,
  children_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Resolve tenant: use provided or infer from caller's profile
  IF calling_tenant_id IS NOT NULL THEN
    v_tenant_id := calling_tenant_id;
  ELSE
    SELECT up.tenant_id INTO v_tenant_id
    FROM user_profiles up
    WHERE up.id = auth.uid();
  END IF;

  -- Minimum 2 chars to avoid full-table scans
  IF LENGTH(TRIM(search_query)) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    up.full_name::TEXT,
    up.email::TEXT,
    up.phone::TEXT,
    up.role::TEXT,
    up.tenant_id,
    t.name::TEXT AS tenant_name,
    (up.tenant_id = v_tenant_id) AS already_in_school,
    COALESCE(COUNT(s.id), 0)::BIGINT AS children_count
  FROM user_profiles up
  LEFT JOIN tenants t ON t.id = up.tenant_id
  LEFT JOIN students s ON s.responsible_id = up.id
  WHERE
    up.role IN ('responsible', 'parent')
    AND (
      up.full_name ILIKE '%' || TRIM(search_query) || '%'
      OR up.email ILIKE '%' || TRIM(search_query) || '%'
      OR up.phone ILIKE '%' || TRIM(search_query) || '%'
    )
  GROUP BY up.id, up.full_name, up.email, up.phone, up.role, up.tenant_id, t.name
  ORDER BY
    -- Priorité : parents de l'école actuelle en premier
    (up.tenant_id = v_tenant_id) DESC,
    up.full_name ASC
  LIMIT 20;
END;
$$;

-- Grant execution rights to authenticated users
-- (la RLS de la fonction SECURITY DEFINER gère l'accès aux données)
GRANT EXECUTE ON FUNCTION public.search_parents_globally(TEXT, UUID) TO authenticated;

-- =============================================================================
-- RPC : invite_existing_parent_to_school
-- Crée une invitation parent_invitations pour un parent qui a déjà un compte,
-- en liant directement son compte sans recréation.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.invite_existing_parent_to_school(
  p_parent_user_id UUID,
  p_student_id UUID,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  invitation_id UUID,
  invitation_token UUID,
  parent_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_parent_email TEXT;
  v_token UUID;
  v_invitation_id UUID;
BEGIN
  -- Resolve tenant
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT up.tenant_id INTO v_tenant_id
    FROM user_profiles up
    WHERE up.id = auth.uid();
  END IF;

  -- Get parent email
  SELECT up.email INTO v_parent_email
  FROM user_profiles up
  WHERE up.id = p_parent_user_id;

  IF v_parent_email IS NULL THEN
    RAISE EXCEPTION 'Parent introuvable avec l''id %', p_parent_user_id;
  END IF;

  -- Verify student belongs to calling tenant
  IF NOT EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = p_student_id AND s.tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Élève introuvable dans votre établissement';
  END IF;

  -- Generate token
  v_token := gen_random_uuid();

  -- Insert invitation
  INSERT INTO parent_invitations (tenant_id, student_id, email, token, status)
  VALUES (v_tenant_id, p_student_id, v_parent_email, v_token, 'pending')
  RETURNING id INTO v_invitation_id;

  -- If parent already exists in current school's user_profiles, directly link student
  -- (they don't need to click the link; this is a fast-path for same-platform parents)
  IF EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = p_parent_user_id AND up.tenant_id = v_tenant_id
  ) THEN
    -- Direct link: update student's responsible_id
    UPDATE students
    SET
      responsible_id = p_parent_user_id,
      guardian_email = v_parent_email
    WHERE id = p_student_id;

    -- Mark invitation as accepted immediately
    UPDATE parent_invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_invitation_id;
  END IF;

  RETURN QUERY
  SELECT v_invitation_id, v_token, v_parent_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_existing_parent_to_school(UUID, UUID, UUID) TO authenticated;

-- Index pour accélérer la recherche full-text sur user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_search
  ON user_profiles USING gin(
    to_tsvector('simple', COALESCE(full_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, ''))
  );

-- Index btree sur phone pour la recherche exacte rapide
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone
  ON user_profiles (phone)
  WHERE phone IS NOT NULL;
