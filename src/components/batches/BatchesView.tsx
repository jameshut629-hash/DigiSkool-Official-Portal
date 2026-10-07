import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Users, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { Batch, Course } from '../../types.ts';
import { apiRequest, formatDate } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../common/Modal.tsx';

export const BatchesView: React.FC = () => {
  const { isOwner, isAdmin } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Partial<Batch> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bts, crs] = await Promise.all([
        apiRequest<Batch[]>('/api/batches'),
        apiRequest<Course[]>('/api/courses')
      ]);
      setBatches(bts);
      setCourses(crs);
    } catch (err: any) {
      alert('Failed to load batches: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch?.name || !editingBatch?.course_id || !editingBatch?.start_date) {
      alert('Batch Name, Course, and Start Date are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBatch.id) {
        await apiRequest(`/api/batches/${editingBatch.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingBatch)
        });
      } else {
        await apiRequest('/api/batches', {
          method: 'POST',
          body: JSON.stringify(editingBatch)
        });
      }
      setModalOpen(false);
      setEditingBatch(null);
      loadData();
    } catch (err: any) {
      alert('Failed to save batch: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">Batches & Class Schedule</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            DigiSkool classroom labs, timetable, assigned instructors, and student capacity
          </p>
        </div>
        {(isOwner || isAdmin) && (
          <button
            onClick={() => {
              setEditingBatch({
                name: '',
                course_id: courses[0]?.id || 1,
                start_date: new Date().toISOString().split('T')[0],
                days: 'Mon, Wed, Fri',
                start_time: '04:00 PM',
                end_time: '06:00 PM',
                room_lab: 'Lab 1 (DigiSkool Campus)',
                instructor_name: 'Hamza Farooq',
                max_capacity: 25,
                status: 'upcoming'
              });
              setModalOpen(true);
            }}
            className="px-3.5 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Batch</span>
          </button>
        )}
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Batch Name</th>
                <th className="p-3.5">Course</th>
                <th className="p-3.5">Instructor</th>
                <th className="p-3.5">Days & Timing</th>
                <th className="p-3.5">Room / Lab</th>
                <th className="p-3.5">Enrolled / Capacity</th>
                <th className="p-3.5">Status</th>
                {(isOwner || isAdmin) && <th className="p-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Loading batches...</td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">No batches created yet.</td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 font-display">
                      {batch.name}
                      <div className="text-[10px] text-slate-400 font-sans font-normal">
                        Starts: {formatDate(batch.start_date)}
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">{batch.course_name}</td>
                    <td className="p-3.5 text-slate-700 font-semibold">{batch.instructor_name || 'Assigned Instructor'}</td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900">{batch.days}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{batch.start_time} - {batch.end_time}</div>
                    </td>
                    <td className="p-3.5 text-slate-600">{batch.room_lab || 'DigiSkool Lab'}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-slate-900">{batch.enrolled_students || 0}</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-500">{batch.max_capacity || batch.max_students || 30}</span>
                      </div>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.round(((batch.enrolled_students || batch.current_enrollment || 0) / (batch.max_capacity || batch.max_students || 30)) * 100))}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        batch.status === 'running' ? 'bg-emerald-100 text-emerald-800' :
                        batch.status === 'upcoming' ? 'bg-sky-100 text-sky-800' :
                        batch.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                    {(isOwner || isAdmin) && (
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setEditingBatch(batch);
                            setModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-[#6E1231] hover:bg-rose-50 rounded-lg transition-colors"
                          title="Edit Batch"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && editingBatch && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title={editingBatch.id ? 'Edit Batch' : 'Create Class Batch'}
          subtitle="DigiSkool Course Schedule & Lab Allocation"
          maxWidth="md"
        >
          <form onSubmit={handleSave} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Course *</label>
              <select
                value={editingBatch.course_id || ''}
                onChange={(e) => setEditingBatch({ ...editingBatch, course_id: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                required
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Batch Name *</label>
                <input
                  type="text"
                  required
                  value={editingBatch.name || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, name: e.target.value })}
                  placeholder="e.g. Batch 2025-A"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={editingBatch.start_date || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, start_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Days of Week</label>
                <input
                  type="text"
                  value={editingBatch.days || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, days: e.target.value })}
                  placeholder="e.g. Mon, Wed, Fri"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Classroom / Lab</label>
                <input
                  type="text"
                  value={editingBatch.room_lab || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, room_lab: e.target.value })}
                  placeholder="e.g. Lab 1"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                <input
                  type="text"
                  value={editingBatch.start_time || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, start_time: e.target.value })}
                  placeholder="04:00 PM"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                <input
                  type="text"
                  value={editingBatch.end_time || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, end_time: e.target.value })}
                  placeholder="06:00 PM"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instructor Name</label>
                <input
                  type="text"
                  value={editingBatch.instructor_name || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, instructor_name: e.target.value })}
                  placeholder="Hamza Farooq"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Capacity</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={editingBatch.max_capacity || 25}
                  onChange={(e) => setEditingBatch({ ...editingBatch, max_capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={editingBatch.status || 'upcoming'}
                onChange={(e) => setEditingBatch({ ...editingBatch, status: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
              >
                <option value="upcoming">Upcoming</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 font-bold bg-[#6E1231] hover:bg-[#85173A] text-white rounded-lg transition-all"
              >
                {submitting ? 'Saving...' : editingBatch.id ? 'Save Batch' : 'Create Batch'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
