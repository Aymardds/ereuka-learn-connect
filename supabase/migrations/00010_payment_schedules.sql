-- 1. Create Payment Schedules Table (Configured by Schools)
CREATE TABLE IF NOT EXISTS public.payment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE, -- NULL means all classes
    title TEXT NOT NULL, -- e.g. "1ère Tranche", "Scolarité Trimestre 1"
    amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Student Payments Table (Transactions & Receipts)
CREATE TABLE IF NOT EXISTS public.student_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE SET NULL,
    amount_paid NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'wave', 'orange_money', 'mtn_money', 'moov_money', 'card'
    transaction_reference TEXT NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    parent_email TEXT,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;

-- Policies for payment_schedules
CREATE POLICY "Users view tenant payment schedules" ON public.payment_schedules
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins insert payment schedules" ON public.payment_schedules
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins update payment schedules" ON public.payment_schedules
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins delete payment schedules" ON public.payment_schedules
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- Policies for student_payments
CREATE POLICY "Users view tenant student payments" ON public.student_payments
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users insert student payments" ON public.student_payments
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Grant privileges to PostgREST roles
GRANT ALL ON TABLE public.payment_schedules TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.student_payments TO anon, authenticated, service_role;

-- Force Schema Reload
NOTIFY pgrst, 'reload schema';
