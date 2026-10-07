import React, { useEffect, useState, useRef } from 'react';
import { Printer, Download, X, Receipt, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { Expense, SystemSettings } from '../../types.ts';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';
import { generateExpenseVoucherPDF } from '../../lib/pdf.ts';
import { executeSmartPrint, isRunningInIframe } from '../../lib/smartPrint.ts';

interface PrintExpenseVoucherModalProps {
  expenseId: number | null;
  onClose: () => void;
}

export const PrintExpenseVoucherModal: React.FC<PrintExpenseVoucherModalProps> = ({ expenseId, onClose }) => {
  const [data, setData] = useState<{ expense: Expense & any; institute?: SystemSettings } | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    if (!expenseId) return;
    setLoading(true);
    setStatusMessage(null);
    hasAutoPrintedRef.current = false;
    apiRequest(`/api/expenses/${expenseId}/voucher`)
      .then((res) => setData(res))
      .catch((err) => alert('Failed to load expense voucher: ' + err.message))
      .finally(() => setLoading(false));
  }, [expenseId]);

  if (!expenseId) return null;

  const expense = data?.expense;

  const handlePrint = async () => {
    if (!expense) return;
    setPrinting(true);
    setStatusMessage(null);
    try {
      const res = await executeSmartPrint({
        elementId: 'printable-expense-voucher',
        documentTitle: `Expense-Voucher-${expense.expense_no}`,
        fallbackPdfGenerator: () => {
          generateExpenseVoucherPDF(expense, data?.institute);
        }
      });
      if (res.method === 'pdf') {
        setStatusMessage('✓ Official expense disbursement voucher generated & downloaded as PDF! Open file to print.');
      } else {
        setStatusMessage('✓ Browser print dialog opened.');
      }
    } catch (err: any) {
      console.error('Print error:', err);
      generateExpenseVoucherPDF(expense, data?.institute);
      setStatusMessage('✓ Expense voucher downloaded as PDF.');
    } finally {
      setPrinting(false);
    }
  };

  // Auto trigger print dialog immediately upon expense voucher load
  useEffect(() => {
    if (!loading && expense && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      const t = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [loading, expense]);

  const handleDownloadPDF = () => {
    if (expense) {
      generateExpenseVoucherPDF(expense, data?.institute);
      setStatusMessage('✓ Expense voucher PDF downloaded.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:m-0 print:bg-white print:static print:inset-auto print:overflow-visible print:block print:w-full print:h-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:max-w-none print:shadow-none print:border-none print:rounded-none print:overflow-visible">
        {/* Controls Header */}
        <div className="no-print px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-400" />
            <div>
              <h3 className="text-sm font-bold font-display">DigiSkool Expense Disbursement Voucher</h3>
              <p className="text-[11px] text-slate-400">Voucher #{expense?.expense_no || '...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {isRunningInIframe() && (
              <a
                href={`${window.location.origin}${window.location.pathname}?print_expense=${expense?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                title="Open in a standalone tab for direct browser print dialog"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>Open in Tab</span>
              </a>
            )}
            <button
              onClick={handleDownloadPDF}
              disabled={loading || printing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              id="print-expense-action-btn"
              onClick={handlePrint}
              disabled={loading || printing}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {printing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </>
              )}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div className="no-print bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs font-medium text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Voucher Content */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex-1 flex justify-center">
          {loading ? (
            <div className="py-20 text-slate-500 text-sm">Loading voucher details...</div>
          ) : !expense ? (
            <div className="py-20 text-red-500 text-sm">Voucher details unavailable.</div>
          ) : (
            <div id="printable-expense-voucher" className="w-full max-w-lg bg-white border border-slate-300 rounded-xl p-6 shadow-sm relative text-slate-900 print:border-none print:shadow-none print:p-2">
              {/* Header */}
              <div className="text-center pb-4 border-b border-slate-200">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">DIGISKOOL INSTITUTE OF DIGITAL SKILLS</span>
                <h2 className="text-xl font-extrabold font-display text-slate-900 mt-0.5">DigiSkool</h2>
                <p className="text-xs text-slate-600">
                  {(expense.campus || '').toLowerCase().includes('okara')
                    ? '185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara | Accounts & Finance Division'
                    : 'First Floor 12-C, Commercial Market, NFC Society Lahore | Accounts & Finance Division'}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-800 border border-red-200 rounded-full text-xs font-bold">
                  PAYMENT DISBURSEMENT VOUCHER
                </div>
              </div>

              {/* Expense Details */}
              <div className="mt-4 grid grid-cols-2 gap-y-2.5 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[11px]">Voucher No:</span>
                  <span className="font-bold text-slate-900 font-mono">{expense.expense_no}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Voucher Date:</span>
                  <span className="font-semibold text-slate-900">{formatDate(expense.date)}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Category:</span>
                  <span className="font-semibold text-slate-900 px-2 py-0.5 bg-slate-100 rounded inline-block">{expense.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Status:</span>
                  <span className="font-bold text-emerald-700 uppercase">{expense.status}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Paid To (Payee):</span>
                  <span className="font-bold text-slate-900">{expense.paid_to}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Payment Mode:</span>
                  <span className="font-medium text-slate-900">{expense.payment_method}</span>
                </div>

                {expense.reference_no && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Bill / Reference No:</span>
                    <span className="font-mono text-slate-700">{expense.reference_no}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Particulars / Description</span>
                <p className="text-xs text-slate-800 leading-relaxed">{expense.description}</p>
              </div>

              {/* Amount Banner */}
              <div className="mt-4 p-4 bg-red-50/50 border border-red-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-red-700 block">TOTAL DISBURSED AMOUNT</span>
                  <span className="text-2xl font-black text-red-600 font-display">{formatPKR(expense.amount)}</span>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span>Chargeable to DigiSkool Operational Expenses</span>
                </div>
              </div>

              {/* 4 Signatures */}
              <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-4 gap-2 text-center text-[10px] text-slate-600">
                <div>
                  <div className="border-b border-slate-300 pb-1 mb-1 font-medium">{expense.prepared_by_name || 'Accounts Officer'}</div>
                  <span className="text-slate-400">Prepared By</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-1 mb-1 font-medium">Finance Admin</div>
                  <span className="text-slate-400">Checked By</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-1 mb-1 font-medium">{expense.approved_by_name || 'Institute Owner'}</div>
                  <span className="text-slate-400">Approved By</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-1 mb-1 font-medium">{expense.paid_to}</div>
                  <span className="text-slate-400">Received By</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
