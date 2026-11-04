import { AttendanceStatus } from '../types';

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDayOfWeek(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOffsetDateString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CLASS_COLORS: Record<string, { bg: string; text: string; border: string; accent: string; badge: string }> = {
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    accent: 'bg-indigo-600',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    accent: 'bg-emerald-600',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    accent: 'bg-amber-600',
    badge: 'bg-amber-100 text-amber-800',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    accent: 'bg-rose-600',
    badge: 'bg-rose-100 text-rose-800',
  },
  sky: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    accent: 'bg-sky-600',
    badge: 'bg-sky-100 text-sky-800',
  },
  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    accent: 'bg-violet-600',
    badge: 'bg-violet-100 text-violet-800',
  },
  teal: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    accent: 'bg-teal-600',
    badge: 'bg-teal-100 text-teal-800',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    accent: 'bg-blue-600',
    badge: 'bg-blue-100 text-blue-800',
  },
};

export const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    pillBg: string;
    pillActive: string;
    dot: string;
    short: string;
  }
> = {
  present: {
    label: 'Present',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    pillBg: 'hover:bg-emerald-100 text-emerald-700 border-emerald-300',
    pillActive: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200',
    dot: 'bg-emerald-500',
    short: 'P',
  },
  late: {
    label: 'Late',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    pillBg: 'hover:bg-amber-100 text-amber-700 border-amber-300',
    pillActive: 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200',
    dot: 'bg-amber-500',
    short: 'L',
  },
  absent: {
    label: 'Absent',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    pillBg: 'hover:bg-rose-100 text-rose-700 border-rose-300',
    pillActive: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-200',
    dot: 'bg-rose-500',
    short: 'A',
  },
  excused: {
    label: 'Excused',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    pillBg: 'hover:bg-sky-100 text-sky-700 border-sky-300',
    pillActive: 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-200',
    dot: 'bg-sky-500',
    short: 'E',
  },
};

export function getAttendanceRateBadge(rate: number, threshold = 75): { color: string; label: string } {
  if (rate >= 90) {
    return { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Excellent' };
  } else if (rate >= threshold) {
    return { color: 'text-sky-700 bg-sky-50 border-sky-200', label: 'Good' };
  } else if (rate >= threshold - 10) {
    return { color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Warning' };
  } else {
    return { color: 'text-rose-700 bg-rose-50 border-rose-200', label: 'Critical' };
  }
}

// CSV Exporter
export function downloadCSV(filename: string, rows: string[][]): void {
  const processRow = (row: string[]) =>
    row
      .map((val) => {
        let text = val === null || val === undefined ? '' : String(val);
        text = text.replace(/"/g, '""');
        if (text.search(/("|,|\n)/g) >= 0) {
          text = `"${text}"`;
        }
        return text;
      })
      .join(',');

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(processRow).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
