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
  }
];

export const MAIN_ADMIN_EMAIL = 'adnanmrao@gmail.com';
