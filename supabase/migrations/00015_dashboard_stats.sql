-- ============================================================
-- MIGRATION 00015 : Fonction RPC pour les statistiques du Dashboard
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_total_students INT;
  v_total_classes INT;
  v_payments_today NUMERIC;
  v_payments_total NUMERIC;
  v_unpaid_total NUMERIC;
  v_classes_stats JSON;
  v_recent_activities JSON;
BEGIN
  -- Récupérer le tenant_id de l'utilisateur connecté
  v_tenant_id := public.get_user_tenant_id();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non rattaché à un établissement.';
  END IF;

  -- 1. Effectifs
  SELECT count(*) INTO v_total_students FROM public.students WHERE tenant_id = v_tenant_id;
  SELECT count(*) INTO v_total_classes FROM public.classes WHERE tenant_id = v_tenant_id;

  -- 2. Finances
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_payments_total 
  FROM public.student_payments WHERE tenant_id = v_tenant_id;
  
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_payments_today 
  FROM public.student_payments 
  WHERE tenant_id = v_tenant_id AND DATE(paid_at AT TIME ZONE 'UTC') = CURRENT_DATE;

  SELECT COALESCE(SUM(remaining), 0) INTO v_unpaid_total 
  FROM public.v_student_payment_summary 
  WHERE tenant_id = v_tenant_id AND remaining > 0;

  -- 3. Statistiques des classes (Effectif par classe)
  SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) INTO v_classes_stats
  FROM (
    SELECT 
      cl.name,
      COUNT(s.id) AS students_count
    FROM public.classes cl
    LEFT JOIN public.students s ON s.class_id = cl.id
    WHERE cl.tenant_id = v_tenant_id
    GROUP BY cl.id, cl.name
    ORDER BY cl.name
  ) c;

  -- 4. Activité récente (Derniers paiements)
  SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_recent_activities
  FROM (
    SELECT 
      'Paiement' AS type,
      'Encaissé ' || sp.amount_paid || ' FCFA pour ' || s.first_name || ' ' || s.last_name AS detail,
      sp.paid_at AS time
    FROM public.student_payments sp
    JOIN public.students s ON s.id = sp.student_id
    WHERE sp.tenant_id = v_tenant_id
    ORDER BY sp.paid_at DESC
    LIMIT 5
  ) a;

  -- Retourner le tout sous forme d'objet JSON
  RETURN json_build_object(
    'total_students', v_total_students,
    'total_classes', v_total_classes,
    'payments_total', v_payments_total,
    'payments_today', v_payments_today,
    'unpaid_total', v_unpaid_total,
    'classes_stats', v_classes_stats,
    'recent_activities', v_recent_activities
  );
END;
$$;

-- Accorder les droits d'exécution
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;

-- Forcer le rechargement du schéma
NOTIFY pgrst, 'reload schema';
