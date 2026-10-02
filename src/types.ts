export type UserRole = 'main_admin' | 'principal' | 'admin_hr' | 'owner' | 'admin' | 'accountant' | 'admission_officer' | 'teacher' | 'student';
export type PermissionLevel = 'full' | 'limited' | 'selective';
export type CampusAccess = 'all' | 'lahore' | 'okara';

export type AppModule = 
  | 'dashboard'
  | 'students'
  | 'admissions'
  | 'courses'
  | 'vouchers'
  | 'payments'
  | 'expenses'
  | 'reminders'
  | 'staff'
  | 'reports'
  | 'security'
  | 'settings';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  permission_level?: PermissionLevel;
  campus_access?: CampusAccess;
  allowed_modules?: string; // Comma-separated or JSON array of enabled module ids
  phone?: string;
  status: 'active' | 'disabled';
  two_factor_enabled?: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  last_active_at?: string;
  created_at?: string;
}

export interface UserLoginLog {
  id: number;
  created_at: string;
  ip: string;
  device: string;
  browser: string;
  status: string;
  reason?: string;
}

export interface UserActivityDossier {
  user: User;
  is_online: boolean;
  active_sessions_count: number;
  active_sessions: {
    token: string;
    ip: string;
    user_agent: string;
    device: string;
    created_at: string;
    last_active_at: string;
    expires_at: string;
  }[];
  last_login_at?: string;
  last_active_at?: string;
  last_login_ip?: string;
  total_changes_count: number;
  recent_logins: UserLoginLog[];
  recent_changes: AuditLog[];
}

export interface Student {
  id: number;
  student_id: string;
  registration_no: string;
  full_name: string;
  father_name?: string;
  guardian_name?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  cnic_bform?: string;
  date_of_birth?: string;
  gender: string;
  marital_status?: string;
  nationality?: string;
  qualification?: string;
  address?: string;
  city: string;
  campus?: string;
  status: 'active' | 'graduated' | 'dropped' | 'suspended' | 'archived';
  admission_date: string;
  notes?: string;
  created_at: string;
  active_enrollments_count?: number;
  total_due?: number;
}

export interface CourseTool {
  id?: number;
  course_id?: number;
  tool_name?: string;
  name?: string;
  icon?: string;
  description?: string;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  description: string;
  duration: string;
  duration_months?: number;
  fee: number;
  mode: string;
  instructor?: string;
  website_link?: string;
  status: 'active' | 'inactive';
  tools?: CourseTool[] | string;
}

export interface Batch {
  id: number;
  batch_code: string;
  name: string;
  course_id: number;
  course_name?: string;
  course_code?: string;
  instructor?: string;
  instructor_name?: string;
  campus?: string;
  start_date: string;
  end_date?: string;
  days: string;
  start_time: string;
  end_time: string;
  max_students: number;
  max_capacity?: number;
  current_enrollment?: number;
  enrolled_students?: number;
  mode: string;
  classroom: string;
  room_lab?: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled' | 'running';
}

export interface Admission {
  id: number;
  admission_no: string;
  student_id: number;
  student_name?: string;
  student_phone?: string;
  full_name?: string;
  father_name?: string;
  gender?: string;
  marital_status?: string;
  date_of_birth?: string;
  nationality?: string;
  cnic_bform?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  qualification?: string;
  course_id: number;
  course_name?: string;
  course_code?: string;
  course_duration?: string;
  batch_id: number;
  batch_name?: string;
  batch_code?: string;
  campus?: string;
  admission_date: string;
  course_fee: number;
  discount: number;
  final_payable: number;
  payment_plan: 'full' | 'installments';
  initial_payment: number;
  voucher_no?: string;
  voucher_status?: string;
  voucher_payable?: number;
  receipt_no?: string;
  notes?: string;
  status: 'confirmed' | 'cancelled';
  created_by_name?: string;
}

export interface Enrollment {
  id: number;
  student_id: number;
  student_name?: string;
  student_phone?: string;
  course_id: number;
  course_name?: string;
  course_code?: string;
  duration?: string;
  batch_id: number;
  batch_name?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  admission_id?: number;
  enrollment_date: string;
  course_fee: number;
  discount: number;
  final_fee: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'active' | 'completed' | 'dropped' | 'cancelled';
}

