import React, { useEffect, useState, useRef } from 'react';
import { Printer, Download, X, FileText, CheckCircle2, Building2, Loader2, ExternalLink } from 'lucide-react';
import { AdmissionFormDocument } from './AdmissionFormDocument.tsx';
import { apiRequest } from '../../lib/api.ts';
import { generateAdmissionFormPDF } from '../../lib/pdf.ts';
import { executeSmartPrint, isRunningInIframe } from '../../lib/smartPrint.ts';
import { SystemSettings } from '../../types.ts';

interface PrintAdmissionFormModalProps {
  admissionId: number | string | null;
  onClose: () => void;
  isBlank?: boolean;
  initialCampus?: 'Lahore' | 'Okara';
}

export const PrintAdmissionFormModal: React.FC<PrintAdmissionFormModalProps> = ({
  admissionId,
  onClose,
  isBlank = false,
  initialCampus = 'Lahore'
}) => {
  const [data, setData] = useState<{ admission: any; institute?: SystemSettings } | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<'Lahore' | 'Okara'>(initialCampus);
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    setSelectedCampus(initialCampus);
  }, [initialCampus]);

  useEffect(() => {
    if (!admissionId && !isBlank) return;
    setLoading(true);
    hasAutoPrintedRef.current = false;
    const targetId = isBlank ? 'blank' : admissionId;
    apiRequest(`/api/admissions/${targetId}`)
      .then((res: any) => {
        setData(res);
        if (res?.admission?.campus?.toLowerCase().includes('okara') || res?.admission?.city?.toLowerCase() === 'okara') {
          setSelectedCampus('Okara');
        } else if (res?.admission?.campus?.toLowerCase().includes('lahore') || res?.admission?.city?.toLowerCase() === 'lahore') {
          setSelectedCampus('Lahore');
        }
      })
      .catch((err) => {
        console.error('Failed to load admission:', err);
        setData({
          admission: {
            admission_no: '',
            course_name: '',
            nationality: 'Pakistani',
            city: selectedCampus,
          },
        });
      })
      .finally(() => setLoading(false));
  }, [admissionId, isBlank]);

  const handlePrint = async () => {
    if (!data?.admission) return;
    setPrinting(true);
    setStatusMessage(null);
    try {
      const res = await executeSmartPrint({
        elementId: 'digiskool-admission-form-sheet',
        documentTitle: `DigiSkool-Admission-Form-${data.admission.admission_no || selectedCampus}`,
        fallbackPdfGenerator: () => {
          generateAdmissionFormPDF(data.admission, data.institute, selectedCampus);
        }
      });
      if (res.method === 'pdf') {
        setStatusMessage('✓ Official admission form generated & downloaded as A4 PDF! Open file to print.');
      } else {
        setStatusMessage('✓ Browser print dialog opened.');
      }
    } catch (err: any) {
      console.error('Print error:', err);
      generateAdmissionFormPDF(data.admission, data.institute, selectedCampus);
      setStatusMessage('✓ Admission Form downloaded as PDF.');
    } finally {
      setPrinting(false);
    }
  };

  // Auto trigger print dialog immediately upon form render
  useEffect(() => {
    if (!loading && data?.admission && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      const t = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [loading, data]);

  if (!admissionId && !isBlank) return null;

  const handleDownloadPDF = () => {
    if (data?.admission) {
      generateAdmissionFormPDF(data.admission, data.institute, selectedCampus);
      setStatusMessage('✓ Admission Form PDF downloaded.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6 print:p-0 print:m-0 print:bg-white print:static print:inset-auto print:overflow-visible print:block print:w-full">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col print:shadow-none print:rounded-none print:w-full print:border-none">
        {/* Action Header - Hidden during print */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-[#6E1231]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>{isBlank ? 'DigiSkool Official Admission Form' : `Admission Form - ${data?.admission?.admission_no || 'Document'}`}</span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  selectedCampus === 'Okara' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedCampus === 'Okara' ? 'Okara Campus (DGSO)' : 'Lahore Campus (DGSL)'}
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Official institutional admission template • Print ready (A4 Portrait)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {isRunningInIframe() && (
              <a
                href={`${window.location.origin}${window.location.pathname}?tab=admissions&print_admission=${admissionId || 'blank'}&campus=${selectedCampus}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-gray-300 transition-colors shadow-xs"
                title="Open in a standalone tab for direct browser print dialog"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Open in Tab</span>
              </a>
            )}

            {/* Dual Campus Selector Toggle */}
            <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedCampus('Lahore')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  selectedCampus === 'Lahore'
                    ? 'bg-[#6E1231] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Lahore (DGSL)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCampus('Okara')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  selectedCampus === 'Okara'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Okara (DGSO)</span>
              </button>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={printing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              title="Download as high quality PDF"
            >
              <Download className="w-3.5 h-3.5 text-[#6E1231]" />
              <span>Download PDF</span>
            </button>
            <button
              id="print-admission-form-btn"
              onClick={handlePrint}
              disabled={printing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6E1231] hover:bg-[#85173A] rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              title="Print directly"
            >
              {printing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Form</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors ml-1 cursor-pointer"
              title="Close modal"
            >
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

        {/* Document Content Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/70 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {loading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-gray-500">
              <div className="w-8 h-8 border-3 border-[#6E1231] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Preparing official admission document...</p>
            </div>
          ) : (
            <AdmissionFormDocument
              admission={data?.admission}
              institute={data?.institute}
              isBlank={isBlank}
              campus={selectedCampus}
            />
          )}
        </div>
      </div>
    </div>
  );
};
