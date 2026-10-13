import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Loader2,
  Shield
} from 'lucide-react';
import { StaffMember } from '../../types.ts';
import { apiRequest, formatDate } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { showToast } from '../../lib/notify.ts';

export const StaffView: React.FC = () => {
  const { isOwner, isAdmin } = useAuth();

  // Staff directory state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [searchStaff, setSearchStaff] = useState('');
  const [campusFilter, setCampusFilter] = useState<'all' | 'Lahore' | 'Okara'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
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

  // Delete staff confirmation modal state
  const [staffToDelete, setStaffToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deletingStaff, setDeletingStaff] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  useEffect(() => {
    loadStaff();
  }, [campusFilter]);

  // Handle staff form submission
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.full_name.trim()) {
      showToast('Full Name is required.', 'warning');
      return;
    }

    try {
      if (editingStaff) {
        await apiRequest(`/api/staff/${editingStaff.id}`, {
          method: 'PUT',
          body: JSON.stringify(staffFormData)
        });
        showToast(`Staff member "${staffFormData.full_name}" updated successfully.`, 'success');
      } else {
        await apiRequest('/api/staff', {
          method: 'POST',
          body: JSON.stringify(staffFormData)
        });
        showToast(`New staff member "${staffFormData.full_name}" registered successfully.`, 'success');
      }
      setStaffModalOpen(false);
      setEditingStaff(null);
      loadStaff();
    } catch (err: any) {
      showToast('Failed to save staff member: ' + err.message, 'error');
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
      showToast(`Staff member "${staffToDelete.name}" removed successfully.`, 'info');
      setStaffToDelete(null);
      loadStaff();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete staff member');
    } finally {
      setDeletingStaff(false);
    }
  };

  // Filter staff list
  const filteredStaff = staffList.filter((s) => {
    const q = searchStaff.toLowerCase();
    const matchesSearch =
      s.full_name.toLowerCase().includes(q) ||
      (s.employee_code && s.employee_code.toLowerCase().includes(q)) ||
      (s.designation && s.designation.toLowerCase().includes(q)) ||
      (s.department && s.department.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q));

    const matchesDept = departmentFilter === 'all' || s.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  // Calculate high-level summary cards
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.status === 'active').length;
  const facultyStaff = staffList.filter((s) => (s.department || '').toLowerCase().includes('academic') || (s.designation || '').toLowerCase().includes('trainer') || (s.designation || '').toLowerCase().includes('expert') || (s.designation || '').toLowerCase().includes('instructor')).length;
  const lahoreStaff = staffList.filter((s) => (s.campus || '').toLowerCase().includes('lahore')).length;
  const okaraStaff = staffList.filter((s) => (s.campus || '').toLowerCase().includes('okara')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6E1231]" />
            <span>Staff Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official institutional faculty, trainers, instructors, management, and administrative personnel
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Campus Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setCampusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                campusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Both Campuses
            </button>
            <button
              onClick={() => setCampusFilter('Lahore')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                campusFilter === 'Lahore'
                  ? 'bg-white text-[#6E1231] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Lahore Office
            </button>
            <button
              onClick={() => setCampusFilter('Okara')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                campusFilter === 'Okara'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Okara Office
            </button>
          </div>

          {(isOwner || isAdmin) && (
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-[#6E1231]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-display">{totalStaff}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {activeStaff} Active Personnel
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Faculty & Trainers</span>
            <Briefcase className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-display">{facultyStaff}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Instructors & Leads
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lahore Office</span>
            <Building2 className="w-4 h-4 text-[#6E1231]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-display">{lahoreStaff}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            NFC Phase 1 Campus
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Okara Office</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-display">{okaraStaff}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Faisal Colony Campus
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchStaff}
            onChange={(e) => setSearchStaff(e.target.value)}
            placeholder="Search staff by name, code, designation, department, phone..."
            className="w-full text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Departments</option>
            <option value="Academics">Academics</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Social Media">Social Media</option>
            <option value="SEO">SEO</option>
            <option value="Development">Development</option>
            <option value="Operations">Operations</option>
            <option value="Admissions">Admissions</option>
            <option value="Design">Design</option>
          </select>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Employee Name</th>
                <th className="p-3.5">Designation & Department</th>
                <th className="p-3.5">Campus</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Shift / Shift Arrival</th>
                <th className="p-3.5">Status</th>
                {(isOwner || isAdmin) && <th className="p-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingStaff ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6E1231]" />
                    Loading staff directory...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[11px]">
                        {staff.employee_code || `EMP-${staff.id}`}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{staff.full_name}</div>
                      {staff.father_name && (
                        <div className="text-[11px] text-slate-400">S/D/O {staff.father_name}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{staff.designation}</div>
                      <div className="text-[11px] text-slate-500">{staff.department}</div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          (staff.campus || '').toLowerCase().includes('okara')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-[#6E1231] border border-rose-200'
                        }`}
                      >
                        <Building2 className="w-3 h-3" />
                        {staff.campus || 'Lahore'}
                      </span>
                    </td>
                    <td className="p-3.5 space-y-0.5">
                      {staff.phone && (
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                      {staff.email && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{staff.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-700">
                      <div>{staff.arrival_time || '09:00 AM'}</div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        {staff.allowed_leaves ?? 2} paid leaves/mo
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          staff.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            staff.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {staff.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {(isOwner || isAdmin) && (
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingStaff(staff);
                              setStaffFormData({
                                full_name: staff.full_name || '',
                                father_name: staff.father_name || '',
                                cnic: staff.cnic || '',
                                phone: staff.phone || '',
                                email: staff.email || '',
                                designation: staff.designation || 'Instructor',
                                department: staff.department || 'Academics',
                                campus: staff.campus || 'Lahore',
                                arrival_time: staff.arrival_time || '9:00 AM',
                                allowed_leaves: staff.allowed_leaves ?? 2,
                                joining_date: staff.joining_date || new Date().toISOString().split('T')[0],
                                status: (staff.status as any) || 'active'
                              });
                              setStaffModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#6E1231] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(staff.id, staff.full_name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Staff Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL: ADD / EDIT STAFF MEMBER */}
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
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white font-medium"
                  >
                    <option value="Academics">Academics / Faculty</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Social Media">Social Media</option>
                    <option value="SEO">SEO</option>
                    <option value="Development">Development</option>
                    <option value="Administration">Administration</option>
                    <option value="Operations">Operations</option>
                    <option value="Admissions">Admissions & Counseling</option>
                    <option value="Design">Design & Multimedia</option>
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
                    {['08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '12:30 PM', '02:30 PM'].map((preset) => (
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
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Allowed Paid Leaves / Month *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={10}
                    value={staffFormData.allowed_leaves ?? 2}
                    onChange={(e) => setStaffFormData({ ...staffFormData, allowed_leaves: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                  />
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
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white font-medium"
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
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold cursor-pointer"
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
              This will remove their employee record from the institute staff roster.
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
    </div>
  );
};
