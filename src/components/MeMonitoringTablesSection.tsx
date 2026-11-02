import React, { useState, useEffect, useMemo } from 'react';
import {
  ClassroomObservation,
  FleetingObservation,
  LessonPlanCheck,
  AssessmentRecord,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  RefreshCw,
  Send,
  CheckCircle2,
  Users,
  Layers,
  UserCheck,
  Clock,
  FileSpreadsheet,
  Eye,
  Edit3,
  Printer,
  Download,
  X,
  FileText,
} from 'lucide-react';

export type MonitoringTermKey = 'Term1' | 'Term2' | 'Term3';
export type MonitoringToolKey = 'classroom' | 'fleeting' | 'lessonPlan' | 'assessment';

interface IndicatorCount {
  e: string;
  ne: string;
}

export interface SupervisorToolReport<RowKey extends string | number = string> {
  teacherCount: number;
  notesOrRemarks: string;
  rows: Record<RowKey, IndicatorCount>;
  submittedToAdmin: boolean;
  submittedAt?: string;
  submittedByName?: string;
}

export interface SupervisorTermMonitoringData {
  classroom: SupervisorToolReport<number>;
  fleeting: SupervisorToolReport<string>;
  lessonPlan: SupervisorToolReport<string>;
  assessment: SupervisorToolReport<string>;
}

export type AllSupervisorsMonitoringStore = Record<
  string,
  Record<MonitoringTermKey, SupervisorTermMonitoringData>
>;

const STORAGE_KEY_V2 = 'bnhs_omes_me_supervisor_consolidated_v2';

export const CLASSROOM_TABLE_SECTIONS = [
  {
    sectionTitle: 'BEFORE CLASSROOM OBSERVATION',
    items: [
      {
        id: 1,
        indicator:
          'The ratee(teacher) and the rater (observer) agree on the schedule of classroom observations at least three (3) working days before the classroom observation',
        mov: 'Instructional Supervisory Plan with Classroom Observation schedule',
      },
      {
        id: 2,
        indicator:
          'Lesson plan of teachers to be observed is submitted to the observer at least two (2) days before the actual conduct of classroom observations',
        mov: 'Corrected DLP\n\nFAR or PMCF',
      },
      {
        id: 3,
        indicator:
          'A pre-observation conference is conducted to review the classroom observation tools and the list of classroom observable indicators',
        mov: 'FAR or PMCF\nDLP with annotations',
      },
      {
        id: 4,
        indicator:
          'Any concern or clarification raised by the ratees (teachers) or raters (observers) during the pre-observation conference is addressed',
        mov: 'Revised/ Annotated Lesson plan',
      },
    ],
  },
  {
    sectionTitle: 'ACTUAL CLASSROOM OBSERVATION',
    items: [
      {
        id: 5,
        indicator:
          'The teacher delivers the lesson following the lesson plan and adheres to the prescribed number of minutes per learning area.',
        mov: 'Classroom observation notes',
      },
      {
        id: 6,
        indicator:
          'The rater (observer) uses observation notes to record comments and observations on the teacher’s performance.',
        mov: 'Classroom observation notes',
      },
      {
        id: 7,
        indicator:
          'Instructional supervisors/master teachers (if available) observe the classroom observation process for mentoring and coaching activities.',
        mov: 'PMCF/ Observation Notes',
      },
    ],
  },
  {
    sectionTitle: 'POST CLASSROOM OBSERVATION',
    items: [
      {
        id: 8,
        indicator:
          'The raters rate the performance of teachers using the classroom observation tool appropriate to the level. (Proficient or Highly Proficient)',
        mov: 'Filled in Classroom Observation Tools',
      },
      {
        id: 9,
        indicator:
          'If there are multiple observers in secondary, only subject specialist rates the objective no. 1.',
        mov: 'Filled in Classroom Observation Tools',
      },
      {
        id: 10,
        indicator:
          'In case of multiple raters, the raters discuss the individual ratings and come up with a final rating.',
        mov: 'Inter-Rater Agreement Form',
      },
      {
        id: 11,
        indicator:
          'The rater (observer) conducts post observation conference with the ratee to discuss the experiences and reflect on the strengths and areas for improvement',
        mov: 'FAR or PMCF',
      },
      {
        id: 12,
        indicator: 'The post conference is conducted in a supportive and friendly environment',
        mov: 'FAR or PMCF',
      },
      {
        id: 13,
        indicator:
          'The rater (observer) provides mentoring and coaching activities to improve or enhance teachers’ performance.',
        mov: 'PMCF',
      },
    ],
  },
];

export const FLEETING_TABLE_ROWS = [
  {
    id: '1.1',
    focus: 'A. Learning Objectives & Content',
    indicator:
      'Learning objectives are clearly presented and aligned with the intended learning competency based on Budget of Work and delivered as planned',
  },
  {
    id: '1.2',
    focus: '',
    indicator:
      'Lesson content is accurate, relevant, and aligned with the prescribed curriculum and intended learning competencies.',
  },
  {
    id: '2.1',
    focus: 'B. Teaching Strategies',
    indicator:
      'Learner-centered and engaging instructional strategies aligned with the Instructional Design Framework (IDF) are evident.',
  },
  {
    id: '2.2',
    focus: '',
    indicator:
      'Differentiated instruction and active learner participation are evident throughout the lesson.',
  },
  {
    id: '3.1',
    focus: 'C. Assessment',
    indicator:
      'Assessment strategies are aligned with the learning objectives and integrated into the lesson.',
  },
  {
    id: '3.2',
    focus: '',
    indicator:
      'Effective questioning (including higher-order thinking questions) and constructive feedback are evident.',
  },
  {
    id: '4.1',
    focus: 'D. Learning Resources',
    indicator:
      'Appropriate learning resources, including ICT and instructional materials, are effectively utilized.',
  },
  {
    id: '4.2',
    focus: '',
    indicator:
      'Learning resources are aligned with the lesson objectives and enhance learner engagement and understanding.',
  },
  {
    id: '5.1',
    focus: 'D. Classroom Management',
    indicator: 'An orderly, safe, and conducive learning environment is maintained.',
  },
  {
    id: '5.2',
    focus: '',
    indicator:
      'Positive learner behavior, engagement, and adherence to classroom routines are evident.',
  },
];

export const LESSON_PLAN_TABLE_ROWS = [
  {
    id: 'A',
    checklistKey: 'melcAligned',
    focus:
      'A.Maintains a documented schedule or system for the regular checking of teachers’ lesson plans.',
    indicator: 'School Memorandum, DLP Checklist',
  },
  {
    id: 'B',
    checklistKey: 'clearObjectives',
    focus:
      'B. Inspects the adherence of lesson plan to ILAW (Intentions, Learning Experience, Assessment, Ways Forward) framework and ensure its constructive alignment.',
    indicator: 'FAR\nDLP Checklist',
  },
  {
    id: 'C',
    checklistKey: 'learningResourcesAdequate',
    focus:
      'C. Provides timely and constructive feedback, comments, and recommendations after lesson plan review.',
    indicator: 'Annotated lesson plans, PMCF',
  },
  {
    id: 'D',
    checklistKey: 'pedagogicalProceduresSequenced',
    focus:
      'D.Conducts coaching, mentoring, or technical assistance based on lesson plan review findings.',
    indicator: 'PMCF',
  },
  {
    id: 'E',
    checklistKey: 'formativeAssessmentIncluded',
    focus:
      'E. Monitors teachers’ compliance with the revisions and recommendations provided during lesson plan review.',
    indicator: 'Revised lesson plans, FAR',
  },
];

export const ASSESSMENT_TABLE_ROWS = [
  {
    id: 'A',
    focus:
      'A. Maintains a documented schedule or system for the regular checking of teachers’ formative and summative assessments.',
    indicator: 'School Memorandum, Assessment Checklist',
  },
  {
    id: 'B',
    focus:
      'B. Inspects the adherence of assessment tools to the Table of Specifications (TOS) and Bloom’s Cognitive Distribution and ensures constructive alignment.',
    indicator: 'TOS, Test Questionnaire\nAnswer Key',
  },
  {
    id: 'C',
    focus:
      'C. Provides timely and constructive feedback, comments, and recommendations after assessment and MPS review.',
    indicator: 'Annotated assessment tools, PMCF',
  },
  {
    id: 'D',
    focus:
      'D. Conducts coaching, mentoring, or technical assistance based on assessment and item analysis findings.',
    indicator: 'PMCF',
  },
  {
    id: 'E',
    focus:
      'E. Monitors teachers’ compliance with the revisions, item analysis, and remediation plans provided during assessment review.',
    indicator: 'Revised assessment tools, MPS Report, FAR',
  },
];

const createSupervisorTermDefault = (
  supervisorName: string,
  teacherCount: number,
  seedFleetingCounts: boolean
): SupervisorTermMonitoringData => {
  const classroomRows: Record<number, IndicatorCount> = {};
  for (let i = 1; i <= 13; i++) {
    classroomRows[i] = { e: '', ne: '' };
  }

  const fleetingRows: Record<string, IndicatorCount> = {};
  FLEETING_TABLE_ROWS.forEach((r) => {
    fleetingRows[r.id] = seedFleetingCounts
      ? { e: String(teacherCount), ne: '0' }
      : { e: String(teacherCount), ne: '0' };
  });

  const lessonPlanRows: Record<string, IndicatorCount> = {};
  LESSON_PLAN_TABLE_ROWS.forEach((r) => {
    lessonPlanRows[r.id] = { e: '', ne: '' };
  });

  const assessmentRows: Record<string, IndicatorCount> = {};
  ASSESSMENT_TABLE_ROWS.forEach((r) => {
    assessmentRows[r.id] = { e: '', ne: '' };
  });

  const defaultTimestamp = '2026-10-28 04:15 PM';

  return {
    classroom: {
      teacherCount,
      notesOrRemarks: '',
      rows: classroomRows,
      submittedToAdmin: true,
      submittedAt: defaultTimestamp,
      submittedByName: supervisorName,
    },
    fleeting: {
      teacherCount,
      notesOrRemarks: '',
      rows: fleetingRows,
      submittedToAdmin: true,
      submittedAt: defaultTimestamp,
      submittedByName: supervisorName,
    },
    lessonPlan: {
      teacherCount,
      notesOrRemarks: '',
      rows: lessonPlanRows,
      submittedToAdmin: true,
      submittedAt: defaultTimestamp,
      submittedByName: supervisorName,
    },
    assessment: {
      teacherCount,
      notesOrRemarks: '',
      rows: assessmentRows,
      submittedToAdmin: true,
      submittedAt: defaultTimestamp,
      submittedByName: supervisorName,
    },
  };
};

const computePct = (valStr: string | number, totalTeachers: number): string => {
  const num = typeof valStr === 'number' ? valStr : Number(valStr);
  if (valStr === '' || isNaN(num) || num <= 0 || totalTeachers <= 0) {
    return '0%';
  }
  const pct = Math.round((num / totalTeachers) * 100);
  return `${pct}%`;
};

