import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  ResourceLink,
  CotIndicatorRating,
  FleetingObservation,
} from '../types';
import {
  CLASSROOM_OBSERVATION_SECTIONS,
  ALL_CLASSROOM_MONITORING_ITEMS,
} from './CotObservationView';
import { FLEETING_WALKTHROUGH_MONITORING_SECTIONS } from './FleetingObservationView';
import {
  FormativeTerm,
  FormativeAssessmentRecord,
  SummativeTerm,
  SummativeAssessmentRecord,
} from './FarPmcfView';
import { MeMonitoringTablesSection } from '../components/MeMonitoringTablesSection';
import {
  FileSpreadsheet,
  Download,
  ExternalLink,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  ClipboardCheck,
  CheckCircle2,
} from 'lucide-react';

const FORMATIVE_STORAGE_KEY = 'bnhs_omes_formative_records_v2';
const SUMMATIVE_STORAGE_KEY = 'bnhs_omes_summative_records_v2';

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

const normalizeResourceCategory = (cat: string): ResourceLink['category'] => {
  return cat
    .replace(/COT-RPMS/g, 'COT-PMES')
    .replace('DLL / DLP Templates', 'DLL/DLP ILAW Templates')
    .replace('Fleeting/Walkthrough Observation Monitoring ToolTerm1', 'Fleeting/Walkthrough Observation Monitoring Tool Term1')
    .replace('Fleeting/Walkthrough Observation Monitoring ToolTerm2', 'Fleeting/Walkthrough Observation Monitoring Tool Term2')
    .replace('Fleeting/Walkthrough Observation Monitoring ToolTerm3', 'Fleeting/Walkthrough Observation Monitoring Tool Term3');
};

