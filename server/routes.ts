import express, { Request, Response } from 'express';
import { db, clearAllEntries, seedDemoDatabase, resetDatabase } from './db.js';

export const apiRouter = express.Router();

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

// 1. Dashboard API
apiRouter.get('/dashboard', (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Total classes
    const classesCount = (db.prepare('SELECT COUNT(*) as count FROM classes').get() as { count: number }).count;
    // Total students
    const studentsCount = (db.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number }).count;

    // Today's attendance stats
    const todayStats = db.prepare(`
      SELECT 
        COUNT(CASE WHEN r.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN r.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN r.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN r.status = 'excused' THEN 1 END) as excused_count,
        COUNT(r.id) as total_records
      FROM attendance_records r
      JOIN attendance_sessions s ON r.session_id = s.id
      WHERE s.date = ?
    `).get(todayStr) as {
      present_count: number;
      late_count: number;
      absent_count: number;
      excused_count: number;
      total_records: number;
    };

    const todayPresentRate = todayStats.total_records > 0
      ? Math.round(((todayStats.present_count + (todayStats.late_count * 0.5)) / todayStats.total_records) * 100)
      : 0;

    // Overall attendance rate across all time
    const overallStats = db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
        COUNT(*) as total_records
      FROM attendance_records
    `).get() as { present_count: number; late_count: number; total_records: number };

    const averageAttendanceRate = overallStats.total_records > 0
      ? Math.round(((overallStats.present_count + (overallStats.late_count * 0.5)) / overallStats.total_records) * 100)
      : 0;

    // Classes overview
    const classes = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count,
        (SELECT COUNT(*) FROM attendance_sessions ses WHERE ses.class_id = c.id) as session_count,
        (
          SELECT CASE WHEN COUNT(r.id) > 0 
            THEN ROUND((CAST(COUNT(CASE WHEN r.status = 'present' THEN 1 END) + (COUNT(CASE WHEN r.status = 'late' THEN 1 END) * 0.5) AS FLOAT) / COUNT(r.id)) * 100)
            ELSE 0 END
          FROM attendance_records r
          WHERE r.class_id = c.id
        ) as avg_attendance,
        EXISTS(
          SELECT 1 FROM attendance_sessions s 
          WHERE s.class_id = c.id AND s.date = ?
        ) as today_marked
      FROM classes c
      ORDER BY c.created_at DESC
    `).all(todayStr);

    // Recent 7 school days trend
    const recentSessions = db.prepare(`
      SELECT 
        s.date,
        COUNT(r.id) as total_marked,
        COUNT(CASE WHEN r.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN r.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN r.status = 'absent' THEN 1 END) as absent_count
      FROM attendance_sessions s
      JOIN attendance_records r ON s.id = r.session_id
      GROUP BY s.date
      ORDER BY s.date DESC
      LIMIT 7
    `).all() as Array<{
      date: string;
      total_marked: number;
      present_count: number;
      late_count: number;
      absent_count: number;
    }>;

    // Reverse for chronological chart
    const trend = recentSessions.reverse().map(row => ({
      date: row.date,
      rate: row.total_marked > 0 ? Math.round(((row.present_count + (row.late_count * 0.5)) / row.total_marked) * 100) : 0,
      present: row.present_count,
      late: row.late_count,
      absent: row.absent_count,
      total: row.total_marked
    }));

    // Students with low attendance (< 75%)
    const studentsAtRisk = db.prepare(`
      SELECT 
        s.id,
        s.student_id_number,
        s.first_name,
        s.last_name,
        s.avatar_color,
        s.guardian_name,
        s.guardian_contact,
        c.id as class_id,
        c.name as class_name,
        c.color as class_color,
        COUNT(r.id) as total_sessions,
        COUNT(CASE WHEN r.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN r.status = 'late' THEN 1 END) as late_count,
        ROUND((CAST(COUNT(CASE WHEN r.status = 'present' THEN 1 END) + (COUNT(CASE WHEN r.status = 'late' THEN 1 END) * 0.5) AS FLOAT) / COUNT(r.id)) * 100) as attendance_percentage
      FROM students s
      JOIN classes c ON s.class_id = c.id
      JOIN attendance_records r ON s.id = r.student_id
      GROUP BY s.id
      HAVING COUNT(r.id) >= 3 AND attendance_percentage < c.min_attendance_threshold
      ORDER BY attendance_percentage ASC
      LIMIT 8
    `).all();

    res.json({
      today: todayStr,
      metrics: {
        total_classes: classesCount,
        total_students: studentsCount,
        today_marked_count: todayStats.total_records,
        today_present: todayStats.present_count,
        today_late: todayStats.late_count,
        today_absent: todayStats.absent_count,
        today_excused: todayStats.excused_count,
        today_percentage: todayPresentRate,
        average_attendance_rate: averageAttendanceRate,
      },
      classes,
      trend,
      students_at_risk: studentsAtRisk,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// 2. Classes API
apiRouter.get('/classes', (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const classes = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count,
        (SELECT COUNT(*) FROM attendance_sessions ses WHERE ses.class_id = c.id) as session_count,
        (
          SELECT CASE WHEN COUNT(r.id) > 0 
            THEN ROUND((CAST(COUNT(CASE WHEN r.status = 'present' THEN 1 END) + (COUNT(CASE WHEN r.status = 'late' THEN 1 END) * 0.5) AS FLOAT) / COUNT(r.id)) * 100)
            ELSE 0 END
          FROM attendance_records r
          WHERE r.class_id = c.id
        ) as avg_attendance,
        EXISTS(
          SELECT 1 FROM attendance_sessions s 
          WHERE s.class_id = c.id AND s.date = ?
        ) as today_marked
      FROM classes c
      ORDER BY c.name ASC
    `).all(todayStr);

    res.json(classes);
  } catch (error) {
    console.error('Fetch classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

apiRouter.post('/classes', (req: Request, res: Response) => {
  try {
    const {
      name,
      subject,
      grade_level,
      section,
      room,
      color = 'indigo',
      schedule,
      description,
      min_attendance_threshold = 75,
    } = req.body;

    if (!name || !subject || !grade_level) {
      return res.status(400).json({ error: 'Name, subject, and grade level are required.' });
    }

    const id = generateId('cls');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO classes (id, name, subject, grade_level, section, room, color, schedule, description, min_attendance_threshold, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      subject.trim(),
      grade_level.trim(),
      section?.trim() || null,
      room?.trim() || null,
      color,
      schedule?.trim() || null,
      description?.trim() || null,
      Number(min_attendance_threshold) || 75,
      now,
      now
    );

    const newClass = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    res.status(201).json(newClass);
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

apiRouter.get('/classes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const todayStr = new Date().toISOString().split('T')[0];

    const classData = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count,
        (SELECT COUNT(*) FROM attendance_sessions ses WHERE ses.class_id = c.id) as session_count,
        (
          SELECT CASE WHEN COUNT(r.id) > 0 
            THEN ROUND((CAST(COUNT(CASE WHEN r.status = 'present' THEN 1 END) + (COUNT(CASE WHEN r.status = 'late' THEN 1 END) * 0.5) AS FLOAT) / COUNT(r.id)) * 100)
            ELSE 0 END
          FROM attendance_records r
          WHERE r.class_id = c.id
        ) as avg_attendance,
        EXISTS(
          SELECT 1 FROM attendance_sessions s 
          WHERE s.class_id = c.id AND s.date = ?
        ) as today_marked
      FROM classes c
      WHERE c.id = ?
    `).get(todayStr, id);

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json(classData);
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

apiRouter.put('/classes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      subject,
      grade_level,
      section,
      room,
      color,
      schedule,
      description,
      min_attendance_threshold,
    } = req.body;

    if (!name || !subject || !grade_level) {
      return res.status(400).json({ error: 'Name, subject, and grade level are required.' });
    }

    const now = new Date().toISOString();

    const info = db.prepare(`
      UPDATE classes 
      SET 
        name = ?,
        subject = ?,
        grade_level = ?,
        section = ?,
        room = ?,
        color = ?,
        schedule = ?,
        description = ?,
        min_attendance_threshold = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      name.trim(),
      subject.trim(),
      grade_level.trim(),
      section?.trim() || null,
      room?.trim() || null,
      color || 'indigo',
      schedule?.trim() || null,
      description?.trim() || null,
      Number(min_attendance_threshold) || 75,
      now,
      id
    );

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const updated = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

apiRouter.delete('/classes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM classes WHERE id = ?').run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ success: true, message: 'Class and associated records deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// 3. Students API
apiRouter.get('/classes/:id/students', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const students = db.prepare(`
      SELECT 
        s.*,
        COUNT(r.id) as total_sessions,
        COUNT(CASE WHEN r.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN r.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN r.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN r.status = 'excused' THEN 1 END) as excused_count,
        CASE WHEN COUNT(r.id) > 0 
          THEN ROUND((CAST(COUNT(CASE WHEN r.status = 'present' THEN 1 END) + (COUNT(CASE WHEN r.status = 'late' THEN 1 END) * 0.5) AS FLOAT) / COUNT(r.id)) * 100)
          ELSE 100 END as attendance_percentage
      FROM students s
      LEFT JOIN attendance_records r ON s.id = r.student_id
      WHERE s.class_id = ?
      GROUP BY s.id
      ORDER BY s.last_name ASC, s.first_name ASC
    `).all(id);

    res.json(students);
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

apiRouter.post('/classes/:id/students', (req: Request, res: Response) => {
  try {
    const { id: class_id } = req.params;
    const {
      student_id_number,
      first_name,
      last_name,
      email,
      phone,
      gender,
      guardian_name,
      guardian_contact,
      notes,
      avatar_color = 'indigo',
    } = req.body;

    if (!student_id_number || !first_name || !last_name) {
      return res.status(400).json({ error: 'Student ID, first name, and last name are required.' });
    }

    // Verify class exists
    const classExists = db.prepare('SELECT id FROM classes WHERE id = ?').get(class_id);
    if (!classExists) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check duplicate student_id_number within this class
    const duplicate = db.prepare('SELECT id FROM students WHERE class_id = ? AND student_id_number = ?').get(class_id, student_id_number.trim());
    if (duplicate) {
      return res.status(400).json({ error: `Student with ID "${student_id_number.trim()}" already exists in this class.` });
    }

    const studentId = generateId('stu');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO students (id, class_id, student_id_number, first_name, last_name, email, phone, gender, guardian_name, guardian_contact, notes, avatar_color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      studentId,
      class_id,
      student_id_number.trim(),
      first_name.trim(),
      last_name.trim(),
      email?.trim() || null,
      phone?.trim() || null,
      gender?.trim() || null,
      guardian_name?.trim() || null,
      guardian_contact?.trim() || null,
      notes?.trim() || null,
      avatar_color,
      now,
      now
    );

    const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    res.status(201).json(newStudent);
  } catch (error: any) {
    console.error('Create student error:', error);
    res.status(500).json({ error: error.message || 'Failed to create student' });
  }
});

// Batch add students (e.g., CSV upload or bulk text input)
apiRouter.post('/classes/:id/students/batch', (req: Request, res: Response) => {
  try {
    const { id: class_id } = req.params;
    const { students } = req.body as {
      students: Array<{
        student_id_number: string;
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
        gender?: string;
        guardian_name?: string;
        guardian_contact?: string;
      }>;
    };

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'An array of students is required.' });
    }

    const now = new Date().toISOString();
    const colors = ['indigo', 'emerald', 'amber', 'rose', 'sky', 'violet', 'teal', 'blue', 'orange'];
    let addedCount = 0;
    const errors: string[] = [];

    const insertStmt = db.prepare(`
      INSERT INTO students (id, class_id, student_id_number, first_name, last_name, email, phone, gender, guardian_name, guardian_contact, notes, avatar_color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      students.forEach((s, idx) => {
        if (!s.first_name || !s.last_name || !s.student_id_number) {
          errors.push(`Row ${idx + 1}: Missing student ID or name.`);
          return;
        }

        const sid = s.student_id_number.trim();
        const existing = db.prepare('SELECT id FROM students WHERE class_id = ? AND student_id_number = ?').get(class_id, sid);
        if (existing) {
          errors.push(`Row ${idx + 1}: Student ID ${sid} already exists in this class.`);
          return;
        }

        const id = generateId('stu');
        const color = colors[idx % colors.length];

        insertStmt.run(
          id,
          class_id,
          sid,
          s.first_name.trim(),
          s.last_name.trim(),
          s.email?.trim() || null,
          s.phone?.trim() || null,
          s.gender?.trim() || null,
          s.guardian_name?.trim() || null,
          s.guardian_contact?.trim() || null,
          null,
          color,
          now,
          now
        );
        addedCount++;
      });

      db.exec('COMMIT;');
      res.status(201).json({ addedCount, errors });
    } catch (err: any) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error: any) {
    console.error('Batch add students error:', error);
    res.status(500).json({ error: 'Failed to batch import students' });
  }
});

apiRouter.put('/classes/:id/students/:studentId', (req: Request, res: Response) => {
  try {
    const { id: class_id, studentId } = req.params;
    const {
      student_id_number,
      first_name,
      last_name,
      email,
      phone,
      gender,
      guardian_name,
      guardian_contact,
      notes,
      avatar_color,
    } = req.body;

    if (!student_id_number || !first_name || !last_name) {
      return res.status(400).json({ error: 'Student ID, first name, and last name are required.' });
    }

    // Check duplicate student_id_number in same class (excluding current student)
    const duplicate = db.prepare('SELECT id FROM students WHERE class_id = ? AND student_id_number = ? AND id != ?').get(class_id, student_id_number.trim(), studentId);
    if (duplicate) {
      return res.status(400).json({ error: `Student with ID "${student_id_number.trim()}" already exists in this class.` });
    }

    const now = new Date().toISOString();

    const info = db.prepare(`
      UPDATE students
      SET 
        student_id_number = ?,
        first_name = ?,
        last_name = ?,
        email = ?,
        phone = ?,
        gender = ?,
        guardian_name = ?,
        guardian_contact = ?,
        notes = ?,
        avatar_color = COALESCE(?, avatar_color),
        updated_at = ?
      WHERE id = ? AND class_id = ?
    `).run(
      student_id_number.trim(),
      first_name.trim(),
      last_name.trim(),
      email?.trim() || null,
      phone?.trim() || null,
      gender?.trim() || null,
      guardian_name?.trim() || null,
      guardian_contact?.trim() || null,
      notes?.trim() || null,
      avatar_color || null,
      now,
      studentId,
      class_id
    );

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    res.json(updated);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

apiRouter.delete('/classes/:id/students/:studentId', (req: Request, res: Response) => {
  try {
    const { id: class_id, studentId } = req.params;
    const info = db.prepare('DELETE FROM students WHERE id = ? AND class_id = ?').run(studentId, class_id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ success: true, message: 'Student and attendance records deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// 4. Attendance Marking API
// Get attendance for a specific date
apiRouter.get('/classes/:id/attendance', (req: Request, res: Response) => {
  try {
    const { id: class_id } = req.params;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Find session if exists
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE class_id = ? AND date = ?').get(class_id, date) as any;

    // Get all students in the class
    const students = db.prepare(`
      SELECT 
        s.*,
        r.id as record_id,
        r.status as attendance_status,
        r.remarks,
        r.marked_at
      FROM students s
      LEFT JOIN attendance_records r ON s.id = r.student_id AND r.session_id = ?
      WHERE s.class_id = ?
      ORDER BY s.last_name ASC, s.first_name ASC
    `).all(session ? session.id : '', class_id);

    res.json({
      date,
      session: session || null,
      is_marked: !!session,
      students,
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Save or Update Attendance for a date
apiRouter.post('/classes/:id/attendance', (req: Request, res: Response) => {
  try {
    const { id: class_id } = req.params;
    const {
      date,
      title = null,
      notes = null,
      records, // Array of { student_id: string, status: 'present' | 'absent' | 'late' | 'excused', remarks?: string }
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Attendance records are required.' });
    }

    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      // Find or create session
      let session = db.prepare('SELECT * FROM attendance_sessions WHERE class_id = ? AND date = ?').get(class_id, date) as any;
      let sessionId = session?.id;

      if (!session) {
        sessionId = generateId('ses');
        db.prepare(`
          INSERT INTO attendance_sessions (id, class_id, date, title, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(sessionId, class_id, date, title, notes, now, now);
      } else {
        db.prepare(`
          UPDATE attendance_sessions
          SET title = ?, notes = ?, updated_at = ?
          WHERE id = ?
        `).run(title, notes, now, sessionId);
      }

      // Upsert attendance records
      const upsertRecordStmt = db.prepare(`
        INSERT INTO attendance_records (id, session_id, class_id, student_id, status, remarks, marked_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id, student_id) DO UPDATE SET
          status = excluded.status,
          remarks = excluded.remarks,
          updated_at = excluded.updated_at
      `);

      for (const rec of records) {
        const recordId = generateId('rec');
        upsertRecordStmt.run(
          recordId,
          sessionId,
          class_id,
          rec.student_id,
          rec.status,
          rec.remarks || null,
          now,
          now
        );
      }

      db.exec('COMMIT;');

      // Return summary
      const summary = db.prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_count,
          COUNT(*) as total_count
        FROM attendance_records
        WHERE session_id = ?
      `).get(sessionId);

      res.json({
        success: true,
        sessionId,
        date,
        recordsSaved: records.length,
        summary,
      });
    } catch (err: any) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error: any) {
    console.error('Save attendance error:', error);
    res.status(500).json({ error: error.message || 'Failed to save attendance' });
  }
});

// Delete attendance session
apiRouter.delete('/classes/:id/attendance/:date', (req: Request, res: Response) => {
  try {
    const { id: class_id, date } = req.params;
    const session = db.prepare('SELECT id FROM attendance_sessions WHERE class_id = ? AND date = ?').get(class_id, date) as any;

    if (!session) {
      return res.status(404).json({ error: 'No attendance record found for this date' });
    }

    db.prepare('DELETE FROM attendance_sessions WHERE id = ?').run(session.id);
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
});

// 5. Attendance History API
apiRouter.get('/classes/:id/history', (req: Request, res: Response) => {
  try {
    const { id: class_id } = req.params;

    const sessions = db.prepare(`
      SELECT 
        s.id,
        s.date,
        s.title,
        s.notes,
        s.created_at,
        COUNT(r.id) as total_records,
        COUNT(CASE WHEN r.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN r.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN r.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN r.status = 'excused' THEN 1 END) as excused_count,
        CASE WHEN COUNT(r.id) > 0 
          THEN ROUND((CAST(COUNT(CASE WHEN r.status = 'present' THEN 1 END) + (COUNT(CASE WHEN r.status = 'late' THEN 1 END) * 0.5) AS FLOAT) / COUNT(r.id)) * 100)
          ELSE 0 END as percentage
      FROM attendance_sessions s
      LEFT JOIN attendance_records r ON s.id = r.session_id
      WHERE s.class_id = ?
      GROUP BY s.id
      ORDER BY s.date DESC
    `).all(class_id);

    res.json(sessions);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

// Full Attendance Matrix (Students x Sessions)
apiRouter.get('/classes/:id/matrix', (req: Request, res: Response) => {
  try {
    const { id: class_id } = req.params;

    const sessions = db.prepare(`
      SELECT id, date, title 
      FROM attendance_sessions 
      WHERE class_id = ? 
      ORDER BY date ASC
    `).all(class_id) as Array<{ id: string; date: string; title: string | null }>;

    const students = db.prepare(`
      SELECT 
        s.id, 
        s.student_id_number, 
        s.first_name, 
        s.last_name, 
        s.avatar_color,
        COUNT(r.id) as total_sessions,
        COUNT(CASE WHEN r.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN r.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN r.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN r.status = 'excused' THEN 1 END) as excused_count,
        CASE WHEN COUNT(r.id) > 0 
          THEN ROUND((CAST(COUNT(CASE WHEN r.status = 'present' THEN 1 END) + (COUNT(CASE WHEN r.status = 'late' THEN 1 END) * 0.5) AS FLOAT) / COUNT(r.id)) * 100)
          ELSE 100 END as attendance_percentage
      FROM students s
      LEFT JOIN attendance_records r ON s.id = r.student_id
      WHERE s.class_id = ?
      GROUP BY s.id
      ORDER BY s.last_name ASC, s.first_name ASC
    `).all(class_id);

    const records = db.prepare(`
      SELECT r.student_id, s.date, r.status, r.remarks
      FROM attendance_records r
      JOIN attendance_sessions s ON r.session_id = s.id
      WHERE r.class_id = ?
    `).all(class_id) as Array<{ student_id: string; date: string; status: string; remarks: string | null }>;

    // Map records for fast lookup: [studentId][date] = { status, remarks }
    const recordMap: Record<string, Record<string, { status: string; remarks: string | null }>> = {};
    for (const rec of records) {
      if (!recordMap[rec.student_id]) {
        recordMap[rec.student_id] = {};
      }
      recordMap[rec.student_id][rec.date] = {
        status: rec.status,
        remarks: rec.remarks,
      };
    }

    res.json({
      sessions,
      students,
      matrix: recordMap,
    });
  } catch (error) {
    console.error('Fetch matrix error:', error);
    res.status(500).json({ error: 'Failed to fetch matrix' });
  }
});

// 6. Statistics API for Class
apiRouter.get('/classes/:id/statistics', (req: Request, res: Response) => {
  try {
    const { id: class_id } = req.params;

    const classInfo = db.prepare('SELECT * FROM classes WHERE id = ?').get(class_id) as any;
    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Overall metrics for class
    const totals = db.prepare(`
      SELECT 
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(r.id) as total_records,
        COUNT(CASE WHEN r.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN r.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN r.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN r.status = 'excused' THEN 1 END) as excused_count
      FROM attendance_sessions s
      LEFT JOIN attendance_records r ON s.id = r.session_id
      WHERE s.class_id = ?
    `).get(class_id) as {
      total_sessions: number;
      total_records: number;
      present_count: number;
      late_count: number;
      absent_count: number;
      excused_count: number;
    };

    const overallRate = totals.total_records > 0
      ? Math.round(((totals.present_count + (totals.late_count * 0.5)) / totals.total_records) * 100)
      : 0;

    // Daily trends (all sessions in order)
    const dailyTrends = db.prepare(`
      SELECT 
        s.date,
        COUNT(r.id) as total,
        COUNT(CASE WHEN r.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN r.status = 'late' THEN 1 END) as late,
        COUNT(CASE WHEN r.status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN r.status = 'excused' THEN 1 END) as excused,
        CASE WHEN COUNT(r.id) > 0 
          THEN ROUND((CAST(COUNT(CASE WHEN r.status = 'present' THEN 1 END) + (COUNT(CASE WHEN r.status = 'late' THEN 1 END) * 0.5) AS FLOAT) / COUNT(r.id)) * 100)
          ELSE 0 END as rate
      FROM attendance_sessions s
      JOIN attendance_records r ON s.id = r.session_id
      WHERE s.class_id = ?
      GROUP BY s.date
      ORDER BY s.date ASC
    `).all(class_id);

    // Student performance rankings
    const studentStats = db.prepare(`
      SELECT 
        s.id,
        s.student_id_number,
        s.first_name,
        s.last_name,
        s.avatar_color,
        s.email,
        s.guardian_name,
        s.guardian_contact,
        COUNT(r.id) as sessions_recorded,
        COUNT(CASE WHEN r.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN r.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN r.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN r.status = 'excused' THEN 1 END) as excused_count,
        CASE WHEN COUNT(r.id) > 0 
          THEN ROUND((CAST(COUNT(CASE WHEN r.status = 'present' THEN 1 END) + (COUNT(CASE WHEN r.status = 'late' THEN 1 END) * 0.5) AS FLOAT) / COUNT(r.id)) * 100)
          ELSE 100 END as attendance_percentage
      FROM students s
      LEFT JOIN attendance_records r ON s.id = r.student_id
      WHERE s.class_id = ?
      GROUP BY s.id
      ORDER BY attendance_percentage DESC, s.last_name ASC
    `).all(class_id) as any[];

    // Top performers (>= 90%)
    const topPerformers = studentStats.filter(s => s.sessions_recorded > 0 && s.attendance_percentage >= 90);
    // At risk (< threshold)
    const atRisk = studentStats.filter(s => s.sessions_recorded > 0 && s.attendance_percentage < classInfo.min_attendance_threshold);

    res.json({
      class: classInfo,
      totals: {
        ...totals,
        rate: overallRate,
      },
      dailyTrends,
      topPerformers,
      atRisk,
      allStudents: studentStats,
    });
  } catch (error) {
    console.error('Fetch statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Clear all entries across all tables
apiRouter.post('/clear-all', (req: Request, res: Response) => {
  try {
    clearAllEntries();
    res.json({ success: true, message: 'All entries cleared. Ready for teacher to create classrooms and add students!' });
  } catch (error) {
    console.error('Clear all error:', error);
    res.status(500).json({ error: 'Failed to clear database' });
  }
});

// Seed demo data API
apiRouter.post('/seed-demo', (req: Request, res: Response) => {
  try {
    clearAllEntries();
    seedDemoDatabase();
    res.json({ success: true, message: 'Sample demo data loaded successfully!' });
  } catch (error) {
    console.error('Seed demo error:', error);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

// Reset demo data API
apiRouter.post('/reset-demo', (req: Request, res: Response) => {
  try {
    resetDatabase();
    res.json({ success: true, message: 'Sample data reset successfully!' });
  } catch (error) {
    console.error('Reset database error:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});
