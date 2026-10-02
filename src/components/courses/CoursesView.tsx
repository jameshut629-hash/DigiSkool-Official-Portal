import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Clock, Globe, Laptop, CheckCircle2, Shield } from 'lucide-react';
import { Course } from '../../types.ts';
import { apiRequest, formatPKR } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../common/Modal.tsx';

export const CoursesView: React.FC = () => {
  const { isOwner, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Safe tools parser for arrays of objects, arrays of strings, or comma-separated strings
  const parseTools = (tools: any): string[] => {
    if (!tools) return [];
    if (Array.isArray(tools)) {
      return tools
        .map((t) => (typeof t === 'string' ? t.trim() : (t?.name || t?.tool_name || '')).trim())
        .filter(Boolean);
    }
    if (typeof tools === 'string') {
      return tools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [];
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Course[]>('/api/courses');
      setCourses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      alert('Failed to load courses: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse?.name || !editingCourse?.code || editingCourse.fee === undefined) {
      alert('Course name, code, and fee are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...editingCourse,
        duration: editingCourse.duration || `${editingCourse.duration_months || 2} Months`,
        duration_months: editingCourse.duration_months || 2,
        tools: typeof editingCourse.tools === 'string' ? editingCourse.tools : parseTools(editingCourse.tools).join(', ')
      };

      if (editingCourse.id) {
        await apiRequest(`/api/courses/${editingCourse.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/api/courses', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setEditModalOpen(false);
      setEditingCourse(null);
      loadCourses();
    } catch (err: any) {
      alert('Failed to save course: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">DigiSkool Digital Skills Courses</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official curriculum, tools, and pricing in PKR for professional digital tracks
          </p>
        </div>
        {(isOwner || isAdmin) && (
          <button
            onClick={() => {
              setEditingCourse({
                name: '',
                code: '',
                fee: 30000,
                duration_months: 2,
                duration: '2 Months',
                mode: 'Hybrid',
                status: 'active',
                tools: 'Git, VS Code'
              });
              setEditModalOpen(true);
            }}
            className="px-3.5 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Course</span>
          </button>
        )}
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">Loading DigiSkool courses...</div>
        ) : courses.map((course) => {
          const toolsList = parseTools(course.tools);
          return (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-[#6E1231] font-mono text-[10px] font-bold border border-rose-200">
                    {course.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      {course.mode}
                    </span>
                    {(isOwner || isAdmin) && (
                      <button
                        onClick={() => {
                          const toolsString = parseTools(course.tools).join(', ');
                          const months = course.duration_months || parseInt(course.duration || '', 10) || 2;
                          setEditingCourse({
                            ...course,
                            tools: toolsString,
                            duration_months: months,
                            duration: course.duration || `${months} Months`
                          });
                          setEditModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        title="Edit Course & Pricing"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 font-display mt-3 leading-snug">
                  {course.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {course.description || 'Comprehensive, hands-on digital skills program designed for the modern tech market.'}
                </p>

                {/* Duration & Mode */}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{course.duration || `${course.duration_months || 2} Months`}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Laptop className="w-3.5 h-3.5 text-slate-400" />
                    <span>{course.mode} Sessions</span>
                  </div>
                </div>

                {/* Tools & Tech stack */}
                {toolsList.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {toolsList.map((tool, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Banner */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Official Fee
                  </span>
                  <span className="text-lg font-black text-slate-900 font-display">
                    {formatPKR(course.fee)}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {course.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Course Modal */}
      {editModalOpen && editingCourse && (
        <Modal
          isOpen={true}
          onClose={() => setEditModalOpen(false)}
          title={editingCourse.id ? 'Edit DigiSkool Course' : 'Create New Digital Skills Course'}
          subtitle="Course Details, Official Fee (PKR), Duration & Tools"
          maxWidth="lg"
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Name *</label>
                <input
                  type="text"
                  required
                  value={editingCourse.name || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                  placeholder="e.g. Flutter & Mobile App Development"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={editingCourse.code || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. DSK-FLUTTER"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Fee in PKR *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={500}
                  value={editingCourse.fee || 0}
                  onChange={(e) => setEditingCourse({ ...editingCourse, fee: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Duration (Months)</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={editingCourse.duration_months || 2}
                  onChange={(e) => {
                    const months = Number(e.target.value);
                    setEditingCourse({
                      ...editingCourse,
                      duration_months: months,
                      duration: `${months} Months`
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Mode</label>
                <select
                  value={editingCourse.mode || 'Hybrid'}
                  onChange={(e) => setEditingCourse({ ...editingCourse, mode: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                >
                  <option value="Hybrid">Hybrid (Onsite + Online)</option>
                  <option value="Onsite">Onsite (Lab Sessions)</option>
                  <option value="Online">Online Live</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editingCourse.status || 'active'}
                  onChange={(e) => setEditingCourse({ ...editingCourse, status: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tools & Technologies (Comma-separated)</label>
              <input
                type="text"
                value={typeof editingCourse.tools === 'string' ? editingCourse.tools : parseTools(editingCourse.tools).join(', ')}
                onChange={(e) => setEditingCourse({ ...editingCourse, tools: e.target.value })}
                placeholder="Flutter, Dart, Firebase, REST APIs, Git"
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
              <textarea
                rows={3}
                value={editingCourse.description || ''}
                onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                placeholder="Course scope, objectives, and career outcomes..."
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 font-bold bg-[#6E1231] hover:bg-[#85173A] text-white rounded-lg transition-all"
              >
                {submitting ? 'Saving...' : editingCourse.id ? 'Update Course' : 'Create Course'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