interface MeMonitoringTablesSectionProps {
  observations: ClassroomObservation[];
  fleetingObservations: FleetingObservation[];
  lessonPlans: LessonPlanCheck[];
  assessments: AssessmentRecord[];
  onOpenClassroomModal?: () => void;
  onOpenFleetingModal?: () => void;
  onOpenLessonPlanModal?: () => void;
  onOpenAssessmentModal?: () => void;
}

export const MeMonitoringTablesSection: React.FC<MeMonitoringTablesSectionProps> = ({
  observations,
  fleetingObservations,
  lessonPlans,
  assessments,
}) => {
  const { currentUser, isAdmin, isSupervisor, isTeacher } = useAuth();
  const { supervisors, schoolProfile, addNotification, logAuditEvent } = useData();

  const [selectedTerm, setSelectedTerm] = useState<MonitoringTermKey>('Term1');
  const [activeToolFilter, setActiveToolFilter] = useState<'ALL' | MonitoringToolKey>('ALL');
  const [printingTool, setPrintingTool] = useState<MonitoringToolKey | null>(null);

  // View Mode:
  // - Admin views 'consolidated' (Consolidates all Instructional Supervisors' reports)
  // - Instructional Supervisor views 'supervisor' (Encodes & sends their report to Admin)
  const [viewMode, setViewMode] = useState<'consolidated' | 'supervisor'>(() =>
    isSupervisor ? 'supervisor' : 'consolidated'
  );

  // Selected Supervisor ID when in 'supervisor' encoding mode
  const defaultSupervisorId = useMemo(() => {
    if (currentUser.supervisorId && supervisors.some((s) => s.id === currentUser.supervisorId)) {
      return currentUser.supervisorId;
    }
    if (supervisors.some((s) => s.id === currentUser.id)) {
      return currentUser.id;
    }
    // Default to first departmental Instructional Supervisor (e.g., sup-1) or first supervisor
    return supervisors.find((s) => s.id === 'sup-1')?.id || supervisors[0]?.id || 'sup-1';
  }, [currentUser, supervisors]);

  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(defaultSupervisorId);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Sync viewMode and selectedSupervisorId when user switches account role in Header
  useEffect(() => {
    if (isSupervisor) {
      setViewMode('supervisor');
      if (currentUser.supervisorId) {
        setSelectedSupervisorId(currentUser.supervisorId);
      }
    } else {
      setViewMode('consolidated');
    }
  }, [isAdmin, isSupervisor, isTeacher, currentUser.supervisorId]);

  const triggerToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 4500);
  };

  // Default teacher counts per supervisor so the consolidated sum across the 4 supervisors equals 14
  const getDefaultTeacherCountForSupervisor = (supId: string, index: number): number => {
    if (supId === 'sup-principal') return 4;
    if (supId === 'sup-1') return 4;
    if (supId === 'sup-2') return 3;
    if (supId === 'sup-3') return 3;
    return index === 0 ? 4 : 3;
  };

  const buildInitialStore = (): AllSupervisorsMonitoringStore => {
    const store: AllSupervisorsMonitoringStore = {};
    supervisors.forEach((sup, idx) => {
      const tCount = getDefaultTeacherCountForSupervisor(sup.id, idx);
      store[sup.id] = {
        Term1: createSupervisorTermDefault(sup.fullName, tCount, false),
        Term2: createSupervisorTermDefault(sup.fullName, tCount, false),
        Term3: createSupervisorTermDefault(sup.fullName, tCount, true),
      };
    });
    return store;
  };

  const [supervisorStore, setSupervisorStore] = useState<AllSupervisorsMonitoringStore>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_V2);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // ignore storage error
    }
    return buildInitialStore();
  });

  // Ensure any new supervisor added dynamically has default records
  useEffect(() => {
    setSupervisorStore((prev) => {
      let changed = false;
      const next = { ...prev };
      supervisors.forEach((sup, idx) => {
        if (!next[sup.id]) {
          const tCount = getDefaultTeacherCountForSupervisor(sup.id, idx);
          next[sup.id] = {
            Term1: createSupervisorTermDefault(sup.fullName, tCount, false),
            Term2: createSupervisorTermDefault(sup.fullName, tCount, false),
            Term3: createSupervisorTermDefault(sup.fullName, tCount, true),
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [supervisors]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(supervisorStore));
    } catch {
      // ignore storage errors
    }
  }, [supervisorStore]);

  const activeSupervisor =
    supervisors.find((s) => s.id === selectedSupervisorId) || supervisors[0];

  const activeSupervisorTermData: SupervisorTermMonitoringData = useMemo(() => {
    const supData = supervisorStore[selectedSupervisorId];
    if (supData && supData[selectedTerm]) {
      return supData[selectedTerm];
    }
    return createSupervisorTermDefault(
      activeSupervisor?.fullName || 'Instructional Supervisor',
      4,
      selectedTerm === 'Term3'
    );
  }, [supervisorStore, selectedSupervisorId, selectedTerm, activeSupervisor]);

  // ============================================================================
  // CONSOLIDATION ENGINE: Automatically sums every Instructional Supervisor's report
  // ============================================================================
  const consolidatedTermData = useMemo(() => {
    let classroomTeachers = 0;
    let fleetingTeachers = 0;
    let lessonPlanTeachers = 0;
    let assessmentTeachers = 0;

    const classroomRemarksList: string[] = [];
    const fleetingNotesList: string[] = [];
    const lessonPlanNotesList: string[] = [];
    const assessmentNotesList: string[] = [];

    const classroomRows: Record<number, { e: number; ne: number; hasValue: boolean }> = {};
    for (let i = 1; i <= 13; i++) {
      classroomRows[i] = { e: 0, ne: 0, hasValue: false };
    }

    const fleetingRows: Record<string, { e: number; ne: number; hasValue: boolean }> = {};
    FLEETING_TABLE_ROWS.forEach((r) => {
      fleetingRows[r.id] = { e: 0, ne: 0, hasValue: false };
    });

    const lessonPlanRows: Record<string, { e: number; ne: number; hasValue: boolean }> = {};
    LESSON_PLAN_TABLE_ROWS.forEach((r) => {
      lessonPlanRows[r.id] = { e: 0, ne: 0, hasValue: false };
    });

    const assessmentRows: Record<string, { e: number; ne: number; hasValue: boolean }> = {};
    ASSESSMENT_TABLE_ROWS.forEach((r) => {
      assessmentRows[r.id] = { e: 0, ne: 0, hasValue: false };
    });

    supervisors.forEach((sup) => {
      const termReport = supervisorStore[sup.id]?.[selectedTerm];
      if (!termReport) return;

      // 1. Classroom
      classroomTeachers += Number(termReport.classroom.teacherCount) || 0;
      if (termReport.classroom.notesOrRemarks?.trim()) {
        classroomRemarksList.push(
          `[${sup.fullName}]: ${termReport.classroom.notesOrRemarks.trim()}`
        );
      }
      for (let i = 1; i <= 13; i++) {
        const cell = termReport.classroom.rows[i];
        if (cell) {
          if (cell.e !== '' && !isNaN(Number(cell.e))) {
            classroomRows[i].e += Number(cell.e);
            classroomRows[i].hasValue = true;
          }
          if (cell.ne !== '' && !isNaN(Number(cell.ne))) {
            classroomRows[i].ne += Number(cell.ne);
            classroomRows[i].hasValue = true;
          }
        }
      }

      // 2. Fleeting
      fleetingTeachers += Number(termReport.fleeting.teacherCount) || 0;
      if (termReport.fleeting.notesOrRemarks?.trim()) {
        fleetingNotesList.push(`[${sup.fullName}]: ${termReport.fleeting.notesOrRemarks.trim()}`);
      }
      FLEETING_TABLE_ROWS.forEach((r) => {
        const cell = termReport.fleeting.rows[r.id];
        if (cell) {
          if (cell.e !== '' && !isNaN(Number(cell.e))) {
            fleetingRows[r.id].e += Number(cell.e);
            fleetingRows[r.id].hasValue = true;
          }
          if (cell.ne !== '' && !isNaN(Number(cell.ne))) {
            fleetingRows[r.id].ne += Number(cell.ne);
            fleetingRows[r.id].hasValue = true;
          }
        }
      });

      // 3. Lesson Plan
      lessonPlanTeachers += Number(termReport.lessonPlan.teacherCount) || 0;
      if (termReport.lessonPlan.notesOrRemarks?.trim()) {
        lessonPlanNotesList.push(
          `[${sup.fullName}]: ${termReport.lessonPlan.notesOrRemarks.trim()}`
        );
      }
      LESSON_PLAN_TABLE_ROWS.forEach((r) => {
        const cell = termReport.lessonPlan.rows[r.id];
        if (cell) {
          if (cell.e !== '' && !isNaN(Number(cell.e))) {
            lessonPlanRows[r.id].e += Number(cell.e);
            lessonPlanRows[r.id].hasValue = true;
          }
          if (cell.ne !== '' && !isNaN(Number(cell.ne))) {
            lessonPlanRows[r.id].ne += Number(cell.ne);
            lessonPlanRows[r.id].hasValue = true;
          }
        }
      });

      // 4. Assessment
      assessmentTeachers += Number(termReport.assessment.teacherCount) || 0;
      if (termReport.assessment.notesOrRemarks?.trim()) {
        assessmentNotesList.push(
          `[${sup.fullName}]: ${termReport.assessment.notesOrRemarks.trim()}`
        );
      }
      ASSESSMENT_TABLE_ROWS.forEach((r) => {
        const cell = termReport.assessment.rows[r.id];
        if (cell) {
          if (cell.e !== '' && !isNaN(Number(cell.e))) {
            assessmentRows[r.id].e += Number(cell.e);
            assessmentRows[r.id].hasValue = true;
          }
          if (cell.ne !== '' && !isNaN(Number(cell.ne))) {
            assessmentRows[r.id].ne += Number(cell.ne);
            assessmentRows[r.id].hasValue = true;
          }
        }
      });
    });

    return {
      classroom: {
        teacherCount: classroomTeachers,
        notesOrRemarks: classroomRemarksList.join('\n\n'),
        rows: classroomRows,
      },
      fleeting: {
        teacherCount: fleetingTeachers,
        notesOrRemarks: fleetingNotesList.join('\n\n'),
        rows: fleetingRows,
      },
      lessonPlan: {
        teacherCount: lessonPlanTeachers,
        notesOrRemarks: lessonPlanNotesList.join('\n\n'),
        rows: lessonPlanRows,
      },
      assessment: {
        teacherCount: assessmentTeachers,
        notesOrRemarks: assessmentNotesList.join('\n\n'),
        rows: assessmentRows,
      },
    };
  }, [supervisorStore, supervisors, selectedTerm]);

  const termDisplayNumber = selectedTerm.replace('Term', '');
  const termWithSpace = `Term ${termDisplayNumber}`;

  // ============================================================================
  // UPDATERS FOR INSTRUCTIONAL SUPERVISOR ENCODING
  // ============================================================================
  const updateSupervisorCell = (
    tool: MonitoringToolKey,
    rowId: string | number,
    field: 'e' | 'ne',
    value: string
  ) => {
    setSupervisorStore((prev) => {
      const supTerm = prev[selectedSupervisorId]?.[selectedTerm] || activeSupervisorTermData;
      const currentTool = supTerm[tool];
      const existingRows = currentTool.rows as Record<string | number, IndicatorCount>;
      const prevCell = existingRows[rowId] || { e: '', ne: '' };
      return {
        ...prev,
        [selectedSupervisorId]: {
          ...(prev[selectedSupervisorId] || {}),
          [selectedTerm]: {
            ...supTerm,
            [tool]: {
              ...currentTool,
              rows: {
                ...existingRows,
                [rowId]: {
                  ...prevCell,
                  [field]: value,
                },
              },
            },
          },
        },
      };
    });
  };

  const updateSupervisorTeacherCount = (tool: MonitoringToolKey, count: number) => {
    setSupervisorStore((prev) => {
      const supTerm = prev[selectedSupervisorId]?.[selectedTerm] || activeSupervisorTermData;
      return {
        ...prev,
        [selectedSupervisorId]: {
          ...(prev[selectedSupervisorId] || {}),
          [selectedTerm]: {
            ...supTerm,
            [tool]: {
              ...supTerm[tool],
              teacherCount: Math.max(0, count),
            },
          },
        },
      };
    });
  };

  const updateSupervisorNotes = (tool: MonitoringToolKey, text: string) => {
    setSupervisorStore((prev) => {
      const supTerm = prev[selectedSupervisorId]?.[selectedTerm] || activeSupervisorTermData;
      return {
        ...prev,
        [selectedSupervisorId]: {
          ...(prev[selectedSupervisorId] || {}),
          [selectedTerm]: {
            ...supTerm,
            [tool]: {
              ...supTerm[tool],
              notesOrRemarks: text,
            },
          },
        },
      };
    });
  };

  // ============================================================================
  // SEND / SUBMIT SUPERVISOR REPORT TO ADMINISTRATOR CONSOLIDATION
  // ============================================================================
  const toolTitles: Record<MonitoringToolKey, string> = {
    classroom: 'M & E TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS',
    fleeting: 'M & E FLEETING WALKTHROUGH OBSERVATION',
    lessonPlan: 'M & E TOOL ON THE CHECKING-THE LESSON PLAN',
    assessment: 'M & E TOOL ON CHECKING ASSESSMENT',
  };

  const handleSendToolReportToAdmin = (tool: MonitoringToolKey) => {
    const nowStr = new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const supName = activeSupervisor?.fullName || currentUser.fullName;

    setSupervisorStore((prev) => {
      const supTerm = prev[selectedSupervisorId]?.[selectedTerm] || activeSupervisorTermData;
      return {
        ...prev,
        [selectedSupervisorId]: {
          ...(prev[selectedSupervisorId] || {}),
          [selectedTerm]: {
            ...supTerm,
            [tool]: {
              ...supTerm[tool],
              submittedToAdmin: true,
              submittedAt: nowStr,
              submittedByName: supName,
            },
          },
        },
      };
    });

    addNotification({
      recipientTeacherId: 'admin',
      recipientTeacherName: 'Administrator',
      type: 'observation_scheduled',
      title: `M & E Report Sent to Administrator (${selectedTerm})`,
      message: `${supName} encoded and submitted "${toolTitles[tool]}" (${selectedTerm}) to the Administrator Consolidated Report.`,
      targetTab: 'observation',
      supervisorName: supName,
      statusBadge: 'Consolidated',
    });

    logAuditEvent({
      category: 'Classroom Observation (COT)',
      action: 'UPDATE',
      targetId: `${selectedSupervisorId}-${selectedTerm}-${tool}`,
      targetName: `${toolTitles[tool]} (${selectedTerm})`,
      actorName: supName,
      actorRole: currentUser.role || 'supervisor',
      details: `${supName} encoded and submitted ${toolTitles[tool]} (${selectedTerm}) to the Administrator Reports & Links Section for consolidation.`,
      severity: 'info',
    });

    triggerToast(
      `Sent "${toolTitles[tool]}" (${selectedTerm}) from ${supName} to Administrator Consolidated Report!`
    );
  };

  const handleSendAllReportsToAdmin = () => {
    const nowStr = new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const supName = activeSupervisor?.fullName || currentUser.fullName;

    setSupervisorStore((prev) => {
      const supTerm = prev[selectedSupervisorId]?.[selectedTerm] || activeSupervisorTermData;
      return {
        ...prev,
        [selectedSupervisorId]: {
          ...(prev[selectedSupervisorId] || {}),
          [selectedTerm]: {
            classroom: {
              ...supTerm.classroom,
              submittedToAdmin: true,
              submittedAt: nowStr,
              submittedByName: supName,
            },
            fleeting: {
              ...supTerm.fleeting,
              submittedToAdmin: true,
              submittedAt: nowStr,
              submittedByName: supName,
            },
            lessonPlan: {
              ...supTerm.lessonPlan,
              submittedToAdmin: true,
              submittedAt: nowStr,
              submittedByName: supName,
            },
            assessment: {
              ...supTerm.assessment,
              submittedToAdmin: true,
              submittedAt: nowStr,
              submittedByName: supName,
            },
          },
        },
      };
    });

    addNotification({
      recipientTeacherId: 'admin',
      recipientTeacherName: 'Administrator',
      type: 'observation_scheduled',
      title: `All 4 M & E Reports Sent to Admin (${selectedTerm})`,
      message: `${supName} submitted all 4 M & E Monitoring Tool reports for ${selectedTerm} to the Administrator Reports & Links Section.`,
      targetTab: 'observation',
      supervisorName: supName,
      statusBadge: 'Consolidated',
    });

    logAuditEvent({
      category: 'Classroom Observation (COT)',
      action: 'UPDATE',
      targetId: `${selectedSupervisorId}-${selectedTerm}-ALL`,
      targetName: `All 4 M & E Monitoring Tool Reports (${selectedTerm})`,
      actorName: supName,
      actorRole: currentUser.role || 'supervisor',
      details: `${supName} submitted all 4 M & E Monitoring Tool tables (${selectedTerm}) to Administrator Consolidated Report.`,
      severity: 'info',
    });

    triggerToast(
      `All 4 M & E Reports for ${selectedTerm} from ${supName} have been sent and consolidated in the Administrator Report!`
    );
  };

  // ============================================================================
  // SYNC FROM LOGGED RECORDS FOR THE SELECTED SUPERVISOR
  // ============================================================================
  const handleSyncClassroomFromRecords = () => {
    const supObs = observations.filter(
      (o) =>
        o.quarterTerm === termWithSpace &&
        (o.supervisorId === selectedSupervisorId ||
          o.supervisorName === activeSupervisor?.fullName)
    );
    const targetObs =
      supObs.length > 0
        ? supObs
        : observations.filter((o) => o.quarterTerm === termWithSpace);
    const count = Math.max(
      targetObs.length,
      activeSupervisorTermData.classroom.teacherCount || 4
    );
    const updatedRows: Record<number, IndicatorCount> = {};
    for (let i = 1; i <= 13; i++) {
      let eCount = 0;
      let neCount = 0;
      targetObs.forEach((obs) => {
        const found = obs.ratings.find((r) => r.indicatorId === i);
        if (found) {
          if ((found.evidentStatus || (found.score >= 5 ? 'E' : 'NE')) === 'E') {
            eCount++;
          } else {
            neCount++;
          }
        } else if (obs.overallRating !== 'Not Evident') {
          eCount++;
        } else {
          neCount++;
        }
      });
      updatedRows[i] = {
        e: targetObs.length > 0 ? String(eCount) : '',
        ne: targetObs.length > 0 ? String(neCount) : '',
      };
    }
    setSupervisorStore((prev) => {
      const supTerm = prev[selectedSupervisorId]?.[selectedTerm] || activeSupervisorTermData;
      return {
        ...prev,
        [selectedSupervisorId]: {
          ...(prev[selectedSupervisorId] || {}),
          [selectedTerm]: {
            ...supTerm,
            classroom: {
              ...supTerm.classroom,
              teacherCount: count,
              rows: updatedRows,
            },
          },
        },
      };
    });
    triggerToast(`Synced Classroom Observation counts for ${activeSupervisor?.fullName}.`);
  };

  const handleSyncFleetingFromRecords = () => {
    const supVisits = fleetingObservations.filter(
      (v) =>
        v.supervisorId === selectedSupervisorId ||
        v.supervisorName === activeSupervisor?.fullName
    );
    const targetVisits = supVisits.length > 0 ? supVisits : fleetingObservations;
    const count = Math.max(
      targetVisits.length,
      activeSupervisorTermData.fleeting.teacherCount || 4
    );
    const updatedRows: Record<string, IndicatorCount> = {};
    FLEETING_TABLE_ROWS.forEach((row) => {
      let eCount = 0;
      let neCount = 0;
      targetVisits.forEach((visit) => {
        const status = visit.monitoringRatings?.[row.id] || 'E';
        if (status === 'E') eCount++;
        else neCount++;
      });
      updatedRows[row.id] = {
        e: targetVisits.length > 0 ? String(eCount) : String(count),
        ne: targetVisits.length > 0 ? String(neCount) : '0',
      };
    });
    setSupervisorStore((prev) => {
      const supTerm = prev[selectedSupervisorId]?.[selectedTerm] || activeSupervisorTermData;
      return {
        ...prev,
        [selectedSupervisorId]: {
          ...(prev[selectedSupervisorId] || {}),
          [selectedTerm]: {
            ...supTerm,
            fleeting: {
              ...supTerm.fleeting,
              teacherCount: count,
              rows: updatedRows,
            },
          },
        },
      };
    });
    triggerToast(`Synced Fleeting Walkthrough counts for ${activeSupervisor?.fullName}.`);
  };

  const handleSyncLessonPlanFromRecords = () => {
    const termPlans = lessonPlans.filter((lp) => lp.quarterTerm === termWithSpace);
    const count = Math.max(
      termPlans.length,
      activeSupervisorTermData.lessonPlan.teacherCount || 4
    );
    const updatedRows: Record<string, IndicatorCount> = {};
    LESSON_PLAN_TABLE_ROWS.forEach((row) => {
      let eCount = 0;
      let neCount = 0;
      termPlans.forEach((lp) => {
        const isEvident = Boolean((lp.checklist as any)?.[row.checklistKey]);
        if (isEvident) eCount++;
        else neCount++;
      });
      updatedRows[row.id] = {
        e: termPlans.length > 0 ? String(eCount) : '',
        ne: termPlans.length > 0 ? String(neCount) : '',
      };
    });
    setSupervisorStore((prev) => {
      const supTerm = prev[selectedSupervisorId]?.[selectedTerm] || activeSupervisorTermData;
      return {
        ...prev,
        [selectedSupervisorId]: {
          ...(prev[selectedSupervisorId] || {}),
          [selectedTerm]: {
            ...supTerm,
            lessonPlan: {
              ...supTerm.lessonPlan,
              teacherCount: count,
              rows: updatedRows,
            },
          },
        },
      };
    });
    triggerToast(`Synced Lesson Plan (DLL/DLP) counts for ${activeSupervisor?.fullName}.`);
  };

  const handleSyncAssessmentFromRecords = () => {
    const termAssessments = assessments.filter((a) => a.quarterTerm === termWithSpace);
    const count = Math.max(
      termAssessments.length,
      activeSupervisorTermData.assessment.teacherCount || 4
    );
    const metCount = termAssessments.filter((a) => a.targetMet).length;
    const belowCount = termAssessments.length - metCount;
    const updatedRows: Record<string, IndicatorCount> = {};
    ASSESSMENT_TABLE_ROWS.forEach((row) => {
      updatedRows[row.id] = {
        e: termAssessments.length > 0 ? String(metCount) : '',
        ne: termAssessments.length > 0 ? String(belowCount) : '',
      };
    });
    setSupervisorStore((prev) => {
      const supTerm = prev[selectedSupervisorId]?.[selectedTerm] || activeSupervisorTermData;
      return {
        ...prev,
        [selectedSupervisorId]: {
          ...(prev[selectedSupervisorId] || {}),
          [selectedTerm]: {
            ...supTerm,
            assessment: {
              ...supTerm.assessment,
              teacherCount: count,
              rows: updatedRows,
            },
          },
        },
      };
    });
    triggerToast(`Synced Assessment Checking counts for ${activeSupervisor?.fullName}.`);
  };

  const isConsolidated = viewMode === 'consolidated';
  let classroomRowRenderIndex = 0;

  const escapeHtml = (str: string) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const getToolMeta = (tool: MonitoringToolKey) => {
    const map: Record<
      MonitoringToolKey,
      { badge: string; title: string; filenamePrefix: string }
    > = {
      classroom: {
        badge: 'M & E TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS',
        title: `MONITORING TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS (${selectedTerm.replace('Term', 'Term ')})`,
        filenamePrefix: 'ME_Tool_Conduct_of_Classroom_Observations',
      },
      fleeting: {
        badge: 'M & E FLEETING WALKTHROUGH OBSERVATION',
        title: `FLEETING / WALKTHROUGH OBSERVATION TOOL ${selectedTerm.toUpperCase()}`,
        filenamePrefix: 'ME_Tool_Fleeting_Walkthrough_Observation',
      },
      lessonPlan: {
        badge: 'M & E TOOL ON THE CHECKING-THE LESSON PLAN',
        title: `MONITORING-TOOL-ON-THE-CHECKING-THE-LESSON-PLAN (${selectedTerm.replace('Term', 'Term ')})`,
        filenamePrefix: 'ME_Tool_Checking_The_Lesson_Plan',
      },
      assessment: {
        badge: 'M & E TOOL ON CHECKING ASSESSMENT',
        title: `MONITORING-TOOL-ON-CHECKING-ASSESSMENT (${selectedTerm.replace('Term', 'Term ')})`,
        filenamePrefix: 'ME_Tool_Checking_Assessment',
      },
    };
    return map[tool];
  };

  const buildPrintableTableHtml = (tool: MonitoringToolKey): string => {
    if (tool === 'classroom') {
      const totalTeachers = isConsolidated
        ? consolidatedTermData.classroom.teacherCount
        : activeSupervisorTermData.classroom.teacherCount;
      const remarks = isConsolidated
        ? consolidatedTermData.classroom.notesOrRemarks
        : activeSupervisorTermData.classroom.notesOrRemarks;

      let rowCounter = 0;
      const bodyHtml = CLASSROOM_TABLE_SECTIONS.map((sec, secIdx) => {
        const secHeader =
          secIdx > 0
            ? `<tr><td colspan="6" style="border:1px solid #1c1917;padding:6px 8px;text-align:center;font-weight:bold;text-transform:uppercase;background:#f5f5f4;">${escapeHtml(sec.sectionTitle)}</td></tr>`
            : '';
        const rowsHtml = sec.items
          .map((item) => {
            const isFirst = rowCounter === 0;
            rowCounter++;
            let eDisplay = '';
            let neDisplay = '';
            if (isConsolidated) {
              const consRow = consolidatedTermData.classroom.rows[item.id];
              eDisplay = consRow?.hasValue ? String(consRow.e) : '';
              neDisplay = consRow?.hasValue ? String(consRow.ne) : item.id >= 6 ? '0' : '';
            } else {
              const supRow = activeSupervisorTermData.classroom.rows[item.id] || {
                e: '',
                ne: '',
              };
              eDisplay = supRow.e;
              neDisplay = supRow.ne !== '' ? supRow.ne : item.id >= 6 ? '0' : '';
            }
            const ePct = computePct(eDisplay, totalTeachers);
            const nePct =
              item.id >= 8 && (!neDisplay || neDisplay === '0')
                ? '0'
                : computePct(neDisplay, totalTeachers);

            return `<tr>
              <td style="border:1px solid #1c1917;padding:6px 8px;vertical-align:middle;">${escapeHtml(item.indicator)}</td>
              <td style="border:1px solid #1c1917;padding:6px 8px;vertical-align:middle;white-space:pre-line;">${escapeHtml(item.mov)}</td>
              <td style="border:1px solid #1c1917;padding:6px 4px;text-align:center;font-weight:bold;">${escapeHtml(eDisplay)}</td>
              <td style="border:1px solid #1c1917;padding:6px 4px;text-align:center;">${escapeHtml(ePct)}</td>
              <td style="border:1px solid #1c1917;padding:6px 4px;text-align:center;font-weight:bold;">${escapeHtml(neDisplay)}</td>
              <td style="border:1px solid #1c1917;padding:6px 4px;text-align:center;">${escapeHtml(nePct)}</td>
              ${
                isFirst
                  ? `<td rowspan="15" style="border:1px solid #1c1917;padding:8px;text-align:center;vertical-align:middle;font-weight:800;font-size:14px;">${totalTeachers}</td>
                     <td rowspan="15" style="border:1px solid #1c1917;padding:8px;vertical-align:top;white-space:pre-line;font-size:10px;line-height:1.4;">${escapeHtml(remarks || 'No remarks encoded.')}</td>`
                  : ''
              }
            </tr>`;
          })
          .join('');
        return secHeader + rowsHtml;
      }).join('');

      return `<table style="width:100%;border-collapse:collapse;font-size:10.5px;color:#1c1917;">
        <thead>
          <tr>
            <th style="border:1px solid #1c1917;padding:7px;text-align:center;font-weight:bold;background:#fff;width:25%;">INDICATORS</th>
            <th colspan="7" style="border:1px solid #1c1917;padding:7px;text-align:center;font-weight:bold;background:#fff;">
              MONITORING TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS${isConsolidated ? ' — CONSOLIDATED SCHOOL REPORT' : ''}
            </th>
          </tr>
          <tr>
            <th colspan="8" style="border:1px solid #1c1917;padding:6px;text-align:center;font-weight:bold;background:#fff;">
              Conduct of Rated Classroom Observation ${selectedTerm}
            </th>
          </tr>
          <tr>
            <th colspan="2" style="border:1px solid #1c1917;padding:6px;text-align:center;font-weight:bold;background:#f5f5f4;">BEFORE CLASSROOM OBSERVATION</th>
            <th style="border:1px solid #1c1917;padding:6px;text-align:center;font-weight:bold;background:#f5f5f4;width:5%;">E</th>
            <th style="border:1px solid #1c1917;padding:6px;text-align:center;font-weight:bold;background:#f5f5f4;width:7%;">Percentage</th>
            <th style="border:1px solid #1c1917;padding:6px;text-align:center;font-weight:bold;background:#f5f5f4;width:5%;">NE</th>
            <th style="border:1px solid #1c1917;padding:6px;text-align:center;font-weight:bold;background:#f5f5f4;width:7%;">Percentage</th>
            <th style="border:1px solid #1c1917;padding:6px;text-align:center;font-weight:bold;background:#f5f5f4;width:9%;">Number of Teachers</th>
            <th style="border:1px solid #1c1917;padding:6px;text-align:center;font-weight:bold;background:#f5f5f4;width:22%;">REMARKS</th>
          </tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
      </table>`;
    }

    const rowsConfig =
      tool === 'fleeting'
        ? FLEETING_TABLE_ROWS
        : tool === 'lessonPlan'
          ? LESSON_PLAN_TABLE_ROWS
          : ASSESSMENT_TABLE_ROWS;

    const toolData = isConsolidated
      ? consolidatedTermData[tool]
      : activeSupervisorTermData[tool];
    const totalTeachers = toolData.teacherCount;
    const notes = toolData.notesOrRemarks;

    const headerBannerTitle =
      tool === 'fleeting'
        ? `FLEETING/ WALKTHROUGH OBSERVATION TOOL ${selectedTerm.toUpperCase()}`
        : tool === 'lessonPlan'
          ? 'MONITORING-TOOL-ON-THE-CHECKING-THE-LESSON-PLAN'
          : 'MONITORING-TOOL-ON-CHECKING-ASSESSMENT';

    const bodyHtml = rowsConfig
      .map((row, idx) => {
        let eDisplay = '';
        let neDisplay = '';
        if (isConsolidated) {
          const consRow = consolidatedTermData[tool].rows[row.id];
          eDisplay = consRow?.hasValue ? String(consRow.e) : tool === 'fleeting' ? '0' : '';
          neDisplay = consRow?.hasValue ? String(consRow.ne) : tool === 'fleeting' ? '0' : '';
        } else {
          const supRow = activeSupervisorTermData[tool].rows[row.id] || {
            e: tool === 'fleeting' ? String(totalTeachers) : '',
            ne: tool === 'fleeting' ? '0' : '',
          };
          eDisplay = supRow.e;
          neDisplay = supRow.ne;
        }
        const ePct = computePct(eDisplay, totalTeachers);
        const nePct = computePct(neDisplay, totalTeachers);

        return `<tr>
          <td style="border:1px solid #1c1917;padding:6px 8px;vertical-align:middle;font-weight:600;">${escapeHtml(row.focus)}</td>
          <td style="border:1px solid #1c1917;padding:6px 8px;vertical-align:middle;white-space:pre-line;">${escapeHtml(row.indicator)}</td>
          <td style="border:1px solid #1c1917;padding:6px 4px;text-align:center;font-weight:bold;">${escapeHtml(eDisplay)}</td>
          <td style="border:1px solid #1c1917;padding:6px 4px;text-align:center;">${escapeHtml(ePct)}</td>
          <td style="border:1px solid #1c1917;padding:6px 4px;text-align:center;font-weight:bold;">${escapeHtml(neDisplay)}</td>
          <td style="border:1px solid #1c1917;padding:6px 4px;text-align:center;">${escapeHtml(nePct)}</td>
          ${
            idx === 0
              ? `<td rowspan="${rowsConfig.length}" style="border:1px solid #1c1917;padding:8px;text-align:center;vertical-align:middle;font-weight:800;font-size:14px;">${totalTeachers}</td>
                 <td rowspan="${rowsConfig.length}" style="border:1px solid #1c1917;padding:8px;vertical-align:top;white-space:pre-line;font-size:10px;line-height:1.4;">${escapeHtml(notes || 'No STAR evidence notes encoded.')}</td>`
              : ''
          }
        </tr>`;
      })
      .join('');

    return `<table style="width:100%;border-collapse:collapse;font-size:10.5px;color:#1c1917;">
      <thead>
        <tr>
          <th colspan="8" style="border:1px solid #1c1917;padding:7px;text-align:center;font-weight:bold;background:#fff;">
            ${headerBannerTitle}${isConsolidated ? ' — CONSOLIDATED SCHOOL REPORT' : ''}
          </th>
        </tr>
        <tr>
          <th style="border:1px solid #1c1917;padding:7px;text-align:center;font-weight:bold;background:#f5f5f4;width:22%;">FOCUS</th>
          <th style="border:1px solid #1c1917;padding:7px;text-align:center;font-weight:bold;background:#f5f5f4;width:24%;">INDICATORS</th>
          <th style="border:1px solid #1c1917;padding:7px;text-align:center;font-weight:bold;background:#f5f5f4;width:5%;">E</th>
          <th style="border:1px solid #1c1917;padding:7px;text-align:center;font-weight:bold;background:#f5f5f4;width:7%;">Percentage</th>
          <th style="border:1px solid #1c1917;padding:7px;text-align:center;font-weight:bold;background:#f5f5f4;width:5%;">NE</th>
          <th style="border:1px solid #1c1917;padding:7px;text-align:center;font-weight:bold;background:#f5f5f4;width:7%;">Percentage</th>
          <th style="border:1px solid #1c1917;padding:7px;text-align:center;font-weight:bold;background:#f5f5f4;width:10%;">Number of Teachers being observed through fleeting/walkthrough</th>
          <th style="border:1px solid #1c1917;padding:7px;text-align:left;font-weight:bold;background:#f5f5f4;width:20%;">Brief Evidence/Notes<br/><span style="font-weight:normal;font-size:9.5px;">(Use STAR (Situation, Task, Activity and Result in noting the observation)</span></th>
        </tr>
      </thead>
      <tbody>${bodyHtml}</tbody>
    </table>`;
  };

  const buildFullPrintableDocumentHtml = (tool: MonitoringToolKey): string => {
    const meta = getToolMeta(tool);
    const tableMarkup = buildPrintableTableHtml(tool);
    const currentDateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const preparedByName = isConsolidated
      ? `All Instructional Supervisors (${supervisors.length} Supervisors Consolidated)`
      : activeSupervisor?.fullName || currentUser.fullName;
    const preparedByRole = isConsolidated
      ? 'Consolidated Instructional Supervision Report'
      : `${activeSupervisor?.position || 'Instructional Supervisor'} — ${activeSupervisor?.department || ''}`;
    const totalTeachersCount = isConsolidated
      ? consolidatedTermData[tool].teacherCount
      : activeSupervisorTermData[tool].teacherCount;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${meta.filenamePrefix}_${selectedTerm}_${new Date().toISOString().slice(0, 10)}</title>
  <style>
    @page { size: landscape; margin: 1cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1c1917; margin: 0; padding: 16px; background: #fff; }
    .header { text-align: center; border-bottom: 2px solid #701628; padding-bottom: 10px; margin-bottom: 12px; }
    .header h4 { margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #57534e; }
    .header h3 { margin: 2px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #1c1917; }
    .header h2 { margin: 3px 0; font-size: 16px; color: #701628; font-weight: 800; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 10px; color: #57534e; }
    .title-banner { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px; padding: 5px 10px; margin-top: 8px; text-align: center; font-weight: bold; font-size: 11px; color: #701628; text-transform: uppercase; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; font-size: 10.5px; background: #fafaf9; border: 1px solid #d6d3d1; padding: 8px 12px; border-radius: 4px; }
    .signatories { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 28px; text-align: center; font-size: 10.5px; page-break-inside: avoid; }
    .sign-line { border-bottom: 1px solid #1c1917; padding-bottom: 3px; font-weight: bold; margin-bottom: 3px; }
    .sign-title { font-size: 9.5px; color: #57534e; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h4>Republic of the Philippines</h4>
    <h3>Department of Education</h3>
    <p>Caraga Administrative Region XIII · Schools Division of Surigao del Sur</p>
    <h2>${escapeHtml(schoolProfile.schoolName)}</h2>
    <p>School ID: ${escapeHtml(schoolProfile.schoolId)} · ${escapeHtml(schoolProfile.address)}</p>
    <div class="title-banner">${escapeHtml(meta.title)} — ${isConsolidated ? 'CONSOLIDATED SCHOOL REPORT' : 'INSTRUCTIONAL SUPERVISOR REPORT'}</div>
  </div>
  <div class="meta-grid">
    <div><strong>Report Type:</strong> ${isConsolidated ? `Consolidated (${supervisors.length} Supervisors)` : 'Supervisor Report'}</div>
    <div><strong>Supervisor / Scope:</strong> ${escapeHtml(preparedByName)}</div>
    <div><strong>Supervisory Term:</strong> ${escapeHtml(selectedTerm.replace('Term', 'Term '))} (SY 2026–2027)</div>
    <div><strong>Teachers Covered:</strong> ${totalTeachersCount} Teachers · <strong>Date:</strong> ${escapeHtml(currentDateFormatted)}</div>
  </div>
  ${tableMarkup}
  <div class="signatories">
    <div>
      <div class="sign-line">${escapeHtml( isConsolidated ? currentUser.fullName : activeSupervisor?.fullName || currentUser.fullName )}</div>
      <div class="sign-title">Prepared by: ${escapeHtml(preparedByRole)}</div>
    </div>
    <div>
      <div class="sign-line">Instructional Supervision &amp; M&amp;E Committee</div>
      <div class="sign-title">Reviewed &amp; Consolidated by: Master Teacher / Department Head</div>
    </div>
    <div>
      <div class="sign-line">${escapeHtml(schoolProfile.principalName)}</div>
      <div class="sign-title">${escapeHtml(schoolProfile.principalTitle)} — School Head</div>
    </div>
  </div>
</body>
</html>`;
  };

  const executeIframePrint = (tool: MonitoringToolKey) => {
    const htmlDoc = buildFullPrintableDocumentHtml(tool);
    const existingIframe = document.getElementById('me-monitoring-print-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }
    const iframe = document.createElement('iframe');
    iframe.id = 'me-monitoring-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlDoc);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 250);
    }
  };

  const handleOpenPrintToPdf = (tool: MonitoringToolKey) => {
    setPrintingTool(tool);
    executeIframePrint(tool);
  };

  const handleDownloadPrintableHtml = (tool: MonitoringToolKey) => {
    const meta = getToolMeta(tool);
    const htmlDoc = buildFullPrintableDocumentHtml(tool);
    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meta.filenamePrefix}_${selectedTerm}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isTeacher) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {statusToast && (
        <div className="bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-md border border-emerald-700 flex items-center justify-between gap-3 text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{statusToast}</span>
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'supervisor' && (
              <button
                type="button"
                onClick={() => setViewMode('consolidated')}
                className="px-2.5 py-1 bg-white text-emerald-950 rounded-md text-[11px] font-extrabold hover:bg-emerald-100 cursor-pointer"
              >
                View Admin Consolidated Table
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatusToast(null)}
              className="text-emerald-200 hover:text-white text-[11px] underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ============================================================================
          TOP WORKFLOW BAR: SWITCH BETWEEN SUPERVISOR ENCODING & ADMIN CONSOLIDATION
      ============================================================================ */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-[#701628] via-[#580e1c] to-stone-900 px-5 py-4 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-stone-950">
                {isConsolidated
                  ? 'Administrator Consolidated Report'
                  : 'Instructional Supervisor Encoding Workspace'}
              </span>
              <span className="text-[11px] text-amber-200 font-medium">
                • {selectedTerm.replace('Term', 'Term ')} (SY 2026–2027)
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold mt-1">
              {isConsolidated
                ? 'Consolidated M & E Tool Report of All Instructional Supervisors'
                : `Encode & Submit M & E Monitoring Tool Data — ${activeSupervisor?.fullName || ''}`}
            </h3>
            <p className="text-xs text-stone-200 mt-0.5">
              {isConsolidated
                ? 'Automatically consolidates E counts, NE counts, Number of Teachers, Percentages, and STAR Evidence Notes submitted by every Instructional Supervisor.'
                : 'Encode your E, NE, Number of Teachers, and Remarks/STAR Notes below, then click "Send Report to Administrator" to consolidate into the School Administrator Report.'}
            </p>
          </div>

          {/* Mode Switcher — Only visible to Instructional Supervisor */}
          {isSupervisor && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex rounded-xl bg-black/30 p-1 border border-white/15 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('supervisor')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'supervisor'
                      ? 'bg-amber-400 text-stone-950 shadow-xs'
                      : 'text-stone-200 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Instructional Supervisor Encode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('consolidated')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'consolidated'
                      ? 'bg-amber-400 text-stone-950 shadow-xs'
                      : 'text-stone-200 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Admin Consolidated Report ({supervisors.length} Supervisors)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sub-Bar: Supervisor Selector (when Encoding) OR Consolidation Status Grid (when Consolidated) */}
        {viewMode === 'supervisor' ? (
          <div className="p-4 bg-amber-50/60 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-stone-500 mb-1">
                  Encoding Instructional Supervisor
                </label>
                <select
                  value={selectedSupervisorId}
                  onChange={(e) => setSelectedSupervisorId(e.target.value)}
                  className="text-xs font-bold border border-stone-300 rounded-lg px-3 py-2 bg-white text-stone-900 shadow-2xs min-w-[260px]"
                >
                  {supervisors.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.fullName} — {sup.position} ({sup.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-stone-600 space-y-0.5 sm:pt-4">
                <div className="font-bold text-stone-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#701628]" />
                  <span>
                    Department: <span className="text-[#701628]">{activeSupervisor?.department}</span>
                  </span>
                </div>
                <div className="text-[11px] text-stone-500">
                  Last sent to Admin:{' '}
                  <span className="font-semibold text-emerald-800">
                    {activeSupervisorTermData.classroom.submittedAt || 'Ready to send'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSendAllReportsToAdmin}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-amber-200" />
                <span>Send All 4 M &amp; E Reports to Administrator ({selectedTerm})</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-stone-50 border-b border-stone-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#701628]" />
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                  Instructional Supervisors Included in Consolidated Report ({selectedTerm})
                </span>
              </div>
              <span className="text-[11px] text-stone-600">
                Click any Instructional Supervisor card below to inspect or encode their individual M &amp; E report.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {supervisors.map((sup) => {
                const supTerm = supervisorStore[sup.id]?.[selectedTerm];
                const isSubmitted = Boolean(
                  supTerm?.classroom.submittedToAdmin ||
                    supTerm?.fleeting.submittedToAdmin ||
                    supTerm?.lessonPlan.submittedToAdmin ||
                    supTerm?.assessment.submittedToAdmin
                );
                const tCount = supTerm?.classroom.teacherCount ?? 0;
                const lastSent = supTerm?.classroom.submittedAt;

                return (
                  <div
                    key={sup.id}
                    className="bg-white rounded-lg border border-stone-200 p-3 shadow-2xs flex flex-col justify-between hover:border-[#701628] transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-xs font-bold text-stone-900 leading-snug">
                          {sup.fullName}
                        </h5>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            isSubmitted
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isSubmitted ? 'Consolidated' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {sup.position} • {sup.department}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-stone-700">
                        {tCount} Teachers
                      </span>
                      {isSupervisor && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSupervisorId(sup.id);
                            setViewMode('supervisor');
                          }}
                          className="inline-flex items-center gap-1 text-[#701628] font-bold hover:underline cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Encode / View</span>
                        </button>
                      )}
                    </div>
                    {lastSent && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-stone-400">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Sent: {lastSent}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Bar: Term Selector & Tool Table Filter */}
        <div className="px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-stone-600">
            {isConsolidated ? (
              <span>
                Showing <strong className="text-stone-900">School-Wide Consolidated Totals</strong>{' '}
                across all <strong className="text-[#701628]">{supervisors.length}</strong>{' '}
                Instructional Supervisors (Total Teachers Observed:{' '}
                <strong className="text-stone-900">
                  {consolidatedTermData.classroom.teacherCount}
                </strong>
                ).
              </span>
            ) : (
              <span>
                Encoding as <strong className="text-[#701628]">{activeSupervisor?.fullName}</strong>.
                Changes automatically save and consolidate when you click{' '}
                <strong className="text-emerald-800">Send Report to Administrator</strong>.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Term Selector */}
            <div className="inline-flex rounded-lg border border-stone-300 bg-stone-100 p-0.5 text-xs font-bold">
              {(['Term1', 'Term2', 'Term3'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTerm(t)}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    selectedTerm === t
                      ? 'bg-[#701628] text-white shadow-2xs'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  {t.replace('Term', 'Term ')}
                </button>
              ))}
            </div>

            {/* Table Filter */}
            <select
              value={activeToolFilter}
              onChange={(e) => setActiveToolFilter(e.target.value as any)}
              className="text-xs font-bold border border-stone-300 rounded-lg px-3 py-1.5 bg-white text-stone-800"
            >
              <option value="ALL">Show All 4 M &amp; E Tool Tables</option>
              <option value="classroom">
                1. M &amp; E Tool on the Conduct of Classroom Observations
              </option>
              <option value="fleeting">2. M &amp; E Fleeting Walkthrough Observation</option>
              <option value="lessonPlan">
                3. M &amp; E Tool on the Checking-The Lesson Plan
              </option>
              <option value="assessment">4. M &amp; E Tool on Checking Assessment</option>
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================================
          TABLE 1: M & E TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS
      ============================================================================ */}
      {(activeToolFilter === 'ALL' || activeToolFilter === 'classroom') && (
        <div className="bg-white rounded-xl border border-stone-300 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#701628] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                  M &amp; E TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isConsolidated
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isConsolidated
                    ? `CONSOLIDATED REPORT (${supervisors.length} Instructional Supervisors)`
                    : `SUPERVISOR ENCODING: ${activeSupervisor?.fullName}`}
                </span>
              </div>
              <h4 className="text-xs font-bold text-stone-900 mt-1">
                Monitoring Tool on the Conduct of Classroom Observations ({selectedTerm})
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenPrintToPdf('classroom')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                title="Print or Save Monitoring Tool on the Conduct of Classroom Observations as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-amber-200" />
                <span>Print to PDF</span>
              </button>
              {!isConsolidated && (
                <>
                  <button
                    type="button"
                    onClick={handleSyncClassroomFromRecords}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    title="Sync E and NE counts from logged Classroom Observations"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync from Observations</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToolReportToAdmin('classroom')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-200" />
                    <span>Send Report to Administrator</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-stone-900">
              <thead>
                <tr>
                  <th className="border border-stone-800 px-3 py-2 text-center font-bold uppercase bg-white w-72">
                    INDICATORS
                  </th>
                  <th
                    colSpan={7}
                    className="border border-stone-800 px-3 py-2 text-center font-bold uppercase bg-white tracking-wide"
                  >
                    MONITORING TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS
                    {isConsolidated ? ' — CONSOLIDATED SCHOOL REPORT' : ''}
                  </th>
                </tr>
                <tr>
                  <th
                    colSpan={8}
                    className="border border-stone-800 px-3 py-1.5 text-center font-bold bg-white text-stone-900"
                  >
                    Conduct of Rated Classroom Observation {selectedTerm}
                  </th>
                </tr>
                <tr>
                  <th
                    colSpan={2}
                    className="border border-stone-800 px-3 py-2 text-center font-bold uppercase bg-stone-50"
                  >
                    BEFORE CLASSROOM OBSERVATION
                  </th>
                  <th className="border border-stone-800 px-2 py-2 text-center font-bold bg-stone-50 w-16">
                    E
                  </th>
                  <th className="border border-stone-800 px-2 py-2 text-center font-bold bg-stone-50 w-24">
                    Percentage
                  </th>
                  <th className="border border-stone-800 px-2 py-2 text-center font-bold bg-stone-50 w-16">
                    NE
                  </th>
                  <th className="border border-stone-800 px-2 py-2 text-center font-bold bg-stone-50 w-24">
                    Percentage
                  </th>
                  <th className="border border-stone-800 px-2 py-2 text-center font-bold bg-stone-50 w-28">
                    Number of Teachers
                  </th>
                  <th className="border border-stone-800 px-3 py-2 text-center font-bold uppercase bg-stone-50 w-64">
                    REMARKS
                  </th>
                </tr>
              </thead>
              <tbody>
                {CLASSROOM_TABLE_SECTIONS.map((section, sectionIdx) => (
                  <React.Fragment key={section.sectionTitle}>
                    {sectionIdx > 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="border border-stone-800 px-3 py-1.5 text-center font-bold uppercase bg-stone-50"
                        >
                          {section.sectionTitle}
                        </td>
                      </tr>
                    )}
                    {section.items.map((item) => {
                      const isVeryFirstRow = classroomRowRenderIndex === 0;
                      classroomRowRenderIndex++;

                      const totalTeachers = isConsolidated
                        ? consolidatedTermData.classroom.teacherCount
                        : activeSupervisorTermData.classroom.teacherCount;

                      let eDisplay = '';
                      let neDisplay = '';

                      if (isConsolidated) {
                        const consRow = consolidatedTermData.classroom.rows[item.id];
                        eDisplay = consRow?.hasValue ? String(consRow.e) : '';
                        neDisplay = consRow?.hasValue ? String(consRow.ne) : '';
                      } else {
                        const supRow = activeSupervisorTermData.classroom.rows[item.id] || {
                          e: '',
                          ne: '',
                        };
                        eDisplay = supRow.e;
                        neDisplay = supRow.ne;
                      }

                      const ePct = computePct(eDisplay, totalTeachers);
                      const nePct = computePct(neDisplay, totalTeachers);

                      return (
                        <tr key={item.id} className="hover:bg-amber-50/20">
                          <td className="border border-stone-800 px-3 py-2 align-middle leading-snug">
                            {item.indicator}
                          </td>
                          <td className="border border-stone-800 px-3 py-2 align-middle whitespace-pre-line w-60">
                            {item.mov}
                          </td>
                          <td className="border border-stone-800 p-1 text-center align-middle">
                            {isConsolidated ? (
                              <span className="font-bold text-stone-900">{eDisplay}</span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                value={eDisplay}
                                onChange={(e) =>
                                  updateSupervisorCell('classroom', item.id, 'e', e.target.value)
                                }
                                placeholder=""
                                className="w-14 text-center py-1 rounded border border-stone-200 hover:border-stone-400 focus:border-[#701628] focus:bg-amber-50/40 focus:outline-none font-bold"
                              />
                            )}
                          </td>
                          <td className="border border-stone-800 px-2 py-2 text-center align-middle font-medium">
                            {ePct}
                          </td>
                          <td className="border border-stone-800 p-1 text-center align-middle">
                            {isConsolidated ? (
                              <span className="font-bold text-stone-900">
                                {neDisplay !== '' ? neDisplay : item.id >= 6 ? '0' : ''}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                value={neDisplay}
                                onChange={(e) =>
                                  updateSupervisorCell('classroom', item.id, 'ne', e.target.value)
                                }
                                placeholder={item.id >= 6 ? '0' : ''}
                                className="w-14 text-center py-1 rounded border border-stone-200 hover:border-stone-400 focus:border-[#701628] focus:bg-amber-50/40 focus:outline-none font-bold"
                              />
                            )}
                          </td>
                          <td className="border border-stone-800 px-2 py-2 text-center align-middle font-medium">
                            {item.id >= 8 && !neDisplay ? '0' : nePct}
                          </td>
                          {isVeryFirstRow && (
                            <>
                              <td
                                rowSpan={15}
                                className="border border-stone-800 p-2 text-center align-middle bg-white"
                              >
                                {isConsolidated ? (
                                  <div className="space-y-1">
                                    <div className="text-base font-extrabold text-stone-900">
                                      {totalTeachers}
                                    </div>
                                    <div className="text-[10px] text-stone-500">
                                      Consolidated Total
                                    </div>
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    min={1}
                                    value={totalTeachers}
                                    onChange={(e) =>
                                      updateSupervisorTeacherCount(
                                        'classroom',
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-16 text-center font-bold text-sm py-1.5 rounded border border-stone-300 hover:border-stone-400 focus:border-[#701628] focus:outline-none"
                                  />
                                )}
                              </td>
                              <td
                                rowSpan={15}
                                className="border border-stone-800 p-2 align-top bg-white"
                              >
                                {isConsolidated ? (
                                  <div className="text-xs text-stone-800 whitespace-pre-line leading-relaxed min-h-[320px] p-1">
                                    {consolidatedTermData.classroom.notesOrRemarks || (
                                      <span className="text-stone-400 italic">
                                        Consolidated remarks from Instructional Supervisors will appear here once encoded.
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <textarea
                                    rows={18}
                                    value={activeSupervisorTermData.classroom.notesOrRemarks}
                                    onChange={(e) =>
                                      updateSupervisorNotes('classroom', e.target.value)
                                    }
                                    placeholder={`Enter remarks / observation notes for ${activeSupervisor?.fullName}...`}
                                    className="w-full h-full min-h-[320px] p-2 text-xs rounded border border-stone-200 hover:border-stone-300 focus:border-[#701628] focus:outline-none resize-none"
                                  />
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================
          TABLE 2: M & E FLEETING WALKTHROUGH OBSERVATION
      ============================================================================ */}
      {(activeToolFilter === 'ALL' || activeToolFilter === 'fleeting') && (
        <div className="bg-white rounded-xl border border-stone-300 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  M &amp; E FLEETING WALKTHROUGH OBSERVATION
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isConsolidated
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isConsolidated
                    ? `CONSOLIDATED REPORT (${supervisors.length} Instructional Supervisors)`
                    : `SUPERVISOR ENCODING: ${activeSupervisor?.fullName}`}
                </span>
              </div>
              <h4 className="text-xs font-bold text-stone-900 mt-1">
                Fleeting / Walkthrough Observation Tool {selectedTerm.toUpperCase()}
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenPrintToPdf('fleeting')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                title="Print or Save Fleeting Walkthrough Observation Tool as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-amber-200" />
                <span>Print to PDF</span>
              </button>
              {!isConsolidated && (
                <>
                  <button
                    type="button"
                    onClick={handleSyncFleetingFromRecords}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    title="Sync E and NE counts from logged Fleeting Walkthrough Observations"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync from Walkthroughs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToolReportToAdmin('fleeting')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-200" />
                    <span>Send Report to Administrator</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-stone-900">
              <thead>
                <tr>
                  <th
                    colSpan={8}
                    className="border border-stone-800 px-3 py-2 text-center font-bold uppercase bg-white tracking-wide"
                  >
                    FLEETING/ WALKTHROUGH OBSERVATION TOOL {selectedTerm.toUpperCase()}
                    {isConsolidated ? ' — CONSOLIDATED SCHOOL REPORT' : ''}
                  </th>
                </tr>
                <tr>
                  <th className="border border-stone-800 px-3 py-3 text-center font-bold uppercase bg-white w-56">
                    FOCUS
                  </th>
                  <th className="border border-stone-800 px-3 py-3 text-center font-bold uppercase bg-white w-80">
                    INDICATORS
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-16">
                    E
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-24">
                    Percentage
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-16">
                    NE
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-24">
                    Percentage
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-44">
                    Number of Teachers being observed through fleeting/walkthrough
                  </th>
                  <th className="border border-stone-800 px-3 py-3 text-left font-normal bg-white w-64">
                    Brief Evidence/Notes
                    <br />
                    (Use STAR (Situation, Task, Activity and Result in noting the observation)
                  </th>
                </tr>
              </thead>
              <tbody>
                {FLEETING_TABLE_ROWS.map((row, idx) => {
                  const totalTeachers = isConsolidated
                    ? consolidatedTermData.fleeting.teacherCount
                    : activeSupervisorTermData.fleeting.teacherCount;

                  let eDisplay = '';
                  let neDisplay = '';

                  if (isConsolidated) {
                    const consRow = consolidatedTermData.fleeting.rows[row.id];
                    eDisplay = consRow?.hasValue ? String(consRow.e) : '0';
                    neDisplay = consRow?.hasValue ? String(consRow.ne) : '0';
                  } else {
                    const supRow = activeSupervisorTermData.fleeting.rows[row.id] || {
                      e: String(totalTeachers),
                      ne: '0',
                    };
                    eDisplay = supRow.e;
                    neDisplay = supRow.ne;
                  }

                  const ePct = computePct(eDisplay, totalTeachers);
                  const nePct = computePct(neDisplay, totalTeachers);

                  return (
                    <tr key={row.id} className="hover:bg-blue-50/20">
                      <td className="border border-stone-800 px-3 py-2.5 align-middle font-medium">
                        {row.focus}
                      </td>
                      <td className="border border-stone-800 px-3 py-2.5 align-middle leading-snug">
                        {row.indicator}
                      </td>
                      <td className="border border-stone-800 p-1 text-center align-middle">
                        {isConsolidated ? (
                          <span className="font-bold text-stone-900">{eDisplay}</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={eDisplay}
                            onChange={(e) =>
                              updateSupervisorCell('fleeting', row.id, 'e', e.target.value)
                            }
                            className="w-14 text-center py-1 rounded border border-stone-200 hover:border-stone-400 focus:border-blue-700 focus:bg-blue-50/40 focus:outline-none font-bold"
                          />
                        )}
                      </td>
                      <td className="border border-stone-800 px-2 py-2.5 text-center align-middle font-medium">
                        {ePct}
                      </td>
                      <td className="border border-stone-800 p-1 text-center align-middle">
                        {isConsolidated ? (
                          <span className="font-bold text-stone-900">{neDisplay}</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={neDisplay}
                            onChange={(e) =>
                              updateSupervisorCell('fleeting', row.id, 'ne', e.target.value)
                            }
                            className="w-14 text-center py-1 rounded border border-stone-200 hover:border-stone-400 focus:border-blue-700 focus:bg-blue-50/40 focus:outline-none font-bold"
                          />
                        )}
                      </td>
                      <td className="border border-stone-800 px-2 py-2.5 text-center align-middle font-medium">
                        {nePct}
                      </td>
                      {idx === 0 && (
                        <>
                          <td
                            rowSpan={FLEETING_TABLE_ROWS.length}
                            className="border border-stone-800 p-2 text-center align-middle bg-white"
                          >
                            {isConsolidated ? (
                              <div className="space-y-1">
                                <div className="text-base font-extrabold text-stone-900">
                                  {totalTeachers}
                                </div>
                                <div className="text-[10px] text-stone-500">Consolidated Total</div>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                value={totalTeachers}
                                onChange={(e) =>
                                  updateSupervisorTeacherCount(
                                    'fleeting',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 text-center font-bold text-sm py-1.5 rounded border border-stone-300 hover:border-stone-400 focus:border-blue-700 focus:outline-none"
                              />
                            )}
                          </td>
                          <td
                            rowSpan={FLEETING_TABLE_ROWS.length}
                            className="border border-stone-800 p-2 align-top bg-white"
                          >
                            {isConsolidated ? (
                              <div className="text-xs text-stone-800 whitespace-pre-line leading-relaxed min-h-[260px] p-1">
                                {consolidatedTermData.fleeting.notesOrRemarks || (
                                  <span className="text-stone-400 italic">
                                    Consolidated STAR observation notes from Instructional Supervisors will appear here once encoded.
                                  </span>
                                )}
                              </div>
                            ) : (
                              <textarea
                                rows={14}
                                value={activeSupervisorTermData.fleeting.notesOrRemarks}
                                onChange={(e) =>
                                  updateSupervisorNotes('fleeting', e.target.value)
                                }
                                placeholder={`Enter STAR (Situation, Task, Activity, Result) observation notes for ${activeSupervisor?.fullName}...`}
                                className="w-full h-full min-h-[260px] p-2 text-xs rounded border border-stone-200 hover:border-stone-300 focus:border-blue-700 focus:outline-none resize-none"
                              />
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================
          TABLE 3: M & E TOOL ON THE CHECKING-THE LESSON PLAN
          (MONITORING-TOOL-ON-THE-CHECKING-THE-LESSON-PLAN)
      ============================================================================ */}
      {(activeToolFilter === 'ALL' || activeToolFilter === 'lessonPlan') && (
        <div className="bg-white rounded-xl border border-stone-300 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  M &amp; E TOOL ON THE CHECKING-THE LESSON PLAN
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isConsolidated
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isConsolidated
                    ? `CONSOLIDATED REPORT (${supervisors.length} Instructional Supervisors)`
                    : `SUPERVISOR ENCODING: ${activeSupervisor?.fullName}`}
                </span>
              </div>
              <h4 className="text-xs font-bold text-stone-900 mt-1">
                MONITORING-TOOL-ON-THE-CHECKING-THE-LESSON-PLAN ({selectedTerm})
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenPrintToPdf('lessonPlan')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                title="Print or Save Monitoring Tool on the Checking-The Lesson Plan as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-amber-200" />
                <span>Print to PDF</span>
              </button>
              {!isConsolidated && (
                <>
                  <button
                    type="button"
                    onClick={handleSyncLessonPlanFromRecords}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    title="Sync E and NE counts from logged Weekly Lesson Plans"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync from Lesson Plans</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToolReportToAdmin('lessonPlan')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-200" />
                    <span>Send Report to Administrator</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-stone-900">
              <thead>
                <tr>
                  <th
                    colSpan={8}
                    className="border border-stone-800 px-3 py-2 text-center font-bold uppercase bg-white tracking-wide"
                  >
                    MONITORING-TOOL-ON-THE-CHECKING-THE-LESSON-PLAN
                    {isConsolidated ? ' — CONSOLIDATED SCHOOL REPORT' : ''}
                  </th>
                </tr>
                <tr>
                  <th className="border border-stone-800 px-3 py-3 text-center font-bold uppercase bg-white w-80">
                    FOCUS
                  </th>
                  <th className="border border-stone-800 px-3 py-3 text-center font-bold uppercase bg-white w-56">
                    INDICATORS
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-16">
                    E
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-24">
                    Percentage
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-16">
                    NE
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-24">
                    Percentage
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-44">
                    Number of Teachers being observed through fleeting/walkthrough
                  </th>
                  <th className="border border-stone-800 px-3 py-3 text-left font-normal bg-white w-64">
                    Brief Evidence/Notes
                    <br />
                    (Use STAR (Situation, Task, Activity and Result in noting the observation)
                  </th>
                </tr>
              </thead>
              <tbody>
                {LESSON_PLAN_TABLE_ROWS.map((row, idx) => {
                  const totalTeachers = isConsolidated
                    ? consolidatedTermData.lessonPlan.teacherCount
                    : activeSupervisorTermData.lessonPlan.teacherCount;

                  let eDisplay = '';
                  let neDisplay = '';

                  if (isConsolidated) {
                    const consRow = consolidatedTermData.lessonPlan.rows[row.id];
                    eDisplay = consRow?.hasValue ? String(consRow.e) : '';
                    neDisplay = consRow?.hasValue ? String(consRow.ne) : '';
                  } else {
                    const supRow = activeSupervisorTermData.lessonPlan.rows[row.id] || {
                      e: '',
                      ne: '',
                    };
                    eDisplay = supRow.e;
                    neDisplay = supRow.ne;
                  }

                  const ePct = computePct(eDisplay, totalTeachers);
                  const nePct = computePct(neDisplay, totalTeachers);

                  return (
                    <tr key={row.id} className="hover:bg-amber-50/20">
                      <td className="border border-stone-800 px-3 py-2.5 align-middle leading-snug">
                        {row.focus}
                      </td>
                      <td className="border border-stone-800 px-3 py-2.5 align-middle whitespace-pre-line">
                        {row.indicator}
                      </td>
                      <td className="border border-stone-800 p-1 text-center align-middle">
                        {isConsolidated ? (
                          <span className="font-bold text-stone-900">{eDisplay}</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={eDisplay}
                            onChange={(e) =>
                              updateSupervisorCell('lessonPlan', row.id, 'e', e.target.value)
                            }
                            placeholder=""
                            className="w-14 text-center py-1 rounded border border-stone-200 hover:border-stone-400 focus:border-amber-600 focus:bg-amber-50/40 focus:outline-none font-bold"
                          />
                        )}
                      </td>
                      <td className="border border-stone-800 px-2 py-2.5 text-center align-middle font-medium">
                        {ePct}
                      </td>
                      <td className="border border-stone-800 p-1 text-center align-middle">
                        {isConsolidated ? (
                          <span className="font-bold text-stone-900">{neDisplay}</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={neDisplay}
                            onChange={(e) =>
                              updateSupervisorCell('lessonPlan', row.id, 'ne', e.target.value)
                            }
                            placeholder=""
                            className="w-14 text-center py-1 rounded border border-stone-200 hover:border-stone-400 focus:border-amber-600 focus:bg-amber-50/40 focus:outline-none font-bold"
                          />
                        )}
                      </td>
                      <td className="border border-stone-800 px-2 py-2.5 text-center align-middle font-medium">
                        {nePct}
                      </td>
                      {idx === 0 && (
                        <>
                          <td
                            rowSpan={LESSON_PLAN_TABLE_ROWS.length}
                            className="border border-stone-800 p-2 text-center align-middle bg-white"
                          >
                            {isConsolidated ? (
                              <div className="space-y-1">
                                <div className="text-base font-extrabold text-stone-900">
                                  {totalTeachers}
                                </div>
                                <div className="text-[10px] text-stone-500">Consolidated Total</div>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                value={totalTeachers}
                                onChange={(e) =>
                                  updateSupervisorTeacherCount(
                                    'lessonPlan',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 text-center font-bold text-sm py-1.5 rounded border border-stone-300 hover:border-stone-400 focus:border-amber-600 focus:outline-none"
                              />
                            )}
                          </td>
                          <td
                            rowSpan={LESSON_PLAN_TABLE_ROWS.length}
                            className="border border-stone-800 p-2 align-top bg-white"
                          >
                            {isConsolidated ? (
                              <div className="text-xs text-stone-800 whitespace-pre-line leading-relaxed min-h-[160px] p-1">
                                {consolidatedTermData.lessonPlan.notesOrRemarks || (
                                  <span className="text-stone-400 italic">
                                    Consolidated STAR observation notes from Instructional Supervisors will appear here once encoded.
                                  </span>
                                )}
                              </div>
                            ) : (
                              <textarea
                                rows={8}
                                value={activeSupervisorTermData.lessonPlan.notesOrRemarks}
                                onChange={(e) =>
                                  updateSupervisorNotes('lessonPlan', e.target.value)
                                }
                                placeholder={`Enter STAR (Situation, Task, Activity, Result) observation notes for ${activeSupervisor?.fullName}...`}
                                className="w-full h-full min-h-[160px] p-2 text-xs rounded border border-stone-200 hover:border-stone-300 focus:border-amber-600 focus:outline-none resize-none"
                              />
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================
          TABLE 4: M & E TOOL ON CHECKING ASSESSMENT
          (MONITORING-TOOL-ON-CHECKING-ASSESSMENT)
      ============================================================================ */}
      {(activeToolFilter === 'ALL' || activeToolFilter === 'assessment') && (
        <div className="bg-white rounded-xl border border-stone-300 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  M &amp; E TOOL ON CHECKING ASSESSMENT
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isConsolidated
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isConsolidated
                    ? `CONSOLIDATED REPORT (${supervisors.length} Instructional Supervisors)`
                    : `SUPERVISOR ENCODING: ${activeSupervisor?.fullName}`}
                </span>
              </div>
              <h4 className="text-xs font-bold text-stone-900 mt-1">
                MONITORING-TOOL-ON-CHECKING-ASSESSMENT ({selectedTerm})
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenPrintToPdf('assessment')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                title="Print or Save Monitoring Tool on Checking Assessment as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-amber-200" />
                <span>Print to PDF</span>
              </button>
              {!isConsolidated && (
                <>
                  <button
                    type="button"
                    onClick={handleSyncAssessmentFromRecords}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    title="Sync E and NE counts from logged Assessment records"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync from Assessments</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToolReportToAdmin('assessment')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-200" />
                    <span>Send Report to Administrator</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-stone-900">
              <thead>
                <tr>
                  <th
                    colSpan={8}
                    className="border border-stone-800 px-3 py-2 text-center font-bold uppercase bg-white tracking-wide"
                  >
                    MONITORING-TOOL-ON-CHECKING-ASSESSMENT
                    {isConsolidated ? ' — CONSOLIDATED SCHOOL REPORT' : ''}
                  </th>
                </tr>
                <tr>
                  <th className="border border-stone-800 px-3 py-3 text-center font-bold uppercase bg-white w-80">
                    FOCUS
                  </th>
                  <th className="border border-stone-800 px-3 py-3 text-center font-bold uppercase bg-white w-56">
                    INDICATORS
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-16">
                    E
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-24">
                    Percentage
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-16">
                    NE
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-24">
                    Percentage
                  </th>
                  <th className="border border-stone-800 px-2 py-3 text-center font-bold bg-white w-44">
                    Number of Teachers being observed through fleeting/walkthrough
                  </th>
                  <th className="border border-stone-800 px-3 py-3 text-left font-normal bg-white w-64">
                    Brief Evidence/Notes
                    <br />
                    (Use STAR (Situation, Task, Activity and Result in noting the observation)
                  </th>
                </tr>
              </thead>
              <tbody>
                {ASSESSMENT_TABLE_ROWS.map((row, idx) => {
                  const totalTeachers = isConsolidated
                    ? consolidatedTermData.assessment.teacherCount
                    : activeSupervisorTermData.assessment.teacherCount;

                  let eDisplay = '';
                  let neDisplay = '';

                  if (isConsolidated) {
                    const consRow = consolidatedTermData.assessment.rows[row.id];
                    eDisplay = consRow?.hasValue ? String(consRow.e) : '';
                    neDisplay = consRow?.hasValue ? String(consRow.ne) : '';
                  } else {
                    const supRow = activeSupervisorTermData.assessment.rows[row.id] || {
                      e: '',
                      ne: '',
                    };
                    eDisplay = supRow.e;
                    neDisplay = supRow.ne;
                  }

                  const ePct = computePct(eDisplay, totalTeachers);
                  const nePct = computePct(neDisplay, totalTeachers);

                  return (
                    <tr key={row.id} className="hover:bg-teal-50/20">
                      <td className="border border-stone-800 px-3 py-2.5 align-middle leading-snug">
                        {row.focus}
                      </td>
                      <td className="border border-stone-800 px-3 py-2.5 align-middle whitespace-pre-line">
                        {row.indicator}
                      </td>
                      <td className="border border-stone-800 p-1 text-center align-middle">
                        {isConsolidated ? (
                          <span className="font-bold text-stone-900">{eDisplay}</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={eDisplay}
                            onChange={(e) =>
                              updateSupervisorCell('assessment', row.id, 'e', e.target.value)
                            }
                            placeholder=""
                            className="w-14 text-center py-1 rounded border border-stone-200 hover:border-stone-400 focus:border-teal-800 focus:bg-teal-50/40 focus:outline-none font-bold"
                          />
                        )}
                      </td>
                      <td className="border border-stone-800 px-2 py-2.5 text-center align-middle font-medium">
                        {ePct}
                      </td>
                      <td className="border border-stone-800 p-1 text-center align-middle">
                        {isConsolidated ? (
                          <span className="font-bold text-stone-900">{neDisplay}</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={neDisplay}
                            onChange={(e) =>
                              updateSupervisorCell('assessment', row.id, 'ne', e.target.value)
                            }
                            placeholder=""
                            className="w-14 text-center py-1 rounded border border-stone-200 hover:border-stone-400 focus:border-teal-800 focus:bg-teal-50/40 focus:outline-none font-bold"
                          />
                        )}
                      </td>
                      <td className="border border-stone-800 px-2 py-2.5 text-center align-middle font-medium">
                        {nePct}
                      </td>
                      {idx === 0 && (
                        <>
                          <td
                            rowSpan={ASSESSMENT_TABLE_ROWS.length}
                            className="border border-stone-800 p-2 text-center align-middle bg-white"
                          >
                            {isConsolidated ? (
                              <div className="space-y-1">
                                <div className="text-base font-extrabold text-stone-900">
                                  {totalTeachers}
                                </div>
                                <div className="text-[10px] text-stone-500">Consolidated Total</div>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                value={totalTeachers}
                                onChange={(e) =>
                                  updateSupervisorTeacherCount(
                                    'assessment',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 text-center font-bold text-sm py-1.5 rounded border border-stone-300 hover:border-stone-400 focus:border-teal-800 focus:outline-none"
                              />
                            )}
                          </td>
                          <td
                            rowSpan={ASSESSMENT_TABLE_ROWS.length}
                            className="border border-stone-800 p-2 align-top bg-white"
                          >
                            {isConsolidated ? (
                              <div className="text-xs text-stone-800 whitespace-pre-line leading-relaxed min-h-[160px] p-1">
                                {consolidatedTermData.assessment.notesOrRemarks || (
                                  <span className="text-stone-400 italic">
                                    Consolidated STAR observation notes from Instructional Supervisors will appear here once encoded.
                                  </span>
                                )}
                              </div>
                            ) : (
                              <textarea
                                rows={8}
                                value={activeSupervisorTermData.assessment.notesOrRemarks}
                                onChange={(e) =>
                                  updateSupervisorNotes('assessment', e.target.value)
                                }
                                placeholder={`Enter STAR (Situation, Task, Activity, Result) observation notes for ${activeSupervisor?.fullName}...`}
                                className="w-full h-full min-h-[160px] p-2 text-xs rounded border border-stone-200 hover:border-stone-300 focus:border-teal-800 focus:outline-none resize-none"
                              />
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================
          PRINT TO PDF PREVIEW MODAL FOR ANY SELECTED M & E TOOL TABLE
      ============================================================================ */}
      {printingTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-6xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] text-white px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <FileText className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="text-sm font-bold flex flex-wrap items-center gap-2">
                    <span>{getToolMeta(printingTool).badge} — Print to PDF</span>
                    <span className="text-[10px] bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full font-extrabold">
                      {isConsolidated ? 'Consolidated Report' : 'Supervisor Report'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/90">
                    Official DepEd Hard-Copy Layout ({selectedTerm.replace('Term', 'Term ')}) · Choose &quot;Save as PDF&quot; in the Print destination
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => executeIframePrint(printingTool)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-extrabold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPrintableHtml(printingTool)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Printable File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintingTool(null)}
                  className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto bg-stone-100">
              <div className="bg-white border border-stone-300 shadow-sm rounded-lg p-6 mx-auto max-w-5xl text-stone-900">
                <div className="text-center border-b-2 border-[#701628] pb-3 mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold">
                    Republic of the Philippines
                  </p>
                  <p className="text-xs uppercase tracking-wider text-stone-800 font-bold">
                    Department of Education
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Caraga Administrative Region XIII · Schools Division of Surigao del Sur
                  </p>
                  <h2 className="text-base font-extrabold text-[#701628] uppercase mt-1">
                    {schoolProfile.schoolName}
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    School ID: {schoolProfile.schoolId} · {schoolProfile.address}
                  </p>
                  <div className="mt-2 inline-block bg-amber-50 border border-amber-300 text-[#701628] font-extrabold text-xs px-4 py-1 rounded uppercase">
                    {getToolMeta(printingTool).title} —{' '}
                    {isConsolidated
                      ? 'CONSOLIDATED SCHOOL REPORT'
                      : `SUPERVISOR REPORT (${activeSupervisor?.fullName})`}
                  </div>
                </div>

                <div
                  className="overflow-x-auto"
                  dangerouslySetInnerHTML={{
                    __html: buildPrintableTableHtml(printingTool),
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-4 text-center text-xs">
                  <div>
                    <div className="border-b border-stone-900 pb-1 font-bold text-stone-900">
                      {isConsolidated
                        ? currentUser.fullName
                        : activeSupervisor?.fullName || currentUser.fullName}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">
                      Prepared by:{' '}
                      {isConsolidated
                        ? 'Consolidated M & E Report'
                        : `${activeSupervisor?.position || 'Instructional Supervisor'}`}
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-stone-900 pb-1 font-bold text-stone-900">
                      Instructional Supervision &amp; M&amp;E Committee
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">
                      Reviewed by: Master Teacher / Department Head
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-stone-900 pb-1 font-bold text-stone-900">
                      {schoolProfile.principalName}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">
                      {schoolProfile.principalTitle} — School Head
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
