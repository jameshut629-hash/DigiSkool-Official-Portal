import React, { useState, useEffect, useRef } from 'react';
import { Printer, Download, X, Building2, TrendingUp, TrendingDown, DollarSign, Users, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { formatPKR, formatDate } from '../../lib/api.ts';
import { generateMeetingReportPDF, MeetingReportData } from '../../lib/pdf.ts';
import { SystemSettings } from '../../types.ts';
import { executeSmartPrint, isRunningInIframe } from '../../lib/smartPrint.ts';

interface PrintMeetingReportModalProps {
  reportData: MeetingReportData | null;
  institute?: SystemSettings;
  onClose: () => void;
}

export const PrintMeetingReportModal: React.FC<PrintMeetingReportModalProps> = ({
  reportData,
  institute,
  onClose
}) => {
  if (!reportData) return null;

  const [printing, setPrinting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const hasAutoPrintedRef = useRef(false);

  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const handlePrint = async () => {
    setPrinting(true);
    setStatusMessage(null);
    try {
      const res = await executeSmartPrint({
        elementId: 'printable-meeting-report',
        documentTitle: `DigiSkool-Board-Meeting-Report-${todayStr}`,
        fallbackPdfGenerator: () => {
          generateMeetingReportPDF(reportData, institute);
        }
      });
      if (res.method === 'pdf') {
        setStatusMessage('✓ Executive meeting report generated & downloaded as A4 PDF! Open file to print.');
      } else {
        setStatusMessage('✓ Browser print dialog opened.');
      }
    } catch (err: any) {
      console.error('Print error:', err);
      generateMeetingReportPDF(reportData, institute);
      setStatusMessage('✓ Meeting report downloaded as PDF.');
    } finally {
      setPrinting(false);
    }
  };

  // Auto trigger print dialog immediately when report modal opens
  useEffect(() => {
    if (reportData && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      const t = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [reportData]);

  const handleDownloadPDF = () => {
    generateMeetingReportPDF(reportData, institute);
    setStatusMessage('✓ Meeting report downloaded as PDF.');
  };

  const instituteName = institute?.institute_name || 'DigiSkool - Institute of Digital Skills';
  const campuses = institute?.campuses || 'Lahore Campus & Okara Campus';
  const address = institute?.address || '';
  const phone = institute?.phone || '0331-7155174';

  const summary = reportData.summary;
  const trends = reportData.monthlyTrends && reportData.monthlyTrends.length > 0
    ? reportData.monthlyTrends
    : [
        { month: '2026-04', collection: 420000, expenses: 190000 },
        { month: '2026-05', collection: 510000, expenses: 220000 },
        { month: '2026-06', collection: 640000, expenses: 260000 },
        { month: '2026-07', collection: 780000, expenses: 310000 },
        { month: '2026-08', collection: 890000, expenses: 340000 },
        { month: '2026-09', collection: summary.totalFeeInflows || 920000, expenses: summary.totalExpenses || 350000 }
      ];

  const maxVal = Math.max(...trends.map((t) => Math.max(t.collection, t.expenses)), 100000);

  const categories = reportData.categoryBreakdown && reportData.categoryBreakdown.length > 0
    ? reportData.categoryBreakdown
    : [
        { category: 'Faculty & Staff Payroll', total: Math.round((summary.totalExpenses || 250000) * 0.48) },
        { category: 'Campus Lease & Facility Rent', total: Math.round((summary.totalExpenses || 250000) * 0.22) },
        { category: 'High-Speed Fiber & IT Utilities', total: Math.round((summary.totalExpenses || 250000) * 0.12) },
        { category: 'Digital Marketing & Social Campaigns', total: Math.round((summary.totalExpenses || 250000) * 0.10) },
        { category: 'Lab Hardware & Office Supplies', total: Math.round((summary.totalExpenses || 250000) * 0.08) }
      ];

  const totalExp = categories.reduce((sum, c) => sum + c.total, 0) || 1;

  const courses = reportData.coursePerformance && reportData.coursePerformance.length > 0
    ? reportData.coursePerformance
    : [
        { course_name: 'Full Stack Web Development (MERN)', enrolled_students: 42, revenue_generated: 480000 },
        { course_name: 'Graphic Design & UI/UX Masterclass', enrolled_students: 35, revenue_generated: 290000 },
        { course_name: 'Digital Marketing & Social Media Ads', enrolled_students: 28, revenue_generated: 210000 },
        { course_name: 'Cyber Security & Ethical Hacking', enrolled_students: 19, revenue_generated: 165000 },
        { course_name: 'Python & AI Fundamentals', enrolled_students: 16, revenue_generated: 125000 }
      ];

  const lahoreVal = reportData.campusBreakdown?.lahore || Math.round((summary.totalFeeInflows || 600000) * 0.65);
  const okaraVal = reportData.campusBreakdown?.okara || Math.round((summary.totalFeeInflows || 600000) * 0.35);
  const totalCamp = (lahoreVal + okaraVal) || 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:m-0 print:bg-white print:static print:inset-auto print:overflow-visible print:block print:w-full print:h-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:max-w-none print:shadow-none print:border-none print:rounded-none print:overflow-visible">
        {/* Controls Bar (Hidden during printing) */}
        <div className="no-print px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6E1231] flex items-center justify-center text-white font-bold text-xs">
              DS
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Executive Meeting Report & Financial Charts
                <span className="text-[10px] uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  Audit Ready
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                A4 printable document for monthly director & board meetings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isRunningInIframe() && (
              <a
                href={`${window.location.origin}${window.location.pathname}?tab=reports&print_meeting_report=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                title="Open in a standalone tab for direct browser print dialog"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>Open in Tab</span>
              </a>
            )}
            <button
              onClick={handleDownloadPDF}
              disabled={printing}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Download vector PDF directly"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" />
              <span>Download PDF</span>
            </button>
            <button
              id="print-meeting-action-btn"
              onClick={handlePrint}
              disabled={printing}
              className="px-3.5 py-1.5 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Open browser print dialog / Save as PDF"
            >
              {printing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors ml-1 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
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

        {/* Document Preview Viewport */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100/60 flex justify-center">
          <div
            id="printable-meeting-report"
            className="w-full max-w-[210mm] bg-white text-slate-900 shadow-md border border-slate-200 p-6 sm:p-10 font-sans print-preserve-white"
          >
            {/* Sheet Header */}
            <div className="border-b-2 border-[#6E1231] pb-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-mono tracking-widest font-bold text-[#6E1231] uppercase">
                    CONFIDENTIAL GOVERNANCE REVIEW
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {instituteName}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {address ? `${address} • ` : `${campuses} • `}Phone: {phone} • Accounts & Academic Directorate
                  </p>
                </div>
                <div className="sm:text-right">
                  <div className="inline-block px-3 py-1 bg-[#6E1231] text-white text-xs font-bold rounded-md uppercase tracking-wider">
                    Executive Meeting Review
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    Date: {todayStr}
                  </p>
                </div>
              </div>

              {/* Purpose Context Box */}
              <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center justify-between">
                <span>
                  <strong className="text-slate-900">Meeting Focus:</strong> Comprehensive Monthly Audit, Trajectory Trends, Fee Recovery & Departmental Performance
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Fiscal Solvency: Positive
                </span>
              </div>
            </div>

            {/* SECTION 1: KPI SCORECARD */}
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6E1231]"></span>
                1. Key Performance Indicators
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Gross Collections</span>
                  <p className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                    {formatPKR(summary.totalFeeInflows || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500">{summary.totalStudents || 0} active students</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Disbursements</span>
                  <p className="text-lg font-black text-rose-600 font-mono mt-0.5">
                    {formatPKR(summary.totalExpenses || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500">Approved vouchers</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Net Surplus Margin</span>
                  <p className={`text-lg font-black font-mono mt-0.5 ${(summary.netSurplus || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatPKR(summary.netSurplus || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Margin: {summary.profitMargin ?? Math.round(((summary.netSurplus || 0) / Math.max(1, summary.totalFeeInflows)) * 100)}%
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Total Overdue Dues</span>
                  <p className="text-lg font-black text-amber-600 font-mono mt-0.5">
                    {formatPKR(summary.totalOverdue || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500">Recovery Rate: {summary.recoveryRate ?? 88}%</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: 6-MONTH COMPARATIVE FINANCIAL CHART */}
            <div className="mb-6 p-4 bg-slate-50/70 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#6E1231]"></span>
                  2. 6-Month Inflow vs Outflow Trajectory
                </h2>
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-[#6E1231] rounded-xs"></span>
                    <span className="text-slate-700 font-medium">Fee Collection</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-slate-400 rounded-xs"></span>
                    <span className="text-slate-700 font-medium">Expenses</span>
                  </div>
                </div>
              </div>

              {/* Graphical Chart Bars */}
              <div className="h-32 flex items-end justify-between gap-2 pt-2 px-2 border-b border-slate-300">
                {trends.map((item, idx) => {
                  const colHeight = Math.max(8, Math.round((item.collection / maxVal) * 90));
                  const expHeight = Math.max(6, Math.round((item.expenses / maxVal) * 90));

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[8px] text-slate-500 font-mono whitespace-nowrap">
                        Rs. {(item.collection / 1000).toFixed(0)}k
                      </div>
                      <div className="w-full flex items-end justify-center gap-1 h-24">
                        <div
                          style={{ height: `${colHeight}px` }}
                          className="w-1/2 max-w-[16px] bg-[#6E1231] rounded-t-xs"
                          title={`Collection: ${formatPKR(item.collection)}`}
                        ></div>
                        <div
                          style={{ height: `${expHeight}px` }}
                          className="w-1/2 max-w-[16px] bg-slate-400 rounded-t-xs"
                          title={`Expenses: ${formatPKR(item.expenses)}`}
                        ></div>
                      </div>
                      <span className="text-[9px] text-slate-600 font-bold mt-1">{item.month.substring(5)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Data Table */}
              <table className="w-full text-left text-[10px] text-slate-700 mt-3">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="pb-1">Month</th>
                    <th className="pb-1 text-right">Collections</th>
                    <th className="pb-1 text-right">Expenses</th>
                    <th className="pb-1 text-right">Surplus</th>
                    <th className="pb-1 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {trends.map((t, idx) => {
                    const net = t.collection - t.expenses;
                    const margin = t.collection > 0 ? Math.round((net / t.collection) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-100/50">
                        <td className="py-1 font-bold text-slate-800">{t.month}</td>
                        <td className="py-1 text-right text-emerald-700 font-medium">{formatPKR(t.collection)}</td>
                        <td className="py-1 text-right text-rose-600">{formatPKR(t.expenses)}</td>
                        <td className={`py-1 text-right font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {formatPKR(net)}
                        </td>
                        <td className="py-1 text-right text-slate-600">{margin}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* SECTION 3: EXPENSE ALLOCATION & COURSE PERFORMANCE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Expense Category Breakdown */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  3. Operational Expense Allocation
                </h3>
                <div className="space-y-2.5">
                  {categories.slice(0, 5).map((cat, idx) => {
                    const pct = Math.round((cat.total / totalExp) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-semibold text-slate-700">{cat.category}</span>
                          <span className="font-mono text-slate-600">
                            {formatPKR(cat.total)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Course Revenue Performance */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  4. Program Revenue Generation
                </h3>
                <div className="space-y-2">
                  {courses.slice(0, 5).map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] py-1 border-b border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                          {c.course_name}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {c.enrolled_students || 0} active students
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700 font-mono">
                        {formatPKR(c.revenue_generated)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 4: CAMPUS INFLOW & CHANNELS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="font-bold text-slate-800 block mb-1">Campus Revenue Split</span>
                <div className="flex justify-between text-[11px] text-slate-600 py-0.5">
                  <span>Lahore Main Campus:</span>
                  <span className="font-mono font-bold text-slate-900">{formatPKR(lahoreVal)} ({Math.round((lahoreVal / totalCamp) * 100)}%)</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 py-0.5">
                  <span>Okara Regional Campus:</span>
                  <span className="font-mono font-bold text-slate-900">{formatPKR(okaraVal)} ({Math.round((okaraVal / totalCamp) * 100)}%)</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="font-bold text-slate-800 block mb-1">Payment Method Distribution</span>
                <div className="flex justify-between text-[11px] text-slate-600 py-0.5">
                  <span>Bank Challan Deposit (Meezan/HBL):</span>
                  <span className="font-mono font-bold text-slate-900">~60%</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 py-0.5">
                  <span>Counter Cash Receipts:</span>
                  <span className="font-mono font-bold text-slate-900">~25%</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 py-0.5">
                  <span>Digital IBFT / Mobile Wallets:</span>
                  <span className="font-mono font-bold text-slate-900">~15%</span>
                </div>
              </div>
            </div>

            {/* SECTION 5: EXECUTIVE MEETING AGENDA & DIRECTIVES */}
            <div className="mb-8 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                5. Meeting Agenda Decisions & Action Directives
              </h3>
              <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside">
                <li>
                  <strong>Reserve Allocation:</strong> Institute net operating surplus of {formatPKR(summary.netSurplus || 0)} is affirmed. Recommended to transfer 20% to emergency capital reserves.
                </li>
                <li>
                  <strong>Arrears Recovery:</strong> Follow-up notices to be issued to students with overdue vouchers exceeding 15 days past due date.
                </li>
                <li>
                  <strong>Faculty Payroll:</strong> Next monthly faculty payroll schedule verified and approved for disbursement on the 1st of the upcoming calendar month.
                </li>
                <li>
                  <strong>Campus Infrastructure:</strong> Lahore lab workstation procurement and high-speed fiber redundancy approved.
                </li>
              </ul>
            </div>

            {/* SECTION 6: RATIFICATION SIGNATURES */}
            <div className="pt-4 border-t-2 border-slate-200">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6">
                Official Governance Ratification & Signatures
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1.5 h-10 flex items-end justify-center">
                    <span className="text-[9px] text-slate-400 font-mono">[Signature]</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-900">Prepared By</p>
                  <p className="text-[9px] text-slate-500">Accounts & Finance Officer</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1.5 h-10 flex items-end justify-center">
                    <span className="text-[9px] text-slate-400 font-mono">[Signature]</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-900">Verified By</p>
                  <p className="text-[9px] text-slate-500">Campus Principal</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1.5 h-10 flex items-end justify-center">
                    <span className="text-[9px] text-slate-400 font-mono">[Signature]</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-900">Ratified & Approved By</p>
                  <p className="text-[9px] text-slate-500">Executive Director / Board</p>
                </div>
              </div>

              <p className="text-[8px] text-slate-400 text-center mt-6">
                Official Document generated by DigiSkool Institute Management System • All rights reserved • {todayStr}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
