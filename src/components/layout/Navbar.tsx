import React from 'react';
import { Calendar, Trash2, Menu, X, GraduationCap, Sparkles } from 'lucide-react';
import { formatDate, getTodayString } from '../../lib/utils';
import { ClassItem } from '../../types';

interface NavbarProps {
  currentView: string;
  selectedClass: ClassItem | null;
  classes: ClassItem[];
  onSelectView: (view: string) => void;
  onSelectClass: (c: ClassItem) => void;
  onClearAll: () => void;
  onLoadDemo: () => void;
  onOpenCreateClass: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isActionLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedClass,
  classes,
  onSelectClass,
  onClearAll,
  onLoadDemo,
  onOpenCreateClass,
  sidebarOpen,
  setSidebarOpen,
  isActionLoading,
}) => {
  const today = getTodayString();
  const formattedToday = formatDate(today);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section: Logo & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectClass(null as any)}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                  Class<span className="text-indigo-600">Pulse</span>
                </span>
                <span className="hidden sm:block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Teacher Attendance Suite
                </span>
              </div>
            </div>
          </div>

          {/* Center: Class Switcher (visible when classes exist) */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-lg text-xs font-medium text-slate-600 border border-slate-200/60">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{formattedToday}</span>
            </div>

            {classes.length > 0 && (
              <div className="relative">
                <select
                  value={selectedClass?.id || ''}
                  onChange={(e) => {
                    const found = classes.find((c) => c.id === e.target.value);
                    if (found) onSelectClass(found);
                  }}
                  className="bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-3 py-1.5 pr-8 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    Switch Class...
                  </option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.grade_level})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Right section: Action buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {classes.length > 0 ? (
              <button
                onClick={onClearAll}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 disabled:opacity-50"
                title="Clear all classes, students, and attendance records"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            ) : (
              <button
                onClick={onLoadDemo}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 disabled:opacity-50"
                title="Load sample classes and attendance records"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Load Sample Data</span>
              </button>
            )}

            <button
              onClick={onOpenCreateClass}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-200 hover:shadow transition-all duration-150 active:scale-[0.98]"
            >
              <span className="text-base leading-none font-normal">+</span>
              <span>New Class</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
