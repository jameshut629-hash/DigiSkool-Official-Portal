import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  Receipt,
  UserCheck,
  ArrowRight,
  BookOpen,
  DollarSign,
  Printer,
  FileText,
  Download
} from 'lucide-react';
import { Admission, Course, Batch, Student } from '../../types.ts';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useCampus } from '../../context/CampusContext.tsx';
import { Modal } from '../common/Modal.tsx';
import { PrintAdmissionFormModal } from './PrintAdmissionFormModal.tsx';
import { generateAdmissionFormPDF } from '../../lib/pdf.ts';

interface AdmissionsViewProps {
  onOpenPrintVoucher: (id: number) => void;
  onOpenPrintReceipt: (id: number) => void;
}

export const AdmissionsView: React.FC<AdmissionsViewProps> = ({ onOpenPrintVoucher, onOpenPrintReceipt }) => {
  const { canManageStudents } = useAuth();
  const { selectedCampus, setSelectedCampus } = useCampus();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [campusFilter, setCampusFilter] = useState<'all' | 'lahore' | 'okara'>(
    selectedCampus === 'lahore' ? 'lahore' : selectedCampus === 'okara' ? 'okara' : 'all'
  );

  useEffect(() => {
    if (selectedCampus === 'lahore' || selectedCampus === 'okara' || selectedCampus === 'all') {
      setCampusFilter(selectedCampus);
    }
  }, [selectedCampus]);

  // Print modal state
  const [printAdmissionId, setPrintAdmissionId] = useState<number | string | null>(null);
  const [isBlankFormModal, setIsBlankFormModal] = useState(false);
  const [blankFormCampus, setBlankFormCampus] = useState<'Lahore' | 'Okara'>('Lahore');

  // Wizard modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [admissionSuccess, setAdmissionSuccess] = useState<any | null>(null);

  // Campus selection for admission
  const [admissionCampus, setAdmissionCampus] = useState<'Lahore' | 'Okara'>('Lahore');

  // Form state
  const [studentMode, setStudentMode] = useState<'new' | 'existing'>('new');
  const [existingStudentId, setExistingStudentId] = useState<number | ''>('');

  // New student fields matching Official DigiSkool Admission Form
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [maritalStatus, setMaritalStatus] = useState<'Single' | 'Married'>('Single');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('Pakistani');
  const [cnic, setCnic] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lahore');
  const [qualification, setQualification] = useState('');

  // Course & Batch
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [selectedBatchId, setSelectedBatchId] = useState<number | ''>('');

  // Financial fields
  const [discount, setDiscount] = useState<number>(0);
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'installments'>('full');
  const [initialPayment, setInitialPayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Al Habib' | 'Bank Islami' | 'Bank Transfer'>('Cash');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [adms, crs, bts, stds] = await Promise.all([
        apiRequest<any>('/api/admissions'),
        apiRequest<any>('/api/courses'),
        apiRequest<any>('/api/batches'),
        apiRequest<any>('/api/students')
      ]);
      const validAdms = Array.isArray(adms)
        ? adms
        : (Array.isArray(adms?.admissions) ? adms.admissions : (Array.isArray(adms?.data) ? adms.data : []));
      const validCrs = Array.isArray(crs)
        ? crs
        : (Array.isArray(crs?.courses) ? crs.courses : (Array.isArray(crs?.data) ? crs.data : []));
      const validBts = Array.isArray(bts)
        ? bts
        : (Array.isArray(bts?.batches) ? bts.batches : (Array.isArray(bts?.data) ? bts.data : []));
      const validStds = Array.isArray(stds)
        ? stds
        : (Array.isArray(stds?.students) ? stds.students : (Array.isArray(stds?.data) ? stds.data : []));

      setAdmissions(validAdms);
      setCourses(validCrs);
      setBatches(validBts);
      setStudents(validStds);
    } catch (err: any) {
      console.error('Failed to load admissions data:', err);
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const coursesList = Array.isArray(courses) ? courses : [];
  const batchesList = Array.isArray(batches) ? batches : [];
  const selectedCourse = coursesList.find((c) => c.id === Number(selectedCourseId));
  const availableBatches = batchesList.filter((b) => !selectedCourseId || b.course_id === Number(selectedCourseId));

  const courseFee = selectedCourse?.fee || 0;
  const finalPayable = Math.max(0, courseFee - (Number(discount) || 0));

  const resetForm = () => {
    setStudentMode('new');
    setExistingStudentId('');
    setFullName('');
    setFatherName('');
    setGender('Male');
    setMaritalStatus('Single');
    setDateOfBirth('');
    setNationality('Pakistani');
    setCnic('');
    setEmail('');
    setPhone('');
    setWhatsapp('');
    setAddress('');
    setCity('Lahore');
    setQualification('');
    setSelectedCourseId('');
    setSelectedBatchId('');
    setDiscount(0);
    setPaymentPlan('full');
    setInitialPayment(0);
    setPaymentMethod('Cash');
    setNotes('');
    setAdmissionCampus('Lahore');
    setAdmissionSuccess(null);
  };

  const handleCreateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      alert('Please select a Course.');
      return;
    }

    if (studentMode === 'new' && (!fullName.trim() || !phone.trim())) {
      alert('Student Full Name and Phone are required.');
      return;
    }

    if (studentMode === 'existing' && !existingStudentId) {
      alert('Please select an existing student.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiRequest('/api/admissions', {
        method: 'POST',
        body: JSON.stringify({
          student_mode: studentMode,
          existing_student_id: existingStudentId || null,
          full_name: fullName,
          father_name: fatherName,
          gender,
          marital_status: maritalStatus,
          date_of_birth: dateOfBirth,
          nationality,
          cnic_bform: cnic,
          email,
          phone,
          whatsapp: whatsapp || phone,
          address,
          city: city || (admissionCampus === 'Okara' ? 'Okara' : 'Lahore'),
          campus: admissionCampus === 'Okara' ? 'Okara Campus' : 'Lahore Campus',
          qualification,
          course_id: selectedCourseId,
          batch_id: selectedBatchId || null,
          admission_date: new Date().toISOString().split('T')[0],
          discount: Number(discount) || 0,
          payment_plan: paymentPlan,
          initial_payment: Number(initialPayment) || 0,
          payment_method: paymentMethod,
          notes
        })
      });

      setAdmissionSuccess(result);
      loadData();
    } catch (err: any) {
      alert('Failed to process admission: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const admissionsList = Array.isArray(admissions) ? admissions : [];

  const isOkaraAdmission = (a: any) =>
    Boolean(a.campus?.toLowerCase().includes('okara') || a.admission_no?.toLowerCase().includes('dgso') || a.city?.toLowerCase() === 'okara');

  // Lahore and Okara separate datasets
  const lahoreAdmissionsList = admissionsList.filter((a) => !isOkaraAdmission(a));
  const okaraAdmissionsList = admissionsList.filter((a) => isOkaraAdmission(a));

  // Separate metrics
  const lahoreTotalFee = lahoreAdmissionsList.reduce((acc, a) => acc + (Number(a.final_payable) || 0), 0);
  const lahoreInitialPaid = lahoreAdmissionsList.reduce((acc, a) => acc + (Number(a.initial_payment) || 0), 0);
  const okaraTotalFee = okaraAdmissionsList.reduce((acc, a) => acc + (Number(a.final_payable) || 0), 0);
  const okaraInitialPaid = okaraAdmissionsList.reduce((acc, a) => acc + (Number(a.initial_payment) || 0), 0);

  const filteredAdmissions = admissionsList.filter((a) => {
    if (!a) return false;

    // Campus separation filter
    if (campusFilter === 'lahore' && isOkaraAdmission(a)) return false;
    if (campusFilter === 'okara' && !isOkaraAdmission(a)) return false;

    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (a.admission_no && a.admission_no.toLowerCase().includes(s)) ||
      (a.student_name && a.student_name.toLowerCase().includes(s)) ||
      (a.course_name && a.course_name.toLowerCase().includes(s)) ||
      (a.student_phone && a.student_phone.includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">Admissions Desk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Student course enrollments, official admission forms, automatic fee vouchers, and payment processing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Dual Campus Blank Printable Forms */}
          <button
            onClick={() => {
              setBlankFormCampus('Lahore');
              setIsBlankFormModal(true);
              setPrintAdmissionId('blank');
            }}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-[#6E1231] border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Print blank official admission form for Lahore Campus (DGSL)"
          >
            <Printer className="w-3.5 h-3.5 text-[#6E1231]" />
            <span>Print Lahore Form (DGSL)</span>
          </button>

          <button
            onClick={() => {
              setBlankFormCampus('Okara');
              setIsBlankFormModal(true);
              setPrintAdmissionId('blank');
            }}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Print blank official admission form for Okara Campus (DGSO)"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-700" />
            <span>Print Okara Form (DGSO)</span>
          </button>

          {canManageStudents && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  resetForm();
                  setAdmissionCampus('Lahore');
                  setCity('Lahore');
                  setIsWizardOpen(true);
                }}
                className="px-3.5 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#6E1231]/20 transition-all cursor-pointer"
                title="Process new student admission for Lahore Campus"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Lahore Admission (DGSL)</span>
              </button>

              <button
                onClick={() => {
                  resetForm();
                  setAdmissionCampus('Okara');
                  setCity('Okara');
                  setIsWizardOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
                title="Process new student admission for Okara Campus"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Okara Admission (DGSO)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CAMPUS FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pl-1">
          <span>Campus Filter:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setCampusFilter('all');
              setSelectedCampus('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              campusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Admissions ({admissionsList.length})
          </button>

          <button
            onClick={() => {
              setCampusFilter('lahore');
              setSelectedCampus('lahore');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              campusFilter === 'lahore'
                ? 'bg-[#6E1231] text-white shadow-xs'
                : 'bg-rose-50 text-[#6E1231] hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>Lahore Campus DGSL ({lahoreAdmissionsList.length})</span>
          </button>

          <button
            onClick={() => {
              setCampusFilter('okara');
              setSelectedCampus('okara');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              campusFilter === 'okara'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Okara Campus DGSO ({okaraAdmissionsList.length})</span>
          </button>
        </div>
      </div>

      {/* SEPARATE CAMPUS ADMISSION SUMMARIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lahore Summary Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          campusFilter === 'lahore' || campusFilter === 'all' ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-rose-200">
            <span className="font-extrabold text-xs text-[#6E1231] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6E1231]"></span>
              Lahore Admissions Summary (DGSL)
            </span>
            <span className="text-[10px] font-bold text-slate-500">Main Campus</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2.5 text-center">
            <div className="p-2 bg-white rounded-xl border border-rose-100">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Enrolled</div>
              <div className="text-base font-black text-slate-900 mt-0.5">{lahoreAdmissionsList.length}</div>
            </div>
            <div className="p-2 bg-white rounded-xl border border-rose-100">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Fee Volume</div>
              <div className="text-base font-black text-slate-900 mt-0.5">{formatPKR(lahoreTotalFee)}</div>
            </div>
            <div className="p-2 bg-white rounded-xl border border-rose-100">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Collected Initial</div>
              <div className="text-base font-black text-emerald-600 mt-0.5">{formatPKR(lahoreInitialPaid)}</div>
            </div>
          </div>
        </div>

        {/* Okara Summary Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          campusFilter === 'okara' || campusFilter === 'all' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
            <span className="font-extrabold text-xs text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Okara Admissions Summary (DGSO)
            </span>
            <span className="text-[10px] font-bold text-slate-500">Benazir Road Branch</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2.5 text-center">
            <div className="p-2 bg-white rounded-xl border border-emerald-100">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Enrolled</div>
              <div className="text-base font-black text-slate-900 mt-0.5">{okaraAdmissionsList.length}</div>
            </div>
            <div className="p-2 bg-white rounded-xl border border-emerald-100">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Fee Volume</div>
              <div className="text-base font-black text-slate-900 mt-0.5">{formatPKR(okaraTotalFee)}</div>
            </div>
            <div className="p-2 bg-white rounded-xl border border-emerald-100">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Collected Initial</div>
              <div className="text-base font-black text-emerald-600 mt-0.5">{formatPKR(okaraInitialPaid)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${campusFilter !== 'all' ? campusFilter.toUpperCase() : 'all'} admissions by student name, admission #, course, phone...`}
          className="w-full text-xs text-slate-900 focus:outline-hidden"
        />
      </div>

      {/* Admissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Admission #</th>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Course Enrolled</th>
                <th className="p-3.5">Fee Payable</th>
                <th className="p-3.5">Initial Payment</th>
                <th className="p-3.5">Plan</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Actions & Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Loading admissions records...</td>
                </tr>
              ) : filteredAdmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">No admissions found.</td>
                </tr>
              ) : (
                filteredAdmissions.map((adm: any) => (
                  <tr key={adm.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{adm.admission_no}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{adm.student_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{adm.student_phone}</div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">{adm.course_name}</td>
                    <td className="p-3.5 font-bold text-slate-900">{formatPKR(adm.final_payable)}</td>
                    <td className="p-3.5 font-bold text-emerald-600">{formatPKR(adm.initial_payment)}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] uppercase font-semibold text-slate-700">
                        {adm.payment_plan}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 font-medium">{formatDate(adm.admission_date)}</td>
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            setIsBlankFormModal(false);
                            setPrintAdmissionId(adm.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#6E1231] bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-xs"
                          title="View and print official DigiSkool Admission Form"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Admission Form</span>
                        </button>
                        {adm.voucher_id ? (
                          <button
                            onClick={() => onOpenPrintVoucher(adm.voucher_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-xs"
                            title={`Print Fee Voucher ${adm.voucher_no || ''}`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Fee Voucher</span>
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                const vRes: any = await apiRequest('/api/vouchers', {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    student_id: adm.student_id,
                                    course_id: adm.course_id,
                                    batch_id: adm.batch_id,
                                    fee_description: `Course Admission Fee - ${adm.course_name}`,
                                    amount: adm.final_payable || adm.course_fee || 0,
                                    discount: 0,
                                    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                    campus: adm.campus
                                  })
                                });
                                onOpenPrintVoucher(vRes.id);
                                loadData();
                              } catch (e: any) {
                                alert('Error creating fee voucher: ' + e.message);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-xs"
                            title="Generate and print fee voucher for this student"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Fee Voucher</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admission Workflow Wizard Modal */}
      {isWizardOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsWizardOpen(false)}
          title="New Student Admission & Enrollment Desk"
          subtitle="DigiSkool Institute Course Registration & Automated Fee Voucher Engine"
          maxWidth="3xl"
        >
          {admissionSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">Admission Completed Successfully!</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Admission Number: <strong className="font-mono text-[#6E1231] font-bold">{admissionSuccess.admission_no}</strong>
                </p>
                <p className="text-xs text-slate-600">
                  Fee Voucher Generated: <strong className="font-mono">{admissionSuccess.voucher_no}</strong>
                </p>
                {admissionSuccess.receipt_no && (
                  <p className="text-xs text-emerald-700 font-semibold">
                    Payment Receipt Generated: <strong className="font-mono">{admissionSuccess.receipt_no}</strong>
                  </p>
                )}
              </div>

              {/* Action Buttons for Document Printing */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsBlankFormModal(false);
                    setPrintAdmissionId(admissionSuccess.admission_id || admissionSuccess.admission_no);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>Print Official Admission Form</span>
                </button>

                {admissionSuccess.voucher_id && (
                  <button
                    type="button"
                    onClick={() => onOpenPrintVoucher(admissionSuccess.voucher_id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    <Printer className="w-4 h-4 text-[#6E1231]" />
                    <span>Print Fee Voucher</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Close Desk
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateAdmission} className="space-y-5 text-xs">
              {/* Step 1: Student Information matching Official Form */}
              <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#6E1231] text-sm font-display flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#6E1231]" />
                    Step 1: Applicant Personal Details (Official Admission Form)
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={studentMode === 'new'}
                        onChange={() => setStudentMode('new')}
                        className="accent-[#6E1231]"
                      />
                      <span className="font-medium text-slate-700">New Student</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                      <input
                        type="radio"
                        checked={studentMode === 'existing'}
                        onChange={() => setStudentMode('existing')}
                        className="accent-[#6E1231]"
                      />
                      <span className="font-medium text-slate-700">Existing Student</span>
                    </label>
                  </div>
                </div>

                {/* Campus Selection Tab */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="font-bold text-slate-700">Admitting Campus:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAdmissionCampus('Lahore');
                        setCity('Lahore');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        admissionCampus === 'Lahore'
                          ? 'bg-[#6E1231] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Lahore Campus (DGSL)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdmissionCampus('Okara');
                        setCity('Okara');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        admissionCampus === 'Okara'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Okara Campus (DGSO)
                    </button>
                  </div>
                </div>

                {studentMode === 'existing' ? (
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Select Registered Student *</label>
                    <select
                      value={existingStudentId}
                      onChange={(e) => setExistingStudentId(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                      required
                    >
                      <option value="">Select Student...</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.student_id}) – {s.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={fullName || ''}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Muhammad Bilal"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Father/Husband Name</label>
                        <input
                          type="text"
                          value={fatherName || ''}
                          onChange={(e) => setFatherName(e.target.value)}
                          placeholder="e.g. Tariq Mehmood"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white"
                        />
                      </div>
                    </div>

                    {/* Gender & Marital Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Gender</label>
                        <div className="flex items-center gap-4 py-1.5 px-3 bg-white rounded-lg border border-slate-300">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="gender"
                              value="Male"
                              checked={gender === 'Male'}
                              onChange={() => setGender('Male')}
                              className="accent-[#6E1231]"
                            />
                            <span>Male</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="gender"
                              value="Female"
                              checked={gender === 'Female'}
                              onChange={() => setGender('Female')}
                              className="accent-[#6E1231]"
                            />
                            <span>Female</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Marital Status</label>
                        <div className="flex items-center gap-4 py-1.5 px-3 bg-white rounded-lg border border-slate-300">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="maritalStatus"
                              value="Single"
                              checked={maritalStatus === 'Single'}
                              onChange={() => setMaritalStatus('Single')}
                              className="accent-[#6E1231]"
                            />
                            <span>Single</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="maritalStatus"
                              value="Married"
                              checked={maritalStatus === 'Married'}
                              onChange={() => setMaritalStatus('Married')}
                              className="accent-[#6E1231]"
                            />
                            <span>Married</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* DOB & Nationality */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={dateOfBirth || ''}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Nationality</label>
                        <input
                          type="text"
                          value={nationality || 'Pakistani'}
                          onChange={(e) => setNationality(e.target.value)}
                          placeholder="Pakistani"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white"
                        />
                      </div>
                    </div>

                    {/* CNIC & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">CNIC No / B-Form</label>
                        <input
                          type="text"
                          value={cnic || ''}
                          onChange={(e) => setCnic(e.target.value)}
                          placeholder="35201-1234567-1"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                        <input
                          type="email"
                          value={email || ''}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="student@example.com"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white"
                        />
                      </div>
                    </div>

                    {/* Phone & WhatsApp */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Cell No *</label>
                        <input
                          type="text"
                          required
                          value={phone || ''}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0300-1234567"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">WhatsApp No</label>
                        <input
                          type="text"
                          value={whatsapp || ''}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="0300-1234567"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Postal Address & City */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-semibold mb-1">Postal Address</label>
                        <input
                          type="text"
                          value={address || ''}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="House #, Street, Area / Colony"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">City</label>
                        <input
                          type="text"
                          value={city || 'Lahore'}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Lahore"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white"
                        />
                      </div>
                    </div>

                    {/* Academic / Professional Qualifications */}
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Educational / Professional Qualifications (Academic / Prof.)
                      </label>
                      <input
                        type="text"
                        value={qualification || ''}
                        onChange={(e) => setQualification(e.target.value)}
                        placeholder="e.g. Matric / Intermediate / Graduation / Working Professional"
                        className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] focus:border-[#6E1231] bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Course & Batch Selection */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 text-sm font-display flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#6E1231]" />
                  Step 2: Course & Batch Selection
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Select Course Track *</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        const cId = Number(e.target.value);
                        setSelectedCourseId(cId);
                        const matchBatches = batches.filter(
                          (b) => b.course_id === cId && (b.campus?.toLowerCase() === admissionCampus.toLowerCase() || !b.campus)
                        );
                        if (matchBatches.length > 0) {
                          setSelectedBatchId(matchBatches[0].id);
                        } else {
                          const anyBatch = batches.find((b) => b.course_id === cId);
                          setSelectedBatchId(anyBatch ? anyBatch.id : '');
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white text-sm"
                      required
                    >
                      <option value="">Select Course...</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({formatPKR(c.fee)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Batch / Class Session</label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white text-sm"
                    >
                      <option value="">Auto-Assign Active Batch</option>
                      {batches
                        .filter((b) => !selectedCourseId || b.course_id === Number(selectedCourseId))
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batch_code} - {b.name} ({b.campus || 'Lahore'})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Financial Calculations & Payment Plan */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 text-sm font-display flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#6E1231]" />
                  Step 3: Fee Breakdown & Challan Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Official Course Fee</label>
                    <div className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900">
                      {formatPKR(courseFee)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Discount / Scholarship (PKR)</label>
                    <input
                      type="number"
                      min={0}
                      max={courseFee}
                      value={discount ?? 0}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Net Payable Fee</label>
                    <div className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg font-black text-[#6E1231] font-display">
                      {formatPKR(finalPayable)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Payment Plan</label>
                    <select
                      value={paymentPlan}
                      onChange={(e) => setPaymentPlan(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                    >
                      <option value="full">Full One-Time Payment</option>
                      <option value="installments">2 Monthly Installments</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Initial Deposit Today (PKR)</label>
                    <input
                      type="number"
                      min={0}
                      max={finalPayable}
                      value={initialPayment ?? 0}
                      onChange={(e) => setInitialPayment(Math.min(finalPayable, Math.max(0, Number(e.target.value))))}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-bold"
                    />
                  </div>
                </div>

                {initialPayment > 0 && (
                  <div className="pt-2">
                    <label className="block text-slate-600 font-medium mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white font-medium"
                    >
                      <option value="Cash">Cash (DigiSkool Cash Desk)</option>
                      <option value="Bank Al Habib">Bank Al Habib (Title: DIGISKOOL | A/C: 57270081000203018)</option>
                      <option value="Bank Islami">Bank Islami (Title: DIGISKOOL | A/C: 211100277400001)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#6E1231] hover:bg-[#85173A] text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {submitting ? 'Generating Vouchers...' : 'Confirm Admission & Issue Vouchers'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Official Admission Form Print Modal */}
      {printAdmissionId && (
        <PrintAdmissionFormModal
          admissionId={printAdmissionId}
          isBlank={isBlankFormModal}
          initialCampus={blankFormCampus}
          onClose={() => {
            setPrintAdmissionId(null);
            setIsBlankFormModal(false);
          }}
        />
      )}
    </div>
  );
};
