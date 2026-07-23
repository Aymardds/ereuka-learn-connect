-- Ce script va créer une école par défaut et associer votre compte utilisateur à cette école.
-- AVANT DE LANCER LE SCRIPT : Remplacez l'email ci-dessous par celui avec lequel vous vous êtes connecté.

DO $$
DECLARE
  new_tenant_id UUID;
  user_email TEXT := 'REMPLACEZ_PAR_VOTRE_EMAIL@ecole.com'; -- ⚠️ CHANGEZ CECI !
  target_user_id UUID;
BEGIN
  -- 1. Trouver l'ID de l'utilisateur dans auth.users
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé. Êtes-vous sûr de vous être inscrit avec cet email ?';
  END IF;

  -- 2. Créer une école par défaut s'il n'y en a pas
  SELECT id INTO new_tenant_id FROM tenants LIMIT 1;
  IF new_tenant_id IS NULL THEN
    INSERT INTO tenants (name) VALUES ('Mon École de Test') RETURNING id INTO new_tenant_id;
  END IF;

  -- 3. Lier l'utilisateur à l'école avec le rôle admin
  INSERT INTO user_profiles (id, email, full_name, role, tenant_id)
  VALUES (target_user_id, user_email, 'Administrateur', 'admin', new_tenant_id)
  ON CONFLICT (id) DO UPDATE 
    SET tenant_id = new_tenant_id, 
        role = 'admin';
  
END $$;
