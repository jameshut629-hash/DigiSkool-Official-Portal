import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Receipt,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Camera,
  QrCode
} from 'lucide-react';
import { Student } from '../../types.ts';
import { apiRequest, formatPKR, formatDate } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useCampus } from '../../context/CampusContext.tsx';
import { Modal } from '../common/Modal.tsx';
import { DeleteProtectionModal } from '../common/DeleteProtectionModal.tsx';
import { StudentQrScannerModal } from './StudentQrScannerModal.tsx';
import { StudentIdCardModal } from './StudentIdCardModal.tsx';

interface StudentsViewProps {
  onOpenPrintVoucher: (id: number) => void;
  onOpenPrintReceipt: (id: number) => void;
  initialOpenScanner?: boolean;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  onOpenPrintVoucher,
  onOpenPrintReceipt,
  initialOpenScanner = false
}) => {
  const { isOwner, isAdmin, canManageStudents, canPermanentDelete } = useAuth();
  const { selectedCampus, setSelectedCampus } = useCampus();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campusFilter, setCampusFilter] = useState<'all' | 'lahore' | 'okara'>(
    selectedCampus === 'lahore' ? 'lahore' : selectedCampus === 'okara' ? 'okara' : 'all'
  );

  useEffect(() => {
    if (selectedCampus === 'lahore' || selectedCampus === 'okara' || selectedCampus === 'all') {
      setCampusFilter(selectedCampus);
    }
  }, [selectedCampus]);

  // QR Scanner & ID Card State
  const [scannerOpen, setScannerOpen] = useState(initialOpenScanner);
  const [idCardModalOpen, setIdCardModalOpen] = useState(false);
  const [selectedIdCardStudent, setSelectedIdCardStudent] = useState<Student | null>(null);

  // Modals state
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const data = await apiRequest<any>(`/api/students?${params.toString()}`);
      const validStudents = Array.isArray(data)
        ? data
        : (Array.isArray(data?.students) ? data.students : (Array.isArray(data?.data) ? data.data : []));
      setStudents(validStudents);
    } catch (err: any) {
      console.error('Failed to load students:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadStudents, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Load detailed profile
  const handleViewDetails = async (id: number) => {
    setSelectedStudentId(id);
    setDetailsLoading(true);
    try {
      const data = await apiRequest(`/api/students/${id}`);
      setStudentDetails(data);
    } catch (err: any) {
      alert('Failed to load student details: ' + err.message);
      setSelectedStudentId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Archive Student (CRITICAL NO-DELETE RULE)
  const handleArchive = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to archive "${student.full_name}"? All enrollments, vouchers, and payment records will be preserved.`)) {
      return;
    }
    try {
      await apiRequest(`/api/students/${student.id}/archive`, { method: 'POST' });
      loadStudents();
    } catch (err: any) {
      alert('Failed to archive student: ' + err.message);
    }
  };

  // Restore Student
  const handleRestore = async (student: Student) => {
    try {
      await apiRequest(`/api/students/${student.id}/restore`, { method: 'POST' });
      loadStudents();
    } catch (err: any) {
      alert('Failed to restore student: ' + err.message);
    }
  };

  // Save student create or edit
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent?.full_name || !editingStudent?.phone) {
      alert('Full name and phone number are required.');
      return;
    }

    setSaveLoading(true);
    try {
      if (editingStudent.id) {
        await apiRequest(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingStudent)
        });
      } else {
        await apiRequest('/api/students', {
          method: 'POST',
          body: JSON.stringify(editingStudent)
        });
      }
      setEditModalOpen(false);
      setEditingStudent(null);
      loadStudents();
    } catch (err: any) {
      alert('Failed to save student: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Campus separation helpers
  const isOkaraStudent = (std: Student) =>
    Boolean(std.city?.toLowerCase() === 'okara' || (std.student_id && String(std.student_id).toLowerCase().includes('dgso')) || (std.registration_no && std.registration_no.toLowerCase().includes('dgso')));

  const lahoreStudents = (Array.isArray(students) ? students : []).filter((std) => !isOkaraStudent(std));
  const okaraStudents = (Array.isArray(students) ? students : []).filter((std) => isOkaraStudent(std));

  const filteredStudents = (Array.isArray(students) ? students : []).filter((std) => {
    if (campusFilter === 'lahore' && isOkaraStudent(std)) return false;
    if (campusFilter === 'okara' && !isOkaraStudent(std)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">Students Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student registrations, contact details, enrollments, and fee ledgers
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick QR Scanner Button */}
          <button
            onClick={() => setScannerOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Scan Physical Student ID Card with Camera"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Student ID</span>
          </button>

          {canManageStudents && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingStudent({
                    full_name: '',
                    phone: '',
                    city: 'Lahore',
                    gender: 'Male',
                    status: 'active'
                  });
                  setEditModalOpen(true);
                }}
                className="px-3 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Add new student for Lahore Campus"
              >
                <Plus className="w-4 h-4" />
                <span>+ Lahore Student</span>
              </button>

              <button
                onClick={() => {
                  setEditingStudent({
                    full_name: '',
                    phone: '',
                    city: 'Okara',
                    gender: 'Male',
                    status: 'active'
                  });
                  setEditModalOpen(true);
                }}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Add new student for Okara Campus"
              >
                <Plus className="w-4 h-4" />
                <span>+ Okara Student</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CAMPUS FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pl-1">
          <span>Campus Directory Filter:</span>
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
            All Students ({(Array.isArray(students) ? students : []).length})
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
            <span>Lahore Campus DGSL ({lahoreStudents.length})</span>
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
            <span>Okara Campus DGSO ({okaraStudents.length})</span>
          </button>
        </div>
      </div>

      {/* SEPARATE CAMPUS SUMMARIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border transition-all ${
          campusFilter === 'lahore' || campusFilter === 'all' ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-rose-200">
            <span className="font-extrabold text-xs text-[#6E1231] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6E1231]"></span>
              Lahore Campus Students (DGSL)
            </span>
            <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">First Floor 12-C Commercial Market, NFC Society (+92 331-715-5174)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2.5 text-center text-xs">
            <div className="p-2 bg-white rounded-xl border border-rose-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total</span>
              <p className="text-base font-black text-slate-900 mt-0.5">{lahoreStudents.length}</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-rose-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Active</span>
              <p className="text-base font-black text-emerald-600 mt-0.5">{lahoreStudents.filter(s => s.status === 'active').length}</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-rose-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Graduated</span>
              <p className="text-base font-black text-sky-600 mt-0.5">{lahoreStudents.filter(s => s.status === 'graduated').length}</p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          campusFilter === 'okara' || campusFilter === 'all' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200 opacity-60'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
            <span className="font-extrabold text-xs text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Okara Campus Students (DGSO)
            </span>
            <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">185 Faisal Colony Main Rd, Okara (+92 310-436-7347)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2.5 text-center text-xs">
            <div className="p-2 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total</span>
              <p className="text-base font-black text-slate-900 mt-0.5">{okaraStudents.length}</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Active</span>
              <p className="text-base font-black text-emerald-600 mt-0.5">{okaraStudents.filter(s => s.status === 'active').length}</p>
            </div>
            <div className="p-2 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Graduated</span>
              <p className="text-base font-black text-sky-600 mt-0.5">{okaraStudents.filter(s => s.status === 'graduated').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, Roll No, Phone, Email, CNIC..."
            className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E1231]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#6E1231] bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="graduated">Graduated</option>
            <option value="dropped">Dropped</option>
            <option value="suspended">Suspended</option>
            <option value="archived">Archived (Preserved)</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Student ID / Roll #</th>
                <th className="p-3.5">Full Name</th>
                <th className="p-3.5">Phone / WhatsApp</th>
                <th className="p-3.5">City</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Outstanding Dues</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading students...</td>
                </tr>
              ) : (!Array.isArray(filteredStudents) || filteredStudents.length === 0) ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No students found matching the selected campus or criteria.</td>
                </tr>
              ) : (
                filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{std.student_id}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isOkaraStudent(std)
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-[#6E1231] border border-rose-300'
                        }`}>
                          {isOkaraStudent(std) ? 'DGSO' : 'DGSL'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{std.registration_no}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{std.full_name}</div>
                      <div className="text-[11px] text-slate-500">S/O {std.father_name || '—'}</div>
                    </td>
                    <td className="p-3.5 font-mono">
                      <div>{std.phone}</div>
                      {std.email && <div className="text-[10px] text-slate-400">{std.email}</div>}
                    </td>
                    <td className="p-3.5 text-slate-600">{std.city}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        std.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        std.status === 'graduated' ? 'bg-blue-100 text-blue-800' :
                        std.status === 'archived' ? 'bg-slate-200 text-slate-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {std.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold">
                      <span className={std.total_due && std.total_due > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {formatPKR(std.total_due || 0)}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewDetails(std.id)}
                          title="View Student Profile & Fee Ledger"
                          className="p-1.5 text-slate-600 hover:text-[#6E1231] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* ID Card & QR Preview / Print */}
                        <button
                          onClick={() => {
                            setSelectedIdCardStudent(std);
                            setIdCardModalOpen(true);
                          }}
                          title="Print Student ID Card with Verifiable QR Code"
                          className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        {canManageStudents && (
                          <button
                            onClick={() => {
                              setEditingStudent(std);
                              setEditModalOpen(true);
                            }}
                            title="Edit Student Info"
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* NO-DELETE RULE: Archive / Restore instead */}
                        {canManageStudents && std.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(std)}
                            title="Archive Student (No-Delete Protection)"
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        {canManageStudents && std.status === 'archived' && (
                          <button
                            onClick={() => handleRestore(std)}
                            title="Restore Archived Student to Active"
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {/* OWNER-ONLY PERMANENT DELETION (NON-OWNERS SEE RESTRICTION ALERT) */}
                        <button
                          onClick={() => {
                            if (!canPermanentDelete) {
                              alert('Please contact to admin for deletion of data.');
                              return;
                            }
                            setDeleteTarget({ id: std.id, name: std.full_name });
                          }}
                          title={canPermanentDelete ? "Owner Strict Permanent Delete" : "Please contact to admin for deletion of data"}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            canPermanentDelete
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Details & Ledger Modal */}
      {selectedStudentId && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStudentId(null)}
          title={studentDetails?.student?.full_name || 'Student Details'}
          subtitle={`Roll No: ${studentDetails?.student?.student_id || ''} • ${studentDetails?.student?.phone || ''}`}
          maxWidth="4xl"
        >
          {detailsLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading student dossier...</div>
          ) : !studentDetails ? (
            <div className="py-12 text-center text-xs text-red-500">Failed to load details.</div>
          ) : (
            <div className="space-y-6 text-xs text-slate-700">
              {/* Financial Summary Top Bar */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[11px]">Total Course Fees:</span>
                  <p className="text-base font-bold text-slate-900 font-display">
                    {formatPKR(studentDetails.financialSummary?.totalPayable)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Total Paid:</span>
                  <p className="text-base font-bold text-emerald-600 font-display">
                    {formatPKR(studentDetails.financialSummary?.totalPaid)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Outstanding Due:</span>
                  <p className="text-base font-bold text-rose-600 font-display">
                    {formatPKR(studentDetails.financialSummary?.outstanding)}
                  </p>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Father / Guardian</span>
                  <span className="font-semibold text-slate-800">{studentDetails.student.father_name || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">CNIC / B-Form</span>
                  <span className="font-mono text-slate-800">{studentDetails.student.cnic_bform || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Address</span>
                  <span className="text-slate-800">{studentDetails.student.address || '—'}, {studentDetails.student.city}</span>
                </div>
              </div>

              {/* Course Enrollments */}
              <div>
                <h4 className="font-bold text-slate-900 font-display mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#6E1231]" />
                  Course Enrollments
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Course</th>
                        <th className="p-2.5">Fee</th>
                        <th className="p-2.5">Paid</th>
                        <th className="p-2.5">Remaining</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentDetails.enrollments?.map((en: any) => (
                        <tr key={en.id}>
                          <td className="p-2.5 font-semibold text-slate-800">{en.course_name}</td>
                          <td className="p-2.5 font-medium">{formatPKR(en.final_fee)}</td>
                          <td className="p-2.5 text-emerald-600 font-medium">{formatPKR(en.paid_amount)}</td>
                          <td className="p-2.5 text-rose-600 font-medium">{formatPKR(en.remaining_amount)}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                              {en.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fee Vouchers */}
              <div>
                <h4 className="font-bold text-slate-900 font-display mb-2 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#6E1231]" />
                  Official Fee Vouchers
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Voucher #</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5">Payable</th>
                        <th className="p-2.5">Paid</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Print</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentDetails.vouchers?.map((v: any) => (
                        <tr key={v.id}>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{v.voucher_no}</td>
                          <td className="p-2.5 text-slate-700">{v.fee_description}</td>
                          <td className="p-2.5">{formatDate(v.due_date)}</td>
                          <td className="p-2.5 font-bold">{formatPKR(v.total_payable)}</td>
                          <td className="p-2.5 text-emerald-600">{formatPKR(v.paid_amount)}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100">
                              {v.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => onOpenPrintVoucher(v.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                            >
                              2-Part Voucher
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Receipts */}
              <div>
                <h4 className="font-bold text-slate-900 font-display mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Payments & Official Receipts
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Receipt #</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentDetails.payments?.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{p.receipt_no}</td>
                          <td className="p-2.5">{formatDate(p.payment_date)}</td>
                          <td className="p-2.5 font-bold text-emerald-600">{formatPKR(p.amount)}</td>
                          <td className="p-2.5 text-slate-600">{p.payment_method}</td>
                          <td className="p-2.5 font-bold uppercase text-[10px]">
                            <span className={p.status === 'valid' ? 'text-emerald-700' : 'text-rose-700'}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => onOpenPrintReceipt(p.id)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold"
                            >
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Add / Edit Student Modal */}
      {editModalOpen && editingStudent && (
        <Modal
          isOpen={true}
          onClose={() => setEditModalOpen(false)}
          title={editingStudent.id ? 'Edit Student Information' : 'Add New Student Record'}
          subtitle="DigiSkool Student Information System"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveStudent} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingStudent.full_name || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, full_name: e.target.value })}
                  placeholder="e.g. Usama Tariq"
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Father's Name</label>
                <input
                  type="text"
                  value={editingStudent.father_name || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, father_name: e.target.value })}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={editingStudent.phone || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={editingStudent.whatsapp || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, whatsapp: e.target.value })}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingStudent.email || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  placeholder="student@example.com"
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CNIC / B-Form</label>
                <input
                  type="text"
                  value={editingStudent.cnic_bform || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, cnic_bform: e.target.value })}
                  placeholder="35201-1234567-1"
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
                <select
                  value={editingStudent.marital_status || 'Single'}
                  onChange={(e) => setEditingStudent({ ...editingStudent, marital_status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                <input
                  type="text"
                  value={editingStudent.nationality || 'Pakistani'}
                  onChange={(e) => setEditingStudent({ ...editingStudent, nationality: e.target.value })}
                  placeholder="Pakistani"
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification</label>
                <input
                  type="text"
                  value={editingStudent.qualification || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, qualification: e.target.value })}
                  placeholder="e.g. Matric / Intermediate / Graduate"
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={editingStudent.city || 'Lahore'}
                  onChange={(e) => setEditingStudent({ ...editingStudent, city: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editingStudent.status || 'active'}
                  onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                >
                  <option value="active">Active</option>
                  <option value="graduated">Graduated</option>
                  <option value="dropped">Dropped</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
              <textarea
                rows={2}
                value={editingStudent.address || ''}
                onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                placeholder="House #, Street, Area..."
                className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="px-4 py-2 text-xs font-bold bg-[#6E1231] hover:bg-[#85173A] text-white rounded-lg transition-all"
              >
                {saveLoading ? 'Saving...' : editingStudent.id ? 'Save Changes' : 'Create Student'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Strict Owner-Only Delete Protection Modal */}
      {deleteTarget && (
        <DeleteProtectionModal
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          module="students"
          recordId={deleteTarget.id}
          recordName={deleteTarget.name}
          onSuccess={() => {
            setDeleteTarget(null);
            loadStudents();
          }}
        />
      )}

      {/* Live Camera QR Code Scanner Modal */}
      {scannerOpen && (
        <StudentQrScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onViewStudentDetails={(id) => handleViewDetails(id)}
          onOpenPrintVoucher={(vid) => onOpenPrintVoucher(vid)}
          onOpenPrintIdCard={(std) => {
            setSelectedIdCardStudent(std);
            setIdCardModalOpen(true);
          }}
        />
      )}

      {/* Student ID Card & Scannable QR Code Modal */}
      {idCardModalOpen && selectedIdCardStudent && (
        <StudentIdCardModal
          student={selectedIdCardStudent}
          isOpen={idCardModalOpen}
          onClose={() => {
            setIdCardModalOpen(false);
            setSelectedIdCardStudent(null);
          }}
          onOpenScanner={() => setScannerOpen(true)}
        />
      )}
    </div>
  );
};
