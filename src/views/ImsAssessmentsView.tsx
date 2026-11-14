import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  InstructionalMaterialQA,
  PMCFRecord,
  FarRecord,
  getPmcfCategory,
  getFarCategory,
} from '../types';
import { PrintPmcfReportModal } from '../components/PrintPmcfReportModal';
import { PrintFarReportModal } from '../components/PrintFarReportModal';
import {
  matchesRoleSupervisionScope,
  SupervisionScopeBanner,
  resolveRecordSupervisor,
  resolveRecordSupervisorName,
  resolveActiveSupervisorForUser,
  resolveActiveMentorForUser,
  resolveRecordMentor,
  getScopedTeachersForModal,
} from '../utils/supervisionScope';
import { printTableReportToPdf } from '../utils/printTablePdf';
import {
  Plus,
  Search,
  X,
  Trash2,
  ExternalLink,
  Pencil,
  FileDown,
  Printer,
  Edit2,
  CheckCircle2,
  Clock,
  Check,
} from 'lucide-react';

export const ImsAssessmentsView: React.FC = () => {
  const {
    imsQA,
    teachers,
    supervisors,
    mentors,
    addIMQA,
    updateIMQA,
    deleteIMQA,
    pmcfRecords,
    addPMCFRecord,
    updatePMCFRecord,
    deletePMCFRecord,
    farRecords,
    addFarRecord,
    updateFarRecord,
    verifyFarRecord,
    deleteFarRecord,
    schoolProfile,
  } = useData();
  const { currentUser, isAdmin, isSupervisor, isMentor, isTeacher } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupervisorFilterId, setSelectedSupervisorFilterId] = useState('All');
  const [isIMModalOpen, setIsIMModalOpen] = useState(false);
  const [isLMModalOpen, setIsLMModalOpen] = useState(false);

  const scopedTeachers = getScopedTeachersForModal(currentUser, teachers, supervisors, mentors);
  const activeMentor = resolveActiveMentorForUser(currentUser, teachers, mentors);

  // Edit States
  const [editingIM, setEditingIM] = useState<InstructionalMaterialQA | null>(null);

  // New IM Form
  const [imTitle, setImTitle] = useState('');
  const [imType, setImType] = useState<InstructionalMaterialQA['type']>('Learner Activity Sheet (LAS)');
  const [imTeacherId, setImTeacherId] = useState(scopedTeachers[0]?.id || teachers[0]?.id || '');
  const [imGradeSubject, setImGradeSubject] = useState('Science 9');
  const [imFileUrl, setImFileUrl] = useState('');

  // New LM Form State
  const [lmTitle, setLmTitle] = useState('');
  const [lmType, setLmType] = useState<InstructionalMaterialQA['type']>('Self-Learning Module (SLM)');
  const [lmTeacherId, setLmTeacherId] = useState(scopedTeachers[0]?.id || teachers[0]?.id || '');
  const [lmGradeSubject, setLmGradeSubject] = useState('Mathematics 10');
  const [lmFileUrl, setLmFileUrl] = useState('');

  // Edit IM / LM Form State
  const [editImTitle, setEditImTitle] = useState('');
  const [editImKind, setEditImKind] = useState<'IM' | 'LM'>('IM');
  const [editImType, setEditImType] = useState<InstructionalMaterialQA['type']>('Learner Activity Sheet (LAS)');
  const [editImTeacherId, setEditImTeacherId] = useState('');
  const [editImGradeSubject, setEditImGradeSubject] = useState('');
  const [editImFileUrl, setEditImFileUrl] = useState('');
  const [editImStatus, setEditImStatus] = useState<InstructionalMaterialQA['status']>('Approved for Use');
  const [editImEvaluatorNotes, setEditImEvaluatorNotes] = useState('');
  const [editImMelc, setEditImMelc] = useState(true);
  const [editImAccuracy, setEditImAccuracy] = useState(true);
  const [editImCopyright, setEditImCopyright] = useState(true);
  const [editImVisual, setEditImVisual] = useState(true);

  // PMCF for IMs & LMs Modal & Print State
  const [isPmcfModalOpen, setIsPmcfModalOpen] = useState(false);
  const [editingPmcf, setEditingPmcf] = useState<PMCFRecord | null>(null);
  const [pmcfTeacherId, setPmcfTeacherId] = useState(scopedTeachers[0]?.id || teachers[0]?.id || '');
  const [pmcfQuarterTerm, setPmcfQuarterTerm] = useState('Term 1');
  const [pmcfCoachingMechanism, setPmcfCoachingMechanism] =
    useState<PMCFRecord['coachingMechanism']>('IMs & LMs');
  const [pmcfCriticalIncidentDescription, setPmcfCriticalIncidentDescription] = useState('');
  const [pmcfActionPlanOutput, setPmcfActionPlanOutput] = useState('');
  const [pmcfImpactOnJobPerformance, setPmcfImpactOnJobPerformance] = useState('');
  const [pmcfStatus, setPmcfStatus] = useState<PMCFRecord['status']>('In Progress');
  const [isPrintPmcfModalOpen, setIsPrintPmcfModalOpen] = useState(false);
  const [selectedPmcfRecordIdForPrint, setSelectedPmcfRecordIdForPrint] = useState<string | null>(
    null
  );

  // FAR for IMs & LMs Modal & Print State
  const [isFarModalOpen, setIsFarModalOpen] = useState(false);
  const [editingFar, setEditingFar] = useState<FarRecord | null>(null);
  const [farTeacherId, setFarTeacherId] = useState(scopedTeachers[0]?.id || teachers[0]?.id || '');
  const [farTerm, setFarTerm] = useState<'Term 1' | 'Term 2' | 'Term 3' | string>('Term 1');
  const [farLessonPlanWeek, setFarLessonPlanWeek] = useState('IMs / LMs QA');
  const [farFindings, setFarFindings] = useState('');
  const [farAnalysis, setFarAnalysis] = useState('');
  const [farRecommendations, setFarRecommendations] = useState('');
  const [farStatus, setFarStatus] = useState<'In Progress' | 'Verified'>('In Progress');
  const [isPrintFarModalOpen, setIsPrintFarModalOpen] = useState(false);
  const [selectedFarRecordIdForPrint, setSelectedFarRecordIdForPrint] = useState<string | null>(
    null
  );

  const q = searchQuery.toLowerCase().trim();

  const filteredIMs = imsQA.filter((im) => {
    if (
      !matchesRoleSupervisionScope(
        im,
        currentUser,
        teachers,
        supervisors,
        selectedSupervisorFilterId,
        mentors
      )
    ) {
      return false;
    }
    const supName = resolveRecordSupervisorName(im, teachers, supervisors);
    const mentorRec = resolveRecordMentor(im, teachers, mentors);
    return (
      !q ||
      im.title.toLowerCase().includes(q) ||
      im.teacherName.toLowerCase().includes(q) ||
      im.gradeSubject.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q) ||
      (im.mentorName || mentorRec?.fullName || '').toLowerCase().includes(q)
    );
  });

  const filteredPmcfRecords = pmcfRecords.filter((r) => {
    if (getPmcfCategory(r) !== 'ims-lms') return false;
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
    const mentorRec = resolveRecordMentor(r, teachers, mentors);
    return (
      !q ||
      r.teacherName.toLowerCase().includes(q) ||
      r.recordNo.toLowerCase().includes(q) ||
      r.criticalIncidentDescription.toLowerCase().includes(q) ||
      r.actionPlanOutput.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q) ||
      (r.mentorName || mentorRec?.fullName || '').toLowerCase().includes(q)
    );
  });

  const filteredFarRecords = farRecords.filter((r) => {
    if (getFarCategory(r) !== 'ims-lms') return false;
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
    const mentorRec = resolveRecordMentor(r, teachers, mentors);
    return (
      !q ||
      r.teacherName.toLowerCase().includes(q) ||
      r.farCode.toLowerCase().includes(q) ||
      r.lessonPlanWeek.toLowerCase().includes(q) ||
      r.findings.toLowerCase().includes(q) ||
      r.analysis.toLowerCase().includes(q) ||
      r.recommendations.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q) ||
      (r.mentorName || mentorRec?.fullName || '').toLowerCase().includes(q)
    );
  });

  const handleOpenIMModal = () => {
    setImTeacherId(scopedTeachers[0]?.id || teachers[0]?.id || '');
    setIsIMModalOpen(true);
  };

  const handleOpenLMModal = () => {
    setLmTeacherId(scopedTeachers[0]?.id || teachers[0]?.id || '');
    setIsLMModalOpen(true);
  };

  const openEditIMModal = (im: InstructionalMaterialQA) => {
    setEditingIM(im);
    setEditImTitle(im.title);
    setEditImKind(im.materialKind || 'IM');
    setEditImType(im.type);
    const matchedTeacher =
      scopedTeachers.find((t) => t.id === im.teacherId) ||
      teachers.find((t) => t.id === im.teacherId) ||
      teachers.find((t) => t.fullName === im.teacherName) ||
      scopedTeachers[0] ||
      teachers[0];
    setEditImTeacherId(matchedTeacher?.id || im.teacherId);
    setEditImGradeSubject(im.gradeSubject);
    setEditImFileUrl(im.fileUrl || '');
    setEditImStatus(im.status);
    setEditImEvaluatorNotes(im.evaluatorNotes);
    setEditImMelc(im.alignmentToMELC);
    setEditImAccuracy(im.contentAccuracyVerified);
    setEditImCopyright(im.copyrightCompliant);
    setEditImVisual(im.visualClarity);
  };

  const handleUpdateIM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIM) return;
    const teacher =
      scopedTeachers.find((t) => t.id === editImTeacherId) ||
      teachers.find((t) => t.id === editImTeacherId) ||
      scopedTeachers[0] ||
      teachers[0];
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      (teacher
        ? resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors)
        : undefined);
    const resolvedMentor =
      activeMentor ||
      (teacher
        ? resolveRecordMentor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, mentors)
        : undefined);

    updateIMQA(editingIM.id, {
      title: editImTitle.trim() || editingIM.title,
      materialKind: editImKind,
      type: editImType,
      teacherId: teacher ? teacher.id : editingIM.teacherId,
      teacherName: teacher ? teacher.fullName : editingIM.teacherName,
      supervisorId: isMentor
        ? (resolvedSup?.id || editingIM.supervisorId)
        : (resolvedSup?.id || editingIM.supervisorId),
      supervisorName: isMentor
        ? (resolvedSup?.fullName || editingIM.supervisorName)
        : (resolvedSup?.fullName || editingIM.supervisorName),
      mentorId: isMentor
        ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id)
        : (editingIM.mentorId || resolvedMentor?.id),
      mentorName: isMentor
        ? (resolvedMentor?.fullName || currentUser?.fullName)
        : (editingIM.mentorName || resolvedMentor?.fullName),
      evaluatorRole: isMentor
        ? 'mentor'
        : isSupervisor
        ? 'supervisor'
        : editingIM.evaluatorRole || (isAdmin ? 'admin' : undefined),
      gradeSubject: editImGradeSubject,
      fileUrl: editImFileUrl.trim(),
      status: editImStatus,
      evaluatorNotes: editImEvaluatorNotes,
      alignmentToMELC: editImMelc,
      contentAccuracyVerified: editImAccuracy,
      copyrightCompliant: editImCopyright,
      visualClarity: editImVisual,
    });
    setEditingIM(null);
  };

  const handleSaveIM = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher =
      scopedTeachers.find((t) => t.id === imTeacherId) ||
      teachers.find((t) => t.id === imTeacherId) ||
      scopedTeachers[0] ||
      teachers[0];
    if (!teacher) return;
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors);
    const resolvedMentor =
      activeMentor ||
      resolveRecordMentor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, mentors);
    const evaluatorRole = isMentor ? 'mentor' : isSupervisor ? 'supervisor' : isAdmin ? 'admin' : undefined;

    addIMQA({
      title: imTitle || 'Contextualized Learning Activity Sheet',
      type: imType,
      materialKind: 'IM',
      fileUrl: imFileUrl.trim(),
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      supervisorId: resolvedSup?.id || (isMentor ? teacher.assignedSupervisorId : currentUser?.id || 'sup-principal'),
      supervisorName: resolvedSup?.fullName || (isMentor ? 'Assigned Instructional Supervisor' : currentUser?.fullName || 'Administrator'),
      mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : resolvedMentor?.id,
      mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : resolvedMentor?.fullName,
      evaluatorRole,
      gradeSubject: imGradeSubject,
      dateSubmitted: new Date().toISOString().slice(0, 10),
      alignmentToMELC: true,
      contentAccuracyVerified: true,
      copyrightCompliant: true,
      visualClarity: true,
      status: isTeacher ? 'Under Review' : 'Approved for Use',
      evaluatorNotes: isMentor
        ? 'Reviewed by designated Mentor. Aligned with MELCs and ready for classroom use.'
        : isTeacher
        ? 'Submitted by teacher for QA evaluation.'
        : 'Reviewed by instructional supervisor. Suitable for classroom deployment.',
    });
    setIsIMModalOpen(false);
    setImTitle('');
    setImFileUrl('');
  };

  const handleSaveLM = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher =
      scopedTeachers.find((t) => t.id === lmTeacherId) ||
      teachers.find((t) => t.id === lmTeacherId) ||
      scopedTeachers[0] ||
      teachers[0];
    if (!teacher) return;
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors);
    const resolvedMentor =
      activeMentor ||
      resolveRecordMentor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, mentors);
    const evaluatorRole = isMentor ? 'mentor' : isSupervisor ? 'supervisor' : isAdmin ? 'admin' : undefined;

    addIMQA({
      title: lmTitle || 'Learner Material Module',
      type: lmType,
      materialKind: 'LM',
      fileUrl: lmFileUrl.trim(),
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      supervisorId: resolvedSup?.id || (isMentor ? teacher.assignedSupervisorId : currentUser?.id || 'sup-principal'),
      supervisorName: resolvedSup?.fullName || (isMentor ? 'Assigned Instructional Supervisor' : currentUser?.fullName || 'Administrator'),
      mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : resolvedMentor?.id,
      mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : resolvedMentor?.fullName,
      evaluatorRole,
      gradeSubject: lmGradeSubject,
      dateSubmitted: new Date().toISOString().slice(0, 10),
      alignmentToMELC: true,
      contentAccuracyVerified: true,
      copyrightCompliant: true,
      visualClarity: true,
      status: isTeacher ? 'Under Review' : 'Approved for Use',
      evaluatorNotes: isMentor
        ? 'Reviewed by designated Mentor. Suitable for learner independent study and review.'
        : isTeacher
        ? 'Submitted by teacher for QA evaluation.'
        : 'Reviewed by instructional supervisor. Suitable for learner independent study and review.',
    });
    setIsLMModalOpen(false);
    setLmTitle('');
    setLmFileUrl('');
  };

  const handleOpenAddPmcf = () => {
    setEditingPmcf(null);
    setPmcfTeacherId(scopedTeachers[0]?.id || teachers[0]?.id || '');
    setPmcfQuarterTerm('Term 1');
    setPmcfCoachingMechanism('IMs & LMs');
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
    const teacher =
      scopedTeachers.find((t) => t.id === pmcfTeacherId) ||
      teachers.find((t) => t.id === pmcfTeacherId) ||
      scopedTeachers[0] ||
      teachers[0];
    if (!teacher) return;
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors);
    const resolvedMentor =
      activeMentor ||
      resolveRecordMentor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, mentors);
    const evaluatorRole = isMentor ? 'mentor' : isSupervisor ? 'supervisor' : 'admin';

    if (editingPmcf) {
      updatePMCFRecord(editingPmcf.id, {
        category: 'ims-lms',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || editingPmcf.supervisorId,
        supervisorName: resolvedSup?.fullName || editingPmcf.supervisorName,
        mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : (editingPmcf.mentorId || resolvedMentor?.id),
        mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : (editingPmcf.mentorName || resolvedMentor?.fullName),
        evaluatorRole: editingPmcf.evaluatorRole || evaluatorRole,
        quarterTerm: pmcfQuarterTerm,
        criticalIncidentDescription: pmcfCriticalIncidentDescription,
        coachingMechanism: pmcfCoachingMechanism,
        actionPlanOutput: pmcfActionPlanOutput,
        impactOnJobPerformance:
          pmcfImpactOnJobPerformance || 'Pending IM/LM post-coaching QA verification.',
        status: pmcfStatus,
      });
    } else {
      addPMCFRecord({
        category: 'ims-lms',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || (isMentor ? teacher.assignedSupervisorId : currentUser?.id || 'sup-principal'),
        supervisorName: resolvedSup?.fullName || (isMentor ? 'Assigned Instructional Supervisor' : currentUser?.fullName || 'Administrator'),
        mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : resolvedMentor?.id,
        mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : resolvedMentor?.fullName,
        evaluatorRole,
        date: new Date().toISOString().slice(0, 10),
        quarterTerm: pmcfQuarterTerm,
        criticalIncidentDescription: pmcfCriticalIncidentDescription,
        coachingMechanism: pmcfCoachingMechanism,
        actionPlanOutput: pmcfActionPlanOutput,
        impactOnJobPerformance:
          pmcfImpactOnJobPerformance || 'Pending IM/LM post-coaching QA verification.',
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
    setFarLessonPlanWeek('IMs / LMs QA');
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
    const teacher =
      scopedTeachers.find((t) => t.id === farTeacherId) ||
      teachers.find((t) => t.id === farTeacherId) ||
      scopedTeachers[0] ||
      teachers[0];
    if (!teacher) return;
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      resolveRecordSupervisor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, supervisors);
    const resolvedMentor =
      activeMentor ||
      resolveRecordMentor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, mentors);
    const evaluatorRole = isMentor ? 'mentor' : isSupervisor ? 'supervisor' : 'admin';

    if (editingFar) {
      updateFarRecord(editingFar.id, {
        category: 'ims-lms',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || editingFar.supervisorId,
        supervisorName: resolvedSup?.fullName || editingFar.supervisorName,
        mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : (editingFar.mentorId || resolvedMentor?.id),
        mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : (editingFar.mentorName || resolvedMentor?.fullName),
        evaluatorRole: editingFar.evaluatorRole || evaluatorRole,
        term: farTerm,
        lessonPlanWeek: farLessonPlanWeek.trim() || 'IMs / LMs QA',
        findings: farFindings.trim(),
        analysis: farAnalysis.trim(),
        recommendations: farRecommendations.trim(),
        status: farStatus,
        actionTaken: farStatus === 'Verified',
      });
    } else {
      addFarRecord({
        category: 'ims-lms',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || (isMentor ? teacher.assignedSupervisorId : currentUser?.id || 'sup-principal'),
        supervisorName: resolvedSup?.fullName || (isMentor ? 'Assigned Instructional Supervisor' : currentUser?.fullName || 'Administrator'),
        mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : resolvedMentor?.id,
        mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : resolvedMentor?.fullName,
        evaluatorRole,
        term: farTerm,
        lessonPlanWeek: farLessonPlanWeek.trim() || 'IMs / LMs QA',
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

  const handlePrintImsTable = () => {
    printTableReportToPdf({
      title: "Instructional Materials (IMs) & Learners' Materials (LMs) QA Table",
      subtitle: 'DepEd Quality Assurance Criteria Checklist',
      schoolName: schoolProfile.schoolName,
      schoolId: schoolProfile.schoolId,
      address: schoolProfile.address,
      preparedBy: currentUser?.fullName || 'Instructional Supervisor',
      headers: [
        'Kind & Type',
        'Title',
        'Teacher & Evaluator',
        'Grade & Subject',
        'QA Criteria',
        'Status',
        'Date Submitted',
      ],
      rows: filteredIMs.map((im) => {
        const supName = resolveRecordSupervisorName(im, teachers, supervisors);
        const mentorName =
          im.mentorName ||
          (im.evaluatorRole === 'mentor'
            ? resolveRecordMentor(im, teachers, mentors)?.fullName
            : undefined);
        const evalText = mentorName
          ? `Mentor: ${mentorName}\nSupervisor: ${supName}`
          : `Supervisor: ${supName}`;
        return [
          `${im.materialKind === 'LM' ? 'LM · Learner Material' : 'IM · Instructional'}\n${im.type}`,
          im.title,
          `${im.teacherName}\n${evalText}`,
          im.gradeSubject,
          `${im.alignmentToMELC ? 'MELC Aligned' : 'MELC Pending'} · ${
            im.contentAccuracyVerified ? 'Accurate' : 'Accuracy Pending'
          } · ${im.copyrightCompliant ? 'Copyright OK' : 'Needs Citation'}`,
          im.status,
          im.dateSubmitted,
        ];
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
            <span>Instructional Quality Assurance</span>
            <span aria-hidden="true">·</span>
            <span>DepEd Standard IMs &amp; LMs QA</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Instructional Materials (IMs / LMs)
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            DepEd benchmark and quality assuring IMs &amp; LMs with auto-generated PMCF and FAR reports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenIMModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Submit IM for Review</span>
          </button>
          <button
            onClick={handleOpenLMModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#8B2635] hover:bg-[#701628] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Submit LM for Review</span>
          </button>
          {!isTeacher && (
            <>
              <button
                onClick={handleOpenAddPmcf}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>PMCF for IMs &amp; LMs</span>
              </button>
              <button
                onClick={handleOpenAddFar}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>FAR for IMs &amp; LMs</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Instructional Supervisor / Mentor / Teacher Scope Banner */}
      <SupervisionScopeBanner
        selectedSupervisorFilterId={selectedSupervisorFilterId}
        onChangeSupervisorFilterId={setSelectedSupervisorFilterId}
        currentUser={currentUser}
        teachers={teachers}
        supervisors={supervisors}
        mentors={mentors}
        moduleLabel="Instructional Materials (IMs / LMs), PMCF & FAR Tables"
      />

      {/* Tabs */}
      <div className="flex border-b border-stone-200 bg-white px-5 rounded-t-xl gap-6 text-xs font-bold overflow-x-auto">
        <div className="py-3 border-b-2 border-[#701628] text-[#701628] whitespace-nowrap">
          Instructional &amp; Learner Materials QA ({filteredIMs.length})
        </div>
      </div>

      {/* IMs Section */}
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search title, teacher, supervisor, or mentor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628]"
            />
          </div>
          <div className="text-xs text-stone-500 font-medium hidden sm:block">
            DepEd Quality Assurance Criteria Checklist
          </div>
        </div>

        {/* Instructional Materials (IMs Quality Assurance) Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Instructional Materials (IMs) &amp; Learners&apos; Materials (LMs) QA Table
              </h3>
              <p className="text-[11px] text-stone-500">
                Quality Assurance Checklist · MELC Alignment, Content Accuracy &amp; Copyright Compliance
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#701628]/10 text-[#701628]">
                {filteredIMs.length} {filteredIMs.length === 1 ? 'Record' : 'Records'}
              </span>
              <button
                type="button"
                onClick={handlePrintImsTable}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Print / Export IMs & LMs QA Table to PDF"
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
                  <th className="py-3 px-4">Kind &amp; Type</th>
                  <th className="py-3 px-4">Title &amp; Document Link</th>
                  <th className="py-3 px-4">Author / Teacher</th>
                  <th className="py-3 px-4">Grade &amp; Subject</th>
                  <th className="py-3 px-4">QA Checklist</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredIMs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-500">
                      No instructional or learner materials found.
                    </td>
                  </tr>
                ) : (
                  filteredIMs.map((im) => {
                    const mentorRec = resolveRecordMentor(im, teachers, mentors);
                    const mentorDisplayName = im.mentorName || (im.evaluatorRole === 'mentor' ? mentorRec?.fullName : undefined);
                    return (
                      <tr key={im.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider mb-1 ${
                              im.materialKind === 'LM'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {im.materialKind === 'LM' ? 'LM · Learner Material' : 'IM · Instructional'}
                          </span>
                          <div className="text-[11px] text-stone-500 font-medium">{im.type}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-stone-900">{im.title}</div>
                          {im.fileUrl ? (
                            <a
                              href={im.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#701628] hover:underline mt-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open Document Link</span>
                            </a>
                          ) : (
                            <div className="text-[11px] text-stone-400 italic mt-0.5 line-clamp-1">
                              {im.evaluatorNotes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-stone-800">{im.teacherName}</div>
                          <div className="text-[10px] text-[#701628] font-medium">
                            Supervisor: {resolveRecordSupervisorName(im, teachers, supervisors)}
                          </div>
                          {mentorDisplayName && (
                            <div className="text-[10px] text-violet-800 font-semibold">
                              Mentor: {mentorDisplayName}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-stone-700">{im.gradeSubject}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5 text-[10px]">
                            <div className={im.alignmentToMELC ? 'text-emerald-700 font-semibold' : 'text-rose-600'}>
                              {im.alignmentToMELC ? '✓ MELC Aligned' : '✗ MELC Unverified'}
                            </div>
                            <div className={im.contentAccuracyVerified ? 'text-emerald-700 font-semibold' : 'text-rose-600'}>
                              {im.contentAccuracyVerified ? '✓ Content Accurate' : '✗ Accuracy Pending'}
                            </div>
                            <div className={im.copyrightCompliant ? 'text-emerald-700 font-semibold' : 'text-rose-600'}>
                              {im.copyrightCompliant ? '✓ Copyright OK' : '⚠ Needs Citation'}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                              im.status === 'Approved for Use'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : im.status === 'Under Review'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {im.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">{im.dateSubmitted}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {!isTeacher && (
                              <button
                                onClick={() => openEditIMModal(im)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                title="Evaluate / Edit Instructional Material"
                              >
                                <Pencil className="w-3.5 h-3.5 text-stone-600" />
                                <span>Evaluate</span>
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => deleteIMQA(im.id)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete"
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

        {/* Detailed QA Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIMs.map((im) => {
            const mentorRec = resolveRecordMentor(im, teachers, mentors);
            const mentorDisplayName = im.mentorName || (im.evaluatorRole === 'mentor' ? mentorRec?.fullName : undefined);
            return (
              <div
                key={im.id}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                          im.materialKind === 'LM'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {im.materialKind === 'LM' ? 'LM · Learner Material' : 'IM · Instructional'}
                      </span>
                      <span className="text-[10px] font-bold bg-stone-50 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">
                        {im.type}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        im.status === 'Approved for Use'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : im.status === 'Under Review'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {im.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-stone-900 text-sm mb-1 leading-snug">{im.title}</h3>
                  <div className="text-xs text-stone-500 mb-1">
                    {im.gradeSubject} · Developed by {im.teacherName}
                  </div>
                  {mentorDisplayName && (
                    <div className="text-[11px] font-semibold text-violet-800 mb-2">
                      Evaluated by Mentor: {mentorDisplayName}
                    </div>
                  )}

                  {im.fileUrl && (
                    <div className="mb-3 mt-2">
                      <a
                        href={im.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#701628] hover:text-[#580e1c] bg-amber-50/70 hover:bg-amber-100/70 px-2.5 py-1 rounded-md border border-amber-200 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Document (Google Drive / Web Link)</span>
                      </a>
                    </div>
                  )}

                  <div className="space-y-1 text-[11px] bg-stone-50 p-2.5 rounded-lg border border-stone-100 text-stone-700">
                    <div className="flex items-center justify-between">
                      <span>MELC Alignment:</span>
                      <span className={im.alignmentToMELC ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'}>
                        {im.alignmentToMELC ? '✓ Verified' : '✗ Unverified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Content Accuracy:</span>
                      <span className={im.contentAccuracyVerified ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'}>
                        {im.contentAccuracyVerified ? '✓ Verified' : '✗ Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Copyright Compliant:</span>
                      <span className={im.copyrightCompliant ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'}>
                        {im.copyrightCompliant ? '✓ Compliant' : '⚠ Requires Citation'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-600 mt-3 italic">
                    "{im.evaluatorNotes}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span>Submitted: {im.dateSubmitted}</span>
                  <div className="flex items-center gap-2">
                    {!isTeacher && (
                      <button
                        onClick={() => openEditIMModal(im)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-bold transition-colors cursor-pointer"
                        title="Edit Instructional Material"
                      >
                        <Pencil className="w-3 h-3 text-stone-600" />
                        <span>Evaluate</span>
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => deleteIMQA(im.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table: PMCF for IMs & LMs Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                PMCF for IMs &amp; LMs Table
              </h3>
              <p className="text-[11px] text-stone-500">
                Performance Monitoring and Coaching Form (PMCF) · Auto-Generated &amp; Logged Coaching for Instructional &amp; Learner Materials
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
                title="Export PMCF for IMs & LMs Table to PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-300" />
                <span>Print to PDF</span>
              </button>
              {!isTeacher && (
                <button
                  type="button"
                  onClick={handleOpenAddPmcf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add PMCF</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">PMCF Record</th>
                  <th className="py-3 px-4">Date &amp; Term</th>
                  <th className="py-3 px-4">Teacher &amp; Evaluator</th>
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
                      No PMCF for IMs &amp; LMs records found. Evaluating or logging an IM / LM QA record automatically generates its PMCF entry.
                    </td>
                  </tr>
                ) : (
                  filteredPmcfRecords.map((r) => {
                    const mentorRec = resolveRecordMentor(r, teachers, mentors);
                    const mentorDisplayName = r.mentorName || (r.evaluatorRole === 'mentor' ? mentorRec?.fullName : undefined);
                    return (
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
                            Supervisor: {resolveRecordSupervisorName(r, teachers, supervisors)}
                          </div>
                          {mentorDisplayName && (
                            <div className="text-[10px] font-semibold text-violet-800 mt-0.5">
                              Mentor: {mentorDisplayName}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table: FAR for IMs & LMs Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-amber-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                FAR for IMs &amp; LMs Table
              </h3>
              <p className="text-[11px] text-stone-600">
                Findings, Analysis and Recommendations (FAR) · Instructional &amp; Learner Materials QA Reports
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
                title="Export FAR for IMs & LMs Table to PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-300" />
                <span>Print to PDF</span>
              </button>
              {!isTeacher && (
                <button
                  type="button"
                  onClick={handleOpenAddFar}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add FAR</span>
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
                      No FAR for IMs &amp; LMs records found.
                    </td>
                  </tr>
                ) : (
                  filteredFarRecords.map((r) => {
                    const isVerified = r.status === 'Verified' || r.actionTaken;
                    const mentorRec = resolveRecordMentor(r, teachers, mentors);
                    const mentorDisplayName = r.mentorName || (r.evaluatorRole === 'mentor' ? mentorRec?.fullName : undefined);
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
                          {mentorDisplayName && (
                            <div className="text-[10px] font-semibold text-violet-800 mt-0.5">
                              Mentor: {mentorDisplayName}
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
                                title="Edit FAR for IMs & LMs"
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
      </div>

      {/* Edit IM / LM Modal */}
      {editingIM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Evaluate / Edit Instructional &amp; Learner Material QA</h3>
                <p className="text-[11px] text-amber-200">Update material details, Google Drive link, and QA status</p>
              </div>
              <button onClick={() => setEditingIM(null)} className="p-1 rounded-lg text-amber-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateIM} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Material Title</label>
                <input
                  type="text"
                  required
                  value={editImTitle}
                  onChange={(e) => setEditImTitle(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Material Category</label>
                  <select
                    value={editImKind}
                    onChange={(e) => setEditImKind(e.target.value as 'IM' | 'LM')}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="IM">IM · Instructional Material</option>
                    <option value="LM">LM · Learner's Material</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Material Type</label>
                  <select
                    value={editImType}
                    onChange={(e) => setEditImType(e.target.value as InstructionalMaterialQA['type'])}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Learner Activity Sheet (LAS)">Learner Activity Sheet (LAS)</option>
                    <option value="Self-Learning Module (SLM)">Self-Learning Module (SLM)</option>
                    <option value="Localized / Contextualized IM">Localized / Contextualized IM</option>
                    <option value="Digitized Slide / Video">Digitized Slide / Video</option>
                    <option value="Manipulative / Kit">Manipulative / Kit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grade &amp; Subject</label>
                  <input
                    type="text"
                    required
                    value={editImGradeSubject}
                    onChange={(e) => setEditImGradeSubject(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">QA Status</label>
                  <select
                    value={editImStatus}
                    onChange={(e) => setEditImStatus(e.target.value as InstructionalMaterialQA['status'])}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-semibold"
                  >
                    <option value="Approved for Use">Approved for Use</option>
                    <option value="Under Review">Under Review</option>
                    <option value="For Revision">For Revision</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Author / Teacher</label>
                <select
                  value={editImTeacherId}
                  onChange={(e) => setEditImTeacherId(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                >
                  {scopedTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                <div className="font-bold text-stone-700">DepEd QA Verification Checklist</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editImMelc}
                      onChange={(e) => setEditImMelc(e.target.checked)}
                      className="rounded border-stone-300 text-[#701628] focus:ring-[#701628]"
                    />
                    <span>MELC Alignment Verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editImAccuracy}
                      onChange={(e) => setEditImAccuracy(e.target.checked)}
                      className="rounded border-stone-300 text-[#701628] focus:ring-[#701628]"
                    />
                    <span>Content Accuracy Verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editImCopyright}
                      onChange={(e) => setEditImCopyright(e.target.checked)}
                      className="rounded border-stone-300 text-[#701628] focus:ring-[#701628]"
                    />
                    <span>Copyright Compliant</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editImVisual}
                      onChange={(e) => setEditImVisual(e.target.checked)}
                      className="rounded border-stone-300 text-[#701628] focus:ring-[#701628]"
                    />
                    <span>Visual Clarity &amp; Layout</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Evaluator Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={editImEvaluatorNotes}
                  onChange={(e) => setEditImEvaluatorNotes(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                <label className="block font-bold text-stone-800 mb-1">
                  Google Drive Link or Valid Web Link
                </label>
                <input
                  type="url"
                  value={editImFileUrl}
                  onChange={(e) => setEditImFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or https://..."
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingIM(null)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Save QA Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IM Submission Modal */}
      {isIMModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Submit Instructional Material (IM) for QA</h3>
                <p className="text-[11px] text-amber-200">Teacher's Instructional Resource &amp; Supplementary Aid</p>
              </div>
              <button onClick={() => setIsIMModalOpen(false)} className="p-1 rounded-lg text-amber-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIM} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Title of Instructional Material</label>
                <input
                  type="text"
                  required
                  value={imTitle}
                  onChange={(e) => setImTitle(e.target.value)}
                  placeholder="e.g. Contextualized Learning Activity Sheet on Quadratic Functions"
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Material Type</label>
                  <select
                    value={imType}
                    onChange={(e) => setImType(e.target.value as InstructionalMaterialQA['type'])}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Learner Activity Sheet (LAS)">Learner Activity Sheet (LAS)</option>
                    <option value="Self-Learning Module (SLM)">Self-Learning Module (SLM)</option>
                    <option value="Localized / Contextualized IM">Localized / Contextualized IM</option>
                    <option value="Digitized Slide / Video">Digitized Slide / Video</option>
                    <option value="Manipulative / Kit">Manipulative / Kit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grade &amp; Subject</label>
                  <input
                    type="text"
                    required
                    value={imGradeSubject}
                    onChange={(e) => setImGradeSubject(e.target.value)}
                    placeholder="e.g. Science 9 or Math 8"
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Author / Teacher</label>
                <select
                  value={imTeacherId}
                  onChange={(e) => setImTeacherId(e.target.value)}
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

              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                <label className="block font-bold text-stone-800 mb-1">
                  Upload Data through Google Drive Link or Any Valid Web Link
                </label>
                <input
                  type="url"
                  value={imFileUrl}
                  onChange={(e) => setImFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or https://..."
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white font-mono text-[11px]"
                />
                <p className="text-[10px] text-amber-900 mt-1">
                  * Note: Ensure the linked file is shared with viewing permissions (e.g. <em>"Anyone with the link can view"</em>).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsIMModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Submit IM for Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LM Submission Modal */}
      {isLMModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#8B2635] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Submit Learner's Material (LM) for QA</h3>
                <p className="text-[11px] text-amber-200">Student Learning Resource &amp; Modular Material</p>
              </div>
              <button onClick={() => setIsLMModalOpen(false)} className="p-1 rounded-lg text-amber-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLM} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Title of Learner's Material (LM)</label>
                <input
                  type="text"
                  required
                  value={lmTitle}
                  onChange={(e) => setLmTitle(e.target.value)}
                  placeholder="e.g. Self-Learning Module on Ecosystems & Biodiversity"
                  className="w-full border border-stone-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Material Type</label>
                  <select
                    value={lmType}
                    onChange={(e) => setLmType(e.target.value as InstructionalMaterialQA['type'])}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Self-Learning Module (SLM)">Self-Learning Module (SLM)</option>
                    <option value="Learner Activity Sheet (LAS)">Learner Activity Sheet (LAS)</option>
                    <option value="Localized / Contextualized IM">Localized / Contextualized LM</option>
                    <option value="Digitized Slide / Video">Digitized Slide / Video</option>
                    <option value="Manipulative / Kit">Manipulative / Kit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grade &amp; Subject</label>
                  <input
                    type="text"
                    required
                    value={lmGradeSubject}
                    onChange={(e) => setLmGradeSubject(e.target.value)}
                    placeholder="e.g. Mathematics 10 or English 7"
                    className="w-full border border-stone-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Author / Teacher</label>
                <select
                  value={lmTeacherId}
                  onChange={(e) => setLmTeacherId(e.target.value)}
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

              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                <label className="block font-bold text-stone-800 mb-1">
                  Upload Data through Google Drive Link or Any Valid Web Link
                </label>
                <input
                  type="url"
                  value={lmFileUrl}
                  onChange={(e) => setLmFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or https://..."
                  className="w-full border border-stone-300 rounded-lg p-2 bg-white font-mono text-[11px]"
                />
                <p className="text-[10px] text-amber-900 mt-1">
                  * Note: Ensure the linked file is shared with viewing permissions (e.g. <em>"Anyone with the link can view"</em>).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsLMModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8B2635] hover:bg-[#701628] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Submit LM for Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: PMCF for IMs & LMs */}
      {isPmcfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingPmcf
                    ? `Edit PMCF for IMs & LMs (${editingPmcf.recordNo})`
                    : 'PMCF for IMs & LMs'}
                </h3>
                <p className="text-[11px] text-amber-200">
                  DepEd PMES Form 3 · Coaching Intervention for Instructional &amp; Learner Materials
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPmcfModalOpen(false);
                  setEditingPmcf(null);
                }}
                className="p-1 rounded-lg text-amber-200 hover:text-white cursor-pointer"
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
                    onChange={(e) => setPmcfCoachingMechanism(e.target.value as PMCFRecord['coachingMechanism'])}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  >
                    <option value="IMs & LMs">IMs &amp; LMs</option>
                    <option value="Individual Conference">Individual Conference</option>
                    <option value="LAC Session">LAC Session</option>
                    <option value="Peer Mentoring">Peer Mentoring</option>
                    <option value="Written Feedback">Written Feedback</option>
                  </select>
                </div>

                {editingPmcf && (
                  <div className="col-span-2">
                    <label className="block font-bold text-stone-700 mb-1">Status</label>
                    <select
                      value={pmcfStatus}
                      onChange={(e) => setPmcfStatus(e.target.value as PMCFRecord['status'])}
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
                  placeholder="Describe IM/LM QA review observations, alignment gaps, or strengths..."
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
                  placeholder="Actionable revisions, citation updates, or contextualization steps..."
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
                  placeholder="Expected improvement in learner material quality and classroom engagement..."
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
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
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

      {/* Modal: FAR for IMs & LMs */}
      {isFarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingFar
                    ? `Edit FAR for IMs & LMs (${editingFar.farCode})`
                    : 'FAR for IMs & LMs'}
                </h3>
                <p className="text-[11px] text-amber-200">
                  Findings, Analysis and Recommendations · Instructional &amp; Learner Materials QA
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFarModalOpen(false);
                  setEditingFar(null);
                }}
                className="p-1 rounded-lg text-amber-200 hover:text-white cursor-pointer"
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
                  {scopedTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.department} · {t.position} - {t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Term <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={farTerm}
                    onChange={(e) => setFarTerm(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Material Reference / Week <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={farLessonPlanWeek}
                    onChange={(e) => setFarLessonPlanWeek(e.target.value)}
                    placeholder="e.g. IMs / LMs QA or Week 4"
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white"
                  />
                </div>
              </div>

              {editingFar && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Status</label>
                  <select
                    value={farStatus}
                    onChange={(e) => setFarStatus(e.target.value as 'In Progress' | 'Verified')}
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
                  placeholder="Findings on MELC alignment, content accuracy, copyright compliance..."
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
                  placeholder="Analysis of instructional usability and learner accessibility..."
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
                  placeholder="Recommendations for material revision, validation, or deployment..."
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
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingFar ? 'Update FAR Record' : 'Save FAR Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
