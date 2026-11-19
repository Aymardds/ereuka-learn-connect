-- ============================================================
-- MIGRATION 00039 : Modèle financier centralisé INEXIUMUS
--   - Chaque paiement transite sur le compte Business Wave/MoMo
--     centralisé d'INEXIUMUS.
--   - L'école initie ses demandes de décaissement via l'interface.
--   - La table disbursement_requests trace chaque demande.
-- ============================================================

-- 1. Enrichir payment_gateways avec les coordonnées du compte business de réception
ALTER TABLE public.payment_gateways
  ADD COLUMN IF NOT EXISTS business_wave_number   TEXT,         -- Numéro Wave Business INEXIUMUS (receveur)
  ADD COLUMN IF NOT EXISTS business_account_name  TEXT DEFAULT 'INEXIUMUS',  -- Nom du titulaire
  ADD COLUMN IF NOT EXISTS school_wave_number     TEXT,         -- Numéro Wave de l'école (pour remboursement)
  ADD COLUMN IF NOT EXISTS school_orange_number   TEXT,         -- Orange Money de l'école
  ADD COLUMN IF NOT EXISTS school_mtn_number      TEXT,         -- MTN Mobile Money de l'école
  ADD COLUMN IF NOT EXISTS school_moov_number     TEXT,         -- Moov Money de l'école
  ADD COLUMN IF NOT EXISTS platform_fee_percent   NUMERIC(5,2) DEFAULT 2.5, -- Commission plateforme (%)
  ADD COLUMN IF NOT EXISTS disbursement_iban      TEXT,         -- IBAN compte bancaire de l'école (optionnel)
  ADD COLUMN IF NOT EXISTS disbursement_bank      TEXT;         -- Banque de l'école

-- 2. Table des demandes de décaissement
CREATE TABLE IF NOT EXISTS public.disbursement_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_by      UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  -- Montants
  amount_requested  NUMERIC(14,2) NOT NULL CHECK (amount_requested > 0),
  platform_fee      NUMERIC(14,2) NOT NULL DEFAULT 0,  -- Commission INEXIUMUS
  amount_net        NUMERIC(14,2) NOT NULL,             -- Montant net après commission
  currency          TEXT NOT NULL DEFAULT 'XOF',

  -- Mode de remboursement choisi par l'école
  payout_method     TEXT NOT NULL CHECK (payout_method IN ('wave', 'orange_money', 'mtn_momo', 'moov_money', 'bank_transfer')),
  payout_number     TEXT,          -- Numéro destinataire (école)
  payout_bank       TEXT,          -- Banque (si virement)
  payout_iban       TEXT,          -- IBAN (si virement)

  -- Suivi du statut
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  reference         TEXT UNIQUE,   -- Référence unique de la demande
  notes_school      TEXT,          -- Notes de l'école
  notes_admin       TEXT,          -- Notes de l'administrateur INEXIUMUS
  processed_by      TEXT,          -- Email ou ID de l'opérateur INEXIUMUS
  processed_at      TIMESTAMP WITH TIME ZONE,
  rejected_reason   TEXT,

  -- Période concernée (optionnelle, pour justifier le montant)
  period_from       DATE,
  period_to         DATE,

  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Vue résumée des encaissements disponibles par tenant
CREATE OR REPLACE VIEW public.v_tenant_collection_summary AS
SELECT
  t.id                                        AS tenant_id,
  t.name                                      AS school_name,
  COALESCE(SUM(sp.amount_paid), 0)            AS total_collected,
  COALESCE(SUM(CASE WHEN sp.paid_at >= NOW() - INTERVAL '30 days'
                THEN sp.amount_paid ELSE 0 END), 0) AS collected_last_30d,
  COALESCE(SUM(dr.amount_requested)
    FILTER (WHERE dr.status IN ('pending','processing')), 0) AS pending_disbursements,
  COALESCE(SUM(dr.amount_net)
    FILTER (WHERE dr.status = 'completed'), 0) AS total_disbursed,
  COALESCE(SUM(sp.amount_paid), 0)
    - COALESCE(SUM(dr.amount_requested)
       FILTER (WHERE dr.status IN ('pending','processing','completed')), 0) AS available_balance
FROM public.tenants t
LEFT JOIN public.student_payments sp ON sp.tenant_id = t.id
LEFT JOIN public.disbursement_requests dr ON dr.tenant_id = t.id
GROUP BY t.id, t.name;

GRANT SELECT ON public.v_tenant_collection_summary TO authenticated, service_role;

-- 4. RLS sur disbursement_requests
ALTER TABLE public.disbursement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_staff_view_own_disbursements" ON public.disbursement_requests
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
  );

CREATE POLICY "school_admin_insert_disbursements" ON public.disbursement_requests
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role()::text IN ('admin', 'director', 'accountant', 'superadmin')
  );

CREATE POLICY "school_admin_cancel_own_disbursements" ON public.disbursement_requests
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND status = 'pending'
    AND public.get_user_role()::text IN ('admin', 'director', 'accountant', 'superadmin')
  );

CREATE POLICY "superadmin_manage_all_disbursements" ON public.disbursement_requests
  FOR ALL USING (
    public.get_user_role()::text = 'superadmin'
  );

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_disbursements_tenant ON public.disbursement_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_status  ON public.disbursement_requests(status);

-- 6. Grants
GRANT ALL ON public.disbursement_requests TO authenticated, service_role;

-- 7. Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_disbursement_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disbursement_updated_at ON public.disbursement_requests;
CREATE TRIGGER trg_disbursement_updated_at
  BEFORE UPDATE ON public.disbursement_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_disbursement_updated_at();

NOTIFY pgrst, 'reload schema';
