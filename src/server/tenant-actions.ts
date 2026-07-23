import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials in environment variables.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export type CreateTenantPayload = {
  tenantName: string;
  adminEmail: string;
  adminName: string;
};

export const createTenantAndAdmin = createServerFn({ method: 'POST' })
  .validator((data: CreateTenantPayload) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseAdmin();

    // 1. Create the tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{ name: data.tenantName }])
      .select()
      .single();

    if (tenantError) {
      throw new Error(`Erreur création établissement: ${tenantError.message}`);
    }

    // 2. Generate a secure random password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

    // 3. Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: data.adminEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.adminName }
    });

    if (authError) {
      throw new Error(`Erreur création utilisateur: ${authError.message}`);
    }

    // 4. Create the user profile linked to the new tenant
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        id: authUser.user.id,
        email: data.adminEmail,
        full_name: data.adminName,
        role: 'admin',
        tenant_id: tenant.id
      }]);

    if (profileError) {
      throw new Error(`Erreur création profil: ${profileError.message}`);
    }

    return {
      success: true,
      message: "Établissement et administrateur créés avec succès.",
      tempPassword,
    };
  });
