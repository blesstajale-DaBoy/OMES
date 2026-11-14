import React from 'react';
import { User, Teacher, Supervisor, Mentor, SupervisionCategory } from '../types';
import { UserCheck, Users, ShieldCheck, BookMarked } from 'lucide-react';

export interface ScopedRecordLike {
  teacherId?: string;
  teacherName?: string;
  supervisorId?: string;
  supervisorName?: string;
  mentorId?: string;
  mentorName?: string;
  evaluatorRole?: 'admin' | 'supervisor' | 'mentor' | string;
}

export const MENTOR_ALLOWED_CATEGORIES: SupervisionCategory[] = [
  'lesson-plan',
  'assessment',
  'ims-lms',
];

export function isMentorAllowedCategory(cat?: SupervisionCategory | string): boolean {
  if (!cat) return false;
  return (MENTOR_ALLOWED_CATEGORIES as string[]).includes(cat);
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
 * Resolves the Teacher profile associated with the currently logged-in Teacher user.
 */
export function resolveActiveTeacherForUser(
  currentUser: User | null,
  teachers: Teacher[]
): Teacher | undefined {
  if (!currentUser || currentUser.role !== 'teacher') return undefined;
  const normName = currentUser.fullName.trim().toLowerCase();
  return teachers.find(
    (t) =>
      t.id === (currentUser.teacherId || currentUser.id) ||
      t.fullName.trim().toLowerCase() === normName
  );
}

/**
 * Resolves the Instructional Supervisor who evaluated/monitored a given record.
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
 * Resolves the Mentor associated with a given record using mentorId, mentorName, or the teacher's assignedMentorId.
 */
export function resolveRecordMentor(
  record: ScopedRecordLike,
  teachers: Teacher[],
  mentors: Mentor[] = []
): Mentor | undefined {
  const teacher = resolveRecordTeacher(record, teachers);
  const normMentorName = (record.mentorName || '').trim().toLowerCase();

  const explicitMentor = mentors.find(
    (m) =>
      (record.mentorId && m.id === record.mentorId) ||
      (normMentorName && m.fullName.trim().toLowerCase() === normMentorName)
  );

  const assignedMentor = teacher
    ? mentors.find(
        (m) =>
          m.id === teacher.assignedMentorId ||
          (m.assignedTeacherIds && m.assignedTeacherIds.includes(teacher.id))
      )
    : undefined;

  return explicitMentor || assignedMentor;
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
 * - For Administrator / Mentor: returns undefined.
 */
export function resolveActiveSupervisorForUser(
  currentUser: User | null,
  teachers: Teacher[],
  supervisors: Supervisor[]
): Supervisor | undefined {
  if (!currentUser) return undefined;
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
    const teacher = resolveActiveTeacherForUser(currentUser, teachers);
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
 * Resolves the Mentor associated with the currently logged-in user:
 * - For a Mentor account: returns their own Mentor profile.
 * - For a Teacher account: returns the Mentor assigned to this teacher.
 */
export function resolveActiveMentorForUser(
  currentUser: User | null,
  teachers: Teacher[],
  mentors: Mentor[] = []
): Mentor | undefined {
  if (!currentUser) return undefined;
  if (currentUser.role === 'mentor') {
    const normName = currentUser.fullName.trim().toLowerCase();
    return mentors.find(
      (m) =>
        m.id === currentUser.mentorId ||
        m.id === currentUser.id ||
        m.fullName.trim().toLowerCase() === normName
    );
  }

  if (currentUser.role === 'teacher') {
    const teacher = resolveActiveTeacherForUser(currentUser, teachers);
    if (teacher) {
      return mentors.find(
        (m) =>
          m.id === teacher.assignedMentorId ||
          (m.assignedTeacherIds && m.assignedTeacherIds.includes(teacher.id))
      );
    }
  }

  return undefined;
}

/**
 * Strict role-based privacy & supervision scoping:
 * - Administrator ('admin'): Sees all records across all Supervisors, Mentors, and Teachers (unless filtered by selectedSupervisorFilterId).
 * - Instructional Supervisor ('supervisor'): Sees ONLY records for teachers monitored & evaluated by this Instructional Supervisor.
 * - Mentor ('mentor'): Sees ONLY records for teachers assigned to this Mentor (within Mentor domains: Lesson Plan, Assessment, IMs & LMs).
 * - Teacher ('teacher'): Strict privacy — sees ONLY their own personal evaluation & PMCF/FAR records. Never sees other teachers' records or reports.
 */
export function matchesRoleSupervisionScope(
  record: ScopedRecordLike,
  currentUser: User | null,
  teachers: Teacher[],
  supervisors: Supervisor[],
  selectedSupervisorFilterId: string = 'All',
  mentors: Mentor[] = []
): boolean {
  if (!currentUser) return false;

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
    if (!currentSup) return false;
    return (
      recordSup?.id === currentSup.id ||
      assignedSup?.id === currentSup.id
    );
  }

  if (currentUser.role === 'mentor') {
    const currentMentor = resolveActiveMentorForUser(currentUser, teachers, mentors);
    if (!currentMentor) return false;
    const recordMentor = resolveRecordMentor(record, teachers, mentors);
    const assignedToMentor =
      (recordTeacher &&
        (recordTeacher.assignedMentorId === currentMentor.id ||
          (currentMentor.assignedTeacherIds || []).includes(recordTeacher.id))) ||
      (record.teacherId && (currentMentor.assignedTeacherIds || []).includes(record.teacherId));

    return Boolean(recordMentor?.id === currentMentor.id || assignedToMentor);
  }

  if (currentUser.role === 'teacher') {
    const normTeacherName = currentUser.fullName.trim().toLowerCase();
    const currentTeacher = resolveActiveTeacherForUser(currentUser, teachers);

    const isDirectTeacherMatch =
      (currentTeacher &&
        (record.teacherId === currentTeacher.id ||
          recordTeacher?.id === currentTeacher.id)) ||
      (record.teacherName || '').trim().toLowerCase() === normTeacherName;

    return Boolean(isDirectTeacherMatch);
  }

  return false;
}

/**
 * Returns the list of Teachers scoped to the current user for modal dropdowns.
 * - Admin: All teachers
 * - Supervisor: Only assigned teachers
 * - Mentor: Only assigned mentee teachers
 * - Teacher: Only self
 */
export function getScopedTeachersForModal(
  currentUser: User | null,
  teachers: Teacher[],
  supervisors: Supervisor[],
  mentors: Mentor[] = []
): Teacher[] {
  if (!currentUser) return [];
  if (currentUser.role === 'admin') {
    return teachers;
  }

  if (currentUser.role === 'teacher') {
    const currentTeacher = resolveActiveTeacherForUser(currentUser, teachers);
    return currentTeacher ? [currentTeacher] : [];
  }

  if (currentUser.role === 'mentor') {
    const activeMentor = resolveActiveMentorForUser(currentUser, teachers, mentors);
    if (!activeMentor) return [];
    return teachers.filter(
      (t) =>
        t.assignedMentorId === activeMentor.id ||
        (activeMentor.assignedTeacherIds && activeMentor.assignedTeacherIds.includes(t.id))
    );
  }

  const activeSup = resolveActiveSupervisorForUser(currentUser, teachers, supervisors);
  if (!activeSup) return [];

  return teachers.filter(
    (t) =>
      t.assignedSupervisorId === activeSup.id ||
      (activeSup.assignedTeacherIds && activeSup.assignedTeacherIds.includes(t.id))
  );
}

interface SupervisionScopeBannerProps {
  selectedSupervisorFilterId?: string;
  onChangeSupervisorFilterId?: (supId: string) => void;
  currentUser: User | null;
  teachers: Teacher[];
  supervisors: Supervisor[];
  mentors?: Mentor[];
  moduleLabel?: string;
}

export const SupervisionScopeBanner: React.FC<SupervisionScopeBannerProps> = ({
  selectedSupervisorFilterId = 'All',
  onChangeSupervisorFilterId,
  currentUser,
  teachers,
  supervisors,
  mentors = [],
  moduleLabel = 'Supervisory Output Tables',
}) => {
  if (!currentUser) return null;

  const activeSup = resolveActiveSupervisorForUser(currentUser, teachers, supervisors);
  const activeMentor = resolveActiveMentorForUser(currentUser, teachers, mentors);

  const assignedSupTeachers = activeSup
    ? teachers.filter(
        (t) =>
          t.assignedSupervisorId === activeSup.id ||
          (activeSup.assignedTeacherIds && activeSup.assignedTeacherIds.includes(t.id))
      )
    : [];

  const assignedMentorTeachers = activeMentor
    ? teachers.filter(
        (t) =>
          t.assignedMentorId === activeMentor.id ||
          (activeMentor.assignedTeacherIds && activeMentor.assignedTeacherIds.includes(t.id))
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
                Instructional Supervisor Private Scope
              </span>
              <span className="text-xs font-bold text-stone-900">
                {activeSup.fullName} ({activeSup.position} · {activeSup.department})
              </span>
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Displaying only {moduleLabel.toLowerCase()} for teachers monitored and evaluated by{' '}
              <strong className="text-[#701628]">{activeSup.fullName}</strong>:{' '}
              <span className="font-semibold text-stone-800">
                {assignedSupTeachers.map((t) => t.fullName).join(', ') || 'No Assigned Teachers'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role === 'mentor' && activeMentor) {
    return (
      <div className="bg-violet-50/90 border border-violet-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-lg bg-violet-800 text-amber-200 shrink-0">
            <BookMarked className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-800 text-white">
                Mentor Account — Private Scope
              </span>
              <span className="text-xs font-bold text-stone-900">
                {activeMentor.fullName} ({activeMentor.position} · {activeMentor.department})
              </span>
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Authorized Domains: <strong>Lesson Plans</strong>, <strong>Formative &amp; Summative Assessments</strong>, and{' '}
              <strong>IMs &amp; LMs</strong>. Assigned Mentees:{' '}
              <span className="font-semibold text-violet-950">
                {assignedMentorTeachers.map((t) => t.fullName).join(', ') || 'No Assigned Teachers'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role === 'teacher') {
    return (
      <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-800 text-amber-200 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-800 text-white">
                Teacher Private Account Scope
              </span>
              {activeSup && (
                <span className="text-xs font-bold text-stone-900">
                  Instructional Supervisor: {activeSup.fullName}
                </span>
              )}
              {activeMentor && (
                <span className="text-xs font-bold text-violet-900">
                  · Mentor: {activeMentor.fullName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Signed in as <strong className="text-stone-900">{currentUser.fullName}</strong>. For strict
              data privacy, only your own evaluations and generated PMCF / FAR reports are visible here.
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
          Administrator Consolidation — Filter by Instructional Supervisor:
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
            All Supervisors &amp; Mentors ({supervisors.length})
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
