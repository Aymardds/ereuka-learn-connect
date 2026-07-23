-- ============================================================
-- MIGRATION 00020 : Politiques RLS pour la gestion du personnel
-- ============================================================

-- Politiques RLS pour user_profiles (Mise à jour et Suppression par les admins et directeurs)
CREATE POLICY "Admins update tenant profiles" ON public.user_profiles
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id() AND
    (public.get_user_role() = 'admin' OR public.get_user_role() = 'director')
  );

CREATE POLICY "Admins delete tenant profiles" ON public.user_profiles
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id() AND
    (public.get_user_role() = 'admin' OR public.get_user_role() = 'director')
  );
