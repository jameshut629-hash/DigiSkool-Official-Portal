import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Building2,
  ChevronRight,
  ShieldCheck,
  Edit2,
  Trash2,
  UserCheck,
  LogIn,
  LogOut,
  Calendar,
  RotateCcw,
  Check,
  Timer,
  Printer,
  Download,
  Loader2
} from 'lucide-react';
import { StaffMember, StaffAttendanceRecord } from '../../types.ts';
import { apiRequest, formatDate } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { executeSmartPrint } from '../../lib/smartPrint.ts';
import { generateStaffAttendancePDF } from '../../lib/pdf.ts';

// Helper: Format current time as 'hh:mm A' (e.g. 09:30 AM)
const getNowTime12 = (): string => {
  const d = new Date();
  let hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
};

// Helper: Format current time as 'HH:MM' (24hr)
const getNowTime24 = (): string => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// Helper: Convert time string (12hr or 24hr) to 'HH:MM' (24hr) for <input type="time">
const to24Hour = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return '';
  let hours = parseInt(match[1], 10);
  const mins = match[2].padStart(2, '0');
  const mod = match[3]?.toUpperCase();
  if (mod === 'PM' && hours < 12) hours += 12;
  if (mod === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${mins}`;
};

// Helper: Convert 'HH:MM' (24hr) or any time string to 12-hour 'hh:mm AM/PM'
const to12Hour = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const mins = match[2].padStart(2, '0');
  const mod = match[3]?.toUpperCase();
  if (mod) {
    return `${hours.toString().padStart(2, '0')}:${mins} ${mod}`;
  }
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
};

// Parse time string to total minutes from midnight
const parseMinutes = (timeStr?: string | null): number | null => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const mod = match[3]?.toUpperCase();
  if (mod === 'PM' && hours < 12) hours += 12;
  if (mod === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

export const StaffView: React.FC = () => {
  const { isOwner, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance'>('directory');

  // Live ticking clock for accurate time stamping
  const [liveClock, setLiveClock] = useState<string>(getNowTime12());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(getNowTime12());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Staff directory state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [searchStaff, setSearchStaff] = useState('');
  const [campusFilter, setCampusFilter] = useState<'all' | 'Lahore' | 'Okara'>('all');
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // New / Edit staff form state
  const [staffFormData, setStaffFormData] = useState({
    full_name: '',
    father_name: '',
    cnic: '',
    phone: '',
    email: '',
    designation: 'Instructor',
    department: 'Academics',
    campus: 'Lahore',
    arrival_time: '9:00 AM',
    allowed_leaves: 2,
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive'
  });

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Time & Attendance adjustment modal state
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StaffAttendanceRecord | null>(null);
  const [timeModalForm, setTimeModalForm] = useState({
    status: 'present' as 'present' | 'absent' | 'half_day' | 'late' | 'leave',
    time_in: '', // 'HH:MM' (24hr for time input)
    time_out: '', // 'HH:MM'
    arrival_time: '9:00 AM',
    remarks: ''
  });

  // Notification alert messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [printingAttendance, setPrintingAttendance] = useState(false);

  // Delete staff confirmation modal state
  const [staffToDelete, setStaffToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deletingStaff, setDeletingStaff] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const handlePrintAttendance = async () => {
    if (attendanceRecords.length === 0) {
      showSuccess('No attendance records to print for this date.');
      return;
    }
    setPrintingAttendance(true);
    try {
      const res = await executeSmartPrint({
        documentTitle: `DigiSkool-Staff-Attendance-${attendanceDate}`,
        fallbackPdfGenerator: () => {
          generateStaffAttendancePDF(attendanceRecords, attendanceDate, campusFilter);
        }
      });
      showSuccess(res.message || '✓ Staff attendance sheet generated & downloaded as A4 PDF!');
    } catch (err: any) {
      console.error('Print attendance failed:', err);
      generateStaffAttendancePDF(attendanceRecords, attendanceDate, campusFilter);
      showSuccess('✓ Downloaded Staff Attendance Sheet (PDF).');
    } finally {
      setPrintingAttendance(false);
    }
  };

  // Load staff directory
  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const data = await apiRequest<StaffMember[]>(`/api/staff?campus=${campusFilter}`);
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Load attendance
  const loadAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const data = await apiRequest<StaffAttendanceRecord[]>(
        `/api/staff/attendance?date=${attendanceDate}&campus=${campusFilter}`
      );
      setAttendanceRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'directory') loadStaff();
    else if (activeTab === 'attendance') loadAttendance();
  }, [activeTab, campusFilter, attendanceDate]);

  // Handle staff form submit
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await apiRequest(`/api/staff/${editingStaff.id}`, {
          method: 'PUT',
          body: JSON.stringify(staffFormData)
        });
        showSuccess(`Updated staff member: ${staffFormData.full_name}`);
      } else {
        await apiRequest('/api/staff', {
          method: 'POST',
          body: JSON.stringify(staffFormData)
        });
        showSuccess(`Added new staff member: ${staffFormData.full_name}`);
      }
      setStaffModalOpen(false);
      setEditingStaff(null);
      loadStaff();
    } catch (err: any) {
      alert('Failed to save staff member: ' + err.message);
    }
  };

  // Handle staff deletion modal
  const handleDeleteClick = (id: number, name: string) => {
    setDeleteError(null);
    setStaffToDelete({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    setDeletingStaff(true);
    setDeleteError(null);
    try {
      await apiRequest(`/api/staff/${staffToDelete.id}`, { method: 'DELETE' });
      showSuccess(`Staff member "${staffToDelete.name}" deleted successfully.`);
      setStaffToDelete(null);
      loadStaff();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete staff member');
    } finally {
      setDeletingStaff(false);
    }
  };

  // Open Time Modal for editing attendance details
  const openTimeModal = (rec: StaffAttendanceRecord) => {
    setSelectedRecord(rec);
    const defaultTimeIn = rec.time_in || rec.check_in_time || '';
    const defaultTimeOut = rec.time_out || rec.check_out_time || '';
    setTimeModalForm({
      status: (rec.attendance_status as any) || 'present',
      time_in: to24Hour(defaultTimeIn),
      time_out: to24Hour(defaultTimeOut),
      arrival_time: rec.arrival_time || '9:00 AM',
      remarks: rec.remarks || rec.notes || ''
    });
    setTimeModalOpen(true);
  };

  // Submit Time Modal
  const handleSaveTimeModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      const timeIn12 = timeModalForm.time_in ? to12Hour(timeModalForm.time_in) : null;
      const timeOut12 = timeModalForm.time_out ? to12Hour(timeModalForm.time_out) : null;

      const res: any = await apiRequest('/api/staff/attendance', {
        method: 'POST',
        body: JSON.stringify({
          staff_id: selectedRecord.staff_id,
          date: attendanceDate,
          status: timeModalForm.status,
          time_in: timeIn12,
          time_out: timeOut12,
          arrival_time: timeModalForm.arrival_time,
          remarks: timeModalForm.remarks
        })
      });
      showSuccess(`Attendance & time recorded for ${selectedRecord.full_name} (${res.status || timeModalForm.status})`);
      setTimeModalOpen(false);
      loadAttendance();
    } catch (err: any) {
      alert('Failed to save attendance time: ' + err.message);
    }
  };

  // Quick clock in now
  const handleClockInNow = async (rec: StaffAttendanceRecord) => {
    try {
      const now12 = getNowTime12();
      const res: any = await apiRequest('/api/staff/attendance', {
        method: 'POST',
        body: JSON.stringify({
          staff_id: rec.staff_id,
          date: attendanceDate,
          status: 'present',
          time_in: now12,
          arrival_time: rec.arrival_time || '9:00 AM'
        })
      });
      showSuccess(`Clocked in ${rec.full_name} at ${now12}${res.status === 'late' ? ` (LATE: +${res.late_minutes}m)` : ' (ON TIME)'}`);
      loadAttendance();
    } catch (err: any) {
      alert('Failed to clock in: ' + err.message);
    }
  };

  // Quick clock out now
  const handleClockOutNow = async (rec: StaffAttendanceRecord) => {
    try {
      const now12 = getNowTime12();
      await apiRequest('/api/staff/attendance', {
        method: 'POST',
        body: JSON.stringify({
          staff_id: rec.staff_id,
          date: attendanceDate,
          time_out: now12
        })
      });
      showSuccess(`Clocked out ${rec.full_name} at ${now12}`);
      loadAttendance();
    } catch (err: any) {
      alert('Failed to clock out: ' + err.message);
    }
  };

  // Handle quick attendance status
  const handleQuickStatus = async (
    rec: StaffAttendanceRecord,
    status: 'present' | 'absent' | 'half_day' | 'late' | 'leave'
  ) => {
    try {
      const isToday = attendanceDate === new Date().toISOString().split('T')[0];
      let timeIn: string | null = null;
      if (status === 'present' || status === 'late' || status === 'half_day') {
        timeIn = rec.time_in || rec.check_in_time || (isToday ? getNowTime12() : (rec.arrival_time || '9:00 AM'));
      }

      const res: any = await apiRequest('/api/staff/attendance', {
        method: 'POST',
        body: JSON.stringify({
          staff_id: rec.staff_id,
          date: attendanceDate,
          status,
          time_in: timeIn,
          arrival_time: rec.arrival_time || '9:00 AM'
        })
      });
      showSuccess(
        `Marked ${rec.full_name} as ${status.toUpperCase()}${
          res.status === 'late' && res.late_minutes ? ` (+${res.late_minutes}m late)` : ''
        }`
      );
      loadAttendance();
    } catch (err: any) {
      alert('Failed to mark attendance: ' + err.message);
    }
  };

  // Handle bulk mark attendance
  const handleBulkAttendance = async (status: 'present' | 'absent', useCurrentTime = true) => {
    const isToday = attendanceDate === new Date().toISOString().split('T')[0];
    const timeToUse =
      status === 'present' && useCurrentTime && isToday
        ? getNowTime12()
        : status === 'present'
        ? '9:00 AM'
        : null;

    const promptText =
      status === 'present'
        ? `Mark all active staff as PRESENT for ${attendanceDate} with check-in time: ${timeToUse || '9:00 AM'}?`
        : `Mark all active staff as ABSENT for ${attendanceDate}?`;

    if (!window.confirm(promptText)) return;
    try {
      await apiRequest('/api/staff/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify({
          date: attendanceDate,
          status,
          time_in: timeToUse,
          campus: campusFilter
        })
      });
      showSuccess(`Bulk marked all staff as ${status.toUpperCase()} for ${attendanceDate}`);
      loadAttendance();
    } catch (err: any) {
      alert('Failed to bulk mark attendance: ' + err.message);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const q = searchStaff.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.employee_code.toLowerCase().includes(q) ||
      s.designation.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 font-display">Staff &amp; Attendance Management</h2>
            <span className="px-2.5 py-0.5 bg-[#6E1231]/10 text-[#6E1231] text-[11px] font-bold rounded-full">
              Lahore &amp; Okara Campuses
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage faculty records, designations, campus assignments, and daily attendance tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Campus Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs font-semibold">
            {(['all', 'Lahore', 'Okara'] as const).map((camp) => (
              <button
                key={camp}
                onClick={() => setCampusFilter(camp)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  campusFilter === camp
                    ? 'bg-[#6E1231] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {camp === 'all' ? 'All Campuses' : camp}
              </button>
            ))}
          </div>

          {activeTab === 'directory' && (isOwner || isAdmin) && (
            <button
              onClick={() => {
                setEditingStaff(null);
                setStaffFormData({
                  full_name: '',
                  father_name: '',
                  cnic: '',
                  phone: '',
                  email: '',
                  designation: 'Instructor',
                  department: 'Academics',
                  campus: campusFilter === 'all' ? 'Lahore' : campusFilter,
                  arrival_time: '9:00 AM',
                  allowed_leaves: 2,
                  joining_date: new Date().toISOString().split('T')[0],
                  status: 'active'
                });
                setStaffModalOpen(true);
              }}
              className="px-4 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#6E1231]/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Error Notification Alert */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'directory'
              ? 'border-[#6E1231] text-[#6E1231]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'attendance'
              ? 'border-[#6E1231] text-[#6E1231]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Daily Attendance</span>
        </button>
      </div>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchStaff}
              onChange={(e) => setSearchStaff(e.target.value)}
              placeholder="Search staff by name, code, designation, department, phone..."
              className="w-full text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Full Name</th>
                    <th className="p-3.5">Designation</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Campus</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Allowed Leaves</th>
                    <th className="p-3.5">Status</th>
                    {(isOwner || isAdmin) && <th className="p-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingStaff ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">Loading staff directory...</td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">No staff members found.</td>
                    </tr>
                  ) : (
                    filteredStaff.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">{st.employee_code}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block">{st.full_name}</span>
                          {st.father_name && <span className="text-[11px] text-slate-400">S/D/O {st.father_name}</span>}
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">{st.designation}</td>
                        <td className="p-3.5 text-slate-600">{st.department}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md text-[10px]">
                            {st.campus}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          <div>{st.phone || '—'}</div>
                          {st.email && <div className="text-[10px] text-slate-400">{st.email}</div>}
                        </td>
                        <td className="p-3.5 font-medium text-slate-600">{st.allowed_leaves ?? 2} / month</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            st.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {st.status}
                          </span>
                        </td>
                        {(isOwner || isAdmin) && (
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingStaff(st);
                                  setStaffFormData({
                                    full_name: st.full_name,
                                    father_name: st.father_name || '',
                                    cnic: st.cnic || '',
                                    phone: st.phone || '',
                                    email: st.email || '',
                                    designation: st.designation,
                                    department: st.department,
                                    campus: st.campus,
                                    arrival_time: st.arrival_time || '9:00 AM',
                                    allowed_leaves: st.allowed_leaves ?? 2,
                                    joining_date: st.joining_date || new Date().toISOString().split('T')[0],
                                    status: st.status
                                  });
                                  setStaffModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-[#6E1231] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Staff Member"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(st.id, st.full_name)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Staff Member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY ATTENDANCE WITH TIME TRACKING */}
      {activeTab === 'attendance' && (() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const presentCount = attendanceRecords.filter((r) => r.attendance_status === 'present').length;
        const lateCount = attendanceRecords.filter((r) => r.attendance_status === 'late').length;
        const halfDayCount = attendanceRecords.filter((r) => r.attendance_status === 'half_day').length;
        const leaveCount = attendanceRecords.filter((r) => r.attendance_status === 'leave').length;
        const absentCount = attendanceRecords.filter((r) => r.attendance_status === 'absent').length;
        const unmarkedCount = attendanceRecords.filter((r) => !r.attendance_status).length;

        return (
          <div className="space-y-4">
            {/* Controls Bar & Live Clock */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#6E1231]" />
                  <label className="text-xs font-bold text-slate-700">Date:</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#6E1231] bg-white text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setAttendanceDate(todayStr)}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                      attendanceDate === todayStr
                        ? 'bg-[#6E1231] text-white border-[#6E1231]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setAttendanceDate(yesterdayStr)}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                      attendanceDate === yesterdayStr
                        ? 'bg-[#6E1231] text-white border-[#6E1231]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Yesterday
                  </button>
                </div>

                {/* Live Clock Indicator */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-bold text-[#6E1231]">
                  <Clock className="w-3.5 h-3.5 text-[#6E1231] animate-pulse" />
                  <span>Live: {liveClock}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="print-staff-attendance-btn"
                  onClick={handlePrintAttendance}
                  disabled={printingAttendance || loadingAttendance}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Print / Download Daily Attendance & Time Roster as A4 PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-400" />
                  <span>{printingAttendance ? 'Generating PDF...' : 'Print Attendance Sheet'}</span>
                </button>

                {(isOwner || isAdmin) && (
                  <>
                    <button
                      onClick={() => handleBulkAttendance('present', true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title={`Mark all active staff as present using current live time (${liveClock})`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark All Present ({attendanceDate === todayStr ? 'Live Time' : '9:00 AM'})</span>
                    </button>
                    <button
                      onClick={() => handleBulkAttendance('present', false)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-300 transition-colors"
                      title="Mark all staff as present with standard 09:00 AM"
                    >
                      Mark 9:00 AM
                    </button>
                    <button
                      onClick={() => handleBulkAttendance('absent', false)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-colors"
                    >
                      Mark All Absent
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Attendance Status Summary KPI Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[11px] font-semibold text-slate-500">Total Staff</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{attendanceRecords.length}</div>
              </div>
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 shadow-xs">
                <div className="text-[11px] font-semibold text-emerald-700">Present (On Time)</div>
                <div className="text-lg font-black text-emerald-900 mt-0.5">{presentCount}</div>
              </div>
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 shadow-xs">
                <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                  <span>Late Arrivals</span>
                  <span className="text-[9px] px-1 bg-amber-200/60 rounded text-amber-800">+5m grace</span>
                </div>
                <div className="text-lg font-black text-amber-900 mt-0.5">{lateCount}</div>
              </div>
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200/80 shadow-xs">
                <div className="text-[11px] font-semibold text-indigo-700">Half Day</div>
                <div className="text-lg font-black text-indigo-900 mt-0.5">{halfDayCount}</div>
              </div>
              <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-200/80 shadow-xs">
                <div className="text-[11px] font-semibold text-sky-700">On Leave</div>
                <div className="text-lg font-black text-sky-900 mt-0.5">{leaveCount}</div>
              </div>
              <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200/80 shadow-xs">
                <div className="text-[11px] font-semibold text-rose-700">Absent</div>
                <div className="text-lg font-black text-rose-900 mt-0.5">{absentCount}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[11px] font-semibold text-slate-500">Unmarked</div>
                <div className="text-lg font-black text-slate-700 mt-0.5">{unmarkedCount}</div>
              </div>
            </div>

            {/* Attendance Table with Shift & Time Tracking */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Staff Member</th>
                      <th className="p-3.5">Campus</th>
                      <th className="p-3.5">Shift Arrival</th>
                      <th className="p-3.5">Time In (Check-In)</th>
                      <th className="p-3.5">Time Out (Check-Out)</th>
                      <th className="p-3.5">Punctuality / Delay</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions &amp; Quick Mark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingAttendance ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">Loading attendance sheet...</td>
                      </tr>
                    ) : attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">No active staff records found.</td>
                      </tr>
                    ) : (
                      attendanceRecords.map((rec) => {
                        const curStatus = rec.attendance_status;
                        const timeInVal = rec.time_in || rec.check_in_time;
                        const timeOutVal = rec.time_out || rec.check_out_time;
                        const shiftTime = rec.arrival_time || '9:00 AM';

                        return (
                          <tr key={rec.staff_id} className="hover:bg-slate-50/60 transition-colors">
                            {/* Code */}
                            <td className="p-3.5 font-mono font-bold text-slate-900">{rec.employee_code}</td>

                            {/* Staff Member */}
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{rec.full_name}</div>
                              <div className="text-[11px] text-slate-500">{rec.designation} • {rec.department}</div>
                            </td>

                            {/* Campus */}
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                                {rec.campus}
                              </span>
                            </td>

                            {/* Shift Arrival Time */}
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[11px] font-semibold" title="Scheduled shift start time (5m grace)">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{shiftTime}</span>
                              </span>
                            </td>

                            {/* Time In (Check-In) */}
                            <td className="p-3.5 whitespace-nowrap">
                              {timeInVal ? (
                                <button
                                  onClick={() => openTimeModal(rec)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer group"
                                  title="Click to adjust check-in time"
                                >
                                  <LogIn className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{timeInVal}</span>
                                  <Edit2 className="w-2.5 h-2.5 text-emerald-400 group-hover:text-emerald-700 ml-0.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleClockInNow(rec)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-dashed border-slate-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                                  title={`Check in staff now at ${liveClock}`}
                                >
                                  <LogIn className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Clock In ({attendanceDate === todayStr ? 'Now' : '9:00 AM'})</span>
                                </button>
                              )}
                            </td>

                            {/* Time Out (Check-Out) */}
                            <td className="p-3.5 whitespace-nowrap">
                              {timeOutVal ? (
                                <button
                                  onClick={() => openTimeModal(rec)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer group"
                                  title="Click to adjust check-out time"
                                >
                                  <LogOut className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                  <span>{timeOutVal}</span>
                                  <Edit2 className="w-2.5 h-2.5 text-sky-400 group-hover:text-sky-700 ml-0.5" />
                                </button>
                              ) : timeInVal ? (
                                <button
                                  onClick={() => handleClockOutNow(rec)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-dashed border-slate-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                                  title={`Clock out staff now at ${liveClock}`}
                                >
                                  <LogOut className="w-3 h-3 text-sky-600 shrink-0" />
                                  <span>Clock Out (Now)</span>
                                </button>
                              ) : (
                                <span className="text-slate-300 font-mono text-xs">—</span>
                              )}
                            </td>

                            {/* Punctuality / Delay */}
                            <td className="p-3.5 whitespace-nowrap">
                              {rec.late_minutes && rec.late_minutes > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300/60 rounded-md text-[10px] font-bold">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>+{rec.late_minutes}m Late</span>
                                </span>
                              ) : curStatus === 'present' && timeInVal ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300/60 rounded-md text-[10px] font-bold">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>On Time</span>
                                </span>
                              ) : curStatus === 'half_day' ? (
                                <span className="text-indigo-700 font-semibold text-[11px]">Half Day</span>
                              ) : (
                                <span className="text-slate-300 font-mono text-xs">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-3.5 whitespace-nowrap">
                              {curStatus ? (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                                  curStatus === 'present' ? 'bg-emerald-100 text-emerald-800' :
                                  curStatus === 'late' ? 'bg-amber-100 text-amber-800' :
                                  curStatus === 'half_day' ? 'bg-indigo-100 text-indigo-800' :
                                  curStatus === 'leave' ? 'bg-sky-100 text-sky-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  <span>{curStatus.replace('_', ' ')}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Not Marked</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleQuickStatus(rec, 'present')}
                                  title="Mark Present with live time"
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                    curStatus === 'present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700'
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  onClick={() => handleQuickStatus(rec, 'late')}
                                  title="Mark Late (3 Late = 1 Half-Day deduction)"
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                    curStatus === 'late'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700'
                                  }`}
                                >
                                  Late
                                </button>
                                <button
                                  onClick={() => handleQuickStatus(rec, 'half_day')}
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                    curStatus === 'half_day'
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700'
                                  }`}
                                >
                                  Half Day
                                </button>
                                <button
                                  onClick={() => handleQuickStatus(rec, 'leave')}
                                  title="Paid faculty leave (2/month allowed)"
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                    curStatus === 'leave'
                                      ? 'bg-sky-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700'
                                  }`}
                                >
                                  Leave
                                </button>
                                <button
                                  onClick={() => handleQuickStatus(rec, 'absent')}
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                    curStatus === 'absent'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700'
                                  }`}
                                >
                                  Absent
                                </button>
                                <button
                                  onClick={() => openTimeModal(rec)}
                                  className="p-1.5 text-slate-500 hover:text-[#6E1231] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                                  title="Adjust exact Time In, Time Out, and Remarks"
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: ADD / EDIT STAFF */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 font-display mb-4">
              {editingStaff ? 'Edit Staff Member' : 'Register New Staff Member'}
            </h3>

            <form onSubmit={handleSaveStaff} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={staffFormData.full_name || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, full_name: e.target.value })}
                    placeholder="e.g. Muhammad Aslam"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Father / Guardian Name</label>
                  <input
                    type="text"
                    value={staffFormData.father_name || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, father_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CNIC / Identity No</label>
                  <input
                    type="text"
                    value={staffFormData.cnic || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, cnic: e.target.value })}
                    placeholder="35202-xxxxxxx-x"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={staffFormData.designation || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, designation: e.target.value })}
                    placeholder="e.g. Senior Instructor / Accounts Officer"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={staffFormData.department || 'Academics'}
                    onChange={(e) => setStaffFormData({ ...staffFormData, department: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                  >
                    <option value="Academics">Academics / Faculty</option>
                    <option value="Administration">Administration</option>
                    <option value="Accounts & Finance">Accounts & Finance</option>
                    <option value="Admissions & Marketing">Admissions & Marketing</option>
                    <option value="IT & Infrastructure">IT & Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campus Assignment *</label>
                  <select
                    value={staffFormData.campus || 'Lahore'}
                    onChange={(e) => setStaffFormData({ ...staffFormData, campus: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white font-semibold"
                  >
                    <option value="Lahore">Lahore Campus</option>
                    <option value="Okara">Okara Campus</option>
                    <option value="Both">Both Campuses</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift / Scheduled Arrival Time *</label>
                  <input
                    type="text"
                    required
                    value={staffFormData.arrival_time || '9:00 AM'}
                    onChange={(e) => setStaffFormData({ ...staffFormData, arrival_time: e.target.value })}
                    placeholder="e.g. 9:00 AM or 08:30 AM"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-semibold"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '01:00 PM'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStaffFormData({ ...staffFormData, arrival_time: preset })}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                          staffFormData.arrival_time === preset
                            ? 'bg-[#6E1231] text-white border-[#6E1231]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">5-minute grace period is automatically applied</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Allowed Paid Leaves / Month *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={10}
                    value={staffFormData.allowed_leaves ?? 0}
                    onChange={(e) => setStaffFormData({ ...staffFormData, allowed_leaves: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Leaves beyond this are deducted automatically</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={staffFormData.phone || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={staffFormData.email || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                    placeholder="staff@digiskool.pk"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Status</label>
                  <select
                    value={staffFormData.status || 'active'}
                    onChange={(e) => setStaffFormData({ ...staffFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / On Hold</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
                >
                  {editingStaff ? 'Update Staff Member' : 'Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TIME & ATTENDANCE ADJUSTMENT */}
      {timeModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-50 text-[#6E1231] rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Adjust Attendance &amp; Shift Times
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Manage exact punch-in, punch-out, and punctuality records
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTimeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Staff Summary Card */}
            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">{selectedRecord.full_name}</div>
                <div className="text-[11px] text-slate-500">
                  {selectedRecord.employee_code} • {selectedRecord.designation} ({selectedRecord.campus})
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Shift Start</div>
                <div className="text-xs font-mono font-bold text-slate-800">
                  {selectedRecord.arrival_time || '9:00 AM'}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveTimeModal} className="space-y-4 text-xs">
              {/* Status Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Attendance Status *</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['present', 'late', 'half_day', 'leave', 'absent'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTimeModalForm((prev) => ({ ...prev, status: st }))}
                      className={`py-2 px-1 rounded-xl text-center font-bold text-[11px] capitalize border transition-all cursor-pointer ${
                        timeModalForm.status === st
                          ? st === 'present'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : st === 'late'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : st === 'half_day'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : st === 'leave'
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Check-In Time (Time In) */}
              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <LogIn className="w-4 h-4 text-emerald-600" />
                    <span>Check-In Time (Time In)</span>
                  </label>
                  {timeModalForm.time_in && (
                    <span className="text-[11px] font-mono font-bold text-emerald-800">
                      Display: {to12Hour(timeModalForm.time_in)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={timeModalForm.time_in}
                    onChange={(e) => {
                      const newIn = e.target.value;
                      const arrTime = timeModalForm.arrival_time || selectedRecord.arrival_time || '9:00 AM';
                      const inM = parseMinutes(newIn);
                      const arrM = parseMinutes(arrTime);
                      let newStatus = timeModalForm.status;
                      if (inM !== null && arrM !== null) {
                        const diff = inM - arrM;
                        if (diff > 5 && newStatus === 'present') {
                          newStatus = 'late';
                        } else if (diff <= 5 && newStatus === 'late') {
                          newStatus = 'present';
                        }
                      }
                      setTimeModalForm((prev) => ({
                        ...prev,
                        time_in: newIn,
                        status: newStatus
                      }));
                    }}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#6E1231] bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const now12 = getNowTime12();
                      const now24 = to24Hour(now12);
                      const arrTime = timeModalForm.arrival_time || selectedRecord.arrival_time || '9:00 AM';
                      const inM = parseMinutes(now24);
                      const arrM = parseMinutes(arrTime);
                      let newStatus = timeModalForm.status;
                      if (inM !== null && arrM !== null && inM - arrM > 5) {
                        newStatus = 'late';
                      } else if (newStatus === 'late') {
                        newStatus = 'present';
                      }
                      setTimeModalForm((prev) => ({
                        ...prev,
                        time_in: now24,
                        status: newStatus
                      }));
                    }}
                    className="px-2.5 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-[11px] font-bold hover:bg-emerald-50 transition-colors shrink-0"
                  >
                    Set Now ({getNowTime12()})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const arr = timeModalForm.arrival_time || selectedRecord.arrival_time || '9:00 AM';
                      setTimeModalForm((prev) => ({
                        ...prev,
                        time_in: to24Hour(arr),
                        status: 'present'
                      }));
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-colors shrink-0"
                  >
                    Scheduled ({timeModalForm.arrival_time || '9:00 AM'})
                  </button>
                  {timeModalForm.time_in && (
                    <button
                      type="button"
                      onClick={() => setTimeModalForm((prev) => ({ ...prev, time_in: '' }))}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Clear check-in time"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Grace period feedback banner */}
                {(() => {
                  if (!timeModalForm.time_in) return null;
                  const inM = parseMinutes(timeModalForm.time_in);
                  const arrM = parseMinutes(timeModalForm.arrival_time || selectedRecord.arrival_time || '9:00 AM');
                  if (inM === null || arrM === null) return null;
                  const diff = inM - arrM;

                  if (diff > 5) {
                    return (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-100/70 p-2 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Arrived +{diff} mins past shift time (Grace is 5 mins). Flagged as Late.</span>
                      </div>
                    );
                  } else if (diff > 0) {
                    return (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 p-2 rounded-lg">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Arrived +{diff}m after shift start, safely within 5-minute grace period (On Time).</span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 p-2 rounded-lg">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Punctual check-in ({Math.abs(diff)} mins early / on schedule).</span>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Check-Out Time (Time Out) */}
              <div className="p-3 bg-sky-50/40 rounded-xl border border-sky-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-sky-950 flex items-center gap-1.5">
                    <LogOut className="w-4 h-4 text-sky-600" />
                    <span>Check-Out Time (Time Out)</span>
                  </label>
                  {timeModalForm.time_out && (
                    <span className="text-[11px] font-mono font-bold text-sky-800">
                      Display: {to12Hour(timeModalForm.time_out)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={timeModalForm.time_out}
                    onChange={(e) => setTimeModalForm((prev) => ({ ...prev, time_out: e.target.value }))}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#6E1231] bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const now12 = getNowTime12();
                      setTimeModalForm((prev) => ({ ...prev, time_out: to24Hour(now12) }));
                    }}
                    className="px-2.5 py-1.5 bg-white border border-sky-300 text-sky-800 rounded-lg text-[11px] font-bold hover:bg-sky-50 transition-colors shrink-0"
                  >
                    Set Now ({getNowTime12()})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeModalForm((prev) => ({ ...prev, time_out: '17:00' }))}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-colors shrink-0"
                  >
                    05:00 PM
                  </button>
                  {timeModalForm.time_out && (
                    <button
                      type="button"
                      onClick={() => setTimeModalForm((prev) => ({ ...prev, time_out: '' }))}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Clear check-out time"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Remarks / Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Note (Optional)</label>
                <input
                  type="text"
                  value={timeModalForm.remarks}
                  onChange={(e) => setTimeModalForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="e.g. Official Duty, Medical Appointment, Heavy traffic..."
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] text-xs"
                />
              </div>

              {/* Footer actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTimeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
                >
                  Save Attendance Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE STAFF */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-50 rounded-xl border border-red-100">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Delete Staff Member</h3>
                <p className="text-xs text-slate-500">Permanent action confirmation</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-2">
              Are you sure you want to delete <span className="font-bold text-slate-900">{staffToDelete.name}</span>?
            </p>
            <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              This will permanently remove their employee profile, attendance logs, and leave records from the system.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deletingStaff}
                onClick={() => {
                  setStaffToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingStaff}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingStaff ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Staff Member</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Staff Modal */}
    </div>
  );
};
