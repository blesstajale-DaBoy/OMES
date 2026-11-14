import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  PMCFRecord,
  FarRecord,
  AssessmentRecord,
  FormativeTerm,
  FormativeAssessmentRecord,
  SummativeTerm,
  SummativeAssessmentRecord,
  getPmcfCategory,
  getFarCategory,
} from '../types';
import { PrintFarReportModal } from '../components/PrintFarReportModal';
import { PrintPmcfReportModal } from '../components/PrintPmcfReportModal';
import {
  matchesRoleSupervisionScope,
  SupervisionScopeBanner,
  resolveRecordSupervisor,
  resolveRecordMentor,
  resolveRecordSupervisorName,
  resolveActiveSupervisorForUser,
  resolveActiveMentorForUser,
  resolveActiveTeacherForUser,
  getScopedTeachersForModal,
} from '../utils/supervisionScope';
import { printTableReportToPdf } from '../utils/printTablePdf';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Trash2,
  Check,
  FileDown,
  Printer,
  Edit2,
  Pencil,
  ClipboardCheck,
  FileSpreadsheet,
  Users,
  BookOpen,
  Filter,
  ExternalLink,
} from 'lucide-react';

export type {
  FormativeTerm,
  FormativeAssessmentRecord,
  SummativeTerm,
  SummativeAssessmentRecord,
};

