import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { DEPED_COT_INDICATORS } from '../data/initialData';
import { ClassroomObservation, CotIndicatorRating, PMCFRecord, FarRecord, getPmcfCategory, getFarCategory } from '../types';
import { PrintClassroomObservationTableModal } from '../components/PrintClassroomObservationTableModal';
import { PrintPmcfReportModal } from '../components/PrintPmcfReportModal';
import { PrintFarReportModal } from '../components/PrintFarReportModal';
import {
  matchesRoleSupervisionScope,
  SupervisionScopeBanner,
  resolveRecordSupervisor,
  resolveRecordSupervisorName,
  resolveActiveSupervisorForUser,
  getScopedTeachersForModal,
} from '../utils/supervisionScope';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle,
  CheckCircle2,
  Clock,
  Check,
  Edit2,
  FileDown,
  FileText,
  Printer,
  ChevronDown,
  X,
} from 'lucide-react';

interface CotObservationViewProps {
  onSelectObservationForPrint: (obsId: string) => void;
}

export interface ClassroomMonitoringItem {
  id: number;
  numberLabel: string;
  title: string;
  movs: string;
}

export interface ClassroomMonitoringSection {
  sectionTitle: string;
  items: ClassroomMonitoringItem[];
}

export const CLASSROOM_OBSERVATION_SECTIONS: ClassroomMonitoringSection[] = [
  {
    sectionTitle: 'Before Classroom Observation',
    items: [
      {
        id: 1,
        numberLabel: '1.',
        title:
          'The ratee (teacher) and the rater (observer) agree on the schedule of classroom observations at least three (3) working days before the classroom observation.',
        movs: 'MOVs: Instructional Supervisory Plan with Classroom Observation schedule.',
      },
      {
        id: 2,
        numberLabel: '2.',
        title:
          'Lesson plan of teachers to be observed is submitted to the observer at least two (2) days before the actual conduct of classroom observations.',
        movs: 'MOVs: Corrected DLP, FAR or PMCF.',
      },
      {
        id: 3,
        numberLabel: '3.',
        title:
          'A pre-observation conference is conducted to review the classroom observation tools and the list of classroom observable indicators.',
        movs: 'MOVs: FAR or PMCF. DLP with annotations.',
      },
      {
        id: 4,
        numberLabel: '4.',
        title:
          'The agreement of ratee (teachers) and the raters (observers) during the pre-observation conference is addressed.',
        movs: 'MOVs: Revised/ Annotated Lesson plan',
      },
    ],
  },
  {
    sectionTitle: 'Actual Classroom Observation',
    items: [
      {
        id: 5,
        numberLabel: '1.',
        title:
          'The ratee (teacher) delivers the lesson following the lesson plan and adheres to the prescribed number of minutes per learning area',
        movs: 'MOVs: Classroom observation notes.',
      },
      {
        id: 6,
        numberLabel: '2.',
        title:
          'The rater (observer) uses observation notes to record comments and observations on the teacher’s performance.',
        movs: 'MOVs: Classroom observation notes.',
      },
      {
        id: 7,
        numberLabel: '3.',
        title:
          'Highly proficient teachers (if available) observe the classroom observation process for mentoring and coaching activities.',
        movs: 'MOVs: PMCF/ Observation Notes.',
      },
    ],
  },
  {
    sectionTitle: 'Post Classroom Observation',
    items: [
      {
        id: 8,
        numberLabel: '1.',
        title:
          'The raters rate the performance of teachers using the classroom observation tool appropriate to the level. (Proficient or Highly Proficient Level)',
        movs: 'MOVs: Filled in Classroom Observation Tools.',
      },
      {
        id: 9,
        numberLabel: '2.',
        title:
          'If there are multiple observers in secondary, only subject specialist rates the objective no. 1. In elementary school, all observers’ rate objective 1.',
        movs: 'MOVs: Filled in Classroom Observation Tools.',
      },
      {
        id: 10,
        numberLabel: '3.',
        title:
          'In case of multiple raters, the raters discuss the individual ratings and come up with a final rating',
        movs: 'MOVs: Inter-Rater Agreement Form.',
      },
      {
        id: 11,
        numberLabel: '4.',
        title:
          'The rater (observer) conducts post observation conference with the ratee to discuss the experiences and reflect on the strengths and areas for improvement',
        movs: 'MOVs: FAR or PMCF.',
      },
      {
        id: 12,
        numberLabel: '5.',
        title: 'The post conference is conducted in a supportive and friendly environment',
        movs: 'MOVs: FAR or PMCF.',
      },
      {
        id: 13,
        numberLabel: '6.',
        title:
          'The rater (observer) provides mentoring and coaching activities to improve or enhance teachers’ performance',
        movs: 'MOVs: PMCF.',
      },
    ],
  },
];

export const ALL_CLASSROOM_MONITORING_ITEMS: ClassroomMonitoringItem[] =
  CLASSROOM_OBSERVATION_SECTIONS.flatMap((section) => section.items);

