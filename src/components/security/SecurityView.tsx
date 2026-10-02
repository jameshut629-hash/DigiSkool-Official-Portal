import React, { useState, useEffect } from 'react';
import {
  Shield,
  Mail,
  Users,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  Plus,
  Clock,
  CheckCircle2,
  Filter,
  Eye,
  Trash2,
  Edit2,
  Building2,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  QrCode,
  Smartphone,
  Copy,
  Check,
  RotateCcw,
  Activity,
  History,
  Globe,
  Laptop,
  Radio,
  Search,
  ArrowRight,
  ShieldX
} from 'lucide-react';
import { User, AuditLog, UserRole, PermissionLevel, CampusAccess, UserActivityDossier } from '../../types.ts';
import { apiRequest, formatDate, formatDateTime, formatTime } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { ALL_LOGIN_CREDENTIALS } from '../../config/authCredentials.ts';
import { Modal } from '../common/Modal.tsx';

export const SecurityView: React.FC = () => {
  const { isOwner, isMainAdmin, isPrincipal, isAdminHR, user: currentUser, canManageUsers } = useAuth();
  const [subTab, setSubTab] = useState<'audit' | 'alerts' | 'users' | 'activity'>('users');

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityList, setActivityList] = useState<UserActivityDossier[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<UserActivityDossier | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activeDossierTab, setActiveDossierTab] = useState<'changes' | 'logins'>('changes');
  const [loading, setLoading] = useState(true);

  // Available App Modules for Granular Permission Access
  const ALL_MODULES = [
    { id: 'dashboard', label: 'Dashboard & Summaries', desc: 'Overview, analytics & fees collection summary', category: 'Academic Desk' },
    { id: 'students', label: 'Students Directory', desc: 'Profiles, contact details & student QR ID cards', category: 'Academic Desk' },
    { id: 'admissions', label: 'Admissions Desk', desc: 'Applications, enrolment & printable forms', category: 'Academic Desk' },
    { id: 'courses', label: 'Courses & Pricing', desc: 'Fee structures, batch schedules & syllabus', category: 'Academic Desk' },
    { id: 'vouchers', label: 'Fee Vouchers', desc: 'Generate, issue & print 3-copy fee challans', category: 'Finance & Accounts' },
    { id: 'payments', label: 'Payments & Receipts', desc: 'Fee collection recovery & official receipts', category: 'Finance & Accounts' },
    { id: 'expenses', label: 'Expenses Desk', desc: 'Expenditure vouchers, approvals & payments', category: 'Finance & Accounts' },
    { id: 'accounts', label: 'Bank Accounts & Ledger', desc: 'Cash balances, bank accounts & financial ledger', category: 'Finance & Accounts' },
    { id: 'reminders', label: 'Fee Reminders', desc: 'SMS, WhatsApp & Email fee alerts', category: 'Finance & Accounts' },
    { id: 'staff', label: 'Staff & Attendance', desc: 'Staff rosters, timings & biometric attendance', category: 'Administration & Security' },
    { id: 'reports', label: 'Reports & Analytics', desc: 'Financial audit statements & analytics', category: 'Administration & Security' },
    { id: 'security', label: 'Security & Users', desc: 'Staff account provisioning & 2FA security', category: 'Administration & Security' },
    { id: 'activity-log', label: 'Activity Log', desc: 'Staff login history & changes audit trail', category: 'Administration & Security' },
    { id: 'settings', label: 'Institute Settings', desc: 'Bank accounts, campuses & print setup', category: 'Administration & Security' },
  ];

  // User modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> & { password?: string }>({
    name: '',
    email: '',
    phone: '',
    role: 'admission_officer',
    permission_level: 'selective',
    campus_access: 'all',
    allowed_modules: 'dashboard,students,admissions',
    password: '',
    status: 'active'
  });
  const [submittingUser, setSubmittingUser] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dedicated Permissions & Access Control Modal State
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionTargetUser, setPermissionTargetUser] = useState<User | null>(null);
  const [permissionAllowedModules, setPermissionAllowedModules] = useState<string[]>([]);
  const [permissionCampusAccess, setPermissionCampusAccess] = useState<CampusAccess>('all');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('selective');
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionSuccessMsg, setPermissionSuccessMsg] = useState<string | null>(null);

  // Admin 2FA Management Modal State
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [twoFactorTargetUser, setTwoFactorTargetUser] = useState<User | null>(null);
  const [twoFactorData, setTwoFactorData] = useState<{ secret: string; qrCode: string; otpauth: string } | null>(null);
  const [twoFactorModalLoading, setTwoFactorModalLoading] = useState(false);
  const [twoFactorModalError, setTwoFactorModalError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const formatExactDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Never logged in';
    return formatDateTime(dateStr, true);
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 0) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Active just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const promises: [Promise<any>, Promise<any>, Promise<any>, Promise<any>?] = [
        apiRequest<AuditLog[]>('/api/security/audit-logs').catch(() => []),
        apiRequest<any[]>('/api/security/email-alerts').catch(() => []),
        apiRequest<User[]>('/api/security/users').catch(() => [])
      ];

      if (isOwner || isMainAdmin) {
        promises.push(apiRequest<UserActivityDossier[]>('/api/security/users-activity').catch(() => []));
      }

      const [logs, alrts, usrs, acts] = await Promise.all(promises);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setAlerts(Array.isArray(alrts) ? alrts : []);
      if (acts && Array.isArray(acts)) {
        setActivityList(acts.filter(a => a.user && a.user.role !== 'student'));
      }
      
      // If server returned users, use them
      if (Array.isArray(usrs) && usrs.length > 0) {
        // Filter out any student account
        const nonStudents = usrs.filter((u) => u.role !== 'student' && !u.email.toLowerCase().includes('student@'));
        setUsers(nonStudents);
        localStorage.setItem('digiskool_custom_users', JSON.stringify(nonStudents));
      } else {
        // Static hosting fallback from localStorage or default credentials
        const storedCustom = localStorage.getItem('digiskool_custom_users');
        if (storedCustom) {
          try {
            const parsed = JSON.parse(storedCustom);
            setUsers(parsed.filter((u: User) => u.role !== 'student' && !u.email.toLowerCase().includes('student@')));
          } catch {
            seedFallbackUsers();
          }
        } else {
          seedFallbackUsers();
        }
      }
    } catch (err: any) {
      console.error('Failed to load security data, using local fallback:', err);
      seedFallbackUsers();
    } finally {
      setLoading(false);
    }
  };

  const seedFallbackUsers = () => {
    const defaultList: User[] = ALL_LOGIN_CREDENTIALS
      .filter((c) => c.role !== 'student')
      .map((c, idx) => ({
        id: idx + 1,
        name: c.label,
        email: c.email,
        role: c.role,
        permission_level: c.role === 'main_admin' ? 'full' : 'limited',
        campus_access: c.campusAccess.toLowerCase().includes('lahore') && !c.campusAccess.toLowerCase().includes('okara') ? 'lahore' :
                       c.campusAccess.toLowerCase().includes('okara') && !c.campusAccess.toLowerCase().includes('lahore') ? 'okara' : 'all',
        phone: '0331-7155174',
        status: 'active',
        created_at: new Date().toISOString()
      }));
    setUsers(defaultList);
    localStorage.setItem('digiskool_custom_users', JSON.stringify(defaultList));
  };

  useEffect(() => {
    loadData();
  }, [subTab]);

  const openCreateModal = () => {
    if (users.length >= 10) {
      alert('System limit reached: A maximum of 10 users can be configured in this system.');
      return;
    }
    setIsEditing(false);
    setEditingUserId(null);
    setFormError(null);
    setEditingUser({
      name: '',
      email: '',
      phone: '',
      role: 'admission_officer',
      permission_level: 'selective',
      campus_access: 'all',
      allowed_modules: 'dashboard,students,admissions,courses',
      password: '',
      status: 'active'
    });
    setUserModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setIsEditing(true);
    setEditingUserId(u.id);
    setFormError(null);
    setEditingUser({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      permission_level: u.permission_level || (u.role === 'main_admin' || u.role === 'owner' ? 'full' : 'selective'),
      campus_access: u.campus_access || 'all',
      allowed_modules: u.allowed_modules || (u.role === 'main_admin' || u.role === 'owner' || u.role === 'principal' ? 'all' : 'dashboard,students,admissions'),
      password: '',
      status: u.status
    });
    setUserModalOpen(true);
  };

  const openPermissionsModal = (targetUser: User) => {
    setPermissionTargetUser(targetUser);
    setPermissionCampusAccess(targetUser.campus_access || 'all');
    setPermissionLevel(targetUser.permission_level || (targetUser.role === 'main_admin' || targetUser.role === 'owner' ? 'full' : 'selective'));
    setPermissionSuccessMsg(null);

    let initialModules: string[] = [];
    if (!targetUser.allowed_modules || targetUser.allowed_modules === 'all' || targetUser.role === 'main_admin' || targetUser.role === 'owner') {
      initialModules = ALL_MODULES.map((m) => m.id);
    } else {
      initialModules = targetUser.allowed_modules.split(',').map((m) => m.trim().toLowerCase());
    }
    setPermissionAllowedModules(initialModules);
    setPermissionModalOpen(true);
  };

  const applyPreset = (preset: 'admin' | 'principal' | 'accountant' | 'admission' | 'teacher' | 'all' | 'clear') => {
    switch (preset) {
      case 'all':
      case 'admin':
        setPermissionAllowedModules(ALL_MODULES.map((m) => m.id));
        setPermissionLevel('full');
        setPermissionCampusAccess('all');
        break;
      case 'principal':
        setPermissionAllowedModules(ALL_MODULES.filter((m) => m.id !== 'settings').map((m) => m.id));
        setPermissionLevel('full');
        setPermissionCampusAccess('all');
        break;
      case 'accountant':
        setPermissionAllowedModules(['dashboard', 'vouchers', 'payments', 'expenses', 'accounts', 'reminders', 'reports']);
        setPermissionLevel('selective');
        break;
      case 'admission':
        setPermissionAllowedModules(['dashboard', 'students', 'admissions', 'courses', 'reminders']);
        setPermissionLevel('selective');
        break;
      case 'teacher':
        setPermissionAllowedModules(['dashboard', 'courses', 'students']);
        setPermissionLevel('limited');
        break;
      case 'clear':
        setPermissionAllowedModules(['dashboard']);
        setPermissionLevel('limited');
        break;
    }
  };

  const handleSavePermissions = async () => {
    if (!permissionTargetUser) return;
    setSavingPermissions(true);
    setPermissionSuccessMsg(null);

    try {
      const isAll = permissionAllowedModules.length === ALL_MODULES.length;
      const formatted = isAll ? 'all' : (permissionAllowedModules.length === 0 ? 'dashboard' : permissionAllowedModules.join(','));
      const finalPermLevel: PermissionLevel = isAll ? 'full' : permissionAllowedModules.length > 3 ? 'selective' : 'limited';

      const payload = {
        allowed_modules: formatted,
        permission_level: finalPermLevel,
        campus_access: permissionCampusAccess
      };

      try {
        await apiRequest(`/api/security/users/${permissionTargetUser.id}/permissions`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } catch {
        await apiRequest(`/api/users/${permissionTargetUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }

      // Update in-memory state
      const updatedList = users.map((u) =>
        u.id === permissionTargetUser.id
          ? { ...u, allowed_modules: formatted, permission_level: finalPermLevel, campus_access: permissionCampusAccess }
          : u
      );
      setUsers(updatedList);
      localStorage.setItem('digiskool_custom_users', JSON.stringify(updatedList));

      // If current user updated their own permissions, update localStorage
      if (currentUser && currentUser.id === permissionTargetUser.id) {
        const storedAuth = localStorage.getItem('digiskool_auth_user');
        if (storedAuth) {
          try {
            const parsed = JSON.parse(storedAuth);
            parsed.allowed_modules = formatted;
            parsed.permission_level = finalPermLevel;
            parsed.campus_access = permissionCampusAccess;
            localStorage.setItem('digiskool_auth_user', JSON.stringify(parsed));
          } catch {}
        }
      }

      setPermissionSuccessMsg(`Permissions updated successfully for ${permissionTargetUser.name}!`);
      setTimeout(() => {
        setPermissionModalOpen(false);
        loadData();
      }, 700);
    } catch (err: any) {
      alert('Failed to save permissions: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRoleChange = (selectedRole: UserRole) => {
    let perm: PermissionLevel = 'selective';
    let campus: CampusAccess = 'all';
    let modules = 'dashboard';

    if (selectedRole === 'main_admin' || selectedRole === 'owner') {
      perm = 'full';
      campus = 'all';
      modules = 'all';
    } else if (selectedRole === 'principal') {
      perm = 'full';
      campus = 'all';
      modules = 'all';
    } else if (selectedRole === 'admin_hr') {
      perm = 'full';
      campus = 'all';
      modules = 'dashboard,staff,reports,students';
    } else if (selectedRole === 'accountant') {
      perm = 'selective';
      modules = 'dashboard,vouchers,payments,expenses,reminders,reports';
    } else if (selectedRole === 'admission_officer') {
      perm = 'selective';
      modules = 'dashboard,students,admissions,courses';
    } else if (selectedRole === 'teacher') {
      perm = 'limited';
      modules = 'dashboard,courses,students';
    } else {
      perm = 'limited';
      modules = 'dashboard';
    }

    setEditingUser((prev) => ({
      ...prev,
      role: selectedRole,
      permission_level: perm,
      campus_access: (selectedRole === 'main_admin' || selectedRole === 'admin_hr') ? 'all' : (prev.campus_access || campus),
      allowed_modules: modules
    }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editingUser.name || !editingUser.email || (!isEditing && !editingUser.password)) {
      setFormError('Name, Email, and Password are required.');
      return;
    }

    setSubmittingUser(true);
    try {
      if (isEditing && editingUserId) {
        try {
          await apiRequest(`/api/users/${editingUserId}`, {
            method: 'PUT',
            body: JSON.stringify(editingUser)
          });
          if (editingUser.password && editingUser.password.length >= 6) {
            await apiRequest(`/api/users/${editingUserId}/reset-password`, {
              method: 'POST',
              body: JSON.stringify({ new_password: editingUser.password })
            });
          }
        } catch {
          // Fallback to local storage update for static deployments
          const updatedList = users.map((u) =>
            u.id === editingUserId ? { ...u, ...editingUser } as User : u
          );
          setUsers(updatedList);
          localStorage.setItem('digiskool_custom_users', JSON.stringify(updatedList));
        }
        alert(`User account "${editingUser.name}" updated successfully.`);
      } else {
        try {
          await apiRequest('/api/security/users', {
            method: 'POST',
            body: JSON.stringify(editingUser)
          });
        } catch {
          // Fallback to local storage creation for static deployments
          const newUser: User = {
            id: Date.now(),
            name: editingUser.name!,
            email: editingUser.email!,
            role: editingUser.role as UserRole,
            permission_level: editingUser.permission_level,
            campus_access: editingUser.campus_access,
            phone: editingUser.phone,
            status: editingUser.status as 'active' | 'disabled',
            created_at: new Date().toISOString()
          };
          const updatedList = [newUser, ...users];
          setUsers(updatedList);
          localStorage.setItem('digiskool_custom_users', JSON.stringify(updatedList));
        }
        alert(`User account "${editingUser.name}" provisioned successfully.`);
      }
      setUserModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot lock your own logged-in account.');
      return;
    }
    const newStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    if (!window.confirm(`Change status of "${targetUser.name}" to "${newStatus}"?`)) return;

    try {
      await apiRequest(`/api/security/users/${targetUser.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      loadData();
    } catch (err: any) {
      // Local fallback
      const updatedList = users.map((u) =>
        u.id === targetUser.id ? { ...u, status: newStatus as 'active' | 'disabled' } : u
      );
      setUsers(updatedList);
      localStorage.setItem('digiskool_custom_users', JSON.stringify(updatedList));
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (!isOwner && !isMainAdmin) {
      alert('Please contact to admin for deletion of data.');
      return;
    }
    if (targetUser.id === currentUser?.id) {
      alert('You cannot delete your own logged-in account.');
      return;
    }
    if (targetUser.role === 'main_admin' || targetUser.role === 'owner') {
      const adminCount = users.filter((u) => u.role === 'main_admin' || u.role === 'owner').length;
      if (adminCount <= 1) {
        alert('CRITICAL: Cannot delete the only Main Admin account.');
        return;
      }
    }

    if (!window.confirm(`Are you sure you want to permanently delete user "${targetUser.name}" (${targetUser.email})? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiRequest(`/api/users/${targetUser.id}`, {
        method: 'DELETE'
      });
      alert(`User "${targetUser.name}" deleted.`);
      loadData();
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('contact to admin')) {
        alert('Please contact to admin for deletion of data.');
      } else {
        alert(err.message || 'Deletion failed');
      }
    }
  };

  const handleOpenAdmin2FA = async (targetUser: User) => {
    setTwoFactorTargetUser(targetUser);
    setTwoFactorModalOpen(true);
    setTwoFactorModalLoading(true);
    setTwoFactorModalError(null);
    try {
      const data = await apiRequest<{ secret: string; qrCode: string; otpauth: string }>(
        `/api/security/users/${targetUser.id}/2fa/setup`,
        { method: 'POST' }
      );
      setTwoFactorData(data);
    } catch (err: any) {
      setTwoFactorModalError(err.message || 'Failed to generate 2FA setup for this user');
    } finally {
      setTwoFactorModalLoading(false);
    }
  };

  const handleResetUser2FA = async (targetUser: User) => {
    if (!window.confirm(`Are you sure you want to reset and disable 2FA for "${targetUser.name}"?`)) return;

    try {
      await apiRequest(`/api/security/users/${targetUser.id}/2fa/reset`, { method: 'POST' });
      alert(`2FA has been disabled for "${targetUser.name}".`);
      loadData();
      if (twoFactorModalOpen && twoFactorTargetUser?.id === targetUser.id) {
        setTwoFactorModalOpen(false);
      }
    } catch (err: any) {
      alert('Failed to reset 2FA: ' + err.message);
    }
  };

  const handleCopyAdminKey = () => {
    if (twoFactorData?.secret) {
      navigator.clipboard.writeText(twoFactorData.secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const canManage = isOwner || isMainAdmin || isPrincipal || canManageUsers;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#6E1231]" />
            <span>Security, Access & User Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-Based Access Control (RBAC), 10-User System Limit, Dual-Campus Access, and Audit Logs
          </p>
        </div>

        {canManage && subTab === 'users' && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl border bg-white text-xs font-semibold flex items-center gap-2">
              <span className="text-slate-500">System Capacity:</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                users.length >= 10 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {users.length} / 10 Users
              </span>
            </div>

            <button
              onClick={openCreateModal}
              disabled={users.length >= 10}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                users.length >= 10
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#6E1231] hover:bg-[#580E27] text-white cursor-pointer'
              }`}
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Provision User (Max 10)</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setSubTab('users')}
          className={`pb-3 px-3 transition-colors flex items-center gap-1.5 ${
            subTab === 'users'
              ? 'text-[#6E1231] border-b-2 border-[#6E1231] font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts ({users.length}/10)</span>
        </button>
        <button
          onClick={() => setSubTab('audit')}
          className={`pb-3 px-3 transition-colors flex items-center gap-1.5 ${
            subTab === 'audit'
              ? 'text-[#6E1231] border-b-2 border-[#6E1231] font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Immutable Audit Log ({auditLogs.length})</span>
        </button>
        <button
          onClick={() => setSubTab('alerts')}
          className={`pb-3 px-3 transition-colors flex items-center gap-1.5 ${
            subTab === 'alerts'
              ? 'text-[#6E1231] border-b-2 border-[#6E1231] font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Security Alert Emails ({alerts.length})</span>
        </button>

        {(isOwner || isMainAdmin) && (
          <button
            onClick={() => setSubTab('activity')}
            className={`pb-3 px-3 transition-colors flex items-center gap-1.5 ${
              subTab === 'activity'
                ? 'text-[#6E1231] border-b-2 border-[#6E1231] font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span className="flex items-center gap-1.5">
              Staff Activity & Changes Tracker
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full uppercase border border-amber-200">Owner Only</span>
            </span>
          </button>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading security and access records...</div>
      ) : (
        <>
          {/* TAB 1: USER ACCOUNTS */}
          {subTab === 'users' && (
            <div className="space-y-4">
              {/* Capacity Banner */}
              <div className="bg-gradient-to-r from-[#6E1231]/5 via-amber-500/5 to-transparent p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#6E1231] text-white flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Configurable User Accounts (10 Slots Available)</h4>
                    <p className="text-slate-500">
                      Standardized hierarchy: <strong>1. Main Admin</strong> (super admin), <strong>2. Principal</strong> (executive head), <strong>3. Admin/HR</strong> (dual-campus access), with <strong>Limited, Full, or Selective</strong> permissions.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-600">Capacity Usage:</span>
                  <div className="w-28 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        users.length >= 10 ? 'bg-rose-600' : 'bg-[#6E1231]'
                      }`}
                      style={{ width: `${Math.min((users.length / 10) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-slate-900">{users.length}/10</span>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">User Details</th>
                        <th className="p-3.5">Assigned Role</th>
                        <th className="p-3.5">Permission Level</th>
                        <th className="p-3.5">Campus Access</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">2FA / QR</th>
                        <th className="p-3.5">Last Login</th>
                        {canManage && <th className="p-3.5 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">No users configured.</td>
                        </tr>
                      ) : (
                        users.map((u) => {
                          const isRoleAdmin = u.role === 'main_admin' || u.role === 'owner';
                          const isRolePrincipal = u.role === 'principal';
                          const isRoleHR = u.role === 'admin_hr';

                          return (
                            <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">{u.name}</div>
                                <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                                {u.phone && <div className="text-[10px] text-slate-400 font-mono">{u.phone}</div>}
                              </td>

                              <td className="p-3.5">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase inline-flex items-center gap-1 ${
                                  isRoleAdmin ? 'bg-rose-100 text-rose-900 border border-rose-200' :
                                  isRolePrincipal ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                                  isRoleHR ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
                                  u.role === 'accountant' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                                  u.role === 'admission_officer' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {isRoleAdmin ? '1. Main Admin' :
                                   isRolePrincipal ? '2. Principal' :
                                   isRoleHR ? '3. Admin / HR' :
                                   u.role.replace('_', ' ')}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${
                                      u.permission_level === 'full' || (!u.permission_level && isRoleAdmin)
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : u.permission_level === 'selective'
                                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {u.permission_level === 'full' || (!u.permission_level && isRoleAdmin) ? 'Full Master' :
                                       u.permission_level === 'selective' ? 'Custom Permissions' :
                                       'Limited View'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    {u.allowed_modules === 'all' || isRoleAdmin ? (
                                      <span className="text-emerald-700 font-semibold">All 14 Modules Enabled</span>
                                    ) : (
                                      <span>
                                        {u.allowed_modules ? u.allowed_modules.split(',').length : 3} Modules Active
                                      </span>
                                    )}
                                  </div>
                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={() => openPermissionsModal(u)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#6E1231]/10 hover:bg-[#6E1231]/20 text-[#6E1231] text-[10px] font-bold transition-all border border-[#6E1231]/20 cursor-pointer shadow-2xs"
                                      title="Select which modules this user can access"
                                    >
                                      <ShieldCheck className="w-3 h-3 text-[#6E1231]" />
                                      <span>Select Permissions</span>
                                    </button>
                                  )}
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  u.campus_access === 'all' || !u.campus_access || isRoleAdmin || isRoleHR
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : u.campus_access === 'lahore'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {u.campus_access === 'all' || !u.campus_access || isRoleAdmin || isRoleHR
                                    ? 'Both Campuses (LHR & OKR)'
                                    : u.campus_access === 'lahore'
                                    ? 'Lahore (DGSL)'
                                    : 'Okara (DGSO)'}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {u.status}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                                  u.two_factor_enabled
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  <Smartphone className="w-3 h-3" />
                                  <span>{u.two_factor_enabled ? '2FA Active' : 'Disabled'}</span>
                                </span>
                              </td>

                              <td className="p-3.5 text-slate-700 text-[11px]">
                                <div className="flex items-center gap-1 font-mono font-medium text-slate-800">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{u.last_login_at ? formatExactDateTime(u.last_login_at) : 'Never logged in'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1">
                                  {u.last_active_at ? (
                                    <>
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                                        (Date.now() - new Date(u.last_active_at).getTime()) < 15 * 60 * 1000
                                          ? 'bg-emerald-500 animate-pulse'
                                          : 'bg-slate-300'
                                      }`} />
                                      <span>Active: <strong className="text-slate-700 font-sans">{formatTimeAgo(u.last_active_at)}</strong></span>
                                    </>
                                  ) : (
                                    <span className="text-slate-400">No session activity</span>
                                  )}
                                  {u.last_login_ip && (
                                    <span className="text-slate-400 font-mono text-[9px] ml-1">({u.last_login_ip})</span>
                                  )}
                                </div>
                              </td>

                              {canManage && (
                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {(isOwner || isMainAdmin) && (
                                      <button
                                        onClick={() => {
                                          const match = activityList.find((a) => a.user.id === u.id);
                                          if (match) {
                                            setSelectedActivity(match);
                                            setActivityModalOpen(true);
                                          } else {
                                            apiRequest<UserActivityDossier[]>('/api/security/users-activity')
                                              .then((res) => {
                                                setActivityList(res);
                                                const found = res.find((a) => a.user.id === u.id);
                                                if (found) setSelectedActivity(found);
                                                setActivityModalOpen(true);
                                              })
                                              .catch(() => alert('Failed to fetch activity dossier'));
                                          }
                                        }}
                                        title="Inspect User Login & Activity Dossier (Owner Only)"
                                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                      >
                                        <Activity className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleOpenAdmin2FA(u)}
                                      title="Generate 2FA QR Code or Setup Key for this user"
                                      className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors cursor-pointer"
                                    >
                                      <QrCode className="w-3.5 h-3.5" />
                                    </button>

                                    {u.two_factor_enabled && (
                                      <button
                                        onClick={() => handleResetUser2FA(u)}
                                        title="Reset / Disable 2FA for this user"
                                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    <button
                                      onClick={() => openPermissionsModal(u)}
                                      title="Select & Manage Module Access Permissions"
                                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#6E1231] transition-colors cursor-pointer"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => openEditModal(u)}
                                      title="Edit User Details & Password"
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    {u.id !== currentUser?.id && (
                                      <>
                                        <button
                                          onClick={() => handleToggleUserStatus(u)}
                                          title={u.status === 'active' ? 'Disable Account' : 'Activate Account'}
                                          className={`p-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                            u.status === 'active'
                                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                          }`}
                                        >
                                          {u.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                        </button>

                                        <button
                                          onClick={() => handleDeleteUser(u)}
                                          title={isOwner || isMainAdmin ? "Delete Account" : "Please contact to admin for deletion of data"}
                                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                            isOwner || isMainAdmin
                                              ? 'bg-red-50 hover:bg-red-100 text-red-600'
                                              : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                                          }`}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {subTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Action</th>
                      <th className="p-3.5">Module</th>
                      <th className="p-3.5">Record ID</th>
                      <th className="p-3.5">Details</th>
                      <th className="p-3.5">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {!Array.isArray(auditLogs) || auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">No audit events recorded yet.</td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60">
                          <td className="p-3.5 text-slate-500 font-sans">{formatDate(log.timestamp || log.created_at)}</td>
                          <td className="p-3.5 font-sans font-bold text-slate-900">{log.user_name || 'System'}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                              log.action.includes('VOID') ? 'bg-amber-100 text-amber-800' :
                              log.action.includes('LOGIN') ? 'bg-sky-100 text-sky-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3.5 uppercase font-bold text-slate-600">{log.module}</td>
                          <td className="p-3.5 text-slate-500">#{log.record_id || '—'}</td>
                          <td className="p-3.5 font-sans text-slate-600 truncate max-w-[280px]">
                            {log.details || 'Action completed'}
                          </td>
                          <td className="p-3.5 text-slate-400">{log.ip_address || log.ip || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY ALERTS */}
          {subTab === 'alerts' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                <strong>Simulated Security Email Dispatcher:</strong> Critical institute alerts (logins, password resets, permanent deletions) are dispatched to the admin alert email (<code>adnanmrao@gmail.com</code>).
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {!Array.isArray(alerts) || alerts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">No dispatched security alert emails.</div>
                  ) : (
                    alerts.map((al) => (
                      <div key={al.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3">
                        <div className="p-2 bg-rose-100 text-[#6E1231] rounded-xl shrink-0 mt-0.5">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{al.subject}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{formatDate(al.sent_at)}</span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">Recipient: {al.recipient}</p>
                          <p className="text-slate-700 mt-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            {al.body}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OWNER-ONLY STAFF LOGIN & ACTIVITY TRACKER */}
          {subTab === 'activity' && (isOwner || isMainAdmin) && (
            <div className="space-y-4">
              {/* Confidentiality Notice Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-[#3a0819] to-slate-900 text-white border border-slate-800 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">Owner Oversight & Staff Activity Tracker</h3>
                        <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold rounded-full">
                          RESTRICTED TO OWNER
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                        Track exactly when each staff member logged in (exact date, hour, minute), their active presence, and an immutable log of every record they created, modified, or updated across both campuses.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadData}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Refresh Live Activity</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Configured Staff</span>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{activityList.length || users.length} Accounts</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Institutes dual-campus staff</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800">Active / Online Now</span>
                    <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                  </div>
                  <div className="text-xl font-bold text-emerald-700 mt-1">
                    {activityList.filter(a => a.is_online).length} Staff Online
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">Active in last 15 minutes</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">System Changes Logged</span>
                    <History className="w-4 h-4 text-[#6E1231]" />
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {auditLogs.length} Actions
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Students, vouchers, expenses</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800">Data Deletion Protection</span>
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-sm font-bold text-amber-900 mt-1">Strict Staff Restriction</div>
                  <div className="text-[11px] text-amber-700 mt-0.5">Non-owners see admin contact message</div>
                </div>
              </div>

              {/* Search filter */}
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <Search className="w-4 h-4 text-slate-400 ml-1" />
                <input
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Filter staff by name, email, or role..."
                  className="w-full text-xs bg-transparent border-none outline-hidden text-slate-700 placeholder:text-slate-400"
                />
                {activitySearch && (
                  <button
                    onClick={() => setActivitySearch('')}
                    className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-0.5 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Activity Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activityList
                  .filter(item => {
                    if (!activitySearch) return true;
                    const q = activitySearch.toLowerCase();
                    return (
                      item.user.name.toLowerCase().includes(q) ||
                      item.user.email.toLowerCase().includes(q) ||
                      item.user.role.toLowerCase().includes(q)
                    );
                  })
                  .map((item) => (
                    <div
                      key={item.user.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-[#6E1231]/40 transition-all p-4.5 flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: User Info & Status */}
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">{item.user.name}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                item.user.role === 'main_admin' || item.user.role === 'owner'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : item.user.role === 'principal'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : item.user.role === 'admin_hr'
                                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {item.user.role.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{item.user.email}</p>
                            {item.user.phone && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.user.phone}</p>}
                          </div>

                          <div className="text-right">
                            {item.is_online ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Online Now
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Offline
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Login & Activity Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs">
                          {/* Last Login Box (Kitnay bajay login kia) */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] mb-1">
                              <Clock className="w-3.5 h-3.5 text-[#6E1231]" />
                              <span>Last Login Timestamp:</span>
                            </div>
                            <div className="font-mono font-bold text-slate-900 text-xs">
                              {formatExactDateTime(item.last_login_at)}
                            </div>
                            {item.last_login_ip && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                <span>IP: {item.last_login_ip}</span>
                              </div>
                            )}
                          </div>

                          {/* Last Active Box (Last active kab tha) */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] mb-1">
                              <Activity className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Last Active Presence:</span>
                            </div>
                            <div className="font-sans font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              {item.is_online ? (
                                <span className="text-emerald-700 font-bold">Active in current session</span>
                              ) : (
                                <span>{formatTimeAgo(item.last_active_at)}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {item.active_sessions_count} concurrent active session(s)
                            </div>
                          </div>
                        </div>

                        {/* Changes Preview (Kia changes ki) */}
                        <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                              <History className="w-3.5 h-3.5 text-[#6E1231]" />
                              <span>Recent Changes Recorded:</span>
                            </div>
                            <span className="px-2 py-0.5 bg-[#6E1231]/10 text-[#6E1231] font-mono font-bold text-[10px] rounded-full">
                              {item.total_changes_count} Total Actions
                            </span>
                          </div>

                          {item.recent_changes && item.recent_changes.length > 0 ? (
                            <div className="space-y-1.5">
                              {item.recent_changes.slice(0, 2).map((ch) => (
                                <div key={ch.id} className="p-2 rounded bg-white border border-slate-200 text-[11px]">
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                                    <span className="font-bold uppercase text-[#6E1231]">{ch.module}</span>
                                    <span className="font-mono">{formatTimeAgo(ch.created_at || (ch as any).timestamp)}</span>
                                  </div>
                                  <p className="text-slate-800 font-medium truncate">{ch.details || `${ch.action} record #${ch.record_id}`}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No record changes logged yet.</p>
                          )}
                        </div>
                      </div>

                      {/* Footer Action */}
                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Owner Access Only</span>
                        <button
                          onClick={() => {
                            setSelectedActivity(item);
                            setActivityModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#6E1231] hover:bg-[#580E27] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>Inspect Activity Dossier</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Provision / Edit Staff Modal */}
      {userModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setUserModalOpen(false)}
          title={isEditing ? `Edit User: ${editingUser.name}` : "Provision DigiSkool Staff Account (Max 10)"}
          subtitle="Configure Role (Main Admin, Principal, Admin/HR), Permissions, and Dual-Campus Access"
          maxWidth="md"
        >
          <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={editingUser.name || ''}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                placeholder="e.g. Adnan Rao"
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  placeholder="admin@digiskool.pk"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Role *</label>
              <select
                value={editingUser.role || 'main_admin'}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white font-medium"
              >
                <option value="main_admin">1. Main Admin (Full Control, Security, Users & All Campuses)</option>
                <option value="principal">2. Principal (Executive Head, Academic & Full Campus View)</option>
                <option value="admin_hr">3. Admin / HR (Operations, HR, Both Campuses Access)</option>
                <option value="accountant">Senior Accountant (Fees, Vouchers, Financial Reports)</option>
                <option value="admission_officer">Admission Officer (Enquiries, Registrations, Students)</option>
                <option value="teacher">Instructor / Teacher (Attendance, Courses)</option>
              </select>
            </div>

            {/* Permission Level Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Permission Level *</label>
                <select
                  value={editingUser.permission_level || 'limited'}
                  onChange={(e) => setEditingUser({ ...editingUser, permission_level: e.target.value as PermissionLevel })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                >
                  <option value="full">Full Access</option>
                  <option value="limited">Limited Permission</option>
                  <option value="selective">Selective Permission</option>
                </select>
              </div>

              {/* Campus Access Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campus Access *</label>
                <select
                  value={
                    (editingUser.role === 'main_admin' || editingUser.role === 'admin_hr')
                      ? 'all'
                      : (editingUser.campus_access || 'all')
                  }
                  disabled={editingUser.role === 'main_admin' || editingUser.role === 'admin_hr'}
                  onChange={(e) => setEditingUser({ ...editingUser, campus_access: e.target.value as CampusAccess })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="all">Both Campuses (Lahore & Okara)</option>
                  <option value="lahore">Lahore Campus Only (DGSL)</option>
                  <option value="okara">Okara Campus Only (DGSO)</option>
                </select>
                {(editingUser.role === 'main_admin' || editingUser.role === 'admin_hr') && (
                  <p className="text-[10px] text-emerald-700 mt-0.5">Dual-campus access automatically enabled for Admin & Admin/HR</p>
                )}
              </div>
            </div>

            {/* Granular Module Access Selection (Kis kis cheez ki access deni hai) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-bold text-slate-900 text-xs">
                    Module & Section Permissions (Access Control) *
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Select exactly which features this staff member is allowed to see and manage.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser({ ...editingUser, allowed_modules: 'all', permission_level: 'full' })}
                    className="text-[10px] text-[#6E1231] font-bold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setEditingUser({ ...editingUser, allowed_modules: 'dashboard', permission_level: 'limited' })}
                    className="text-[10px] text-slate-500 font-bold hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {ALL_MODULES.map((mod) => {
                  const isChecked = 
                    editingUser.allowed_modules === 'all' || 
                    (editingUser.allowed_modules?.split(',').map(m => m.trim().toLowerCase()) || []).includes(mod.id.toLowerCase());

                  const toggleModule = () => {
                    let currentList = editingUser.allowed_modules === 'all'
                      ? ALL_MODULES.map(m => m.id)
                      : (editingUser.allowed_modules?.split(',').map(m => m.trim()) || []);

                    if (isChecked) {
                      currentList = currentList.filter(id => id.toLowerCase() !== mod.id.toLowerCase());
                    } else {
                      currentList = [...currentList, mod.id];
                    }

                    const newAllowed = currentList.length === ALL_MODULES.length ? 'all' : currentList.join(',');
                    setEditingUser({
                      ...editingUser,
                      allowed_modules: newAllowed,
                      permission_level: newAllowed === 'all' ? 'full' : currentList.length > 3 ? 'selective' : 'limited'
                    });
                  };

                  return (
                    <label
                      key={mod.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-rose-50/60 border-[#6E1231]/30 text-slate-900 shadow-2xs' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={toggleModule}
                        className="mt-0.5 rounded border-slate-300 text-[#6E1231] focus:ring-[#6E1231]"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[11px] block leading-tight text-slate-800">
                          {mod.label}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate leading-tight mt-0.5">
                          {mod.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isEditing ? 'New Password (leave blank to keep current)' : 'Account Password *'}
              </label>
              <input
                type="password"
                required={!isEditing}
                value={editingUser.password || ''}
                onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                placeholder={isEditing ? 'Enter only to change password' : '••••••••'}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingUser}
                className="px-4 py-2 font-bold bg-[#6E1231] hover:bg-[#580E27] text-white rounded-lg transition-all cursor-pointer"
              >
                {submittingUser ? 'Saving...' : isEditing ? 'Update User' : 'Provision User Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DEDICATED PERMISSIONS & ACCESS CONTROL MODAL */}
      {permissionModalOpen && permissionTargetUser && (
        <Modal
          isOpen={true}
          onClose={() => setPermissionModalOpen(false)}
          title={`User Access Permissions – ${permissionTargetUser.name}`}
          subtitle={`Select which modules, sections, and features ${permissionTargetUser.name} (${permissionTargetUser.email}) is allowed to access.`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* User Info Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6E1231]/10 text-[#6E1231] flex items-center justify-center font-bold text-sm border border-[#6E1231]/20">
                  {permissionTargetUser.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{permissionTargetUser.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{permissionTargetUser.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-rose-100 text-[#6E1231] border border-rose-200">
                  Role: {permissionTargetUser.role?.replace("_", " ")}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  permissionTargetUser.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}>
                  {permissionTargetUser.status}
                </span>
              </div>
            </div>

            {permissionSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{permissionSuccessMsg}</span>
              </div>
            )}

            {/* Role Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs">Quick Role-Based Presets:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("all")}
                    className="text-[11px] font-bold text-[#6E1231] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => applyPreset("clear")}
                    className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset("admin")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  👑 Main Admin (All 14 Modules)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("principal")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  🎓 Principal (Academics & Operations)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("accountant")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  💰 Accountant (Fees, Vouchers, Ledger)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("admission")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer"
                >
                  📝 Admissions Desk (Students & Enquiries)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("teacher")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  🧑‍🏫 Teacher (Courses & Attendance)
                </button>
              </div>
            </div>

            {/* Campus Access Control & Permission Classification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Campus Access Boundary *</label>
                <select
                  value={permissionCampusAccess}
                  onChange={(e) => setPermissionCampusAccess(e.target.value as CampusAccess)}
                  className="w-full px-3 py-1.5 border rounded-lg border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-[#6E1231]"
                >
                  <option value="all">Both Campuses (Lahore & Okara)</option>
                  <option value="lahore">Lahore Campus Only (DGSL)</option>
                  <option value="okara">Okara Campus Only (DGSO)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Restrict data and operations to a specific branch.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Permission Classification *</label>
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value as PermissionLevel)}
                  className="w-full px-3 py-1.5 border rounded-lg border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-[#6E1231]"
                >
                  <option value="full">Full Control (Create, Edit & Delete)</option>
                  <option value="selective">Selective Permissions (Selected Modules Only)</option>
                  <option value="limited">Limited View (Restricted Access)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Controls general privilege classification.</p>
              </div>
            </div>

            {/* Granular Module Checkboxes Grouped by Category */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Accessible Modules & Features (Kis kis cheez ki access deni hai)</h4>
                  <p className="text-[11px] text-slate-500">Tick the exact modules this user is authorized to open and use:</p>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {permissionAllowedModules.length} of {ALL_MODULES.length} Selected
                </span>
              </div>

              {["Academic Desk", "Finance & Accounts", "Administration & Security"].map((category) => {
                const categoryModules = ALL_MODULES.filter((m) => m.category === category);
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6E1231]" />
                      <span>{category}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categoryModules.map((mod) => {
                        const isChecked = permissionAllowedModules.includes(mod.id.toLowerCase());
                        const toggleMod = () => {
                          if (isChecked) {
                            setPermissionAllowedModules(permissionAllowedModules.filter((m) => m.toLowerCase() !== mod.id.toLowerCase()));
                          } else {
                            setPermissionAllowedModules([...permissionAllowedModules, mod.id.toLowerCase()]);
                          }
                        };

                        return (
                          <label
                            key={mod.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? "bg-rose-50/70 border-[#6E1231]/40 text-slate-900 shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={toggleMod}
                              className="mt-0.5 rounded border-slate-300 text-[#6E1231] focus:ring-[#6E1231]"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-xs block text-slate-900 leading-tight">
                                {mod.label}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                                {mod.desc}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">
                Changes apply instantly across Cloud SQL & Application Portal.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPermissionModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={savingPermissions}
                  className="px-5 py-2 font-bold bg-[#6E1231] hover:bg-[#580E27] text-white rounded-lg transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{savingPermissions ? "Saving..." : "Save & Apply Permissions"}</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ADMIN 2FA QR CODE & SETUP MODAL */}
      {twoFactorModalOpen && twoFactorTargetUser && (
        <Modal
          isOpen={twoFactorModalOpen}
          onClose={() => setTwoFactorModalOpen(false)}
          title={`Two-Factor Authentication (2FA) – ${twoFactorTargetUser.name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900">
              <div className="font-bold flex items-center gap-1.5 mb-0.5">
                <Smartphone className="w-4 h-4 text-purple-700" />
                <span>Authenticator QR Code & Setup Secret</span>
              </div>
              <p className="text-[11px] text-purple-800">
                Allow {twoFactorTargetUser.name} ({twoFactorTargetUser.email}) to scan this QR code using Google Authenticator, Microsoft Authenticator, or Authy on their phone.
              </p>
            </div>

            {twoFactorModalLoading ? (
              <div className="py-12 text-center text-slate-500">
                <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-xs">Generating 2FA QR Code & Security Key...</p>
              </div>
            ) : twoFactorModalError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
                <p className="font-bold">Error</p>
                <p>{twoFactorModalError}</p>
              </div>
            ) : twoFactorData ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
                    <img
                      src={twoFactorData.qrCode}
                      alt="User 2FA QR Code"
                      className="w-40 h-40 rounded-lg"
                    />
                  </div>

                  <div className="space-y-3 text-slate-700 flex-1">
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">
                        Manual Entry Secret Key:
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 text-xs font-bold tracking-wider select-all">
                          {twoFactorData.secret}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyAdminKey}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1">
                      <p>• Account Name: <strong>{twoFactorTargetUser.email}</strong></p>
                      <p>• System: <strong>DigiSkool</strong></p>
                      <p>• Type: Time-Based OTP (6-digit, 30-sec refresh)</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  {twoFactorTargetUser.two_factor_enabled ? (
                    <button
                      type="button"
                      onClick={() => handleResetUser2FA(twoFactorTargetUser)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Disable / Reset User's 2FA</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      User has not completed verification yet.
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setTwoFactorModalOpen(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* OWNER-ONLY USER ACTIVITY & CHANGES DOSSIER MODAL */}
      {activityModalOpen && selectedActivity && (
        <Modal
          isOpen={true}
          onClose={() => {
            setActivityModalOpen(false);
            setSelectedActivity(null);
          }}
          title={`Staff Activity & Changes Dossier: ${selectedActivity.user.name}`}
          subtitle={`Strict Owner Oversight — Role: ${selectedActivity.user.role.toUpperCase()} | Email: ${selectedActivity.user.email}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Overview Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">Status:</span>
                <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                  selectedActivity.is_online ? 'text-emerald-700' : 'text-slate-600'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${selectedActivity.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {selectedActivity.is_online ? 'Online Now' : 'Offline'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">Last Login Time:</span>
                <span className="font-mono font-bold text-slate-800 text-[11px] block">
                  {formatExactDateTime(selectedActivity.last_login_at)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">Last Active Presence:</span>
                <span className="font-bold text-slate-800 text-xs block">
                  {formatTimeAgo(selectedActivity.last_active_at)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block">Total Changes Logged:</span>
                <span className="font-mono font-bold text-[#6E1231] text-xs block">
                  {selectedActivity.total_changes_count} Actions
                </span>
              </div>
            </div>

            {/* Dossier Tabs */}
            <div className="flex border-b border-slate-200 gap-2 font-semibold">
              <button
                onClick={() => setActiveDossierTab('changes')}
                className={`pb-2 px-3 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeDossierTab === 'changes'
                    ? 'text-[#6E1231] border-b-2 border-[#6E1231] font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Modifications Log ({selectedActivity.recent_changes.length})</span>
              </button>
              <button
                onClick={() => setActiveDossierTab('logins')}
                className={`pb-2 px-3 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeDossierTab === 'logins'
                    ? 'text-[#6E1231] border-b-2 border-[#6E1231] font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Login History & Sessions ({selectedActivity.recent_logins.length})</span>
              </button>
            </div>

            {/* Tab 1: Changes Made (Kia changes ki) */}
            {activeDossierTab === 'changes' && (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500">
                  Comprehensive audit trail of all actions performed by <strong>{selectedActivity.user.name}</strong>:
                </div>
                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {selectedActivity.recent_changes.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic">No modifications or changes logged for this user.</div>
                  ) : (
                    selectedActivity.recent_changes.map((log) => (
                      <div key={log.id} className="p-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                              log.action.includes('VOID') ? 'bg-amber-100 text-amber-800' :
                              log.action.includes('CREATE') ? 'bg-emerald-100 text-emerald-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {log.action}
                            </span>
                            <span className="font-bold text-slate-800 uppercase text-[11px]">{log.module} #{log.record_id || '—'}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {formatExactDateTime(log.created_at || (log as any).timestamp)}
                          </div>
                        </div>

                        <p className="text-slate-700 text-xs mt-1 leading-relaxed">{log.details}</p>

                        {(log.old_values || log.new_values) && (
                          <div className="mt-2 p-2 bg-slate-100/80 rounded-lg text-[11px] font-mono grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {log.old_values && (
                              <div>
                                <span className="text-slate-400 block font-sans text-[10px]">Previous Value:</span>
                                <span className="text-slate-600 break-all">{typeof log.old_values === 'object' ? JSON.stringify(log.old_values) : String(log.old_values)}</span>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <span className="text-emerald-600 block font-sans text-[10px]">Updated Value:</span>
                                <span className="text-emerald-800 break-all font-semibold">{typeof log.new_values === 'object' ? JSON.stringify(log.new_values) : String(log.new_values)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {log.ip && (
                          <div className="mt-1.5 text-[10px] font-mono text-slate-400">
                            Logged from IP: {log.ip}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Login History (Kitnay bajay login kia) */}
            {activeDossierTab === 'logins' && (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500">
                  Exact login records, timestamps, IP addresses, and browsers for <strong>{selectedActivity.user.name}</strong>:
                </div>
                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 font-mono text-xs">
                  {selectedActivity.recent_logins.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic font-sans">No login records found.</div>
                  ) : (
                    selectedActivity.recent_logins.map((lg) => (
                      <div key={lg.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold font-sans text-slate-800 text-xs">
                              {formatExactDateTime(lg.created_at)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              IP: {lg.ip || '—'} • {lg.browser || 'Browser'} on {lg.device || 'Desktop'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            lg.status === 'success' || lg.status === 'success_2fa' || lg.status === 'demo_switch'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {lg.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActivityModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