export interface FeeVoucher {
  id: number;
  voucher_no: string;
  student_id: number;
  student_code?: string;
  student_name?: string;
  father_name?: string;
  phone?: string;
  student_phone?: string;
  enrollment_id?: number;
  course_id?: number;
  course_name?: string;
  course_code?: string;
  batch_id?: number;
  batch_name?: string;
  issue_date: string;
  due_date: string;
  fee_description: string;
  amount: number;
  discount: number;
  late_fee: number;
  total_payable: number;
  paid_amount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'void';
  installment_no: number;
  is_overdue?: boolean;
  days_overdue?: number;
  notes?: string;
  created_by_name?: string;
}

export interface Payment {
  id: number;
  receipt_no: string;
  voucher_id?: number;
  voucher_no?: string;
  fee_description?: string;
  student_id: number;
  student_code?: string;
  student_name?: string;
  father_name?: string;
  amount: number;
  payment_date: string;
  payment_method: 'Cash' | 'Bank Transfer' | 'JazzCash' | 'EasyPaisa' | 'Credit/Debit Card';
  transaction_ref?: string;
  received_by?: number;
  received_by_name?: string;
  status: 'valid' | 'voided' | 'reversed';
  void_reason?: string;
  voided_at?: string;
  notes?: string;
}

export interface Expense {
  id: number;
  expense_no: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paid_to: string;
  payment_method: string;
  reference_no?: string;
  notes?: string;
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'voided';
  created_by_name?: string;
  approved_by_name?: string;
  void_reason?: string;
}

export interface AccountTransaction {
  id: number;
  trx_date: string;
  type: 'income' | 'expense';
  account_type: 'cash' | 'bank';
  amount: number;
  category: string;
  reference_id?: string;
  description?: string;
  status: 'valid' | 'voided';
}

export interface Reminder {
  id: number;
  student_id: number;
  student_name?: string;
  voucher_id?: number;
  voucher_no?: string;
  type: 'upcoming' | 'due_today' | 'overdue' | 'payment_confirmation';
  channel: 'whatsapp' | 'sms' | 'email' | 'in_app';
  recipient: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  user_role?: string;
  action: string;
  module: string;
  record_id?: string;
  details?: string;
  old_values?: string;
  new_values?: string;
  ip?: string;
  ip_address?: string;
  created_at: string;
  timestamp?: string;
}

export interface LoginLog {
  id: number;
  user_id?: number;
  user_email: string;
  user_name?: string;
  role?: string;
  ip: string;
  device?: string;
  browser?: string;
  status: 'success' | 'failed';
  reason?: string;
  created_at: string;
}

export interface SystemSettings {
  id: number;
  institute_name: string;
  institute_subtitle: string;
  campuses?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  currency_symbol: string;
  voucher_prefix: string;
  receipt_prefix: string;
  expense_prefix: string;
  reminder_days_before: number;
  reminder_days_after: number;
  email_notifications_enabled: number;
  sms_notifications_enabled: number;
  whatsapp_notifications_enabled: number;
  last_backup_date?: string;
}

export interface CampusPerformanceMetrics {
  campus: 'Lahore' | 'Okara';
  campusName: string;
  campusCode: string;
  location: string;
  phone: string;
  totalStudents: number;
  activeStudents: number;
  newAdmissions: number;
  activeBatches: number;
  todayCollection: number;
  todayReceiptsCount: number;
  todayCash: number;
  todayOnline: number;
  monthlyCollection: number;
  outstandingFees: number;
  monthlyExpenses: number;
  netIncome: number;
  upcomingDueCount: number;
  upcomingDueAmount: number;
  overdueCount: number;
  overdueAmount: number;
  collectionEfficiency: number; // e.g. 78 (%)
  activeEnrollmentRate: number; // e.g. 89 (%)
  feeRecoveryRate: number; // e.g. 82 (%)
  avgRevenuePerStudent: number;
  cashPercentage: number;
  digitalPercentage: number;
  recentPayments?: any[];
  recentAdmissions?: any[];
}

