import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Bell,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sun,
  Moon,
  Camera,
  Building2,
  ChevronDown,
  MapPin,
  Phone,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useCampus, CAMPUS_DETAILS } from '../../context/CampusContext.tsx';
import { apiRequest, formatTime } from '../../lib/api.ts';
import { DigiSkoolLogo } from '../common/DigiSkoolLogo.tsx';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigate: (tab: string) => void;
  onOpenScanner?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate, onOpenScanner }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { selectedCampus, setSelectedCampus, campusInfo } = useCampus();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Live Pakistan Standard Time (PKT, UTC+5)
  const [liveTimePKT, setLiveTimePKT] = useState<string>(() =>
    new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  );

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setLiveTimePKT(
        new Date().toLocaleTimeString('en-US', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      );
    }, 10000);
    return () => clearInterval(clockTimer);
  }, []);

  const notifMenuRef = useRef<HTMLDivElement>(null);
  const campusMenuRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const loadNotifications = async () => {
    try {
      const res = await apiRequest<{ notifications: any[]; unreadCount: number }>('/api/notifications');
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Search logic
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiRequest<{ results: any[] }>(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (campusMenuRef.current && !campusMenuRef.current.contains(e.target as Node)) {
        setCampusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      setUnreadCount(0);
      loadNotifications();
    } catch {
      // ignore
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left side: hamburger + brand on mobile + search trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl lg:hidden"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile brand logo */}
        <div className="lg:hidden flex items-center shrink-0 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <DigiSkoolLogo variant="horizontal" size="xs" />
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl text-xs font-medium w-44 sm:w-64 border border-slate-200 transition-colors"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Search students, vouchers...</span>
            <kbd className="hidden sm:inline-block ml-auto text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 font-mono">
              /
            </kbd>
          </button>
        </div>
      </div>

      {/* Right side: Global Campus Selector + User Profile Badge + Security Audit Badge + Notifications */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* GLOBAL CAMPUS SELECTOR */}
        <div className="relative" ref={campusMenuRef}>
          <button
            onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
            title="Switch Active Campus Scope (Lahore / Okara / Combined)"
            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-2xs ${
              selectedCampus === 'lahore'
                ? 'bg-rose-50/80 border-rose-200 text-[#6E1231] hover:bg-rose-100'
                : selectedCampus === 'okara'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Building2 className={`w-3.5 h-3.5 shrink-0 ${
                selectedCampus === 'lahore' ? 'text-[#6E1231]' : selectedCampus === 'okara' ? 'text-emerald-700' : 'text-slate-600'
              }`} />
              <div className="text-left flex items-center gap-1.5">
                <span className="hidden sm:inline font-bold">
                  {selectedCampus === 'lahore' ? 'Lahore' : selectedCampus === 'okara' ? 'Okara' : 'All Campuses'}
                </span>
                <span className="sm:hidden font-bold">
                  {selectedCampus === 'lahore' ? 'DGSL' : selectedCampus === 'okara' ? 'DGSO' : 'All'}
                </span>
                <span className={`px-1.5 py-0.2 text-[9px] font-black uppercase rounded-md tracking-wider ${
                  selectedCampus === 'lahore'
                    ? 'bg-[#6E1231] text-white'
                    : selectedCampus === 'okara'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-700'
                }`}>
                  {selectedCampus === 'lahore' ? 'DGSL' : selectedCampus === 'okara' ? 'DGSO' : 'Both'}
                </span>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${campusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Campus Selector Dropdown Menu */}
          {campusDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs font-display flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#6E1231]" />
                    <span>Global Campus Scope</span>
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Filters dashboard charts, student rosters & financial reports
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 mt-2">
                {/* Option 1: All Campuses */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCampus('all');
                    setCampusDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedCampus === 'all'
                      ? 'bg-slate-100/90 border-slate-300 text-slate-900 shadow-2xs font-bold'
                      : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">All Campuses (Combined)</span>
                        <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[9px] font-bold">Both</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Aggregated multi-campus metrics & reports</p>
                    </div>
                  </div>
                  {selectedCampus === 'all' && (
                    <CheckCircle2 className="w-4 h-4 text-slate-800 shrink-0" />
                  )}
                </button>

                {/* Option 2: Lahore Campus */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCampus('lahore');
                    setCampusDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedCampus === 'lahore'
                      ? 'bg-rose-50/90 border-rose-300 text-[#6E1231] shadow-2xs font-bold'
                      : 'bg-white border-transparent hover:bg-rose-50/50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-[#6E1231]">DGSL</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Lahore Campus</span>
                        <span className="px-1.5 py-0.2 bg-rose-100 text-[#6E1231] rounded text-[9px] font-black">DGSL</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                        <span>First Floor 12-C, Commercial Market, NFC Society Lahore</span>
                      </p>
                      <p className="text-[9px] text-[#6E1231] font-medium flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5 shrink-0" />
                        <span>+92 331-715-5174</span>
                      </p>
                    </div>
                  </div>
                  {selectedCampus === 'lahore' && (
                    <CheckCircle2 className="w-4 h-4 text-[#6E1231] shrink-0" />
                  )}
                </button>

                {/* Option 3: Okara Campus */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCampus('okara');
                    setCampusDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedCampus === 'okara'
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-2xs font-bold'
                      : 'bg-white border-transparent hover:bg-emerald-50/50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-emerald-800">DGSO</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Okara Office</span>
                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black">DGSO</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                        <span>185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara</span>
                      </p>
                      <p className="text-[9px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5 shrink-0" />
                        <span>+92 310-436-7347</span>
                      </p>
                    </div>
                  </div>
                  {selectedCampus === 'okara' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Strict Data Integrity Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Audit Log Enforced</span>
        </div>

        {/* Live Pakistan Standard Time (PKT) Indicator */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold font-mono"
          title="Institutional Operating Time: Pakistan Standard Time (Asia/Karachi, UTC+5)"
        >
          <Clock className="w-3.5 h-3.5 text-[#6E1231]" />
          <span>{liveTimePKT}</span>
          <span className="text-[9px] px-1 py-0.2 bg-rose-100 text-[#6E1231] font-bold rounded">PKT</span>
        </div>

        {/* Active Logged In User Badge */}
        <button
          onClick={() => onNavigate('settings')}
          title="Account Profile & Settings"
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-[#6E1231] text-white flex items-center justify-center font-bold text-[10px]">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <span className="font-bold text-slate-900 block leading-tight text-xs">{user?.name}</span>
            <span className="text-[10px] text-[#6E1231] font-semibold capitalize leading-none">{user?.role?.replace('_', ' ')}</span>
          </div>
        </button>

        {/* Theme Quick Switcher */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6E1231] ring-2 ring-white"></span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs font-display">Institute Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-100 text-[#6E1231] rounded-full text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-[#6E1231] hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">No alerts at the moment</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-2.5 rounded-xl border text-xs transition-colors ${
                        notif.is_read ? 'bg-white border-slate-100 text-slate-600' : 'bg-rose-50/50 border-rose-100 text-slate-900'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {notif.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : notif.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-[11px] leading-tight">{notif.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{notif.message}</p>
                          <p className="text-[9px] text-slate-400 mt-1 font-mono">{formatTime(notif.created_at, true)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students by name, ID, phone, voucher #, receipt #..."
                className="w-full text-sm text-slate-900 focus:outline-hidden placeholder-slate-400"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 rounded-lg"
              >
                ESC
              </button>
            </div>

            <div className="p-3 max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-8 text-xs text-slate-400">Searching records...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  {searchQuery.length >= 2 ? 'No records match your query' : 'Type at least 2 characters to search'}
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSearchOpen(false);
                        if (item.type === 'Student') onNavigate('students');
                        else if (item.type === 'Admission') onNavigate('admissions');
                        else if (item.type === 'Voucher') onNavigate('vouchers');
                        else if (item.type === 'Receipt') onNavigate('payments');
                        else if (item.type === 'Course') onNavigate('courses');
                        else if (item.type === 'Expense') onNavigate('expenses');
                      }}
                      className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors border border-transparent hover:border-slate-200"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{item.title}</span>
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 font-mono text-[10px] rounded">
                            {item.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-[#6E1231] border border-rose-200">
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
