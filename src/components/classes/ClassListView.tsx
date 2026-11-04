import React, { useState } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  Users,
  CalendarCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Filter,
  MoreVertical,
} from 'lucide-react';
import { ClassItem } from '../../types';
import { CLASS_COLORS, getAttendanceRateBadge } from '../../lib/utils';

interface ClassListViewProps {
  classes: ClassItem[];
  onSelectClass: (c: ClassItem, tab?: string) => void;
  onOpenCreateClass: () => void;
  onTakeAttendance: (c: ClassItem) => void;
}

export const ClassListView: React.FC<ClassListViewProps> = ({
  classes,
  onSelectClass,
  onOpenCreateClass,
  onTakeAttendance,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const subjects = Array.from(new Set(classes.map((c) => c.subject))).filter(Boolean);

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch =
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.grade_level.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.room && cls.room.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cls.section && cls.section.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSubject = selectedSubject === 'all' || cls.subject === selectedSubject;

    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Classrooms</h1>
          <p className="text-sm text-slate-500">
            Manage your student rosters, mark daily attendance, and track attendance trends
          </p>
        </div>

        <button
          onClick={onOpenCreateClass}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm shadow-indigo-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Classroom</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search classes by name, grade, room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
          >
            <option value="all">All Subjects ({classes.length})</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Class Cards Grid */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No classes found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedSubject !== 'all'
              ? 'Try adjusting your search criteria or filters.'
              : 'Get started by creating your first classroom to manage attendance.'}
          </p>
          {(searchTerm || selectedSubject !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSubject('all');
              }}
              className="mt-4 text-xs font-semibold text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
            const colorConfig = CLASS_COLORS[cls.color] || CLASS_COLORS.indigo;
            const avgRate = cls.avg_attendance ?? 0;
            const rateBadge = getAttendanceRateBadge(avgRate, cls.min_attendance_threshold);

            return (
              <div
                key={cls.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Header Accent Bar */}
                <div className={`h-2.5 w-full ${colorConfig.accent}`} />

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Top row: Subject & Today's status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${colorConfig.badge}`}>
                        {cls.subject}
                      </span>
                      {cls.today_marked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Marked Today
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" /> Roll Pending
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => onSelectClass(cls)}
                      className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {cls.name}
                    </h3>

                    {/* Metadata */}
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                      <span>{cls.grade_level}</span>
                      {cls.section && <span>• {cls.section}</span>}
                      {cls.room && <span>• {cls.room}</span>}
                    </div>

                    {cls.schedule && (
                      <div className="mt-2.5 text-xs text-slate-600 font-medium bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 truncate">
                        {cls.schedule}
                      </div>
                    )}
                  </div>

                  {/* Class Stats Summary */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-600 font-medium">
                        {cls.student_count || 0} students
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-slate-500">Avg:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] border ${rateBadge.color}`}>
                        {avgRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectClass(cls, 'students')}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    View Roster
                  </button>

                  <button
                    onClick={() => onTakeAttendance(cls)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span>{cls.today_marked ? 'Edit Roll' : 'Take Roll'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