export const ReportsLinksView: React.FC = () => {
  const {
    teachers,
    supervisors,
    resourceLinks,
    addResourceLink,
    updateResourceLink,
    deleteResourceLink,
    exportAllCsv,
    exportDatabaseJson,
    observations,
    addObservation,
    fleetingObservations,
    addFleetingObservation,
    lessonPlans,
    addLessonPlan,
    pmcfRecords,
    farRecords,
    assessments,
    addAssessment,
    auditLogs,
  } = useData();
  const { currentUser, isAdmin, isTeacher } = useAuth();

  const [activeTab, setActiveTab] = useState<'term-reports' | 'resources'>('term-reports');
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ResourceLink | null>(null);
  const [submissionToast, setSubmissionToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSubmissionToast(msg);
    setTimeout(() => setSubmissionToast(null), 4000);
  };

  // Link Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ResourceLink['category']>('Drive Folder');
  const [url, setUrl] = useState('https://drive.google.com/drive/folders/');
  const [description, setDescription] = useState('');

  // ============================================================================
  // 1. M & E TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS (Same as Conduct New Classroom Observation)
  // ============================================================================
  const [isClassroomObsModalOpen, setIsClassroomObsModalOpen] = useState(false);
  const [selectedObsTeacherId, setSelectedObsTeacherId] = useState(teachers[0]?.id || '');
  const [selectedObsSupervisorId, setSelectedObsSupervisorId] = useState(supervisors[0]?.id || '');
  const [obsQuarterTerm, setObsQuarterTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1');
  const [obsGradeAndSection, setObsGradeAndSection] = useState('Grade 9 - Ruby');
  const [obsSubjectTaught, setObsSubjectTaught] = useState(teachers[0]?.subject || 'Science 9 (Biology)');
  const [obsTopicTitle, setObsTopicTitle] = useState('');
  const [obsDate, setObsDate] = useState(new Date().toISOString().slice(0, 10));
  const [obsTimeStart, setObsTimeStart] = useState('08:30 AM');
  const [obsTimeEnd, setObsTimeEnd] = useState('09:30 AM');
  const [obsStrengths, setObsStrengths] = useState('');
  const [obsAreasForDevelopment, setObsAreasForDevelopment] = useState('');
  const [obsPreConferenceNotes, setObsPreConferenceNotes] = useState('');
  const [obsPostConferenceNotes, setObsPostConferenceNotes] = useState('');
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

  const handleEvidentChange = (id: number, status: 'E' | 'NE') => {
    setIndicatorEvident((prev) => ({ ...prev, [id]: status }));
  };

  const handleCommentChange = (id: number, text: string) => {
    setIndicatorComments((prev) => ({ ...prev, [id]: text }));
  };

  const handleSaveClassroomObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === selectedObsTeacherId) || teachers[0];
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
    showToast('Saved Classroom Observation record successfully.');
  };

  // ============================================================================
  // 2. M & E FLEETING WALKTHROUGH OBSERVATION (Same as Log Fleeting & Walkthrough Observation)
  // ============================================================================
  const [isFleetingModalOpen, setIsFleetingModalOpen] = useState(false);
  const [fleetingTeacherId, setFleetingTeacherId] = useState(teachers[0]?.id || '');
  const [fleetingGradeAndSection, setFleetingGradeAndSection] = useState('Grade 9 - Ruby');
  const [fleetingSubject, setFleetingSubject] = useState('Science 9');
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

  const handleOpenFleetingModal = () => {
    setFleetingTeacherId(teachers[0]?.id || '');
    setFleetingGradeAndSection('Grade 9 - Ruby');
    setFleetingSubject('Science 9');
    setDurationMinutes(10);
    setLearnerEngagementLevel('High (80-100%)');
    setClassroomAtmosphere('Conducive & Orderly');
    setBoardWorkQuality('Well-Structured');
    setTimeOnTask('On-schedule');
    setFleetingMonitoringRatings({ ...DEFAULT_FLEETING_MONITORING_RATINGS });
    setRapidCommendation('');
    setQuickCoachingTip('');
    setIsFleetingModalOpen(true);
  };

  const handleFleetingRatingChange = (id: string, status: 'E' | 'NE') => {
    setFleetingMonitoringRatings((prev) => ({ ...prev, [id]: status }));
  };

  const handleSaveFleeting = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === fleetingTeacherId) || teachers[0];
    if (!teacher) return;

    addFleetingObservation({
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      supervisorId: currentUser.id,
      supervisorName: currentUser.fullName,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      durationMinutes,
      gradeAndSection: fleetingGradeAndSection,
      subject: fleetingSubject,
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

    setIsFleetingModalOpen(false);
    setRapidCommendation('');
    setQuickCoachingTip('');
    showToast('Saved Fleeting & Walkthrough Observation record successfully.');
  };

  // ============================================================================
  // 3. M & E TOOL ON THE CHECKING-THE LESSON PLAN (Same as Submit / Log Weekly Lesson Plan (DLL))
  // ============================================================================
  const [isSubmitLessonPlanModalOpen, setIsSubmitLessonPlanModalOpen] = useState(false);
  const [dllTeacherId, setDllTeacherId] = useState(teachers[0]?.id || '');
  const [dllSupervisorId, setDllSupervisorId] = useState(supervisors[0]?.id || '');
  const [dllSubjectGrade, setDllSubjectGrade] = useState('Science 9 (Grade 9)');
  const [dllLessonTitle, setDllLessonTitle] = useState('');
  const [dllWeekNumber, setDllWeekNumber] = useState<number | string>(9);
  const [dllQuarterTerm, setDllQuarterTerm] = useState<
    'Term 1' | 'Term 2' | 'Term 3' | 'CO1' | 'CO2' | 'CO3'
  >('Term 1');
  const [dllDriveUrl, setDllDriveUrl] = useState(supervisors[0]?.driveUrl || '');

  const assignedDllSupervisor =
    supervisors.find((s) => s.id === dllSupervisorId) || supervisors[0];

  const handleOpenSubmitLessonPlanModal = () => {
    const initialTeacher = isTeacher
      ? teachers.find((t) => t.fullName === currentUser.fullName) || teachers[0]
      : teachers[0];

    if (initialTeacher) {
      setDllTeacherId(initialTeacher.id);
      if (initialTeacher.subject) {
        setDllSubjectGrade(`${initialTeacher.subject} (${initialTeacher.gradeLevels[0] || 'Grade 9'})`);
      }
    }

    const sup = initialTeacher
      ? supervisors.find((s) => s.id === initialTeacher.assignedSupervisorId) || supervisors[0]
      : supervisors[0];

    setDllSupervisorId(sup?.id || '');
    setDllWeekNumber(9);
    setDllQuarterTerm('Term 1');
    setDllDriveUrl(sup?.driveUrl || '');
    setDllLessonTitle('');
    setIsSubmitLessonPlanModalOpen(true);
  };

  const handleSubmitNewPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = isTeacher
      ? teachers.find((t) => t.fullName === currentUser.fullName) || teachers[0]
      : teachers.find((t) => t.id === dllTeacherId) || teachers[0];
    if (!teacher) return;

    const targetSupervisor =
      supervisors.find((s) => s.id === dllSupervisorId) ||
      supervisors.find((s) => s.id === teacher.assignedSupervisorId) ||
      supervisors[0];

    addLessonPlan({
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      department: teacher.department,
      supervisorId: targetSupervisor ? targetSupervisor.id : teacher.assignedSupervisorId,
      supervisorName: targetSupervisor
        ? targetSupervisor.fullName
        : 'Assigned Instructional Supervisor',
      dateSubmitted: new Date().toISOString().slice(0, 10),
      dateChecked: 'Pending',
      weekNumber: dllWeekNumber,
      quarterTerm: dllQuarterTerm,
      subjectGrade: dllSubjectGrade,
      lessonTitle: dllLessonTitle || 'Lesson Plan Unit',
      driveUrl:
        dllDriveUrl.trim() ||
        targetSupervisor?.driveUrl ||
        'https://drive.google.com/drive/folders/1bnhs-sup-santos-dll-archive',
      checklist: {
        melcAligned: true,
        clearObjectives: true,
        learningResourcesAdequate: true,
        pedagogicalProceduresSequenced: true,
        formativeAssessmentIncluded: false,
        reflectionCompleted: false,
      },
      status: 'Pending Inspection',
      remarks: 'Submitted for weekly inspection.',
      supervisorFeedback: 'Awaiting supervisory inspection.',
    });

    setIsSubmitLessonPlanModalOpen(false);
    setDllLessonTitle('');
    setDllDriveUrl('');
    showToast('Submitted Weekly Lesson Plan (DLL) record successfully.');
  };

  // ============================================================================
  // 4. M & E TOOL ON CHECKING ASSESSMENT (Formative, Summative & Record MPS Assessment Modal)
  // ============================================================================
  const [isCheckingAssessmentModalOpen, setIsCheckingAssessmentModalOpen] = useState(false);
  const [assessmentModalMode, setAssessmentModalMode] = useState<'formative' | 'summative' | 'mps'>('summative');

  // Formative Assessment State
  const [formativeTerm, setFormativeTerm] = useState<FormativeTerm>('Term 1');
  const [formativeDate, setFormativeDate] = useState(new Date().toISOString().slice(0, 10));
  const [formativeTeacherId, setFormativeTeacherId] = useState(teachers[0]?.id || '1');
  const [formativeSubject, setFormativeSubject] = useState(teachers[0]?.department || 'Mathematics');
  const [formativeGradeLevel, setFormativeGradeLevel] = useState(teachers[0]?.gradeLevels?.[0] || 'Grade 10');
  const [formativeSection, setFormativeSection] = useState('Section A');
  const [formativeType, setFormativeType] = useState('Short Quiz / Exit Ticket');
  const [formativeCompetency, setFormativeCompetency] = useState('');
  const [formativeTotalLearners, setFormativeTotalLearners] = useState(42);
  const [formativeMasteryCount, setFormativeMasteryCount] = useState(35);
  const [formativeMeanScore, setFormativeMeanScore] = useState(16.5);
  const [formativeHps, setFormativeHps] = useState(20);
  const [formativeFeedback, setFormativeFeedback] = useState('');
  const [formativeGoogleDriveLink, setFormativeGoogleDriveLink] = useState('');

  // Summative Assessment State
  const [summativeTerm, setSummativeTerm] = useState<SummativeTerm>('Term 1');
  const [summativeDate, setSummativeDate] = useState(new Date().toISOString().slice(0, 10));
  const [summativeTeacherId, setSummativeTeacherId] = useState(teachers[0]?.id || '1');
  const [summativeSubject, setSummativeSubject] = useState(teachers[0]?.department || 'Mathematics');
  const [summativeGradeLevel, setSummativeGradeLevel] = useState(teachers[0]?.gradeLevels?.[0] || 'Grade 10');
  const [summativeSection, setSummativeSection] = useState('Section A');
  const [summativeType, setSummativeType] = useState('Unit / Long Summative Test');
  const [summativeTosVerified, setSummativeTosVerified] = useState<'TOS & Answer Key Verified' | 'Pending TOS Verification'>('TOS & Answer Key Verified');
  const [summativeCompetency, setSummativeCompetency] = useState('');
  const [summativeTotalLearners, setSummativeTotalLearners] = useState(45);
  const [summativePassedCount, setSummativePassedCount] = useState(38);
  const [summativeMeanScore, setSummativeMeanScore] = useState(40);
  const [summativeHps, setSummativeHps] = useState(50);
  const [summativeLeastMastered, setSummativeLeastMastered] = useState('');
  const [summativeExamPeriod, setSummativeExamPeriod] = useState('1st Periodical / Term 1 Examination');
  const [summativeTotalItems, setSummativeTotalItems] = useState(50);
  const [summativeQualitySignOff, setSummativeQualitySignOff] = useState('Approved for Reproduction');
  const [summativeTosAttached, setSummativeTosAttached] = useState(true);
  const [summativeBloomRemember, setSummativeBloomRemember] = useState(10);
  const [summativeBloomUnderstand, setSummativeBloomUnderstand] = useState(10);
  const [summativeBloomApply, setSummativeBloomApply] = useState(15);
  const [summativeBloomAnalyze, setSummativeBloomAnalyze] = useState(8);
  const [summativeBloomEvaluate, setSummativeBloomEvaluate] = useState(4);
  const [summativeBloomCreate, setSummativeBloomCreate] = useState(3);
  const [summativeAnswerKeyVerified, setSummativeAnswerKeyVerified] = useState(true);
  const [summativeItemQualityRemarks, setSummativeItemQualityRemarks] = useState('');
  const [summativeGoogleDriveLink, setSummativeGoogleDriveLink] = useState('');

  // Record MPS Assessment State
  const [mpsSubject, setMpsSubject] = useState('Science 9');
  const [mpsGradeLevel, setMpsGradeLevel] = useState('Grade 9');
  const [mpsSection, setMpsSection] = useState('Ruby');
  const [mpsTeacherName, setMpsTeacherName] = useState(teachers[0]?.fullName || '');
  const [mpsQuarterTerm, setMpsQuarterTerm] = useState('Term 1');
  const [totalTakers, setTotalTakers] = useState(45);
  const [meanScore, setMeanScore] = useState(38.5);
  const [highestPossibleScore, setHighestPossibleScore] = useState(50);
  const [leastMastered, setLeastMastered] = useState('Gas exchange and circulatory flow analysis');
  const [remediationPlan, setRemediationPlan] = useState('Conduct peer tutoring during Friday remediation period.');
  const [mpsGoogleDriveLink, setMpsGoogleDriveLink] = useState('');

  const bloomTotalAllocated =
    Number(summativeBloomRemember || 0) +
    Number(summativeBloomUnderstand || 0) +
    Number(summativeBloomApply || 0) +
    Number(summativeBloomAnalyze || 0) +
    Number(summativeBloomEvaluate || 0) +
    Number(summativeBloomCreate || 0);

  const computedTosAlignmentText =
    bloomTotalAllocated === Number(summativeTotalItems)
      ? `Aligned (${bloomTotalAllocated} / ${summativeTotalItems} Items · 100% DepEd Cognitive Balance)`
      : `Discrepancy (${bloomTotalAllocated} / ${summativeTotalItems} Items Allocated — Adjust Bloom's Distribution)`;

  const handleOpenCheckingAssessmentModal = () => {
    const defaultTeacher =
      (isTeacher && currentUser
        ? teachers.find((t) => t.id === currentUser.id || t.fullName === currentUser.fullName)
        : undefined) || teachers[0];
    const today = new Date().toISOString().slice(0, 10);

    setFormativeDate(today);
    setFormativeTeacherId(defaultTeacher?.id || '1');
    setFormativeSubject(defaultTeacher?.department || 'Mathematics');
    setFormativeGradeLevel(defaultTeacher?.gradeLevels?.[0] || 'Grade 10');

    setSummativeDate(today);
    setSummativeTeacherId(defaultTeacher?.id || '1');
    setSummativeSubject(defaultTeacher?.department || 'Mathematics');
    setSummativeGradeLevel(defaultTeacher?.gradeLevels?.[0] || 'Grade 10');

    setMpsTeacherName(defaultTeacher?.fullName || '');
    setIsCheckingAssessmentModalOpen(true);
  };

  const handleSaveFormative = (e: React.FormEvent) => {
    e.preventDefault();
    const teacherObj = teachers.find((t) => t.id === formativeTeacherId);
    const computedMps =
      formativeHps > 0 ? Number(((formativeMeanScore / formativeHps) * 100).toFixed(1)) : 0;
    const status: 'Mastery Achieved' | 'Needs Remediation' =
      computedMps >= 75 ? 'Mastery Achieved' : 'Needs Remediation';

    try {
      const saved = localStorage.getItem(FORMATIVE_STORAGE_KEY);
      const existing: FormativeAssessmentRecord[] = saved ? JSON.parse(saved) : [];
      const nextNum = existing.length + 1;
      const newRecord: FormativeAssessmentRecord = {
        id: `form-${Date.now()}`,
        code: `FA-2026-${String(nextNum).padStart(3, '0')}`,
        date: formativeDate,
        term: formativeTerm,
        teacherId: formativeTeacherId,
        teacherName: teacherObj ? teacherObj.fullName : 'Assigned Teacher',
        subject: formativeSubject,
        gradeLevel: formativeGradeLevel,
        section: formativeSection,
        formativeType,
        competencyTopic: formativeCompetency,
        totalLearners: Number(formativeTotalLearners),
        masteryCount: Number(formativeMasteryCount),
        meanScore: Number(formativeMeanScore),
        highestPossibleScore: Number(formativeHps),
        mps: computedMps,
        feedbackNotes: formativeFeedback,
        status,
        googleDriveLink: formativeGoogleDriveLink.trim(),
      };
      localStorage.setItem(FORMATIVE_STORAGE_KEY, JSON.stringify([newRecord, ...existing]));
    } catch {
      // ignore storage errors
    }

    setIsCheckingAssessmentModalOpen(false);
    setFormativeCompetency('');
    setFormativeFeedback('');
    setFormativeGoogleDriveLink('');
    showToast(`Saved Formative Assessment (${formativeTerm}) record successfully.`);
  };

  const handleSaveSummative = (e: React.FormEvent) => {
    e.preventDefault();
    const teacherObj = teachers.find((t) => t.id === summativeTeacherId);
    const computedMps =
      summativeHps > 0 ? Number(((summativeMeanScore / summativeHps) * 100).toFixed(1)) : 0;
    const status: 'Mastery Achieved' | 'Needs Remediation' =
      computedMps >= 75 ? 'Mastery Achieved' : 'Needs Remediation';
    const derivedTosVerified: 'TOS & Answer Key Verified' | 'Pending TOS Verification' =
      summativeTosAttached && summativeAnswerKeyVerified
        ? 'TOS & Answer Key Verified'
        : summativeTosVerified;

    try {
      const saved = localStorage.getItem(SUMMATIVE_STORAGE_KEY);
      const existing: SummativeAssessmentRecord[] = saved ? JSON.parse(saved) : [];
      const nextNum = existing.length + 1;
      const newRecord: SummativeAssessmentRecord = {
        id: `sum-${Date.now()}`,
        code: `SA-2026-${String(nextNum).padStart(3, '0')}`,
        date: summativeDate,
        term: summativeTerm,
        teacherId: summativeTeacherId,
        teacherName: teacherObj ? teacherObj.fullName : 'Assigned Teacher',
        subject: summativeSubject,
        gradeLevel: summativeGradeLevel,
        section: summativeSection,
        summativeType,
        tosVerified: derivedTosVerified,
        competencyCoverage: summativeCompetency,
        totalLearners: Number(summativeTotalLearners),
        passedCount: Number(summativePassedCount),
        meanScore: Number(summativeMeanScore),
        highestPossibleScore: Number(summativeHps),
        mps: computedMps,
        leastMasteredNotes: summativeLeastMastered,
        status,
        examinationPeriod: summativeExamPeriod,
        totalItems: Number(summativeTotalItems),
        qualitySignOff: summativeQualitySignOff,
        tosAttached: summativeTosAttached,
        bloomRemember: Number(summativeBloomRemember),
        bloomUnderstand: Number(summativeBloomUnderstand),
        bloomApply: Number(summativeBloomApply),
        bloomAnalyze: Number(summativeBloomAnalyze),
        bloomEvaluate: Number(summativeBloomEvaluate),
        bloomCreate: Number(summativeBloomCreate),
        answerKeyVerified: summativeAnswerKeyVerified,
        tosAlignment: computedTosAlignmentText,
        itemQualityRemarks: summativeItemQualityRemarks,
        googleDriveLink: summativeGoogleDriveLink.trim(),
      };
      localStorage.setItem(SUMMATIVE_STORAGE_KEY, JSON.stringify([newRecord, ...existing]));
    } catch {
      // ignore storage errors
    }

    setIsCheckingAssessmentModalOpen(false);
    setSummativeCompetency('');
    setSummativeLeastMastered('');
    setSummativeItemQualityRemarks('');
    setSummativeGoogleDriveLink('');
    showToast(`Saved Summative Assessment (${summativeTerm}) record successfully.`);
  };

  const handleSaveMpsAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    const mps = Number(((meanScore / highestPossibleScore) * 100).toFixed(1));
    const competencies = leastMastered
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    addAssessment({
      subject: mpsSubject,
      gradeLevel: mpsGradeLevel,
      section: mpsSection,
      teacherName: mpsTeacherName,
      quarterTerm: mpsQuarterTerm as any,
      assessmentType: 'Quarterly Examination',
      totalTakers,
      meanScore,
      highestPossibleScore,
      mps,
      targetMet: mps >= 75,
      leastMasteredCompetencies:
        competencies.length > 0 ? competencies : ['Requires further item analysis'],
      remediationPlan,
      googleDriveLink: mpsGoogleDriveLink.trim(),
    });

    setIsCheckingAssessmentModalOpen(false);
    setMpsGoogleDriveLink('');
    showToast('Saved MPS Assessment record successfully.');
  };

  const handleOpenAddModal = () => {
    setEditingLink(null);
    setTitle('');
    setCategory('Drive Folder');
    setUrl('https://drive.google.com/drive/folders/');
    setDescription('');
    setIsAddLinkModalOpen(true);
  };

  const handleOpenEditModal = (link: ResourceLink) => {
    setEditingLink(link);
    setTitle(link.title.replace(/COT-RPMS/g, 'COT-PMES'));
    setCategory(normalizeResourceCategory(link.category));
    setUrl(link.url);
    setDescription(link.description);
    setIsAddLinkModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddLinkModalOpen(false);
    setEditingLink(null);
    setTitle('');
    setDescription('');
  };

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLink) {
      updateResourceLink(editingLink.id, {
        title,
        category,
        url,
        description,
      });
    } else {
      addResourceLink({
        title,
        category,
        url,
        description,
        dateAdded: new Date().toISOString().slice(0, 10),
      });
    }
    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      {submissionToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>{submissionToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmissionToast(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 bg-white p-3.5 sm:p-5 rounded-xl border border-stone-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
              <span>DepEd Reporting & Repository</span>
              <span aria-hidden="true">·</span>
              <span>Term 1, Term 2 & Term 3 Consolidations</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 mt-1">
              Supervisory Reports, CSV Exports & Google Drive Resources
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Generate DepEd consolidated term reports, export spreadsheet data, and access official curriculum links
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'resources' && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Resource Link</span>
              </button>
            )}
            <button
              onClick={exportDatabaseJson}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-lg transition-colors border border-stone-300 cursor-pointer"
              title="Download full JSON database snapshot"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Database Backup (JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 bg-white px-3 sm:px-5 rounded-t-xl gap-4 sm:gap-6 text-xs font-bold overflow-x-auto [scrollbar-width:none]">
        <button
          onClick={() => setActiveTab('term-reports')}
          className={`py-3 border-b-2 transition-colors ${
            activeTab === 'term-reports'
              ? 'border-[#701628] text-[#701628]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          DepEd Term Reports & CSV Export Center
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`py-3 border-b-2 transition-colors ${
            activeTab === 'resources'
              ? 'border-[#701628] text-[#701628]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Monitoring Tools on Google Sheets, Google Drive &amp; Official Web Links ({resourceLinks.length})
        </button>
      </div>

      {activeTab === 'term-reports' && (
        <div className="space-y-6">
          {/* CSV Export Quick Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#701628] mb-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="text-[10px] font-mono bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                    {observations.length} Records
                  </span>
                </div>
                <h4 className="font-bold text-stone-900 text-xs">COT-PMES Observation Log</h4>
                <p className="text-[11px] text-stone-500 mt-1">
                  Full records of 9 indicators, scores, qualitative remarks, and teacher signatures.
                </p>
              </div>
              <button
                onClick={() => exportAllCsv('cot')}
                className="mt-4 w-full py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export COT (.CSV)</span>
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-amber-700 mb-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="text-[10px] font-mono bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                    {lessonPlans.length} Logs
                  </span>
                </div>
                <h4 className="font-bold text-stone-900 text-xs">DLL / DLP Inspection Log</h4>
                <p className="text-[11px] text-stone-500 mt-1">
                  Weekly submissions, DepEd 6-point checklist results, and approval timestamps.
                </p>
              </div>
              <button
                onClick={() => exportAllCsv('dll')}
                className="mt-4 w-full py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export DLL (.CSV)</span>
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-emerald-700 mb-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                    {assessments.length} Tests
                  </span>
                </div>
                <h4 className="font-bold text-stone-900 text-xs">Quarterly MPS Analysis</h4>
                <p className="text-[11px] text-stone-500 mt-1">
                  Mean Percentage Score by subject, examinee count, and remediation plans.
                </p>
              </div>
              <button
                onClick={() => exportAllCsv('mps')}
                className="mt-4 w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export MPS (.CSV)</span>
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#701628] mb-2">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-[10px] font-mono bg-rose-50 text-[#701628] px-1.5 py-0.5 rounded font-bold">
                    {auditLogs.length} Events
                  </span>
                </div>
                <h4 className="font-bold text-stone-900 text-xs">System Audit Registry</h4>
                <p className="text-[11px] text-stone-500 mt-1">
                  Institutional changelog of teacher rosters, supervisor pairings & observations.
                </p>
              </div>
              <button
                onClick={() => exportAllCsv('audit')}
                className="mt-4 w-full py-2 bg-stone-800 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit (.CSV)</span>
              </button>
            </div>
          </div>

          {/* Term Consolidations (Term 1, Term 2, Term 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Term 1 */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
                <h3 className="font-bold text-stone-900 text-sm">Term 1 / Q1-Q2 Report</h3>
                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                  82% Completed
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-50">
                  <span className="text-stone-500">Supervisory Period:</span>
                  <span className="font-medium">August – October 2026</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-50">
                  <span className="text-stone-500">Completed COT Observations:</span>
                  <span className="font-mono font-bold text-[#701628]">14 / 16 Target</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-50">
                  <span className="text-stone-500">Overall Rating Distribution:</span>
                  <span className="font-bold text-stone-800">10 Outstanding, 4 VS</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">School Consolidated MPS:</span>
                  <span className="font-mono font-bold text-emerald-700">78.85%</span>
                </div>
              </div>
            </div>

            {/* Term 2 */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
                <h3 className="font-bold text-stone-900 text-sm">Term 2 / Q3 Report</h3>
                <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                  In Progress (15%)
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-50">
                  <span className="text-stone-500">Supervisory Period:</span>
                  <span className="font-medium">November 2026 – January 2027</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-50">
                  <span className="text-stone-500">Scheduled COT Observations:</span>
                  <span className="font-mono font-bold text-stone-700">16 Teachers</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-50">
                  <span className="text-stone-500">Pre-Conferences Completed:</span>
                  <span className="font-mono font-bold text-amber-700">4 / 16 Done</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Mid-Year Review Target:</span>
                  <span className="font-medium text-stone-700">January 2027</span>
                </div>
              </div>
            </div>

            {/* Term 3 */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
                <h3 className="font-bold text-stone-900 text-sm">Term 3 / Q4 & Year-End</h3>
                <span className="text-[11px] font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                  Scheduled
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-50">
                  <span className="text-stone-500">Supervisory Period:</span>
                  <span className="font-medium">February – May 2027</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-50">
                  <span className="text-stone-500">Year-End RPMS (IPCRF) Review:</span>
                  <span className="font-medium text-stone-700">May 2027</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-50">
                  <span className="text-stone-500">Consolidated MPS Target:</span>
                  <span className="font-mono font-bold text-emerald-700">&ge; 80.0%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Portfolio Verification:</span>
                  <span className="font-medium text-stone-500">Upcoming</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="space-y-6">
          {/* Monitoring Tools on Google Sheets, Google Drive & Official Web Links Table */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/70">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Monitoring Tools on Google Sheets, Google Drive &amp; Official Web Links
                </h3>
                <p className="text-[11px] text-stone-500">
                  Manage official DepEd monitoring tools, templates, and Google Drive repository links
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Resource Link</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100 text-stone-600 border-b border-stone-200 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Resource Title</th>
                    <th className="py-3 px-4 font-bold">Category</th>
                    <th className="py-3 px-4 font-bold">Description</th>
                    <th className="py-3 px-4 font-bold">Date Added</th>
                    <th className="py-3 px-4 font-bold">Resource Link</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {resourceLinks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        No Google Drive or official web links added yet.
                      </td>
                    </tr>
                  ) : (
                    resourceLinks.map((link) => {
                      const displayCategory = normalizeResourceCategory(link.category);
                      return (
                        <tr key={link.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-stone-900">
                            {link.title.replace(/COT-RPMS/g, 'COT-PMES')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block text-[10px] font-bold bg-amber-50 text-[#701628] border border-amber-200 px-2 py-0.5 rounded">
                              {displayCategory}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-600 max-w-xs">
                            <p className="line-clamp-2">{link.description}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                            {link.dateAdded}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#701628] font-bold hover:underline"
                            >
                              <span>Open Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(link)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-bold text-[11px] transition-colors"
                                title="Edit resource link"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => deleteResourceLink(link.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-bold text-[11px] transition-colors"
                                  title="Delete resource link"
                                >
                                  <Trash2 className="w-3 h-3" />
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

          {/* Resource Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resourceLinks.map((link) => (
              <div
                key={link.id}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-[10px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                      {normalizeResourceCategory(link.category)}
                    </span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-[#701628] hover:bg-stone-100 rounded shrink-0"
                      title="Open link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <h3 className="font-bold text-stone-900 text-xs sm:text-sm mb-1 leading-snug">
                    {link.title.replace(/COT-RPMS/g, 'COT-PMES')}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed mb-3">
                    {link.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#701628] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Open in Drive / Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(link)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-stone-600 hover:text-[#701628] hover:bg-stone-100 rounded font-semibold transition-colors"
                      title="Edit link"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => deleteResourceLink(link.id)}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        title="Delete link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 M & E Monitoring Tool Tables (Visible to Instructional Supervisor & Administrator, hidden in Teacher account) */}
      {!isTeacher && (
        <MeMonitoringTablesSection
          observations={observations}
          fleetingObservations={fleetingObservations}
          lessonPlans={lessonPlans}
          assessments={assessments}
          onOpenClassroomModal={() => setIsClassroomObsModalOpen(true)}
          onOpenFleetingModal={handleOpenFleetingModal}
          onOpenLessonPlanModal={handleOpenSubmitLessonPlanModal}
          onOpenAssessmentModal={handleOpenCheckingAssessmentModal}
        />
      )}

      {/* Add / Edit Link Modal */}
      {isAddLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingLink ? 'Edit DepEd / Google Drive Resource' : 'Add DepEd / Google Drive Resource'}
              </h3>
              <button onClick={handleCloseModal} className="p-1 rounded-lg text-amber-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLink} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Resource Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DepEd Memo No. 008, s. 2023 Guidelines"
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ResourceLink['category'])}
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                >
                  <option value="Drive Folder">Drive Folder</option>
                  <option value="DepEd Orders & Memoranda">DepEd Orders & Memoranda</option>
                  <option value="COT-PMES Forms & Rubrics">COT-PMES Forms & Rubrics</option>
                  <option value="MELCs & Curriculum Guides">MELCs & Curriculum Guides</option>
                  <option value="DLL/DLP ILAW Templates">DLL/DLP ILAW Templates</option>
                  <option value="Fleeting/Walkthrough Observation Monitoring Tool Term1">
                    Fleeting/Walkthrough Observation Monitoring Tool Term1
                  </option>
                  <option value="Fleeting/Walkthrough Observation Monitoring Tool Term2">
                    Fleeting/Walkthrough Observation Monitoring Tool Term2
                  </option>
                  <option value="Fleeting/Walkthrough Observation Monitoring Tool Term3">
                    Fleeting/Walkthrough Observation Monitoring Tool Term3
                  </option>
                  <option value="Classroom Observation Monitoring Tool Term1">
                    Classroom Observation Monitoring Tool Term1
                  </option>
                  <option value="Classroom Observation Monitoring Tool Term2">
                    Classroom Observation Monitoring Tool Term2
                  </option>
                  <option value="Classroom Observation Monitoring Tool Term3">
                    Classroom Observation Monitoring Tool Term3
                  </option>
                  <option value="Checking The Lesson Plan Monitoring Tool Term1">
                    Checking The Lesson Plan Monitoring Tool Term1
                  </option>
                  <option value="Checking The Lesson Plan Monitoring Tool Term2">
                    Checking The Lesson Plan Monitoring Tool Term2
                  </option>
                  <option value="Checking The Lesson Plan Monitoring Tool Term3">
                    Checking The Lesson Plan Monitoring Tool Term3
                  </option>
                  <option value="Checking The Assessment Monitoring Tool Term1">
                    Checking The Assessment Monitoring Tool Term1
                  </option>
                  <option value="Checking The Assessment Monitoring Tool Term2">
                    Checking The Assessment Monitoring Tool Term2
                  </option>
                  <option value="Checking The Assessment Monitoring Tool Term3">
                    Checking The Assessment Monitoring Tool Term3
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">URL (Drive link or web address)</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full border border-stone-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of the linked resource and intended supervisory usage..."
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs"
                >
                  {editingLink ? 'Update Resource' : 'Save Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODAL 1: Conduct New Classroom Observation
          (For M & E TOOL ON THE CONDUCT OF CLASSROOM OBSERVATIONS)
      ============================================================================ */}
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

      {/* ============================================================================
          MODAL 2: Log Fleeting & Walkthrough Observation
          (For M & E FLEETING WALKTHROUGH OBSERVATION)
      ============================================================================ */}
      {isFleetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
            <div className="bg-blue-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">
                Log Fleeting &amp; Walkthrough Observation
              </h3>
              <button
                onClick={() => setIsFleetingModalOpen(false)}
                className="p-1 rounded-lg text-blue-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFleeting} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Teacher</label>
                  <select
                    value={fleetingTeacherId}
                    onChange={(e) => setFleetingTeacherId(e.target.value)}
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
                    value={fleetingSubject}
                    onChange={(e) => setFleetingSubject(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grade & Section</label>
                  <input
                    type="text"
                    required
                    value={fleetingGradeAndSection}
                    onChange={(e) => setFleetingGradeAndSection(e.target.value)}
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
                  onClick={() => setIsFleetingModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Walkthrough
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODAL 3: Submit / Log Weekly Lesson Plan (DLL)
          (For M & E TOOL ON THE CHECKING-THE LESSON PLAN)
      ============================================================================ */}
      {isSubmitLessonPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 rounded-lg text-amber-300">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Submit / Log Weekly Lesson Plan (DLL)</h3>
                  <p className="text-xs text-amber-200/90">Barobo National High School OMES</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitLessonPlanModalOpen(false)}
                className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewPlan} className="p-6 space-y-4 text-xs">
              {!isTeacher && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Teacher</label>
                  <select
                    value={dllTeacherId}
                    onChange={(e) => {
                      setDllTeacherId(e.target.value);
                      const t = teachers.find((tch) => tch.id === e.target.value);
                      if (t && t.subject) {
                        setDllSubjectGrade(`${t.subject} (${t.gradeLevels[0] || 'Grade 9'})`);
                      }
                      const sup = t
                        ? supervisors.find((s) => s.id === t.assignedSupervisorId) || supervisors[0]
                        : supervisors[0];
                      if (sup) {
                        setDllSupervisorId(sup.id);
                      }
                      if (sup?.driveUrl) {
                        setDllDriveUrl(sup.driveUrl);
                      }
                    }}
                    className="w-full border border-stone-300 rounded-xl p-2.5 bg-white text-stone-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#701628]"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Assigned Instructional Supervisor Option Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-stone-700">
                    Assigned Instructional Supervisor
                  </label>
                  {assignedDllSupervisor?.driveUrl && (
                    <a
                      href={assignedDllSupervisor.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#701628] hover:underline"
                      title="Open Assigned Instructional Supervisor's Google Drive folder"
                    >
                      <ExternalLink className="w-3 h-3 text-amber-700" />
                      <span>Supervisor Drive ↗</span>
                    </a>
                  )}
                </div>
                <select
                  value={dllSupervisorId}
                  onChange={(e) => {
                    const newSupId = e.target.value;
                    setDllSupervisorId(newSupId);
                    const sup = supervisors.find((s) => s.id === newSupId);
                    if (sup?.driveUrl) {
                      setDllDriveUrl(sup.driveUrl);
                    }
                  }}
                  className="w-full border border-stone-300 rounded-xl p-2.5 bg-white text-stone-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#701628]"
                >
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} — {s.position} ({s.department})
                    </option>
                  ))}
                </select>
                {assignedDllSupervisor && (
                  <p className="text-[10px] text-stone-500 mt-1">
                    Selected Supervisor:{' '}
                    <span className="font-semibold text-[#701628]">
                      {assignedDllSupervisor.fullName}
                    </span>{' '}
                    · {assignedDllSupervisor.position} ({assignedDllSupervisor.department})
                  </p>
                )}
              </div>

              {/* Subject & Grade Level */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Subject & Grade Level</label>
                <input
                  type="text"
                  required
                  value={dllSubjectGrade}
                  onChange={(e) => setDllSubjectGrade(e.target.value)}
                  placeholder="e.g. Science 9 or English 10"
                  className="w-full border border-stone-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                />
              </div>

              {/* Week Number and Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Lesson Plan Week</label>
                  <select
                    value={dllWeekNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDllWeekNumber(/^\d+$/.test(val) ? Number(val) : val);
                    }}
                    className="w-full border border-stone-300 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#701628]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                      <option key={w} value={w}>
                        Week {w}
                      </option>
                    ))}
                    <option value="CO1">CO1</option>
                    <option value="CO2">CO2</option>
                    <option value="CO3">CO3</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Term</label>
                  <select
                    value={dllQuarterTerm}
                    onChange={(e) => setDllQuarterTerm(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-xl p-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#701628]"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                    <option value="CO1">CO1</option>
                    <option value="CO2">CO2</option>
                    <option value="CO3">CO3</option>
                  </select>
                </div>
              </div>

              {/* Lesson Title */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Lesson Title / Competency</label>
                <input
                  type="text"
                  required
                  value={dllLessonTitle}
                  onChange={(e) => setDllLessonTitle(e.target.value)}
                  placeholder="e.g. Plate Tectonics and Volcanic Distribution"
                  className="w-full border border-stone-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                />
              </div>

              {/* Google Drive Folder / Repository Link */}
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-stone-800">
                    Google Drive Link (Paste Destination Folder / Drive Link)
                  </label>
                  <div className="flex items-center gap-2">
                    {dllDriveUrl.trim() && (
                      <a
                        href={dllDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#701628] font-bold hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3 text-amber-700" />
                        <span>Open Drive Link ↗</span>
                      </a>
                    )}
                    {assignedDllSupervisor?.driveUrl &&
                      dllDriveUrl !== assignedDllSupervisor.driveUrl && (
                        <button
                          type="button"
                          onClick={() => setDllDriveUrl(assignedDllSupervisor.driveUrl || '')}
                          className="text-[10px] font-bold text-amber-800 hover:underline cursor-pointer"
                        >
                          Use Supervisor Drive
                        </button>
                      )}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={dllDriveUrl}
                    onChange={(e) => setDllDriveUrl(e.target.value)}
                    placeholder={
                      assignedDllSupervisor?.driveUrl ||
                      'https://drive.google.com/drive/folders/...'
                    }
                    className="w-full border border-stone-300 rounded-xl p-2.5 bg-white text-xs font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                  />
                </div>
                <p className="text-[10px] text-stone-600">
                  Paste your Google Drive folder or lesson plan link here so the Assigned Instructional Supervisor can directly access and inspect your DLL/DLP.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsSubmitLessonPlanModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Submit Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODAL 4: M & E TOOL ON CHECKING ASSESSMENT
          (Formative Assessment, Summative Assessment & Record MPS Assessment Modal)
      ============================================================================ */}
      {isCheckingAssessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                assessmentModalMode === 'summative'
                  ? 'bg-teal-800'
                  : 'bg-[#701628]'
              }`}
            >
              <div>
                <h3 className="text-base font-bold">
                  M &amp; E Tool on Checking Assessment —{' '}
                  {assessmentModalMode === 'formative'
                    ? 'Formative Assessment Modal'
                    : assessmentModalMode === 'summative'
                    ? 'Summative Assessment Modal'
                    : 'Record MPS Assessment Modal'}
                </h3>
                <p className="text-xs text-white/85 mt-0.5">
                  Switch between Summative Assessment (with TOS &amp; Bloom&apos;s QA), Formative Assessment, and Record MPS Assessment
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckingAssessmentModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Bar */}
            <div className="px-6 pt-4 pb-2 bg-stone-50 border-b border-stone-200 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAssessmentModalMode('summative')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  assessmentModalMode === 'summative'
                    ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                Summative Assessment (TOS &amp; Bloom&apos;s)
              </button>
              <button
                type="button"
                onClick={() => setAssessmentModalMode('formative')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  assessmentModalMode === 'formative'
                    ? 'bg-[#701628] text-white border-[#701628] shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                Formative Assessment
              </button>
              <button
                type="button"
                onClick={() => setAssessmentModalMode('mps')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  assessmentModalMode === 'mps'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                Record MPS Assessment
              </button>
            </div>

            {assessmentModalMode === 'summative' && (
              <form
                onSubmit={handleSaveSummative}
                className="p-6 space-y-4 text-xs max-h-[76vh] overflow-y-auto"
              >
                <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
                  <label className="block font-bold text-stone-800">
                    Select Target Summative Term Table <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { value: 'Term 1', label: 'Summative Term 1', sub: 'Routes to Table for Summative Term 1' },
                        { value: 'Term 2', label: 'Summative Term 2', sub: 'Routes to Table for Summative Term 2' },
                        {
                          value: 'Term 3',
                          label: 'Summative Term 3 (End of Term Assessment)',
                          sub: 'Routes to Table for Summative Term 3',
                        },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSummativeTerm(option.value);
                          if (option.value === 'Term 3' && summativeType === 'Unit / Long Summative Test') {
                            setSummativeType('End of Term Assessment');
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          summativeTerm === option.value
                            ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                            : 'bg-white text-stone-800 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-bold text-xs">{option.label}</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            summativeTerm === option.value ? 'text-teal-100' : 'text-stone-500'
                          }`}
                        >
                          {option.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Teacher</label>
                    <select
                      value={summativeTeacherId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSummativeTeacherId(id);
                        const found = teachers.find((t) => t.id === id);
                        if (found) {
                          setSummativeSubject(found.department);
                          setSummativeGradeLevel(found.gradeLevels?.[0] || 'Grade 10');
                        }
                      }}
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
                    <label className="block font-bold text-stone-700 mb-1">Date Conducted</label>
                    <input
                      type="date"
                      required
                      value={summativeDate}
                      onChange={(e) => setSummativeDate(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Subject / Learning Area</label>
                    <input
                      type="text"
                      required
                      value={summativeSubject}
                      onChange={(e) => setSummativeSubject(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Grade Level</label>
                    <input
                      type="text"
                      required
                      value={summativeGradeLevel}
                      onChange={(e) => setSummativeGradeLevel(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Section</label>
                    <input
                      type="text"
                      required
                      value={summativeSection}
                      onChange={(e) => setSummativeSection(e.target.value)}
                      placeholder="e.g., 10 - Rizal"
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Summative Assessment Type</label>
                    <select
                      value={summativeType}
                      onChange={(e) => setSummativeType(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                    >
                      <option value="Unit / Long Summative Test">Unit / Long Summative Test</option>
                      <option value="Quarterly / Term Summative Examination">Quarterly / Term Summative Examination</option>
                      <option value="Culminating Performance Assessment">Culminating Performance Assessment</option>
                      <option value="Departmental Standardized Exam">Departmental Standardized Exam</option>
                      <option value="End of Term Assessment">End of Term Assessment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">TOS & Answer Key QA</label>
                    <select
                      value={summativeTosVerified}
                      onChange={(e) =>
                        setSummativeTosVerified(
                          e.target.value as 'TOS & Answer Key Verified' | 'Pending TOS Verification'
                        )
                      }
                      className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                    >
                      <option value="TOS & Answer Key Verified">TOS & Answer Key Verified</option>
                      <option value="Pending TOS Verification">Pending TOS Verification</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Computed MPS Preview</label>
                    <div className="w-full border border-stone-200 bg-stone-50 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-stone-600 font-medium">MPS:</span>
                      <span
                        className={`text-sm font-black ${
                          summativeHps > 0 && (summativeMeanScore / summativeHps) * 100 >= 75
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {summativeHps > 0 ? ((summativeMeanScore / summativeHps) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Unit / Term Competency Coverage & Cognitive Domains Evaluated
                  </label>
                  <input
                    type="text"
                    required
                    value={summativeCompetency}
                    onChange={(e) => setSummativeCompetency(e.target.value)}
                    placeholder="e.g., Term 1 Units 1–3: Quadratic Functions, Equations, and Inequalities"
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Total Examinees</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={summativeTotalLearners}
                      onChange={(e) => setSummativeTotalLearners(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Passed (&ge;75%)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={summativePassedCount}
                      onChange={(e) => setSummativePassedCount(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Mean Score</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      value={summativeMeanScore}
                      onChange={(e) => setSummativeMeanScore(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Highest Score (HPS)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={summativeHps}
                      onChange={(e) => setSummativeHps(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Least Mastered Competencies & Post-Summative Intervention Plan
                  </label>
                  <input
                    type="text"
                    required
                    value={summativeLeastMastered}
                    onChange={(e) => setSummativeLeastMastered(e.target.value)}
                    placeholder="Enter item analysis findings, least mastered competencies, and remediation schedule"
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                {/* 2. Summative Assessment — Term Specific Details & TOS Bloom's Cognitive Distribution */}
                <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-teal-200/80">
                    <div>
                      <h4 className="text-xs font-extrabold text-teal-950 uppercase tracking-wide">
                        2. Summative Assessment — {summativeTerm === 'Term 3' ? 'Term 3 (End of Term Assessment)' : summativeTerm} Specific Details
                      </h4>
                      <p className="text-[11px] font-semibold text-teal-800 mt-0.5">
                        Tailored DepEd Evaluation Criteria
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-teal-800 text-white self-start sm:self-auto">
                      DO 8, s. 2015 · TOS &amp; Bloom&apos;s QA
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Examination Period</label>
                      <select
                        value={summativeExamPeriod}
                        onChange={(e) => setSummativeExamPeriod(e.target.value)}
                        className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                      >
                        <option value="1st Periodical / Term 1 Examination">1st Periodical / Term 1 Examination</option>
                        <option value="2nd Periodical / Term 2 Examination">2nd Periodical / Term 2 Examination</option>
                        <option value="3rd Periodical / Term 3 (End of Term) Examination">
                          3rd Periodical / Term 3 (End of Term) Examination
                        </option>
                        <option value="Mid-Term / Unit Summative Test">Mid-Term / Unit Summative Test</option>
                        <option value="Departmental Culminating Examination">Departmental Culminating Examination</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Total Items</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={summativeTotalItems}
                        onChange={(e) => setSummativeTotalItems(Number(e.target.value))}
                        className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Quality Sign-Off</label>
                      <select
                        value={summativeQualitySignOff}
                        onChange={(e) => setSummativeQualitySignOff(e.target.value)}
                        className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                      >
                        <option value="Approved for Reproduction">Approved for Reproduction</option>
                        <option value="Approved with Minor Revisions">Approved with Minor Revisions</option>
                        <option value="Returned for TOS / Item Revision">Returned for TOS / Item Revision</option>
                        <option value="Pending Quality Review">Pending Quality Review</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-stone-200 p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100">
                      <span className="font-bold text-stone-900 text-xs">
                        Table of Specifications (TOS) &amp; Bloom&apos;s Cognitive Distribution
                      </span>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-bold text-[11px]">
                        <input
                          type="checkbox"
                          checked={summativeTosAttached}
                          onChange={(e) => setSummativeTosAttached(e.target.checked)}
                          className="rounded border-teal-400 text-teal-800 focus:ring-teal-700"
                        />
                        <span>TOS Attached</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Remember</label>
                        <input
                          type="number"
                          min={0}
                          value={summativeBloomRemember}
                          onChange={(e) => setSummativeBloomRemember(Number(e.target.value))}
                          className="w-full border border-stone-300 rounded-lg p-2 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Understand</label>
                        <input
                          type="number"
                          min={0}
                          value={summativeBloomUnderstand}
                          onChange={(e) => setSummativeBloomUnderstand(Number(e.target.value))}
                          className="w-full border border-stone-300 rounded-lg p-2 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Apply</label>
                        <input
                          type="number"
                          min={0}
                          value={summativeBloomApply}
                          onChange={(e) => setSummativeBloomApply(Number(e.target.value))}
                          className="w-full border border-stone-300 rounded-lg p-2 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Analyze</label>
                        <input
                          type="number"
                          min={0}
                          value={summativeBloomAnalyze}
                          onChange={(e) => setSummativeBloomAnalyze(Number(e.target.value))}
                          className="w-full border border-stone-300 rounded-lg p-2 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Evaluate</label>
                        <input
                          type="number"
                          min={0}
                          value={summativeBloomEvaluate}
                          onChange={(e) => setSummativeBloomEvaluate(Number(e.target.value))}
                          className="w-full border border-stone-300 rounded-lg p-2 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-stone-700 mb-1">Create</label>
                        <input
                          type="number"
                          min={0}
                          value={summativeBloomCreate}
                          onChange={(e) => setSummativeBloomCreate(Number(e.target.value))}
                          className="w-full border border-stone-300 rounded-lg p-2 text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none font-bold text-stone-800">
                        <input
                          type="checkbox"
                          checked={summativeAnswerKeyVerified}
                          onChange={(e) => setSummativeAnswerKeyVerified(e.target.checked)}
                          className="rounded border-stone-300 text-teal-800 focus:ring-teal-700"
                        />
                        <span>Answer Key &amp; Scoring Guide Verified Accurate</span>
                      </label>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-stone-700">TOS Alignment:</span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold border ${
                            bloomTotalAllocated === Number(summativeTotalItems)
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {computedTosAlignmentText}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Item Quality Remarks / Distracter Analysis
                    </label>
                    <textarea
                      rows={2}
                      value={summativeItemQualityRemarks}
                      onChange={(e) => setSummativeItemQualityRemarks(e.target.value)}
                      placeholder="Evaluate stem clarity, plausibility of distractors, cognitive domain balance, and rubric alignment..."
                      className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Google Drive Link</label>
                  <input
                    type="url"
                    value={summativeGoogleDriveLink}
                    onChange={(e) => setSummativeGoogleDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full border border-stone-300 rounded-lg p-2 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsCheckingAssessmentModalOpen(false)}
                    className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Submit to Table for Summative {summativeTerm === 'Term 3' ? 'Term 3 (End of Term Assessment)' : summativeTerm}
                  </button>
                </div>
              </form>
            )}

            {assessmentModalMode === 'formative' && (
              <form
                onSubmit={handleSaveFormative}
                className="p-6 space-y-4 text-xs max-h-[76vh] overflow-y-auto"
              >
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <label className="block font-bold text-stone-800">
                    Select Target Formative Term Table <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { value: 'Term 1', label: 'Formative Term 1', sub: 'Routes to Table for Formative Term 1' },
                        { value: 'Term 2', label: 'Formative Term 2', sub: 'Routes to Table for Formative Term 2' },
                        {
                          value: 'Term 3',
                          label: 'Formative Term 3 (End of Term Assessment)',
                          sub: 'Routes to Table for Formative Term 3',
                        },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormativeTerm(option.value);
                          if (option.value === 'Term 3' && formativeType === 'Short Quiz / Exit Ticket') {
                            setFormativeType('End of Term Assessment');
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          formativeTerm === option.value
                            ? 'bg-[#701628] text-white border-[#701628] shadow-xs'
                            : 'bg-white text-stone-800 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-bold text-xs">{option.label}</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            formativeTerm === option.value ? 'text-rose-100' : 'text-stone-500'
                          }`}
                        >
                          {option.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Teacher</label>
                    <select
                      value={formativeTeacherId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setFormativeTeacherId(id);
                        const found = teachers.find((t) => t.id === id);
                        if (found) {
                          setFormativeSubject(found.department);
                          setFormativeGradeLevel(found.gradeLevels?.[0] || 'Grade 10');
                        }
                      }}
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
                    <label className="block font-bold text-stone-700 mb-1">Date Conducted</label>
                    <input
                      type="date"
                      required
                      value={formativeDate}
                      onChange={(e) => setFormativeDate(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Subject / Learning Area</label>
                    <input
                      type="text"
                      required
                      value={formativeSubject}
                      onChange={(e) => setFormativeSubject(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Grade Level</label>
                    <input
                      type="text"
                      required
                      value={formativeGradeLevel}
                      onChange={(e) => setFormativeGradeLevel(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Section</label>
                    <input
                      type="text"
                      required
                      value={formativeSection}
                      onChange={(e) => setFormativeSection(e.target.value)}
                      placeholder="e.g., 10 - Rizal"
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Formative Assessment Type</label>
                    <select
                      value={formativeType}
                      onChange={(e) => setFormativeType(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                    >
                      <option value="Short Quiz / Exit Ticket">Short Quiz / Exit Ticket</option>
                      <option value="Written Work / Seatwork">Written Work / Seatwork</option>
                      <option value="Performance Task / Rubric Check">Performance Task / Rubric Check</option>
                      <option value="Oral Questioning / Recitation">Oral Questioning / Recitation</option>
                      <option value="Group Activity / Lab Output">Group Activity / Lab Output</option>
                      <option value="End of Term Assessment">End of Term Assessment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Computed Mastery / MPS Preview
                    </label>
                    <div className="w-full border border-stone-200 bg-stone-50 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-stone-600 font-medium">Mean / HPS Percentage:</span>
                      <span
                        className={`text-sm font-black ${
                          formativeHps > 0 && (formativeMeanScore / formativeHps) * 100 >= 75
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {formativeHps > 0 ? ((formativeMeanScore / formativeHps) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Week / Lesson Topic & Learning Competency (MELCs / MATATAG)
                  </label>
                  <input
                    type="text"
                    required
                    value={formativeCompetency}
                    onChange={(e) => setFormativeCompetency(e.target.value)}
                    placeholder="e.g., Week 4: Solving Quadratic Equations by Factoring"
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Total Learners</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formativeTotalLearners}
                      onChange={(e) => setFormativeTotalLearners(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Mastery (&ge;75%)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={formativeMasteryCount}
                      onChange={(e) => setFormativeMasteryCount(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Mean Score</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      value={formativeMeanScore}
                      onChange={(e) => setFormativeMeanScore(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Highest Score (HPS)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formativeHps}
                      onChange={(e) => setFormativeHps(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Instructional Feedback / Remediation Notes
                  </label>
                  <input
                    type="text"
                    required
                    value={formativeFeedback}
                    onChange={(e) => setFormativeFeedback(e.target.value)}
                    placeholder="Enter instructional coaching notes or remediation steps for non-mastered competencies"
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Google Drive Link</label>
                  <input
                    type="url"
                    value={formativeGoogleDriveLink}
                    onChange={(e) => setFormativeGoogleDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full border border-stone-300 rounded-lg p-2 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsCheckingAssessmentModalOpen(false)}
                    className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Submit to Table for Formative {formativeTerm === 'Term 3' ? 'Term 3 (End of Term Assessment)' : formativeTerm}
                  </button>
                </div>
              </form>
            )}

            {assessmentModalMode === 'mps' && (
              <form
                onSubmit={handleSaveMpsAssessment}
                className="p-6 space-y-4 text-xs max-h-[76vh] overflow-y-auto"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={mpsSubject}
                      onChange={(e) => setMpsSubject(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Grade Level</label>
                    <input
                      type="text"
                      required
                      value={mpsGradeLevel}
                      onChange={(e) => setMpsGradeLevel(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Section</label>
                    <input
                      type="text"
                      required
                      value={mpsSection}
                      onChange={(e) => setMpsSection(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Teacher</label>
                    <select
                      value={mpsTeacherName}
                      onChange={(e) => setMpsTeacherName(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                    >
                      {teachers.map((t) => (
                        <option key={t.id} value={t.fullName}>
                          {t.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Total Examinees</label>
                    <input
                      type="number"
                      required
                      value={totalTakers}
                      onChange={(e) => setTotalTakers(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Term</label>
                    <select
                      value={mpsQuarterTerm}
                      onChange={(e) => setMpsQuarterTerm(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium"
                    >
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Mean Score</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={meanScore}
                      onChange={(e) => setMeanScore(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Highest Possible Score</label>
                    <input
                      type="number"
                      required
                      value={highestPossibleScore}
                      onChange={(e) => setHighestPossibleScore(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Least Mastered Competency</label>
                  <input
                    type="text"
                    required
                    value={leastMastered}
                    onChange={(e) => setLeastMastered(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Remediation Action Plan</label>
                  <input
                    type="text"
                    required
                    value={remediationPlan}
                    onChange={(e) => setRemediationPlan(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Google Drive Link</label>
                  <input
                    type="url"
                    value={mpsGoogleDriveLink}
                    onChange={(e) => setMpsGoogleDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full border border-stone-300 rounded-lg p-2 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsCheckingAssessmentModalOpen(false)}
                    className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Save MPS Record
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

