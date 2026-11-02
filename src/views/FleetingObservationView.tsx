import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  FleetingObservation,
  CotIndicatorRating,
  PMCFRecord,
  FarRecord,
  getPmcfCategory,
  getFarCategory,
} from '../types';
import {
  CLASSROOM_OBSERVATION_SECTIONS,
  ALL_CLASSROOM_MONITORING_ITEMS,
} from './CotObservationView';
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
  Clock,
  CheckCircle2,
  X,
  Trash2,
  Pencil,
  Edit2,
  FileDown,
  Printer,
  Check,
} from 'lucide-react';

export const FLEETING_WALKTHROUGH_MONITORING_SECTIONS = [
  {
    sectionTitle: '1. Learning Objectives & Content',
    items: [
      {
        id: '1.1',
        numberLabel: '1.1.',
        title:
          'Learning objectives are clearly presented and aligned with the intended learning competency based on Budget of Work and delivered as planned.',
      },
      {
        id: '1.2',
        numberLabel: '1.2.',
        title:
          'Lesson content is accurate, relevant, and aligned with the prescribed curriculum and intended learning competencies.',
      },
    ],
  },
  {
    sectionTitle: '2. Teaching Strategies',
    items: [
      {
        id: '2.1',
        numberLabel: '2.1.',
        title:
          'Learner-centered and engaging instructional strategies aligned with the Instructional Design Framework (IDF) are evident.',
      },
      {
        id: '2.2',
        numberLabel: '2.2.',
        title:
          'Differentiated instruction and active learner participation are evident throughout the lesson.',
      },
    ],
  },
  {
    sectionTitle: '3. Assessment',
    items: [
      {
        id: '3.1',
        numberLabel: '3.1.',
        title:
          'Assessment strategies are aligned with the learning objectives and integrated into the lesson.',
      },
      {
        id: '3.2',
        numberLabel: '3.2.',
        title:
          'Effective questioning (including higher-order thinking questions) and constructive feedback are evident.',
      },
    ],
  },
  {
    sectionTitle: '4. Learning Resources',
    items: [
      {
        id: '4.1',
        numberLabel: '4.1.',
        title:
          'Appropriate learning resources, including ICT and instructional materials, are effectively utilized.',
      },
      {
        id: '4.2',
        numberLabel: '4.2.',
        title:
          'Learning resources are aligned with the lesson objectives and enhance learner engagement and understanding.',
      },
    ],
  },
  {
    sectionTitle: '5. Classroom Management',
    items: [
      {
        id: '5.1',
        numberLabel: '5.1.',
        title: 'An orderly, safe, and conducive learning environment is maintained.',
      },
      {
        id: '5.2',
        numberLabel: '5.2.',
        title:
          'Positive learner behavior, engagement, and adherence to classroom routines are evident.',
      },
    ],
  },
];

const DEFAULT_FLEETING_MONITORING_RATINGS: Record<string, 'E' | 'NE'> = {
  '1.1': 'E',
  '1.2': 'E',
  '2.1': 'E',
  '2.2': 'E',
  '3.1': 'E',
  '3.2': 'E',
  '4.1': 'E',
  '4.2': 'E',
  '5.1': 'E',
  '5.2': 'E',
};

interface FleetingObservationViewProps {
  onSelectObservationForPrint?: (obsId: string) => void;
}

