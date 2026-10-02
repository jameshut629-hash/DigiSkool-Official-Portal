import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Printer,
  Ban,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { FeeVoucher, Student, Course } from '../../types.ts';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../common/Modal.tsx';
import { DeleteProtectionModal } from '../common/DeleteProtectionModal.tsx';

interface FeeVouchersViewProps {
  onOpenPrintVoucher: (id: number) => void;
  onNavigateToPayments?: () => void;
}

export const FeeVouchersView: React.FC<FeeVouchersViewProps> = ({ onOpenPrintVoucher, onNavigateToPayments }) => {
  const { canManageFinance, canPermanentDelete, isStudent, user } = useAuth();
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campusFilter, setCampusFilter] = useState<'all' | 'lahore' | 'okara'>('all');

  // Generate modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [newVoucher, setNewVoucher] = useState<{
    student_id: number | '';
    course_id: number | '';
    fee_description: string;
    amount: number;
    discount: number;
    due_date: string;
    notes: string;
  }>({
    student_id: '',
    course_id: '',
    fee_description: 'Tuition Fee (Monthly Installment)',
    amount: 15000,
    discount: 0,
    due_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Void modal
  const [voidTarget, setVoidTarget] = useState<FeeVoucher | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  // Owner delete target
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const [vchs, stds, crs] = await Promise.all([
        apiRequest<any>(`/api/vouchers?${params.toString()}`),
        apiRequest<any>('/api/students'),
        apiRequest<any>('/api/courses')
      ]);
      const validVouchers = Array.isArray(vchs)
        ? vchs
        : (Array.isArray(vchs?.vouchers) ? vchs.vouchers : (Array.isArray(vchs?.data) ? vchs.data : []));
      const validStudents = Array.isArray(stds)
        ? stds
        : (Array.isArray(stds?.students) ? stds.students : (Array.isArray(stds?.data) ? stds.data : []));
      const validCourses = Array.isArray(crs)
        ? crs
        : (Array.isArray(crs?.courses) ? crs.courses : (Array.isArray(crs?.data) ? crs.data : []));

      setVouchers(validVouchers);
      setStudents(validStudents);
      setCourses(validCourses);
    } catch (err: any) {
      console.error('Failed to load vouchers:', err);
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleGenerateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucher.student_id || !newVoucher.amount || !newVoucher.due_date) {
      alert('Student, amount, and due date are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/api/vouchers', {
        method: 'POST',
        body: JSON.stringify({
          ...newVoucher,
          student_id: Number(newVoucher.student_id),
          course_id: newVoucher.course_id ? Number(newVoucher.course_id) : null,
          issue_date: new Date().toISOString().split('T')[0]
        })
      });
      setGenerateModalOpen(false);
      loadData();
      onOpenPrintVoucher(res.id);
    } catch (err: any) {
      alert('Failed to generate voucher: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget || !voidReason.trim()) {
      alert('Please provide a mandatory reason for voiding this voucher.');
      return;
    }

    setVoiding(true);
    try {
      await apiRequest(`/api/vouchers/${voidTarget.id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: voidReason })
      });
      setVoidTarget(null);
      setVoidReason('');
      loadData();
    } catch (err: any) {
      alert('Failed to void voucher: ' + err.message);
    } finally {
      setVoiding(false);
    }
  };

  const vouchersList = Array.isArray(vouchers) ? vouchers : [];

  const isVoucherOverdue = (v: FeeVoucher): boolean => {
    const remaining = Math.max(0, v.total_payable - (v.paid_amount || 0));
    if (remaining <= 0 || v.status === 'void' || v.status === 'cancelled') return false;
    if (v.is_overdue || v.status === 'overdue') return true;
    if (!v.due_date) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return v.due_date < todayStr;
  };

  const getDaysOverdue = (v: FeeVoucher): number => {
    if (v.days_overdue !== undefined && v.days_overdue > 0) return v.days_overdue;
    if (!v.due_date) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(v.due_date);
    due.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const overdueCount = vouchersList.filter(isVoucherOverdue).length;

  const isOkaraVoucher = (v: FeeVoucher) =>
    Boolean((v.student_name && v.student_name.toLowerCase().includes('okara')) ||
            (v.voucher_no && v.voucher_no.toLowerCase().includes('dgso')) ||
            (v as any).campus?.toLowerCase().includes('okara'));

  const lahoreVouchers = vouchersList.filter((v) => !isOkaraVoucher(v));
  const okaraVouchers = vouchersList.filter((v) => isOkaraVoucher(v));

  const lahorePayable = lahoreVouchers.reduce((acc, v) => acc + (v.total_payable || 0), 0);
  const lahoreCollected = lahoreVouchers.reduce((acc, v) => acc + (v.paid_amount || 0), 0);
  const okaraPayable = okaraVouchers.reduce((acc, v) => acc + (v.total_payable || 0), 0);
  const okaraCollected = okaraVouchers.reduce((acc, v) => acc + (v.paid_amount || 0), 0);

  const filteredVouchers = vouchersList.filter((v) => {
    if (campusFilter === 'lahore' && isOkaraVoucher(v)) return false;
    if (campusFilter === 'okara' && !isOkaraVoucher(v)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">Fee Vouchers Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official 3-copy vouchers (Bank, DigiSkool & Student Copies) with late surcharge tracking
          </p>
        </div>
        {canManageFinance && (
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="px-3.5 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Fee Voucher</span>
          </button>
        )}
      </div>

      {/* CAMPUS FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pl-1">
          <span>Voucher Campus Filter:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCampusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              campusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Vouchers ({vouchersList.length})
          </button>

          <button
            onClick={() => setCampusFilter('lahore')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              campusFilter === 'lahore'
                ? 'bg-[#6E1231] text-white shadow-xs'
                : 'bg-rose-50 text-[#6E1231] hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>Lahore Campus DGSL ({lahoreVouchers.length})</span>
          </button>

          <button
            onClick={() => setCampusFilter('okara')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              campusFilter === 'okara'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Okara Campus DGSO ({okaraVouchers.length})</span>
          </button>
        </div>
      </div>

      {/* SEPARATE CAMPUS SUMMARIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border transition-all ${
          campusFilter === 'lahore' || campusFilter === 'all' ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-rose-200">
            <span className="font-extrabold text-xs text-[#6E1231] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6E1231]"></span>
              Lahore Vouchers Summary (DGSL)
            </span>
            <span className="text-[10px] font-bold text-slate-500">Johar Town</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2.5 text-center text-xs">
            <div className="p-2 bg-white rounded-xl border border-rose-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Invoiced</span>
              <p className="text-base font-black text-slate-900 mt-0.5">{formatPKR(lahorePayable)}</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-rose-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Collected</span>
              <p className="text-base font-black text-emerald-600 mt-0.5">{formatPKR(lahoreCollected)}</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-rose-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Outstanding</span>
              <p className="text-base font-black text-rose-600 mt-0.5">{formatPKR(Math.max(0, lahorePayable - lahoreCollected))}</p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          campusFilter === 'okara' || campusFilter === 'all' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
            <span className="font-extrabold text-xs text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Okara Vouchers Summary (DGSO)
            </span>
            <span className="text-[10px] font-bold text-slate-500">Benazir Road</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2.5 text-center text-xs">
            <div className="p-2 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Invoiced</span>
              <p className="text-base font-black text-slate-900 mt-0.5">{formatPKR(okaraPayable)}</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Collected</span>
              <p className="text-base font-black text-emerald-600 mt-0.5">{formatPKR(okaraCollected)}</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Outstanding</span>
              <p className="text-base font-black text-rose-600 mt-0.5">{formatPKR(Math.max(0, okaraPayable - okaraCollected))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by voucher #, student name, roll no, course..."
            className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E1231]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {overdueCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'overdue' ? '' : 'overdue')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                statusFilter === 'overdue'
                  ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
              title="Filter by students with overdue fees"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{overdueCount} Overdue Student{overdueCount === 1 ? '' : 's'}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E1231] bg-white"
            >
              <option value="">All Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partially Paid</option>
              <option value="overdue">Overdue (Past Due Date)</option>
              <option value="paid">Paid (Fully Cleared)</option>
              <option value="void">Voided (Cancelled)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Voucher #</th>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Course / Description</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5">Total Payable</th>
                <th className="p-3.5">Paid Amount</th>
                <th className="p-3.5">Remaining Due</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">Loading fee vouchers...</td>
                </tr>
              ) : (!Array.isArray(filteredVouchers) || filteredVouchers.length === 0) ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">No vouchers found for selected campus.</td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const remaining = Math.max(0, v.total_payable - (v.paid_amount || 0));
                  const isOverdue = isVoucherOverdue(v);
                  const daysOverdue = isOverdue ? getDaysOverdue(v) : 0;
                  const isOkara = isOkaraVoucher(v);

                  return (
                    <tr
                      key={v.id}
                      className={`transition-colors ${
                        isOverdue
                          ? 'bg-rose-50/25 hover:bg-rose-50/50 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{v.voucher_no}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isOkara
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-[#6E1231] border border-rose-300'
                          }`}>
                            {isOkara ? 'DGSO' : 'DGSL'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{v.student_name}</span>
                          {isOverdue && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs"
                              title={`Fee overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`}
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                              <span>Overdue</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{v.student_code}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800 truncate max-w-[160px]">{v.fee_description}</div>
                        <div className="text-[10px] text-slate-400">{v.course_name}</div>
                      </td>
                      <td className="p-3.5">
                        <div className={isOverdue ? 'font-bold text-rose-600 flex items-center gap-1' : 'text-slate-600'}>
                          {isOverdue && <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                          <span>{formatDate(v.due_date)}</span>
                        </div>
                        {isOverdue && (
                          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            {daysOverdue} day{daysOverdue === 1 ? '' : 's'} late
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{formatPKR(v.total_payable)}</td>
                      <td className="p-3.5 font-medium text-emerald-600">{formatPKR(v.paid_amount || 0)}</td>
                      <td className="p-3.5 font-bold">
                        <span className={remaining > 0 ? (isOverdue ? 'text-rose-700 font-extrabold' : 'text-rose-600') : 'text-slate-400'}>
                          {formatPKR(remaining)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                          v.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                          isOverdue ? 'bg-rose-100 text-rose-800 border border-rose-300 ring-1 ring-rose-200' :
                          v.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                          v.status === 'void' ? 'bg-slate-200 text-slate-600 line-through' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {isOverdue && <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />}
                          <span>{isOverdue ? (v.status === 'partial' ? 'Overdue (Part)' : 'Overdue') : v.status}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenPrintVoucher(v.id)}
                            title="Print 2-Part Voucher (Office + Student Copy)"
                            className="p-1.5 text-slate-600 hover:text-[#6E1231] hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* NO-DELETE RULE: Void instead of delete */}
                          {canManageFinance && v.status !== 'paid' && v.status !== 'void' && (
                            <button
                              onClick={() => {
                                setVoidTarget(v);
                                setVoidReason('');
                              }}
                              title="Void Voucher (With Reason)"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* OWNER STRICT PERMANENT DELETE (NON-OWNERS SEE RESTRICTION ALERT) */}
                          <button
                            onClick={() => {
                              if (!canPermanentDelete) {
                                alert('Please contact to admin for deletion of data.');
                                return;
                              }
                              setDeleteTarget({ id: v.id, name: `Voucher ${v.voucher_no} (${v.student_name})` });
                            }}
                            title={canPermanentDelete ? "Owner Permanent Delete" : "Please contact to admin for deletion of data"}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              canPermanentDelete
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Voucher Modal */}
      {generateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setGenerateModalOpen(false)}
          title="Issue Official DigiSkool Fee Voucher"
          subtitle="Generates Bank, Institute, and Student copies with QR code and verification"
          maxWidth="md"
        >
          <form onSubmit={handleGenerateVoucher} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Student *</label>
              <select
                required
                value={newVoucher.student_id}
                onChange={(e) => setNewVoucher({ ...newVoucher, student_id: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
              >
                <option value="">Select Student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.student_id}) – {s.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Associated Course</label>
              <select
                value={newVoucher.course_id}
                onChange={(e) => {
                  const cId = Number(e.target.value);
                  const selectedC = courses.find((c) => c.id === cId);
                  setNewVoucher({
                    ...newVoucher,
                    course_id: cId,
                    amount: selectedC ? selectedC.fee : newVoucher.amount
                  });
                }}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
              >
                <option value="">None / General Fee</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatPKR(c.fee)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fee Description *</label>
              <input
                type="text"
                required
                value={newVoucher.fee_description || ''}
                onChange={(e) => setNewVoucher({ ...newVoucher, fee_description: e.target.value })}
                placeholder="e.g. Tuition Fee (Installment 1 of 2)"
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fee Amount (PKR) *</label>
                <input
                  type="number"
                  required
                  min={100}
                  value={newVoucher.amount ?? 0}
                  onChange={(e) => setNewVoucher({ ...newVoucher, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discount (PKR)</label>
                <input
                  type="number"
                  min={0}
                  value={newVoucher.discount ?? 0}
                  onChange={(e) => setNewVoucher({ ...newVoucher, discount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
                <input
                  type="date"
                  required
                  value={newVoucher.due_date || ''}
                  onChange={(e) => setNewVoucher({ ...newVoucher, due_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
              <textarea
                rows={2}
                value={newVoucher.notes || ''}
                onChange={(e) => setNewVoucher({ ...newVoucher, notes: e.target.value })}
                placeholder="Optional notes or instructions..."
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGenerateModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 font-bold bg-[#6E1231] hover:bg-[#85173A] text-white rounded-lg transition-all"
              >
                {submitting ? 'Generating...' : 'Issue Voucher'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Void Voucher Modal (NO-DELETE RULE) */}
      {voidTarget && (
        <Modal
          isOpen={true}
          onClose={() => setVoidTarget(null)}
          title={`Void Fee Voucher: ${voidTarget.voucher_no}`}
          subtitle="Strict Financial Control: Voiding is recorded in the immutable audit log"
          maxWidth="md"
        >
          <form onSubmit={handleVoidVoucher} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No-Delete Policy In Effect</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Financial records are permanently recorded. Voiding this voucher cancels future payments against it and updates outstanding balances, while keeping an audit footprint.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reason for Voiding *
              </label>
              <textarea
                rows={3}
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Student dropped course prior to classes / duplicate voucher created by mistake..."
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={voiding}
                className="px-4 py-2 font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all"
              >
                {voiding ? 'Processing...' : 'Confirm Void Voucher'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Strict Owner Permanent Delete */}
      {deleteTarget && (
        <DeleteProtectionModal
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          module="vouchers"
          recordId={deleteTarget.id}
          recordName={deleteTarget.name}
          onSuccess={() => {
            setDeleteTarget(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
