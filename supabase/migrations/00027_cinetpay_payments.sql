-- ============================================================
-- MIGRATION 00027 : Passerelle CinetPay & Réconciliation Mobile Money
-- ============================================================

-- 1. Configuration Passerelle CinetPay par Tenant
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    provider TEXT NOT NULL DEFAULT 'cinetpay' CHECK (provider IN ('cinetpay', 'paydunya', 'direct_wave')),
    site_id TEXT,
    api_key TEXT,
    secret_key TEXT,
    is_live BOOLEAN DEFAULT false,
    currency TEXT DEFAULT 'XOF',
    supported_channels JSONB DEFAULT '["WAVE", "ORANGE_MONEY_CI", "MTN_CI", "MOOV_CI", "CARD"]'::jsonb,
    webhook_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Journal Détaillé des Transactions CinetPay (Sessions de Paiement & Webhooks)
CREATE TABLE IF NOT EXISTS public.cinetpay_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE SET NULL,
    cpm_trans_id TEXT NOT NULL UNIQUE, -- ID unique généré par EDUCORE
    cpm_site_id TEXT,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'XOF',
    description TEXT NOT NULL,
    customer_name TEXT,
    customer_surname TEXT,
    customer_phone_number TEXT,
    customer_email TEXT,
    payment_method TEXT, -- WAVE, OM, MOMO, MOOV, CREDIT_CARD
    operator_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REFUSED', 'CANCELLED', 'FAILED')),
    payment_token TEXT,
    payment_url TEXT,
    webhook_received_at TIMESTAMP WITH TIME ZONE,
    webhook_payload JSONB,
    receipt_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enrichir la table student_payments existante
ALTER TABLE public.student_payments
    ADD COLUMN IF NOT EXISTS cinetpay_trans_id TEXT,
    ADD COLUMN IF NOT EXISTS operator_name TEXT,
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS gateway_provider TEXT DEFAULT 'cinetpay';

-- RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinetpay_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view and manage gateway configs" ON public.payment_gateways
    FOR ALL USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role()::text IN ('admin', 'director', 'superadmin')
    );

CREATE POLICY "Users view tenant cinetpay transactions" ON public.cinetpay_transactions
    FOR SELECT USING (
        tenant_id = public.get_user_tenant_id()
    );

CREATE POLICY "Users insert cinetpay transactions" ON public.cinetpay_transactions
    FOR INSERT WITH CHECK (
        tenant_id = public.get_user_tenant_id()
    );

CREATE POLICY "Admins update cinetpay transactions" ON public.cinetpay_transactions
    FOR UPDATE USING (
        tenant_id = public.get_user_tenant_id()
    );

GRANT ALL ON TABLE public.payment_gateways TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cinetpay_transactions TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
