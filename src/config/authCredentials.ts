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
    role: 'main_admin',
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
    role: 'principal',
    label: 'Principal',
    email: 'principal@digiskool.pk',
    description: 'Academic governance, faculty management, institutional admissions & approvals',
    badge: 'Executive Access',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    campusAccess: 'All Departments & Campuses',
    department: 'Academic Leadership',
    iconName: 'Briefcase'
  },
  {
    role: 'admin_hr',
    label: 'Admin / HR (Miss Asma)',
    email: 'hr@digiskool.pk',
    description: 'Staff attendance rosters, leave approvals, institutional HR & operations',
    badge: 'Operations Access',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    campusAccess: 'Both Campuses (DGSL & DGSO)',
    department: 'Administration & HR',
    iconName: 'UserCheck'
  },
  {
    role: 'teacher',
    label: 'Lead Faculty / Instructor',
    email: 'teacher@digiskool.pk',
    description: 'Assigned digital courses, student batch rosters & curriculum execution',
    badge: 'Faculty Access',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    campusAccess: 'Assigned Batches (Lahore & Okara)',
    department: 'Faculty of Digital Skills',
    iconName: 'User'
  }
];

export const MAIN_ADMIN_EMAIL = 'adnanmrao@gmail.com';
