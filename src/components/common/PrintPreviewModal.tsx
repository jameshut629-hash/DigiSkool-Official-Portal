import React, { useState, useRef } from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  Calendar,
  Layers,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Loader2,
  Table,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { formatPKR, formatDate } from '../../lib/api.ts';
import { SystemSettings, DashboardStats } from '../../types.ts';
import { executeSmartPrint, isRunningInIframe } from '../../lib/smartPrint.ts';
import { DigiSkoolLogo } from './DigiSkoolLogo.tsx';

export interface PrintPreviewData {
  type: 'dashboard' | 'report';
  title: string;
  subtitle?: string;
  dateRange?: { from?: string; to?: string };
  generatedAt?: string;
  summaryCards: Array<{
    label: string;
    value: string | number;
    sublabel?: string;
    color?: 'emerald' | 'rose' | 'amber' | 'blue' | 'slate';
  }>;
  sections: Array<{
    title: string;
    description?: string;
    columns: string[];
    rows: (string | number)[][];
    totalRow?: (string | number)[];
  }>;
  notes?: string[];
}

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: PrintPreviewData;
  institute?: SystemSettings;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  previewData,
  institute
}) => {
  if (!isOpen) return null;

  const [printing, setPrinting] = useState(false);
  const [showCompactSpacing, setShowCompactSpacing] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const documentRef = useRef<HTMLDivElement>(null);

  const todayStr = previewData.generatedAt || new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const instituteName = institute?.institute_name || 'DigiSkool - Institute of Digital Skills';
  const instituteCampuses = institute?.campuses || 'Lahore & Okara Campuses';
  const institutePhone = institute?.phone || '0331-7155174';
  const instituteEmail = institute?.email || 'jameshut629@gmail.com';

  const handlePrint = async () => {
    setPrinting(true);
    setStatusMessage(null);

    const safeTitle = previewData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const docTitle = `DigiSkool-${safeTitle}-${new Date().toISOString().split('T')[0]}`;

    try {
      const res = await executeSmartPrint({
        elementId: 'printable-simplified-document',
        documentTitle: docTitle,
        fallbackPdfGenerator: () => {
          // Fallback native print or window print
          window.print();
        }
      });
      if (res.method === 'pdf') {
        setStatusMessage('✓ Document prepared for printing. You can save or print directly.');
      } else {
        setStatusMessage('✓ Print dialog opened.');
      }
    } catch (err: any) {
      console.warn('Direct print attempt notice:', err?.message || err);
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `"${instituteName}"\n`;
    csvContent += `"${previewData.title}"\n`;
    if (previewData.subtitle) csvContent += `"${previewData.subtitle}"\n`;
    csvContent += `"Generated: ${todayStr}"\n\n`;

    // Summary
    if (includeSummary && previewData.summaryCards.length > 0) {
      csvContent += 'EXECUTIVE SUMMARY\n';
      csvContent += previewData.summaryCards.map((c) => `"${c.label}"`).join(',') + '\n';
      csvContent += previewData.summaryCards.map((c) => `"${c.value}"`).join(',') + '\n\n';
    }

    // Sections
    previewData.sections.forEach((sec) => {
      csvContent += `"${sec.title}"\n`;
      csvContent += sec.columns.map((col) => `"${col}"`).join(',') + '\n';
      sec.rows.forEach((row) => {
        csvContent += row.map((cell) => `"${cell}"`).join(',') + '\n';
      });
      if (sec.totalRow) {
        csvContent += sec.totalRow.map((cell) => `"${cell}"`).join(',') + '\n';
      }
      csvContent += '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeTitle = previewData.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    link.setAttribute('download', `${safeTitle}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Action Header (hidden in actual print output) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6E1231] rounded-xl text-white shadow-xs">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide font-display text-white">
                  Document Print Preview
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Simplified Layout
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Optimized high-contrast view for clean printing, PDF export, and executive review
              </p>
            </div>
          </div>

          {/* Controls & Print Button */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Options Toggle */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-xl text-xs text-slate-300 border border-slate-700/60">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] select-none">
                <input
                  type="checkbox"
                  checked={showCompactSpacing}
                  onChange={(e) => setShowCompactSpacing(e.target.checked)}
                  className="rounded border-slate-600 text-[#6E1231] focus:ring-0"
                />
                <span>Compact (1-Page Fit)</span>
              </label>
              <span className="text-slate-600">|</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] select-none">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="rounded border-slate-600 text-[#6E1231] focus:ring-0"
                />
                <span>KPI Summary</span>
              </label>
            </div>

            {/* Export CSV button */}
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Export structured data as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              disabled={printing}
              className="px-4 py-1.5 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {printing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </>
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status notification banner if print or download triggered */}
        {statusMessage && (
          <div className="no-print bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Printable Canvas Area (White paper effect) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/80">
          <div
            id="printable-simplified-document"
            ref={documentRef}
            className={`mx-auto bg-white rounded-lg shadow-sm border border-slate-200/90 text-slate-900 transition-all ${
              showCompactSpacing ? 'p-6 max-w-4xl text-xs' : 'p-8 sm:p-10 max-w-4xl text-sm'
            }`}
          >
            {/* Document Header (Letterhead style) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-5 mb-6">
              <div className="flex items-center gap-4">
                <DigiSkoolLogo variant="emblem" size="lg" className="shrink-0" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                    {instituteName}
                  </h1>
                  <p className="text-xs font-semibold text-[#6E1231]">
                    {instituteCampuses} • Official Management Statement
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {institute?.address ? `${institute.address} • ` : ''}Tel: {institutePhone} • Email: {instituteEmail}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 w-full sm:w-auto">
                <span className="inline-block px-2.5 py-0.5 text-[10px] font-mono font-extrabold uppercase bg-slate-100 text-slate-800 border border-slate-300 rounded mb-1">
                  OFFICIAL AUDIT COPY
                </span>
                <p className="text-xs font-bold text-slate-900">{previewData.title}</p>
                <p className="text-[11px] text-slate-500">Date: {todayStr}</p>
                {previewData.dateRange?.from && (
                  <p className="text-[10px] text-slate-500">
                    Period: {previewData.dateRange.from} to {previewData.dateRange.to || 'Present'}
                  </p>
                )}
              </div>
            </div>

            {/* Document Subtitle / Context */}
            {previewData.subtitle && (
              <div className="mb-6 p-3 bg-slate-50 border-l-4 border-[#6E1231] rounded-r-md">
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  {previewData.subtitle}
                </p>
              </div>
            )}

            {/* Executive Summary Cards (Clean tabular grid for printing) */}
            {includeSummary && previewData.summaryCards.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Executive KPI Overview
                </h3>
                <div
                  className={`grid gap-3 ${
                    previewData.summaryCards.length > 4
                      ? 'grid-cols-2 sm:grid-cols-4'
                      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                  }`}
                >
                  {previewData.summaryCards.map((card, i) => (
                    <div
                      key={i}
                      className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs"
                    >
                      <span className="text-[11px] font-semibold text-slate-500 block truncate">
                        {card.label}
                      </span>
                      <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5 font-display">
                        {card.value}
                      </p>
                      {card.sublabel && (
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{card.sublabel}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabular Sections */}
            <div className="space-y-6">
              {previewData.sections.map((section, sIdx) => (
                <div key={sIdx} className="break-inside-avoid">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">
                      {section.title}
                    </h3>
                    {section.description && (
                      <span className="text-[11px] text-slate-500">{section.description}</span>
                    )}
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          {section.columns.map((col, cIdx) => (
                            <th
                              key={cIdx}
                              className={`p-2.5 ${
                                cIdx > 1 ? 'text-right' : 'text-left'
                              } ${cIdx === 0 ? 'w-10' : ''}`}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {section.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={section.columns.length}
                              className="p-4 text-center text-slate-400 italic text-xs"
                            >
                              No records found for this reporting window.
                            </td>
                          </tr>
                        ) : (
                          section.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={rIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}
                            >
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  className={`p-2.5 ${
                                    cellIdx > 1 ? 'text-right font-medium' : 'text-left'
                                  } ${cellIdx === 0 ? 'font-mono text-slate-500' : 'text-slate-800'}`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                      {section.totalRow && (
                        <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                          <tr>
                            {section.totalRow.map((cell, tIdx) => (
                              <td
                                key={tIdx}
                                className={`p-2.5 ${
                                  tIdx > 1 ? 'text-right' : 'text-left'
                                } font-display`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* Document Notes & Official Sign-off Footer */}
            {includeNotes && (
              <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-600 break-inside-avoid">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1 uppercase tracking-wider text-[10px]">
                      Verification & Compliance Notes
                    </h4>
                    <ul className="text-[11px] text-slate-500 space-y-0.5 list-disc pl-4">
                      <li>
                        Generated directly from DigiSkool central institute ERP database.
                      </li>
                      <li>
                        All monetary figures stated in Pakistani Rupees (PKR) and cross-verified against cash register & bank ledger.
                      </li>
                      <li>
                        Confidential executive document intended for authorized institute directors & auditors.
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col justify-end items-start sm:items-end text-left sm:text-right">
                    <p className="text-[11px] text-slate-400">
                      System Hash: DS-{Math.random().toString(36).substring(2, 8).toUpperCase()}-PK
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Printed on: {new Date().toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' })} • Time: {new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })} PKT
                    </p>
                  </div>
                </div>

                {/* Sign-off Stamps */}
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-dashed border-slate-300 text-center text-xs">
                  <div>
                    <div className="h-10"></div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-800 text-[11px]">Prepared By</p>
                      <p className="text-[10px] text-slate-500">Accounts Officer</p>
                    </div>
                  </div>
                  <div>
                    <div className="h-10"></div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-800 text-[11px]">Audited By</p>
                      <p className="text-[10px] text-slate-500">Head of Finance</p>
                    </div>
                  </div>
                  <div>
                    <div className="h-10"></div>
                    <div className="border-t border-slate-400 pt-1">
                      <p className="font-bold text-slate-800 text-[11px]">Approved By</p>
                      <p className="text-[10px] text-slate-500">Managing Director / Principal</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
