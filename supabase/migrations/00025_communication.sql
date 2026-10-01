-- ============================================================
-- MIGRATION 00025 : Module Communication & Notifications Multi-Canal
-- ============================================================

-- 1. Messagerie Interne (Direction, Enseignants, Parents, Étudiants)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Annonces et Circulaires Générales
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'academic', 'event', 'urgent', 'administrative')),
    target_role TEXT DEFAULT 'all', -- 'all', 'parent', 'teacher', 'student', 'staff'
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 3. Notifications Utilisateur (Push Web & In-App)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('payment', 'grade', 'attendance', 'message', 'announcement', 'system')),
    link_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own messages" ON public.messages
    FOR SELECT USING (
        tenant_id = public.get_user_tenant_id()
        AND (sender_id = auth.uid() OR recipient_id = auth.uid())
    );
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (
        tenant_id = public.get_user_tenant_id()
        AND sender_id = auth.uid()
    );
CREATE POLICY "Recipients update read state" ON public.messages
    FOR UPDATE USING (
        tenant_id = public.get_user_tenant_id()
        AND recipient_id = auth.uid()
    );

CREATE POLICY "Users view relevant announcements" ON public.announcements
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins manage announcements" ON public.announcements
    FOR ALL USING (
        tenant_id = public.get_user_tenant_id()
        AND public.get_user_role()::text IN ('admin', 'director', 'superadmin')
    );

CREATE POLICY "Users view own notifications" ON public.notifications
    FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
    FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND user_id = auth.uid());
CREATE POLICY "Authenticated users insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

GRANT ALL ON TABLE public.messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.announcements TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
