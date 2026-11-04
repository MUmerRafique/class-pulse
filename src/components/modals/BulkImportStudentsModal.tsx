import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Student } from '../../types';

interface BulkImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (students: Partial<Student>[]) => Promise<{ addedCount: number; errors: string[] }>;
}

export const BulkImportStudentsModal: React.FC<BulkImportStudentsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [inputText, setInputText] = useState(`STU-501, Liam, Henderson, liam.h@school.edu, +1 (555) 432-1098
STU-502, Emma, Richardson, emma.r@school.edu, +1 (555) 543-2109
STU-503, Noah, Sullivan, noah.s@school.edu, +1 (555) 654-3210`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseStudents = () => {
    const lines = inputText.split('\n').filter((l) => l.trim().length > 0);
    const parsed: Partial<Student>[] = [];

    lines.forEach((line, index) => {
      // Split by comma or tab
      const parts = line.includes('\t')
        ? line.split('\t').map((p) => p.trim())
        : line.split(',').map((p) => p.trim());

      if (parts.length >= 2) {
        // Formats supported:
        // 1: ID, First, Last, Email, Phone
        // 2: First, Last, ID
        if (parts.length >= 3 && parts[0].includes('-') || parts[0].toUpperCase().startsWith('STU') || !isNaN(Number(parts[0]))) {
          parsed.push({
            student_id_number: parts[0],
            first_name: parts[1],
            last_name: parts[2],
            email: parts[3] || undefined,
            phone: parts[4] || undefined,
          });
        } else {
          // Assume First, Last, ID
          parsed.push({
            first_name: parts[0],
            last_name: parts[1],
            student_id_number: parts[2] || `STU-${100 + index}`,
            email: parts[3] || undefined,
            phone: parts[4] || undefined,
          });
        }
      }
    });

    return parsed;
  };

  const previewList = parseStudents();

  const handleImport = async () => {
    if (previewList.length === 0) {
      setError('No valid student rows found. Please check format.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await onSubmit(previewList);
      if (res.errors && res.errors.length > 0) {
        setError(`Imported ${res.addedCount} students, but had issues: ${res.errors.join('; ')}`);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bulk Import Students</h2>
              <p className="text-xs text-slate-500">Paste student records from Excel, Sheets, or CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Paste CSV or Tab-Delimited Data
              </label>
              <span className="text-[11px] text-slate-400">
                Format: <code className="font-mono">ID, First, Last, Email, Phone</code>
              </span>
            </div>
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full font-mono text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-y"
              placeholder="STU-001, John, Doe, john@school.edu, 555-0101"
            />
          </div>

          {/* Parsed Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Parsed Preview ({previewList.length} students detected)
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              {previewList.length === 0 ? (
                <div className="p-4 text-center text-slate-400">No students detected yet.</div>
              ) : (
                previewList.map((s, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {s.student_id_number}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {s.first_name} {s.last_name}
                      </span>
                    </div>
                    <span className="text-slate-400 truncate max-w-[150px]">{s.email || '-'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || previewList.length === 0}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? 'Importing...' : `Import ${previewList.length} Students`}
          </button>
        </div>
      </div>
    </div>
  );
};
