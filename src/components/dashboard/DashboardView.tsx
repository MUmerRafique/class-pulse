import React, { useState } from 'react';
import {
  Users,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  Mail,
  UserCheck,
  Plus,
  GraduationCap,
  ClipboardList,
} from 'lucide-react';
import { DashboardData, ClassItem } from '../../types';
import { CLASS_COLORS, formatShortDate, formatDate } from '../../lib/utils';

interface DashboardViewProps {
  data: DashboardData;
  onSelectClass: (c: ClassItem, tab?: string) => void;
  onOpenCreateClass: () => void;
  onTakeAttendance: (c: ClassItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onSelectClass,
  onOpenCreateClass,
  onTakeAttendance,
}) => {
  const { metrics, classes, trend, students_at_risk, today } = data;
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // SVG Chart calculation for 7-day trend
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 24;

  const points = trend.map((t, idx) => {
    const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (t.rate / 100) * (chartHeight - paddingY * 2);
    return { x, y, ...t };
  });

  const pathD =
    points.length > 0
      ? `M ${points[0].x} ${points[0].y} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(' ')
      : '';

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
      : '';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-950/20">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-medium mb-3 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Teacher Dashboard • {formatDate(today)}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              Welcome to ClassPulse!
            </h1>
            <p className="text-sm sm:text-base text-indigo-200 max-w-xl">
              Track real-time class attendance, manage student rosters, and view attendance analytics across all your classrooms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCreateClass}
              className="px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 font-semibold rounded-xl text-sm shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Class</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Classes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Classes</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.total_classes}</div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="text-emerald-600 font-semibold">{classes.filter((c) => c.today_marked).length}</span> marked today
            <span className="text-slate-300">•</span>
            <span className="text-amber-600 font-semibold">{classes.filter((c) => !c.today_marked).length}</span> pending
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Students</span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.total_students}</div>
          <div className="mt-2 text-xs text-slate-500">
            Enrolled across all active classes
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Attendance</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {metrics.today_marked_count > 0 ? `${metrics.today_percentage}%` : 'N/A'}
            </div>
            {metrics.today_marked_count > 0 && (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {metrics.today_present} present
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {metrics.today_marked_count > 0 ? (
              <span>
                {metrics.today_late} late, {metrics.today_absent} absent ({metrics.today_marked_count} marked)
              </span>
            ) : (
              <span className="text-slate-400">No roll calls recorded today</span>
            )}
          </div>
        </div>

        {/* Average Attendance Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Attendance</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {metrics.average_attendance_rate > 0 ? `${metrics.average_attendance_rate}%` : '0%'}
            </div>
            {metrics.average_attendance_rate > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                Active
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Historical average across all sessions
          </div>
        </div>
      </div>

      {/* When 0 Classes: Show Onboarding Flow */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm text-center max-w-3xl mx-auto space-y-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Ready to create your classes and add students?
            </h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              Your database is clean and ready. Follow these 3 simple steps to start managing your daily classroom attendance:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold text-sm text-slate-900">Create a Class</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Add your course title, subject, grade level, room, and weekly schedule.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold text-sm text-slate-900">Add Your Students</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enroll students individually or paste a CSV roster from Excel or Google Sheets.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold text-sm text-slate-900">Take Roll Call</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mark students Present, Absent, Late, or Excused with notes and real-time statistics.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={onOpenCreateClass}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all duration-150 inline-flex items-center gap-2 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Classroom</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main Grid: Today's Class Action Cards + Weekly Trend Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Today's Classes Roll Call Cards (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Today's Class Schedule</h2>
                  <p className="text-xs text-slate-500">Mark or update attendance for your daily periods</p>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {classes.length} {classes.length === 1 ? 'class' : 'classes'}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {classes.map((cls) => {
                  const colorConfig = CLASS_COLORS[cls.color] || CLASS_COLORS.indigo;
                  return (
                    <div
                      key={cls.id}
                      className="py-4 first:pt-2 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div
                        className="flex items-start gap-3 cursor-pointer min-w-0"
                        onClick={() => onSelectClass(cls)}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${colorConfig.bg} ${colorConfig.text}`}
                        >
                          {cls.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {cls.name}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{cls.grade_level}</span>
                            <span>•</span>
                            <span>{cls.student_count || 0} students</span>
                            {cls.room && (
                              <>
                                <span>•</span>
                                <span>{cls.room}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center">
                        {cls.today_marked ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Marked Today</span>
                            </span>
                            <button
                              onClick={() => onTakeAttendance(cls)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </span>
                            <button
                              onClick={() => onTakeAttendance(cls)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
                            >
                              <span>Take Roll</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7-Day Trend Chart (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-slate-900">Attendance Trend</h2>
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    Recent Sessions
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">Daily percentage of students present across classes</p>

                {trend.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
                    No attendance sessions recorded yet. Trends will appear here once you take roll.
                  </div>
                ) : (
                  <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] bg-slate-50/50 rounded-xl p-2 border border-slate-100">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                      {[50, 75, 100].map((val) => {
                        const y = chartHeight - paddingY - (val / 100) * (chartHeight - paddingY * 2);
                        return (
                          <g key={val}>
                            <line
                              x1={paddingX}
                              y1={y}
                              x2={chartWidth - paddingX}
                              y2={y}
                              stroke="#e2e8f0"
                              strokeDasharray="4 4"
                              strokeWidth="1"
                            />
                            <text
                              x={paddingX - 8}
                              y={y + 3}
                              textAnchor="end"
                              className="text-[10px] fill-slate-400 font-mono"
                            >
                              {val}%
                            </text>
                          </g>
                        );
                      })}

                      {areaD && <path d={areaD} fill="url(#trend-gradient)" opacity="0.3" />}

                      {pathD && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#4f46e5"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={hoveredTrendIndex === idx ? '6' : '4'}
                            fill="#4f46e5"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="cursor-pointer transition-all duration-150"
                            onMouseEnter={() => setHoveredTrendIndex(idx)}
                            onMouseLeave={() => setHoveredTrendIndex(null)}
                          />
                          <text
                            x={p.x}
                            y={chartHeight - 6}
                            textAnchor="middle"
                            className="text-[10px] fill-slate-500 font-mono"
                          >
                            {formatShortDate(p.date)}
                          </text>
                        </g>
                      ))}

                      <defs>
                        <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {hoveredTrendIndex !== null && points[hoveredTrendIndex] && (
                      <div
                        className="absolute bg-slate-900 text-white text-xs rounded-lg py-1.5 px-2.5 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full font-mono"
                        style={{
                          left: `${(points[hoveredTrendIndex].x / chartWidth) * 100}%`,
                          top: `${(points[hoveredTrendIndex].y / chartHeight) * 100}%`,
                          marginTop: '-8px',
                        }}
                      >
                        <div className="font-sans font-semibold">{points[hoveredTrendIndex].date}</div>
                        <div className="text-emerald-400">{points[hoveredTrendIndex].rate}% Attendance</div>
                        <div className="text-[10px] text-slate-300">
                          {points[hoveredTrendIndex].present} P • {points[hoveredTrendIndex].late} L • {points[hoveredTrendIndex].absent} A
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Overall consistency</span>
                <span className="font-semibold text-slate-800">
                  {trend.length > 0 ? `${Math.round(trend.reduce((acc, t) => acc + t.rate, 0) / trend.length)}% avg` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Students Needing Attention Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Attendance Watchlist (At Risk)</h2>
                  <p className="text-xs text-slate-500">
                    Students below class threshold requiring guardian follow-up or intervention
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {students_at_risk.length} Flagged
              </span>
            </div>

            {students_at_risk.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200/60">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <div className="text-sm font-semibold text-slate-800">All students are in good standing!</div>
                <div className="text-xs text-slate-500 mt-1">
                  No students are currently below minimum attendance thresholds.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {students_at_risk.map((student) => (
                  <div
                    key={student.id}
                    className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 hover:bg-rose-50/40 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-semibold text-sm text-slate-900">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-xs font-mono text-slate-500">{student.student_id_number}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          {student.attendance_percentage}%
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 mb-3 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {student.class_name}
                        </span>
                        <span>•</span>
                        <span className="text-rose-600 font-medium">{student.absent_count} absences</span>
                      </div>
                    </div>

                    {student.guardian_contact && (
                      <div className="pt-2 border-t border-rose-100/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500 truncate">{student.guardian_name || 'Guardian'}</span>
                        <a
                          href={`tel:${student.guardian_contact}`}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{student.guardian_contact}</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
