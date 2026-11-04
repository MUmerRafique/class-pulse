import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'attendance.db');
export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode for reliability and performance
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    section TEXT,
    room TEXT,
    color TEXT NOT NULL DEFAULT 'indigo',
    schedule TEXT,
    description TEXT,
    min_attendance_threshold INTEGER NOT NULL DEFAULT 75,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id_number TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    gender TEXT,
    guardian_name TEXT,
    guardian_contact TEXT,
    notes TEXT,
    avatar_color TEXT NOT NULL DEFAULT 'indigo',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(class_id, student_id_number)
  );

  CREATE TABLE IF NOT EXISTS attendance_sessions (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    title TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(class_id, date)
  );

  CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
    remarks TEXT,
    marked_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(session_id, student_id)
  );

  CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_class_date ON attendance_sessions(class_id, date);
  CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
  CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);
  CREATE INDEX IF NOT EXISTS idx_records_class ON attendance_records(class_id);
`);

// Types
export interface ClassEntity {
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
  created_at: string;
  updated_at: string;
}

export interface StudentEntity {
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
}

export interface AttendanceSessionEntity {
  id: string;
  class_id: string;
  date: string;
  title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecordEntity {
  id: string;
  session_id: string;
  class_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks: string | null;
  marked_at: string;
  updated_at: string;
}

// Seed realistic sample data when explicitly requested
export function seedDemoDatabase() {
  console.log('Seeding initial classes, students, and attendance records...');

  const now = new Date().toISOString();

  // Helper date function for school days (last 10 week days)
  const getRecentSchoolDays = (numDays: number): string[] => {
    const dates: string[] = [];
    const curr = new Date();
    // Start from today
    while (dates.length < numDays) {
      const day = curr.getDay();
      // Skip Saturday (6) and Sunday (0)
      if (day !== 0 && day !== 6) {
        dates.push(curr.toISOString().split('T')[0]);
      }
      curr.setDate(curr.getDate() - 1);
    }
    return dates.reverse(); // chronological order
  };

  const schoolDays = getRecentSchoolDays(10);

  const classesData = [
    {
      id: 'cls_biology_101',
      name: 'Biology 101: Cellular Systems',
      subject: 'Science',
      grade_level: 'Grade 10',
      section: 'Section A',
      room: 'Science Lab 204',
      color: 'emerald',
      schedule: 'Mon, Wed, Fri • 08:30 AM - 09:45 AM',
      description: 'Foundations of cellular biology, genetics, and metabolic pathways with hands-on lab experiments.',
      min_attendance_threshold: 80,
      students: [
        { id: 'stu_bio_01', id_num: 'BIO-101', first: 'Alexander', last: 'Wright', gender: 'Male', g_name: 'David Wright', g_phone: '+1 (555) 234-5678', avatar: 'emerald' },
        { id: 'stu_bio_02', id_num: 'BIO-102', first: 'Sophia', last: 'Chen', gender: 'Female', g_name: 'Grace Chen', g_phone: '+1 (555) 345-6789', avatar: 'teal' },
        { id: 'stu_bio_03', id_num: 'BIO-103', first: 'Marcus', last: 'Johnson', gender: 'Male', g_name: 'Linda Johnson', g_phone: '+1 (555) 456-7890', avatar: 'blue' },
        { id: 'stu_bio_04', id_num: 'BIO-104', first: 'Emma', last: 'Watson', gender: 'Female', g_name: 'Robert Watson', g_phone: '+1 (555) 567-8901', avatar: 'indigo' },
        { id: 'stu_bio_05', id_num: 'BIO-105', first: 'Lucas', last: 'Martinez', gender: 'Male', g_name: 'Elena Martinez', g_phone: '+1 (555) 678-9012', avatar: 'amber' },
        { id: 'stu_bio_06', id_num: 'BIO-106', first: 'Olivia', last: 'Taylor', gender: 'Female', g_name: 'James Taylor', g_phone: '+1 (555) 789-0123', avatar: 'rose' },
        { id: 'stu_bio_07', id_num: 'BIO-107', first: 'Noah', last: 'Kim', gender: 'Male', g_name: 'Sarah Kim', g_phone: '+1 (555) 890-1234', avatar: 'purple' },
        { id: 'stu_bio_08', id_num: 'BIO-108', first: 'Isabella', last: 'Patel', gender: 'Female', g_name: 'Raj Patel', g_phone: '+1 (555) 901-2345', avatar: 'cyan' },
        { id: 'stu_bio_09', id_num: 'BIO-109', first: 'Ethan', last: 'Davis', gender: 'Male', g_name: 'Karen Davis', g_phone: '+1 (555) 112-3344', avatar: 'orange' },
        { id: 'stu_bio_10', id_num: 'BIO-110', first: 'Mia', last: 'Hernandez', gender: 'Female', g_name: 'Carlos Hernandez', g_phone: '+1 (555) 223-4455', avatar: 'violet' },
        { id: 'stu_bio_11', id_num: 'BIO-111', first: 'Liam', last: 'O\'Connor', gender: 'Male', g_name: 'Mary O\'Connor', g_phone: '+1 (555) 334-5566', avatar: 'lime' },
        { id: 'stu_bio_12', id_num: 'BIO-112', first: 'Ava', last: 'Rossi', gender: 'Female', g_name: 'Marco Rossi', g_phone: '+1 (555) 445-6677', avatar: 'pink' }
      ]
    },
    {
      id: 'cls_calculus_12',
      name: 'AP Calculus BC',
      subject: 'Mathematics',
      grade_level: 'Grade 12',
      section: 'Period 3',
      room: 'Hall B - Room 112',
      color: 'indigo',
      schedule: 'Mon, Tue, Thu • 10:15 AM - 11:30 AM',
      description: 'Advanced placement calculus covering differential equations, infinite series, and vector analysis.',
      min_attendance_threshold: 75,
      students: [
        { id: 'stu_calc_01', id_num: 'CALC-201', first: 'Benjamin', last: 'Miller', gender: 'Male', g_name: 'Sarah Miller', g_phone: '+1 (555) 556-7788', avatar: 'indigo' },
        { id: 'stu_calc_02', id_num: 'CALC-202', first: 'Chloe', last: 'Zhang', gender: 'Female', g_name: 'Hao Zhang', g_phone: '+1 (555) 667-8899', avatar: 'sky' },
        { id: 'stu_calc_03', id_num: 'CALC-203', first: 'Daniel', last: 'Gomez', gender: 'Male', g_name: 'Patricia Gomez', g_phone: '+1 (555) 778-9900', avatar: 'amber' },
        { id: 'stu_calc_04', id_num: 'CALC-204', first: 'Emily', last: 'Brooks', gender: 'Female', g_name: 'Thomas Brooks', g_phone: '+1 (555) 889-0011', avatar: 'emerald' },
        { id: 'stu_calc_05', id_num: 'CALC-205', first: 'Gabriel', last: 'Silva', gender: 'Male', g_name: 'Fernanda Silva', g_phone: '+1 (555) 990-1122', avatar: 'rose' },
        { id: 'stu_calc_06', id_num: 'CALC-206', first: 'Harper', last: 'Lee', gender: 'Female', g_name: 'Min Lee', g_phone: '+1 (555) 101-2233', avatar: 'purple' },
        { id: 'stu_calc_07', id_num: 'CALC-207', first: 'Isaac', last: 'Newton-Smith', gender: 'Male', g_name: 'Arthur Smith', g_phone: '+1 (555) 202-3344', avatar: 'teal' },
        { id: 'stu_calc_08', id_num: 'CALC-208', first: 'Jessica', last: 'Alvarez', gender: 'Female', g_name: 'Sofia Alvarez', g_phone: '+1 (555) 303-4455', avatar: 'blue' },
        { id: 'stu_calc_09', id_num: 'CALC-209', first: 'Kevin', last: 'Park', gender: 'Male', g_name: 'Eunice Park', g_phone: '+1 (555) 404-5566', avatar: 'orange' },
        { id: 'stu_calc_10', id_num: 'CALC-210', first: 'Lily', last: 'Foster', gender: 'Female', g_name: 'Gerald Foster', g_phone: '+1 (555) 505-6677', avatar: 'cyan' }
      ]
    },
    {
      id: 'cls_world_history_9',
      name: 'World History & Civilizations',
      subject: 'Social Studies',
      grade_level: 'Grade 9',
      section: 'Section B',
      room: 'Humanities 305',
      color: 'amber',
      schedule: 'Tue, Thu • 01:00 PM - 02:30 PM',
      description: 'Exploration of ancient empires, global trade routes, revolutions, and modern geopolitics.',
      min_attendance_threshold: 75,
      students: [
        { id: 'stu_hist_01', id_num: 'HIS-301', first: 'Mason', last: 'Adams', gender: 'Male', g_name: 'Laura Adams', g_phone: '+1 (555) 606-7788', avatar: 'amber' },
        { id: 'stu_hist_02', id_num: 'HIS-302', first: 'Zoe', last: 'Kowalski', gender: 'Female', g_name: 'Jan Kowalski', g_phone: '+1 (555) 707-8899', avatar: 'rose' },
        { id: 'stu_hist_03', id_num: 'HIS-303', first: 'Oliver', last: 'Brown', gender: 'Male', g_name: 'Alice Brown', g_phone: '+1 (555) 808-9900', avatar: 'indigo' },
        { id: 'stu_hist_04', id_num: 'HIS-304', first: 'Charlotte', last: 'Dubois', gender: 'Female', g_name: 'Pierre Dubois', g_phone: '+1 (555) 909-0011', avatar: 'teal' },
        { id: 'stu_hist_05', id_num: 'HIS-305', first: 'Elijah', last: 'Morales', gender: 'Male', g_name: 'Rosa Morales', g_phone: '+1 (555) 121-2323', avatar: 'emerald' },
        { id: 'stu_hist_06', id_num: 'HIS-306', first: 'Amelia', last: 'Nakamura', gender: 'Female', g_name: 'Kenji Nakamura', g_phone: '+1 (555) 232-3434', avatar: 'purple' },
        { id: 'stu_hist_07', id_num: 'HIS-307', first: 'Henry', last: 'King', gender: 'Male', g_name: 'Victoria King', g_phone: '+1 (555) 343-4545', avatar: 'blue' },
        { id: 'stu_hist_08', id_num: 'HIS-308', first: 'Ella', last: 'Santos', gender: 'Female', g_name: 'Manuel Santos', g_phone: '+1 (555) 454-5656', avatar: 'orange' }
      ]
    }
  ];

  const insertClass = db.prepare(`
    INSERT INTO classes (id, name, subject, grade_level, section, room, color, schedule, description, min_attendance_threshold, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertStudent = db.prepare(`
    INSERT INTO students (id, class_id, student_id_number, first_name, last_name, email, phone, gender, guardian_name, guardian_contact, notes, avatar_color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSession = db.prepare(`
    INSERT INTO attendance_sessions (id, class_id, date, title, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRecord = db.prepare(`
    INSERT INTO attendance_records (id, session_id, class_id, student_id, status, remarks, marked_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Transaction for atomic seed
  db.exec('BEGIN TRANSACTION;');

  try {
    for (const c of classesData) {
      insertClass.run(c.id, c.name, c.subject, c.grade_level, c.section, c.room, c.color, c.schedule, c.description, c.min_attendance_threshold, now, now);

      for (const s of c.students) {
        const email = `${s.first.toLowerCase()}.${s.last.toLowerCase().replace(/[^a-z]/g, '')}@student.school.edu`;
        insertStudent.run(
          s.id,
          c.id,
          s.id_num,
          s.first,
          s.last,
          email,
          `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
          s.gender,
          s.g_name,
          s.g_phone,
          null,
          s.avatar,
          now,
          now
        );
      }

      // Generate attendance history for school days
      schoolDays.forEach((dateStr, dayIdx) => {
        const sessionId = `ses_${c.id}_${dateStr}`;
        const title = dayIdx === schoolDays.length - 1 ? "Today's Lecture" : `Regular Session - Unit ${Math.floor(dayIdx / 3) + 1}`;
        insertSession.run(sessionId, c.id, dateStr, title, null, now, now);

        // Seed individual student attendance with realistic distribution (85% present, 7% late, 5% absent, 3% excused)
        c.students.forEach((s, sIdx) => {
          const recordId = `rec_${sessionId}_${s.id}`;
          // Make student #5 in Biology have slightly lower attendance for realistic test of low-attendance alert
          let status: 'present' | 'absent' | 'late' | 'excused' = 'present';
          let remarks: string | null = null;

          const rand = Math.random();
          if (c.id === 'cls_biology_101' && sIdx === 4 && (dayIdx === 2 || dayIdx === 5 || dayIdx === 7)) {
            status = 'absent';
            remarks = 'Unexcused absence - guardian notified';
          } else if (rand < 0.82) {
            status = 'present';
          } else if (rand < 0.90) {
            status = 'late';
            remarks = 'Arrived 10 mins late (Traffic)';
          } else if (rand < 0.96) {
            status = 'absent';
            remarks = 'Unexcused';
          } else {
            status = 'excused';
            remarks = 'Medical appointment note on file';
          }

          insertRecord.run(recordId, sessionId, c.id, s.id, status, remarks, now, now);
        });
      });
    }

    db.exec('COMMIT;');
    console.log('Seeding completed successfully!');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error during seeding:', err);
    throw err;
  }
}

// Clear all entries across all tables
export function clearAllEntries() {
  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec('DELETE FROM attendance_records;');
    db.exec('DELETE FROM attendance_sessions;');
    db.exec('DELETE FROM students;');
    db.exec('DELETE FROM classes;');
    db.exec('COMMIT;');
    console.log('All classes, students, and attendance records cleared successfully.');
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
}

// Reset database helper (re-seeds demo data)
export function resetDatabase() {
  clearAllEntries();
  seedDemoDatabase();
}
