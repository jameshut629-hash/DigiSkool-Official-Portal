import { UserRole } from '../types.ts';

export interface QuickAccountCredential {
  role: UserRole;
  label: string;
  email: string;
  description: string;
  badge: string;
  badgeColor: string;
  campusAccess: string;
  department: string;
  iconName: 'Shield' | 'Briefcase' | 'UserCheck' | 'User' | 'GraduationCap';
}

/**
 * Consolidated institutional staff directory for DigiSkool
 */
export const ALL_LOGIN_CREDENTIALS: QuickAccountCredential[] = [
  {
    role: 'owner',
    label: 'Main Admin (Adnan Rao)',
    email: 'adnanmrao@gmail.com',
    description: 'Master administrative authority, system settings, financial controls & user security',
    badge: 'Full Master Access',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    campusAccess: 'Both Campuses (DGSL Lahore & DGSO Okara)',
    department: 'Executive Governance',
    iconName: 'Shield'
  },
  {
    role: 'owner',
    label: 'Main Admin (James Hunt)',
    email: 'jameshut629@gmail.com',
    description: 'Chief technical director, multi-campus governance & system administration',
    badge: 'Full Master Access',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    campusAccess: 'Both Campuses (DGSL Lahore & DGSO Okara)',
    department: 'Executive Governance',
    iconName: 'Shield'
  },
  {
    role: 'principal',
    label: 'Principal (Academic Head)',
    email: 'principal@digiskool.pk',
    description: 'Campus academic operations, course curriculum, admissions approval & faculty review',
    badge: 'Academic Authority',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    campusAccess: 'Both Campuses (DGSL Lahore & DGSO Okara)',
    department: 'Academic Directorate',
    iconName: 'GraduationCap'
  },
  {
    role: 'admin_hr',
    label: 'Admin / HR Manager (Miss Asma)',
    email: 'adminhr@digiskool.pk',
    description: 'Human resources, staff attendance, leave management, campus operations & student enrollments',
    badge: 'HR & Operations',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    campusAccess: 'Both Campuses (DGSL Lahore & DGSO Okara)',
    department: 'Human Resources',
    iconName: 'Briefcase'
  },
  {
    role: 'accountant',
    label: 'Senior Accountant (Finance)',
    email: 'accountant@digiskool.pk',
    description: 'Fee voucher verification, collection entries, official receipts, bank accounts & financial ledgers',
    badge: 'Accounts Authority',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    campusAccess: 'Both Campuses (DGSL Lahore & DGSO Okara)',
    department: 'Finance & Accounts',
    iconName: 'UserCheck'
  },
  {
    role: 'admission_officer',
    label: 'Admission Officer (Front Desk)',
    email: 'admission@digiskool.pk',
    description: 'Student inquiries, registration, admission form issuance, batch assignment & initial challans',
    badge: 'Front Desk Authority',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    campusAccess: 'Both Campuses (DGSL Lahore & DGSO Okara)',
    department: 'Admissions Office',
    iconName: 'User'
  },
  {
    role: 'admin',
    label: 'Lahore Campus Admin',
    email: 'lahore.admin@digiskool.pk',
    description: 'Lahore campus administrative operations, classroom schedules, local inventory & student support',
    badge: 'Lahore Campus',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    campusAccess: 'Lahore Campus (DGSL)',
    department: 'Campus Administration',
    iconName: 'Briefcase'
  },
  {
    role: 'admin',
    label: 'Okara Campus Admin',
    email: 'okara.admin@digiskool.pk',
    description: 'Okara campus administrative operations, local inquiry counseling & regional attendance',
    badge: 'Okara Campus',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    campusAccess: 'Okara Campus (DGSO)',
    department: 'Campus Administration',
    iconName: 'Briefcase'
  },
  {
    role: 'teacher',
    label: 'Lead Instructor (Faculty)',
    email: 'teacher@digiskool.pk',
    description: 'Course delivery, student assignments, attendance marking & classroom monitoring',
    badge: 'Faculty Member',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    campusAccess: 'Both Campuses (DGSL Lahore & DGSO Okara)',
    department: 'Academic Faculty',
    iconName: 'GraduationCap'
  }
];

export const MAIN_ADMIN_EMAIL = 'adnanmrao@gmail.com';
