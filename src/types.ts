export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface ClassItem {
  id: string;
  name: string;
  subject: string;
  grade_level: string;
  section: string | null;
  room: string | null;
  color: string;
  schedule: string | null;
  description: string | null;
  min_attendance_threshold: number;
  student_count?: number;
  session_count?: number;
  avg_attendance?: number;
  today_marked?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  class_id: string;
  student_id_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  notes: string | null;
  avatar_color: string;
  created_at: string;
  updated_at: string;
  // Computed stats from backend
  total_sessions?: number;
  present_count?: number;
  late_count?: number;
  absent_count?: number;
  excused_count?: number;
  attendance_percentage?: number;
}

export interface AttendanceStudentEntry extends Student {
  record_id?: string | null;
  attendance_status?: AttendanceStatus | null;
  remarks?: string | null;
  marked_at?: string | null;
}

export interface AttendanceSession {
  id: string;
  class_id: string;
  date: string;
  title: string | null;
  notes: string | null;
  created_at: string;
  total_records?: number;
  present_count?: number;
  late_count?: number;
  absent_count?: number;
  excused_count?: number;
  percentage?: number;
}

export interface DashboardMetrics {
  total_classes: number;
  total_students: number;
  today_marked_count: number;
  today_present: number;
  today_late: number;
  today_absent: number;
  today_excused: number;
  today_percentage: number;
  average_attendance_rate: number;
}

export interface TrendDay {
  date: string;
  rate: number;
  present: number;
  late: number;
  absent: number;
  total: number;
}

export interface StudentAtRisk {
  id: string;
  student_id_number: string;
  first_name: string;
  last_name: string;
  avatar_color: string;
  guardian_name: string | null;
  guardian_contact: string | null;
  class_id: string;
  class_name: string;
  class_color: string;
  total_sessions: number;
  absent_count: number;
  late_count: number;
  attendance_percentage: number;
}

export interface DashboardData {
  today: string;
  metrics: DashboardMetrics;
  classes: ClassItem[];
  trend: TrendDay[];
  students_at_risk: StudentAtRisk[];
}

export interface ClassStatistics {
  class: ClassItem;
  totals: {
    total_sessions: number;
    total_records: number;
    present_count: number;
    late_count: number;
    absent_count: number;
    excused_count: number;
    rate: number;
  };
  dailyTrends: Array<{
    date: string;
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    rate: number;
  }>;
  topPerformers: Student[];
  atRisk: Student[];
  allStudents: Student[];
}

export interface AttendanceMatrixData {
  sessions: Array<{ id: string; date: string; title: string | null }>;
  students: Student[];
  matrix: Record<string, Record<string, { status: AttendanceStatus; remarks: string | null }>>;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}
