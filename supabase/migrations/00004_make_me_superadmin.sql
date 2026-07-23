-- REMPLACEZ l'email ci-dessous par l'adresse email de votre compte
DO $$
DECLARE
  user_email TEXT := 'REMPLACEZ_PAR_VOTRE_EMAIL@ecole.com'; -- ⚠️ CHANGEZ CECI !
  target_user_id UUID;
BEGIN
  -- Trouver l'ID de l'utilisateur
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé avec cet email.';
  END IF;

  -- Mettre à jour le profil pour le forcer en superadmin
  UPDATE public.user_profiles 
  SET role = 'superadmin' 
  WHERE id = target_user_id;
  
  RAISE NOTICE 'Le compte % est maintenant SuperAdmin !', user_email;
END $$;
