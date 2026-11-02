import React from 'react';
import { User, Teacher, Supervisor } from '../types';
import { UserCheck, Users, ShieldCheck } from 'lucide-react';

export interface ScopedRecordLike {
  teacherId?: string;
  teacherName?: string;
  supervisorId?: string;
  supervisorName?: string;
}

/**
 * Resolves the Teacher object for a given record using teacherId or teacherName.
 */
export function resolveRecordTeacher(
  record: ScopedRecordLike,
  teachers: Teacher[]
): Teacher | undefined {
  const normName = (record.teacherName || '').trim().toLowerCase();
  return teachers.find(
    (t) =>
      (record.teacherId && t.id === record.teacherId) ||
      (normName && t.fullName.trim().toLowerCase() === normName)
  );
}

/**
 * Resolves the Instructional Supervisor who evaluated/monitored a given record.
 * Checks explicit supervisorId / supervisorName on the record first (if matching a registered Supervisor),
 * and falls back to the Teacher's assignedSupervisorId.
 */
export function resolveRecordSupervisor(
  record: ScopedRecordLike,
  teachers: Teacher[],
  supervisors: Supervisor[]
): Supervisor | undefined {
  const teacher = resolveRecordTeacher(record, teachers);
  const normSupName = (record.supervisorName || '').trim().toLowerCase();

  const explicitSupervisor = supervisors.find(
    (s) =>
      (record.supervisorId && s.id === record.supervisorId) ||
      (normSupName && s.fullName.trim().toLowerCase() === normSupName)
  );

  const assignedSupervisor = teacher
    ? supervisors.find(
        (s) =>
          s.id === teacher.assignedSupervisorId ||
          (s.assignedTeacherIds && s.assignedTeacherIds.includes(teacher.id))
      )
    : undefined;

  // If the teacher is a Master Teacher assigned to the School Principal, prefer assignedSupervisor if record had legacy sup-3
  if (
    teacher &&
    teacher.position.toLowerCase().includes('master teacher') &&
    assignedSupervisor
  ) {
    return explicitSupervisor?.id === 'sup-principal' ? explicitSupervisor : assignedSupervisor;
  }

  return explicitSupervisor || assignedSupervisor;
}

/**
 * Returns the display name of the Instructional Supervisor who evaluated/monitored the record.
 */
export function resolveRecordSupervisorName(
  record: ScopedRecordLike,
  teachers: Teacher[],
  supervisors: Supervisor[]
): string {
  const sup = resolveRecordSupervisor(record, teachers, supervisors);
  if (sup) return sup.fullName;
  if (record.supervisorName && record.supervisorName !== 'Administrator') {
    return record.supervisorName;
  }
  return 'Assigned Instructional Supervisor';
}

/**
 * Resolves the Instructional Supervisor associated with the currently logged-in user:
 * - For an Instructional Supervisor account: returns their own Supervisor profile.
 * - For a Teacher account: returns the Instructional Supervisor to whom the teacher belongs.
 * - For Administrator: returns undefined (Administrator views all supervisors).
 */
export function resolveActiveSupervisorForUser(
  currentUser: User,
  teachers: Teacher[],
  supervisors: Supervisor[]
): Supervisor | undefined {
  if (currentUser.role === 'supervisor') {
    const normName = currentUser.fullName.trim().toLowerCase();
    return supervisors.find(
      (s) =>
        s.id === currentUser.supervisorId ||
        s.id === currentUser.id ||
        s.fullName.trim().toLowerCase() === normName
    );
  }

  if (currentUser.role === 'teacher') {
    const normName = currentUser.fullName.trim().toLowerCase();
    const teacher = teachers.find(
      (t) =>
        t.id === currentUser.id ||
        t.fullName.trim().toLowerCase() === normName
    );
    if (teacher) {
      return supervisors.find(
        (s) =>
          s.id === teacher.assignedSupervisorId ||
          (s.assignedTeacherIds && s.assignedTeacherIds.includes(teacher.id))
      );
    }
  }

  return undefined;
}

/**
 * Determines whether a table row/record should be displayed for the currently logged-in user:
 * - Administrator ('admin'): Sees all records (or filters by selectedSupervisorFilterId if specified).
 * - Instructional Supervisor ('supervisor'): Sees ONLY the records of teachers monitored & evaluated by this Instructional Supervisor.
 * - Teacher ('teacher'): Sees the output table of the Instructional Supervisor that the teacher belongs to (and any record where this teacher was evaluated).
 */