export const FarPmcfView: React.FC = () => {
  const {
    pmcfRecords,
    farRecords,
    assessments,
    formativeRecords,
    summativeRecords,
    teachers,
    supervisors,
    mentors,
    observations,
    lessonPlans,
    addPMCFRecord,
    updatePMCFRecord,
    deletePMCFRecord,
    addFarRecord,
    updateFarRecord,
    verifyFarRecord,
    deleteFarRecord,
    addAssessment,
    updateAssessment,
    deleteAssessment,
    addFormativeRecord,
    updateFormativeRecord,
    deleteFormativeRecord,
    addSummativeRecord,
    updateSummativeRecord,
    deleteSummativeRecord,
    schoolProfile,
  } = useData();
  const { currentUser, isAdmin, isMentor, isTeacher } = useAuth();
  const [selectedSupervisorFilterId, setSelectedSupervisorFilterId] = useState('All');
  const scopedTeachers = getScopedTeachersForModal(currentUser, teachers, supervisors, mentors);
  const activeMentor = resolveActiveMentorForUser(currentUser, teachers, mentors);
  const activeTeacher = resolveActiveTeacherForUser(currentUser, teachers);

  const scopedObservations = observations.filter((o) =>
    matchesRoleSupervisionScope(o, currentUser, teachers, supervisors, selectedSupervisorFilterId, mentors)
  );
  const scopedLessonPlans = lessonPlans.filter((lp) =>
    matchesRoleSupervisionScope(lp, currentUser, teachers, supervisors, selectedSupervisorFilterId, mentors)
  );

  // Scoped progress bar metrics respecting privacy boundaries
  const displayTeacherPool = isAdmin && selectedSupervisorFilterId === 'All' ? teachers : scopedTeachers;
  const totalTeachersCount = Math.max(displayTeacherPool.length, 1);
  const completedObservationsList = scopedObservations.filter((o) => o.status === 'Completed');
  const completedObservationsCount = completedObservationsList.length;
  const uniqueTeachersObservedCount = new Set(
    completedObservationsList.map((o) => o.teacherId || o.teacherName)
  ).size;
  const observationCompletionPct = Math.min(
    100,
    Math.round((completedObservationsCount / totalTeachersCount) * 100)
  );
  const teacherObservedCoveragePct = Math.min(
    100,
    Math.round((uniqueTeachersObservedCount / totalTeachersCount) * 100)
  );

  const completedLessonPlansList = scopedLessonPlans.filter(
    (lp) => lp.status === 'Approved' || lp.status === 'Needs Revision'
  );
  const approvedLessonPlansCount = scopedLessonPlans.filter((lp) => lp.status === 'Approved').length;
  const completedLessonPlanChecksCount = completedLessonPlansList.length;
  const uniqueTeachersLessonPlanCheckedCount = new Set(
    completedLessonPlansList.map((lp) => lp.teacherId || lp.teacherName)
  ).size;
  const lessonPlanCompletionPct = Math.min(
    100,
    Math.round((completedLessonPlanChecksCount / totalTeachersCount) * 100)
  );
  const overallSupervisionPct = isMentor
    ? lessonPlanCompletionPct
    : Math.min(100, Math.round((observationCompletionPct + lessonPlanCompletionPct) / 2));

  const [searchQuery, setSearchQuery] = useState('');

  const [selectedFormativeTermFilter, setSelectedFormativeTermFilter] = useState<'ALL' | FormativeTerm>('ALL');
  const [isFormativeModalOpen, setIsFormativeModalOpen] = useState(false);
  const [editingFormative, setEditingFormative] = useState<FormativeAssessmentRecord | null>(null);
  const [formativeTerm, setFormativeTerm] = useState<FormativeTerm>('Term 1');
  const [formativeDate, setFormativeDate] = useState('2026-10-29');
  const [formativeTeacherId, setFormativeTeacherId] = useState(scopedTeachers[0]?.id || teachers[0]?.id || '');
  const [formativeSubject, setFormativeSubject] = useState(scopedTeachers[0]?.subject || 'Mathematics');
  const [formativeGradeLevel, setFormativeGradeLevel] = useState(scopedTeachers[0]?.gradeLevels?.[0] || 'Grade 10');
  const [formativeSection, setFormativeSection] = useState('Section A');
  const [formativeType, setFormativeType] = useState('Short Quiz / Exit Ticket');
  const [formativeCompetency, setFormativeCompetency] = useState('');
  const [formativeTotalLearners, setFormativeTotalLearners] = useState(40);
  const [formativeMasteryCount, setFormativeMasteryCount] = useState(32);
  const [formativeMeanScore, setFormativeMeanScore] = useState(16);
  const [formativeHps, setFormativeHps] = useState(20);
  const [formativeFeedback, setFormativeFeedback] = useState('');
  const [formativeGoogleDriveLink, setFormativeGoogleDriveLink] = useState('');

  const openNewFormativeModal = (defaultTerm?: FormativeTerm) => {
    setEditingFormative(null);
    const defaultTeacher = activeTeacher || scopedTeachers[0] || teachers[0];
    const targetTerm = defaultTerm || (selectedFormativeTermFilter !== 'ALL' ? selectedFormativeTermFilter : 'Term 1');
    setFormativeTerm(targetTerm);
    setFormativeDate(new Date().toISOString().split('T')[0]);
    setFormativeTeacherId(defaultTeacher?.id || '');
    setFormativeSubject(defaultTeacher?.subject || defaultTeacher?.department || 'Mathematics');
    setFormativeGradeLevel(defaultTeacher?.gradeLevels?.[0] || 'Grade 10');
    setFormativeSection('Section A');
    setFormativeType(targetTerm === 'Term 3' ? 'End of Term Assessment' : 'Short Quiz / Exit Ticket');
    setFormativeCompetency('');
    setFormativeTotalLearners(40);
    setFormativeMasteryCount(32);
    setFormativeMeanScore(16);
    setFormativeHps(20);
    setFormativeFeedback('');
    setFormativeGoogleDriveLink('');
    setIsFormativeModalOpen(true);
  };

  const openEditFormativeModal = (record: FormativeAssessmentRecord) => {
    setEditingFormative(record);
    setFormativeTerm(record.term);
    setFormativeDate(record.date);
    setFormativeTeacherId(record.teacherId);
    setFormativeSubject(record.subject);
    setFormativeGradeLevel(record.gradeLevel);
    setFormativeSection(record.section);
    setFormativeType(record.formativeType);
    setFormativeCompetency(record.competencyTopic);
    setFormativeTotalLearners(record.totalLearners);
    setFormativeMasteryCount(record.masteryCount);
    setFormativeMeanScore(record.meanScore);
    setFormativeHps(record.highestPossibleScore);
    setFormativeFeedback(record.feedbackNotes);
    setFormativeGoogleDriveLink(record.googleDriveLink || '');
    setIsFormativeModalOpen(true);
  };

  const handleSaveFormative = (e: React.FormEvent) => {
    e.preventDefault();
    const teacherObj = teachers.find((t) => t.id === formativeTeacherId);
    const computedMps =
      formativeHps > 0 ? Number(((formativeMeanScore / formativeHps) * 100).toFixed(1)) : 0;
    const status: 'Mastery Achieved' | 'Needs Remediation' =
      computedMps >= 75 ? 'Mastery Achieved' : 'Needs Remediation';
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      (teacherObj
        ? resolveRecordSupervisor({ teacherId: teacherObj.id, teacherName: teacherObj.fullName }, teachers, supervisors)
        : undefined);
    const resolvedMentor =
      activeMentor ||
      (teacherObj
        ? resolveRecordMentor({ teacherId: teacherObj.id, teacherName: teacherObj.fullName }, teachers, mentors)
        : undefined);

    if (editingFormative) {
      updateFormativeRecord(editingFormative.id, {
        date: formativeDate,
        term: formativeTerm,
        teacherId: formativeTeacherId,
        teacherName: teacherObj ? teacherObj.fullName : editingFormative.teacherName,
        supervisorId: resolvedSup?.id || editingFormative.supervisorId,
        supervisorName: resolvedSup?.fullName || editingFormative.supervisorName,
        mentorId: isMentor
          ? activeMentor?.id || currentUser?.mentorId || currentUser?.id
          : editingFormative.mentorId || resolvedMentor?.id,
        mentorName: isMentor
          ? activeMentor?.fullName || currentUser?.fullName
          : editingFormative.mentorName || resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : editingFormative.evaluatorRole,
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
      });
    } else {
      addFormativeRecord({
        date: formativeDate,
        term: formativeTerm,
        teacherId: formativeTeacherId,
        teacherName: teacherObj ? teacherObj.fullName : 'Assigned Teacher',
        supervisorId: resolvedSup?.id || (!isMentor ? currentUser?.supervisorId || currentUser?.id : ''),
        supervisorName: resolvedSup?.fullName || (!isMentor ? currentUser?.fullName : ''),
        mentorId: isMentor ? activeMentor?.id || currentUser?.mentorId || currentUser?.id : resolvedMentor?.id,
        mentorName: isMentor ? activeMentor?.fullName || currentUser?.fullName : resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : isAdmin ? 'admin' : 'supervisor',
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
      });
    }

    // Ensure the target Term table is visible after submission
    if (selectedFormativeTermFilter !== 'ALL' && selectedFormativeTermFilter !== formativeTerm) {
      setSelectedFormativeTermFilter(formativeTerm);
    }
    setEditingFormative(null);
    setIsFormativeModalOpen(false);
  };

  const handleDeleteFormative = (id: string) => {
    deleteFormativeRecord(id);
  };

  const [selectedSummativeTermFilter, setSelectedSummativeTermFilter] = useState<'ALL' | SummativeTerm>('ALL');
  const [isSummativeModalOpen, setIsSummativeModalOpen] = useState(false);
  const [editingSummative, setEditingSummative] = useState<SummativeAssessmentRecord | null>(null);
  const [summativeTerm, setSummativeTerm] = useState<SummativeTerm>('Term 1');
  const [summativeDate, setSummativeDate] = useState('2026-10-29');
  const [summativeTeacherId, setSummativeTeacherId] = useState(scopedTeachers[0]?.id || teachers[0]?.id || '');
  const [summativeSubject, setSummativeSubject] = useState(scopedTeachers[0]?.subject || 'Mathematics');
  const [summativeGradeLevel, setSummativeGradeLevel] = useState(scopedTeachers[0]?.gradeLevels?.[0] || 'Grade 10');
  const [summativeSection, setSummativeSection] = useState('Section A');
  const [summativeType, setSummativeType] = useState('Unit / Long Summative Test');
  const [summativeTosVerified, setSummativeTosVerified] = useState<'TOS & Answer Key Verified' | 'Pending TOS Verification'>('TOS & Answer Key Verified');
  const [summativeCompetency, setSummativeCompetency] = useState('');
  const [summativeTotalLearners, setSummativeTotalLearners] = useState(45);
  const [summativePassedCount, setSummativePassedCount] = useState(38);
  const [summativeMeanScore, setSummativeMeanScore] = useState(40);
  const [summativeHps, setSummativeHps] = useState(50);
  const [summativeLeastMastered, setSummativeLeastMastered] = useState('');

  // 2. Summative Assessment — Term Specific Details & TOS Bloom's Cognitive Distribution State
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

  const openNewSummativeModal = (defaultTerm?: SummativeTerm) => {
    setEditingSummative(null);
    const defaultTeacher = activeTeacher || scopedTeachers[0] || teachers[0];
    const targetTerm = defaultTerm || (selectedSummativeTermFilter !== 'ALL' ? selectedSummativeTermFilter : 'Term 1');
    setSummativeTerm(targetTerm);
    setSummativeDate(new Date().toISOString().split('T')[0]);
    setSummativeTeacherId(defaultTeacher?.id || '');
    setSummativeSubject(defaultTeacher?.subject || defaultTeacher?.department || 'Mathematics');
    setSummativeGradeLevel(defaultTeacher?.gradeLevels?.[0] || 'Grade 10');
    setSummativeSection('Section A');
    setSummativeType(targetTerm === 'Term 3' ? 'End of Term Assessment' : 'Unit / Long Summative Test');
    setSummativeTosVerified('TOS & Answer Key Verified');
    setSummativeCompetency('');
    setSummativeTotalLearners(45);
    setSummativePassedCount(38);
    setSummativeMeanScore(40);
    setSummativeHps(50);
    setSummativeLeastMastered('');
    setSummativeExamPeriod(
      targetTerm === 'Term 1'
        ? '1st Periodical / Term 1 Examination'
        : targetTerm === 'Term 2'
        ? '2nd Periodical / Term 2 Examination'
        : '3rd Periodical / Term 3 (End of Term) Examination'
    );
    setSummativeTotalItems(50);
    setSummativeQualitySignOff('Approved for Reproduction');
    setSummativeTosAttached(true);
    setSummativeBloomRemember(10);
    setSummativeBloomUnderstand(10);
    setSummativeBloomApply(15);
    setSummativeBloomAnalyze(8);
    setSummativeBloomEvaluate(4);
    setSummativeBloomCreate(3);
    setSummativeAnswerKeyVerified(true);
    setSummativeItemQualityRemarks('');
    setSummativeGoogleDriveLink('');
    setIsSummativeModalOpen(true);
  };

  const openEditSummativeModal = (record: SummativeAssessmentRecord) => {
    setEditingSummative(record);
    setSummativeTerm(record.term);
    setSummativeDate(record.date);
    setSummativeTeacherId(record.teacherId);
    setSummativeSubject(record.subject);
    setSummativeGradeLevel(record.gradeLevel);
    setSummativeSection(record.section);
    setSummativeType(record.summativeType);
    setSummativeTosVerified(record.tosVerified);
    setSummativeCompetency(record.competencyCoverage);
    setSummativeTotalLearners(record.totalLearners);
    setSummativePassedCount(record.passedCount);
    setSummativeMeanScore(record.meanScore);
    setSummativeHps(record.highestPossibleScore);
    setSummativeLeastMastered(record.leastMasteredNotes);
    setSummativeExamPeriod(
      record.examinationPeriod ||
        (record.term === 'Term 1'
          ? '1st Periodical / Term 1 Examination'
          : record.term === 'Term 2'
          ? '2nd Periodical / Term 2 Examination'
          : '3rd Periodical / Term 3 (End of Term) Examination')
    );
    setSummativeTotalItems(record.totalItems ?? record.highestPossibleScore ?? 50);
    setSummativeQualitySignOff(record.qualitySignOff || 'Approved for Reproduction');
    setSummativeTosAttached(record.tosAttached ?? true);
    setSummativeBloomRemember(record.bloomRemember ?? 10);
    setSummativeBloomUnderstand(record.bloomUnderstand ?? 10);
    setSummativeBloomApply(record.bloomApply ?? 15);
    setSummativeBloomAnalyze(record.bloomAnalyze ?? 8);
    setSummativeBloomEvaluate(record.bloomEvaluate ?? 4);
    setSummativeBloomCreate(record.bloomCreate ?? 3);
    setSummativeAnswerKeyVerified(record.answerKeyVerified ?? true);
    setSummativeItemQualityRemarks(record.itemQualityRemarks || '');
    setSummativeGoogleDriveLink(record.googleDriveLink || '');
    setIsSummativeModalOpen(true);
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
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      (teacherObj
        ? resolveRecordSupervisor({ teacherId: teacherObj.id, teacherName: teacherObj.fullName }, teachers, supervisors)
        : undefined);
    const resolvedMentor =
      activeMentor ||
      (teacherObj
        ? resolveRecordMentor({ teacherId: teacherObj.id, teacherName: teacherObj.fullName }, teachers, mentors)
        : undefined);

    if (editingSummative) {
      updateSummativeRecord(editingSummative.id, {
        date: summativeDate,
        term: summativeTerm,
        teacherId: summativeTeacherId,
        teacherName: teacherObj ? teacherObj.fullName : editingSummative.teacherName,
        supervisorId: resolvedSup?.id || editingSummative.supervisorId,
        supervisorName: resolvedSup?.fullName || editingSummative.supervisorName,
        mentorId: isMentor
          ? activeMentor?.id || currentUser?.mentorId || currentUser?.id
          : editingSummative.mentorId || resolvedMentor?.id,
        mentorName: isMentor
          ? activeMentor?.fullName || currentUser?.fullName
          : editingSummative.mentorName || resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : editingSummative.evaluatorRole,
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
      });
    } else {
      addSummativeRecord({
        date: summativeDate,
        term: summativeTerm,
        teacherId: summativeTeacherId,
        teacherName: teacherObj ? teacherObj.fullName : 'Assigned Teacher',
        supervisorId: resolvedSup?.id || (!isMentor ? currentUser?.supervisorId || currentUser?.id : ''),
        supervisorName: resolvedSup?.fullName || (!isMentor ? currentUser?.fullName : ''),
        mentorId: isMentor ? activeMentor?.id || currentUser?.mentorId || currentUser?.id : resolvedMentor?.id,
        mentorName: isMentor ? activeMentor?.fullName || currentUser?.fullName : resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : isAdmin ? 'admin' : 'supervisor',
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
      });
    }

    // Ensure the target Term table is visible after submission
    if (selectedSummativeTermFilter !== 'ALL' && selectedSummativeTermFilter !== summativeTerm) {
      setSelectedSummativeTermFilter(summativeTerm);
    }
    setEditingSummative(null);
    setIsSummativeModalOpen(false);
  };

  const handleDeleteSummative = (id: string) => {
    deleteSummativeRecord(id);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFarModalOpen, setIsFarModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isPrintFarModalOpen, setIsPrintFarModalOpen] = useState(false);
  const [selectedRecordIdForPrint, setSelectedRecordIdForPrint] = useState<string | null>(null);

  // PMCF PDF Modal State
  const [isPrintPmcfModalOpen, setIsPrintPmcfModalOpen] = useState(false);
  const [selectedPmcfRecordIdForPrint, setSelectedPmcfRecordIdForPrint] = useState<string | null>(null);

  // MPS Assessment Form & Edit State
  const [editingAssessment, setEditingAssessment] = useState<AssessmentRecord | null>(null);
  const [subject, setSubject] = useState('Science 9');
  const [gradeLevel, setGradeLevel] = useState('Grade 9');
  const [section, setSection] = useState('Ruby');
  const [teacherName, setTeacherName] = useState(scopedTeachers[0]?.fullName || teachers[0]?.fullName || '');
  const [mpsQuarterTerm, setMpsQuarterTerm] = useState('Term 1');
  const [totalTakers, setTotalTakers] = useState(45);
  const [meanScore, setMeanScore] = useState(38.5);
  const [highestPossibleScore, setHighestPossibleScore] = useState(50);
  const [leastMastered, setLeastMastered] = useState('Gas exchange and circulatory flow analysis');
  const [remediationPlan, setRemediationPlan] = useState('Conduct peer tutoring during Friday remediation period.');
  const [mpsGoogleDriveLink, setMpsGoogleDriveLink] = useState('');

  // PMCF Edit State
  const [editingPmcf, setEditingPmcf] = useState<PMCFRecord | null>(null);
  const [pmcfStatus, setPmcfStatus] = useState<PMCFRecord['status']>('In Progress');

  // PMCF Form State
  const [teacherId, setTeacherId] = useState(scopedTeachers[0]?.id || teachers[0]?.id || '');
  const [quarterTerm, setQuarterTerm] = useState('Term 1');
  const [criticalIncidentDescription, setCriticalIncidentDescription] = useState('');
  const [coachingMechanism, setCoachingMechanism] = useState<PMCFRecord['coachingMechanism']>('Individual Conference');
  const [actionPlanOutput, setActionPlanOutput] = useState('');
  const [impactOnJobPerformance, setImpactOnJobPerformance] = useState('');

  // Findings, Analysis & Recommendations (FAR) Form State & Edit State
  const [editingFar, setEditingFar] = useState<FarRecord | null>(null);
  const [farStatus, setFarStatus] = useState<'In Progress' | 'Verified'>('In Progress');
  const [farTeacherId, setFarTeacherId] = useState(scopedTeachers[0]?.id || teachers[0]?.id || '');
  const [farTerm, setFarTerm] = useState<'Term 1' | 'Term 2' | 'Term 3' | string>('Term 1');
  const [farLessonPlanWeek, setFarLessonPlanWeek] = useState('Week 1');
  const [farFindings, setFarFindings] = useState('');
  const [farAnalysis, setFarAnalysis] = useState('');
  const [farRecommendations, setFarRecommendations] = useState('');

  const filteredAssessments = assessments.filter((a) => {
    if (
      !matchesRoleSupervisionScope(
        a,
        currentUser,
        teachers,
        supervisors,
        selectedSupervisorFilterId,
        mentors
      )
    ) {
      return false;
    }
    const supName = resolveRecordSupervisorName(a, teachers, supervisors);
    const q = searchQuery.toLowerCase();
    return (
      a.subject.toLowerCase().includes(q) ||
      a.teacherName.toLowerCase().includes(q) ||
      a.gradeLevel.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q)
    );
  });

  const scopedFormativeRecords = formativeRecords.filter((r) =>
    matchesRoleSupervisionScope(
      r,
      currentUser,
      teachers,
      supervisors,
      selectedSupervisorFilterId,
      mentors
    )
  );

  const scopedSummativeRecords = summativeRecords.filter((r) =>
    matchesRoleSupervisionScope(
      r,
      currentUser,
      teachers,
      supervisors,
      selectedSupervisorFilterId,
      mentors
    )
  );

  const filteredRecords = pmcfRecords.filter((r) => {
    if (getPmcfCategory(r) !== 'assessment') return false;
    if (
      !matchesRoleSupervisionScope(
        r,
        currentUser,
        teachers,
        supervisors,
        selectedSupervisorFilterId,
        mentors
      )
    ) {
      return false;
    }
    const supName = resolveRecordSupervisorName(r, teachers, supervisors);
    const q = searchQuery.toLowerCase();
    return (
      r.teacherName.toLowerCase().includes(q) ||
      r.recordNo.toLowerCase().includes(q) ||
      r.criticalIncidentDescription.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q)
    );
  });

  const filteredFarRecords = farRecords.filter((r) => {
    if (getFarCategory(r) !== 'assessment') return false;
    if (
      !matchesRoleSupervisionScope(
        r,
        currentUser,
        teachers,
        supervisors,
        selectedSupervisorFilterId,
        mentors
      )
    ) {
      return false;
    }
    const supName = resolveRecordSupervisorName(r, teachers, supervisors);
    const q = searchQuery.toLowerCase();
    return (
      r.teacherName.toLowerCase().includes(q) ||
      r.farCode.toLowerCase().includes(q) ||
      r.lessonPlanWeek.toLowerCase().includes(q) ||
      r.findings.toLowerCase().includes(q) ||
      r.analysis.toLowerCase().includes(q) ||
      r.recommendations.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q)
    );
  });

  const openNewAssessmentModal = () => {
    setEditingAssessment(null);
    setSubject('Science 9');
    setGradeLevel('Grade 9');
    setSection('Ruby');
    setTeacherName(
      isTeacher && currentUser?.fullName
        ? currentUser.fullName
        : scopedTeachers[0]?.fullName || teachers[0]?.fullName || ''
    );
    setMpsQuarterTerm('Term 1');
    setTotalTakers(45);
    setMeanScore(38.5);
    setHighestPossibleScore(50);
    setLeastMastered('Gas exchange and circulatory flow analysis');
    setRemediationPlan('Conduct peer tutoring during Friday remediation period.');
    setMpsGoogleDriveLink('');
    setIsAssessmentModalOpen(true);
  };

  const openEditAssessmentModal = (record: AssessmentRecord) => {
    setEditingAssessment(record);
    setSubject(record.subject);
    setGradeLevel(record.gradeLevel);
    setSection(record.section);
    setTeacherName(record.teacherName);
    setMpsQuarterTerm(record.quarterTerm);
    setTotalTakers(record.totalTakers);
    setMeanScore(record.meanScore);
    setHighestPossibleScore(record.highestPossibleScore);
    setLeastMastered(record.leastMasteredCompetencies.join('; '));
    setRemediationPlan(record.remediationPlan);
    setMpsGoogleDriveLink(record.googleDriveLink || '');
    setIsAssessmentModalOpen(true);
  };

  const handleSaveAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    const mps = Number(((meanScore / highestPossibleScore) * 100).toFixed(1));
    const competencies = leastMastered
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    const matchedTeacher = teachers.find(
      (t) => t.fullName.trim().toLowerCase() === teacherName.trim().toLowerCase()
    );
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      resolveRecordSupervisor(
        { teacherId: matchedTeacher?.id, teacherName },
        teachers,
        supervisors
      );

    const resolvedMentor =
      activeMentor ||
      resolveRecordMentor(
        { teacherId: matchedTeacher?.id, teacherName },
        teachers,
        mentors
      );

    if (editingAssessment) {
      updateAssessment(editingAssessment.id, {
        subject,
        gradeLevel,
        section,
        teacherId: matchedTeacher?.id || editingAssessment.teacherId,
        teacherName,
        supervisorId: resolvedSup?.id || editingAssessment.supervisorId,
        supervisorName: resolvedSup?.fullName || editingAssessment.supervisorName,
        mentorId: isMentor
          ? activeMentor?.id || currentUser?.mentorId || currentUser?.id
          : editingAssessment.mentorId || resolvedMentor?.id,
        mentorName: isMentor
          ? activeMentor?.fullName || currentUser?.fullName
          : editingAssessment.mentorName || resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : editingAssessment.evaluatorRole,
        quarterTerm: mpsQuarterTerm,
        totalTakers,
        meanScore,
        highestPossibleScore,
        mps,
        targetMet: mps >= 75.0,
        leastMasteredCompetencies: competencies.length > 0 ? competencies : [leastMastered],
        remediationPlan,
        googleDriveLink: mpsGoogleDriveLink.trim(),
      });
    } else {
      addAssessment({
        subject,
        gradeLevel,
        section,
        teacherId: matchedTeacher?.id,
        teacherName,
        supervisorId: resolvedSup?.id || (!isMentor ? currentUser?.supervisorId || currentUser?.id : ''),
        supervisorName: resolvedSup?.fullName || (!isMentor ? currentUser?.fullName : ''),
        mentorId: isMentor
          ? activeMentor?.id || currentUser?.mentorId || currentUser?.id
          : resolvedMentor?.id,
        mentorName: isMentor
          ? activeMentor?.fullName || currentUser?.fullName
          : resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : isAdmin ? 'admin' : 'supervisor',
        quarterTerm: mpsQuarterTerm,
        assessmentType: 'Quarterly Examination',
        totalTakers,
        meanScore,
        highestPossibleScore,
        mps,
        targetMet: mps >= 75.0,
        leastMasteredCompetencies: competencies.length > 0 ? competencies : [leastMastered],
        remediationPlan,
        googleDriveLink: mpsGoogleDriveLink.trim(),
      });
    }
    setEditingAssessment(null);
    setIsAssessmentModalOpen(false);
  };

  const handleOpenAddPMCF = () => {
    setEditingPmcf(null);
    setTeacherId(scopedTeachers[0]?.id || teachers[0]?.id || '');
    setQuarterTerm('Term 1');
    setCoachingMechanism('Assessment');
    setCriticalIncidentDescription('');
    setActionPlanOutput('');
    setImpactOnJobPerformance('');
    setPmcfStatus('In Progress');
    setIsModalOpen(true);
  };

  const handleOpenEditPMCF = (r: PMCFRecord) => {
    setEditingPmcf(r);
    setTeacherId(r.teacherId);
    setQuarterTerm(r.quarterTerm);
    setCoachingMechanism(r.coachingMechanism);
    setCriticalIncidentDescription(r.criticalIncidentDescription);
    setActionPlanOutput(r.actionPlanOutput);
    setImpactOnJobPerformance(r.impactOnJobPerformance);
    setPmcfStatus(r.status);
    setIsModalOpen(true);
  };

  const handleOpenAddFAR = () => {
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

  const handleOpenEditFAR = (r: FarRecord) => {
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

  const handleSavePMCF = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === teacherId) || scopedTeachers[0] || teachers[0];
    if (!teacher) return;
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors);
    const resolvedMentor =
      activeMentor ||
      resolveRecordMentor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, mentors);
    if (editingPmcf) {
      updatePMCFRecord(editingPmcf.id, {
        category: 'assessment',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || editingPmcf.supervisorId,
        supervisorName: resolvedSup?.fullName || editingPmcf.supervisorName,
        mentorId: isMentor
          ? activeMentor?.id || currentUser?.mentorId || currentUser?.id
          : editingPmcf.mentorId || resolvedMentor?.id,
        mentorName: isMentor
          ? activeMentor?.fullName || currentUser?.fullName
          : editingPmcf.mentorName || resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : editingPmcf.evaluatorRole,
        quarterTerm,
        criticalIncidentDescription,
        coachingMechanism,
        actionPlanOutput,
        impactOnJobPerformance: impactOnJobPerformance || 'Pending post-coaching assessment evaluation.',
        status: pmcfStatus,
      });
    } else {
      addPMCFRecord({
        category: 'assessment',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || (!isMentor ? currentUser?.supervisorId || currentUser?.id || '' : ''),
        supervisorName: resolvedSup?.fullName || (!isMentor ? currentUser?.fullName || '' : ''),
        mentorId: isMentor
          ? activeMentor?.id || currentUser?.mentorId || currentUser?.id
          : resolvedMentor?.id,
        mentorName: isMentor
          ? activeMentor?.fullName || currentUser?.fullName
          : resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : isAdmin ? 'admin' : 'supervisor',
        date: new Date().toISOString().slice(0, 10),
        quarterTerm,
        criticalIncidentDescription,
        coachingMechanism,
        actionPlanOutput,
        impactOnJobPerformance: impactOnJobPerformance || 'Pending post-coaching assessment evaluation.',
        status: pmcfStatus,
      });
    }
    setIsModalOpen(false);
    setEditingPmcf(null);
    setCriticalIncidentDescription('');
    setActionPlanOutput('');
    setImpactOnJobPerformance('');
  };

  const handleSaveFAR = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find((t) => t.id === farTeacherId) || scopedTeachers[0] || teachers[0];
    if (!teacher) return;
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors);
    const resolvedMentor =
      activeMentor ||
      resolveRecordMentor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, mentors);
    if (editingFar) {
      updateFarRecord(editingFar.id, {
        category: 'assessment',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || editingFar.supervisorId,
        supervisorName: resolvedSup?.fullName || editingFar.supervisorName,
        mentorId: isMentor
          ? activeMentor?.id || currentUser?.mentorId || currentUser?.id
          : editingFar.mentorId || resolvedMentor?.id,
        mentorName: isMentor
          ? activeMentor?.fullName || currentUser?.fullName
          : editingFar.mentorName || resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : editingFar.evaluatorRole,
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
        category: 'assessment',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || (!isMentor ? currentUser?.supervisorId || currentUser?.id || '' : ''),
        supervisorName: resolvedSup?.fullName || (!isMentor ? currentUser?.fullName || '' : ''),
        mentorId: isMentor
          ? activeMentor?.id || currentUser?.mentorId || currentUser?.id
          : resolvedMentor?.id,
        mentorName: isMentor
          ? activeMentor?.fullName || currentUser?.fullName
          : resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : isAdmin ? 'admin' : 'supervisor',
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

  const handlePrintAssessmentsTable = () => {
    printTableReportToPdf({
      title: 'Assessment Records & Mean Percentage Scores (MPS) Table',
      subtitle: 'Quarterly Examination MPS Tracking · 75% DepEd Benchmark (DO 8, s. 2015)',
      schoolName: schoolProfile.schoolName,
      schoolId: schoolProfile.schoolId,
      address: schoolProfile.address,
      preparedBy: currentUser?.fullName || 'Instructional Supervisor',
      headers: [
        'Subject & Term',
        'Teacher & Evaluator',
        'Section / Takers',
        'Mean Score',
        'MPS (%)',
        'Least Mastered Competency',
        'Target Status',
      ],
      rows: filteredAssessments.map((a) => [
        `${a.subject}\n${a.quarterTerm}`,
        `${a.teacherName}\n${
          a.evaluatorRole === 'mentor' && a.mentorName
            ? `Mentor: ${a.mentorName}`
            : `Supervisor: ${resolveRecordSupervisorName(a, teachers, supervisors)}`
        }`,
        `${a.section}\n${a.totalTakers} examinees`,
        `${a.meanScore} / ${a.highestPossibleScore}`,
        `${a.mps}%`,
        a.leastMasteredCompetencies.join('; ') || '—',
        a.targetMet ? 'Target Met (>=75%)' : 'Below Target (<75%)',
      ]),
    });
  };

  const handlePrintFormativeTable = (termFilter?: FormativeTerm) => {
    const rowsToPrint = scopedFormativeRecords.filter(
      (r) => !termFilter || r.term === termFilter
    );
    printTableReportToPdf({
      title: termFilter
        ? `Formative Assessment Table — ${termFilter}`
        : 'Formative Assessment Menu & Consolidated Term Tables',
      subtitle: 'Daily & Weekly Formative Mastery Tracking',
      schoolName: schoolProfile.schoolName,
      schoolId: schoolProfile.schoolId,
      address: schoolProfile.address,
      preparedBy: currentUser?.fullName || 'Instructional Supervisor',
      headers: [
        'Code & Date',
        'Term',
        'Teacher & Evaluator',
        'Subject & Class',
        'Strategy & Competency',
        'Mastery / MPS',
        'Instructional Feedback',
      ],
      rows: rowsToPrint.map((item) => [
        `${item.code}\n${item.date}`,
        item.term,
        `${item.teacherName}\n${
          item.evaluatorRole === 'mentor' && item.mentorName
            ? `Mentor: ${item.mentorName}`
            : `Supervisor: ${resolveRecordSupervisorName(item, teachers, supervisors)}`
        }`,
        `${item.subject}\n${item.gradeLevel} · ${item.section}`,
        `${item.formativeType}: ${item.competencyTopic}`,
        `${item.mps.toFixed(1)}% (${item.status})`,
        item.feedbackNotes || '—',
      ]),
    });
  };

  const handlePrintSummativeTable = (termFilter?: SummativeTerm) => {
    const rowsToPrint = scopedSummativeRecords.filter(
      (r) => !termFilter || r.term === termFilter
    );
    printTableReportToPdf({
      title: termFilter
        ? `Summative Assessment Table — ${termFilter}`
        : 'Summative Assessment Menu & Consolidated Term Tables',
      subtitle: 'TOS Verification, Cognitive Domains & Quarterly Summative MPS',
      schoolName: schoolProfile.schoolName,
      schoolId: schoolProfile.schoolId,
      address: schoolProfile.address,
      preparedBy: currentUser?.fullName || 'Instructional Supervisor',
      headers: [
        'Code & Date',
        'Term',
        'Teacher & Evaluator',
        'Subject & Class',
        'Summative Type & TOS QA',
        'Mastery / MPS',
        'Least Mastered & QA Remarks',
      ],
      rows: rowsToPrint.map((item) => [
        `${item.code}\n${item.date}`,
        item.term,
        `${item.teacherName}\n${
          item.evaluatorRole === 'mentor' && item.mentorName
            ? `Mentor: ${item.mentorName}`
            : `Supervisor: ${resolveRecordSupervisorName(item, teachers, supervisors)}`
        }`,
        `${item.subject}\n${item.gradeLevel} · ${item.section}`,
        `${item.summativeType} · ${item.tosVerified}\n${item.competencyCoverage}`,
        `${item.mps.toFixed(1)}% (${item.status})`,
        `${item.leastMasteredNotes || '—'}${item.itemQualityRemarks ? `\nQA: ${item.itemQualityRemarks}` : ''}`,
      ]),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
            <span>DepEd Assessment Quality Assurance</span>
            <span aria-hidden="true">·</span>
            <span>DO 8, s. 2015 Policy Alignment</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Assessment Checking
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Evaluate Table of Specifications (TOS), item distribution across cognitive domains, answer key verification, learner activity sheets, and summative exams for Terms 1, 2, and 3.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openNewFormativeModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Formative Assessment Menu"
          >
            <Plus className="w-4 h-4" />
            <span>Formative</span>
          </button>
          <button
            onClick={() => openNewSummativeModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Summative Assessment Menu"
          >
            <Plus className="w-4 h-4" />
            <span>Summative</span>
          </button>
          <button
            onClick={openNewAssessmentModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Record MPS Assessment"
          >
            <Plus className="w-4 h-4" />
            <span>Record MPS Assessment</span>
          </button>
          {!isTeacher && (
            <>
              <button
                onClick={handleOpenAddPMCF}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#8C2437] hover:bg-[#701628] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                title="PMCF for Assessment"
              >
                <Plus className="w-4 h-4" />
                <span>PMCF for Assessment</span>
              </button>
              <button
                onClick={handleOpenAddFAR}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                title="FAR for Assessment"
              >
                <Plus className="w-4 h-4" />
                <span>FAR for Assessment</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Visual Progress Bar Panel: Scoped to Authorized Teachers */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#701628]/10 text-[#701628] border border-[#701628]/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                {isTeacher
                  ? 'My Personal Supervision & Assessment Progress'
                  : isMentor
                  ? 'Mentee Assessment & Lesson Plan Supervision Progress'
                  : 'Instructional & Assessment Supervision Completion Progress'}
              </h3>
              <p className="text-xs text-stone-500">
                {isMentor
                  ? `Lesson plan (DLL/DLP) & assessment tracking across ${displayTeacherPool.length} assigned mentee(s)`
                  : `Percentage of completed evaluations against ${displayTeacherPool.length} authorized faculty record(s)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 font-mono">
              {isTeacher ? 'Scope: Personal' : `Teachers: ${displayTeacherPool.length}`}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#701628] text-white text-xs font-bold font-mono">
              Overall: {overallSupervisionPct}%
            </span>
          </div>
        </div>

        {/* Combined Overall Visual Progress Bar */}
        <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/80">
          <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-1.5">
            <span>
              {isMentor
                ? `Mentee Lesson Plan Completion Rate (${displayTeacherPool.length} Mentees)`
                : `Supervision Completion Rate (${displayTeacherPool.length} Authorized Teachers)`}
            </span>
            <span className="font-mono text-[#701628] text-sm">{overallSupervisionPct}%</span>
          </div>
          <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-[#701628] via-[#8C2437] to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${overallSupervisionPct}%` }}
            />
          </div>
        </div>

        {/* Detailed Progress Bars */}
        <div className={`grid grid-cols-1 ${isMentor ? '' : 'md:grid-cols-2'} gap-4`}>
          {!isMentor && (
            <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-50 text-[#701628] border border-rose-200">
                    <ClipboardCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      Completed Classroom Observations
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {completedObservationsCount} completed ({uniqueTeachersObservedCount} unique faculty)
                    </div>
                  </div>
                </div>
                <span className="text-base font-extrabold font-mono text-[#701628] tabular-nums">
                  {observationCompletionPct}%
                </span>
              </div>

              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/60">
                <div
                  className="h-full bg-[#701628] rounded-full transition-all duration-500"
                  style={{ width: `${observationCompletionPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                <span>Faculty Coverage: <strong className="text-stone-800">{teacherObservedCoveragePct}%</strong> ({uniqueTeachersObservedCount}/{displayTeacherPool.length})</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {scopedObservations.filter((o) => o.status === 'Scheduled').length} Scheduled Next
                </span>
              </div>
            </div>
          )}

          {/* Progress Bar 2: Completed Lesson Plan Checks */}
          <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Completed Lesson Plan (DLL/DLP) Checks
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {completedLessonPlanChecksCount} checked ({approvedLessonPlansCount} Approved) of {displayTeacherPool.length} authorized
                  </div>
                </div>
              </div>
              <span className="text-base font-extrabold font-mono text-amber-700 tabular-nums">
                {lessonPlanCompletionPct}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/60">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${lessonPlanCompletionPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
              <span>Teachers Checked: <strong className="text-stone-800">{uniqueTeachersLessonPlanCheckedCount}/{displayTeacherPool.length}</strong></span>
              <span className="font-mono font-semibold text-amber-800">
                {scopedLessonPlans.filter((lp) => lp.status === 'Pending Inspection').length} Pending Inspection
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructional Supervisor / Mentor Output Scope Banner / Filter */}
      <SupervisionScopeBanner
        selectedSupervisorFilterId={selectedSupervisorFilterId}
        onChangeSupervisorFilterId={setSelectedSupervisorFilterId}
        currentUser={currentUser}
        teachers={teachers}
        supervisors={supervisors}
        mentors={mentors}
        moduleLabel="Assessment MPS, Formative & Summative Term Tables, PMCF & FAR for Assessment Tables"
      />

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search subject, teacher, grade, record code, or findings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628]"
          />
        </div>
        <div className="text-xs text-stone-500 font-medium hidden sm:block">
          Benchmark Standard: <span className="font-bold text-emerald-700">&ge;75% MPS</span> · DO 8, s. 2015
        </div>
      </div>

      {/* Table: Assessment Records & Mean Percentage Scores */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Assessment Records & Mean Percentage Scores ({filteredAssessments.length})
            </h3>
            <p className="text-[11px] text-stone-500">
              Quarterly Examination MPS Tracking · Evaluating learner mastery against the 75% DepEd benchmark
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#701628]/10 text-[#701628]">
              {filteredAssessments.length}{' '}
              {filteredAssessments.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={handlePrintAssessmentsTable}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Print / Export Assessment Records & MPS Table to PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print to PDF</span>
            </button>
            <button
              type="button"
              onClick={openNewAssessmentModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record MPS Assessment</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Subject & Grade</th>
                <th className="py-3 px-4">Teacher</th>
                <th className="py-3 px-4">Section / Takers</th>
                <th className="py-3 px-4 text-center">Mean Score</th>
                <th className="py-3 px-4 text-center">MPS (%)</th>
                <th className="py-3 px-4">Least Mastered Competency</th>
                <th className="py-3 px-4">Target Benchmark</th>
                <th className="py-3 px-4">Google Drive</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredAssessments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-500">
                    No assessment records found.
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((a) => (
                  <tr key={a.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-stone-900">
                      <div>{a.subject}</div>
                      <div className="text-[11px] text-stone-500">{a.quarterTerm}</div>
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      <div className="font-bold text-stone-900">{a.teacherName}</div>
                      <div className="text-[10px] text-[#701628] font-medium">
                        Supervisor: {resolveRecordSupervisorName(a, teachers, supervisors)}
                      </div>
                      {(a.mentorName || a.evaluatorRole === 'mentor') && (
                        <div className="text-[10px] text-teal-700 font-semibold">
                          Mentor: {a.mentorName || resolveRecordMentor(a, teachers, mentors)?.fullName || 'Assigned Mentor'}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      <div>{a.section}</div>
                      <div className="text-[11px] text-stone-400 font-mono">{a.totalTakers} examinees</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-stone-800">
                      {a.meanScore} / {a.highestPossibleScore}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-sm font-extrabold text-[#701628]">
                      {a.mps}%
                    </td>
                    <td className="py-3 px-4 max-w-xs text-stone-700">
                      <div className="line-clamp-2 text-[11px]">
                        {a.leastMasteredCompetencies.join('; ')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {a.targetMet ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Target Met (&ge;75%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          Below Target (&lt;75%)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {a.googleDriveLink ? (
                        <a
                          href={a.googleDriveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#701628] border border-amber-200 rounded-lg text-[11px] font-bold transition-colors"
                          title="Open Google Drive Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Drive</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditAssessmentModal(a)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-stone-400 hover:text-[#701628] text-[11px] font-medium transition-colors cursor-pointer"
                          title="Add Google Drive Link"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Add Drive Link</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditAssessmentModal(a)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          title="Edit Assessment Record"
                        >
                          <Pencil className="w-3.5 h-3.5 text-stone-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => deleteAssessment(a.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formative Assessment Menu Section: Filter by Term & Separated Tables by Term */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 mt-0.5">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">
                  Formative Assessment Menu & Term Tables
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900">
                  {scopedFormativeRecords.length} Total Formative Records
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                New entries submitted in the Formative modal automatically route to their respective Term table below (Term 1, Term 2, or Term 3 End of Term Assessment).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200">
              <Filter className="w-3.5 h-3.5 text-stone-500 ml-1.5 mr-0.5" />
              {(
                [
                  { id: 'ALL', label: 'All Terms (Separated)' },
                  { id: 'Term 1', label: 'Formative Term 1' },
                  { id: 'Term 2', label: 'Formative Term 2' },
                  { id: 'Term 3', label: 'Formative Term 3 (End of Term)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFormativeTermFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    selectedFormativeTermFilter === tab.id
                      ? 'bg-[#701628] text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handlePrintFormativeTable()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Print / Export Formative Assessment Tables to PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print to PDF</span>
            </button>

            <button
              type="button"
              onClick={() => openNewFormativeModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Formative Assessment</span>
            </button>
          </div>
        </div>

        {/* Separated Tables for Term 1, Term 2, and Term 3 (End of Term Assessment) */}
        <div className="space-y-6">
          {(
            [
              {
                term: 'Term 1' as FormativeTerm,
                title: 'Table for Formative Term 1',
                subtitle: 'First Term Formative Checks, Quizzes, Seatworks, and Competency Mastery Tracking',
                badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
                headerBg: 'bg-sky-50/50',
              },
              {
                term: 'Term 2' as FormativeTerm,
                title: 'Table for Formative Term 2',
                subtitle: 'Second Term Formative Checks, Performance Tasks, and Mid-Year Mastery Tracking',
                badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
                headerBg: 'bg-amber-50/50',
              },
              {
                term: 'Term 3' as FormativeTerm,
                title: 'Table for Formative Term 3 (End of Term Assessment)',
                subtitle: 'Third Term & End of Term Integrative Formative Assessments and Mastery Validation',
                badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                headerBg: 'bg-emerald-50/50',
              },
            ] as const
          )
            .filter((section) => selectedFormativeTermFilter === 'ALL' || selectedFormativeTermFilter === section.term)
            .map((section) => {
              const termRecords = scopedFormativeRecords.filter((r) => {
                if (r.term !== section.term) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const supName = resolveRecordSupervisorName(r, teachers, supervisors);
                return (
                  r.teacherName.toLowerCase().includes(q) ||
                  r.subject.toLowerCase().includes(q) ||
                  r.gradeLevel.toLowerCase().includes(q) ||
                  r.section.toLowerCase().includes(q) ||
                  r.formativeType.toLowerCase().includes(q) ||
                  r.competencyTopic.toLowerCase().includes(q) ||
                  r.code.toLowerCase().includes(q) ||
                  supName.toLowerCase().includes(q)
                );
              });

              return (
                <div
                  key={section.term}
                  className="rounded-xl border border-stone-200 overflow-hidden bg-white shadow-2xs"
                >
                  <div
                    className={`px-4 py-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${section.headerBg}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-stone-900">{section.title}</h4>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${section.badgeClass}`}
                        >
                          {termRecords.length} {termRecords.length === 1 ? 'Record' : 'Records'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{section.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handlePrintFormativeTable(section.term)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-300" />
                        <span>Print to PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openNewFormativeModal(section.term)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-[#701628] border border-[#701628]/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          Add to {section.term === 'Term 3' ? 'Term 3 (End of Term)' : section.term}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50/90 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                          <th className="py-3 px-4">Code & Date</th>
                          <th className="py-3 px-4">Teacher</th>
                          <th className="py-3 px-4">Subject & Class</th>
                          <th className="py-3 px-4">Formative Strategy & Competency</th>
                          <th className="py-3 px-4">Mastery / MPS</th>
                          <th className="py-3 px-4">Instructional Feedback</th>
                          <th className="py-3 px-4">Google Drive</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-xs">
                        {termRecords.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-stone-400">
                              No formative records logged for {section.title} yet. Click &ldquo;Formative&rdquo; or &ldquo;Add to {section.term}&rdquo; to add a record.
                            </td>
                          </tr>
                        ) : (
                          termRecords.map((item) => (
                            <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-stone-800 block">{item.code}</span>
                                <span className="text-[11px] text-stone-500">{item.date}</span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-stone-900">{item.teacherName}</div>
                                <div className="text-[10px] text-[#701628] font-medium">
                                  Supervisor: {resolveRecordSupervisorName(item, teachers, supervisors)}
                                </div>
                                {(item.mentorName || item.evaluatorRole === 'mentor') && (
                                  <div className="text-[10px] text-teal-700 font-semibold">
                                    Mentor: {item.mentorName || resolveRecordMentor(item, teachers, mentors)?.fullName || 'Assigned Mentor'}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-stone-800">{item.subject}</div>
                                <div className="text-[11px] text-stone-500">
                                  {item.gradeLevel} · {item.section}
                                </div>
                              </td>
                              <td className="py-3 px-4 max-w-xs">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200 mb-1">
                                  {item.formativeType}
                                </span>
                                <div className="text-stone-700 font-medium line-clamp-2">
                                  {item.competencyTopic}
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-sm font-black ${
                                      item.mps >= 75 ? 'text-emerald-700' : 'text-rose-700'
                                    }`}
                                  >
                                    {item.mps.toFixed(1)}%
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      item.mps >= 75
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-stone-500 mt-0.5">
                                  {item.masteryCount}/{item.totalLearners} Learners · Mean {item.meanScore}/{item.highestPossibleScore}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-stone-600 max-w-xs">
                                {item.feedbackNotes || '—'}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                {item.googleDriveLink ? (
                                  <a
                                    href={item.googleDriveLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold transition-colors"
                                    title="Open Google Drive Link"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>View Drive</span>
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openEditFormativeModal(item)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-stone-400 hover:text-amber-800 text-[11px] font-medium transition-colors cursor-pointer"
                                    title="Add Google Drive Link"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Add Drive Link</span>
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditFormativeModal(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                    title="Edit Formative Assessment"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-stone-600" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFormative(item.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                    title="Delete Formative Assessment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Summative Assessment Menu Section: Filter by Term & Separated Tables by Term */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 mt-0.5">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">
                  Summative Assessment Menu & Term Tables
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-100 text-teal-900">
                  {scopedSummativeRecords.length} Total Summative Records
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                New entries submitted in the Summative modal automatically route to their respective Term table below (Term 1, Term 2, or Term 3 End of Term Assessment).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200">
              <Filter className="w-3.5 h-3.5 text-stone-500 ml-1.5 mr-0.5" />
              {(
                [
                  { id: 'ALL', label: 'All Terms (Separated)' },
                  { id: 'Term 1', label: 'Summative Term 1' },
                  { id: 'Term 2', label: 'Summative Term 2' },
                  { id: 'Term 3', label: 'Summative Term 3 (End of Term)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedSummativeTermFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    selectedSummativeTermFilter === tab.id
                      ? 'bg-[#701628] text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handlePrintSummativeTable()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Print / Export Summative Assessment Tables to PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print to PDF</span>
            </button>

            <button
              type="button"
              onClick={() => openNewSummativeModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Summative Assessment</span>
            </button>
          </div>
        </div>

        {/* Separated Tables for Summative Term 1, Term 2, and Term 3 (End of Term Assessment) */}
        <div className="space-y-6">
          {(
            [
              {
                term: 'Term 1' as SummativeTerm,
                title: 'Table for Summative Term 1',
                subtitle: 'First Term Summative Tests, TOS & Answer Key Verification, and MPS Mastery Tracking',
                badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
                headerBg: 'bg-sky-50/50',
              },
              {
                term: 'Term 2' as SummativeTerm,
                title: 'Table for Summative Term 2',
                subtitle: 'Second Term Summative Examinations, Cognitive Domain Alignment, and Mid-Year MPS Tracking',
                badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
                headerBg: 'bg-teal-50/50',
              },
              {
                term: 'Term 3' as SummativeTerm,
                title: 'Table for Summative Term 3 (End of Term Assessment)',
                subtitle: 'Third Term & End of Term Summative Assessments, Final TOS QA, and Year-End MPS Validation',
                badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                headerBg: 'bg-emerald-50/50',
              },
            ] as const
          )
            .filter((section) => selectedSummativeTermFilter === 'ALL' || selectedSummativeTermFilter === section.term)
            .map((section) => {
              const termRecords = scopedSummativeRecords.filter((r) => {
                if (r.term !== section.term) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const supName = resolveRecordSupervisorName(r, teachers, supervisors);
                return (
                  r.teacherName.toLowerCase().includes(q) ||
                  r.subject.toLowerCase().includes(q) ||
                  r.gradeLevel.toLowerCase().includes(q) ||
                  r.section.toLowerCase().includes(q) ||
                  r.summativeType.toLowerCase().includes(q) ||
                  r.competencyCoverage.toLowerCase().includes(q) ||
                  r.code.toLowerCase().includes(q) ||
                  supName.toLowerCase().includes(q)
                );
              });

              return (
                <div
                  key={section.term}
                  className="rounded-xl border border-stone-200 overflow-hidden bg-white shadow-2xs"
                >
                  <div
                    className={`px-4 py-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${section.headerBg}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-stone-900">{section.title}</h4>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${section.badgeClass}`}
                        >
                          {termRecords.length} {termRecords.length === 1 ? 'Record' : 'Records'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{section.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handlePrintSummativeTable(section.term)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-300" />
                        <span>Print to PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openNewSummativeModal(section.term)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-teal-800 border border-teal-700/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          Add to {section.term === 'Term 3' ? 'Term 3 (End of Term)' : section.term}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50/90 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                          <th className="py-3 px-4">Code & Date</th>
                          <th className="py-3 px-4">Teacher</th>
                          <th className="py-3 px-4">Subject & Class</th>
                          <th className="py-3 px-4">Summative Type, TOS QA & Coverage</th>
                          <th className="py-3 px-4">Mastery / MPS</th>
                          <th className="py-3 px-4">Least Mastered & Action</th>
                          <th className="py-3 px-4">Google Drive</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-xs">
                        {termRecords.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-stone-400">
                              No summative records logged for {section.title} yet. Click &ldquo;Summative&rdquo; or &ldquo;Add to {section.term}&rdquo; to add a record.
                            </td>
                          </tr>
                        ) : (
                          termRecords.map((item) => (
                            <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-stone-800 block">{item.code}</span>
                                <span className="text-[11px] text-stone-500">{item.date}</span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-stone-900">{item.teacherName}</div>
                                <div className="text-[10px] text-[#701628] font-medium">
                                  Supervisor: {resolveRecordSupervisorName(item, teachers, supervisors)}
                                </div>
                                {(item.mentorName || item.evaluatorRole === 'mentor') && (
                                  <div className="text-[10px] text-teal-700 font-semibold">
                                    Mentor: {item.mentorName || resolveRecordMentor(item, teachers, mentors)?.fullName || 'Assigned Mentor'}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-stone-800">{item.subject}</div>
                                <div className="text-[11px] text-stone-500">
                                  {item.gradeLevel} · {item.section}
                                </div>
                              </td>
                              <td className="py-3 px-4 max-w-xs">
                                <div className="flex flex-wrap items-center gap-1 mb-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                                    {item.summativeType}
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                      item.tosVerified === 'TOS & Answer Key Verified'
                                        ? 'bg-teal-50 text-teal-800 border-teal-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    {item.tosVerified}
                                  </span>
                                  {item.qualitySignOff && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                      {item.qualitySignOff}
                                    </span>
                                  )}
                                </div>
                                <div className="text-stone-700 font-medium line-clamp-2">
                                  {item.competencyCoverage}
                                </div>
                                {item.totalItems !== undefined && (
                                  <div className="text-[10px] text-stone-500 mt-1 font-medium">
                                    Bloom&apos;s ({item.totalItems} items): R:{item.bloomRemember ?? 0} · U:{item.bloomUnderstand ?? 0} · Ap:{item.bloomApply ?? 0} · An:{item.bloomAnalyze ?? 0} · E:{item.bloomEvaluate ?? 0} · C:{item.bloomCreate ?? 0}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-sm font-black ${
                                      item.mps >= 75 ? 'text-emerald-700' : 'text-rose-700'
                                    }`}
                                  >
                                    {item.mps.toFixed(1)}%
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      item.mps >= 75
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-stone-500 mt-0.5">
                                  {item.passedCount}/{item.totalLearners} Passed · Mean {item.meanScore}/{item.highestPossibleScore}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-stone-600 max-w-xs">
                                <div>{item.leastMasteredNotes || '—'}</div>
                                {item.itemQualityRemarks && (
                                  <div className="text-[10px] text-teal-800 mt-1 italic">
                                    QA: {item.itemQualityRemarks}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                {item.googleDriveLink ? (
                                  <a
                                    href={item.googleDriveLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-lg text-[11px] font-bold transition-colors"
                                    title="Open Google Drive Link"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>View Drive</span>
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openEditSummativeModal(item)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-stone-400 hover:text-teal-800 text-[11px] font-medium transition-colors cursor-pointer"
                                    title="Add Google Drive Link"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Add Drive Link</span>
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditSummativeModal(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                    title="Edit Summative Assessment"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-stone-600" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSummative(item.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                    title="Delete Summative Assessment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Table: PMCF for Assessment Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              PMCF for Assessment Table
            </h3>
            <p className="text-[11px] text-stone-500">
              Performance Monitoring and Coaching Form (PMCF) · Coaching Interventions for Assessment
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#701628]/10 text-[#701628]">
              {filteredRecords.length}{' '}
              {filteredRecords.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedPmcfRecordIdForPrint(null);
                setIsPrintPmcfModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export PMCF for Assessment Table to PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>Export PMCF (PDF)</span>
            </button>
            {!isTeacher && (
              <button
                type="button"
                onClick={handleOpenAddPMCF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8C2437] hover:bg-[#701628] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add PMCF for Assessment</span>
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
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    No PMCF for Assessment records found. Click &ldquo;PMCF for Assessment&rdquo; to add a record.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
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
                      {(r.mentorName || r.evaluatorRole === 'mentor') && (
                        <div className="text-[10px] text-teal-700 font-semibold">
                          Mentor: {r.mentorName || resolveRecordMentor(r, teachers, mentors)?.fullName || 'Assigned Mentor'}
                        </div>
                      )}
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
                            onClick={() => handleOpenEditPMCF(r)}
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

      {/* Table: FAR for Assessment Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-amber-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              FAR for Assessment Table
            </h3>
            <p className="text-[11px] text-stone-600">
              Findings, Analysis and Recommendations (FAR) · Assessment Supervision Records
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
                setSelectedRecordIdForPrint(null);
                setIsPrintFarModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export FAR for Assessment Table to PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>Export FAR (PDF)</span>
            </button>
            {!isTeacher && (
              <button
                type="button"
                onClick={handleOpenAddFAR}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAR for Assessment</span>
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
                    No FAR for Assessment records found. Click &ldquo;FAR for Assessment&rdquo; to add a record.
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
                        {(r.mentorName || r.evaluatorRole === 'mentor') && (
                          <div className="text-[10px] text-teal-700 font-semibold mt-0.5">
                            Mentor: {r.mentorName || resolveRecordMentor(r, teachers, mentors)?.fullName || 'Assigned Mentor'}
                          </div>
                        )}
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
                              setSelectedRecordIdForPrint(r.id);
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
                              onClick={() => handleOpenEditFAR(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-md text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Edit FAR for Assessment"
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

      {/* PMCF Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingPmcf ? `Edit PMCF for Assessment (${editingPmcf.recordNo})` : 'PMCF for Assessment'}
                </h3>
                <p className="text-[11px] text-amber-200">
                  DepEd PMES Form 3 · Continuous Supervisory Coaching Intervention
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingPmcf(null);
                }}
                className="p-1 rounded-lg text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePMCF} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Teacher</label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    disabled={isTeacher}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white disabled:bg-stone-100"
                  >
                    {scopedTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Term</label>
                  <select
                    value={quarterTerm}
                    onChange={(e) => setQuarterTerm(e.target.value)}
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
                    value={coachingMechanism}
                    onChange={(e) => setCoachingMechanism(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Individual Conference">Individual Conference</option>
                    <option value="LAC Session">LAC Session</option>
                    <option value="Peer Mentoring">Peer Mentoring</option>
                    <option value="Demonstration Teaching">Demonstration Teaching</option>
                    <option value="Written Feedback">Written Feedback</option>
                    <option value="Classroom Observation">Classroom Observation</option>
                    <option value="Walkthrough/Fleeting Observations">Walkthrough/Fleeting Observations</option>
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
                <label className="block font-bold text-stone-700 mb-1">Critical Incident Description</label>
                <textarea
                  required
                  rows={2}
                  value={criticalIncidentDescription}
                  onChange={(e) => setCriticalIncidentDescription(e.target.value)}
                  placeholder="Describe context, observed performance gap or instructional challenge..."
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Output / Collaborative Action Plan</label>
                <textarea
                  required
                  rows={2}
                  value={actionPlanOutput}
                  onChange={(e) => setActionPlanOutput(e.target.value)}
                  placeholder="Actionable steps, mentoring activities, or instructional materials to prepare..."
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Impact on Job Performance</label>
                <input
                  type="text"
                  value={impactOnJobPerformance}
                  onChange={(e) => setImpactOnJobPerformance(e.target.value)}
                  placeholder="Expected or observed measurable improvement in learner outcomes..."
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
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

      {/* Findings, Analysis and Recommendations (FAR) Modal */}
      {isFarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingFar ? `Edit FAR for Assessment (${editingFar.farCode})` : 'FAR for Assessment'}
                </h3>
                <p className="text-[11px] text-amber-200">
                  Findings, Analysis and Recommendation · Assessment Evaluation
                </p>
              </div>
              <button
                onClick={() => {
                  setIsFarModalOpen(false);
                  setEditingFar(null);
                }}
                className="p-1 rounded-lg text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFAR} className="p-6 space-y-4 text-xs">
              {/* Teacher option from registered teachers in Personnel and Roster */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Teacher <span className="text-rose-600">*</span>
                </label>
                <select
                  value={farTeacherId}
                  onChange={(e) => setFarTeacherId(e.target.value)}
                  disabled={isTeacher}
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium disabled:bg-stone-100"
                >
                  {scopedTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department} · {t.position} - {t.subject})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Select faculty member registered in the Personnel & Supervisory Roster
                </p>
              </div>

              {/* Term & Lesson Plan Week */}
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

              {/* Status if editing */}
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

              {/* Findings */}
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

              {/* Analysis */}
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

              {/* Recommendations */}
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

      {/* Assessment Modal (Create & Edit) */}
      {isAssessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingAssessment ? 'Edit Quarterly Exam MPS Record' : 'Record Quarterly Exam MPS Score'}
              </h3>
              <button
                onClick={() => {
                  setEditingAssessment(null);
                  setIsAssessmentModalOpen(false);
                }}
                className="p-1 rounded-lg text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssessment} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block font-bold text-stone-700 mb-1">Grade Level</label>
                  <input
                    type="text"
                    required
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Section</label>
                  <input
                    type="text"
                    required
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Teacher</label>
                  <select
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    disabled={isTeacher}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white disabled:bg-stone-100"
                  >
                    {scopedTeachers.map((t) => (
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
                  onClick={() => {
                    setEditingAssessment(null);
                    setIsAssessmentModalOpen(false);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingAssessment ? 'Save Changes' : 'Save MPS Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formative Assessment Modal */}
      {isFormativeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
            <div className="px-6 py-4 bg-[#701628] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingFormative ? 'Edit Formative Assessment Record' : 'Formative Assessment Modal'}
                </h3>
                <p className="text-xs text-rose-100/90 mt-0.5">
                  Select Term 1, Term 2, or Term 3 (End of Term Assessment) — submitting routes directly to that Term&apos;s Formative Table.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingFormative(null);
                  setIsFormativeModalOpen(false);
                }}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFormative} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Target Term Selector */}
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
                        setFormativeSubject(found.subject || found.department);
                        setFormativeGradeLevel(found.gradeLevels?.[0] || 'Grade 10');
                      }
                    }}
                    disabled={isTeacher}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white disabled:bg-stone-100"
                  >
                    {scopedTeachers.map((t) => (
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
                <label className="block font-bold text-stone-700 mb-1">
                  Google Drive Link
                </label>
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
                  onClick={() => {
                    setEditingFormative(null);
                    setIsFormativeModalOpen(false);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingFormative
                    ? `Update in ${formativeTerm === 'Term 3' ? 'Formative Term 3 (End of Term Assessment)' : `Formative ${formativeTerm}`}`
                    : `Submit to Table for Formative ${formativeTerm === 'Term 3' ? 'Term 3 (End of Term Assessment)' : formativeTerm}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summative Assessment Modal */}
      {isSummativeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
            <div className="px-6 py-4 bg-teal-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingSummative ? 'Edit Summative Assessment Record' : 'Summative Assessment Modal'}
                </h3>
                <p className="text-xs text-teal-100/90 mt-0.5">
                  Select Term 1, Term 2, or Term 3 (End of Term Assessment) — submitting routes directly to that Term&apos;s Summative Table.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingSummative(null);
                  setIsSummativeModalOpen(false);
                }}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSummative} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Target Term Selector */}
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
                        setSummativeSubject(found.subject || found.department);
                        setSummativeGradeLevel(found.gradeLevels?.[0] || 'Grade 10');
                      }
                    }}
                    disabled={isTeacher}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white disabled:bg-stone-100"
                  >
                    {scopedTeachers.map((t) => (
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
                  <label className="block font-bold text-stone-700 mb-1">
                    Computed MPS Preview
                  </label>
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

                {/* Examination Period, Total Items, Quality Sign-Off */}
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

                {/* Table of Specifications (TOS) & Bloom's Cognitive Distribution */}
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

                {/* Item Quality Remarks / Distracter Analysis */}
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
                <label className="block font-bold text-stone-700 mb-1">
                  Google Drive Link
                </label>
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
                  onClick={() => {
                    setEditingSummative(null);
                    setIsSummativeModalOpen(false);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingSummative
                    ? `Update in ${summativeTerm === 'Term 3' ? 'Summative Term 3 (End of Term Assessment)' : `Summative ${summativeTerm}`}`
                    : `Submit to Table for Summative ${summativeTerm === 'Term 3' ? 'Term 3 (End of Term Assessment)' : summativeTerm}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Findings, Analysis and Recommendations (FAR) Official DepEd PDF / Print Modal */}
      <PrintFarReportModal
        isOpen={isPrintFarModalOpen}
        onClose={() => setIsPrintFarModalOpen(false)}
        initialSelectedRecordId={selectedRecordIdForPrint}
        records={filteredFarRecords}
      />

      {/* Performance Monitoring and Coaching Form (PMCF) Official DepEd PDF / Print Modal */}
      <PrintPmcfReportModal
        isOpen={isPrintPmcfModalOpen}
        onClose={() => setIsPrintPmcfModalOpen(false)}
        initialSelectedRecordId={selectedPmcfRecordIdForPrint}
        records={filteredRecords}
      />
    </div>
  );
};
