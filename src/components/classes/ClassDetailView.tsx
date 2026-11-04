import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Calendar,
  BarChart3,
  Settings,
  ArrowLeft,
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  X,
  MessageSquare,
  Sparkles,
  Phone,
  Mail,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Save,
  RotateCcw,
} from 'lucide-react';
import {
  ClassItem,
  Student,
  AttendanceStudentEntry,
  AttendanceStatus,
  AttendanceSession,
  ClassStatistics,
  AttendanceMatrixData,
} from '../../types';
import { api } from '../../lib/api';
import {
  CLASS_COLORS,
  STATUS_CONFIG,
  formatDate,
  formatShortDate,
  formatDayOfWeek,
  getTodayString,
  getOffsetDateString,
  getAttendanceRateBadge,
  downloadCSV,
} from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { StudentModal } from '../modals/StudentModal';
import { BulkImportStudentsModal } from '../modals/BulkImportStudentsModal';

interface ClassDetailViewProps {
  initialClass: ClassItem;
  initialTab?: string;
  onBack: () => void;
  onClassUpdated: (updated: ClassItem) => void;
  onClassDeleted: (id: string) => void;
}

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({
  initialClass,
  initialTab = 'take_attendance',
  onBack,
  onClassUpdated,
  onClassDeleted,
}) => {
  const { addToast } = useToast();
  const [currentClass, setCurrentClass] = useState<ClassItem>(initialClass);
  const [activeTab, setActiveTab] = useState<'take_attendance' | 'students' | 'history' | 'statistics' | 'settings'>(
    (initialTab as any) || 'take_attendance'
  );

  // Take Attendance State
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceStudentEntry[]>([]);
  const [sessionInfo, setSessionInfo] = useState<AttendanceSession | null>(null);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(true);
  const [isSavingAttendance, setIsSavingAttendance] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [searchRosterQuery, setSearchRosterQuery] = useState<string>('');
  const [openRemarkStudentId, setOpenRemarkStudentId] = useState<string | null>(null);

  // Students Tab State
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState<boolean>(false);
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // History Tab State
  const [historySessions, setHistorySessions] = useState<AttendanceSession[]>([]);
  const [matrixData, setMatrixData] = useState<AttendanceMatrixData | null>(null);
  const [historyViewMode, setHistoryViewMode] = useState<'sessions' | 'matrix'>('sessions');
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Statistics Tab State
  const [statistics, setStatistics] = useState<ClassStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);

  // Settings State
  const [editFormData, setEditFormData] = useState({
    name: initialClass.name,
    subject: initialClass.subject,
    grade_level: initialClass.grade_level,
    section: initialClass.section || '',
    room: initialClass.room || '',
    color: initialClass.color,
    schedule: initialClass.schedule || '',
    description: initialClass.description || '',
    min_attendance_threshold: initialClass.min_attendance_threshold,
  });
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [showDeleteClassConfirm, setShowDeleteClassConfirm] = useState<boolean>(false);

  // Fetch Attendance for Selected Date
  const loadAttendanceForDate = async (date: string) => {
    try {
      setAttendanceLoading(true);
      const res = await api.getAttendanceForDate(currentClass.id, date);
      setSessionInfo(res.session);
      setSessionNotes(res.session?.notes || '');

      // If already marked, use recorded status; if not marked, default to null so teacher can review or bulk mark
      const entries = res.students.map((s) => ({
        ...s,
        attendance_status: s.attendance_status || null,
        remarks: s.remarks || '',
      }));
      setAttendanceEntries(entries);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      addToast(err.message || 'Failed to load attendance', 'error');
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch Students Roster
  const loadStudents = async () => {
    try {
      setStudentsLoading(true);
      const data = await api.getClassStudents(currentClass.id);
      setStudents(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to load students roster', 'error');
    } finally {
      setStudentsLoading(false);
    }
  };

  // Fetch History
  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const [hist, mat] = await Promise.all([
        api.getClassHistory(currentClass.id),
        api.getClassMatrix(currentClass.id),
      ]);
      setHistorySessions(hist);
      setMatrixData(mat);
    } catch (err: any) {
      addToast(err.message || 'Failed to load attendance history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch Statistics
  const loadStatistics = async () => {
    try {
      setStatsLoading(true);
      const data = await api.getClassStatistics(currentClass.id);
      setStatistics(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to load statistics', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  // Load appropriate data on tab change
  useEffect(() => {
    if (activeTab === 'take_attendance') {
      loadAttendanceForDate(selectedDate);
    } else if (activeTab === 'students') {
      loadStudents();
    } else if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'statistics') {
      loadStatistics();
    }
  }, [activeTab, currentClass.id]);

  // When date changes in take_attendance tab
  const handleDateChange = (newDate: string) => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved attendance changes for this date. Discard and switch date?')) {
        return;
      }
    }
    setSelectedDate(newDate);
    loadAttendanceForDate(newDate);
  };

  // Attendance Marking Actions
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceEntries((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, attendance_status: status } : s))
    );
    setHasUnsavedChanges(true);
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    setAttendanceEntries((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, remarks: remark } : s))
    );
    setHasUnsavedChanges(true);
  };

  const handleBulkMark = (status: AttendanceStatus) => {
    setAttendanceEntries((prev) =>
      prev.map((s) => ({
        ...s,
        attendance_status: status,
      }))
    );
    setHasUnsavedChanges(true);
    addToast(`Marked all ${attendanceEntries.length} students as ${STATUS_CONFIG[status].label}`, 'info');
  };

  const handleClearAll = () => {
    setAttendanceEntries((prev) =>
      prev.map((s) => ({
        ...s,
        attendance_status: null,
      }))
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveAttendance = async () => {
    const unassigned = attendanceEntries.filter((s) => !s.attendance_status);
    if (unassigned.length > 0) {
      if (
        !window.confirm(
          `${unassigned.length} students have no attendance status selected. They will be marked as Absent. Continue?`
        )
      ) {
        return;
      }
    }

    try {
      setIsSavingAttendance(true);
      const recordsToSave = attendanceEntries.map((s) => ({
        student_id: s.id,
        status: s.attendance_status || ('absent' as AttendanceStatus),
        remarks: s.remarks || null,
      }));

      const res = await api.saveAttendance(currentClass.id, {
        date: selectedDate,
        title: sessionInfo?.title || `Session on ${formatDate(selectedDate)}`,
        notes: sessionNotes || null,
        records: recordsToSave,
      });

      addToast(`Attendance saved successfully for ${res.recordsSaved} students!`, 'success');
      setHasUnsavedChanges(false);

      // Reload fresh state
      await loadAttendanceForDate(selectedDate);

      // Refresh class in parent
      const updatedClass = await api.getClass(currentClass.id);
      setCurrentClass(updatedClass);
      onClassUpdated(updatedClass);
    } catch (err: any) {
      addToast(err.message || 'Failed to save attendance', 'error');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!window.confirm(`Delete attendance record for ${formatDate(selectedDate)}?`)) {
      return;
    }
    try {
      await api.deleteAttendance(currentClass.id, selectedDate);
      addToast('Attendance record deleted for this date', 'info');
      await loadAttendanceForDate(selectedDate);
      const updatedClass = await api.getClass(currentClass.id);
      setCurrentClass(updatedClass);
      onClassUpdated(updatedClass);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete attendance session', 'error');
    }
  };

  // Student CRUD
  const handleSaveStudent = async (studentData: Partial<Student>) => {
    if (editingStudent) {
      const res = await api.updateStudent(currentClass.id, editingStudent.id, studentData);
      addToast(`Updated student ${res.first_name} ${res.last_name}`, 'success');
    } else {
      const res = await api.addStudent(currentClass.id, studentData);
      addToast(`Added student ${res.first_name} ${res.last_name}`, 'success');
    }
    loadStudents();
    const updatedClass = await api.getClass(currentClass.id);
    setCurrentClass(updatedClass);
    onClassUpdated(updatedClass);
  };

  const handleDeleteStudent = async (student: Student) => {
    try {
      await api.deleteStudent(currentClass.id, student.id);
      addToast(`Removed ${student.first_name} ${student.last_name}`, 'info');
      setStudentToDelete(null);
      loadStudents();
      const updatedClass = await api.getClass(currentClass.id);
      setCurrentClass(updatedClass);
      onClassUpdated(updatedClass);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete student', 'error');
    }
  };

  const handleBatchImport = async (studentsList: Partial<Student>[]) => {
    const res = await api.batchAddStudents(currentClass.id, studentsList);
    addToast(`Successfully imported ${res.addedCount} students!`, 'success');
    loadStudents();
    const updatedClass = await api.getClass(currentClass.id);
    setCurrentClass(updatedClass);
    onClassUpdated(updatedClass);
    return res;
  };

  // Class Settings Update
  const handleSaveClassSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      const updated = await api.updateClass(currentClass.id, editFormData);
      setCurrentClass(updated);
      onClassUpdated(updated);
      addToast('Classroom settings updated successfully!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteClass = async () => {
    try {
      await api.deleteClass(currentClass.id);
      addToast(`Deleted classroom "${currentClass.name}"`, 'info');
      onClassDeleted(currentClass.id);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete class', 'error');
    }
  };

  // CSV Export functions
  const handleExportRoster = () => {
    const headers = [
      'Student ID',
      'First Name',
      'Last Name',
      'Gender',
      'Email',
      'Phone',
      'Guardian Name',
      'Guardian Phone',
      'Total Sessions',
      'Attendance %',
      'Present Count',
      'Late Count',
      'Absent Count',
      'Excused Count',
    ];
    const rows = students.map((s) => [
      s.student_id_number,
      s.first_name,
      s.last_name,
      s.gender || '',
      s.email || '',
      s.phone || '',
      s.guardian_name || '',
      s.guardian_contact || '',
      String(s.total_sessions || 0),
      `${s.attendance_percentage || 0}%`,
      String(s.present_count || 0),
      String(s.late_count || 0),
      String(s.absent_count || 0),
      String(s.excused_count || 0),
    ]);
    downloadCSV(`${currentClass.name.replace(/\s+/g, '_')}_Roster.csv`, [headers, ...rows]);
    addToast('Student roster exported to CSV', 'success');
  };

  const handleExportMatrix = () => {
    if (!matrixData) return;
    const dates = matrixData.sessions.map((s) => s.date);
    const headers = ['Student ID', 'Student Name', ...dates, 'Attendance %'];
    const rows = matrixData.students.map((student) => {
      const studentDates = dates.map((d) => {
        const entry = matrixData.matrix[student.id]?.[d];
        if (!entry) return '-';
        return entry.status.toUpperCase();
      });
      return [
        student.student_id_number,
        `${student.first_name} ${student.last_name}`,
        ...studentDates,
        `${student.attendance_percentage || 0}%`,
      ];
    });
    downloadCSV(`${currentClass.name.replace(/\s+/g, '_')}_Attendance_Matrix.csv`, [headers, ...rows]);
    addToast('Attendance Matrix exported to CSV', 'success');
  };

  // Calculations for Take Attendance live bar
  const totalRosterCount = attendanceEntries.length;
  const presentCount = attendanceEntries.filter((s) => s.attendance_status === 'present').length;
  const lateCount = attendanceEntries.filter((s) => s.attendance_status === 'late').length;
  const absentCount = attendanceEntries.filter((s) => s.attendance_status === 'absent').length;
  const excusedCount = attendanceEntries.filter((s) => s.attendance_status === 'excused').length;
  const unassignedCount = attendanceEntries.filter((s) => !s.attendance_status).length;

  const currentAttendanceRate =
    totalRosterCount > 0
      ? Math.round(((presentCount + lateCount * 0.5) / totalRosterCount) * 100)
      : 0;

  const filteredAttendanceEntries = attendanceEntries.filter((s) => {
    const q = searchRosterQuery.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.student_id_number.toLowerCase().includes(q)
    );
  });

  const filteredStudents = students.filter((s) => {
    const q = searchStudentQuery.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.student_id_number.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  const colorConfig = CLASS_COLORS[currentClass.color] || CLASS_COLORS.indigo;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200/80"
              title="Back to All Classes"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${colorConfig.badge}`}>
                  {currentClass.subject}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-600">{currentClass.grade_level}</span>
                {currentClass.section && (
                  <>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-medium text-slate-600">{currentClass.section}</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {currentClass.name}
              </h1>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-800">{currentClass.student_count || 0}</span>
              <span className="text-slate-500">Students</span>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-800">{currentClass.avg_attendance ?? 0}%</span>
              <span className="text-slate-500">Avg Attendance</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('take_attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'take_attendance'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Take Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students ({currentClass.student_count || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Attendance History</span>
          </button>

          <button
            onClick={() => setActiveTab('statistics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'statistics'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statistics</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TAKE ATTENDANCE                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'take_attendance' && (
        <div className="space-y-6">
          {/* Date Picker & Quick Actions Toolbar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Date Selection */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Selected Session Date
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-slate-50 font-semibold text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-xs font-semibold text-slate-500 hidden sm:block">
                    {formatDayOfWeek(selectedDate)}
                  </div>
                </div>
              </div>

              {/* Quick Date Switch Pills */}
              <div className="flex items-center gap-1.5 self-end">
                <button
                  type="button"
                  onClick={() => handleDateChange(getTodayString())}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    selectedDate === getTodayString()
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(getOffsetDateString(-1))}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    selectedDate === getOffsetDateString(-1)
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(getOffsetDateString(-2))}
                  className="hidden md:block px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  -2 Days
                </button>
              </div>
            </div>

            {/* Right: Session Status badge */}
            <div className="flex items-center gap-3">
              {sessionInfo ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold">Attendance Saved</span>
                    <span className="text-[11px] text-emerald-600 ml-1.5 hidden sm:inline">
                      ({formatDate(sessionInfo.created_at)})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-bold">Not Marked Yet</span>
                </div>
              )}

              {sessionInfo && (
                <button
                  onClick={handleDeleteSession}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                  title="Clear attendance records for this date"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bulk Action Controls Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Quick Mark:
              </span>
              <button
                type="button"
                onClick={() => handleBulkMark('present')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkMark('absent')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Mark All Absent</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkMark('late')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                All Late
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                title="Reset all statuses to unselected"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            {/* Live Roll Call Stats Counter */}
            <div className="flex items-center gap-3 text-xs bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-white">{presentCount}</span>
                <span className="text-slate-400">Present</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="font-bold text-white">{lateCount}</span>
                <span className="text-slate-400">Late</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="font-bold text-white">{absentCount}</span>
                <span className="text-slate-400">Absent</span>
              </div>
              {excusedCount > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span className="font-bold text-white">{excusedCount}</span>
                    <span className="text-slate-400">Excused</span>
                  </div>
                </>
              )}
              <span className="text-slate-600">•</span>
              <div className="font-mono font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded">
                {currentAttendanceRate}% Rate
              </div>
            </div>
          </div>

          {/* Student Roll Call List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Search Filter Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter student list..."
                  value={searchRosterQuery}
                  onChange={(e) => setSearchRosterQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>
                  Showing {filteredAttendanceEntries.length} of {attendanceEntries.length} students
                </span>
                {unassignedCount > 0 && (
                  <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {unassignedCount} unmarked
                  </span>
                )}
              </div>
            </div>

            {/* List */}
            {attendanceLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading attendance records...</div>
            ) : filteredAttendanceEntries.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                {attendanceEntries.length === 0
                  ? 'No students enrolled in this classroom yet. Add students in the Students tab.'
                  : 'No students match your search filter.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredAttendanceEntries.map((student, index) => {
                  const currentStatus = student.attendance_status;
                  const isRemarkOpen = openRemarkStudentId === student.id || (student.remarks && student.remarks.trim().length > 0);

                  return (
                    <div
                      key={student.id}
                      className={`p-4 transition-colors hover:bg-slate-50/80 ${
                        !currentStatus ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Student Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono font-medium text-slate-400 w-6">
                            {index + 1}.
                          </span>
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white bg-indigo-600 shrink-0`}
                          >
                            {student.first_name[0]}
                            {student.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 truncate flex items-center gap-2">
                              <span>
                                {student.first_name} {student.last_name}
                              </span>
                              {student.guardian_contact && (
                                <span
                                  className="text-[10px] text-slate-400 hidden sm:inline"
                                  title={`Guardian: ${student.guardian_name} (${student.guardian_contact})`}
                                >
                                  ({student.guardian_name})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                              <span>{student.student_id_number}</span>
                              {student.attendance_percentage !== undefined && (
                                <>
                                  <span>•</span>
                                  <span
                                    className={`font-semibold ${
                                      student.attendance_percentage >= 85
                                        ? 'text-emerald-600'
                                        : student.attendance_percentage >= 75
                                        ? 'text-sky-600'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {student.attendance_percentage}% overall
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Buttons Segment */}
                        <div className="flex items-center gap-2 self-end md:self-center">
                          {/* Present Pill */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'present')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                              currentStatus === 'present'
                                ? STATUS_CONFIG.present.pillActive
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                            }`}
                          >
                            Present
                          </button>

                          {/* Late Pill */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'late')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                              currentStatus === 'late'
                                ? STATUS_CONFIG.late.pillActive
                                : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
                            }`}
                          >
                            Late
                          </button>

                          {/* Absent Pill */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                              currentStatus === 'absent'
                                ? STATUS_CONFIG.absent.pillActive
                                : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-700'
                            }`}
                          >
                            Absent
                          </button>

                          {/* Excused Pill */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'excused')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                              currentStatus === 'excused'
                                ? STATUS_CONFIG.excused.pillActive
                                : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700'
                            }`}
                          >
                            Excused
                          </button>

                          {/* Note Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setOpenRemarkStudentId(
                                openRemarkStudentId === student.id ? null : student.id
                              )
                            }
                            className={`p-1.5 rounded-xl border transition-colors ${
                              student.remarks
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                            }`}
                            title="Add note / reason for absence or late arrival"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Remark Input Drawer */}
                      {isRemarkOpen && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 animate-in fade-in">
                          <span className="text-xs font-semibold text-slate-500 shrink-0">Note:</span>
                          <input
                            type="text"
                            placeholder="e.g. Arrived at 09:15 AM (Traffic), Doctor note submitted..."
                            value={student.remarks || ''}
                            onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                            className="flex-1 px-3 py-1 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                          />
                          {student.remarks && (
                            <button
                              type="button"
                              onClick={() => handleRemarkChange(student.id, '')}
                              className="text-slate-400 hover:text-rose-600 p-1 text-xs"
                              title="Clear note"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session Notes */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              General Session Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Midterm exam conducted, Guest speaker session, Early dismissal..."
              value={sessionNotes}
              onChange={(e) => {
                setSessionNotes(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
            />
          </div>

          {/* Sticky Bottom Save Action Bar */}
          <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {hasUnsavedChanges ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Unsaved changes on this date</span>
                </div>
              ) : sessionInfo ? (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Saved for {formatDate(selectedDate)}</span>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Ready to mark {attendanceEntries.length} students
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => loadAttendanceForDate(selectedDate)}
                disabled={isSavingAttendance || !hasUnsavedChanges}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSavingAttendance || attendanceEntries.length === 0}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2 active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingAttendance ? 'Saving Attendance...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STUDENTS ROSTER                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students by name, ID, or email..."
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportRoster}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
                title="Download CSV roster"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Bulk Import</span>
              </button>

              <button
                onClick={() => {
                  setEditingStudent(null);
                  setIsStudentModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student</span>
              </button>
            </div>
          </div>

          {/* Students Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {studentsLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading student records...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No students found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchStudentQuery
                    ? 'No students matched your search criteria.'
                    : 'Enroll students manually or paste a roster from spreadsheet.'}
                </p>
                <button
                  onClick={() => setIsStudentModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
                >
                  + Add First Student
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">ID / Roll #</th>
                      <th className="py-3.5 px-4">Contact Info</th>
                      <th className="py-3.5 px-4">Guardian Contact</th>
                      <th className="py-3.5 px-4 text-center">Attendance %</th>
                      <th className="py-3.5 px-4 text-center">Sessions Breakdown</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s) => {
                      const rate = s.attendance_percentage ?? 100;
                      const badge = getAttendanceRateBadge(rate, currentClass.min_attendance_threshold);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Student Name & Avatar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                {s.first_name[0]}
                                {s.last_name[0]}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">
                                  {s.first_name} {s.last_name}
                                </div>
                                <div className="text-xs text-slate-400">{s.gender || 'Student'}</div>
                              </div>
                            </div>
                          </td>

                          {/* Roll Number */}
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-700 font-semibold">
                            {s.student_id_number}
                          </td>

                          {/* Student Contact */}
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            <div>{s.email || '-'}</div>
                            {s.phone && <div className="text-slate-400 mt-0.5">{s.phone}</div>}
                          </td>

                          {/* Guardian Contact */}
                          <td className="py-3.5 px-4 text-xs">
                            {s.guardian_contact ? (
                              <div>
                                <div className="font-semibold text-slate-800">{s.guardian_name || 'Guardian'}</div>
                                <a
                                  href={`tel:${s.guardian_contact}`}
                                  className="text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{s.guardian_contact}</span>
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Attendance Rate */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${badge.color}`}
                            >
                              {rate}%
                            </span>
                          </td>

                          {/* Sessions Breakdown */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold" title="Present">
                                {s.present_count || 0}P
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold" title="Late">
                                {s.late_count || 0}L
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold" title="Absent">
                                {s.absent_count || 0}A
                              </span>
                              {s.excused_count ? (
                                <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-bold" title="Excused">
                                  {s.excused_count}E
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingStudent(s);
                                  setIsStudentModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Student"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setStudentToDelete(s)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Student"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ATTENDANCE HISTORY                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* View Mode Switcher Header */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Attendance Log & Records</h2>
              <p className="text-xs text-slate-500">
                Browse past sessions or view the cross-referenced student attendance matrix
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 border border-slate-200">
                <button
                  onClick={() => setHistoryViewMode('sessions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    historyViewMode === 'sessions'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Date Sessions List
                </button>
                <button
                  onClick={() => setHistoryViewMode('matrix')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    historyViewMode === 'matrix'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Full Attendance Grid
                </button>
              </div>

              {historyViewMode === 'matrix' && (
                <button
                  onClick={handleExportMatrix}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Matrix (CSV)</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-View A: Sessions List */}
          {historyViewMode === 'sessions' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {historyLoading ? (
                <div className="p-12 text-center text-slate-400 text-sm">Loading sessions history...</div>
              ) : historySessions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  No attendance sessions recorded yet. Switch to "Take Attendance" to mark your first roll call.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historySessions.map((ses) => {
                    const rate = ses.percentage ?? 0;
                    const badge = getAttendanceRateBadge(rate, currentClass.min_attendance_threshold);

                    return (
                      <div
                        key={ses.id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-base text-slate-900">
                              {formatDate(ses.date)}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-600">
                              {formatDayOfWeek(ses.date)}
                            </span>
                          </div>
                          {ses.title && <div className="text-xs text-slate-600 font-medium">{ses.title}</div>}
                          {ses.notes && <div className="text-xs text-slate-400 mt-1 italic">"{ses.notes}"</div>}
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          {/* Breakdown Pills */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              {ses.present_count} Present
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200">
                              {ses.late_count} Late
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200">
                              {ses.absent_count} Absent
                            </span>
                          </div>

                          {/* Percentage Badge */}
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                            {rate}% Attended
                          </span>

                          {/* Edit roll shortcut */}
                          <button
                            onClick={() => {
                              setSelectedDate(ses.date);
                              setActiveTab('take_attendance');
                            }}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Edit Roll
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-View B: Full Attendance Matrix Grid */}
          {historyViewMode === 'matrix' && matrixData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">Legend:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> P (Present)
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> L (Late)
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> A (Absent)
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-sky-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> E (Excused)
                  </span>
                </div>
                <span>
                  {matrixData.students.length} students × {matrixData.sessions.length} sessions
                </span>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 sticky top-0 z-20 backdrop-blur-xs text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 sticky left-0 z-30 bg-slate-100 border-r border-slate-200 min-w-[180px]">
                        Student Name
                      </th>
                      <th className="py-3 px-2 text-center min-w-[70px] border-r border-slate-200">Rate</th>
                      {matrixData.sessions.map((ses) => (
                        <th
                          key={ses.id}
                          className="py-2.5 px-2 text-center font-mono font-medium min-w-[55px] border-r border-slate-200"
                        >
                          <div className="text-[10px] text-slate-400">
                            {formatDayOfWeek(ses.date).substring(0, 3)}
                          </div>
                          <div>{formatShortDate(ses.date)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrixData.students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 sticky left-0 z-10 bg-white font-semibold text-slate-900 border-r border-slate-200 truncate">
                          {student.first_name} {student.last_name}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              (student.attendance_percentage || 0) >= 85
                                ? 'text-emerald-700 bg-emerald-50'
                                : (student.attendance_percentage || 0) >= 75
                                ? 'text-sky-700 bg-sky-50'
                                : 'text-rose-700 bg-rose-50'
                            }`}
                          >
                            {student.attendance_percentage || 0}%
                          </span>
                        </td>
                        {matrixData.sessions.map((ses) => {
                          const entry = matrixData.matrix[student.id]?.[ses.date];
                          const status = entry?.status;

                          return (
                            <td
                              key={ses.id}
                              className="py-2 px-1 text-center border-r border-slate-100 font-mono text-[11px]"
                            >
                              {status === 'present' && (
                                <span
                                  className="w-6 h-6 inline-flex items-center justify-center rounded-md font-bold bg-emerald-100 text-emerald-800"
                                  title={entry?.remarks ? `Present: ${entry.remarks}` : 'Present'}
                                >
                                  P
                                </span>
                              )}
                              {status === 'late' && (
                                <span
                                  className="w-6 h-6 inline-flex items-center justify-center rounded-md font-bold bg-amber-100 text-amber-800"
                                  title={entry?.remarks ? `Late: ${entry.remarks}` : 'Late'}
                                >
                                  L
                                </span>
                              )}
                              {status === 'absent' && (
                                <span
                                  className="w-6 h-6 inline-flex items-center justify-center rounded-md font-bold bg-rose-100 text-rose-800"
                                  title={entry?.remarks ? `Absent: ${entry.remarks}` : 'Absent'}
                                >
                                  A
                                </span>
                              )}
                              {status === 'excused' && (
                                <span
                                  className="w-6 h-6 inline-flex items-center justify-center rounded-md font-bold bg-sky-100 text-sky-800"
                                  title={entry?.remarks ? `Excused: ${entry.remarks}` : 'Excused'}
                                >
                                  E
                                </span>
                              )}
                              {!status && <span className="text-slate-300">-</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STATISTICS & ANALYTICS                                             */}
      {/* ========================================================================= */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {statsLoading || !statistics ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading statistics...</div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Class Overall Rate</span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">{statistics.totals.rate}%</div>
                  <div className="text-xs text-slate-500 mt-1">Weighted attendance rate</div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Sessions Held</span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">{statistics.totals.total_sessions}</div>
                  <div className="text-xs text-slate-500 mt-1">Recorded attendance sessions</div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Top Attendees (90%+)</span>
                  <div className="text-3xl font-extrabold text-emerald-600 mt-1">
                    {statistics.topPerformers.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Students in high standing</div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-400 uppercase">At-Risk Students</span>
                  <div className="text-3xl font-extrabold text-rose-600 mt-1">{statistics.atRisk.length}</div>
                  <div className="text-xs text-slate-500 mt-1">Below {currentClass.min_attendance_threshold}% threshold</div>
                </div>
              </div>

              {/* Status Proportion Breakdown & Daily Trend Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Breakdown Bar (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <h3 className="font-bold text-base text-slate-900">Attendance Distribution</h3>
                  <p className="text-xs text-slate-500">Breakdown of all {statistics.totals.total_records} marked records</p>

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-emerald-700 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present
                        </span>
                        <span>
                          {statistics.totals.present_count} (
                          {statistics.totals.total_records > 0
                            ? Math.round((statistics.totals.present_count / statistics.totals.total_records) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${
                              statistics.totals.total_records > 0
                                ? (statistics.totals.present_count / statistics.totals.total_records) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-amber-700 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late
                        </span>
                        <span>
                          {statistics.totals.late_count} (
                          {statistics.totals.total_records > 0
                            ? Math.round((statistics.totals.late_count / statistics.totals.total_records) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{
                            width: `${
                              statistics.totals.total_records > 0
                                ? (statistics.totals.late_count / statistics.totals.total_records) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-rose-700 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent
                        </span>
                        <span>
                          {statistics.totals.absent_count} (
                          {statistics.totals.total_records > 0
                            ? Math.round((statistics.totals.absent_count / statistics.totals.total_records) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{
                            width: `${
                              statistics.totals.total_records > 0
                                ? (statistics.totals.absent_count / statistics.totals.total_records) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-sky-700 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Excused
                        </span>
                        <span>
                          {statistics.totals.excused_count} (
                          {statistics.totals.total_records > 0
                            ? Math.round((statistics.totals.excused_count / statistics.totals.total_records) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{
                            width: `${
                              statistics.totals.total_records > 0
                                ? (statistics.totals.excused_count / statistics.totals.total_records) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Trend Interactive Chart (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Historical Attendance Trend</h3>
                    <p className="text-xs text-slate-500 mb-4">Daily percentage attendance throughout the term</p>

                    <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
                      {statistics.dailyTrends.map((d) => (
                        <div key={d.date} className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group relative">
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                            {formatShortDate(d.date)}: {d.rate}% ({d.present}P, {d.late}L, {d.absent}A)
                          </div>

                          <div className="w-full bg-slate-100 rounded-t-md h-32 flex items-end overflow-hidden">
                            <div
                              className={`w-full rounded-t-md transition-all duration-300 ${
                                d.rate >= 85 ? 'bg-indigo-600' : d.rate >= 75 ? 'bg-indigo-400' : 'bg-rose-500'
                              }`}
                              style={{ height: `${Math.max(6, d.rate)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatShortDate(d.date).split(' ')[1]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-3">
                    <span>*Days with rate &lt; 75% highlighted in red</span>
                    <span className="font-mono font-medium text-slate-600">
                      {statistics.dailyTrends.length} Total Sessions Plotted
                    </span>
                  </div>
                </div>
              </div>

              {/* At Risk & High Achievers Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* At-Risk Students */}
                <div className="bg-white rounded-2xl p-6 border border-rose-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>Students Needing Attention</span>
                    </h3>
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      {statistics.atRisk.length}
                    </span>
                  </div>

                  {statistics.atRisk.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No students currently below {currentClass.min_attendance_threshold}% attendance!
                    </div>
                  ) : (
                    <div className="divide-y divide-rose-50">
                      {statistics.atRisk.map((s) => (
                        <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-sm text-slate-900">
                              {s.first_name} {s.last_name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {s.student_id_number} • {s.absent_count} absences
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              {s.attendance_percentage}%
                            </span>
                            {s.guardian_contact && (
                              <a
                                href={`tel:${s.guardian_contact}`}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                title={`Call Guardian: ${s.guardian_contact}`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Performers */}
                <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Top Attendance Achievers</span>
                    </h3>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {statistics.topPerformers.length}
                    </span>
                  </div>

                  {statistics.topPerformers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">No students at 90%+ yet.</div>
                  ) : (
                    <div className="divide-y divide-emerald-50 max-h-64 overflow-y-auto">
                      {statistics.topPerformers.map((s) => (
                        <div key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                              {s.first_name[0]}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900">
                                {s.first_name} {s.last_name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">{s.student_id_number}</div>
                            </div>
                          </div>

                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {s.attendance_percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CLASSROOM SETTINGS                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveClassSettings}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5"
          >
            <div>
              <h2 className="text-base font-bold text-slate-900">Classroom Configuration</h2>
              <p className="text-xs text-slate-500">Update classroom schedule, thresholds, and room information</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.subject}
                  onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grade Level</label>
                <input
                  type="text"
                  value={editFormData.grade_level}
                  onChange={(e) => setEditFormData({ ...editFormData, grade_level: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                <input
                  type="text"
                  value={editFormData.section}
                  onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room</label>
                <input
                  type="text"
                  value={editFormData.room}
                  onChange={(e) => setEditFormData({ ...editFormData, room: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule</label>
              <input
                type="text"
                placeholder="e.g. Mon, Wed, Fri • 08:30 AM - 09:45 AM"
                value={editFormData.schedule}
                onChange={(e) => setEditFormData({ ...editFormData, schedule: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Attendance Threshold */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Minimum Attendance Alert Threshold
                </label>
                <span className="text-xs font-bold text-indigo-600 font-mono">
                  {editFormData.min_attendance_threshold}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={editFormData.min_attendance_threshold}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, min_attendance_threshold: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Color Theme */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class Color Tag</label>
              <div className="flex flex-wrap items-center gap-2">
                {Object.keys(CLASS_COLORS).map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setEditFormData({ ...editFormData, color: opt })}
                    className={`w-7 h-7 rounded-full transition-all ${CLASS_COLORS[opt].accent} ${
                      editFormData.color === opt
                        ? 'ring-3 ring-indigo-300 ring-offset-2 scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm shadow-indigo-200 transition-colors disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Danger Zone</span>
            </div>
            <p className="text-xs text-rose-600 max-w-xl">
              Deleting this classroom will permanently remove all enrolled students and all historical attendance sessions and records. This action cannot be undone.
            </p>

            {showDeleteClassConfirm ? (
              <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-3">
                <div className="text-xs font-bold text-slate-900">
                  Are you absolutely sure you want to delete "{currentClass.name}"?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteClass}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
                  >
                    Yes, Permanently Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteClassConfirm(false)}
                    className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteClassConfirm(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Delete Classroom
              </button>
            )}
          </div>
        </div>
      )}

      {/* Student Modal (Add/Edit) */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={handleSaveStudent}
        student={editingStudent}
        classId={currentClass.id}
      />

      {/* Bulk Import Modal */}
      <BulkImportStudentsModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSubmit={handleBatchImport}
      />

      {/* Delete Student Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Remove Student</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove {studentToDelete.first_name} {studentToDelete.last_name}? Their attendance history in this class will also be removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteStudent(studentToDelete)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
