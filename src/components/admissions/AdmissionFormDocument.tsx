import React from 'react';
import { DigiSkoolLogo } from '../common/DigiSkoolLogo.tsx';
import { SystemSettings } from '../../types.ts';

interface AdmissionFormDocumentProps {
  admission?: {
    admission_no?: string;
    course_name?: string;
    batch_name?: string;
    student_code?: string;
    full_name?: string;
    father_name?: string;
    gender?: string;
    marital_status?: string;
    date_of_birth?: string;
    nationality?: string;
    cnic_bform?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    qualification?: string;
    voucher_no?: string;
    final_payable?: number;
    admission_date?: string;
    campus?: string;
    city?: string;
    [key: string]: any;
  } | null;
  institute?: SystemSettings | null;
  isBlank?: boolean;
  campus?: 'Lahore' | 'Okara';
}

export const AdmissionFormDocument: React.FC<AdmissionFormDocumentProps> = ({
  admission,
  institute,
  isBlank = false,
  campus
}) => {
  const isMale = !isBlank && (admission?.gender?.toLowerCase() === 'male');
  const isFemale = !isBlank && (admission?.gender?.toLowerCase() === 'female');
  const isMarried = !isBlank && (admission?.marital_status?.toLowerCase() === 'married');
  const isSingle = !isBlank && (!admission?.marital_status || admission?.marital_status?.toLowerCase() === 'single');

  // Determine active campus
  const activeCampus: 'Lahore' | 'Okara' =
    campus ||
    (admission?.campus?.toLowerCase().includes('okara') || admission?.city?.toLowerCase() === 'okara'
      ? 'Okara'
      : 'Lahore');

  const campusInfo = activeCampus === 'Okara'
    ? {
        name: 'Okara Office (DGSO)',
        address: '185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara',
        phone: '+92 310-436-7347',
        code: 'DGSO',
        color: '#047857'
      }
    : {
        name: 'Lahore Campus (DGSL)',
        address: 'First Floor 12-C, Commercial Market, NFC Society Lahore',
        phone: '+92 331-715-5174',
        code: 'DGSL',
        color: '#6E1231'
      };

  return (
    <div
      id="digiskool-admission-form-sheet"
      className="bg-white text-black font-sans mx-auto p-6 sm:p-8 max-w-[210mm] w-full min-h-[297mm] shadow-lg print:shadow-none print:m-0 print:p-6 print:w-full print:max-w-none print:min-h-0 text-[13px] leading-tight select-text"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Top Header: Official Logo & Campus-Specific Details */}
      <div className="flex flex-col items-center justify-center mb-4 text-center">
        <DigiSkoolLogo
          size="xl"
          showCampusAndContact={false}
        />
        <div className="mt-2 text-center">
          <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-slate-900">
            DigiSkool Institute of Digital Skills
          </h2>
          <div className="inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full text-xs font-bold border border-slate-300 bg-slate-50">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: campusInfo.color }}></span>
            <span className="font-extrabold uppercase tracking-wider" style={{ color: campusInfo.color }}>
              {campusInfo.name}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">
            Campus Address: <strong>{campusInfo.address}</strong> | Phone: <strong>{campusInfo.phone}</strong> | Web: digiskool.pk
          </p>
        </div>
      </div>

      {/* Main Document Table Container with Solid High-Contrast Border */}
      <div className="border-2 border-black w-full divide-y-2 divide-black text-black">
        {/* Row 1: ADMISSION FORM & Ad . Number */}
        <div className="grid grid-cols-12 divide-x-2 divide-black items-center min-h-[44px]">
          <div className="col-span-7 sm:col-span-8 px-4 py-2 flex items-center justify-between">
            <h1 className="text-base sm:text-lg font-bold tracking-wider uppercase text-black flex items-center gap-2">
              <span>ADMISSION FORM</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-black/30 font-bold bg-slate-100">
                {campusInfo.code}
              </span>
            </h1>
          </div>
          <div className="col-span-5 sm:col-span-4 px-3 py-2 flex items-center gap-2">
            <span className="font-bold whitespace-nowrap text-xs sm:text-sm">Ad . Number</span>
            <div className="flex-1 font-mono font-bold text-sm text-[#6E1231] px-2 py-0.5 border border-black/30 text-center min-h-[26px]">
              {!isBlank && admission?.admission_no ? admission.admission_no : ''}
            </div>
          </div>
        </div>

        {/* Row 2: Course Applied for */}
        <div className="px-4 py-2.5 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap">Course Applied for:</span>
          <div className="flex-1 font-medium border-b border-black/70 px-2 pb-0.5 min-h-[20px] text-[#6E1231]">
            {!isBlank ? (admission?.course_name || '') : ''}
          </div>
        </div>

        {/* Row 3: Section Header - APPLICANT PERSONAL DETAILS */}
        <div className="bg-gray-100 px-4 py-1 text-center font-bold tracking-wider uppercase text-xs sm:text-sm text-black border-y border-black">
          APPLICANT PERSONAL DETAILS
        </div>

        {/* Row 4: Full Name */}
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">Full Name:</span>
          <div className="flex-1 font-medium border-b border-black/70 px-2 pb-0.5 min-h-[20px]">
            {!isBlank ? (admission?.full_name || admission?.student_name || '') : ''}
          </div>
        </div>

        {/* Row 5: Father/Husband Name */}
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">Father/Husband Name:</span>
          <div className="flex-1 font-medium border-b border-black/70 px-2 pb-0.5 min-h-[20px]">
            {!isBlank ? (admission?.father_name || '') : ''}
          </div>
        </div>

        {/* Row 6: Gender / Marital Status */}
        <div className="px-4 py-2 flex flex-wrap items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">Gender / Marital Status:</span>
          <div className="flex-1 flex items-center justify-between max-w-md gap-4">
            {/* Gender Options */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <span>Male</span>
                <span className="inline-flex items-center justify-center w-4 h-4 border border-black text-xs font-bold font-mono">
                  {isMale ? '✓' : ''}
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <span>Female</span>
                <span className="inline-flex items-center justify-center w-4 h-4 border border-black text-xs font-bold font-mono">
                  {isFemale ? '✓' : ''}
                </span>
              </label>
            </div>

            <span className="text-black font-bold">|</span>

            {/* Marital Status Options */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <span>Single</span>
                <span className="inline-flex items-center justify-center w-4 h-4 border border-black text-xs font-bold font-mono">
                  {isSingle ? '✓' : ''}
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <span>Married</span>
                <span className="inline-flex items-center justify-center w-4 h-4 border border-black text-xs font-bold font-mono">
                  {isMarried ? '✓' : ''}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Row 7: DOB / Nationality */}
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">DOB / Nationality:</span>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 border-b border-black/70 px-2 pb-0.5 text-center min-h-[20px]">
              {!isBlank ? (admission?.date_of_birth || '') : ''}
            </div>
            <span className="font-bold text-black">/</span>
            <div className="flex-1 border-b border-black/70 px-2 pb-0.5 text-center min-h-[20px]">
              {!isBlank ? (admission?.nationality || 'Pakistani') : ''}
            </div>
          </div>
        </div>

        {/* Row 8: CNIC No */}
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">CNIC No:</span>
          <div className="flex-1 font-mono tracking-wider border-b border-black/70 px-2 pb-0.5 min-h-[20px]">
            {!isBlank ? (admission?.cnic_bform || '') : ''}
          </div>
        </div>

        {/* Row 9: Email Address */}
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">Email Address:</span>
          <div className="flex-1 border-b border-black/70 px-2 pb-0.5 min-h-[20px]">
            {!isBlank ? (admission?.email || '') : ''}
          </div>
        </div>

        {/* Row 10: Cell / WhatsApp No */}
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">Cell / WhatsApp No:</span>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 font-mono border-b border-black/70 px-2 pb-0.5 text-center min-h-[20px]">
              {!isBlank ? (admission?.phone || '') : ''}
            </div>
            <span className="font-bold text-black">/</span>
            <div className="flex-1 font-mono border-b border-black/70 px-2 pb-0.5 text-center min-h-[20px]">
              {!isBlank ? (admission?.whatsapp || admission?.phone || '') : ''}
            </div>
          </div>
        </div>

        {/* Row 11: Postal Address */}
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">Postal Address:</span>
          <div className="flex-1 border-b border-black/70 px-2 pb-0.5 min-h-[20px]">
            {!isBlank ? (admission?.address || (admission?.city ? `${admission.city}, Pakistan` : '')) : ''}
          </div>
        </div>

        {/* Row 12: Applicant Signature */}
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">Applicant Signature:</span>
          <div className="flex-1 border-b border-black/70 min-h-[20px]"></div>
        </div>

        {/* Row 13: Section Header - EDUCATIONAL / PROFESSIONAL QUALIFICATIONS */}
        <div className="bg-gray-100 px-4 py-1 text-center font-bold tracking-wider uppercase text-xs sm:text-sm text-black border-y border-black">
          EDUCATIONAL / PROFESSIONAL QUALIFICATIONS
        </div>

        {/* Row 14: Academic / Prof. */}
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">Academic / Prof.:</span>
          <div className="flex-1 border-b border-black/70 px-2 pb-0.5 min-h-[20px]">
            {!isBlank ? (admission?.qualification || '') : ''}
          </div>
        </div>

        {/* Row 15: Section Header - FOR OFFICE USE ONLY */}
        <div className="bg-gray-100 px-4 py-1 text-center font-bold tracking-wider uppercase text-xs sm:text-sm text-black border-y border-black">
          FOR OFFICE USE ONLY
        </div>

        {/* Row 16: Batch / Admin No */}
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">Batch / Admin No:</span>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 font-medium border-b border-black/70 px-2 pb-0.5 text-center min-h-[20px]">
              {!isBlank ? (admission?.batch_name || admission?.batch_code || '') : ''}
            </div>
            <span className="font-bold text-black">/</span>
            <div className="flex-1 font-mono font-medium border-b border-black/70 px-2 pb-0.5 text-center min-h-[20px]">
              {!isBlank ? (admission?.student_code || admission?.admission_no || '') : ''}
            </div>
          </div>
        </div>

        {/* Row 17: Fee / Challan No */}
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="font-bold whitespace-nowrap w-44">Fee / Challan No:</span>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 font-medium border-b border-black/70 px-2 pb-0.5 text-center min-h-[20px]">
              {!isBlank && admission?.final_payable ? `PKR ${admission.final_payable.toLocaleString()}` : ''}
            </div>
            <span className="font-bold text-black">/</span>
            <div className="flex-1 font-mono font-medium border-b border-black/70 px-2 pb-0.5 text-center min-h-[20px]">
              {!isBlank ? (admission?.voucher_no || '') : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Director Signature & Verification */}
      <div className="mt-8 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="text-xs text-gray-500 max-w-sm">
          <p className="font-semibold text-gray-700">Official Institute Document</p>
          <p>{institute?.institute_name || 'DigiSkool-Institute of Digital Skills'}</p>
          <p>Campus: {institute?.campuses || 'Lahore & Okara'} • {institute?.phone || '0331-7155174'}</p>
        </div>

        <div className="text-left sm:text-right min-w-[200px]">
          <p className="font-bold text-sm text-black mb-6">Director Signature:</p>
          <div className="w-52 border-b border-black inline-block"></div>
        </div>
      </div>
    </div>
  );
};