export interface CampusSplitData {
  lahore: CampusPerformanceMetrics;
  okara: CampusPerformanceMetrics;
  comparison: {
    totalRevenue: number;
    lahoreRevenueShare: number;
    okaraRevenueShare: number;
    totalActiveStudents: number;
    lahoreStudentShare: number;
    okaraStudentShare: number;
    totalTodayCollection: number;
    totalOutstanding: number;
    lahoreEfficiency: number;
    okaraEfficiency: number;
  };
}

export interface DashboardStats {
  isStudentView?: boolean;
  isTeacherView?: boolean;
  totalStudents: number;
  activeStudents: number;
  newAdmissions: number;
  activeCourses: number;
  activeBatches: number;
  todayCollection: number;
  todayReceiptsCount?: number;
  todayCash?: number;
  todayOnline?: number;
  todayDate?: string;
  todayCampusBreakdown?: { campus: string; total: number; count: number }[];
  campusSplit?: CampusSplitData;
  monthlyCollection: number;
  monthlyExpectedFees?: number;
  monthlyCollectionSummary?: {
    expected: number;
    collected: number;
    collectionRate: number;
    remaining: number;
    vouchersTotal: number;
    vouchersPaidCount: number;
    vouchersUnpaidCount: number;
    currentMonthName: string;
    campusBreakdown?: {
      campus: string;
      expected: number;
      collected: number;
      remaining: number;
      rate: number;
    }[];
  };
  outstandingFees: number;
  monthlyExpenses: number;
  netIncome: number;
  upcomingDueCount: number;
  upcomingDueAmount: number;
  overdueCount: number;
  overdueAmount: number;
  recentPayments: any[];
  recentExpenses: any[];
  recentAdmissions: any[];
  // Student view fields
  enrolledCount?: number;
  totalPayable?: number;
  totalPaid?: number;
  outstanding?: number;
  vouchers?: FeeVoucher[];
  // Teacher view fields
  assignedCourses?: number;
  totalStudentsEnrolled?: number;
}

export interface StaffMember {
  id: number;
  employee_code: string;
  full_name: string;
  father_name?: string;
  cnic?: string;
  phone?: string;
  email?: string;
  designation: string;
  department: string;
  campus: string;
  office_location?: string;
  arrival_time?: string;
  basic_salary?: number;
  allowed_leaves: number;
  joining_date?: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface StaffAttendanceRecord {
  staff_id: number;
  employee_code: string;
  full_name: string;
  designation: string;
  department: string;
  campus: string;
  office_location?: string;
  arrival_time?: string;
  basic_salary?: number;
  allowed_leaves: number;
  attendance_id?: number;
  date: string;
  attendance_status?: 'present' | 'absent' | 'half_day' | 'late' | 'leave' | 'not_reached' | null;
  time_in?: string;
  time_out?: string;
  check_in_time?: string;
  check_out_time?: string;
  late_minutes?: number;
  remarks?: string;
  notes?: string;
}

export interface StaffLeave {
  id: number;
  staff_id: number;
  staff_name: string;
  designation?: string;
  campus: string;
  leave_type: 'Half Day Leave' | 'Full Day Leave' | 'Sick Leave' | 'Casual Leave' | 'Emergency' | string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
}

export interface DeleteRequest {
  id: number;
  user_id?: number;
  user_name?: string;
  user_role?: string;
  module: string;
  record_id: string;
  record_name: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface StaffPayrollSummaryItem {
  staff_id: number;
  employee_code: string;
  full_name: string;
  designation: string;
  department: string;
  campus: string;
  basic_salary: number;
  allowed_leaves: number;
  per_day_rate: number;
  month: string;
  present_count: number;
  late_count: number;
  leaves_count: number;
  absent_count: number;
  half_day_count: number;
  leave_deduction: number;
  late_deduction: number;
  total_deductions: number;
  net_salary: number;
  status: 'pending' | 'paid';
  payment_date?: string | null;
  payment_method?: string | null;
  transaction_ref?: string | null;
  payroll_id?: number | null;
}