export const CotObservationView: React.FC<CotObservationViewProps> = ({
  onSelectObservationForPrint,
}) => {
  const {
    observations,
    teachers,
    supervisors,
    addObservation,
    deleteObservation,
    pmcfRecords,
    addPMCFRecord,
    updatePMCFRecord,
    deletePMCFRecord,
    farRecords,
    addFarRecord,
    updateFarRecord,
    verifyFarRecord,
    deleteFarRecord,
  } = useData();
  const { currentUser, isAdmin, isSupervisor, isTeacher, isMentor } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupervisorFilterId, setSelectedSupervisorFilterId] = useState('All');
  const [selectedFilterTeacher, setSelectedFilterTeacher] = useState('All');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedTerm, setSelectedTerm] = useState('All');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [modalObservationType, setModalObservationType] = useState<'cot-pmes' | 'classroom'>('cot-pmes');

  const scopedTeachers = getScopedTeachersForModal(currentUser, teachers, supervisors);
  const modalTeachers = scopedTeachers.length > 0 ? scopedTeachers : teachers;

  // Export Classroom Observation Table PDF Modal State
  const [isExportClassroomPdfOpen, setIsExportClassroomPdfOpen] = useState(false);

  // PMCF in Classroom Observation Modal & Print State
  const [isPmcfModalOpen, setIsPmcfModalOpen] = useState(false);
  const [editingPmcf, setEditingPmcf] = useState<PMCFRecord | null>(null);
  const [pmcfTeacherId, setPmcfTeacherId] = useState(teachers[0]?.id || '');
  const [pmcfQuarterTerm, setPmcfQuarterTerm] = useState('Term 1');
  const [pmcfCoachingMechanism, setPmcfCoachingMechanism] =
    useState<PMCFRecord['coachingMechanism']>('Individual Conference');
  const [pmcfCriticalIncidentDescription, setPmcfCriticalIncidentDescription] = useState('');
  const [pmcfActionPlanOutput, setPmcfActionPlanOutput] = useState('');
  const [pmcfImpactOnJobPerformance, setPmcfImpactOnJobPerformance] = useState('');
  const [pmcfStatus, setPmcfStatus] = useState<PMCFRecord['status']>('In Progress');
  const [isPrintPmcfModalOpen, setIsPrintPmcfModalOpen] = useState(false);
  const [selectedPmcfRecordIdForPrint, setSelectedPmcfRecordIdForPrint] = useState<string | null>(
    null
  );

  // FAR for Classroom Observation Modal & Print State
  const [isFarModalOpen, setIsFarModalOpen] = useState(false);
  const [editingFar, setEditingFar] = useState<FarRecord | null>(null);
  const [farTeacherId, setFarTeacherId] = useState(teachers[0]?.id || '');
  const [farTerm, setFarTerm] = useState<'Term 1' | 'Term 2' | 'Term 3' | string>('Term 1');
  const [farLessonPlanWeek, setFarLessonPlanWeek] = useState('Week 1');
  const [farFindings, setFarFindings] = useState('');
  const [farAnalysis, setFarAnalysis] = useState('');
  const [farRecommendations, setFarRecommendations] = useState('');
  const [farStatus, setFarStatus] = useState<'In Progress' | 'Verified'>('In Progress');
  const [isPrintFarModalOpen, setIsPrintFarModalOpen] = useState(false);
  const [selectedFarRecordIdForPrint, setSelectedFarRecordIdForPrint] = useState<string | null>(
    null
  );

  // New Observation Form State
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(
    teachers[0]?.assignedSupervisorId || supervisors[0]?.id || ''
  );
  const [gradeAndSection, setGradeAndSection] = useState('Grade 9 - Ruby');
  const [subjectTaught, setSubjectTaught] = useState('Science 9');
  const [topicTitle, setTopicTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeStart, setTimeStart] = useState('08:30 AM');
  const [timeEnd, setTimeEnd] = useState('09:30 AM');
  const [quarterTerm, setQuarterTerm] = useState<'Term 1' | 'Term 2' | 'Term 3' | string>('Term 1');
  const [preConferenceNotes, setPreConferenceNotes] = useState('');
  const [postConferenceNotes, setPostConferenceNotes] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasForDevelopment, setAreasForDevelopment] = useState('');

  // 9 Indicator Ratings (default to 5)
  const [indicatorScores, setIndicatorScores] = useState<Record<number, number>>({
    1: 5,
    2: 5,
    3: 5,
    4: 5,
    5: 5,
    6: 5,
    7: 5,
    8: 5,
    9: 5,
  });

  // 13 Indicator E/NE Status for Classroom Observation Monitoring Tool (default to 'E' = Evident)
  const [indicatorEvident, setIndicatorEvident] = useState<Record<number, 'E' | 'NE'>>({
    1: 'E',
    2: 'E',
    3: 'E',
    4: 'E',
    5: 'E',
    6: 'E',
    7: 'E',
    8: 'E',
    9: 'E',
    10: 'E',
    11: 'E',
    12: 'E',
    13: 'E',
  });

  const [indicatorComments, setIndicatorComments] = useState<Record<number, string>>({});

  // Available Teacher Names and Grade Levels for filter dropdowns (strictly scoped)
  const visibleTeachersForFilter = isAdmin ? teachers : scopedTeachers;
  const teacherFilterOptions = Array.from(
    new Set([
      ...visibleTeachersForFilter.map((t) => t.fullName),
      ...observations
        .filter((o) =>
          matchesRoleSupervisionScope(
            o,
            currentUser,
            teachers,
            supervisors,
            selectedSupervisorFilterId
          )
        )
        .map((o) => o.teacherName),
    ])
  ).sort();

  const gradeLevelOptions = [
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12',
  ];

  // Filtered observations
  const filteredObservations = observations.filter((obs) => {
    if (
      !matchesRoleSupervisionScope(
        obs,
        currentUser,
        teachers,
        supervisors,
        selectedSupervisorFilterId
      )
    ) {
      return false;
    }
    const supName = resolveRecordSupervisorName(obs, teachers, supervisors);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      obs.teacherName.toLowerCase().includes(q) ||
      obs.observationNo.toLowerCase().includes(q) ||
      obs.subjectTaught.toLowerCase().includes(q) ||
      obs.gradeAndSection.toLowerCase().includes(q) ||
      obs.supervisorName.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q) ||
      (obs.topicTitle && obs.topicTitle.toLowerCase().includes(q));
    const matchesTeacher =
      selectedFilterTeacher === 'All' || obs.teacherName === selectedFilterTeacher;
    const matchesGrade =
      selectedGradeLevel === 'All' ||
      obs.gradeAndSection.toLowerCase().includes(selectedGradeLevel.toLowerCase());
    const matchesDept = selectedDepartment === 'All' || obs.department === selectedDepartment;
    const matchesTerm = selectedTerm === 'All' || obs.quarterTerm === selectedTerm;
    return matchesSearch && matchesTeacher && matchesGrade && matchesDept && matchesTerm;
  });

  const cotPmesObservations = filteredObservations.filter(
    (obs) => obs.evaluationType !== 'classroom'
  );
  const classroomMonitoringObservations = filteredObservations.filter(
    (obs) => obs.evaluationType === 'classroom'
  );

  // Filtered PMCF for COT-PMES records
  const filteredPmcfRecords = pmcfRecords.filter((r) => {
    if (getPmcfCategory(r) !== 'cot-pmes') return false;
    if (
      !matchesRoleSupervisionScope(
        r,
        currentUser,
        teachers,
        supervisors,
        selectedSupervisorFilterId
      )
    ) {
      return false;
    }
    const supName = resolveRecordSupervisorName(r, teachers, supervisors);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.teacherName.toLowerCase().includes(q) ||
      r.recordNo.toLowerCase().includes(q) ||
      r.criticalIncidentDescription.toLowerCase().includes(q) ||
      r.actionPlanOutput.toLowerCase().includes(q) ||
      r.supervisorName.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q);
    const matchesTeacher =
      selectedFilterTeacher === 'All' || r.teacherName === selectedFilterTeacher;
    const matchesTerm = selectedTerm === 'All' || r.quarterTerm === selectedTerm;
    return matchesSearch && matchesTeacher && matchesTerm;
  });

  // Filtered FAR for COT-PMES records
  const filteredFarRecords = farRecords.filter((r) => {
    if (getFarCategory(r) !== 'cot-pmes') return false;
    if (
      !matchesRoleSupervisionScope(
        r,
        currentUser,
        teachers,
        supervisors,
        selectedSupervisorFilterId
      )
    ) {
      return false;
    }
    const supName = resolveRecordSupervisorName(r, teachers, supervisors);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.teacherName.toLowerCase().includes(q) ||
      r.farCode.toLowerCase().includes(q) ||
      r.lessonPlanWeek.toLowerCase().includes(q) ||
      r.findings.toLowerCase().includes(q) ||
      r.analysis.toLowerCase().includes(q) ||
      r.recommendations.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q);
    const matchesTeacher =
      selectedFilterTeacher === 'All' || r.teacherName === selectedFilterTeacher;
    const matchesTerm = selectedTerm === 'All' || r.term === selectedTerm;
    return matchesSearch && matchesTeacher && matchesTerm;
  });

  const handleOpenAddPmcf = () => {
    setEditingPmcf(null);
    setPmcfTeacherId(scopedTeachers[0]?.id || teachers[0]?.id || '');
    setPmcfQuarterTerm('Term 1');
    setPmcfCoachingMechanism('COT-PMES');
    setPmcfCriticalIncidentDescription('');
    setPmcfActionPlanOutput('');
    setPmcfImpactOnJobPerformance('');
    setPmcfStatus('In Progress');
    setIsPmcfModalOpen(true);
  };

  const handleOpenEditPmcf = (r: PMCFRecord) => {
    setEditingPmcf(r);
    setPmcfTeacherId(r.teacherId);
    setPmcfQuarterTerm(r.quarterTerm);
    setPmcfCoachingMechanism(r.coachingMechanism);
    setPmcfCriticalIncidentDescription(r.criticalIncidentDescription);
    setPmcfActionPlanOutput(r.actionPlanOutput);
    setPmcfImpactOnJobPerformance(r.impactOnJobPerformance);
    setPmcfStatus(r.status);
    setIsPmcfModalOpen(true);
  };

  const handleSavePmcf = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === pmcfTeacherId) || teachers[0];
    if (!teacher) return;
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors);
    if (editingPmcf) {
      updatePMCFRecord(editingPmcf.id, {
        category: 'cot-pmes',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || editingPmcf.supervisorId,
        supervisorName: resolvedSup?.fullName || editingPmcf.supervisorName,
        quarterTerm: pmcfQuarterTerm,
        criticalIncidentDescription: pmcfCriticalIncidentDescription,
        coachingMechanism: pmcfCoachingMechanism,
        actionPlanOutput: pmcfActionPlanOutput,
        impactOnJobPerformance:
          pmcfImpactOnJobPerformance || 'Pending post-coaching assessment evaluation.',
        status: pmcfStatus,
      });
    } else {
      addPMCFRecord({
        category: 'cot-pmes',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || currentUser?.id || 'system',
        supervisorName: resolvedSup?.fullName || currentUser?.fullName || 'Instructional Supervisor',
        date: new Date().toISOString().slice(0, 10),
        quarterTerm: pmcfQuarterTerm,
        criticalIncidentDescription: pmcfCriticalIncidentDescription,
        coachingMechanism: pmcfCoachingMechanism,
        actionPlanOutput: pmcfActionPlanOutput,
        impactOnJobPerformance:
          pmcfImpactOnJobPerformance || 'Pending post-coaching assessment evaluation.',
        status: pmcfStatus,
      });
    }
    setIsPmcfModalOpen(false);
    setEditingPmcf(null);
    setPmcfCriticalIncidentDescription('');
    setPmcfActionPlanOutput('');
    setPmcfImpactOnJobPerformance('');
  };

  const handleOpenAddFar = () => {
    setEditingFar(null);
    setFarTeacherId(scopedTeachers[0]?.id || teachers[0]?.id || '');
    setFarTerm('Term 1');
    setFarLessonPlanWeek('Week 1');
    setFarFindings('');
    setFarAnalysis('');
    setFarRecommendations('');
    setFarStatus('In Progress');
    setIsFarModalOpen(true);
  };

  const handleOpenEditFar = (r: FarRecord) => {
    setEditingFar(r);
    setFarTeacherId(r.teacherId);
    setFarTerm(r.term);
    setFarLessonPlanWeek(r.lessonPlanWeek);
    setFarFindings(r.findings);
    setFarAnalysis(r.analysis);
    setFarRecommendations(r.recommendations);
    setFarStatus(r.status);
    setIsFarModalOpen(true);
  };

  const handleSaveFar = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === farTeacherId) || teachers[0];
    if (!teacher) return;
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors);
    if (editingFar) {
      updateFarRecord(editingFar.id, {
        category: 'cot-pmes',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || editingFar.supervisorId,
        supervisorName: resolvedSup?.fullName || editingFar.supervisorName,
        term: farTerm,
        lessonPlanWeek: farLessonPlanWeek.trim() || 'Week 1',
        findings: farFindings.trim(),
        analysis: farAnalysis.trim(),
        recommendations: farRecommendations.trim(),
        status: farStatus,
        actionTaken: farStatus === 'Verified',
      });
    } else {
      addFarRecord({
        category: 'cot-pmes',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || currentUser?.id || 'system',
        supervisorName: resolvedSup?.fullName || currentUser?.fullName || 'Instructional Supervisor',
        term: farTerm,
        lessonPlanWeek: farLessonPlanWeek.trim() || 'Week 1',
        findings: farFindings.trim(),
        analysis: farAnalysis.trim(),
        recommendations: farRecommendations.trim(),
      });
    }
    setIsFarModalOpen(false);
    setEditingFar(null);
    setFarFindings('');
    setFarAnalysis('');
    setFarRecommendations('');
  };

  const handleScoreChange = (id: number, score: number) => {
    setIndicatorScores((prev) => ({ ...prev, [id]: score }));
  };

  const handleEvidentChange = (id: number, status: 'E' | 'NE') => {
    setIndicatorEvident((prev) => ({ ...prev, [id]: status }));
  };

  const handleCommentChange = (id: number, text: string) => {
    setIndicatorComments((prev) => ({ ...prev, [id]: text }));
  };

  const calculateAverage = () => {
    const values = Object.values(indicatorScores);
    const sum = values.reduce((a, b) => a + b, 0);
    return Number((sum / values.length).toFixed(2));
  };

  const getOverallRating = (avg: number): ClassroomObservation['overallRating'] => {
    if (avg >= 5.5) return 'Outstanding';
    if (avg >= 4.5) return 'Very Satisfactory';
    if (avg >= 3.5) return 'Satisfactory';
    return 'Unsatisfactory';
  };

  const handleSaveObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    if (!teacher) return;

    const isClassroomMode = modalObservationType === 'classroom';
    const evidentCount = ALL_CLASSROOM_MONITORING_ITEMS.filter(
      (item) => (indicatorEvident[item.id] || 'E') === 'E'
    ).length;
    const avg = isClassroomMode
      ? Number(((evidentCount / ALL_CLASSROOM_MONITORING_ITEMS.length) * 4 + 3).toFixed(2))
      : calculateAverage();

    const ratings: CotIndicatorRating[] = isClassroomMode
      ? ALL_CLASSROOM_MONITORING_ITEMS.map((item) => ({
          indicatorId: item.id,
          title: `${item.numberLabel} ${item.title} (${item.movs})`,
          score: (indicatorEvident[item.id] || 'E') === 'E' ? 7 : 3,
          evidentStatus: indicatorEvident[item.id] || 'E',
          comments: indicatorComments[item.id] || '',
        }))
      : DEPED_COT_INDICATORS.map((ind) => ({
          indicatorId: ind.id,
          title: ind.title,
          score: indicatorScores[ind.id] || 5,
          comments: indicatorComments[ind.id] || '',
        }));

    const selectedSupervisor = supervisors.find((s) => s.id === selectedSupervisorId);
    const observerId = selectedSupervisor ? selectedSupervisor.id : currentUser?.id || 'system';
    const observerName = selectedSupervisor
      ? selectedSupervisor.fullName
      : currentUser?.fullName || 'Instructional Supervisor';

    addObservation({
      evaluationType: modalObservationType,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      department: teacher.department,
      supervisorId: observerId,
      supervisorName: observerName,
      date,
      timeStart,
      timeEnd,
      quarterTerm,
      schoolYear: '2026-2027',
      gradeAndSection,
      subjectTaught,
      topicTitle: topicTitle || 'Standard Curriculum Competency Lesson',
      ratings,
      generalObservations: `Observation conducted by ${observerName}. Demonstrated competency in classroom instructional delivery.`,
      strengths: strengths || 'Clear instructional alignment and structured student engagement.',
      areasForDevelopment: areasForDevelopment || 'Continue fostering higher-order inquiry questions.',
      preConferenceNotes: preConferenceNotes || 'Agreed on focal indicators prior to classroom entry.',
      postConferenceNotes: postConferenceNotes || 'Reviewed rubric scores and discussed feedback collaboratively.',
      averageScore: avg,
      overallRating: isClassroomMode
        ? evidentCount >= 7
          ? 'Evident'
          : 'Not Evident'
        : getOverallRating(avg),
      status: 'Completed',
      acknowledgedByTeacher: true,
      teacherSignatureDate: date,
    });

    setIsNewModalOpen(false);
    // Reset inputs
    setTopicTitle('');
    setStrengths('');
    setAreasForDevelopment('');
    setPreConferenceNotes('');
    setPostConferenceNotes('');
  };

  if (isMentor) {
    return (
      <div className="bg-white rounded-2xl border border-violet-200 p-8 shadow-xs max-w-2xl mx-auto my-8 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 text-violet-800 mx-auto">
          <ClipboardCheck className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-stone-900">
          Mentor Access Scope Notice
        </h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          COT-PMES Classroom Observations are managed exclusively by Instructional Supervisors and the School Principal. Your Mentor account is authorized to manage{' '}
          <strong className="text-violet-900">Lesson Plans (DLL/DLP)</strong>,{' '}
          <strong className="text-violet-900">Formative &amp; Summative Assessments</strong>, and{' '}
          <strong className="text-violet-900">Instructional Materials &amp; Learners&apos; Materials (IMs &amp; LMs)</strong> for your assigned mentees.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
            <span>DepEd Classroom Observation Tool (COT-PMES)</span>
            <span aria-hidden="true">·</span>
            <span>PPST Indicator Assessment</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Instructional Observation Records & Rubric Evaluations
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Formal classroom supervision evaluating Philippine Professional Standards for Teachers (PPST)
          </p>
        </div>

        {!isTeacher && (
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => {
                setModalObservationType('cot-pmes');
                setIsNewModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Conduct New COT-PMES Observation</span>
            </button>
            <button
              onClick={handleOpenAddPmcf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>PMCF for COT-PMES</span>
            </button>
            <button
              onClick={handleOpenAddFar}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>FAR for COT-PMES</span>
            </button>
          </div>
        )}
      </div>

      {/* Instructional Supervisor Output Scope Banner / Filter */}
      <SupervisionScopeBanner
        selectedSupervisorFilterId={selectedSupervisorFilterId}
        onChangeSupervisorFilterId={setSelectedSupervisorFilterId}
        currentUser={currentUser}
        teachers={teachers}
        supervisors={supervisors}
        moduleLabel="COT-PMES Observation, PMCF for COT & FAR for COT Tables"
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search teacher, grade, code, subject, or observer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5 text-[#701628]" />
            <span>Filters:</span>
          </div>

          {!isTeacher && (
            <select
              value={selectedFilterTeacher}
              onChange={(e) => setSelectedFilterTeacher(e.target.value)}
              aria-label="Filter by Teacher Name"
              className="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#701628]"
            >
              <option value="All">All Teachers</option>
              {teacherFilterOptions.map((teacherName) => (
                <option key={teacherName} value={teacherName}>
                  {teacherName}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedGradeLevel}
            onChange={(e) => setSelectedGradeLevel(e.target.value)}
            aria-label="Filter by Grade Level"
            className="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#701628]"
          >
            <option value="All">All Grade Levels</option>
            {gradeLevelOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            aria-label="Filter by Department"
            className="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#701628]"
          >
            <option value="All">All Departments</option>
            <option value="Junior High School">Junior High School</option>
            <option value="Senior High School">Senior High School</option>
          </select>

          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            aria-label="Filter by Term"
            className="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#701628]"
          >
            <option value="All">All Terms</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>

          {(searchQuery !== '' ||
            selectedFilterTeacher !== 'All' ||
            selectedGradeLevel !== 'All' ||
            selectedDepartment !== 'All' ||
            selectedTerm !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedFilterTeacher('All');
                setSelectedGradeLevel('All');
                setSelectedDepartment('All');
                setSelectedTerm('All');
              }}
              className="text-[11px] font-semibold text-[#701628] hover:underline px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table 1: COT-PMES Observation Records Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Conduct New COT-PMES Observation Table
            </h3>
            <p className="text-[11px] text-stone-500">
              Philippine Professional Standards for Teachers · 9 Core Indicators (Scale: 3 to 7)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#701628]/10 text-[#701628]">
              {cotPmesObservations.length} {cotPmesObservations.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={() => setIsExportClassroomPdfOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Print / Export COT-PMES Observation Table to PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print to PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">COT Code</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Teacher Observed</th>
                <th className="py-3 px-4">Subject & Section</th>
                <th className="py-3 px-4">Assigned Instructional Supervisor</th>
                <th className="py-3 px-4 text-center">Score (Scale 3-7)</th>
                <th className="py-3 px-4">DepEd Rating</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {cotPmesObservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No COT-PMES observation records found matching criteria.
                  </td>
                </tr>
              ) : (
                cotPmesObservations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#701628]">
                      {obs.observationNo}
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      <div>{obs.date}</div>
                      <div className="text-[10px] text-stone-400">
                        {obs.timeStart} - {obs.timeEnd}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{obs.teacherName}</div>
                      <div className="text-[11px] text-stone-500">{obs.department}</div>
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      <div className="font-medium">{obs.subjectTaught}</div>
                      <div className="text-[11px] text-stone-500">{obs.gradeAndSection}</div>
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      <div className="font-medium">
                        {resolveRecordSupervisorName(obs, teachers, supervisors)}
                      </div>
                      <div className="text-[10px] text-stone-400">{obs.quarterTerm}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-sm text-stone-900">
                      {obs.averageScore.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {obs.overallRating}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectObservationForPrint(obs.id)}
                          className="p-1.5 text-stone-700 hover:text-[#701628] hover:bg-stone-100 rounded transition-colors"
                          title="Print Official DepEd Sheet"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => deleteObservation(obs.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: PMCF for COT-PMES Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              PMCF for COT-PMES Table
            </h3>
            <p className="text-[11px] text-stone-500">
              Performance Monitoring and Coaching Form (PMCF) · Coaching Interventions for COT-PMES
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#701628]/10 text-[#701628]">
              {filteredPmcfRecords.length}{' '}
              {filteredPmcfRecords.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedPmcfRecordIdForPrint(null);
                setIsPrintPmcfModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export PMCF for COT-PMES Table to PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>Export PMCF (PDF)</span>
            </button>
            {!isTeacher && (
              <button
                type="button"
                onClick={handleOpenAddPmcf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add PMCF for COT-PMES</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">PMCF Record</th>
                <th className="py-3 px-4">Date & Term</th>
                <th className="py-3 px-4">Teacher & Supervisor</th>
                <th className="py-3 px-4">Coaching Mechanism</th>
                <th className="py-3 px-4">Critical Incident Observed</th>
                <th className="py-3 px-4">Agreed Action Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPmcfRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No PMCF for COT-PMES records found. Click &ldquo;PMCF for COT-PMES&rdquo; to add a record.
                  </td>
                </tr>
              ) : (
                filteredPmcfRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#701628]">
                      {r.recordNo}
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      <div>{r.date}</div>
                      <div className="text-[10px] text-stone-400 font-medium">{r.quarterTerm}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{r.teacherName}</div>
                      <div className="text-[10px] text-stone-500">
                        Instructional Supervisor: {resolveRecordSupervisorName(r, teachers, supervisors)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                        {r.coachingMechanism}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs text-stone-700">
                      <div className="line-clamp-2 text-[11px]">{r.criticalIncidentDescription}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs text-stone-600">
                      <div className="line-clamp-2 text-[11px]">{r.actionPlanOutput}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                          r.status === 'Resolved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {r.status === 'Resolved' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPmcfRecordIdForPrint(r.id);
                            setIsPrintPmcfModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                          title="Print / Save PDF for this PMCF record"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#701628]" />
                          <span>Print PDF</span>
                        </button>
                        {!isTeacher && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditPmcf(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-md text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                            title="Edit PMCF Coaching Record"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#701628]" />
                            <span>Edit</span>
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deletePMCFRecord(r.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 3: FAR for COT-PMES Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-amber-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              FAR for COT-PMES Table
            </h3>
            <p className="text-[11px] text-stone-600">
              Findings, Analysis and Recommendations (FAR) · COT-PMES Supervision Records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-200/80 text-stone-900">
              {filteredFarRecords.length}{' '}
              {filteredFarRecords.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedFarRecordIdForPrint(null);
                setIsPrintFarModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export FAR for COT-PMES Table to PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>Export FAR (PDF)</span>
            </button>
            {!isTeacher && (
              <button
                type="button"
                onClick={handleOpenAddFar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAR for COT-PMES</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap">FAR CODE</th>
                <th className="py-3 px-4 whitespace-nowrap">Date</th>
                <th className="py-3 px-4 whitespace-nowrap">Teacher</th>
                <th className="py-3 px-4 min-w-[200px]">Findings</th>
                <th className="py-3 px-4 min-w-[200px]">Analysis</th>
                <th className="py-3 px-4 min-w-[200px]">Recommendations</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredFarRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No FAR for COT-PMES records found. Click &ldquo;FAR for COT-PMES&rdquo; to add a record.
                  </td>
                </tr>
              ) : (
                filteredFarRecords.map((r) => {
                  const isVerified = r.status === 'Verified' || r.actionTaken;
                  return (
                    <tr key={r.id} className="hover:bg-stone-50/80 transition-colors align-top">
                      <td className="py-3 px-4 font-mono font-bold text-[#701628] whitespace-nowrap">
                        {r.farCode}
                      </td>
                      <td className="py-3 px-4 text-stone-700 whitespace-nowrap font-medium">
                        {r.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 whitespace-nowrap">
                          {r.teacherName}
                        </div>
                        <div className="text-[10px] font-medium text-[#701628] mt-0.5">
                          Supervisor: {resolveRecordSupervisorName(r, teachers, supervisors)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">
                            {r.term}
                          </span>
                          <span className="text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 px-1.5 py-0.5 rounded">
                            {r.lessonPlanWeek}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-800">
                        <div className="text-[11px] leading-relaxed whitespace-pre-wrap">
                          {r.findings}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-700">
                        <div className="text-[11px] leading-relaxed whitespace-pre-wrap">
                          {r.analysis}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-700">
                        <div className="text-[11px] leading-relaxed whitespace-pre-wrap">
                          {r.recommendations}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap min-w-[140px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFarRecordIdForPrint(r.id);
                              setIsPrintFarModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                            title="Print / Save PDF for this FAR record"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#701628]" />
                            <span>PDF</span>
                          </button>
                          {!isTeacher && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditFar(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-md text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Edit FAR for COT-PMES"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-[#701628]" />
                              <span>Edit</span>
                            </button>
                          )}
                          {!isVerified && !isTeacher && (
                            <button
                              type="button"
                              onClick={() => verifyFarRecord(r.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Take action and mark this recommendation as verified"
                            >
                              <Check className="w-3 h-3" />
                              <span>Take Action</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => deleteFarRecord(r.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete FAR record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New COT-PMES Observation Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">
                  Conduct New COT-PMES Observation
                </h3>
                <p className="text-xs text-amber-200/90">
                  Philippine Professional Standards for Teachers · 9 Core Indicators
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveObservation} className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Teacher to Observe</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => {
                      setSelectedTeacherId(e.target.value);
                      const t = teachers.find((tch) => tch.id === e.target.value);
                      if (t) {
                        if (t.subject) setSubjectTaught(t.subject);
                        if (t.gradeLevels && t.gradeLevels[0]) {
                          setGradeAndSection(`${t.gradeLevels[0]} - Section 1`);
                        }
                        if (
                          t.assignedSupervisorId &&
                          supervisors.some((s) => s.id === t.assignedSupervisorId)
                        ) {
                          setSelectedSupervisorId(t.assignedSupervisorId);
                        }
                      }
                    }}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900 font-semibold"
                  >
                    {modalTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.department} · {t.subject || t.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Assigned Instructional Supervisors
                  </label>
                  <select
                    value={selectedSupervisorId}
                    onChange={(e) => setSelectedSupervisorId(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900 font-semibold"
                  >
                    {supervisors.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.fullName} ({sup.position} · {sup.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Subject Taught</label>
                  <input
                    type="text"
                    required
                    value={subjectTaught}
                    onChange={(e) => setSubjectTaught(e.target.value)}
                    placeholder="e.g. Science 9 (Biology)"
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grade & Section</label>
                  <input
                    type="text"
                    required
                    value={gradeAndSection}
                    onChange={(e) => setGradeAndSection(e.target.value)}
                    placeholder="e.g. Grade 9 - Ruby"
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Date of Observation</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Time Schedule</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                      placeholder="08:30 AM"
                      className="w-1/2 border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                    />
                    <input
                      type="text"
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      placeholder="09:30 AM"
                      className="w-1/2 border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Term</label>
                  <select
                    value={quarterTerm}
                    onChange={(e) => setQuarterTerm(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900 font-medium"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    Lesson Topic / Learning Competency Title
                  </label>
                  <input
                    type="text"
                    required
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    placeholder="e.g. Structure and Functions of the Circulatory System"
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                  />
                </div>
              </div>

              {/* Indicators Rating Grid */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-2 gap-1">
                  <h4 className="font-bold text-stone-900 uppercase text-xs">
                    DepEd 9 Indicators Evaluation Matrix (Score: 3 to 7)
                  </h4>
                  <div className="text-right">
                    <span className="text-xs text-stone-500">Live Mean Score: </span>
                    <span className="font-mono font-bold text-base text-[#701628]">
                      {calculateAverage()}
                    </span>
                    <span className="ml-2 font-semibold text-emerald-700">
                      ({getOverallRating(calculateAverage())})
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {DEPED_COT_INDICATORS.map((ind) => {
                    const currentScore = indicatorScores[ind.id] || 5;
                    return (
                      <div
                        key={ind.id}
                        className="p-3 rounded-lg border border-stone-200 bg-white hover:border-amber-300 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="max-w-xl">
                            <div className="font-bold text-stone-800">
                              {ind.id}. {ind.title}
                            </div>
                            <div className="text-[11px] text-stone-500">{ind.description}</div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {[3, 4, 5, 6, 7].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => handleScoreChange(ind.id, score)}
                                className={`w-8 h-8 rounded text-xs font-bold transition-all cursor-pointer ${
                                  currentScore === score
                                    ? 'bg-[#701628] text-white shadow-xs scale-105 ring-2 ring-amber-400'
                                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                }`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Qualitative comment input */}
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="Optional observer evidence or specific commendation..."
                            value={indicatorComments[ind.id] || ''}
                            onChange={(e) => handleCommentChange(ind.id, e.target.value)}
                            className="w-full text-[11px] border border-stone-200 rounded px-2.5 py-1 text-stone-700 focus:outline-none focus:border-[#701628]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Qualitative Observations & Conferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Commendations & Teacher Strengths
                  </label>
                  <textarea
                    rows={2}
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    placeholder="Highlight mastery of topic, pedagogical strategies, positive classroom climate..."
                    className="w-full border border-stone-300 rounded-lg p-2 text-stone-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Areas for Growth & Next Steps
                  </label>
                  <textarea
                    rows={2}
                    value={areasForDevelopment}
                    onChange={(e) => setAreasForDevelopment(e.target.value)}
                    placeholder="Identify areas needing differentiation, wait-time, or learning resources..."
                    className="w-full border border-stone-300 rounded-lg p-2 text-stone-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Pre-Observation Conference Notes
                  </label>
                  <textarea
                    rows={2}
                    value={preConferenceNotes}
                    onChange={(e) => setPreConferenceNotes(e.target.value)}
                    placeholder="Agreed focus objectives and lesson context discussed with teacher..."
                    className="w-full border border-stone-300 rounded-lg p-2 text-stone-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Post-Observation Conference Agreement
                  </label>
                  <textarea
                    rows={2}
                    value={postConferenceNotes}
                    onChange={(e) => setPostConferenceNotes(e.target.value)}
                    placeholder="Shared reflections and actionable commitments made during post-conference..."
                    className="w-full border border-stone-300 rounded-lg p-2 text-stone-800"
                  />
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Save COT Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: PMCF for COT-PMES */}
      {isPmcfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingPmcf
                    ? `Edit PMCF for COT-PMES (${editingPmcf.recordNo})`
                    : 'PMCF for COT-PMES'}
                </h3>
                <p className="text-[11px] text-amber-200">
                  DepEd PMES Form 3 · Continuous Supervisory Coaching Intervention
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPmcfModalOpen(false);
                  setEditingPmcf(null);
                }}
                className="p-1 rounded-lg text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePmcf} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Teacher</label>
                  <select
                    value={pmcfTeacherId}
                    onChange={(e) => setPmcfTeacherId(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    {modalTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Term</label>
                  <select
                    value={pmcfQuarterTerm}
                    onChange={(e) => setPmcfQuarterTerm(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Coaching Mechanism</label>
                  <select
                    value={pmcfCoachingMechanism}
                    onChange={(e) => setPmcfCoachingMechanism(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Individual Conference">Individual Conference</option>
                    <option value="LAC Session">LAC Session</option>
                    <option value="Peer Mentoring">Peer Mentoring</option>
                    <option value="Demonstration Teaching">Demonstration Teaching</option>
                    <option value="Written Feedback">Written Feedback</option>
                    <option value="Classroom Observation">Classroom Observation</option>
                    <option value="Walkthrough/Fleeting Observations">
                      Walkthrough/Fleeting Observations
                    </option>
                    <option value="Lesson Plan">Lesson Plan</option>
                    <option value="Assessment">Assessment</option>
                    <option value="COT-PMES">COT-PMES</option>
                  </select>
                </div>

                {editingPmcf && (
                  <div className="col-span-2">
                    <label className="block font-bold text-stone-700 mb-1">Status</label>
                    <select
                      value={pmcfStatus}
                      onChange={(e) => setPmcfStatus(e.target.value as any)}
                      className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium"
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Scheduled Follow-up">Scheduled Follow-up</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Critical Incident Description
                </label>
                <textarea
                  required
                  rows={2}
                  value={pmcfCriticalIncidentDescription}
                  onChange={(e) => setPmcfCriticalIncidentDescription(e.target.value)}
                  placeholder="Describe context, observed performance gap or instructional challenge..."
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Output / Collaborative Action Plan
                </label>
                <textarea
                  required
                  rows={2}
                  value={pmcfActionPlanOutput}
                  onChange={(e) => setPmcfActionPlanOutput(e.target.value)}
                  placeholder="Actionable steps, mentoring activities, or instructional materials to prepare..."
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Impact on Job Performance
                </label>
                <input
                  type="text"
                  value={pmcfImpactOnJobPerformance}
                  onChange={(e) => setPmcfImpactOnJobPerformance(e.target.value)}
                  placeholder="Expected or observed measurable improvement in learner outcomes..."
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsPmcfModalOpen(false);
                    setEditingPmcf(null);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingPmcf ? 'Update PMCF Record' : 'Save PMCF Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: FAR for COT-PMES */}
      {isFarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingFar
                    ? `Edit FAR for COT-PMES (${editingFar.farCode})`
                    : 'FAR for COT-PMES'}
                </h3>
                <p className="text-[11px] text-amber-200">
                  Findings, Analysis and Recommendation · COT-PMES Observation Evaluation
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFarModalOpen(false);
                  setEditingFar(null);
                }}
                className="p-1 rounded-lg text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFar} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Teacher <span className="text-rose-600">*</span>
                </label>
                <select
                  value={farTeacherId}
                  onChange={(e) => setFarTeacherId(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium"
                >
                  {modalTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department} · {t.position} - {t.subject})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Select faculty member registered in the Personnel & Supervisory Roster
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Term <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={farTerm}
                    onChange={(e) => setFarTerm(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Lesson Plan Week <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={farLessonPlanWeek}
                    onChange={(e) => setFarLessonPlanWeek(e.target.value)}
                    placeholder="e.g. Week 4 (or Week 1-2)"
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  />
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    Encode the lesson plan week inspected
                  </p>
                </div>
              </div>

              {editingFar && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Status <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={farStatus}
                    onChange={(e) => setFarStatus(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Verified">Verified (Action Taken)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Findings <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={farFindings}
                  onChange={(e) => setFarFindings(e.target.value)}
                  placeholder="Encode supervisory observations and findings on lesson plan delivery, objectives, or activities..."
                  className="w-full border border-stone-300 rounded-lg p-2.5 bg-white text-stone-900"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Analysis <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={farAnalysis}
                  onChange={(e) => setFarAnalysis(e.target.value)}
                  placeholder="Encode pedagogical analysis, root causes of observed learning difficulties, or student engagement patterns..."
                  className="w-full border border-stone-300 rounded-lg p-2.5 bg-white text-stone-900"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Recommendations <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={farRecommendations}
                  onChange={(e) => setFarRecommendations(e.target.value)}
                  placeholder="Encode actionable recommendations, suggested instructional adjustments, and follow-up monitoring..."
                  className="w-full border border-stone-300 rounded-lg p-2.5 bg-white text-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsFarModalOpen(false);
                    setEditingFar(null);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingFar ? 'Update FAR Record' : 'Save FAR Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COT-PMES Observation Table PDF / Print Modal */}
      <PrintClassroomObservationTableModal
        isOpen={isExportClassroomPdfOpen}
        onClose={() => setIsExportClassroomPdfOpen(false)}
        records={cotPmesObservations}
      />

      {/* PMCF Official DepEd PDF / Print Modal */}
      <PrintPmcfReportModal
        isOpen={isPrintPmcfModalOpen}
        onClose={() => setIsPrintPmcfModalOpen(false)}
        initialSelectedRecordId={selectedPmcfRecordIdForPrint}
        records={filteredPmcfRecords}
      />

      {/* FAR Official DepEd PDF / Print Modal */}
      <PrintFarReportModal
        isOpen={isPrintFarModalOpen}
        onClose={() => setIsPrintFarModalOpen(false)}
        initialSelectedRecordId={selectedFarRecordIdForPrint}
        records={filteredFarRecords}
      />
    </div>
  );
};
