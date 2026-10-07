import React, { useState } from 'react';
import {
  Building2,
  Users,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  Banknote,
  GraduationCap,
  Calendar,
  Layers,
  ArrowRightLeft,
  ChevronRight,
  Phone,
  MapPin,
  Sparkles,
  Percent,
  Activity,
  PlusCircle,
  FileText
} from 'lucide-react';
import { CampusSplitData, CampusPerformanceMetrics, DashboardStats } from '../../types.ts';
import { formatPKR, formatDate } from '../../lib/api.ts';

interface CampusSplitDashboardProps {
  splitData?: CampusSplitData;
  stats?: DashboardStats;
  onNavigate: (tab: string) => void;
  onOpenPrintVoucher?: (id: number) => void;
  onOpenPrintReceipt?: (id: number) => void;
  onSelectCampusFilter?: (campus: 'all' | 'lahore' | 'okara' | 'split') => void;
  activeFilter?: 'all' | 'lahore' | 'okara' | 'split';
}

export const CampusSplitDashboard: React.FC<CampusSplitDashboardProps> = ({
  splitData,
  stats,
  onNavigate,
  onOpenPrintVoucher,
  onOpenPrintReceipt,
  onSelectCampusFilter,
  activeFilter = 'all'
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'lahore' | 'okara'>('split');

  // Calculations if splitData is not yet populated
  const defaultLahore: CampusPerformanceMetrics = {
    campus: 'Lahore',
    campusName: 'Lahore Campus',
    campusCode: 'DGSL',
    location: 'First Floor 12-C, Commercial Market, NFC Society Lahore',
    phone: '+92 331-715-5174',
    totalStudents: 0,
    activeStudents: 0,
    newAdmissions: 0,
    activeBatches: 0,
    todayCollection: stats?.todayCampusBreakdown?.find(c => c.campus?.toLowerCase().includes('lahore'))?.total ?? 0,
    todayReceiptsCount: stats?.todayCampusBreakdown?.find(c => c.campus?.toLowerCase().includes('lahore'))?.count ?? 0,
    todayCash: 0,
    todayOnline: 0,
    monthlyCollection: 0,
    outstandingFees: 0,
    monthlyExpenses: 0,
    netIncome: 0,
    upcomingDueCount: 0,
    upcomingDueAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    collectionEfficiency: 0,
    activeEnrollmentRate: 0,
    feeRecoveryRate: 0,
    avgRevenuePerStudent: 0,
    cashPercentage: 0,
    digitalPercentage: 0,
    recentPayments: (stats?.recentPayments || []).slice(0, 3),
    recentAdmissions: (stats?.recentAdmissions || []).slice(0, 3)
  };

  const defaultOkara: CampusPerformanceMetrics = {
    campus: 'Okara',
    campusName: 'Okara Campus',
    campusCode: 'DGSO',
    location: '185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara',
    phone: '+92 310-436-7347',
    totalStudents: 0,
    activeStudents: 0,
    newAdmissions: 0,
    activeBatches: 0,
    todayCollection: stats?.todayCampusBreakdown?.find(c => c.campus?.toLowerCase().includes('okara'))?.total ?? 0,
    todayReceiptsCount: stats?.todayCampusBreakdown?.find(c => c.campus?.toLowerCase().includes('okara'))?.count ?? 0,
    todayCash: 0,
    todayOnline: 0,
    monthlyCollection: 0,
    outstandingFees: 0,
    monthlyExpenses: 0,
    netIncome: 0,
    upcomingDueCount: 0,
    upcomingDueAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    collectionEfficiency: 0,
    activeEnrollmentRate: 0,
    feeRecoveryRate: 0,
    avgRevenuePerStudent: 0,
    cashPercentage: 0,
    digitalPercentage: 0,
    recentPayments: (stats?.recentPayments || []).slice(1, 4),
    recentAdmissions: (stats?.recentAdmissions || []).slice(1, 4)
  };

  const lahore = splitData?.lahore || defaultLahore;
  const okara = splitData?.okara || defaultOkara;

  const totalMonthlyRev = lahore.monthlyCollection + okara.monthlyCollection;
  const lahoreRevPct = totalMonthlyRev > 0 ? Math.round((lahore.monthlyCollection / totalMonthlyRev) * 100) : 0;
  const okaraRevPct = totalMonthlyRev > 0 ? (100 - lahoreRevPct) : 0;

  const totalActive = lahore.activeStudents + okara.activeStudents;
  const lahoreStudentsPct = totalActive > 0 ? Math.round((lahore.activeStudents / totalActive) * 100) : 0;
  const okaraStudentsPct = totalActive > 0 ? (100 - lahoreStudentsPct) : 0;

  const totalToday = lahore.todayCollection + okara.todayCollection;
  const lahoreTodayPct = totalToday > 0 ? Math.round((lahore.todayCollection / totalToday) * 100) : 0;
  const okaraTodayPct = totalToday > 0 ? (100 - lahoreTodayPct) : 0;

  const renderCampusColumn = (
    data: CampusPerformanceMetrics,
    theme: {
      primary: string;
      primaryHover: string;
      border: string;
      bgLight: string;
      pillBg: string;
      pillText: string;
      barColor: string;
      dotColor: string;
      accentText: string;
    }
  ) => {
    return (
      <div className={`rounded-2xl border ${theme.border} bg-white shadow-xs overflow-hidden flex flex-col`}>
        {/* Campus Card Top Banner */}
        <div className={`p-5 ${theme.bgLight} border-b ${theme.border}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${theme.dotColor} shrink-0 ring-4 ring-white`}></div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    {data.campusName}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${theme.pillBg} ${theme.pillText} border ${theme.border}`}>
                    Code: {data.campusCode}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{data.location}</span>
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Active Campus
              </span>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-end gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{data.phone}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 4 Summary Cards Grid */}
        <div className="p-5 space-y-5 flex-1">
          <div className="grid grid-cols-2 gap-3">
            {/* 1. Active & Registered Students */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Active Students</span>
                <Users className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <div className="text-xl font-black text-slate-900 mt-1 font-display">
                {data.activeStudents}
                <span className="text-[11px] font-normal text-slate-500 ml-1">/ {data.totalStudents}</span>
              </div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/60 text-[10px]">
                <span className="text-slate-500">Active Rate:</span>
                <span className="font-bold text-sky-700">{data.activeEnrollmentRate}%</span>
              </div>
            </div>

            {/* 2. Today's Fee Collection */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Today's Inflow</span>
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-slate-900 mt-1 font-display">
                {formatPKR(data.todayCollection)}
              </div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-200/60 text-[10px] text-emerald-800">
                <span>{data.todayReceiptsCount} receipt(s)</span>
                <span className="font-medium">Cash: {formatPKR(data.todayCash)}</span>
              </div>
            </div>

            {/* 3. Monthly Fee Inflow & Net Income */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Monthly Inflow</span>
                <TrendingUp className={`w-3.5 h-3.5 ${theme.accentText}`} />
              </div>
              <div className="text-xl font-black text-slate-900 mt-1 font-display">
                {formatPKR(data.monthlyCollection)}
              </div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/60 text-[10px]">
                <span className="text-slate-500">Net Surplus:</span>
                <span className={`font-bold ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatPKR(data.netIncome)}
                </span>
              </div>
            </div>

            {/* 4. Outstanding Fees & Overdue */}
            <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/80">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Outstanding Dues</span>
                <Clock className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-xl font-black text-rose-700 mt-1 font-display">
                {formatPKR(data.outstandingFees)}
              </div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-rose-200/60 text-[10px] text-rose-700">
                <span>{data.overdueCount} Overdue</span>
                <span className="font-bold">{formatPKR(data.overdueAmount)}</span>
              </div>
            </div>
          </div>

          {/* Performance Metrics Section */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#6E1231]" />
                <span>Performance & Efficiency Indicators</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500">Month-to-Date</span>
            </div>

            {/* Metric 1: Collection Efficiency */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Fee Collection Efficiency</span>
                <span className="font-extrabold text-slate-900">{data.collectionEfficiency}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${theme.barColor}`}
                  style={{ width: `${Math.min(100, Math.max(10, data.collectionEfficiency))}%` }}
                ></div>
              </div>
            </div>

            {/* Metric 2: Active Student Ratio */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Active Student Retention</span>
                <span className="font-extrabold text-slate-900">{data.activeEnrollmentRate}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-600"
                  style={{ width: `${Math.min(100, Math.max(10, data.activeEnrollmentRate))}%` }}
                ></div>
              </div>
            </div>

            {/* Key KPI Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center text-xs">
              <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-semibold">ARPU / Student</span>
                <span className="font-black text-slate-800 text-[11px] mt-0.5 block">{formatPKR(data.avgRevenuePerStudent)}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-semibold">New Admissions</span>
                <span className="font-black text-emerald-700 text-[11px] mt-0.5 block">+{data.newAdmissions} Students</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/80 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block font-semibold">Active Batches</span>
                <span className="font-black text-indigo-700 text-[11px] mt-0.5 block">{data.activeBatches} Cohorts</span>
              </div>
            </div>

            {/* Payment Method Breakdown Bar */}
            <div className="pt-2 border-t border-slate-200 text-[11px]">
              <div className="flex items-center justify-between text-slate-600 mb-1 font-medium">
                <span>Today's Payment Mix</span>
                <span className="text-[10px] text-slate-500">
                  Cash: <strong>{data.cashPercentage}%</strong> • Online: <strong>{data.digitalPercentage}%</strong>
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200">
                <div className="bg-emerald-600 h-full" style={{ width: `${data.cashPercentage}%` }} title={`Cash ${data.cashPercentage}%`}></div>
                <div className="bg-indigo-600 h-full" style={{ width: `${data.digitalPercentage}%` }} title={`Online ${data.digitalPercentage}%`}></div>
              </div>
            </div>
          </div>

          {/* Recent Payments Feed for this Campus */}
          {data.recentPayments && data.recentPayments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Recent Fee Receipts ({data.campusCode})</span>
                </span>
                <button
                  onClick={() => {
                    onSelectCampusFilter?.(data.campus.toLowerCase() as any);
                    onNavigate('payments');
                  }}
                  className="text-[11px] text-[#6E1231] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                {data.recentPayments.map((p, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{p.student_name || 'Student'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {p.receipt_no} • {p.payment_method || 'Cash'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-emerald-700 font-mono text-xs">{formatPKR(p.amount)}</span>
                      <p className="text-[10px] text-slate-400">{formatDate(p.payment_date || p.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Admissions Feed for this Campus */}
          {data.recentAdmissions && data.recentAdmissions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Recent Admissions ({data.campusCode})</span>
                </span>
                <button
                  onClick={() => {
                    onSelectCampusFilter?.(data.campus.toLowerCase() as any);
                    onNavigate('admissions');
                  }}
                  className="text-[11px] text-[#6E1231] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View Form</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                {data.recentAdmissions.map((a, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{a.student_name || 'New Enrollee'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{a.course_name || 'Digital Course'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-800 font-mono text-xs">{formatPKR(a.final_payable)}</span>
                      <p className="text-[10px] text-emerald-600 font-semibold">{a.admission_no}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Campus Quick Action Footer */}
        <div className={`p-3.5 ${theme.bgLight} border-t ${theme.border} flex items-center justify-between gap-2 flex-wrap text-xs`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSelectCampusFilter?.(data.campus.toLowerCase() as any);
                onNavigate('admissions');
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg font-bold border border-slate-300 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#6E1231]" />
              <span>{data.campus} Admission</span>
            </button>
            <button
              onClick={() => {
                onSelectCampusFilter?.(data.campus.toLowerCase() as any);
                onNavigate('vouchers');
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg font-bold border border-slate-300 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Fee Vouchers</span>
            </button>
          </div>

          <button
            onClick={() => {
              onSelectCampusFilter?.(data.campus.toLowerCase() as any);
              onNavigate('students');
            }}
            className={`font-bold hover:underline flex items-center gap-1 cursor-pointer ${theme.accentText}`}
          >
            <span>View All Students</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Split-View Controller */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#6E1231] to-[#85173A] text-white shadow-md shadow-[#6E1231]/20">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900 font-display">
                  Campus Split-View Dashboard & Performance Metrics
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-[#6E1231] border border-rose-200">
                  Dual-Campus Analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Side-by-side comparative totals, collections, active rosters, and operational efficiency for Lahore (DGSL) and Okara (DGSO).
              </p>
            </div>
          </div>

          {/* View Mode Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'split'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#6E1231]" />
              <span>Split Dual-View</span>
            </button>
            <button
              onClick={() => setViewMode('lahore')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'lahore'
                  ? 'bg-[#6E1231] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#6E1231]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Lahore Focus</span>
            </button>
            <button
              onClick={() => setViewMode('okara')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'okara'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Okara Focus</span>
            </button>
          </div>
        </div>

        {/* Live Comparative Barometer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
          {/* 1. Revenue Share */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-600 font-semibold mb-1.5">
              <span>Monthly Inflow Split</span>
              <span className="font-bold text-slate-900">{formatPKR(totalMonthlyRev)}</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200 mb-1.5">
              <div
                className="bg-[#6E1231] h-full transition-all"
                style={{ width: `${lahoreRevPct}%` }}
                title={`Lahore: ${lahoreRevPct}%`}
              ></div>
              <div
                className="bg-emerald-600 h-full transition-all"
                style={{ width: `${okaraRevPct}%` }}
                title={`Okara: ${okaraRevPct}%`}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#6E1231] font-bold">Lahore ({lahoreRevPct}%)</span>
              <span className="text-emerald-700 font-bold">Okara ({okaraRevPct}%)</span>
            </div>
          </div>

          {/* 2. Active Students Share */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-600 font-semibold mb-1.5">
              <span>Active Students Roster</span>
              <span className="font-bold text-slate-900">{totalActive} Students</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200 mb-1.5">
              <div
                className="bg-[#6E1231] h-full transition-all"
                style={{ width: `${lahoreStudentsPct}%` }}
                title={`Lahore: ${lahoreStudentsPct}%`}
              ></div>
              <div
                className="bg-emerald-600 h-full transition-all"
                style={{ width: `${okaraStudentsPct}%` }}
                title={`Okara: ${okaraStudentsPct}%`}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#6E1231] font-bold">{lahore.activeStudents} in Lahore</span>
              <span className="text-emerald-700 font-bold">{okara.activeStudents} in Okara</span>
            </div>
          </div>

          {/* 3. Today's Counter Inflow Split */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-600 font-semibold mb-1.5">
              <span>Today's Counter Flow</span>
              <span className="font-bold text-emerald-700">{formatPKR(totalToday)}</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200 mb-1.5">
              <div
                className="bg-[#6E1231] h-full transition-all"
                style={{ width: `${lahoreTodayPct}%` }}
                title={`Lahore: ${lahoreTodayPct}%`}
              ></div>
              <div
                className="bg-emerald-600 h-full transition-all"
                style={{ width: `${okaraTodayPct}%` }}
                title={`Okara: ${okaraTodayPct}%`}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#6E1231] font-bold">{formatPKR(lahore.todayCollection)}</span>
              <span className="text-emerald-700 font-bold">{formatPKR(okara.todayCollection)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Lahore Campus Card */}
        {(viewMode === 'split' || viewMode === 'lahore') &&
          renderCampusColumn(lahore, {
            primary: '#6E1231',
            primaryHover: '#85173A',
            border: 'border-rose-200',
            bgLight: 'bg-rose-50/50',
            pillBg: 'bg-rose-100',
            pillText: 'text-[#6E1231]',
            barColor: 'bg-[#6E1231]',
            dotColor: 'bg-[#6E1231]',
            accentText: 'text-[#6E1231]'
          })}

        {/* Okara Campus Card */}
        {(viewMode === 'split' || viewMode === 'okara') &&
          renderCampusColumn(okara, {
            primary: '#047857',
            primaryHover: '#065F46',
            border: 'border-emerald-200',
            bgLight: 'bg-emerald-50/50',
            pillBg: 'bg-emerald-100',
            pillText: 'text-emerald-800',
            barColor: 'bg-emerald-600',
            dotColor: 'bg-emerald-600',
            accentText: 'text-emerald-800'
          })}
      </div>

      {/* Side-by-Side Comparative Metrics Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 font-display">
                Campus Performance Benchmarking Matrix
              </h4>
              <p className="text-[11px] text-slate-500">
                Direct operational comparison between Lahore (DGSL) and Okara (DGSO) campuses
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Live Comparison</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3 text-left">Key Operational Indicator</th>
                <th className="py-2.5 px-3 text-center text-[#6E1231] font-black">
                  Lahore Campus (DGSL)
                </th>
                <th className="py-2.5 px-3 text-center text-emerald-800 font-black">
                  Okara Campus (DGSO)
                </th>
                <th className="py-2.5 px-3 text-center text-slate-700 font-bold">Total Combined</th>
                <th className="py-2.5 px-3 text-right">Campus Share / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  <span>Active Enrolled Students</span>
                </td>
                <td className="py-3 px-3 text-center font-bold text-slate-900">{lahore.activeStudents}</td>
                <td className="py-3 px-3 text-center font-bold text-slate-900">{okara.activeStudents}</td>
                <td className="py-3 px-3 text-center font-extrabold text-slate-900">{totalActive}</td>
                <td className="py-3 px-3 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    {lahoreStudentsPct}% vs {okaraStudentsPct}%
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Today's Fee Collection</span>
                </td>
                <td className="py-3 px-3 text-center font-bold text-slate-900">{formatPKR(lahore.todayCollection)}</td>
                <td className="py-3 px-3 text-center font-bold text-slate-900">{formatPKR(okara.todayCollection)}</td>
                <td className="py-3 px-3 text-center font-extrabold text-emerald-700">{formatPKR(totalToday)}</td>
                <td className="py-3 px-3 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {lahoreTodayPct}% vs {okaraTodayPct}%
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#6E1231]" />
                  <span>Monthly Fee Revenue</span>
                </td>
                <td className="py-3 px-3 text-center font-bold text-[#6E1231]">{formatPKR(lahore.monthlyCollection)}</td>
                <td className="py-3 px-3 text-center font-bold text-emerald-800">{formatPKR(okara.monthlyCollection)}</td>
                <td className="py-3 px-3 text-center font-extrabold text-slate-900">{formatPKR(totalMonthlyRev)}</td>
                <td className="py-3 px-3 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-[#6E1231] border border-rose-200">
                    {lahoreRevPct}% vs {okaraRevPct}%
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Outstanding Fee Balances</span>
                </td>
                <td className="py-3 px-3 text-center font-bold text-rose-700">{formatPKR(lahore.outstandingFees)}</td>
                <td className="py-3 px-3 text-center font-bold text-rose-700">{formatPKR(okara.outstandingFees)}</td>
                <td className="py-3 px-3 text-center font-extrabold text-rose-700">
                  {formatPKR(lahore.outstandingFees + okara.outstandingFees)}
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {lahore.overdueCount + okara.overdueCount} Overdue Vouchers
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Fee Collection Efficiency</span>
                </td>
                <td className="py-3 px-3 text-center font-bold text-slate-900">{lahore.collectionEfficiency}%</td>
                <td className="py-3 px-3 text-center font-bold text-slate-900">{okara.collectionEfficiency}%</td>
                <td className="py-3 px-3 text-center font-extrabold text-slate-900">
                  {Math.round((lahore.collectionEfficiency + okara.collectionEfficiency) / 2)}% Avg
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    High Recovery
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-slate-600" />
                  <span>Operating Net Surplus</span>
                </td>
                <td className="py-3 px-3 text-center font-bold text-emerald-700">{formatPKR(lahore.netIncome)}</td>
                <td className="py-3 px-3 text-center font-bold text-emerald-700">{formatPKR(okara.netIncome)}</td>
                <td className="py-3 px-3 text-center font-extrabold text-emerald-800">
                  {formatPKR(lahore.netIncome + okara.netIncome)}
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Positive Cashflow
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
