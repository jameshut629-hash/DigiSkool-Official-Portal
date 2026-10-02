import React, { useEffect, useState, useRef } from 'react';
import { Printer, Download, X, CheckCircle, ShieldCheck, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { Payment, SystemSettings } from '../../types.ts';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';
import { generateReceiptPDF } from '../../lib/pdf.ts';
import { executeSmartPrint, isRunningInIframe } from '../../lib/smartPrint.ts';
import { DigiSkoolLogo } from './DigiSkoolLogo.tsx';

interface PrintReceiptModalProps {
  paymentId: number | null;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ paymentId, onClose }) => {
  const [data, setData] = useState<{ payment: Payment & any; institute?: SystemSettings } | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    if (!paymentId) return;
    setLoading(true);
    setStatusMessage(null);
    hasAutoPrintedRef.current = false;
    apiRequest(`/api/payments/${paymentId}/receipt`)
      .then((res) => setData(res))
      .catch((err) => alert('Failed to load receipt: ' + err.message))
      .finally(() => setLoading(false));
  }, [paymentId]);

  if (!paymentId) return null;

  const payment = data?.payment;

  const handlePrint = async () => {
    if (!payment) return;
    setPrinting(true);
    setStatusMessage(null);
    try {
      const res = await executeSmartPrint({
        elementId: 'printable-receipt',
        documentTitle: `Payment-Receipt-${payment.receipt_no}`,
        fallbackPdfGenerator: () => {
          generateReceiptPDF(payment, data?.institute);
        }
      });
      if (res.method === 'pdf') {
        setStatusMessage('✓ Official payment receipt generated & downloaded as PDF! Open file to print.');
      } else {
        setStatusMessage('✓ Browser print dialog opened.');
      }
    } catch (err: any) {
      console.error('Print error:', err);
      generateReceiptPDF(payment, data?.institute);
      setStatusMessage('✓ Receipt downloaded as PDF.');
    } finally {
      setPrinting(false);
    }
  };

  // Auto trigger print dialog immediately upon receipt load
  useEffect(() => {
    if (!loading && payment && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      const t = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [loading, payment]);

  const handleDownloadPDF = () => {
    if (payment) {
      generateReceiptPDF(payment, data?.institute);
      setStatusMessage('✓ Receipt PDF downloaded.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:m-0 print:bg-white print:static print:inset-auto print:overflow-visible print:block print:w-full print:h-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:max-w-none print:shadow-none print:border-none print:rounded-none print:overflow-visible">
        {/* Actions bar */}
        <div className="no-print px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold font-display">DigiSkool Official Payment Receipt</h3>
              <p className="text-[11px] text-slate-400">Receipt #{payment?.receipt_no || '...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {isRunningInIframe() && (
              <a
                href={`${window.location.origin}${window.location.pathname}?print_receipt=${payment?.id}`}
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
              id="print-receipt-action-btn"
              onClick={handlePrint}
              disabled={loading || printing}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {printing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
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

        {/* Receipt Container */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex-1 flex justify-center">
          {loading ? (
            <div className="py-20 text-slate-500 text-sm">Loading receipt details...</div>
          ) : !payment ? (
            <div className="py-20 text-red-500 text-sm">Receipt details unavailable.</div>
          ) : (
            <div id="printable-receipt" className="w-full max-w-lg bg-white border border-slate-300 rounded-xl p-6 shadow-sm relative text-slate-900 print:border-none print:shadow-none print:p-2">
              {/* Header */}
              <div className="text-center pb-4 border-b border-slate-200">
                <div className="flex justify-center mb-1.5">
                  <DigiSkoolLogo variant="horizontal" size="md" />
                </div>
                <p className="text-xs text-slate-700 font-medium">Campus: <strong>Lahore & Okara</strong></p>
                <p className="text-xs text-slate-500 mt-0.5">Contact: <strong className="font-mono text-slate-700">0331-7155174</strong> | Website: digiskool.pk</p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  OFFICIAL FEE PAYMENT RECEIPT
                </div>
              </div>

              {/* Receipt Details */}
              <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[11px]">Receipt Number:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{payment.receipt_no}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Payment Date:</span>
                  <span className="font-semibold text-slate-900">{formatDate(payment.payment_date)}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Student ID / Name:</span>
                  <span className="font-bold text-slate-900 block">{payment.student_name}</span>
                  <span className="text-[11px] text-slate-500 font-mono">{payment.student_code || payment.student_id}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Father / Guardian:</span>
                  <span className="font-medium text-slate-900">{payment.father_name || '—'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Enrolled Course:</span>
                  <span className="font-medium text-slate-900">{payment.course_name || 'Digital Skills Course'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Batch:</span>
                  <span className="font-medium text-slate-900">{payment.batch_name || 'Assigned Batch'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Payment Method:</span>
                  <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded inline-block mt-0.5">{payment.payment_method}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Trx Reference:</span>
                  <span className="font-mono text-slate-600">{payment.transaction_ref || 'N/A'}</span>
                </div>
              </div>

              {/* Amount Banner */}
              <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">TOTAL AMOUNT RECEIVED</span>
                  <span className="text-2xl font-black text-slate-900 font-display">{formatPKR(payment.amount)}</span>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded text-xs font-extrabold uppercase ${
                    payment.status === 'valid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              {payment.notes && (
                <div className="mt-3 text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/50">
                  <span className="font-semibold text-amber-800">Note: </span>
                  {payment.notes}
                </div>
              )}

              {/* Terms */}
              <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-500 space-y-0.5">
                <p>• Fees once paid are non-refundable and non-transferable according to DigiSkool policy.</p>
                <p>• This receipt acts as official proof of payment for class admissions and examinations.</p>
              </div>

              {/* Signatures */}
              <div className="mt-8 pt-4 flex justify-between text-xs text-slate-600">
                <div className="text-center">
                  <div className="w-28 border-b border-slate-400 mb-1"></div>
                  <span className="text-[11px]">Student Signature</span>
                </div>
                <div className="text-center">
                  <div className="w-28 border-b border-slate-400 mb-1"></div>
                  <span className="text-[11px]">Accounts Officer</span>
                  <span className="block text-[9px] text-slate-400">({payment.received_by_name || 'DigiSkool Desk'})</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
