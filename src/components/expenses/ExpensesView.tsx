import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Plus,
  Search,
  Filter,
  Printer,
  Ban,
  Trash2,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Expense } from '../../types.ts';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../common/Modal.tsx';
import { DeleteProtectionModal } from '../common/DeleteProtectionModal.tsx';

interface ExpensesViewProps {
  onOpenPrintExpenseVoucher: (id: number) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenPrintExpenseVoucher }) => {
  const { canManageFinance, canPermanentDelete } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<{
    category: string;
    amount: number;
    paid_to: string;
    payment_method: 'Cash' | 'Bank Transfer' | 'JazzCash' | 'EasyPaisa';
    date: string;
    reference_no: string;
    description: string;
  }>({
    category: 'Instructor Salaries',
    amount: 10000,
    paid_to: '',
    payment_method: 'Bank Transfer',
    date: new Date().toISOString().split('T')[0],
    reference_no: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Void Modal
  const [voidTarget, setVoidTarget] = useState<Expense | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  // Owner permanent delete target
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>('/api/expenses');
      const validExpenses = Array.isArray(data)
        ? data
        : (Array.isArray(data?.expenses) ? data.expenses : (Array.isArray(data?.data) ? data.data : []));
      setExpenses(validExpenses);
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const categories = [
    'Instructor Salaries',
    'Staff Salaries',
    'Campus Rent',
    'Electricity & Utilities',
    'Internet & Cloud Services',
    'Marketing & Ads',
    'Hardware & Lab Equipment',
    'Refreshment & Events',
    'Stationery & Printing',
    'Miscellaneous'
  ];

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.paid_to || !newExpense.amount || newExpense.amount <= 0 || !newExpense.description) {
      alert('Payee, positive amount, and description are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(newExpense)
      });
      setAddModalOpen(false);
      loadExpenses();
      onOpenPrintExpenseVoucher(res.id);
    } catch (err: any) {
      alert('Failed to record expense: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget || !voidReason.trim()) {
      alert('Mandatory reason required for voiding.');
      return;
    }

    setVoiding(true);
    try {
      await apiRequest(`/api/expenses/${voidTarget.id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: voidReason })
      });
      setVoidTarget(null);
      setVoidReason('');
      loadExpenses();
    } catch (err: any) {
      alert('Failed to void expense: ' + err.message);
    } finally {
      setVoiding(false);
    }
  };

  const expensesList = Array.isArray(expenses) ? expenses : [];
  const filteredExpenses = expensesList.filter((e) => {
    if (!e) return false;
    if (categoryFilter && e.category !== categoryFilter) return false;
    if (statusFilter && e.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (e.expense_no && e.expense_no.toLowerCase().includes(s)) ||
      (e.paid_to && e.paid_to.toLowerCase().includes(s)) ||
      (e.description && e.description.toLowerCase().includes(s)) ||
      (e.category && e.category.toLowerCase().includes(s))
    );
  });

  const totalFilteredExpense = filteredExpenses
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">Institute Expense Desk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational disbursements, staff payroll, campus utilities, and official disbursement vouchers
          </p>
        </div>
        {canManageFinance && (
          <button
            onClick={() => {
              setNewExpense({
                category: 'Instructor Salaries',
                amount: 15000,
                paid_to: '',
                payment_method: 'Cash',
                date: new Date().toISOString().split('T')[0],
                reference_no: '',
                description: ''
              });
              setAddModalOpen(true);
            }}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>
        )}
      </div>

      {/* Expense KPI Top Bar */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Total Operational Outflow (Valid Disbursements)</span>
            <p className="text-2xl font-black font-display text-white mt-0.5">{formatPKR(totalFilteredExpense)}</p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          <span>{filteredExpenses.length} Expense Records in View</span>
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
            placeholder="Search expenses by voucher #, payee, category, description..."
            className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E1231]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E1231] bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E1231] bg-white"
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid (Disbursed)</option>
            <option value="voided">Voided (Cancelled)</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Expense #</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Paid To (Payee)</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Amount Disbursed</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">Loading expense ledger...</td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">No expense records found.</td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{exp.expense_no}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{exp.paid_to}</td>
                    <td className="p-3.5 text-slate-600 truncate max-w-[200px]">{exp.description}</td>
                    <td className="p-3.5 font-bold text-red-600 text-sm font-display">
                      {formatPKR(exp.amount)}
                    </td>
                    <td className="p-3.5 text-slate-600">{exp.payment_method}</td>
                    <td className="p-3.5 text-slate-500">{formatDate(exp.date)}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        exp.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 line-through'
                      }`}>
                        {exp.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenPrintExpenseVoucher(exp.id)}
                          title="Print Expense Disbursement Voucher"
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* NO-DELETE RULE: Void expense instead of delete */}
                        {canManageFinance && exp.status === 'paid' && (
                          <button
                            onClick={() => {
                              setVoidTarget(exp);
                              setVoidReason('');
                            }}
                            title="Void Expense Record (With Mandatory Reason)"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        {/* OWNER-ONLY PERMANENT DELETION (NON-OWNERS SEE RESTRICTION ALERT) */}
                        <button
                          onClick={() => {
                            if (!canPermanentDelete) {
                              alert('Please contact to admin for deletion of data.');
                              return;
                            }
                            setDeleteTarget({ id: exp.id, name: `Expense ${exp.expense_no} (${formatPKR(exp.amount)})` });
                          }}
                          title={canPermanentDelete ? "Owner Strict Permanent Delete" : "Please contact to admin for deletion of data"}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {addModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setAddModalOpen(false)}
          title="Record Institute Operational Expense"
          subtitle="Generates disbursement voucher with signatures for audit"
          maxWidth="md"
        >
          <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Disbursement Date</label>
                <input
                  type="date"
                  required
                  value={newExpense.date || ''}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paid To (Payee Name) *</label>
                <input
                  type="text"
                  required
                  value={newExpense.paid_to || ''}
                  onChange={(e) => setNewExpense({ ...newExpense, paid_to: e.target.value })}
                  placeholder="e.g. Hamza Farooq (Instructor) / LESCO / Landlord"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Disbursed Amount (PKR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newExpense.amount ?? 0}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-bold text-red-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={newExpense.payment_method || 'Cash'}
                  onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white font-medium"
                >
                  <option value="Cash">Cash Desk</option>
                  <option value="Bank Transfer">Bank Transfer (Al Habib / Bank Islami)</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bill / Cheque Reference #</label>
                <input
                  type="text"
                  value={newExpense.reference_no || ''}
                  onChange={(e) => setNewExpense({ ...newExpense, reference_no: e.target.value })}
                  placeholder="e.g. INV-1094 / CHQ-8821"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Particulars / Description *</label>
              <textarea
                rows={3}
                required
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Details of expense, service rendered, or purchased items..."
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all"
              >
                {submitting ? 'Recording...' : 'Disburse & Print Voucher'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Void Expense Modal */}
      {voidTarget && (
        <Modal
          isOpen={true}
          onClose={() => setVoidTarget(null)}
          title={`Void Expense Voucher: ${voidTarget.expense_no}`}
          subtitle="Strict Audit Compliance: Voiding expense adjustments are logged"
          maxWidth="md"
        >
          <form onSubmit={handleVoidExpense} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No-Delete Policy In Effect</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  This expense ({formatPKR(voidTarget.amount)}) will be marked as void and subtracted from operational outflows.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason for Voiding *</label>
              <textarea
                rows={3}
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Reason for cancellation..."
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
                className="px-4 py-2 font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all"
              >
                {voiding ? 'Voiding...' : 'Confirm Void Expense'}
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
          module="expenses"
          recordId={deleteTarget.id}
          recordName={deleteTarget.name}
          onSuccess={() => {
            setDeleteTarget(null);
            loadExpenses();
          }}
        />
      )}
    </div>
  );
};
