import React, { useState } from 'react';
import { Teacher } from '../types';
import { useData } from '../context/DataContext';
import {
  FolderOpen,
  ExternalLink,
  Link2,
  CheckCircle2,
  Circle,
  Edit2,
  Check,
  X,
  Trash2,
  Search,
} from 'lucide-react';

interface AssignedTeacherDriveTaskListProps {
  teachersToList: Teacher[];
  roleLabel: 'Instructional Supervisor' | 'Mentor';
  accent?: 'maroon' | 'teal';
}

const normalizeDriveUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const AssignedTeacherDriveTaskList: React.FC<AssignedTeacherDriveTaskListProps> = ({
  teachersToList,
  roleLabel,
  accent = 'maroon',
}) => {
  const { updateTeacher } = useData();
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'linked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedNoticeId, setSavedNoticeId] = useState<string | null>(null);

  const linkedCount = teachersToList.filter((t) => Boolean(t.driveUrl && t.driveUrl.trim())).length;
  const totalCount = teachersToList.length;
  const completionPct = totalCount > 0 ? Math.round((linkedCount / totalCount) * 100) : 0;

  const filteredTeachers = teachersToList.filter((t) => {
    const hasLink = Boolean(t.driveUrl && t.driveUrl.trim());
    if (filterMode === 'pending' && hasLink) return false;
    if (filterMode === 'linked' && !hasLink) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        t.fullName.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q) ||
        t.position.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStartEdit = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setDraftUrl(teacher.driveUrl || '');
  };

  const handleSaveLink = (teacher: Teacher) => {
    const normalized = normalizeDriveUrl(draftUrl);
    updateTeacher(teacher.id, { driveUrl: normalized || undefined });
    setEditingTeacherId(null);
    setDraftUrl('');
    setSavedNoticeId(teacher.id);
    setTimeout(() => {
      setSavedNoticeId((prev) => (prev === teacher.id ? null : prev));
    }, 2200);
  };

  const handleClearLink = (teacher: Teacher) => {
    updateTeacher(teacher.id, { driveUrl: undefined });
    if (editingTeacherId === teacher.id) {
      setEditingTeacherId(null);
      setDraftUrl('');
    }
  };

  const isTeal = accent === 'teal';
  const headerBorderClass = isTeal ? 'border-teal-200 bg-teal-50/70' : 'border-amber-200 bg-rose-50/50';
  const iconBoxClass = isTeal
    ? 'bg-teal-700 text-white'
    : 'bg-[#701628] text-amber-300';
  const progressBarClass = isTeal ? 'bg-teal-600' : 'bg-[#701628]';
  const openBtnClass = isTeal
    ? 'bg-teal-700 hover:bg-teal-800 text-white'
    : 'bg-[#701628] hover:bg-[#580e1c] text-white';

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Header Strip */}
      <div className={`px-4 sm:px-5 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${headerBorderClass}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 shadow-xs ${iconBoxClass}`}>
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                Assigned Teachers — Google Drive Link Task List
              </h3>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  linkedCount === totalCount && totalCount > 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {linkedCount} / {totalCount} Teachers Linked ({completionPct}%)
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Encode or update each assigned teacher&apos;s Google Drive folder/file URL below so your {roleLabel} account can open their files directly in one click.
            </p>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter assigned teacher..."
              className="pl-8 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628] w-44 sm:w-48"
            />
          </div>
          <div className="flex items-center bg-white border border-stone-200 rounded-lg p-0.5 text-[11px] font-semibold">
            {(
              [
                { id: 'all', label: `All (${totalCount})` },
                { id: 'pending', label: `Needs Link (${totalCount - linkedCount})` },
                { id: 'linked', label: `Linked (${linkedCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filterMode === tab.id
                    ? isTeal
                      ? 'bg-teal-700 text-white font-bold'
                      : 'bg-[#701628] text-white font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Completion Progress Bar */}
      <div className="h-1.5 w-full bg-stone-100">
        <div
          className={`h-full transition-all duration-300 ${progressBarClass}`}
          style={{ width: `${completionPct}%` }}
        />
      </div>

      {/* Teacher Task Rows */}
      <div className="divide-y divide-stone-100">
        {teachersToList.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No teachers are currently assigned to your {roleLabel} account.
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-500">
            No assigned teachers match the selected filter.
          </div>
        ) : (
          filteredTeachers.map((teacher, idx) => {
            const hasLink = Boolean(teacher.driveUrl && teacher.driveUrl.trim());
            const isEditing = editingTeacherId === teacher.id;
            const justSaved = savedNoticeId === teacher.id;

            return (
              <div
                key={teacher.id}
                className={`px-4 sm:px-5 py-3.5 transition-colors ${
                  hasLink ? 'bg-white hover:bg-stone-50/70' : 'bg-amber-50/25 hover:bg-amber-50/50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Teacher Identity & Task Status */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="pt-0.5 shrink-0" title={hasLink ? 'Google Drive link ready' : 'Pending Google Drive link'}>
                      {hasLink ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-stone-400">
                          #{idx + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-stone-900">
                          {teacher.fullName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            hasLink
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {hasLink ? 'Drive Linked' : 'Needs Drive Link'}
                        </span>
                        {justSaved && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            ✓ Saved
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {teacher.position} · {teacher.department} ·{' '}
                        <span className="font-semibold text-stone-700">{teacher.subject || 'General'}</span>
                      </div>

                      {hasLink && !isEditing && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500 max-w-xl">
                          <Link2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate font-mono text-[10px] text-stone-600">
                            {teacher.driveUrl}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action / Inline URL Editor */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 pl-8 lg:pl-0">
                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveLink(teacher);
                        }}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto"
                      >
                        <input
                          type="text"
                          value={draftUrl}
                          onChange={(e) => setDraftUrl(e.target.value)}
                          placeholder="Paste Google Drive folder or file URL (https://drive.google.com/...)"
                          autoFocus
                          className="w-full sm:w-72 md:w-80 px-3 py-1.5 text-xs font-mono border border-stone-300 rounded-lg bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="submit"
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs cursor-pointer ${openBtnClass}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Link</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeacherId(null);
                              setDraftUrl('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {hasLink && (
                          <a
                            href={normalizeDriveUrl(teacher.driveUrl || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors ${openBtnClass}`}
                            title={`Open ${teacher.fullName}'s Google Drive file/folder`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Google Drive File</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(teacher)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                            hasLink
                              ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                              : isTeal
                              ? 'border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100'
                              : 'border-[#701628]/30 bg-rose-50 text-[#701628] hover:bg-rose-100'
                          }`}
                        >
                          {hasLink ? <Edit2 className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                          <span>{hasLink ? 'Edit Link' : 'Add Google Drive Link'}</span>
                        </button>
                        {hasLink && (
                          <button
                            type="button"
                            onClick={() => handleClearLink(teacher)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove Google Drive link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
