import {
  DashboardData,
  ClassItem,
  Student,
  AttendanceStudentEntry,
  AttendanceSession,
  ClassStatistics,
  AttendanceMatrixData,
  AttendanceStatus,
} from '../types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) {
        errorMsg = body.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Dashboard
  getDashboard: () => fetchJson<DashboardData>('/api/dashboard'),

  // Classes
  getClasses: () => fetchJson<ClassItem[]>('/api/classes'),
  getClass: (id: string) => fetchJson<ClassItem>(`/api/classes/${id}`),
  createClass: (payload: Partial<ClassItem>) =>
    fetchJson<ClassItem>('/api/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateClass: (id: string, payload: Partial<ClassItem>) =>
    fetchJson<ClassItem>(`/api/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteClass: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/classes/${id}`, {
      method: 'DELETE',
    }),

  // Students
  getClassStudents: (classId: string) =>
    fetchJson<Student[]>(`/api/classes/${classId}/students`),
  addStudent: (classId: string, payload: Partial<Student>) =>
    fetchJson<Student>(`/api/classes/${classId}/students`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  batchAddStudents: (classId: string, students: Partial<Student>[]) =>
    fetchJson<{ addedCount: number; errors: string[] }>(`/api/classes/${classId}/students/batch`, {
      method: 'POST',
      body: JSON.stringify({ students }),
    }),
  updateStudent: (classId: string, studentId: string, payload: Partial<Student>) =>
    fetchJson<Student>(`/api/classes/${classId}/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteStudent: (classId: string, studentId: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/classes/${classId}/students/${studentId}`, {
      method: 'DELETE',
    }),

  // Attendance
  getAttendanceForDate: (classId: string, date: string) =>
    fetchJson<{
      date: string;
      session: AttendanceSession | null;
      is_marked: boolean;
      students: AttendanceStudentEntry[];
    }>(`/api/classes/${classId}/attendance?date=${encodeURIComponent(date)}`),

  saveAttendance: (
    classId: string,
    payload: {
      date: string;
      title?: string | null;
      notes?: string | null;
      records: Array<{
        student_id: string;
        status: AttendanceStatus;
        remarks?: string | null;
      }>;
    }
  ) =>
    fetchJson<{ success: boolean; sessionId: string; recordsSaved: number; summary: any }>(
      `/api/classes/${classId}/attendance`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  deleteAttendance: (classId: string, date: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/classes/${classId}/attendance/${date}`, {
      method: 'DELETE',
    }),

  // History & Reports
  getClassHistory: (classId: string) =>
    fetchJson<AttendanceSession[]>(`/api/classes/${classId}/history`),
  getClassMatrix: (classId: string) =>
    fetchJson<AttendanceMatrixData>(`/api/classes/${classId}/matrix`),
  getClassStatistics: (classId: string) =>
    fetchJson<ClassStatistics>(`/api/classes/${classId}/statistics`),

  // Reset Demo
  resetDemoData: () =>
    fetchJson<{ success: boolean; message: string }>('/api/reset-demo', {
      method: 'POST',
    }),
  // Clear All
  clearAll: () =>
    fetchJson<{ success: boolean; message: string }>('/api/clear-all', {
      method: 'POST',
    }),
  // Seed Demo
  seedDemo: () =>
    fetchJson<{ success: boolean; message: string }>('/api/seed-demo', {
      method: 'POST',
    }),
};
