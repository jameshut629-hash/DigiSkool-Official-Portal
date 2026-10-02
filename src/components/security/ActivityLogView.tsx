import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Clock,
  Shield,
  ShieldAlert,
  Search,
  RefreshCw,
  Download,
  Laptop,
  CheckCircle2,
  Calendar,
  Eye,
  Filter,
  Users,
  Database,
  Wifi,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  fetchLoginActivityFromFirestore,
  fetchUserSummariesFromFirestore,
  storeUserLoginInFirestore,
  StoredLoginActivity,
  StoredUserSummary
} from '../../lib/firebase.ts';
import { apiRequest, formatDateTime } from '../../lib/api.ts';
import { Modal } from '../common/Modal.tsx';

export const ActivityLogView: React.FC = () => {
  const { user, isOwner } = useAuth();

  const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [firestoreLogs, setFirestoreLogs] = useState<StoredLoginActivity[]>([]);
  const [userSummaries, setUserSummaries] = useState<StoredUserSummary[]>([]);
  const [sqliteUsers, setSqliteUsers] = useState<any[]>([]);
  const [selectedUserHistory, setSelectedUserHistory] = useState<StoredLoginActivity[] | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  // Exact timestamp formatter in Pakistani Time (PKT)
  const formatExactTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Never recorded';
    return formatDateTime(dateStr, true);
  };

  // Human-readable relative time
  const formatRelativeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'No activity';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 45) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch from Firestore
      const [logs, summaries] = await Promise.all([
        fetchLoginActivityFromFirestore(150).catch(err => {
          console.warn('Firestore logs fetch notice:', err.message);
          return [] as StoredLoginActivity[];
        }),
        fetchUserSummariesFromFirestore().catch(err => {
          console.warn('Firestore summaries fetch notice:', err.message);
          return [] as StoredUserSummary[];
        })
      ]);

      setFirestoreLogs(logs);
      setUserSummaries(summaries);

      // 2. Cross-reference with database users for full directory coverage
      try {
        const dbActivity = await apiRequest<any[]>('/api/security/users-activity');
        if (Array.isArray(dbActivity)) {
          setSqliteUsers(dbActivity);
        }
      } catch (err) {
        // Non-fatal, keep Firestore data
      }
    } catch (err: any) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadData();
    }
  }, [isOwner]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Test trigger: write a test login timestamp record directly to Firestore
  const handleTestRecordLogin = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      await storeUserLoginInFirestore({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        role: user.role,
        loginTimestamp: new Date().toISOString(),
        action: 'VERIFIED_CHECK_IN',
        details: `Manual test login timestamp verification executed by ${user.name}`
      });
      setNotification('New login timestamp successfully written to Google Cloud Firestore!');
      setTimeout(() => setNotification(null), 4000);
      await loadData();
    } catch (err: any) {
      alert('Error writing to Firestore: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Merged User Summaries (combining Firestore summaries with registered SQLite users)
  const combinedUserSummaries = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      name: string;
      email: string;
      role: string;
      lastLoginAt: string | null;
      lastActiveAt: string | null;
      ip: string;
      device: string;
      totalLogins: number;
    }>();

    // Fill from SQLite users
    sqliteUsers.forEach(sq => {
      const key = sq.user.email.toLowerCase();
      map.set(key, {
        userId: String(sq.user.id),
        name: sq.user.name,
        email: sq.user.email,
        role: sq.user.role,
        lastLoginAt: sq.last_login_at || null,
        lastActiveAt: sq.last_active_at || null,
        ip: sq.last_ip || '127.0.0.1',
        device: 'Desktop',
        totalLogins: sq.recent_logins?.length || 1
      });
    });

    // Merge / override with live Firestore summaries
    userSummaries.forEach(fs => {
      const key = fs.userEmail.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.lastLoginAt = fs.lastLoginAt || existing.lastLoginAt;
        existing.lastActiveAt = fs.lastActiveAt || existing.lastActiveAt;
        existing.ip = fs.lastIp || existing.ip;
        existing.device = fs.lastDevice || existing.device;
        existing.totalLogins = Math.max(existing.totalLogins, fs.totalLogins || 1);
      } else {
        map.set(key, {
          userId: fs.userId,
          name: fs.userName || fs.userEmail.split('@')[0],
          email: fs.userEmail,
          role: fs.role || 'staff',
          lastLoginAt: fs.lastLoginAt,
          lastActiveAt: fs.lastActiveAt,
          ip: fs.lastIp || '127.0.0.1',
          device: fs.lastDevice || 'Desktop',
          totalLogins: fs.totalLogins || 1
        });
      }
    });

    // Also scan recent Firestore logs to ensure all users are reflected
    firestoreLogs.forEach(lg => {
      const key = lg.userEmail.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          userId: lg.userId,
          name: lg.userName,
          email: lg.userEmail,
          role: lg.role,
          lastLoginAt: lg.loginTimestamp,
          lastActiveAt: lg.loginTimestamp,
          ip: lg.ip,
          device: lg.device,
          totalLogins: 1
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const timeB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [sqliteUsers, userSummaries, firestoreLogs]);

  // Filtered Summaries
  const filteredSummaries = useMemo(() => {
    return combinedUserSummaries.filter(u => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role.toLowerCase() === roleFilter.toLowerCase();
      return matchSearch && matchRole;
    });
  }, [combinedUserSummaries, searchQuery, roleFilter]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return firestoreLogs.filter(lg => {
      const matchSearch =
        lg.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lg.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lg.action.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'all' || lg.role.toLowerCase() === roleFilter.toLowerCase();
      return matchSearch && matchRole;
    });
  }, [firestoreLogs, searchQuery, roleFilter]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Log ID', 'User Name', 'Email', 'Role', 'Login Timestamp', 'IP Address', 'Browser', 'Device', 'Action'];
    const rows = filteredHistory.map(l => [
      `"${l.id}"`,
      `"${l.userName}"`,
      `"${l.userEmail}"`,
      `"${l.role}"`,
      `"${formatExactTime(l.loginTimestamp)}"`,
      `"${l.ip}"`,
      `"${l.browser}"`,
      `"${l.device}"`,
      `"${l.action}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `digiskool_activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // View specific user history in modal
  const handleViewUserHistory = (userEmail: string, userName: string) => {
    const userLogs = firestoreLogs.filter(
      l => l.userEmail.toLowerCase() === userEmail.toLowerCase()
    );
    setSelectedUserHistory(userLogs);
    setSelectedUserName(userName);
  };

  // RESTRICT ACCESS TO OWNER ONLY
  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Access Restricted — Owner Role Required
          </h2>
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            Please contact to admin for deletion of data or elevated oversight access.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            The Activity Log and Firestore Login Timestamps view is strictly reserved for the Institute Owner and Main Administrator (Adnan Rao). Your current role (<strong>{user?.role?.toUpperCase()}</strong>) does not have permission to view institutional staff presence logs.
          </p>
        </div>
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            Logged in as: {user?.email}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-emerald-900/90 text-white border border-emerald-500 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{notification}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#6E1231] text-white shadow-md">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Activity Log & Presence Monitor
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Owner Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time user login timestamps and activity history stored in secure institutional database
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTestRecordLogin}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Trigger a test login timestamp record"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Record Test Timestamp</span>
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Refresh logs from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#6E1231]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredHistory.length === 0}
            className="px-3.5 py-2 rounded-xl bg-[#6E1231] hover:bg-[#520d24] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Database Engine & Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Firebase Firestore Cloud Connected Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Cloud Database</span>
            <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Firebase Firestore Live
            </span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate max-w-[160px]" title="Database: ai-studio-digiskoolinstitu-00b0de94-6a61-4628-b6fc-bcee9f03f072">
              ai-studio-digiskool...
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* Total Logins Stored */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Total Logins Recorded</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5 block font-mono">
              {firestoreLogs.length > 0 ? firestoreLogs.length : combinedUserSummaries.reduce((acc, u) => acc + u.totalLogins, 0)}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Synchronized with Firebase
            </span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Monitored Staff Users */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Monitored Staff Accounts</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5 block font-mono">
              {combinedUserSummaries.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Across Lahore & Okara
            </span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Most Recent Login */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Latest Login Event</span>
            <span className="text-xs font-black text-slate-800 dark:text-white mt-0.5 block truncate max-w-[170px]">
              {firestoreLogs[0]?.userName || combinedUserSummaries[0]?.name || 'Adnan Rao'}
            </span>
            <span className="text-[10px] font-mono text-[#6E1231] dark:text-rose-400 font-bold block mt-0.5">
              {formatRelativeTime(firestoreLogs[0]?.loginTimestamp || combinedUserSummaries[0]?.lastLoginAt)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#6E1231] dark:text-rose-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'summary'
                ? 'bg-[#6E1231] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Last Login ({combinedUserSummaries.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#6E1231] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>All Login Events ({firestoreLogs.length})</span>
          </button>
        </div>

        {/* Search & Role Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search user, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#6E1231] w-48 sm:w-56"
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="main_admin">Main Admin</option>
            <option value="principal">Principal</option>
            <option value="admin_hr">Admin / HR</option>
            <option value="teacher">Faculty / Instructor</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-[#6E1231] mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Querying Google Cloud Firestore database...
          </p>
        </div>
      ) : activeTab === 'summary' ? (
        /* TAB 1: STAFF LAST LOGIN SUMMARY */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Staff Last Login Directory
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Every user's exact last login timestamp, relative presence, and client IP recorded in Firestore
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono font-medium">
              Showing {filteredSummaries.length} staff
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Last Login Time</th>
                  <th className="py-3 px-4">Last Active Presence</th>
                  <th className="py-3 px-4">Last Client Network</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No staff records matched the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((staff, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-[#6E1231] dark:text-rose-400 font-black text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                              {staff.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {staff.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          staff.role === 'main_admin'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : staff.role === 'principal'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                            : staff.role === 'admin_hr'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : staff.role === 'teacher'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {staff.role}
                        </span>
                      </td>

                      {/* EXACT LAST LOGIN TIME */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {formatExactTime(staff.lastLoginAt)}
                        </div>
                        {staff.lastLoginAt && (
                          <div className="text-[10px] text-[#6E1231] dark:text-rose-400 font-bold font-sans mt-0.5">
                            {formatRelativeTime(staff.lastLoginAt)}
                          </div>
                        )}
                      </td>

                      {/* LAST ACTIVE PRESENCE */}
                      <td className="py-3.5 px-4">
                        {staff.lastActiveAt ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {formatRelativeTime(staff.lastActiveAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No presence logged</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <div>IP: {staff.ip || '127.0.0.1'}</div>
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">{staff.device}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleViewUserHistory(staff.email, staff.name)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#6E1231] hover:text-white dark:bg-slate-800 dark:hover:bg-[#6E1231] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>History</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: CHRONOLOGICAL ACTIVITY & LOGIN HISTORY */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Chronological Activity & Login History
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Every recorded authentication timestamp, IP address, and browser event fetched from Firestore
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono font-medium">
              Showing {filteredHistory.length} events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Event Timestamp</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Action & Details</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Browser / Device</th>
                  <th className="py-3 px-4 text-right">Data Store</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic font-sans">
                      No activity logs found in Firestore. Click "Record Test Timestamp" to create the first record.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* EXACT TIMESTAMP */}
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs">
                        <div>{formatExactTime(item.loginTimestamp)}</div>
                        <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                          {formatRelativeTime(item.loginTimestamp)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {item.userName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.userEmail}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {item.action || 'USER_LOGIN'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                          {item.details}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {item.ip}
                      </td>

                      <td className="py-3.5 px-4 font-sans text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{item.browser || 'Web Browser'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {item.device || 'Desktop'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-sans">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Database className="w-2.5 h-2.5" />
                          Firestore Live
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Login Timeline Deep-Dive Modal */}
      {selectedUserHistory && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUserHistory(null)}
          title={`Login History: ${selectedUserName}`}
          subtitle="Detailed chronological login timestamps recorded in institutional database"
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300 font-semibold">
                Total Recorded Login Sessions:
              </span>
              <span className="font-mono font-bold text-[#6E1231] dark:text-rose-400 text-sm">
                {selectedUserHistory.length} Sessions
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
              {selectedUserHistory.length === 0 ? (
                <div className="p-6 text-center text-slate-400 italic">
                  No individual login documents found in Firestore for this user.
                </div>
              ) : (
                selectedUserHistory.map((item, idx) => (
                  <div key={idx} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {formatExactTime(item.loginTimestamp)}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                        {item.action}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                      IP: {item.ip} • Browser: {item.browser} • Device: {item.device}
                    </div>
                    {item.details && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        {item.details}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedUserHistory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
