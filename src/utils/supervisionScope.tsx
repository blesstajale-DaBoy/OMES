import React, { useState, useMemo } from 'react';
import { User, Teacher, Supervisor, Mentor, SupervisionCategory } from '../types';
import {
  UserCheck,
  Users,
  ShieldCheck,
  BookMarked,
  ClipboardCheck,
  FileSpreadsheet,
  Eye,
  Zap,
  FileCheck2,
  BookOpen,
  Layers,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import { useData } from '../context/DataContext';

export type SupervisionTerm = 'Term 1' | 'Term 2' | 'Term 3';
export const SUPERVISION_TERMS: SupervisionTerm[] = ['Term 1', 'Term 2', 'Term 3'];

/**
 * Normalizes any record's quarterTerm / term / date into 'Term 1' | 'Term 2' | 'Term 3'
 */
export function normalizeRecordTerm(
  rawTerm?: string,
  rawDate?: string
): SupervisionTerm {
  const t = (rawTerm || '').trim().toUpperCase();
  if (t.includes('TERM 2') || t === 'CO2' || t.includes('2ND') || t === 'Q2') {
    return 'Term 2';
  }
  if (t.includes('TERM 3') || t === 'CO3' || t.includes('3RD') || t.includes('4TH') || t === 'Q3' || t === 'Q4') {
    return 'Term 3';
  }
  if (t.includes('TERM 1') || t === 'CO1' || t.includes('1ST') || t === 'Q1') {
    return 'Term 1';
  }
  if (rawDate) {
    const parts = rawDate.split('-');
    if (parts.length >= 2) {
      const month = parseInt(parts[1], 10);
      if (month === 11 || month === 12 || month === 1) return 'Term 2';
      if (month >= 2 && month <= 5) return 'Term 3';
      return 'Term 1';
    }
  }
  return 'Term 1';
}

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

interface EvaluationToolCoverageItem {
  id: string;
  label: string;
  shortLabel: string;
  mentorAllowed: boolean;
  accentColor: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
  evaluatedTeachers: Teacher[];
  missingTeachers: Teacher[];
  totalAssigned: number;
  percentage: number;
}

interface SupervisionTermCoverageTrackerProps {
  currentUser: User;
  assignedTeachersPool: Teacher[];
  scopeOwnerLabel: string;
  scopeRoleBadge: string;
}

export const SupervisionTermCoverageTracker: React.FC<SupervisionTermCoverageTrackerProps> = ({
  currentUser,
  assignedTeachersPool,
  scopeOwnerLabel,
  scopeRoleBadge,
}) => {
  const {
    observations,
    lessonPlans,
    fleetingObservations,
    formativeRecords,
    summativeRecords,
    assessments,
    imsQA,
  } = useData();

  const [selectedTerm, setSelectedTerm] = useState<SupervisionTerm>('Term 1');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [expandedSubmittedToolId, setExpandedSubmittedToolId] = useState<string | null>(null);

  const isMentor = currentUser.role === 'mentor';

  const matchesTeacher = (
    teacher: Teacher,
    record: { teacherId?: string; teacherName?: string }
  ): boolean => {
    if (record.teacherId && record.teacherId === teacher.id) return true;
    const recName = (record.teacherName || '').trim().toLowerCase();
    const tName = teacher.fullName.trim().toLowerCase();
    return Boolean(recName && recName === tName);
  };

  // Compute tool coverage boxes for the selected term
  const toolCoverageByTerm = useMemo(() => {
    const computeForTerm = (term: SupervisionTerm): EvaluationToolCoverageItem[] => {
      const totalAssigned = assignedTeachersPool.length;

      // 1. COT-PMES (observations where evaluationType !== 'classroom' and status !== 'Scheduled')
      const cotRecords = observations.filter(
        (obs) =>
          obs.evaluationType !== 'classroom' &&
          obs.status !== 'Scheduled' &&
          normalizeRecordTerm(obs.quarterTerm, obs.date) === term
      );

      // 2. Lesson Plans
      const lpRecords = lessonPlans.filter(
        (lp) => normalizeRecordTerm(lp.quarterTerm, lp.dateChecked || lp.dateSubmitted) === term
      );

      // 3. Classroom Observation (observations where evaluationType === 'classroom' and status !== 'Scheduled')
      const classroomObsRecords = observations.filter(
        (obs) =>
          obs.evaluationType === 'classroom' &&
          obs.status !== 'Scheduled' &&
          normalizeRecordTerm(obs.quarterTerm, obs.date) === term
      );

      // 4. Fleeting Observation
      const fleetingRecords = fleetingObservations.filter(
        (visit) => normalizeRecordTerm(visit.quarterTerm, visit.date) === term
      );

      // 5. Formative Assessment
      const formativeTermRecords = formativeRecords.filter(
        (rec) => normalizeRecordTerm(rec.term, rec.date) === term
      );

      // 6. Summative Assessment (summativeRecords + quarterly assessments)
      const summativeTermRecords = [
        ...summativeRecords.filter((rec) => normalizeRecordTerm(rec.term, rec.date) === term),
        ...assessments.filter((a) => normalizeRecordTerm(a.quarterTerm) === term),
      ];

      // 7. Instructional Materials (IMs)
      const imRecords = imsQA.filter((im) => {
        const isIM =
          im.materialKind === 'IM' ||
          (!im.materialKind &&
            im.type !== "Learner's Material (LM)" &&
            im.type !== 'Self-Learning Module (SLM)');
        return isIM && normalizeRecordTerm(im.quarterTerm, im.dateSubmitted) === term;
      });

      // 8. Learners' Materials (LMs)
      const lmRecords = imsQA.filter((im) => {
        const isLM =
          im.materialKind === 'LM' ||
          (!im.materialKind &&
            (im.type === "Learner's Material (LM)" ||
              im.type === 'Self-Learning Module (SLM)'));
        return isLM && normalizeRecordTerm(im.quarterTerm, im.dateSubmitted) === term;
      });

      const buildItem = (
        id: string,
        label: string,
        shortLabel: string,
        mentorAllowed: boolean,
        accentColor: string,
        badgeBg: string,
        icon: React.ComponentType<{ className?: string }>,
        records: Array<{ teacherId?: string; teacherName?: string }>
      ): EvaluationToolCoverageItem => {
        const evaluatedTeachers: Teacher[] = [];
        const missingTeachers: Teacher[] = [];

        assignedTeachersPool.forEach((teacher) => {
          const hasEvaluation = records.some((rec) => matchesTeacher(teacher, rec));
          if (hasEvaluation) {
            evaluatedTeachers.push(teacher);
          } else {
            missingTeachers.push(teacher);
          }
        });

        const percentage =
          totalAssigned > 0
            ? Number(((evaluatedTeachers.length / totalAssigned) * 100).toFixed(1))
            : 0;

        return {
          id,
          label,
          shortLabel,
          mentorAllowed,
          accentColor,
          badgeBg,
          icon,
          evaluatedTeachers,
          missingTeachers,
          totalAssigned,
          percentage,
        };
      };

      const allTools: EvaluationToolCoverageItem[] = [
        buildItem(
          'cot-pmes',
          'COT-PMES',
          'COT-PMES Observation',
          false,
          'bg-[#701628]',
          'bg-rose-50 text-[#701628] border-rose-200',
          ClipboardCheck,
          cotRecords
        ),
        buildItem(
          'lesson-plans',
          'Lesson Plans',
          'DLL / DLP Review',
          true,
          'bg-amber-600',
          'bg-amber-50 text-amber-900 border-amber-200',
          FileSpreadsheet,
          lpRecords
        ),
        buildItem(
          'classroom-obs',
          'Classroom Observation',
          'STAR Classroom Observation',
          false,
          'bg-blue-700',
          'bg-blue-50 text-blue-900 border-blue-200',
          Eye,
          classroomObsRecords
        ),
        buildItem(
          'fleeting-obs',
          'Fleeting Observation',
          '5–15 Min Walkthrough',
          false,
          'bg-teal-700',
          'bg-teal-50 text-teal-900 border-teal-200',
          Zap,
          fleetingRecords
        ),
        buildItem(
          'formative-assessment',
          'Formative Assessment',
          'Assessment (Formative)',
          true,
          'bg-emerald-700',
          'bg-emerald-50 text-emerald-900 border-emerald-200',
          FileCheck2,
          formativeTermRecords
        ),
        buildItem(
          'summative-assessment',
          'Summative Assessment',
          'Assessment (Summative)',
          true,
          'bg-indigo-700',
          'bg-indigo-50 text-indigo-900 border-indigo-200',
          FileCheck2,
          summativeTermRecords
        ),
        buildItem(
          'ims',
          'Instructional Materials (IMs)',
          'Teacher-Used IMs QA',
          true,
          'bg-violet-700',
          'bg-violet-50 text-violet-900 border-violet-200',
          BookOpen,
          imRecords
        ),
        buildItem(
          'lms',
          "Learners' Materials (LMs)",
          'Student SLMs / LAS QA',
          true,
          'bg-fuchsia-700',
          'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200',
          Layers,
          lmRecords
        ),
      ];

      return isMentor ? allTools.filter((t) => t.mentorAllowed) : allTools;
    };

    return {
      'Term 1': computeForTerm('Term 1'),
      'Term 2': computeForTerm('Term 2'),
      'Term 3': computeForTerm('Term 3'),
    };
  }, [
    assignedTeachersPool,
    observations,
    lessonPlans,
    fleetingObservations,
    formativeRecords,
    summativeRecords,
    assessments,
    imsQA,
    isMentor,
  ]);

  const activeTools = toolCoverageByTerm[selectedTerm];

  // Overall term summary across displayed evaluation tools
  const termAggregate = useMemo(() => {
    const calculateForTerm = (term: SupervisionTerm) => {
      const list = toolCoverageByTerm[term];
      const totalSlots = list.reduce((sum, item) => sum + item.totalAssigned, 0);
      const totalEvaluated = list.reduce(
        (sum, item) => sum + item.evaluatedTeachers.length,
        0
      );
      const pct = totalSlots > 0 ? Number(((totalEvaluated / totalSlots) * 100).toFixed(1)) : 0;
      return { totalSlots, totalEvaluated, pct };
    };
    return {
      'Term 1': calculateForTerm('Term 1'),
      'Term 2': calculateForTerm('Term 2'),
      'Term 3': calculateForTerm('Term 3'),
    };
  }, [toolCoverageByTerm]);

  return (
    <div className="mt-3 pt-3 border-t border-stone-200/80">
      {/* Header Row with Term 1 / Term 2 / Term 3 Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#701628] text-amber-200 text-[11px] font-extrabold uppercase tracking-wider shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span>Term Evaluation Coverage &amp; Submission Tracker</span>
          </span>
          <span className="text-xs font-bold text-stone-800">
            {scopeRoleBadge}: <span className="text-[#701628]">{scopeOwnerLabel}</span>
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-stone-200/80 text-stone-800 tabular-nums">
            {assignedTeachersPool.length} Assigned Teacher{assignedTeachersPool.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Term Tabs: Term 1, Term 2, Term 3 */}
          <div className="inline-flex items-center bg-stone-200/80 p-1 rounded-xl border border-stone-300/70">
            {SUPERVISION_TERMS.map((term) => {
              const isSelected = selectedTerm === term;
              const summary = termAggregate[term];
              return (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSelectedTerm(term)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
                    isSelected
                      ? 'bg-[#701628] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-white/60'
                  }`}
                >
                  <span>{term}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                      isSelected
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-stone-300/80 text-stone-700'
                    }`}
                  >
                    {summary.pct}%
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-[11px] font-bold transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Hide Boxes' : 'Show Boxes'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Evaluation Tool Boxes Grid for Selected Term */}
      {isExpanded && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeTools.map((tool) => {
            const Icon = tool.icon;
            const evaluatedCount = tool.evaluatedTeachers.length;
            const totalCount = tool.totalAssigned;
            const missingCount = tool.missingTeachers.length;
            const isAllComplete = totalCount > 0 && missingCount === 0;
            const isShowingSubmitted = expandedSubmittedToolId === tool.id;

            return (
              <div
                key={tool.id}
                className="bg-white rounded-xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Top Box Header & Metrics */}
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-2 rounded-lg text-white shrink-0 ${tool.accentColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-stone-900 leading-tight truncate">
                          {tool.label}
                        </div>
                        <div className="text-[10px] font-medium text-stone-500 truncate">
                          {tool.shortLabel}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-extrabold text-[#701628] shrink-0">
                      {selectedTerm}
                    </span>
                  </div>

                  {/* Count (e.g. "18 out of 19") + Percentage */}
                  <div className="bg-stone-50/90 border border-stone-200/80 rounded-lg px-3 py-2 flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-base font-extrabold text-stone-900 tabular-nums leading-none">
                        {evaluatedCount}{' '}
                        <span className="text-xs font-bold text-stone-500">out of</span>{' '}
                        {totalCount}
                      </div>
                      <div className="text-[10px] font-semibold text-stone-500 mt-1">
                        Teachers Evaluated ({selectedTerm})
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-base font-extrabold tabular-nums leading-none ${
                          isAllComplete
                            ? 'text-emerald-700'
                            : tool.percentage >= 50
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {tool.percentage}%
                      </div>
                      <div className="text-[10px] font-semibold text-stone-500 mt-1">
                        Completion
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isAllComplete
                          ? 'bg-emerald-600'
                          : tool.percentage >= 50
                          ? 'bg-amber-500'
                          : 'bg-[#701628]'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, tool.percentage))}%` }}
                    />
                  </div>
                </div>

                {/* Reveal Teachers Who Did Not Submit / Were Not Yet Evaluated */}
                <div className="px-3.5 py-2.5 bg-stone-50 border-t border-stone-200/80 text-[11px] space-y-1.5">
                  {totalCount === 0 ? (
                    <div className="text-stone-500 font-medium">
                      No teachers assigned to this scope.
                    </div>
                  ) : isAllComplete ? (
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>All {totalCount} assigned teachers evaluated in {selectedTerm}!</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-1 text-rose-800 font-extrabold">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>
                            {missingCount} Teacher{missingCount === 1 ? '' : 's'} Did Not Submit / Not Evaluated:
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1">
                        {tool.missingTeachers.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-100/90 text-rose-900 border border-rose-200 text-[10px] font-bold leading-snug"
                            title={`${t.fullName} (${t.position} · ${t.department}) — Not yet evaluated for ${tool.label} in ${selectedTerm}`}
                          >
                            {t.fullName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toggle to view Evaluated Teachers */}
                  {evaluatedCount > 0 && (
                    <div className="pt-1 border-t border-stone-200/60">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSubmittedToolId(
                            isShowingSubmitted ? null : tool.id
                          )
                        }
                        className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>
                          {isShowingSubmitted
                            ? `Hide ${evaluatedCount} Evaluated Teacher${evaluatedCount === 1 ? '' : 's'}`
                            : `View ${evaluatedCount} Evaluated Teacher${evaluatedCount === 1 ? '' : 's'}`}
                        </span>
                      </button>
                      {isShowingSubmitted && (
                        <div className="mt-1.5 max-h-24 overflow-y-auto pr-1 flex flex-wrap gap-1">
                          {tool.evaluatedTeachers.map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-900 border border-emerald-200 text-[10px] font-semibold"
                            >
                              {t.fullName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

        <SupervisionTermCoverageTracker
          currentUser={currentUser}
          assignedTeachersPool={assignedSupTeachers}
          scopeOwnerLabel={activeSup.fullName}
          scopeRoleBadge="Instructional Supervisor (IL)"
        />
      </div>
    );
  }

  if (currentUser.role === 'mentor' && activeMentor) {
    return (
      <div className="bg-violet-50/90 border border-violet-200 rounded-xl px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

        <SupervisionTermCoverageTracker
          currentUser={currentUser}
          assignedTeachersPool={assignedMentorTeachers}
          scopeOwnerLabel={activeMentor.fullName}
          scopeRoleBadge="Assigned Mentor"
        />
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

  // Administrator view: Filter by selectedSupervisorFilterId or All
  const selectedAdminSup =
    selectedSupervisorFilterId && selectedSupervisorFilterId !== 'All'
      ? supervisors.find((s) => s.id === selectedSupervisorFilterId)
      : undefined;

  const adminScopedTeachers = selectedAdminSup
    ? teachers.filter(
        (t) =>
          t.assignedSupervisorId === selectedAdminSup.id ||
          (selectedAdminSup.assignedTeacherIds &&
            selectedAdminSup.assignedTeacherIds.includes(t.id))
      )
    : teachers;

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

      <SupervisionTermCoverageTracker
        currentUser={currentUser}
        assignedTeachersPool={adminScopedTeachers}
        scopeOwnerLabel={
          selectedAdminSup
            ? `${selectedAdminSup.fullName} (${selectedAdminSup.department})`
            : 'All Assigned Instructional Supervisors & Mentors'
        }
        scopeRoleBadge={
          selectedAdminSup ? 'Filtered Supervisor Scope' : 'School-Wide Scope'
        }
      />
    </div>
  );
};

