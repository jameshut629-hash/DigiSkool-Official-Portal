import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Receipt,
  CreditCard,
  TrendingDown,
  Wallet,
  BellRing,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  UserCheck,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { DigiSkoolLogo } from '../common/DigiSkoolLogo.tsx';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, isOpen, onToggle }) => {
  const { user, logout, isOwner, isAdmin, isAccountant, isAdmissionOfficer, isTeacher, isStudent, canAccessModule } = useAuth();

  const getNavItems = () => {
    if (isStudent) {
      return [
        { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
        { id: 'courses', label: 'DigiSkool Courses', icon: BookOpen },
        { id: 'vouchers', label: 'Fee Vouchers', icon: Receipt },
        { id: 'payments', label: 'Payment Receipts', icon: CreditCard },
      ].filter(item => canAccessModule(item.id));
    }

    if (isTeacher) {
      return [
        { id: 'dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard },
        { id: 'courses', label: 'Courses & Tools', icon: BookOpen },
        { id: 'students', label: 'Enrolled Students', icon: Users },
      ].filter(item => canAccessModule(item.id));
    }

    const items: Array<{ id: string; label: string; icon: any; badge?: string }> = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    if (canAccessModule('students')) {
      items.push({ id: 'students', label: 'Students Directory', icon: Users });
    }

    if (canAccessModule('admissions')) {
      items.push({ id: 'admissions', label: 'Admissions Desk', icon: GraduationCap, badge: 'New' });
    }

    if (canAccessModule('courses')) {
      items.push({ id: 'courses', label: 'Courses & Pricing', icon: BookOpen });
    }

    if (canAccessModule('vouchers')) {
      items.push({ id: 'vouchers', label: 'Fee Vouchers', icon: Receipt });
    }

    if (canAccessModule('payments')) {
      items.push({ id: 'payments', label: 'Payments & Receipts', icon: CreditCard });
    }

    if (canAccessModule('expenses')) {
      items.push({ id: 'expenses', label: 'Expenses Desk', icon: TrendingDown });
    }

    if (canAccessModule('accounts')) {
      items.push({ id: 'accounts', label: 'Bank Accounts & Ledger', icon: Wallet });
    }

    if (canAccessModule('reminders')) {
      items.push({ id: 'reminders', label: 'Fee Reminders', icon: BellRing });
    }

    if (canAccessModule('staff')) {
      items.push({ id: 'staff', label: 'Staff & Attendance', icon: UserCheck });
    }

    if (canAccessModule('reports')) {
      items.push({ id: 'reports', label: 'Reports & Analytics', icon: BarChart3 });
    }

    if (canAccessModule('security')) {
      items.push({ id: 'security', label: 'Security & Users', icon: Shield, badge: isOwner ? 'Super' : undefined });
    }

    if (canAccessModule('activity-log')) {
      items.push({ id: 'activity-log', label: 'Activity Log', icon: Activity, badge: 'Owner' });
    }

    if (canAccessModule('settings')) {
      items.push({ id: 'settings', label: 'Institute Settings', icon: Settings });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/50">
        <button
          className="flex items-center justify-center w-full py-1 text-left focus:outline-hidden group cursor-pointer"
          onClick={() => onSelectTab('dashboard')}
          title="DigiSkool - Institute of Digital Skills"
        >
          <div className="bg-white hover:bg-white/95 px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center justify-center w-full">
            <DigiSkoolLogo variant="horizontal" size="sm" />
          </div>
        </button>
      </div>

      {/* Role Badge Indicator */}
      <div className="px-4 py-2.5 bg-slate-950/20 border-b border-slate-800/50 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px]">Logged in as:</span>
        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] tracking-wide uppercase ${
          user?.role === 'owner' || user?.role === 'main_admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
          user?.role === 'principal' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
          user?.role === 'admin_hr' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          user?.role === 'admin' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
          user?.role === 'accountant' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          user?.role === 'admission_officer' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
          user?.role === 'teacher' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
          'bg-slate-700 text-slate-200'
        }`}>
          {user?.role === 'main_admin' ? 'Main Admin' :
           user?.role === 'principal' ? 'Principal' :
           user?.role === 'admin_hr' ? 'Admin / HR' :
           user?.role?.replace('_', ' ')}
        </span>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (window.innerWidth < 1024) onToggle();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#6E1231] text-white shadow-sm shadow-[#6E1231]/40 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 mb-2">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Sign out of DigiSkool"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-1.5 border-t border-slate-800/40 text-center">
          <p className="text-[10px] text-slate-400 font-medium tracking-tight">
            Designed & Developed & Managed by{' '}
            <span className="text-amber-400 font-bold hover:underline cursor-default">GenZ Lab</span>
          </p>
        </div>
      </div>
    </aside>
  );
};
