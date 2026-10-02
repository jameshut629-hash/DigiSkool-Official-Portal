import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Printer,
  Ban,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Receipt,
  CheckCircle2,
  Building2,
  Clock
} from 'lucide-react';
import { Payment, FeeVoucher } from '../../types.ts';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../common/Modal.tsx';
import { DeleteProtectionModal } from '../common/DeleteProtectionModal.tsx';

interface PaymentsViewProps {
  onOpenPrintReceipt: (id: number) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onOpenPrintReceipt }) => {
  const { canManageFinance, canPermanentDelete } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vouchers, setVouchers] = useState<FeeVoucher[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Record payment modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState<{
    voucher_id: number | '';
    amount: number;
    payment_method: 'Cash' | 'Bank Transfer' | 'JazzCash' | 'EasyPaisa';
    transaction_ref: string;
    payment_date: string;
    notes: string;
  }>({
    voucher_id: '',
    amount: 0,
    payment_method: 'Cash',
    transaction_ref: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Void modal
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  // Owner permanent delete target
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pmts, vchs] = await Promise.all([
        apiRequest<any>('/api/payments'),
        apiRequest<any>('/api/vouchers')
      ]);
      const validPayments = Array.isArray(pmts)
        ? pmts
        : (Array.isArray(pmts?.payments) ? pmts.payments : (Array.isArray(pmts?.data) ? pmts.data : []));
      const validVouchers = Array.isArray(vchs)
        ? vchs
        : (Array.isArray(vchs?.vouchers) ? vchs.vouchers : (Array.isArray(vchs?.data) ? vchs.data : []));

      setPayments(validPayments);
      setVouchers(validVouchers.filter((v: FeeVoucher) => v && v.status !== 'void' && v.status !== 'paid'));
    } catch (err: any) {
      console.error('Failed to load payments:', err);
      setPayments([]);
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const vouchersList = Array.isArray(vouchers) ? vouchers : [];
  const selectedVoucher = vouchersList.find((v) => v.id === Number(newPayment.voucher_id));
  const remainingOnVoucher = selectedVoucher ? Math.max(0, selectedVoucher.total_payable - (selectedVoucher.paid_amount || 0)) : 0;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.voucher_id || !newPayment.amount || newPayment.amount <= 0) {
      alert('Voucher and a valid positive amount are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          ...newPayment,
          voucher_id: Number(newPayment.voucher_id),
          student_id: selectedVoucher?.student_id
        })
      });
      setRecordModalOpen(false);
      loadData();
      onOpenPrintReceipt(res.id);
    } catch (err: any) {
      alert('Failed to record payment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget || !voidReason.trim()) {
      alert('Please state a reason for voiding/reversing this receipt.');
      return;
    }

    setVoiding(true);
    try {
      await apiRequest(`/api/payments/${voidTarget.id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: voidReason })
      });
      setVoidTarget(null);
      setVoidReason('');
      loadData();
    } catch (err: any) {
      alert('Failed to void payment: ' + err.message);
    } finally {
      setVoiding(false);
    }
  };

  const paymentsList = Array.isArray(payments) ? payments : [];
  const filteredPayments = paymentsList.filter((p) => {
    if (!p) return false;
    if (methodFilter && p.payment_method !== methodFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (p.receipt_no && p.receipt_no.toLowerCase().includes(s)) ||
      (p.student_name && p.student_name.toLowerCase().includes(s)) ||
      (p.voucher_no && p.voucher_no.toLowerCase().includes(s)) ||
      (p.transaction_ref && p.transaction_ref.toLowerCase().includes(s))
    );
  });

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

  const overdueVouchersCount = vouchersList.filter(isVoucherOverdue).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 font-display">Fee Payments & Receipts Ledger</h2>
            {overdueVouchersCount > 0 && (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
                title="Active students with past due fee vouchers"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{overdueVouchersCount} Student{overdueVouchersCount === 1 ? '' : 's'} Overdue</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified fee transactions credited to cash desk, Meezan Bank, and mobile accounts
          </p>
        </div>
        {canManageFinance && (
          <button
            onClick={() => {
              setNewPayment({
                voucher_id: vouchersList[0]?.id || '',
                amount: vouchersList[0] ? Math.max(0, vouchersList[0].total_payable - (vouchersList[0].paid_amount || 0)) : 0,
                payment_method: 'Cash',
                transaction_ref: '',
                payment_date: new Date().toISOString().split('T')[0],
                notes: ''
              });
              setRecordModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Record New Payment</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt #, student name, voucher #, transaction ref..."
            className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E1231]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E1231] bg-white"
          >
            <option value="">All Payment Modes</option>
            <option value="Cash">Cash Desk</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="JazzCash">JazzCash</option>
            <option value="EasyPaisa">EasyPaisa</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E1231] bg-white"
          >
            <option value="">All Statuses</option>
            <option value="valid">Valid (Credited)</option>
            <option value="voided">Voided (Reversed)</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Receipt #</th>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Voucher #</th>
                <th className="p-3.5">Amount Paid</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Trx Ref</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">Loading payments ledger...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">No payment records found.</td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const relatedVoucher = vouchersList.find((v) => v.id === p.voucher_id || (p.voucher_no && v.voucher_no === p.voucher_no));
                  const hasOverdueBalance = relatedVoucher ? isVoucherOverdue(relatedVoucher) : false;
                  const daysOverdue = relatedVoucher && hasOverdueBalance ? getDaysOverdue(relatedVoucher) : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{p.receipt_no}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{p.student_name}</span>
                          {hasOverdueBalance && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
                              title={`Student has overdue fee voucher (${daysOverdue}d late)`}
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                              <span>Overdue Fee</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.student_code}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{p.voucher_no}</td>
                      <td className="p-3.5 font-bold text-emerald-600 text-sm font-display">
                        {formatPKR(p.amount)}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-700">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{p.transaction_ref || '—'}</td>
                      <td className="p-3.5 text-slate-600">{formatDate(p.payment_date)}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === 'valid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 line-through'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenPrintReceipt(p.id)}
                            title="Print Official Payment Receipt"
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* NO-DELETE RULE: Void payment instead of deletion */}
                          {canManageFinance && p.status === 'valid' && (
                            <button
                              onClick={() => {
                                setVoidTarget(p);
                                setVoidReason('');
                              }}
                              title="Void Payment Receipt (With Mandatory Reason)"
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
                              setDeleteTarget({ id: p.id, name: `Receipt ${p.receipt_no} (${formatPKR(p.amount)})` });
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {recordModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setRecordModalOpen(false)}
          title="Record Fee Payment Receipt"
          subtitle="Direct credit to Institute Cashbook or Bank Account"
          maxWidth="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Pending Fee Voucher *</label>
              <select
                required
                value={newPayment.voucher_id}
                onChange={(e) => {
                  const vId = Number(e.target.value);
                  const v = vouchers.find((item) => item.id === vId);
                  setNewPayment({
                    ...newPayment,
                    voucher_id: vId,
                    amount: v ? Math.max(0, v.total_payable - (v.paid_amount || 0)) : 0
                  });
                }}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
              >
                <option value="">Select Voucher...</option>
                {vouchersList.map((v) => {
                  const rem = Math.max(0, v.total_payable - (v.paid_amount || 0));
                  const isVOverdue = isVoucherOverdue(v);
                  const dLate = isVOverdue ? getDaysOverdue(v) : 0;
                  return (
                    <option key={v.id} value={v.id}>
                      {isVOverdue ? `⚠️ [OVERDUE - ${dLate}d late] ` : ''}{v.voucher_no} – {v.student_name} (Due: {formatDate(v.due_date)} | Remaining: {formatPKR(rem)})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedVoucher && (() => {
              const isVOverdue = isVoucherOverdue(selectedVoucher);
              const dLate = isVOverdue ? getDaysOverdue(selectedVoucher) : 0;
              return (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Student</span>
                      <span className="font-bold text-slate-900">{selectedVoucher.student_name}</span>
                      <div className="text-[10px] text-slate-500 font-mono">{selectedVoucher.student_code}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Due Date</span>
                      <span className={`font-semibold ${isVOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                        {formatDate(selectedVoucher.due_date)}
                      </span>
                      <span className="text-slate-400 block text-[10px] mt-1">Remaining Balance</span>
                      <span className="font-bold text-rose-600 font-display">{formatPKR(remainingOnVoucher)}</span>
                    </div>
                  </div>

                  {isVOverdue && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-bold">Overdue Fee Notice:</span> This voucher is overdue by{' '}
                        <span className="font-bold underline">{dLate} day{dLate === 1 ? '' : 's'}</span> (due on {formatDate(selectedVoucher.due_date)}).
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Paid (PKR) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={remainingOnVoucher || undefined}
                  value={newPayment.amount ?? 0}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={newPayment.payment_date || ''}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={newPayment.payment_method || 'Cash'}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white font-medium"
                >
                  <option value="Cash">Cash Desk</option>
                  <option value="Bank Transfer">Bank Transfer (Al Habib / Bank Islami)</option>
                  <option value="JazzCash">JazzCash (0331-7155174)</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / Slip #</label>
                <input
                  type="text"
                  value={newPayment.transaction_ref || ''}
                  onChange={(e) => setNewPayment({ ...newPayment, transaction_ref: e.target.value })}
                  placeholder="e.g. TRX-987421"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
              <input
                type="text"
                value={newPayment.notes || ''}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                placeholder="Optional notes..."
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all"
              >
                {submitting ? 'Recording...' : 'Record Payment & Print Receipt'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Void Payment Modal (NO-DELETE RULE) */}
      {voidTarget && (
        <Modal
          isOpen={true}
          onClose={() => setVoidTarget(null)}
          title={`Void Payment Receipt: ${voidTarget.receipt_no}`}
          subtitle="Strict Accounting Integrity: Payment voiding reverts voucher balances and is logged"
          maxWidth="md"
        >
          <form onSubmit={handleVoidPayment} className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Reversal Confirmation</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Voiding this receipt ({formatPKR(voidTarget.amount)}) will immediately revert the voucher's paid amount and outstanding balance. A permanent audit log will be created.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reason for Payment Reversal *
              </label>
              <textarea
                rows={3}
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Bank cheque bounced / entry created under incorrect student name / duplicate transaction..."
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
                {voiding ? 'Reversing...' : 'Confirm Reversal & Void'}
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
          module="payments"
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
