import React, { useEffect, useState, useRef } from 'react';
import { Printer, Download, X, Building2, CheckCircle2, Scissors, Loader2, ExternalLink, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { FeeVoucher, SystemSettings } from '../../types.ts';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';
import { downloadVoucherAsPDF, generateVoucherPDF } from '../../lib/pdf.ts';
import { executeSmartPrint, isRunningInIframe } from '../../lib/smartPrint.ts';
import { DigiSkoolLogo } from './DigiSkoolLogo.tsx';

interface PrintVoucherModalProps {
  voucherId: number | null;
  onClose: () => void;
}

export const PrintVoucherModal: React.FC<PrintVoucherModalProps> = ({ voucherId, onClose }) => {
  const [data, setData] = useState<{ voucher: FeeVoucher & any; institute?: SystemSettings; previousBalance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [officeQrCodeUrl, setOfficeQrCodeUrl] = useState<string>('');
  const [studentQrCodeUrl, setStudentQrCodeUrl] = useState<string>('');
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    if (!voucherId) return;
    setLoading(true);
    setStatusMessage(null);
    hasAutoPrintedRef.current = false;
    apiRequest<{ voucher: FeeVoucher & any; institute?: SystemSettings; previousBalance: number }>(`/api/vouchers/${voucherId}`)
      .then((res) => {
        setData(res);
        if (res?.voucher) {
          const v = res.voucher;
          const officePayload = `https://myportal.digiskool.pk/verify?voucher=${encodeURIComponent(v.voucher_no)}&copy=office&student=${encodeURIComponent(v.student_code || v.student_id)}&campus=${encodeURIComponent(v.campus || 'Lahore')}`;
          const studentPayload = `https://myportal.digiskool.pk/verify?voucher=${encodeURIComponent(v.voucher_no)}&copy=student&student=${encodeURIComponent(v.student_code || v.student_id)}&amount=${v.total_payable}&campus=${encodeURIComponent(v.campus || 'Lahore')}`;

          QRCode.toDataURL(officePayload, {
            width: 300,
            margin: 1,
            color: { dark: '#1e293b', light: '#ffffff' },
            errorCorrectionLevel: 'M'
          })
            .then(url => {
              setOfficeQrCodeUrl(url);
              setQrCodeDataUrl(url);
            })
            .catch(e => console.error('Failed to generate office QR code:', e));

          QRCode.toDataURL(studentPayload, {
            width: 300,
            margin: 1,
            color: { dark: '#6E1231', light: '#ffffff' },
            errorCorrectionLevel: 'M'
          })
            .then(url => setStudentQrCodeUrl(url))
            .catch(e => console.error('Failed to generate student QR code:', e));
        }
      })
      .catch((err) => alert('Failed to load voucher: ' + err.message))
      .finally(() => setLoading(false));
  }, [voucherId]);

  const handlePrint = async () => {
    if (!data?.voucher) return;
    setPrinting(true);
    setStatusMessage(null);
    try {
      const res = await executeSmartPrint({
        elementId: 'printable-voucher',
        documentTitle: `Fee-Voucher-${data.voucher.voucher_no}`,
        fallbackPdfGenerator: () => {
          generateVoucherPDF(data.voucher, data.institute);
        }
      });
      if (res.method === 'pdf') {
        setStatusMessage('✓ Print-ready 2-part voucher PDF generated & downloaded! Open file to print directly.');
      } else {
        setStatusMessage('✓ Browser print dialog opened.');
      }
    } catch (err: any) {
      console.error('Print error:', err);
      generateVoucherPDF(data.voucher, data.institute);
      setStatusMessage('✓ Downloaded print-ready PDF.');
    } finally {
      setPrinting(false);
    }
  };

  // Auto trigger print dialog immediately when voucher is loaded and rendered
  useEffect(() => {
    if (!loading && data?.voucher && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      const t = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [loading, data]);

  const handleDownloadPDF = async () => {
    if (!data?.voucher) return;
    setDownloading(true);
    setStatusMessage(null);
    try {
      await downloadVoucherAsPDF(
        'printable-voucher',
        `Fee-Voucher-${data.voucher.voucher_no}.pdf`,
        data.voucher,
        data.institute
      );
      setStatusMessage('✓ PDF downloaded successfully.');
    } catch (err: any) {
      console.error('PDF download error:', err);
      generateVoucherPDF(data.voucher, data.institute);
      setStatusMessage('✓ Vector PDF downloaded.');
    } finally {
      setDownloading(false);
    }
  };

  const voucher = data?.voucher;
  const institute = data?.institute;

  // 2-Part Fee Voucher: Office Copy + Student Copy
  const copies = [
    { title: 'OFFICE COPY', subtitle: 'To be retained by DigiSkool Accounts & Admin Office' },
    { title: 'STUDENT COPY', subtitle: 'To be kept safely by the student for permanent record' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:m-0 print:bg-white print:static print:inset-auto print:overflow-visible print:block print:w-full print:h-auto">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:max-w-none print:shadow-none print:border-none print:rounded-none print:overflow-visible">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print px-5 sm:px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-sm font-bold font-display flex items-center gap-2">
                DigiSkool Official 2-Part Fee Voucher
                <span className="text-[10px] font-mono tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                  Office + Student Copy
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Voucher #{voucher?.voucher_no || 'Loading...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {isRunningInIframe() && (
              <a
                href={`${window.location.origin}${window.location.pathname}?print_voucher=${voucher?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-700/80 transition-colors"
                title="Open in a standalone tab for direct browser print dialog"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>Open in Tab</span>
              </a>
            )}
            <button
              onClick={handleDownloadPDF}
              disabled={loading || downloading || printing}
              className="px-3.5 py-1.5 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Download vector 2-part A4 landscape PDF"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
            <button
              id="print-voucher-action-btn"
              onClick={handlePrint}
              disabled={loading || printing || downloading}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Print voucher (2 copies on A4)"
            >
              {printing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  <span>Preparing Print...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5 text-rose-400" />
                  <span>Print 2-Part Voucher</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div className="no-print bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs font-medium text-emerald-800 flex items-center justify-between">
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

        {/* Voucher Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/70 flex-1">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">Loading voucher details...</div>
          ) : !voucher ? (
            <div className="py-20 text-center text-red-500 text-sm">Failed to load voucher data.</div>
          ) : (
            <div id="printable-voucher" className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200 print:border-none print:shadow-none print:p-0 print-preserve-white">
              {/* 2-Copy Grid Layout (Office Copy + Student Copy) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-5 relative">
                {/* Center Cut / Fold Guide */}
                <div className="hidden md:flex print:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center justify-center pointer-events-none z-10">
                  <div className="w-px h-full border-l border-dashed border-slate-300 print:border-slate-400"></div>
                  <span className="absolute bg-white px-2 py-0.5 text-[8px] font-mono tracking-widest text-slate-400 print:text-slate-600 uppercase rotate-90 whitespace-nowrap border border-slate-200 rounded">
                    ✂ Fold or Cut Here ✂
                  </span>
                </div>

                {copies.map((copy, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-300 rounded-xl p-4 text-[11px] flex flex-col justify-between relative bg-white shadow-2xs"
                  >
                    <div>
                      {/* Voucher Header with DigiSkool Maroon Branding */}
                      <div className="text-center pb-2.5 border-b border-slate-200">
                        <div className="flex justify-center mb-1">
                          <DigiSkoolLogo variant="horizontal" size="xs" />
                        </div>
                        <p className="text-[8px] text-slate-600 font-medium">
                          Campus: {institute?.campuses || 'Lahore & Okara'} | Contact: {institute?.phone || '0331-7155174'}
                        </p>
                        <div className="mt-1.5 py-0.5 px-3 bg-slate-900 text-white rounded-md text-[9px] font-bold tracking-wider uppercase inline-block">
                          {copy.title}
                        </div>
                      </div>

                      {/* Meta Information (Balanced 2-Column Details) */}
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-slate-700 text-[10.5px]">
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-500 font-medium">Voucher #:</span>
                          <span className="font-bold text-slate-900 font-mono">{voucher.voucher_no}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-500 font-medium">Issue Date:</span>
                          <span>{formatDate(voucher.issue_date)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-500 font-medium">Student ID:</span>
                          <span className="font-mono font-bold text-slate-900">{voucher.student_code || voucher.student_id}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-500 font-medium">Due Date:</span>
                          <span className="font-bold text-red-600 font-mono">{formatDate(voucher.due_date)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5 col-span-2">
                          <span className="text-slate-500 font-medium">Student Name:</span>
                          <span className="font-bold text-slate-900">{voucher.student_name}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5 col-span-2">
                          <span className="text-slate-500 font-medium">Father Name:</span>
                          <span>{voucher.father_name || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5 col-span-2">
                          <span className="text-slate-500 font-medium">Course Track:</span>
                          <span className="font-semibold text-slate-900">{voucher.course_name}</span>
                        </div>
                      </div>

                      {/* Fee Table */}
                      <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 px-2.5 py-1 flex justify-between font-bold text-slate-800 text-[10px]">
                          <span>Fee Description</span>
                          <span>Amount (PKR)</span>
                        </div>
                        <div className="p-2 space-y-1 text-[10px]">
                          <div className="flex justify-between text-slate-700">
                            <span>Tuition / Course Enrollment Fee:</span>
                            <span className="font-mono">{formatPKR(voucher.amount || voucher.total_payable)}</span>
                          </div>
                          {voucher.discount > 0 && (
                            <div className="flex justify-between text-emerald-600 font-medium">
                              <span>Scholarship / Discount Granted:</span>
                              <span className="font-mono">- {formatPKR(voucher.discount)}</span>
                            </div>
                          )}
                          {voucher.late_fee > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>Late Fee Surcharge:</span>
                              <span className="font-mono">+ {formatPKR(voucher.late_fee)}</span>
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-900 text-white px-2.5 py-1.5 flex justify-between font-black text-xs">
                          <span>TOTAL PAYABLE AMOUNT:</span>
                          <span className="font-mono text-rose-300">{formatPKR(voucher.total_payable)}</span>
                        </div>
                      </div>

                      {/* Payment History summary on voucher */}
                      <div className="mt-2.5 text-[9.5px] text-slate-600 flex justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span>Paid: <strong className="text-slate-900 font-mono">{formatPKR(voucher.paid_amount || 0)}</strong></span>
                        <span className="text-red-700">Remaining Balance: <strong className="font-mono">{formatPKR(Math.max(0, voucher.total_payable - (voucher.paid_amount || 0)))}</strong></span>
                      </div>

                      {/* Official Bank Deposit Accounts + Verifiable QR Code */}
                      <div className="mt-2.5 flex items-stretch gap-2">
                        <div className="flex-1 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[8.5px] space-y-1 text-slate-700">
                          <p className="font-bold text-[#6E1231] uppercase tracking-wide">Official Deposit Bank Accounts:</p>
                          <div className="border-b border-slate-200 pb-0.5">
                            <p className="font-semibold text-slate-800">• Bank Al Habib (Title: DIGISKOOL)</p>
                            <p className="font-mono text-slate-600">A/C: 57270081000203018 | IBAN: PK05BAHL5727008100020301</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">• Bank Islami (Title: DIGISKOOL)</p>
                            <p className="font-mono text-slate-600">A/C: 211100277400001 | IBAN: PK50BKIP0211100277400001</p>
                          </div>
                        </div>

                        {/* Verifiable QR Code Block */}
                        <div className="w-20 shrink-0 p-1.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center text-center">
                          {idx === 0 ? (
                            (officeQrCodeUrl || qrCodeDataUrl) ? (
                              <img
                                src={officeQrCodeUrl || qrCodeDataUrl}
                                alt="Office QR Code #1"
                                className="w-14 h-14 object-contain rounded bg-white p-0.5 border border-slate-300"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-slate-200 rounded animate-pulse" />
                            )
                          ) : (
                            (studentQrCodeUrl || qrCodeDataUrl) ? (
                              <img
                                src={studentQrCodeUrl || qrCodeDataUrl}
                                alt="Student QR Code #2"
                                className="w-14 h-14 object-contain rounded bg-white p-0.5 border border-rose-300"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-rose-100 rounded animate-pulse" />
                            )
                          )}
                          <span className={`text-[7px] font-bold mt-1 uppercase tracking-tighter ${idx === 0 ? 'text-slate-700' : 'text-[#6E1231]'}`}>
                            {idx === 0 ? 'Office QR #1' : 'Student QR #2'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Signatures */}
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <div className="flex justify-between text-[8.5px] text-slate-500 px-2">
                        <div className="text-center">
                          <div className="w-20 border-b border-slate-400 mb-1"></div>
                          <span>Cashier / Bank Stamp</span>
                        </div>
                        <div className="text-center">
                          <div className="w-20 border-b border-slate-400 mb-1"></div>
                          <span>Authorized Sign / Accounts</span>
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-400 text-center mt-2 italic">{copy.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
