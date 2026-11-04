import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ClassItem } from '../../types';
import { CLASS_COLORS } from '../../lib/utils';

interface SidebarProps {
  currentView: string;
  selectedClass: ClassItem | null;
  classes: ClassItem[];
  onSelectView: (view: string) => void;
  onSelectClass: (c: ClassItem | null) => void;
  onOpenCreateClass: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  selectedClass,
  classes,
  onSelectView,
  onSelectClass,
  onOpenCreateClass,
  isOpen,
  onCloseMobile,
}) => {
  const isDashboard = currentView === 'dashboard' && !selectedClass;
  const isAllClasses = currentView === 'classes' && !selectedClass;

  const handleDashboardClick = () => {
    onSelectClass(null);
    onSelectView('dashboard');
    onCloseMobile();
  };

  const handleAllClassesClick = () => {
    onSelectClass(null);
    onSelectView('classes');
    onCloseMobile();
  };

  const handleClassClick = (cls: ClassItem) => {
    onSelectClass(cls);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Main Menu
            </div>
            <nav className="space-y-1">
              <button
                onClick={handleDashboardClick}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isDashboard
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className={`w-4 h-4 ${isDashboard ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>Dashboard</span>
                </div>
              </button>

              <button
                onClick={handleAllClassesClick}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isAllClasses
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className={`w-4 h-4 ${isAllClasses ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>All Classes</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {classes.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Classes Shortcuts */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                My Classrooms
              </span>
              <button
                onClick={() => {
                  onOpenCreateClass();
                  onCloseMobile();
                }}
                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                title="Add new class"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {classes.length === 0 ? (
                <div className="px-3 py-4 text-center rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">No classes created yet</p>
                  <button
                    onClick={() => {
                      onOpenCreateClass();
                      onCloseMobile();
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + Create First Class
                  </button>
                </div>
              ) : (
                classes.map((cls) => {
                  const isSelected = selectedClass?.id === cls.id;
                  const colorConfig = CLASS_COLORS[cls.color] || CLASS_COLORS.indigo;

                  return (
                    <button
                      key={cls.id}
                      onClick={() => handleClassClick(cls)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                        isSelected
                          ? `${colorConfig.bg} ${colorConfig.text} font-semibold ring-1 ${colorConfig.border}`
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorConfig.accent}`} />
                        <div className="truncate text-left">
                          <div className="truncate font-medium">{cls.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {cls.grade_level} • {cls.student_count || 0} students
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 ml-2">
                        {cls.today_marked ? (
                          <span
                            className="p-1 rounded-full text-emerald-600 bg-emerald-50"
                            title="Attendance marked today"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span
                            className="p-1 rounded-full text-amber-500 bg-amber-50"
                            title="Attendance pending today"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer: User profile / info card */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
              TP
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 truncate">Teacher Portal</div>
              <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Relational SQLite DB
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
