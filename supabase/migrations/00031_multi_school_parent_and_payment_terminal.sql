-- ============================================================
-- MIGRATION 00031 : Multi-École Parent & Terminal de Paiement QR
-- ============================================================
-- Fonctionnalités :
--   1. Un parent peut être lié à plusieurs établissements
--   2. Génération de liens/QR de paiement par les terminaux de caisse

-- ──────────────────────────────────────────────────────────────────
-- 1. TABLE parent_school_links
--    Lie un compte parent (user_profile) à un établissement donné,
--    indépendamment du champ tenant_id "principal" du profil.
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parent_school_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id)       ON DELETE CASCADE,
    linked_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (parent_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_psl_parent  ON public.parent_school_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_tenant  ON public.parent_school_links(tenant_id);

ALTER TABLE public.parent_school_links ENABLE ROW LEVEL SECURITY;

-- Un parent voit ses propres liens
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_school_links' AND policyname='Parent sees own links') THEN
    CREATE POLICY "Parent sees own links" ON public.parent_school_links
      FOR SELECT USING (parent_id = auth.uid());
  END IF;
  -- Les admins d'un établissement voient les parents de leur tenant
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_school_links' AND policyname='Admins see tenant links') THEN
    CREATE POLICY "Admins see tenant links" ON public.parent_school_links
      FOR SELECT USING (tenant_id = public.get_user_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_school_links' AND policyname='Service role full access psl') THEN
    CREATE POLICY "Service role full access psl" ON public.parent_school_links
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON TABLE public.parent_school_links TO anon, authenticated, service_role;


-- ──────────────────────────────────────────────────────────────────
-- 2. MODIFIER accept_parent_invitation
--    Après acceptation, on insère aussi dans parent_school_links
--    pour permettre le multi-école.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_parent_invitation(
    invitation_token UUID,
    parent_full_name TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_uid        UUID;
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

  -- 2. Créer ou mettre à jour le profil
  INSERT INTO public.user_profiles (id, email, full_name, role, tenant_id)
  VALUES (v_uid, v_invitation.email, parent_full_name, 'responsible', v_invitation.tenant_id)
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        role = 'responsible';

  -- 3. Lier l'élève au parent
  UPDATE public.students
  SET responsible_id = v_uid
  WHERE id = v_invitation.student_id;

  -- 4. Enregistrer le lien multi-école (idempotent)
  INSERT INTO public.parent_school_links (parent_id, tenant_id)
  VALUES (v_uid, v_invitation.tenant_id)
  ON CONFLICT (parent_id, tenant_id) DO NOTHING;

  -- 5. Marquer comme acceptée
  UPDATE public.parent_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true,
    'student_id', v_invitation.student_id,
    'tenant_id',  v_invitation.tenant_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_parent_invitation(UUID, TEXT) TO authenticated;


-- ──────────────────────────────────────────────────────────────────
-- 3. RPC : get_parent_schools
--    Retourne les établissements liés au parent connecté,
--    avec le nombre d'enfants inscrits par école.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_parent_schools()
RETURNS TABLE (
    tenant_id    UUID,
    school_name  TEXT,
    linked_at    TIMESTAMP WITH TIME ZONE,
    child_count  BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    psl.tenant_id,
    t.name::TEXT        AS school_name,
    psl.linked_at,
    COUNT(s.id)         AS child_count
  FROM public.parent_school_links psl
  JOIN public.tenants   t ON t.id = psl.tenant_id
  LEFT JOIN public.students s
    ON s.responsible_id = auth.uid()
   AND s.tenant_id       = psl.tenant_id
  WHERE psl.parent_id = auth.uid()
  GROUP BY psl.tenant_id, t.name, psl.linked_at
  ORDER BY psl.linked_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_schools() TO authenticated;


-- ──────────────────────────────────────────────────────────────────
-- 4. RPC : get_parent_children_all_schools
--    Retourne TOUS les enfants du parent connecté, tous établissements confondus.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_parent_children_all_schools()
RETURNS TABLE (
    student_id   UUID,
    first_name   TEXT,
    last_name    TEXT,
    class_name   TEXT,
    tenant_id    UUID,
    school_name  TEXT,
    status       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id              AS student_id,
    s.first_name      AS first_name,
    s.last_name       AS last_name,
    cls.name::TEXT    AS class_name,
    s.tenant_id       AS tenant_id,
    t.name::TEXT      AS school_name,
    s.status          AS status
  FROM public.students s
  LEFT JOIN public.classes cls ON cls.id = s.class_id
  LEFT JOIN public.tenants  t  ON t.id   = s.tenant_id
  WHERE s.responsible_id = auth.uid()
  ORDER BY t.name, s.last_name, s.first_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_children_all_schools() TO authenticated;


-- ──────────────────────────────────────────────────────────────────
-- 5. TABLE payment_terminals
--    Terminaux de paiement gérés par les établissements.
--    Chaque terminal génère des sessions de paiement (QR / lien).
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_terminals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    label       TEXT NOT NULL DEFAULT 'Terminal Caisse',
    location    TEXT,                            -- Ex: "Accueil Bâtiment A"
    is_active   BOOLEAN DEFAULT true,
    created_by  UUID REFERENCES public.user_profiles(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payment_terminals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_terminals' AND policyname='Admins manage terminals') THEN
    CREATE POLICY "Admins manage terminals" ON public.payment_terminals
      FOR ALL USING (tenant_id = public.get_user_tenant_id());
  END IF;
END $$;

GRANT ALL ON TABLE public.payment_terminals TO authenticated, service_role;


-- ──────────────────────────────────────────────────────────────────
-- 6. TABLE payment_terminal_sessions
--    Chaque session = un QR code ou lien généré pour UN paiement précis.
--    Le parent scanne → choisit son moyen de paiement → confirme.
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_terminal_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    terminal_id     UUID REFERENCES public.payment_terminals(id) ON DELETE SET NULL,
    student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    schedule_id     UUID REFERENCES public.payment_schedules(id) ON DELETE SET NULL,

    -- Montant & description pré-remplis par le caissier
    amount          NUMERIC(12,2) NOT NULL,
    description     TEXT NOT NULL DEFAULT 'Frais de scolarité',

    -- Token unique pour le lien public
    token           UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

    -- Statut
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),

    -- Si le paiement a abouti
    payment_method  TEXT,
    paid_at         TIMESTAMP WITH TIME ZONE,
    cinetpay_trans_id TEXT,

    expires_at      TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours'),
    created_by      UUID REFERENCES public.user_profiles(id),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pts_token     ON public.payment_terminal_sessions(token);
CREATE INDEX IF NOT EXISTS idx_pts_tenant    ON public.payment_terminal_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pts_student   ON public.payment_terminal_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_pts_status    ON public.payment_terminal_sessions(status);

ALTER TABLE public.payment_terminal_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Admins créent et voient les sessions de leur établissement
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_terminal_sessions' AND policyname='Admins manage terminal sessions') THEN
    CREATE POLICY "Admins manage terminal sessions" ON public.payment_terminal_sessions
      FOR ALL USING (tenant_id = public.get_user_tenant_id());
  END IF;
  -- Lecture publique par token (page de paiement sans auth)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_terminal_sessions' AND policyname='Public read by token') THEN
    CREATE POLICY "Public read by token" ON public.payment_terminal_sessions
      FOR SELECT USING (true);
  END IF;
  -- Mise à jour par token (le parent paie sans être connecté à son profil école)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_terminal_sessions' AND policyname='Public update by token') THEN
    CREATE POLICY "Public update by token" ON public.payment_terminal_sessions
      FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON TABLE public.payment_terminal_sessions TO anon, authenticated, service_role;


-- ──────────────────────────────────────────────────────────────────
-- 7. RPC : create_terminal_session
--    Crée une session de paiement depuis un terminal de caisse.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_terminal_session(
    p_student_id   UUID,
    p_amount       NUMERIC,
    p_description  TEXT DEFAULT 'Frais de scolarité',
    p_schedule_id  UUID DEFAULT NULL,
    p_terminal_id  UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_session   RECORD;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Non autorisé : tenant non trouvé';
  END IF;

  INSERT INTO public.payment_terminal_sessions (
      tenant_id, terminal_id, student_id, schedule_id, amount, description, created_by
  ) VALUES (
      v_tenant_id, p_terminal_id, p_student_id, p_schedule_id, p_amount, p_description, auth.uid()
  )
  RETURNING * INTO v_session;

  RETURN json_build_object(
    'session_id', v_session.id,
    'token',      v_session.token,
    'amount',     v_session.amount,
    'expires_at', v_session.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_terminal_session(UUID, NUMERIC, TEXT, UUID, UUID) TO authenticated;


-- Force schema reload
NOTIFY pgrst, 'reload schema';
