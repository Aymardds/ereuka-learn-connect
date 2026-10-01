export type UserRole = 
  | 'superadmin' 
  | 'admin' 
  | 'director' 
  | 'accountant' 
  | 'cashier' 
  | 'teacher' 
  | 'responsible'
  | 'dean'
  | 'department_head'
  | 'secretary'
  | 'surveillance'
  | 'student'
  | 'parent';

export interface Tenant {
  id: string;
  name: string;
  school_types?: string[];
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  subscription_plan_id?: string | null;
  plan_code?: 'starter' | 'pro' | 'enterprise';
  subscription_status?: 'trial' | 'active' | 'past_due' | 'cancelled';
  trial_ends_at?: string;
  subscription_renews_at?: string;
  custom_modules?: Record<string, boolean>;
  created_at: string;
}

export interface UserProfile {
  id: string; // references auth.users
  email: string;
  full_name: string | null;
  role: UserRole;
  tenant_id: string; // references tenants
  phone?: string | null;
  campus_id?: string | null;
  employee_code?: string | null;
  qualification?: string | null;
  hire_date?: string | null;
  is_active?: boolean;
  created_at: string;
  tenant?: Tenant | null;
}

export interface Campus {
  id: string;
  tenant_id: string;
  name: string;
  code?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_main: boolean;
  created_at: string;
}

export interface Cycle {
  id: string;
  tenant_id: string;
  name: string;
  code: string; // 'MAT' | 'PRI' | 'COL' | 'LYC' | 'SUP' | 'PRO'
  description?: string | null;
  ordering: number;
  created_at: string;
}

export interface Department {
  id: string;
  tenant_id: string;
  campus_id?: string | null;
  name: string;
  code?: string | null;
  head_user_id?: string | null;
  created_at: string;
}

