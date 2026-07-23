-- Create ENUMs
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'responsible');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- 1. Create Tenants Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create User Profiles (Links to Supabase Auth)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'teacher',
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Classes Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Students Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Attendances Table
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status NOT NULL DEFAULT 'present',
    teacher_id UUID NOT NULL REFERENCES user_profiles(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Attendance Signatures Table
CREATE TABLE attendance_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    teacher_id UUID NOT NULL REFERENCES user_profiles(id),
    signature_data TEXT, -- Base64 encoded image
    is_validated BOOLEAN DEFAULT false,
    validated_by UUID REFERENCES user_profiles(id),
    validated_at TIMESTAMP WITH TIME ZONE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_signatures ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Tenants Policy: Users can only see their own tenant
CREATE POLICY "Users view own tenant" ON tenants
  FOR SELECT USING (id = public.get_user_tenant_id());

-- User Profiles Policy: Users can see profiles in their tenant
CREATE POLICY "Users view tenant profiles" ON user_profiles
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Classes Policy
CREATE POLICY "Users view tenant classes" ON classes
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- Students Policy
CREATE POLICY "Users view tenant students" ON students
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- Attendances Policy
CREATE POLICY "Users view tenant attendances" ON attendances
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Teachers can insert attendances" ON attendances
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own attendances" ON attendances
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND auth.uid() = teacher_id);

-- Attendance Signatures Policy
CREATE POLICY "Users view tenant signatures" ON attendance_signatures
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Teachers can insert signatures" ON attendance_signatures
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND auth.uid() = teacher_id);

CREATE POLICY "Responsibles can validate signatures" ON attendance_signatures
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id() 
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'responsible')
    )
  );

-- Function to handle new user registration from auth.users to user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- This requires setting up the user profile manually or assigning a default tenant.
  -- In a real scenario, an admin creates the user via invitation.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
