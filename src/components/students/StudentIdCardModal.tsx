import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  QrCode,
  Building2,
  Phone,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  User,
  ExternalLink
} from 'lucide-react';
import QRCode from 'qrcode';
import { Student } from '../../types.ts';
import { formatDate } from '../../lib/api.ts';
import { DigiSkoolLogo } from '../common/DigiSkoolLogo.tsx';

interface StudentIdCardModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
}

export const StudentIdCardModal: React.FC<StudentIdCardModalProps> = ({
  student,
  isOpen,
  onClose,
  onOpenScanner
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [secondQrCodeDataUrl, setSecondQrCodeDataUrl] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!student || !isOpen) return;

    // 1. Generate crisp primary QR code for Student ID scanning
    const qrPayload = student.student_id || student.registration_no || String(student.id);
    QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate student ID QR code:', err));

    // 2. Generate Second QR Code for Digital Portal & Student Verification link
    const secondPayload = `https://myportal.digiskool.pk/verify?std=${encodeURIComponent(student.student_id || String(student.id))}&reg=${encodeURIComponent(student.registration_no || '')}`;
    QRCode.toDataURL(secondPayload, {
      width: 400,
      margin: 1,
      color: {
        dark: '#6E1231', // Maroon institutional color
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => setSecondQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate second verification QR code:', err));
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Download QR Code directly as a PNG
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `QR_${student.student_id || student.full_name}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#6E1231]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Official Student ID Card & Verifiable QR
              </h3>
              <p className="text-[11px] text-slate-500">
                Ready for physical printing, badge lamination, and camera verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Card</span>
            </button>

            {onOpenScanner && (
              <button
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Test with Camera Scanner"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Test Scanner</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Card Area */}
        <div className="p-4 sm:p-8 flex flex-col items-center justify-center bg-slate-100/60 print:bg-white print:p-0">
          <div
            ref={cardRef}
            id="printable-student-id-card"
            className="w-full max-w-md bg-white rounded-2xl border-2 border-slate-300 shadow-lg overflow-hidden relative print:shadow-none print:border-slate-800"
          >
            {/* Top Brand Banner */}
            <div className="bg-gradient-to-r from-[#500c22] via-[#6E1231] to-[#8d193f] p-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs">
                  <DigiSkoolLogo variant="emblem" size="xs" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wider uppercase font-display leading-tight">
                    DigiSkool Institute
                  </h4>
                  <p className="text-[9px] text-rose-200 uppercase tracking-widest font-semibold">
                    Student Identity Card
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 tracking-wider">
                  {student.campus || 'Main Campus'}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 sm:p-5 flex gap-4 items-start">
              {/* Left: Student Photo Avatar + ID */}
              <div className="flex flex-col items-center shrink-0 w-28 text-center">
                <div className="w-24 h-28 rounded-xl bg-slate-100 border-2 border-slate-200 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                  <User className="w-12 h-12 text-slate-400 stroke-1" />
                  <span className="text-[9px] text-slate-400 font-medium mt-1">Photo</span>
                  <div className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[8px] py-0.5 font-bold uppercase tracking-wider">
                    {student.status || 'Active'}
                  </div>
                </div>

                <span className="mt-2 text-[10px] font-mono font-black text-slate-900 tracking-wider bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 w-full truncate">
                  {student.student_id}
                </span>
              </div>

              {/* Right: Student Information Details */}
              <div className="flex-1 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Student Name
                  </span>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    {student.full_name}
                  </h3>
                </div>

                {student.father_name && (
                  <div>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase block">
                      Father / Guardian
                    </span>
                    <p className="text-[11px] font-semibold text-slate-700">
                      {student.father_name}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase block">
                      Registration #
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {student.registration_no || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase block">
                      Admission Date
                    </span>
                    <span className="font-medium text-slate-800">
                      {student.admission_date ? formatDate(student.admission_date) : 'N/A'}
                    </span>
                  </div>
                </div>

                {student.phone && (
                  <div className="text-[11px]">
                    <span className="text-[9px] text-slate-400 font-semibold uppercase block">
                      Emergency Phone
                    </span>
                    <span className="font-mono font-medium text-slate-800 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      {student.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Bar: Dual QR Codes + Verification Stamp */}
            <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* QR Code #1: Student ID Badge Scanner */}
                <div className="flex flex-col items-center">
                  {qrCodeDataUrl ? (
                    <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-xs shrink-0">
                      <img
                        src={qrCodeDataUrl}
                        alt="Student ID QR Code"
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-200 rounded-lg animate-pulse" />
                  )}
                  <span className="text-[7.5px] font-bold text-slate-600 mt-0.5 uppercase tracking-tighter">
                    ID Scan QR #1
                  </span>
                </div>

                {/* QR Code #2: Digital Portal & Online Verification Link */}
                <div className="flex flex-col items-center">
                  {secondQrCodeDataUrl ? (
                    <div className="p-1 bg-white border border-rose-300 rounded-lg shadow-xs shrink-0">
                      <img
                        src={secondQrCodeDataUrl}
                        alt="Digital Portal QR Code #2"
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-200 rounded-lg animate-pulse" />
                  )}
                  <span className="text-[7.5px] font-bold text-[#6E1231] mt-0.5 uppercase tracking-tighter">
                    Portal QR #2
                  </span>
                </div>

                <div className="hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dual Verifiable Badges</span>
                  </p>
                  <p className="text-[9px] text-slate-500 max-w-[150px] leading-tight mt-0.5">
                    Scan QR 1 for ID badge, scan QR 2 for live official DigiSkool verification portal.
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[8px] font-mono text-slate-400 block uppercase">
                  DigiSkool IMS
                </span>
                <span className="text-[8px] text-slate-400 block font-bold">
                  Valid 2025–2026
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Actions / Info */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
          <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>QR Code contains: <strong>{student.student_id}</strong></span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download QR Code</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
