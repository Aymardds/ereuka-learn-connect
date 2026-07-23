export type UserRole = 'superadmin' | 'admin' | 'director' | 'accountant' | 'cashier' | 'teacher' | 'responsible';

export interface Tenant {
  id: string;
  name: string;
  school_types?: string[];
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string; // references auth.users
  email: string;
  full_name: string | null;
  role: UserRole;
  tenant_id: string; // references tenants
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  tenant_id: string;
  level_type?: string | null;
  teacher_id?: string | null;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class_id: string;
  tenant_id: string;
  responsible_id?: string | null;
  status: 'pending' | 'active' | 'inactive';
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  teacher_id: string;
  tenant_id: string;
}

export interface AttendanceSignature {
  id: string;
  class_id: string;
  date: string;
  teacher_id: string;
  signature_data: string | null; // base64 canvas data or simple confirmation string
  is_validated: boolean;
  validated_by: string | null; // responsible id
  validated_at: string | null;
  created_at: string;
}

export interface ParentInvitation {
  id: string;
  tenant_id: string;
  student_id: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  coefficient: number;
  color: string | null;
  tenant_id: string;
  created_at: string;
}

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  tenant_id: string;
  created_at: string;
}