export const FleetingObservationView: React.FC<FleetingObservationViewProps> = ({
  onSelectObservationForPrint,
}) => {
  const {
    fleetingObservations,
    teachers,
    supervisors,
    addFleetingObservation,
    updateFleetingObservation,
    deleteFleetingObservation,
    observations,
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
  const { currentUser, isAdmin, isTeacher } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupervisorFilterId, setSelectedSupervisorFilterId] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<FleetingObservation | null>(null);

  const scopedTeachers = getScopedTeachersForModal(currentUser, teachers, supervisors);

  // Fleeting Observation Form State
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [gradeAndSection, setGradeAndSection] = useState('Grade 9 - Ruby');
  const [subject, setSubject] = useState('Science 9');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [learnerEngagementLevel, setLearnerEngagementLevel] =
    useState<FleetingObservation['learnerEngagementLevel']>('High (80-100%)');
  const [classroomAtmosphere, setClassroomAtmosphere] =
    useState<FleetingObservation['classroomAtmosphere']>('Conducive & Orderly');
  const [boardWorkQuality, setBoardWorkQuality] =
    useState<FleetingObservation['boardWorkQuality']>('Well-Structured');
  const [timeOnTask, setTimeOnTask] =
    useState<FleetingObservation['timeOnTask']>('On-schedule');
  const [fleetingMonitoringRatings, setFleetingMonitoringRatings] = useState<
    Record<string, 'E' | 'NE'>
  >({ ...DEFAULT_FLEETING_MONITORING_RATINGS });
  const [rapidCommendation, setRapidCommendation] = useState('');
  const [quickCoachingTip, setQuickCoachingTip] = useState('');

  // Conduct New Classroom Observation Modal & Print State
  const [isClassroomObsModalOpen, setIsClassroomObsModalOpen] = useState(false);
  const [isExportClassroomPdfOpen, setIsExportClassroomPdfOpen] = useState(false);
  const [selectedObsTeacherId, setSelectedObsTeacherId] = useState(teachers[0]?.id || '');
  const [selectedObsSupervisorId, setSelectedObsSupervisorId] = useState(
    teachers[0]?.assignedSupervisorId || supervisors[0]?.id || ''
  );
  const [obsGradeAndSection, setObsGradeAndSection] = useState('Grade 9 - Ruby');
  const [obsSubjectTaught, setObsSubjectTaught] = useState('Science 9');
  const [obsTopicTitle, setObsTopicTitle] = useState('');
  const [obsDate, setObsDate] = useState(new Date().toISOString().slice(0, 10));
  const [obsTimeStart, setObsTimeStart] = useState('08:30 AM');
  const [obsTimeEnd, setObsTimeEnd] = useState('09:30 AM');
  const [obsQuarterTerm, setObsQuarterTerm] = useState<'Term 1' | 'Term 2' | 'Term 3' | string>(
    'Term 1'
  );
  const [obsPreConferenceNotes, setObsPreConferenceNotes] = useState('');
  const [obsPostConferenceNotes, setObsPostConferenceNotes] = useState('');
  const [obsStrengths, setObsStrengths] = useState('');
  const [obsAreasForDevelopment, setObsAreasForDevelopment] = useState('');
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

  // PMCF Modal & Print State (shared modal for both PMCF for Classroom Observation and PMCF for Classroom, Fleeting & Walkthrough Observation)
  const [isPmcfModalOpen, setIsPmcfModalOpen] = useState(false);
  const [pmcfModalContext, setPmcfModalContext] = useState<'classroom' | 'fleeting'>('classroom');
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
  const [printPmcfContext, setPrintPmcfContext] = useState<'classroom' | 'fleeting'>('classroom');
  const [selectedPmcfRecordIdForPrint, setSelectedPmcfRecordIdForPrint] = useState<string | null>(
    null
  );

  // FAR Modal & Print State (shared modal for both FAR for Classroom Observation and FAR for Classroom, Fleeting & Walkthrough Observation)
  const [isFarModalOpen, setIsFarModalOpen] = useState(false);
  const [farModalContext, setFarModalContext] = useState<'classroom' | 'fleeting'>('classroom');
  const [editingFar, setEditingFar] = useState<FarRecord | null>(null);
  const [farTeacherId, setFarTeacherId] = useState(teachers[0]?.id || '');
  const [farTerm, setFarTerm] = useState<'Term 1' | 'Term 2' | 'Term 3' | string>('Term 1');
  const [farLessonPlanWeek, setFarLessonPlanWeek] = useState('Week 1');
  const [farFindings, setFarFindings] = useState('');
  const [farAnalysis, setFarAnalysis] = useState('');
  const [farRecommendations, setFarRecommendations] = useState('');
  const [farStatus, setFarStatus] = useState<'In Progress' | 'Verified'>('In Progress');
  const [isPrintFarModalOpen, setIsPrintFarModalOpen] = useState(false);
  const [printFarContext, setPrintFarContext] = useState<'classroom' | 'fleeting'>('classroom');
  const [selectedFarRecordIdForPrint, setSelectedFarRecordIdForPrint] = useState<string | null>(
    null
  );

  const q = searchQuery.toLowerCase().trim();

  // Filtered Fleeting / Walkthrough Visits
  const filteredVisits = fleetingObservations.filter((v) => {
    if (
      !matchesRoleSupervisionScope(
        v,
        currentUser,
        teachers,
        supervisors,
        selectedSupervisorFilterId
      )
    ) {
      return false;
    }
    const supName = resolveRecordSupervisorName(v, teachers, supervisors);
    return (
      !q ||
      v.teacherName.toLowerCase().includes(q) ||
      v.visitCode.toLowerCase().includes(q) ||
      v.subject.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q)
    );
  });

  // Filtered Classroom Monitoring Observations
  const classroomMonitoringObservations = observations.filter((obs) => {
    if (obs.evaluationType !== 'classroom') return false;
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
    return (
      !q ||
      obs.teacherName.toLowerCase().includes(q) ||
      obs.observationNo.toLowerCase().includes(q) ||
      obs.subjectTaught.toLowerCase().includes(q) ||
      obs.gradeAndSection.toLowerCase().includes(q) ||
      obs.supervisorName.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q) ||
      (obs.topicTitle && obs.topicTitle.toLowerCase().includes(q))
    );
  });

  // Filtered PMCF records by category
  const filteredFleetingPmcfRecords = pmcfRecords.filter((r) => {
    if (getPmcfCategory(r) !== 'fleeting') return false;
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
    return (
      !q ||
      r.teacherName.toLowerCase().includes(q) ||
      r.recordNo.toLowerCase().includes(q) ||
      r.criticalIncidentDescription.toLowerCase().includes(q) ||
      r.actionPlanOutput.toLowerCase().includes(q) ||
      r.supervisorName.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q)
    );
  });

  const filteredClassroomPmcfRecords = pmcfRecords.filter((r) => {
    if (getPmcfCategory(r) !== 'classroom') return false;
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
    return (
      !q ||
      r.teacherName.toLowerCase().includes(q) ||
      r.recordNo.toLowerCase().includes(q) ||
      r.criticalIncidentDescription.toLowerCase().includes(q) ||
      r.actionPlanOutput.toLowerCase().includes(q) ||
      r.supervisorName.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q)
    );
  });

  // Filtered FAR records by category
  const filteredFleetingFarRecords = farRecords.filter((r) => {
    if (getFarCategory(r) !== 'fleeting') return false;
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
    return (
      !q ||
      r.teacherName.toLowerCase().includes(q) ||
      r.farCode.toLowerCase().includes(q) ||
      r.lessonPlanWeek.toLowerCase().includes(q) ||
      r.findings.toLowerCase().includes(q) ||
      r.analysis.toLowerCase().includes(q) ||
      r.recommendations.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q)
    );
  });

  const filteredClassroomFarRecords = farRecords.filter((r) => {
    if (getFarCategory(r) !== 'classroom') return false;
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
    return (
      !q ||
      r.teacherName.toLowerCase().includes(q) ||
      r.farCode.toLowerCase().includes(q) ||
      r.lessonPlanWeek.toLowerCase().includes(q) ||
      r.findings.toLowerCase().includes(q) ||
      r.analysis.toLowerCase().includes(q) ||
      r.recommendations.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q)
    );
  });

  const openNewModal = () => {
    setEditingVisit(null);
    setTeacherId(scopedTeachers[0]?.id || teachers[0]?.id || '');
    setGradeAndSection('Grade 9 - Ruby');
    setSubject('Science 9');
    setDurationMinutes(10);
    setLearnerEngagementLevel('High (80-100%)');
    setClassroomAtmosphere('Conducive & Orderly');
    setBoardWorkQuality('Well-Structured');
    setTimeOnTask('On-schedule');
    setFleetingMonitoringRatings({ ...DEFAULT_FLEETING_MONITORING_RATINGS });
    setRapidCommendation('');
    setQuickCoachingTip('');
    setIsModalOpen(true);
  };

  const openEditModal = (visit: FleetingObservation) => {
    setEditingVisit(visit);
    const matchedTeacher =
      teachers.find((t) => t.id === visit.teacherId) ||
      teachers.find((t) => t.fullName === visit.teacherName) ||
      teachers[0];
    setTeacherId(matchedTeacher?.id || visit.teacherId);
    setGradeAndSection(visit.gradeAndSection);
    setSubject(visit.subject);
    setDurationMinutes(visit.durationMinutes);
    setLearnerEngagementLevel(visit.learnerEngagementLevel);
    setClassroomAtmosphere(visit.classroomAtmosphere);
    setBoardWorkQuality(visit.boardWorkQuality);
    setTimeOnTask(visit.timeOnTask);
    setFleetingMonitoringRatings(
      visit.monitoringRatings
        ? { ...DEFAULT_FLEETING_MONITORING_RATINGS, ...visit.monitoringRatings }
        : { ...DEFAULT_FLEETING_MONITORING_RATINGS }
    );
    setRapidCommendation(visit.rapidCommendation);
    setQuickCoachingTip(visit.quickCoachingTip);
    setIsModalOpen(true);
  };

  const handleFleetingRatingChange = (id: string, status: 'E' | 'NE') => {
    setFleetingMonitoringRatings((prev) => ({ ...prev, [id]: status }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === teacherId) || teachers[0];
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      (teacher
        ? resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors)
        : undefined);

    if (editingVisit) {
      updateFleetingObservation(editingVisit.id, {
        teacherId: teacher ? teacher.id : editingVisit.teacherId,
        teacherName: teacher ? teacher.fullName : editingVisit.teacherName,
        supervisorId: resolvedSup?.id || editingVisit.supervisorId,
        supervisorName: resolvedSup?.fullName || editingVisit.supervisorName,
        durationMinutes,
        gradeAndSection,
        subject,
        learnerEngagementLevel,
        classroomAtmosphere,
        boardWorkQuality,
        timeOnTask,
        monitoringRatings: fleetingMonitoringRatings,
        rapidCommendation:
          rapidCommendation || 'Observed good time-on-task and orderly classroom management.',
        quickCoachingTip:
          quickCoachingTip || 'Continue reinforcing verbal affirmation for quiet learners.',
      });
    } else {
      addFleetingObservation({
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || currentUser.id,
        supervisorName: resolvedSup?.fullName || currentUser.fullName,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        durationMinutes,
        gradeAndSection,
        subject,
        learnerEngagementLevel,
        classroomAtmosphere,
        boardWorkQuality,
        timeOnTask,
        monitoringRatings: fleetingMonitoringRatings,
        rapidCommendation:
          rapidCommendation || 'Observed good time-on-task and orderly classroom management.',
        quickCoachingTip:
          quickCoachingTip || 'Continue reinforcing verbal affirmation for quiet learners.',
      });
    }

    setEditingVisit(null);
    setIsModalOpen(false);
    setRapidCommendation('');
    setQuickCoachingTip('');
  };

  const handleEvidentChange = (id: number, status: 'E' | 'NE') => {
    setIndicatorEvident((prev) => ({ ...prev, [id]: status }));
  };

  const handleCommentChange = (id: number, text: string) => {
    setIndicatorComments((prev) => ({ ...prev, [id]: text }));
  };

  const handleSaveClassroomObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === selectedObsTeacherId);
    if (!teacher) return;

    const evidentCount = ALL_CLASSROOM_MONITORING_ITEMS.filter(
      (item) => (indicatorEvident[item.id] || 'E') === 'E'
    ).length;
    const avg = Number(
      ((evidentCount / ALL_CLASSROOM_MONITORING_ITEMS.length) * 4 + 3).toFixed(2)
    );

    const ratings: CotIndicatorRating[] = ALL_CLASSROOM_MONITORING_ITEMS.map((item) => ({
      indicatorId: item.id,
      title: `${item.numberLabel} ${item.title} (${item.movs})`,
      score: (indicatorEvident[item.id] || 'E') === 'E' ? 7 : 3,
      evidentStatus: indicatorEvident[item.id] || 'E',
      comments: indicatorComments[item.id] || '',
    }));

    const selectedSupervisor = supervisors.find((s) => s.id === selectedObsSupervisorId);
    const observerId = selectedSupervisor ? selectedSupervisor.id : currentUser.id;
    const observerName = selectedSupervisor ? selectedSupervisor.fullName : currentUser.fullName;

    addObservation({
      evaluationType: 'classroom',
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      department: teacher.department,
      supervisorId: observerId,
      supervisorName: observerName,
      date: obsDate,
      timeStart: obsTimeStart,
      timeEnd: obsTimeEnd,
      quarterTerm: obsQuarterTerm,
      schoolYear: '2026-2027',
      gradeAndSection: obsGradeAndSection,
      subjectTaught: obsSubjectTaught,
      topicTitle: obsTopicTitle || 'Standard Curriculum Competency Lesson',
      ratings,
      generalObservations: `Observation conducted by ${observerName}. Demonstrated competency in classroom instructional delivery.`,
      strengths: obsStrengths || 'Clear instructional alignment and structured student engagement.',
      areasForDevelopment:
        obsAreasForDevelopment || 'Continue fostering higher-order inquiry questions.',
      preConferenceNotes:
        obsPreConferenceNotes || 'Agreed on focal indicators prior to classroom entry.',
      postConferenceNotes:
        obsPostConferenceNotes || 'Reviewed rubric scores and discussed feedback collaboratively.',
      averageScore: avg,
      overallRating: evidentCount >= 7 ? 'Evident' : 'Not Evident',
      status: 'Completed',
      acknowledgedByTeacher: true,
      teacherSignatureDate: obsDate,
    });

    setIsClassroomObsModalOpen(false);
    setObsTopicTitle('');
    setObsStrengths('');
    setObsAreasForDevelopment('');
    setObsPreConferenceNotes('');
    setObsPostConferenceNotes('');
  };

  const handleOpenAddPmcf = (context: 'classroom' | 'fleeting' = 'classroom') => {
    setPmcfModalContext(context);
    setEditingPmcf(null);
    setPmcfTeacherId(scopedTeachers[0]?.id || teachers[0]?.id || '');
    setPmcfQuarterTerm('Term 1');
    setPmcfCoachingMechanism(
      context === 'fleeting' ? 'Walkthrough/Fleeting Observations' : 'Classroom Observation'
    );
    setPmcfCriticalIncidentDescription('');
    setPmcfActionPlanOutput('');
    setPmcfImpactOnJobPerformance('');
    setPmcfStatus('In Progress');
    setIsPmcfModalOpen(true);
  };

  const handleOpenEditPmcf = (r: PMCFRecord, context: 'classroom' | 'fleeting' = 'classroom') => {
    setPmcfModalContext(context);
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
        category: pmcfModalContext,
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
        category: pmcfModalContext,
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || currentUser.id,
        supervisorName: resolvedSup?.fullName || currentUser.fullName,
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

  const handleOpenAddFar = (context: 'classroom' | 'fleeting' = 'classroom') => {
    setFarModalContext(context);
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

  const handleOpenEditFar = (r: FarRecord, context: 'classroom' | 'fleeting' = 'classroom') => {
    setFarModalContext(context);
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
        category: farModalContext,
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
        category: farModalContext,
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || currentUser.id,
        supervisorName: resolvedSup?.fullName || currentUser.fullName,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
            <span>Instructional Supervision Module</span>
            <span aria-hidden="true">·</span>
            <span>Informal Pulse Checks & Classroom Observations</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Classroom, Fleeting & Walkthrough Observation
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            5 to 15-minute informal instructional visits, classroom monitoring, PMCF coaching, and FAR records
          </p>
        </div>

        {!isTeacher && (
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={openNewModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Fleeting/Walkthrough Visit</span>
            </button>
            <button
              onClick={() => handleOpenAddPmcf('fleeting')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>PMCF for Classroom, Fleeting & Walkthrough Observation</span>
            </button>
            <button
              onClick={() => handleOpenAddFar('fleeting')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-700 hover:bg-stone-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>FAR for Classroom, Fleeting & Walkthrough Observation</span>
            </button>
            <button
              onClick={() => setIsClassroomObsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Conduct New Classroom Observation</span>
            </button>
            <button
              onClick={() => handleOpenAddPmcf('classroom')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#8C2437] hover:bg-[#701628] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>PMCF for Classroom Observation</span>
            </button>
            <button
              onClick={() => handleOpenAddFar('classroom')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>FAR for Classroom Observation</span>
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
        moduleLabel="Fleeting & Walkthrough Observation, Classroom Observation, PMCF & FAR Tables"
      />

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search teacher, visit code, subject, or findings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628]"
          />
        </div>
        <div className="text-xs text-stone-500 font-medium hidden sm:block">
          Total Walkthroughs Logged:{' '}
          <span className="font-bold font-mono text-stone-800">{fleetingObservations.length}</span>
        </div>
      </div>

      {/* Table: Fleeting & Walkthrough Observation Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-blue-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Fleeting &amp; Walkthrough Observation Table
            </h3>
            <p className="text-[11px] text-stone-600">
              Monitoring Tool On The Fleeting &amp; Walkthrough Observation · Indicators Evaluation Matrix (E=Evident, NE=Not Evident)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900">
              {filteredVisits.length}{' '}
              {filteredVisits.length === 1 ? 'Record' : 'Records'}
            </span>
            {!isTeacher && (
              <button
                type="button"
                onClick={openNewModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Fleeting/Walkthrough Visit</span>
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Visit Code</th>
                <th className="py-3 px-4">Teacher</th>
                <th className="py-3 px-4">Subject &amp; Section</th>
                <th className="py-3 px-4">Pulse Parameters</th>
                <th className="py-3 px-4">Monitoring Tool Indicators (E / NE)</th>
                <th className="py-3 px-4">Evaluation Status</th>
                <th className="py-3 px-4">Commendation &amp; Coaching Tip</th>
                <th className="py-3 px-4">Observer &amp; Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-500">
                    No Fleeting &amp; Walkthrough Observation records yet. Click &ldquo;Log Fleeting/Walkthrough Visit&rdquo; to add a record.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((v) => {
                  const ratingsMap = {
                    ...DEFAULT_FLEETING_MONITORING_RATINGS,
                    ...(v.monitoringRatings || {}),
                  };
                  const indicatorKeys = Object.keys(DEFAULT_FLEETING_MONITORING_RATINGS);
                  const evidentCount = indicatorKeys.filter(
                    (k) => ratingsMap[k] === 'E'
                  ).length;
                  const notEvidentCount = indicatorKeys.filter(
                    (k) => ratingsMap[k] === 'NE'
                  ).length;
                  const isEvidentOverall = evidentCount >= 5;

                  return (
                    <tr key={v.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs text-[#701628] bg-stone-100 px-2 py-0.5 rounded">
                          {v.visitCode}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-stone-500 mt-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span>{v.durationMinutes} min visit</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900">{v.teacherName}</td>
                      <td className="py-3 px-4 text-stone-700">
                        <div className="font-semibold">{v.subject}</div>
                        <div className="text-[11px] text-stone-500">{v.gradeAndSection}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <div>
                            <span className="text-stone-400">Engagement: </span>
                            <span className="font-semibold text-emerald-700">
                              {v.learnerEngagementLevel}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-400">Climate: </span>
                            <span className="font-semibold text-stone-700">
                              {v.classroomAtmosphere}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-400">Board / Time: </span>
                            <span className="font-semibold text-stone-700">
                              {v.boardWorkQuality} · {v.timeOnTask}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs mb-1.5">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            E: {evidentCount}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            NE: {notEvidentCount}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-[210px]">
                          {indicatorKeys.map((key) => {
                            const status = ratingsMap[key];
                            return (
                              <span
                                key={key}
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                  status === 'E'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                                title={`Indicator ${key}: ${status === 'E' ? 'Evident' : 'Not Evident'}`}
                              >
                                {key}:{status}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isEvidentOverall
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {isEvidentOverall ? 'Evident' : 'Not Evident'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-[11px] text-emerald-900 line-clamp-2">
                          <span className="font-bold text-emerald-700">Commendation: </span>
                          {v.rapidCommendation}
                        </div>
                        <div className="text-[11px] text-amber-900 line-clamp-2 mt-1">
                          <span className="font-bold text-amber-700">Coaching Tip: </span>
                          {v.quickCoachingTip}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-stone-600">
                        <div className="font-semibold text-stone-800">
                          {resolveRecordSupervisorName(v, teachers, supervisors)}
                        </div>
                        <div className="font-mono text-stone-400">
                          {v.date} {v.time ? `· ${v.time}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(v)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Edit Walkthrough Record"
                          >
                            <Pencil className="w-3.5 h-3.5 text-stone-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => deleteFleetingObservation(v.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            title="Delete Walkthrough Record"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Delete</span>
                          </button>
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

      {/* Grid of Walkthrough Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVisits.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-xl border border-stone-200 text-center text-stone-500 text-xs">
            No fleeting observations recorded.
          </div>
        ) : (
          filteredVisits.map((v) => {
            const ratingsMap = {
              ...DEFAULT_FLEETING_MONITORING_RATINGS,
              ...(v.monitoringRatings || {}),
            };
            const indicatorKeys = Object.keys(DEFAULT_FLEETING_MONITORING_RATINGS);
            const evidentCount = indicatorKeys.filter((k) => ratingsMap[k] === 'E').length;
            const notEvidentCount = indicatorKeys.filter((k) => ratingsMap[k] === 'NE').length;

            return (
              <div
                key={v.id}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs text-[#701628] bg-stone-100 px-2 py-0.5 rounded">
                      {v.visitCode}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-stone-500">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{v.durationMinutes} min visit</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-stone-900 text-sm">{v.teacherName}</h3>
                  <div className="text-xs text-stone-600 mb-3">
                    {v.subject} · {v.gradeAndSection}
                  </div>

                  {/* Pulse Parameters */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-50 p-2.5 rounded-lg border border-stone-100 mb-3">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Learner Engagement:</span>
                      <span className="font-semibold text-emerald-700">
                        {v.learnerEngagementLevel}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Classroom Climate:</span>
                      <span className="font-semibold text-stone-700">{v.classroomAtmosphere}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Boardwork:</span>
                      <span className="font-semibold text-stone-700">{v.boardWorkQuality}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Time-on-Task:</span>
                      <span className="font-semibold text-stone-700">{v.timeOnTask}</span>
                    </div>
                  </div>

                  {/* Monitoring Tool Summary */}
                  <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-lg mb-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-blue-900 uppercase mb-1.5">
                      <span>Monitoring Tool (E / NE)</span>
                      <span className="font-mono">
                        E: {evidentCount} · NE: {notEvidentCount}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {indicatorKeys.map((key) => {
                        const status = ratingsMap[key];
                        return (
                          <span
                            key={key}
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              status === 'E'
                                ? 'bg-white text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {key}:{status}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Commendation & Tip */}
                  <div className="space-y-2 text-xs">
                    <div className="bg-emerald-50/60 border border-emerald-100 p-2 rounded text-emerald-900">
                      <span className="font-bold block text-[10px] uppercase text-emerald-700">
                        Rapid Commendation:
                      </span>
                      <p className="text-[11px] mt-0.5">{v.rapidCommendation}</p>
                    </div>
                    <div className="bg-amber-50/60 border border-amber-100 p-2 rounded text-amber-900">
                      <span className="font-bold block text-[10px] uppercase text-amber-700">
                        Quick Coaching Tip:
                      </span>
                      <p className="text-[11px] mt-0.5">{v.quickCoachingTip}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span>
                    By: {v.supervisorName} ({v.date})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(v)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-bold transition-colors"
                      title="Edit record"
                    >
                      <Pencil className="w-3 h-3 text-stone-600" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deleteFleetingObservation(v.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Table: PMCF for Classroom, Fleeting & Walkthrough Observation Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              PMCF for Classroom, Fleeting & Walkthrough Observation Table
            </h3>
            <p className="text-[11px] text-stone-500">
              Performance Monitoring and Coaching Form (PMCF) · Coaching Interventions for Classroom, Fleeting & Walkthrough Observation
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#701628]/10 text-[#701628]">
              {filteredFleetingPmcfRecords.length}{' '}
              {filteredFleetingPmcfRecords.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={() => {
                setPrintPmcfContext('fleeting');
                setSelectedPmcfRecordIdForPrint(null);
                setIsPrintPmcfModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export PMCF for Classroom, Fleeting & Walkthrough Observation Table to PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>Export PMCF (PDF)</span>
            </button>
            {!isTeacher && (
              <button
                type="button"
                onClick={() => handleOpenAddPmcf('fleeting')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add PMCF for Classroom, Fleeting & Walkthrough Observation</span>
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
              {filteredFleetingPmcfRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No PMCF for Classroom, Fleeting & Walkthrough Observation records found. Click &ldquo;PMCF for Classroom, Fleeting & Walkthrough Observation&rdquo; to add a record.
                  </td>
                </tr>
              ) : (
                filteredFleetingPmcfRecords.map((r) => (
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
                            setPrintPmcfContext('fleeting');
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
                            onClick={() => handleOpenEditPmcf(r, 'fleeting')}
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

      {/* Table: FAR for Classroom, Fleeting & Walkthrough Observation Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-amber-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              FAR for Classroom, Fleeting & Walkthrough Observation Table
            </h3>
            <p className="text-[11px] text-stone-600">
              Findings, Analysis and Recommendations (FAR) · Classroom, Fleeting & Walkthrough Observation Supervision Records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-200/80 text-stone-900">
              {filteredFleetingFarRecords.length}{' '}
              {filteredFleetingFarRecords.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={() => {
                setPrintFarContext('fleeting');
                setSelectedFarRecordIdForPrint(null);
                setIsPrintFarModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export FAR for Classroom, Fleeting & Walkthrough Observation Table to PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>Export FAR (PDF)</span>
            </button>
            {!isTeacher && (
              <button
                type="button"
                onClick={() => handleOpenAddFar('fleeting')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAR for Classroom, Fleeting & Walkthrough Observation</span>
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
              {filteredFleetingFarRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No FAR for Classroom, Fleeting & Walkthrough Observation records found. Click &ldquo;FAR for Classroom, Fleeting & Walkthrough Observation&rdquo; to add a record.
                  </td>
                </tr>
              ) : (
                filteredFleetingFarRecords.map((r) => {
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
                              setPrintFarContext('fleeting');
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
                              onClick={() => handleOpenEditFar(r, 'fleeting')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-md text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Edit FAR for Classroom, Fleeting & Walkthrough Observation"
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

      {/* Table: Conduct New Classroom Observation Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-amber-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Conduct New Classroom Observation Table
            </h3>
            <p className="text-[11px] text-stone-600">
              Monitoring Tool On The Conduct Of Classroom Observations · Indicators Evaluation Matrix (E=Evident, NE=Not Evident)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-200/80 text-stone-900">
              {classroomMonitoringObservations.length}{' '}
              {classroomMonitoringObservations.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={() => setIsExportClassroomPdfOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export Classroom Observation Table records to formatted PDF with School Header & Observer details"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>Export Table to PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Observation Code</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Teacher Observed</th>
                <th className="py-3 px-4">Subject & Section</th>
                <th className="py-3 px-4">Assigned Instructional Supervisor</th>
                <th className="py-3 px-4 text-center">Live Indicator (E / NE)</th>
                <th className="py-3 px-4">Evaluation Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {classroomMonitoringObservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No Classroom Observation records yet. Click &ldquo;Conduct New Classroom Observation&rdquo; above to add a record.
                  </td>
                </tr>
              ) : (
                classroomMonitoringObservations.map((obs) => {
                  const evidentCount = obs.ratings.filter(
                    (r) => (r.evidentStatus || (r.score >= 5 ? 'E' : 'NE')) === 'E'
                  ).length;
                  const notEvidentCount = obs.ratings.filter(
                    (r) => (r.evidentStatus || (r.score >= 5 ? 'E' : 'NE')) === 'NE'
                  ).length;
                  const isEvidentStatus = obs.overallRating !== 'Not Evident';

                  return (
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
                      <td className="py-3 px-4 text-center font-mono font-bold text-xs text-stone-900">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-[#701628]/10 text-[#701628]">
                            E: {evidentCount}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                            NE: {notEvidentCount}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isEvidentStatus
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {obs.overallRating}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onSelectObservationForPrint && (
                            <button
                              onClick={() => onSelectObservationForPrint(obs.id)}
                              className="p-1.5 text-stone-700 hover:text-[#701628] hover:bg-stone-100 rounded transition-colors"
                              title="Print Monitoring Tool Sheet"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table: PMCF for Classroom Observation Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              PMCF for Classroom Observation Table
            </h3>
            <p className="text-[11px] text-stone-500">
              Performance Monitoring and Coaching Form (PMCF) · Coaching Interventions for Classroom Observation
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#701628]/10 text-[#701628]">
              {filteredClassroomPmcfRecords.length}{' '}
              {filteredClassroomPmcfRecords.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={() => {
                setPrintPmcfContext('classroom');
                setSelectedPmcfRecordIdForPrint(null);
                setIsPrintPmcfModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export PMCF for Classroom Observation Table to PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>Export PMCF (PDF)</span>
            </button>
            {!isTeacher && (
              <button
                type="button"
                onClick={() => handleOpenAddPmcf('classroom')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8C2437] hover:bg-[#701628] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add PMCF for Classroom Observation</span>
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
              {filteredClassroomPmcfRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No PMCF for Classroom Observation records found. Click &ldquo;PMCF for Classroom Observation&rdquo; to add a record.
                  </td>
                </tr>
              ) : (
                filteredClassroomPmcfRecords.map((r) => (
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
                            setPrintPmcfContext('classroom');
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
                            onClick={() => handleOpenEditPmcf(r, 'classroom')}
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

      {/* Table: FAR for Classroom Observation Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-amber-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              FAR for Classroom Observation Table
            </h3>
            <p className="text-[11px] text-stone-600">
              Findings, Analysis and Recommendations (FAR) · Classroom Observation Supervision Records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-200/80 text-stone-900">
              {filteredClassroomFarRecords.length}{' '}
              {filteredClassroomFarRecords.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={() => {
                setPrintFarContext('classroom');
                setSelectedFarRecordIdForPrint(null);
                setIsPrintFarModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export FAR for Classroom Observation Table to PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>Export FAR (PDF)</span>
            </button>
            {!isTeacher && (
              <button
                type="button"
                onClick={() => handleOpenAddFar('classroom')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAR for Classroom Observation</span>
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
              {filteredClassroomFarRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No FAR for Classroom Observation records found. Click &ldquo;FAR for Classroom Observation&rdquo; to add a record.
                  </td>
                </tr>
              ) : (
                filteredClassroomFarRecords.map((r) => {
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
                              setPrintFarContext('classroom');
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
                              onClick={() => handleOpenEditFar(r, 'classroom')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-md text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Edit FAR for Classroom Observation"
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

      {/* Modal: Log Fleeting & Walkthrough Observation (Create & Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
            <div className="bg-blue-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">
                {editingVisit
                  ? 'Edit Fleeting & Walkthrough Observation'
                  : 'Log Fleeting & Walkthrough Observation'}
              </h3>
              <button
                onClick={() => {
                  setEditingVisit(null);
                  setIsModalOpen(false);
                }}
                className="p-1 rounded-lg text-blue-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Teacher</label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grade & Section</label>
                  <input
                    type="text"
                    required
                    value={gradeAndSection}
                    onChange={(e) => setGradeAndSection(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={25}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Learner Engagement
                  </label>
                  <select
                    value={learnerEngagementLevel}
                    onChange={(e) => setLearnerEngagementLevel(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="High (80-100%)">High (80-100%)</option>
                    <option value="Moderate (50-79%)">Moderate (50-79%)</option>
                    <option value="Needs Support (<50%)">Needs Support (&lt;50%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Classroom Climate
                  </label>
                  <select
                    value={classroomAtmosphere}
                    onChange={(e) => setClassroomAtmosphere(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Conducive & Orderly">Conducive & Orderly</option>
                    <option value="Active / Collaborative">Active / Collaborative</option>
                    <option value="Needs Management">Needs Management</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Boardwork Quality</label>
                  <select
                    value={boardWorkQuality}
                    onChange={(e) => setBoardWorkQuality(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Well-Structured">Well-Structured</option>
                    <option value="Adequate">Adequate</option>
                    <option value="Minimal">Minimal</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Time-on-Task</label>
                  <select
                    value={timeOnTask}
                    onChange={(e) => setTimeOnTask(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="On-schedule">On-schedule</option>
                    <option value="Transitioning">Transitioning</option>
                    <option value="Lagging">Lagging</option>
                  </select>
                </div>
              </div>

              {/* Monitoring Tool On The Fleeting & Walkthrough Observation */}
              <div className="space-y-3 pt-2">
                <div className="text-center py-2.5 bg-blue-50/80 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                    Monitoring Tool On The Fleeting &amp; Walkthrough Observation
                  </h4>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-2 gap-1">
                  <span className="font-bold text-stone-900 uppercase text-xs">
                    Indicators Evaluation Matrix
                  </span>
                  <span className="text-xs font-bold text-blue-800">
                    Choices: E = Evident, NE = Not Evident
                  </span>
                </div>

                <div className="space-y-4">
                  {FLEETING_WALKTHROUGH_MONITORING_SECTIONS.map((section) => (
                    <div key={section.sectionTitle} className="space-y-2.5">
                      <div className="py-2 px-3 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center justify-between">
                        <h5 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          {section.sectionTitle}
                        </h5>
                        <span className="text-[11px] font-bold text-stone-600 uppercase">
                          Indicator:
                        </span>
                      </div>

                      <div className="space-y-2">
                        {section.items.map((item) => {
                          const currentStatus = fleetingMonitoringRatings[item.id] || 'E';
                          return (
                            <div
                              key={item.id}
                              className="p-3 rounded-lg border border-stone-200 bg-white hover:border-blue-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="text-stone-800 font-medium leading-relaxed">
                                <span className="font-bold text-stone-900 mr-1">
                                  {item.numberLabel}
                                </span>
                                {item.title}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                {(['E', 'NE'] as const).map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => handleFleetingRatingChange(item.id, status)}
                                    title={status === 'E' ? 'E = Evident' : 'NE = Not Evident'}
                                    className={`px-3 h-8 rounded text-xs font-bold transition-all cursor-pointer border ${
                                      currentStatus === status
                                        ? status === 'E'
                                          ? 'bg-blue-700 text-white border-blue-800 shadow-xs scale-105 ring-2 ring-amber-400'
                                          : 'bg-rose-700 text-white border-rose-800 shadow-xs scale-105 ring-2 ring-amber-400'
                                        : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                                    }`}
                                  >
                                    {status === 'E' ? 'E = Evident' : 'NE = Not Evident'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Rapid Commendation</label>
                <input
                  type="text"
                  required
                  value={rapidCommendation}
                  onChange={(e) => setRapidCommendation(e.target.value)}
                  placeholder="e.g. Well-organized visual charts, students actively participating"
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Quick Coaching Tip</label>
                <input
                  type="text"
                  required
                  value={quickCoachingTip}
                  onChange={(e) => setQuickCoachingTip(e.target.value)}
                  placeholder="e.g. Check seating arrangement for learners on far left side"
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingVisit(null);
                    setIsModalOpen(false);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingVisit ? 'Save Changes' : 'Save Walkthrough'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Conduct New Classroom Observation */}
      {isClassroomObsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">Conduct New Classroom Observation</h3>
              </div>
              <button
                onClick={() => setIsClassroomObsModalOpen(false)}
                className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveClassroomObservation}
              className="p-6 overflow-y-auto space-y-6 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Teacher to Observe</label>
                  <select
                    value={selectedObsTeacherId}
                    onChange={(e) => {
                      setSelectedObsTeacherId(e.target.value);
                      const t = teachers.find((tch) => tch.id === e.target.value);
                      if (t) {
                        if (t.subject) setObsSubjectTaught(t.subject);
                        if (t.gradeLevels && t.gradeLevels[0]) {
                          setObsGradeAndSection(`${t.gradeLevels[0]} - Section 1`);
                        }
                        if (
                          t.assignedSupervisorId &&
                          supervisors.some((s) => s.id === t.assignedSupervisorId)
                        ) {
                          setSelectedObsSupervisorId(t.assignedSupervisorId);
                        }
                      }
                    }}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900 font-semibold"
                  >
                    {teachers.map((t) => (
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
                    value={selectedObsSupervisorId}
                    onChange={(e) => setSelectedObsSupervisorId(e.target.value)}
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
                    value={obsSubjectTaught}
                    onChange={(e) => setObsSubjectTaught(e.target.value)}
                    placeholder="e.g. Science 9 (Biology)"
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grade & Section</label>
                  <input
                    type="text"
                    required
                    value={obsGradeAndSection}
                    onChange={(e) => setObsGradeAndSection(e.target.value)}
                    placeholder="e.g. Grade 9 - Ruby"
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Date of Observation</label>
                  <input
                    type="date"
                    required
                    value={obsDate}
                    onChange={(e) => setObsDate(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Time Schedule</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={obsTimeStart}
                      onChange={(e) => setObsTimeStart(e.target.value)}
                      placeholder="08:30 AM"
                      className="w-1/2 border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                    />
                    <input
                      type="text"
                      value={obsTimeEnd}
                      onChange={(e) => setObsTimeEnd(e.target.value)}
                      placeholder="09:30 AM"
                      className="w-1/2 border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Term</label>
                  <select
                    value={obsQuarterTerm}
                    onChange={(e) => setObsQuarterTerm(e.target.value as any)}
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
                    value={obsTopicTitle}
                    onChange={(e) => setObsTopicTitle(e.target.value)}
                    placeholder="e.g. Structure and Functions of the Circulatory System"
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white text-stone-900"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-center py-2 bg-stone-50 rounded-lg border border-stone-200">
                  <h3 className="text-sm font-bold text-[#701628] uppercase tracking-wide">
                    Monitoring Tool On The Conduct Of Classroom Observations
                  </h3>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-2 gap-1">
                  <h4 className="font-bold text-stone-900 uppercase text-xs">
                    Indicators Evaluation Matrix (E=Evident, NE=Not Evident)
                  </h4>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#701628]">
                      Live Indicator: E=(Evident), NE=(Not Evident)
                    </span>
                  </div>
                </div>

                <div className="space-y-5">
                  {CLASSROOM_OBSERVATION_SECTIONS.map((section) => (
                    <div key={section.sectionTitle} className="space-y-3">
                      <div className="text-center py-2 bg-amber-50/80 border border-amber-200 rounded-lg">
                        <h5 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          {section.sectionTitle}
                        </h5>
                      </div>

                      <div className="space-y-3">
                        {section.items.map((item) => {
                          const currentEvident = indicatorEvident[item.id] || 'E';
                          return (
                            <div
                              key={item.id}
                              className="p-3 rounded-lg border border-stone-200 bg-white hover:border-amber-300 transition-colors"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="max-w-xl">
                                  <div className="font-bold text-stone-800">
                                    {item.numberLabel} {item.title}
                                  </div>
                                  <div className="text-[11px] font-medium text-stone-500 mt-0.5">
                                    {item.movs}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {(['E', 'NE'] as const).map((status) => (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => handleEvidentChange(item.id, status)}
                                      title={status === 'E' ? 'Evident' : 'Not Evident'}
                                      className={`px-3 h-8 rounded text-xs font-bold transition-all cursor-pointer ${
                                        currentEvident === status
                                          ? status === 'E'
                                            ? 'bg-[#701628] text-white shadow-xs scale-105 ring-2 ring-amber-400'
                                            : 'bg-rose-700 text-white shadow-xs scale-105 ring-2 ring-amber-400'
                                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                      }`}
                                    >
                                      {status}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="mt-2">
                                <input
                                  type="text"
                                  placeholder="Optional observer evidence or specific commendation..."
                                  value={indicatorComments[item.id] || ''}
                                  onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                  className="w-full text-[11px] border border-stone-200 rounded px-2.5 py-1 text-stone-700 focus:outline-none focus:border-[#701628]"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Commendations & Teacher Strengths
                  </label>
                  <textarea
                    rows={2}
                    value={obsStrengths}
                    onChange={(e) => setObsStrengths(e.target.value)}
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
                    value={obsAreasForDevelopment}
                    onChange={(e) => setObsAreasForDevelopment(e.target.value)}
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
                    value={obsPreConferenceNotes}
                    onChange={(e) => setObsPreConferenceNotes(e.target.value)}
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
                    value={obsPostConferenceNotes}
                    onChange={(e) => setObsPostConferenceNotes(e.target.value)}
                    placeholder="Shared reflections and actionable commitments made during post-conference..."
                    className="w-full border border-stone-300 rounded-lg p-2 text-stone-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsClassroomObsModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Save Classroom Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: PMCF (Same modal for PMCF for Classroom Observation & PMCF for Classroom, Fleeting & Walkthrough Observation) */}
      {isPmcfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {pmcfModalContext === 'fleeting'
                    ? editingPmcf
                      ? `Edit PMCF for Classroom, Fleeting & Walkthrough Observation (${editingPmcf.recordNo})`
                      : 'PMCF for Classroom, Fleeting & Walkthrough Observation'
                    : editingPmcf
                      ? `Edit PMCF for Classroom Observation (${editingPmcf.recordNo})`
                      : 'PMCF for Classroom Observation'}
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
                    {teachers.map((t) => (
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

      {/* Modal: FAR (Same modal for FAR for Classroom Observation & FAR for Classroom, Fleeting & Walkthrough Observation) */}
      {isFarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {farModalContext === 'fleeting'
                    ? editingFar
                      ? `Edit FAR for Classroom, Fleeting & Walkthrough Observation (${editingFar.farCode})`
                      : 'FAR for Classroom, Fleeting & Walkthrough Observation'
                    : editingFar
                      ? `Edit FAR for Classroom Observation (${editingFar.farCode})`
                      : 'FAR for Classroom Observation'}
                </h3>
                <p className="text-[11px] text-amber-200">
                  Findings, Analysis and Recommendation · Classroom Observation Evaluation
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
                  {teachers.map((t) => (
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

      {/* Export Classroom Observation Table PDF Modal */}
      <PrintClassroomObservationTableModal
        isOpen={isExportClassroomPdfOpen}
        onClose={() => setIsExportClassroomPdfOpen(false)}
        records={classroomMonitoringObservations}
      />

      {/* PMCF Official DepEd PDF / Print Modal */}
      <PrintPmcfReportModal
        isOpen={isPrintPmcfModalOpen}
        onClose={() => setIsPrintPmcfModalOpen(false)}
        initialSelectedRecordId={selectedPmcfRecordIdForPrint}
        records={
          printPmcfContext === 'fleeting'
            ? filteredFleetingPmcfRecords
            : filteredClassroomPmcfRecords
        }
      />

      {/* FAR Official DepEd PDF / Print Modal */}
      <PrintFarReportModal
        isOpen={isPrintFarModalOpen}
        onClose={() => setIsPrintFarModalOpen(false)}
        initialSelectedRecordId={selectedFarRecordIdForPrint}
        records={
          printFarContext === 'fleeting'
            ? filteredFleetingFarRecords
            : filteredClassroomFarRecords
        }
      />
    </div>
  );
};