export function matchesRoleSupervisionScope(
  record: ScopedRecordLike,
  currentUser: User,
  teachers: Teacher[],
  supervisors: Supervisor[],
  selectedSupervisorFilterId: string = 'All'
): boolean {
  const recordSup = resolveRecordSupervisor(record, teachers, supervisors);
  const recordTeacher = resolveRecordTeacher(record, teachers);
  const assignedSup = recordTeacher
    ? supervisors.find(
        (s) =>
          s.id === recordTeacher.assignedSupervisorId ||
          (s.assignedTeacherIds && s.assignedTeacherIds.includes(recordTeacher.id))
      )
    : undefined;

  if (selectedSupervisorFilterId && selectedSupervisorFilterId !== 'All') {
    const matchesFilter =
      recordSup?.id === selectedSupervisorFilterId ||
      assignedSup?.id === selectedSupervisorFilterId;
    if (!matchesFilter) return false;
  }

  if (currentUser.role === 'admin') {
    return true;
  }

  if (currentUser.role === 'supervisor') {
    const currentSup = resolveActiveSupervisorForUser(currentUser, teachers, supervisors);
    if (!currentSup) return true;
    return (
      recordSup?.id === currentSup.id ||
      (!recordSup && assignedSup?.id === currentSup.id)
    );
  }

  if (currentUser.role === 'teacher') {
    const normTeacherName = currentUser.fullName.trim().toLowerCase();
    const currentTeacher = teachers.find(
      (t) =>
        t.id === currentUser.id ||
        t.fullName.trim().toLowerCase() === normTeacherName
    );
    const teacherSup = resolveActiveSupervisorForUser(currentUser, teachers, supervisors);

    const isDirectTeacherMatch =
      (currentTeacher &&
        (record.teacherId === currentTeacher.id ||
          recordTeacher?.id === currentTeacher.id)) ||
      (record.teacherName || '').trim().toLowerCase() === normTeacherName;

    const isSameSupervisorGroup =
      Boolean(teacherSup) &&
      (recordSup?.id === teacherSup?.id || assignedSup?.id === teacherSup?.id);

    return Boolean(isDirectTeacherMatch || isSameSupervisorGroup);
  }

  return true;
}

/**
 * Returns the list of Teachers scoped to the current user's Instructional Supervisor for modal dropdowns.
 */
export function getScopedTeachersForModal(
  currentUser: User,
  teachers: Teacher[],
  supervisors: Supervisor[]
): Teacher[] {
  if (currentUser.role === 'admin') {
    return teachers;
  }

  const activeSup = resolveActiveSupervisorForUser(currentUser, teachers, supervisors);
  if (!activeSup) return teachers;

  const scoped = teachers.filter(
    (t) =>
      t.assignedSupervisorId === activeSup.id ||
      (activeSup.assignedTeacherIds && activeSup.assignedTeacherIds.includes(t.id))
  );

  if (currentUser.role === 'teacher') {
    const normName = currentUser.fullName.trim().toLowerCase();
    const sorted = [...scoped].sort((a, b) => {
      const aIsSelf = a.id === currentUser.id || a.fullName.trim().toLowerCase() === normName;
      const bIsSelf = b.id === currentUser.id || b.fullName.trim().toLowerCase() === normName;
      if (aIsSelf && !bIsSelf) return -1;
      if (!aIsSelf && bIsSelf) return 1;
      return 0;
    });
    return sorted.length > 0 ? sorted : teachers;
  }

  return scoped.length > 0 ? scoped : teachers;
}

interface SupervisionScopeBannerProps {
  selectedSupervisorFilterId?: string;
  onChangeSupervisorFilterId?: (supId: string) => void;
  currentUser: User;
  teachers: Teacher[];
  supervisors: Supervisor[];
  moduleLabel?: string;
}

export const SupervisionScopeBanner: React.FC<SupervisionScopeBannerProps> = ({
  selectedSupervisorFilterId = 'All',
  onChangeSupervisorFilterId,
  currentUser,
  teachers,
  supervisors,
  moduleLabel = 'Supervisory Output Tables',
}) => {
  const activeSup = resolveActiveSupervisorForUser(currentUser, teachers, supervisors);
  const assignedTeachers = activeSup
    ? teachers.filter(
        (t) =>
          t.assignedSupervisorId === activeSup.id ||
          (activeSup.assignedTeacherIds && activeSup.assignedTeacherIds.includes(t.id))
      )
    : [];

  if (currentUser.role === 'supervisor' && activeSup) {
    return (
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#701628] text-amber-200 shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#701628] text-white">
                Instructional Supervisor Output Scope
              </span>
              <span className="text-xs font-bold text-stone-900">
                {activeSup.fullName} ({activeSup.position} · {activeSup.department})
              </span>
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Displaying only {moduleLabel.toLowerCase()} for teachers monitored and evaluated by{' '}
              <strong className="text-[#701628]">{activeSup.fullName}</strong>:{' '}
              <span className="font-semibold text-stone-800">
                {assignedTeachers.map((t) => t.fullName).join(', ') || 'Assigned Faculty'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role === 'teacher' && activeSup) {
    return (
      <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-800 text-amber-200 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-800 text-white">
                Teacher Account — Instructional Supervisor Group
              </span>
              <span className="text-xs font-bold text-stone-900">
                Evaluated &amp; Monitored by: {activeSup.fullName} ({activeSup.position})
              </span>
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Signed in as <strong className="text-stone-900">{currentUser.fullName}</strong> ·
              Displaying output tables under your assigned Instructional Supervisor{' '}
              <strong className="text-emerald-900">{activeSup.fullName}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#701628] shrink-0" />
        <span className="text-xs font-bold text-stone-800">
          Display Output by Instructional Supervisor:
        </span>
      </div>
      {onChangeSupervisorFilterId && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChangeSupervisorFilterId('All')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
              selectedSupervisorFilterId === 'All'
                ? 'bg-[#701628] text-white shadow-2xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            All Instructional Supervisors ({supervisors.length})
          </button>
          {supervisors.map((sup) => (
            <button
              key={sup.id}
              type="button"
              onClick={() => onChangeSupervisorFilterId(sup.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                selectedSupervisorFilterId === sup.id
                  ? 'bg-[#701628] text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              {sup.fullName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
