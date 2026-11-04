import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ClassListView } from './components/classes/ClassListView';
import { ClassDetailView } from './components/classes/ClassDetailView';
import { CreateClassModal } from './components/modals/CreateClassModal';
import { api } from './lib/api';
import { ClassItem, DashboardData } from './types';
import { Loader2, RefreshCw } from 'lucide-react';

function AppContent() {
  const { addToast } = useToast();
  const [currentView, setCurrentView] = useState<'dashboard' | 'classes'>('dashboard');
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedClassTab, setSelectedClassTab] = useState<string>('take_attendance');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Fetch initial app data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, cls] = await Promise.all([api.getDashboard(), api.getClasses()]);
      setDashboardData(dash);
      setClasses(cls);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      addToast(err.message || 'Failed to connect to attendance server', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle class selection
  const handleSelectClass = (c: ClassItem | null, tab: string = 'take_attendance') => {
    setSelectedClass(c);
    setSelectedClassTab(tab);
    if (!c) {
      setCurrentView('dashboard');
    }
  };

  const handleTakeAttendance = (c: ClassItem) => {
    setSelectedClass(c);
    setSelectedClassTab('take_attendance');
  };

  // Create new class
  const handleCreateClass = async (classData: Partial<ClassItem>) => {
    const created = await api.createClass(classData);
    addToast(`Classroom "${created.name}" created successfully!`, 'success');
    await fetchData();
    // Navigate straight to the new class
    setSelectedClass(created);
    setSelectedClassTab('students');
  };

  // Clear all entries
  const handleClearAll = async () => {
    if (!window.confirm('Clear all classrooms, students, and attendance records from the database? This cannot be undone.')) {
      return;
    }
    try {
      setIsResetting(true);
      await api.clearAll();
      addToast('All entries cleared! You can now create your classes and add students.', 'success');
      setSelectedClass(null);
      setCurrentView('dashboard');
      await fetchData();
    } catch (err: any) {
      addToast(err.message || 'Failed to clear entries', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Load sample demo data
  const handleLoadDemo = async () => {
    if (!window.confirm('Load sample classes, students, and attendance records for testing?')) {
      return;
    }
    try {
      setIsResetting(true);
      await api.seedDemo();
      addToast('Sample demo data loaded successfully!', 'success');
      setSelectedClass(null);
      setCurrentView('dashboard');
      await fetchData();
    } catch (err: any) {
      addToast(err.message || 'Failed to load demo data', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Class update callback
  const handleClassUpdated = (updated: ClassItem) => {
    setSelectedClass(updated);
    setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    // Silently refresh dashboard stats
    api.getDashboard().then(setDashboardData).catch(() => {});
  };

  const handleClassDeleted = (id: string) => {
    setSelectedClass(null);
    setCurrentView('classes');
    setClasses((prev) => prev.filter((c) => c.id !== id));
    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        currentView={currentView}
        selectedClass={selectedClass}
        classes={classes}
        onSelectView={(v) => {
          setSelectedClass(null);
          setCurrentView(v as any);
        }}
        onSelectClass={(c) => {
          setSelectedClass(c);
          setSelectedClassTab('take_attendance');
        }}
        onClearAll={handleClearAll}
        onLoadDemo={handleLoadDemo}
        onOpenCreateClass={() => setIsCreateModalOpen(true)}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isActionLoading={isResetting}
      />

      <div className="flex-1 flex">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          selectedClass={selectedClass}
          classes={classes}
          onSelectView={(v) => {
            setSelectedClass(null);
            setCurrentView(v as any);
          }}
          onSelectClass={handleSelectClass}
          onOpenCreateClass={() => setIsCreateModalOpen(true)}
          isOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {loading && !dashboardData ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium">Connecting to SQLite database...</p>
              </div>
            ) : selectedClass ? (
              <ClassDetailView
                key={selectedClass.id}
                initialClass={selectedClass}
                initialTab={selectedClassTab}
                onBack={() => {
                  setSelectedClass(null);
                  setCurrentView('classes');
                  fetchData();
                }}
                onClassUpdated={handleClassUpdated}
                onClassDeleted={handleClassDeleted}
              />
            ) : currentView === 'classes' ? (
              <ClassListView
                classes={classes}
                onSelectClass={handleSelectClass}
                onOpenCreateClass={() => setIsCreateModalOpen(true)}
                onTakeAttendance={handleTakeAttendance}
              />
            ) : (
              dashboardData && (
                <DashboardView
                  data={dashboardData}
                  onSelectClass={handleSelectClass}
                  onOpenCreateClass={() => setIsCreateModalOpen(true)}
                  onTakeAttendance={handleTakeAttendance}
                />
              )
            )}
          </div>
        </main>
      </div>

      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateClass}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
