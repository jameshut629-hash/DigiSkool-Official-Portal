import React, { useState, useEffect } from 'react';
import { 
  X, 
  GraduationCap, 
  Building2, 
  CheckCircle2, 
  Download, 
  CreditCard, 
  Banknote, 
  Loader2, 
  Printer, 
  Phone, 
  Mail, 
  User, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { DigiSkoolLogo } from '../common/DigiSkoolLogo.tsx';
import { executeSmartPrint } from '../../lib/smartPrint.ts';
import { generateAdmissionFormPDF } from '../../lib/pdf.ts';

interface PublicAdmissionModalProps {
  initialCampus: 'Lahore' | 'Okara';
  onClose: () => void;
}

export const PublicAdmissionModal: React.FC<PublicAdmissionModalProps> = ({ initialCampus, onClose }) => {
  const [campus, setCampus] = useState<'Lahore' | 'Okara'>(initialCampus);
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [cnic, setCnic] = useState('');
  const [gender, setGender] = useState('Male');
  const [qualification, setQualification] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(initialCampus);
  const [courseId, setCourseId] = useState<number | ''>('');
  const [studyMode, setStudyMode] = useState<'On Campus' | 'Online'>('On Campus');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online'>('Cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [printingDoc, setPrintingDoc] = useState(false);

  // Fetch courses
  useEffect(() => {
    async function loadPublicCourses() {
      try {
        const res = await fetch('/api/public/courses');
        const data = await res.json();
        setCourses(data);
        if (data.length > 0) {
          setCourseId(data[0].id);
        }
      } catch (err: any) {
        setError('Failed to load courses. Please try again.');
      } finally {
        setLoadingCourses(false);
      }
    }
    loadPublicCourses();
  }, []);

  const selectedCourse = courses.find((c) => c.id === Number(courseId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName || !phone || !courseId) {
      setError('Please fill out your name, contact phone, and course selection.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          father_name: fatherName,
          phone,
          whatsapp: whatsapp || phone,
          email,
          cnic_bform: cnic,
          gender,
          qualification,
          address,
          city: city || (campus === 'Okara' ? 'Okara' : 'Lahore'),
          campus: campus === 'Okara' ? 'Okara Campus' : 'Lahore Campus',
          course_id: Number(courseId),
          study_mode: studyMode,
          payment_method: paymentMethod,
          transaction_ref: transactionRef
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit admission application.');
      }

      setSubmissionSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = async () => {
    if (!submissionSuccess) return;
    setPrintingDoc(true);
    try {
      await executeSmartPrint({
        elementId: 'public-admission-success-card',
        documentTitle: `DigiSkool-Admission-${submissionSuccess.admission_no}`,
        fallbackPdfGenerator: () => {
          generateAdmissionFormPDF({
            admission_no: submissionSuccess.admission_no,
            student_name: submissionSuccess.student_name,
            course_name: submissionSuccess.course,
            fee_amount: submissionSuccess.fee_amount,
            campus: submissionSuccess.campus,
            voucher_no: submissionSuccess.voucher_no
          }, undefined, submissionSuccess.campus?.toLowerCase().includes('okara') ? 'Okara' : 'Lahore');
        }
      });
    } catch {
      generateAdmissionFormPDF({
        admission_no: submissionSuccess.admission_no,
        student_name: submissionSuccess.student_name,
        course_name: submissionSuccess.course,
        fee_amount: submissionSuccess.fee_amount,
        campus: submissionSuccess.campus,
        voucher_no: submissionSuccess.voucher_no
      }, undefined, submissionSuccess.campus?.toLowerCase().includes('okara') ? 'Okara' : 'Lahore');
    } finally {
      setPrintingDoc(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#6E1231] to-rose-900 text-white shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Online Admission Application
              </h2>
              <p className="text-xs text-slate-400">
                Official Digital Admission Portal • DigiSkool Institute of Digital Skills
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {submissionSuccess ? (
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Admission Application Confirmed!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Welcome to DigiSkool! Your student ID, enrollment file, and official document vouchers have been generated.
              </p>
            </div>

            {/* Official Admission Card (App Preview exact layout) */}
            <div id="public-admission-success-card" className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 print:border-black print:text-black">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <DigiSkoolLogo variant="white" size="sm" />
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-[#6E1231]/30 text-rose-300 border border-[#6E1231]/40">
                  {submissionSuccess.student_id}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Student Name:</span>
                  <span className="font-bold text-white">{submissionSuccess.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Campus:</span>
                  <span className="font-bold text-emerald-400">{submissionSuccess.campus}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Course:</span>
                  <span className="font-bold text-white">{submissionSuccess.course_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Admission No:</span>
                  <span className="font-mono text-slate-300">{submissionSuccess.admission_no}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Fee Voucher No:</span>
                  <span className="font-mono text-amber-300 font-bold">{submissionSuccess.voucher_no}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Course Fee:</span>
                  <span className="font-bold text-emerald-400">PKR {Number(submissionSuccess.total_payable).toLocaleString()}</span>
                </div>
              </div>

              {submissionSuccess.receipt ? (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Payment Verified Online
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{submissionSuccess.receipt.receipt_no}</span>
                  </div>
                  <p className="text-[11px] text-emerald-400/80 mt-1">
                    Receipt issued for PKR {Number(submissionSuccess.receipt.amount).toLocaleString()} via Online Transfer (Ref: {submissionSuccess.receipt.transaction_ref}).
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">Payment Option: Cash at Campus Counter</span>
                    <span className="font-mono text-amber-400">Voucher Status: Unpaid</span>
                  </div>
                  <p className="text-[11px] text-amber-400/80 mt-1">
                    Please visit the {submissionSuccess.campus} admissions counter with this voucher number to finalize your fee and collect your class admission card.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={printingDoc}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {printingDoc ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing PDF...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Print / Download PDF</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 rounded-xl bg-[#6E1231] hover:bg-[#85173A] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#6E1231]/30 transition-all cursor-pointer"
              >
                <span>Done &amp; Close</span>
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            
            {/* Campus Selection Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Institutional Campus:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setCampus('Lahore'); setCity('Lahore'); }}
                  className={`py-3 px-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    campus === 'Lahore'
                      ? 'bg-gradient-to-r from-[#6E1231]/40 to-rose-950/60 border-[#6E1231] text-white shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className={`w-4 h-4 ${campus === 'Lahore' ? 'text-rose-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">Lahore Campus</div>
                      <div className="text-[10px] text-slate-400">Code: DGSL • Main Center</div>
                    </div>
                  </div>
                  {campus === 'Lahore' && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => { setCampus('Okara'); setCity('Okara'); }}
                  className={`py-3 px-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    campus === 'Okara'
                      ? 'bg-gradient-to-r from-amber-900/40 to-amber-950/60 border-amber-600 text-white shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className={`w-4 h-4 ${campus === 'Okara' ? 'text-amber-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">Okara Campus</div>
                      <div className="text-[10px] text-slate-400">Code: DGSO • Regional Center</div>
                    </div>
                  </div>
                  {campus === 'Okara' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Personal Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800">
                1. Student Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Muhammad Bilal"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#6E1231] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Father / Guardian Name
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="e.g. Muhammad Tariq"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#6E1231] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Mobile Phone (Calls &amp; SMS) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#6E1231] focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#6E1231] focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@gmail.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#6E1231] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    CNIC / B-Form Number
                  </label>
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="35202-XXXXXXX-X"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#6E1231] focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-[#6E1231] focus:outline-hidden"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Last Qualification
                  </label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. Matric / Inter / BS / Master"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#6E1231] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Course & Academic Selection */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800">
                2. Course &amp; Study Mode
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Select Digital Skill Course *
                  </label>
                  {loadingCourses ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading courses...</span>
                    </div>
                  ) : (
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-[#6E1231] focus:outline-hidden"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} - PKR {Number(c.fee).toLocaleString()} ({c.duration})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Learning Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStudyMode('On Campus')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                        studyMode === 'On Campus'
                          ? 'bg-[#6E1231]/30 border-[#6E1231] text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      On Campus ({campus})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudyMode('Online')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                        studyMode === 'Online'
                          ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Online / Live Zoom
                    </button>
                  </div>
                </div>
              </div>

              {selectedCourse && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Selected Program:</span>
                    <span className="font-bold text-white">{selectedCourse.name}</span>
                    <span className="text-slate-500 text-[11px] block">{selectedCourse.duration}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Total Fee:</span>
                    <span className="text-base font-bold text-emerald-400">
                      PKR {Number(selectedCourse.fee).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800">
                3. Admission Fee Payment
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'Cash'
                      ? 'bg-amber-950/30 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Cash at Campus Counter</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Pay in cash directly at the {campus} Campus counter upon showing your voucher.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Online')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'Online'
                      ? 'bg-emerald-950/30 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Online Bank / JazzCash / EasyPaisa</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Pay digitally via Bank Transfer, JazzCash or EasyPaisa and get instant receipt.
                  </p>
                </button>
              </div>

              {paymentMethod === 'Online' && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-900/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>DigiSkool Official Account:</span>
                    <strong className="text-emerald-400">Meezan Bank / JazzCash: 0331-7155174</strong>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Online Transaction ID / Reference No.
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. TID-982348123 or JazzCash Ref"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                Application Code Prefix: <strong className="text-slate-200">{campus === 'Okara' ? 'DGSO-2026' : 'DGSL-2026'}</strong>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#6E1231] hover:bg-[#85173A] text-white text-xs font-bold shadow-lg shadow-[#6E1231]/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Online Admission</span>
                      <GraduationCap className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