export interface Program {
  id: string;
  tenant_id: string;
  department_id?: string | null;
  cycle_id?: string | null;
  name: string;
  code?: string | null;
  duration_years: number;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  tenant_id: string;
  level_type?: string | null;
  level?: string | null;
  teacher_id?: string | null;
  campus_id?: string | null;
  cycle_id?: string | null;
  program_id?: string | null;
  room_number?: string | null;
  max_capacity?: number;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class_id: string;
  tenant_id: string;
  responsible_id?: string | null;
  status: 'pending' | 'active' | 'inactive';
  student_code?: string | null;
  date_of_birth?: string | null;
  gender?: 'M' | 'F' | 'other' | null;
  place_of_birth?: string | null;
  nationality?: string | null;
  address?: string | null;
  photo_url?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  guardian_relationship?: string | null;
  blood_group?: string | null;
  medical_notes?: string | null;
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
  signature_data: string | null;
  is_validated: boolean;
  validated_by: string | null;
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

export interface AcademicYear {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface GradingSystem {
  id: string;
  tenant_id: string;
  name: string;
  system_type: 'out_of_20' | 'gpa_4' | 'ects' | 'percentage';
  passing_grade: number;
  max_grade: number;
  scale_config?: Record<string, any> | null;
  is_default: boolean;
  created_at: string;
}

export interface TimetableSlot {
  id: string;
  tenant_id: string;
  class_id: string;
  subject_id: string;
  teacher_id?: string | null;
  academic_year_id?: string | null;
  day_of_week: number; // 1 = Lundi, 6 = Samedi
  start_time: string;
  end_time: string;
  room_name?: string | null;
  recurrence?: string;
  created_at: string;
  // Joins
  subject?: Subject;
  teacher?: UserProfile;
  class?: Class;
}

export interface CourseLog {
  id: string;
  tenant_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  session_date: string;
  title: string;
  chapter_title?: string | null;
  content_summary: string;
  homework_assigned?: string | null;
  homework_due_date?: string | null;
  documents_url?: string | null;
  is_validated_by_inspection: boolean;
  created_at: string;
  // Joins
  subject?: Subject;
  teacher?: UserProfile;
  class?: Class;
}

export interface GradeEntry {
  id: string;
  tenant_id: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  evaluation_name: string;
  evaluation_type: 'interro' | 'devoir' | 'tp' | 'partiel' | 'examen';
  term: 'T1' | 'T2' | 'T3' | 'S1' | 'S2';
  score: number;
  max_score: number;
  coefficient: number;
  evaluation_date: string;
  teacher_comment?: string | null;
  recorded_by?: string | null;
  created_at: string;
  // Joins
  student?: Student;
  subject?: Subject;
}

export interface Bulletin {
  id: string;
  tenant_id: string;
  student_id: string;
  class_id: string;
  academic_year_id?: string | null;
  term: 'T1' | 'T2' | 'T3' | 'S1' | 'S2';
  general_average: number;
  class_average?: number | null;
  min_average?: number | null;
  max_average?: number | null;
  rank?: number | null;
  total_students?: number | null;
  appraisal?: string | null;
  conduct_remarks?: string | null;
  is_published: boolean;
  published_at?: string | null;
  generated_at: string;
  // Joins
  student?: Student;
  class?: Class;
}

export interface StaffContract {
  id: string;
  tenant_id: string;
  user_id: string;
  contract_type: 'cdi' | 'cdd' | 'vacataire' | 'stage' | 'prestataire';
  title: string;
  start_date: string;
  end_date?: string | null;
  base_salary: number;
  hourly_rate: number;
  weekly_hours: number;
  status: 'active' | 'terminated' | 'suspended' | 'draft';
  documents_url?: string | null;
  created_at: string;
  // Joins
  user?: UserProfile;
}

export interface LeaveRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  leave_type: 'annual' | 'sick' | 'maternity' | 'special' | 'unpaid';
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string | null;
  attachment_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  // Joins
  user?: UserProfile;
}

export interface TeachingHours {
  id: string;
  tenant_id: string;
  teacher_id: string;
  academic_year_id?: string | null;
  subject_id?: string | null;
  class_id?: string | null;
  month: number;
  year: number;
  contracted_hours: number;
  performed_hours: number;
  overtime_hours: number;
  is_paid: boolean;
  created_at: string;
  // Joins
  teacher?: UserProfile;
  subject?: Subject;
  class?: Class;
}

export interface AppMessage {
  id: string;
  tenant_id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  attachment_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  sender?: UserProfile;
  recipient?: UserProfile;
}

export interface Announcement {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  category: 'general' | 'academic' | 'event' | 'urgent' | 'administrative';
  target_role: 'all' | 'parent' | 'teacher' | 'student' | 'staff';
  campus_id?: string | null;
  class_id?: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  author_id?: string | null;
  published_at: string;
  expires_at?: string | null;
  author?: UserProfile;
}

export interface AppNotification {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'payment' | 'grade' | 'attendance' | 'message' | 'announcement' | 'system';
  link_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  code: 'starter' | 'pro' | 'enterprise';
  name: string;
  description: string;
  price_cfa: number;
  max_students: number;
  max_campuses: number;
  max_staff: number;
  max_storage_gb: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface PaymentGateway {
  id: string;
  tenant_id: string;
  provider: 'cinetpay' | 'paydunya' | 'direct_wave';
  site_id?: string | null;
  api_key?: string | null;
  secret_key?: string | null;
  is_live: boolean;
  currency: string;
  supported_channels: string[];
  webhook_url?: string | null;
  created_at: string;
}

export interface CinetPayTransaction {
  id: string;
  tenant_id: string;
  student_id: string;
  schedule_id?: string | null;
  cpm_trans_id: string;
  cpm_site_id?: string | null;
  amount: number;
  currency: string;
  description: string;
  customer_name?: string | null;
  customer_surname?: string | null;
  customer_phone_number?: string | null;
  customer_email?: string | null;
  payment_method?: string | null;
  operator_id?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'CANCELLED' | 'FAILED';
  payment_token?: string | null;
  payment_url?: string | null;
  webhook_received_at?: string | null;
  webhook_payload?: Record<string, any> | null;
  receipt_number?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// SYSTÈME UNIVERSITAIRE & LMD (Licence - Master - Doctorat)
// ============================================================

export type LMDUEType = 'fondamentale' | 'complementaire' | 'transversale' | 'optionnelle';
export type LMDSemester = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10';
export type LMDCycle = 'Licence' | 'Master' | 'Doctorat';
export type LMDLevel = 'L1' | 'L2' | 'L3' | 'M1' | 'M2' | 'D1' | 'D2' | 'D3';
export type LMDDeliberationStatus = 'admis' | 'admis_compensation' | 'dettes' | 'ajourne' | 'en_cours';

export interface LMDTeachingUnit {
  id: string;
  tenant_id: string;
  program_id?: string | null;
  code: string; // e.g. "INF1101"
  name: string; // e.g. "Algorithmique & Structures de Données"
  ue_type: LMDUEType;
  semester: string; // 'S1'...'S10'
  credits: number; // e.g. 6.0 ECTS
  description?: string | null;
  created_at?: string;
  elements?: LMDEcue[];
}

export interface LMDEcue {
  id: string;
  tenant_id: string;
  ue_id: string;
  code: string; // e.g. "INF1101-1"
  name: string; // e.g. "Algorithmique avancée"
  credits?: number; // e.g. 3.0
  coefficient: number; // e.g. 1.0 or 2.0
  hours_cm: number; // Cours Magistraux
  hours_td: number; // Travaux Dirigés
  hours_tp: number; // Travaux Pratiques
  hours_tpe?: number; // Travail Personnel Étudiant
  teacher_id?: string | null;
  created_at?: string;
  teacher?: { full_name?: string; email?: string } | null;
}

export interface LMDStudentGrade {
  id: string;
  tenant_id: string;
  student_id: string;
  ecue_id: string;
  academic_year: string;
  semester: string;
  cc_score?: number | null; // Contrôle Continu /20 (40%)
  exam_score?: number | null; // Session Normale /20 (60%)
  resit_score?: number | null; // Session Rattrapage /20
  final_score?: number | null; // Note finale retenue
  is_validated?: boolean;
  recorded_by?: string | null;
  created_at?: string;
}

export interface LMDDeliberation {
  id: string;
  tenant_id: string;
  student_id: string;
  program_id?: string | null;
  class_id?: string | null;
  semester: string;
  academic_year: string;
  total_credits_enrolled: number;
  total_credits_validated: number;
  semester_average: number;
  gpa?: number | null;
  status: LMDDeliberationStatus;
  mention?: string | null;
  jury_president?: string | null;
  deliberation_date?: string;
  is_closed?: boolean;
  created_at?: string;
  student?: {
    first_name: string;
    last_name: string;
    student_code?: string | null;
  };
}
