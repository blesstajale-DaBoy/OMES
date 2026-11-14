import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { LessonPlanCheck, PMCFRecord, FarRecord, getPmcfCategory, getFarCategory } from '../types';
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
  initGoogleDriveAuth,
  googleDriveSignIn,
  getGoogleDriveAccessToken,
  googleDriveLogout,
  uploadFileToGoogleDrive,
  readFileAsDataUrl,
} from '../lib/firebase';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Search,
  Check,
  X,
  MessageSquare,
  FileCheck,
  ExternalLink,
  FolderOpen,
  Link as LinkIcon,
  Eye,
  Building2,
  UserCheck,
  Pencil,
  Edit2,
  FileDown,
  Printer,
  Trash2,
  Upload,
  Loader2,
  FileText,
} from 'lucide-react';

export const LessonPlanCheckView: React.FC = () => {
  const {
    lessonPlans,
    teachers,
    supervisors,
    mentors,
    addLessonPlan,
    updateLessonPlan,
    deleteLessonPlan,
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
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSupervisorFilterId, setSelectedSupervisorFilterId] = useState('All');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlanCheck | null>(null);
  const [planToDelete, setPlanToDelete] = useState<LessonPlanCheck | null>(null);
  const [activeReviewPlan, setActiveReviewPlan] = useState<LessonPlanCheck | null>(null);

  const scopedTeachers = getScopedTeachersForModal(currentUser, teachers, supervisors, mentors);
  const activeMentor = resolveActiveMentorForUser(currentUser, teachers, mentors);

  // New / Edit submission state
  const [teacherId, setTeacherId] = useState(scopedTeachers[0]?.id || teachers[0]?.id || '');
  const [supervisorId, setSupervisorId] = useState(supervisors[0]?.id || '');
  const [subjectGrade, setSubjectGrade] = useState('Science 9');
  const [lessonTitle, setLessonTitle] = useState('');
  const [weekNumber, setWeekNumber] = useState<number | string>(9);
  const [quarterTerm, setQuarterTerm] = useState<'Term 1' | 'Term 2' | 'Term 3' | 'CO1' | 'CO2' | 'CO3' | string>('Term 1');
  const [driveUrl, setDriveUrl] = useState('');

  const formatWeekOrCo = (val: number | string) =>
    String(val).toUpperCase().startsWith('CO') ? String(val) : `Week ${val}`;
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [driveFileId, setDriveFileId] = useState('');
  const [uploadedFileDataUrl, setUploadedFileDataUrl] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState<number | undefined>(undefined);

  // Google Drive OAuth & Upload states
  const [driveNeedsAuth, setDriveNeedsAuth] = useState(true);
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [isSigningInDrive, setIsSigningInDrive] = useState(false);
  const [oauthUnverifiedNotice, setOauthUnverifiedNotice] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = initGoogleDriveAuth(
      (user) => {
        setDriveNeedsAuth(false);
        setOauthUnverifiedNotice(false);
        setDriveUserEmail(user.email || user.displayName || 'Connected Google Account');
      },
      () => {
        setDriveNeedsAuth(true);
        setDriveUserEmail(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Review modal checklist state
  const [reviewChecklist, setReviewChecklist] = useState({
    melcAligned: true,
    clearObjectives: true,
    learningResourcesAdequate: true,
    pedagogicalProceduresSequenced: true,
    formativeAssessmentIncluded: true,
    reflectionCompleted: true,
  });
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Needs Revision'>('Approved');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewDriveUrl, setReviewDriveUrl] = useState('');

  // PMCF for Lesson Plan Modal & Print State
  const [isPmcfModalOpen, setIsPmcfModalOpen] = useState(false);
  const [editingPmcf, setEditingPmcf] = useState<PMCFRecord | null>(null);
  const [pmcfTeacherId, setPmcfTeacherId] = useState(teachers[0]?.id || '');
  const [pmcfQuarterTerm, setPmcfQuarterTerm] = useState('Term 1');
  const [pmcfCoachingMechanism, setPmcfCoachingMechanism] =
    useState<PMCFRecord['coachingMechanism']>('Lesson Plan');
  const [pmcfCriticalIncidentDescription, setPmcfCriticalIncidentDescription] = useState('');
  const [pmcfActionPlanOutput, setPmcfActionPlanOutput] = useState('');
  const [pmcfImpactOnJobPerformance, setPmcfImpactOnJobPerformance] = useState('');
  const [pmcfStatus, setPmcfStatus] = useState<PMCFRecord['status']>('In Progress');
  const [isPrintPmcfModalOpen, setIsPrintPmcfModalOpen] = useState(false);
  const [selectedPmcfRecordIdForPrint, setSelectedPmcfRecordIdForPrint] = useState<string | null>(
    null
  );

  // FAR for Lesson Plan Modal & Print State
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

  // Resolve selected teacher in submission modal
  const selectedTeacher = isTeacher
    ? teachers.find((t) => t.fullName === currentUser?.fullName) || scopedTeachers[0] || teachers[0]
    : scopedTeachers.find((t) => t.id === teacherId) || teachers.find((t) => t.id === teacherId) || scopedTeachers[0] || teachers[0];

  // Resolve selected supervisor from option box (with fallback to teacher's assigned supervisor)
  const assignedSupervisor =
    supervisors.find((s) => s.id === supervisorId) ||
    (selectedTeacher
      ? supervisors.find((s) => s.id === selectedTeacher.assignedSupervisorId) || supervisors[0]
      : supervisors[0]);

  const scopedLessonPlans = lessonPlans.filter((lp) =>
    matchesRoleSupervisionScope(
      lp,
      currentUser,
      teachers,
      supervisors,
      selectedSupervisorFilterId,
      mentors
    )
  );

  const filteredPlans = scopedLessonPlans.filter((lp) => {
    const supName = resolveRecordSupervisorName(lp, teachers, supervisors);
    const mentorRec = resolveRecordMentor(lp, teachers, mentors);
    const matchesSearch =
      lp.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lp.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lp.subjectGrade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lp.supervisorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lp.mentorName || mentorRec?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || lp.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const q = searchQuery.toLowerCase().trim();

  // Filtered PMCF for Lesson Plan records
  const filteredPmcfRecords = pmcfRecords.filter((r) => {
    if (getPmcfCategory(r) !== 'lesson-plan') return false;
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
      r.supervisorName.toLowerCase().includes(q) ||
      supName.toLowerCase().includes(q) ||
      (r.mentorName || mentorRec?.fullName || '').toLowerCase().includes(q)
    );
  });

  // Filtered FAR for Lesson Plan records
  const filteredFarRecords = farRecords.filter((r) => {
    if (getFarCategory(r) !== 'lesson-plan') return false;
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

  const handleOpenAddPmcf = () => {
    setEditingPmcf(null);
    setPmcfTeacherId(scopedTeachers[0]?.id || teachers[0]?.id || '');
    setPmcfQuarterTerm('Term 1');
    setPmcfCoachingMechanism('Lesson Plan');
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
        category: 'lesson-plan',
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
          pmcfImpactOnJobPerformance || 'Pending post-coaching assessment evaluation.',
        status: pmcfStatus,
      });
    } else {
      addPMCFRecord({
        category: 'lesson-plan',
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
        category: 'lesson-plan',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || editingFar.supervisorId,
        supervisorName: resolvedSup?.fullName || editingFar.supervisorName,
        mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : (editingFar.mentorId || resolvedMentor?.id),
        mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : (editingFar.mentorName || resolvedMentor?.fullName),
        evaluatorRole: editingFar.evaluatorRole || evaluatorRole,
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
        category: 'lesson-plan',
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        supervisorId: resolvedSup?.id || (isMentor ? teacher.assignedSupervisorId : currentUser?.id || 'sup-principal'),
        supervisorName: resolvedSup?.fullName || (isMentor ? 'Assigned Instructional Supervisor' : currentUser?.fullName || 'Administrator'),
        mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : resolvedMentor?.id,
        mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : resolvedMentor?.fullName,
        evaluatorRole,
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

  const handleOpenReview = (plan: LessonPlanCheck) => {
    setActiveReviewPlan(plan);
    setReviewChecklist({ ...plan.checklist });
    setReviewStatus(plan.status === 'Needs Revision' ? 'Needs Revision' : 'Approved');
    setReviewRemarks(plan.remarks);
    setReviewFeedback(plan.supervisorFeedback);
    setReviewDriveUrl(plan.driveUrl || '');
  };

  const handleSaveReview = () => {
    if (!activeReviewPlan) return;
    const resolvedSup =
      resolveActiveSupervisorForUser(currentUser, teachers, supervisors) ||
      resolveRecordSupervisor(activeReviewPlan, teachers, supervisors);
    const resolvedMentor =
      activeMentor ||
      resolveRecordMentor(activeReviewPlan, teachers, mentors);
    updateLessonPlan(activeReviewPlan.id, {
      checklist: reviewChecklist,
      status: reviewStatus,
      remarks: reviewRemarks || (reviewStatus === 'Approved' ? 'Complied with DepEd Order 42 standards.' : 'Needs completion.'),
      supervisorFeedback: reviewFeedback || 'Inspection completed.',
      dateChecked: new Date().toISOString().slice(0, 10),
      supervisorId: isMentor ? (resolvedSup?.id || activeReviewPlan.supervisorId) : (currentUser?.id || activeReviewPlan.supervisorId),
      supervisorName: isMentor ? (resolvedSup?.fullName || activeReviewPlan.supervisorName) : (currentUser?.fullName || activeReviewPlan.supervisorName),
      mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : activeReviewPlan.mentorId,
      mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : activeReviewPlan.mentorName,
      evaluatorRole: isMentor ? 'mentor' : isSupervisor ? 'supervisor' : 'admin',
      driveUrl: reviewDriveUrl || activeReviewPlan.driveUrl,
    });
    setActiveReviewPlan(null);
  };

  const handleGoogleSignIn = async (forceConsent = false): Promise<string | null> => {
    setIsSigningInDrive(true);
    setUploadError(null);
    try {
      const result = await googleDriveSignIn(forceConsent);
      if (result && result.accessToken) {
        setDriveNeedsAuth(false);
        setOauthUnverifiedNotice(false);
        setDriveUserEmail(result.user.email || result.user.displayName || 'Connected Google Account');
        return result.accessToken;
      }
      setOauthUnverifiedNotice(true);
      return null;
    } catch {
      setOauthUnverifiedNotice(true);
      return null;
    } finally {
      setIsSigningInDrive(false);
    }
  };

  const executeFileUploadToDrive = async (fileToUpload: File, customDriveLink?: string) => {
    setUploadError(null);
    setUploadSuccessMsg(null);
    setIsUploadingToDrive(true);

    const destinationDriveUrl =
      (customDriveLink ?? driveUrl).trim() ||
      assignedSupervisor?.driveUrl ||
      '';

    try {
      // 1. Obtain Google Drive OAuth token FIRST (before any other async work so browser popup activation is preserved)
      let token = await getGoogleDriveAccessToken();
      if (!token) {
        token = await handleGoogleSignIn(false);
      }

      if (!token) {
        setSelectedFile(fileToUpload);
        setUploadError(
          `Sign in with Google is required to save "${fileToUpload.name}" into your Google Drive folder. Click "Sign in & Save to Google Drive" below.`
        );
        return;
      }

      // 2. Read file into data URL for in-app preview/download (capped at 650 KB for Firestore sync safety)
      let dataUrl = '';
      if (fileToUpload.size <= 650 * 1024) {
        try {
          dataUrl = await readFileAsDataUrl(fileToUpload);
        } catch {
          dataUrl = '';
        }
      }

      // 3. Upload file directly to the specified Google Drive folder via Drive API v3
      const teacherNameForDesc = selectedTeacher?.fullName || currentUser?.fullName || '';
      const uploadOptions = {
        accessToken: token,
        folderUrl: destinationDriveUrl,
        description: `BNHS Weekly Lesson Plan (DLL/DLP) - ${teacherNameForDesc} - ${subjectGrade} - ${formatWeekOrCo(weekNumber)} (${quarterTerm})`,
      };

      let result;
      try {
        result = await uploadFileToGoogleDrive(fileToUpload, uploadOptions);
      } catch (err: any) {
        if (err?.message === 'INSUFFICIENT_SCOPE' || err?.message === 'AUTH_REQUIRED') {
          const refreshedToken = await handleGoogleSignIn(true);
          if (!refreshedToken) {
            setSelectedFile(fileToUpload);
            setUploadError(
              'Please grant Google Drive folder permission in the Google sign-in window to save files to this folder link.'
            );
            return;
          }
          result = await uploadFileToGoogleDrive(fileToUpload, {
            ...uploadOptions,
            accessToken: refreshedToken,
          });
        } else {
          throw err;
        }
      }

      // Update driveUrl: if a real folder ID was used, keep the user's folder link (or canonical folder link);
      // if it was empty or a demo placeholder, set driveUrl to the real uploaded file's Google Drive link
      if (result.folderId) {
        setDriveUrl(destinationDriveUrl || result.folderWebViewLink || result.webViewLink);
      } else {
        setDriveUrl(result.webViewLink);
      }

      setUploadedFileName(result.fileName);
      setDriveFileId(result.fileId);
      setUploadedFileDataUrl(dataUrl);
      setUploadedFileSize(fileToUpload.size);
      setSelectedFile(null);
      setPendingReplaceFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadSuccessMsg(
        result.folderId
          ? `Successfully uploaded and saved "${result.fileName}" directly inside your Google Drive folder!`
          : `Successfully uploaded and saved "${result.fileName}" to your Google Drive!`
      );
    } catch (err: any) {
      setSelectedFile(fileToUpload);
      setUploadError(err?.message || 'Failed to upload file to Google Drive.');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadError(null);
    setUploadSuccessMsg(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (uploadedFileName) {
      // Require explicit user confirmation before replacing an already uploaded file
      setPendingReplaceFile(file);
      setSelectedFile(null);
    } else {
      // Automatically upload and save the file to the Google Drive link as soon as it is selected
      setSelectedFile(file);
      void executeFileUploadToDrive(file, driveUrl);
    }
  };

  const handleOpenSubmitModal = () => {
    setEditingPlan(null);
    const initialTeacher = isTeacher
      ? teachers.find((t) => t.fullName === currentUser?.fullName) || scopedTeachers[0] || teachers[0]
      : scopedTeachers[0] || teachers[0];

    if (initialTeacher) {
      setTeacherId(initialTeacher.id);
      if (initialTeacher.subject) {
        setSubjectGrade(`${initialTeacher.subject} (${initialTeacher.gradeLevels[0] || 'Grade 9'})`);
      }
    }

    const sup = initialTeacher
      ? supervisors.find((s) => s.id === initialTeacher.assignedSupervisorId) || supervisors[0]
      : supervisors[0];

    setSupervisorId(sup?.id || '');
    setWeekNumber(9);
    setQuarterTerm('Term 1');
    setDriveUrl(sup?.driveUrl || '');
    setUploadedFileName('');
    setDriveFileId('');
    setUploadedFileDataUrl('');
    setUploadedFileSize(undefined);
    setSelectedFile(null);
    setPendingReplaceFile(null);
    setUploadError(null);
    setUploadSuccessMsg(null);
    setOauthUnverifiedNotice(false);
    setLessonTitle('');
    setIsSubmitModalOpen(true);
  };

  const handleOpenEditModal = (plan: LessonPlanCheck) => {
    setEditingPlan(plan);
    setTeacherId(plan.teacherId);
    const existingSup =
      supervisors.find((s) => s.id === plan.supervisorId) ||
      supervisors.find((s) => s.fullName === plan.supervisorName) ||
      supervisors[0];
    setSupervisorId(existingSup?.id || plan.supervisorId || '');
    setSubjectGrade(plan.subjectGrade);
    setLessonTitle(plan.lessonTitle);
    setWeekNumber(plan.weekNumber);
    setQuarterTerm(plan.quarterTerm);
    setDriveUrl(plan.driveUrl || '');
    setUploadedFileName(plan.uploadedFileName || '');
    setDriveFileId(plan.driveFileId || '');
    setUploadedFileDataUrl(plan.uploadedFileDataUrl || '');
    setUploadedFileSize(plan.uploadedFileSize);
    setSelectedFile(null);
    setPendingReplaceFile(null);
    setUploadError(null);
    setUploadSuccessMsg(null);
    setOauthUnverifiedNotice(false);
    setIsSubmitModalOpen(true);
  };

  const handleSubmitNewPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = isTeacher
      ? teachers.find((t) => t.fullName === currentUser?.fullName) || scopedTeachers[0] || teachers[0]
      : scopedTeachers.find((t) => t.id === teacherId) || teachers.find((t) => t.id === teacherId) || scopedTeachers[0] || teachers[0];
    if (!teacher) return;

    const targetSupervisor =
      supervisors.find((s) => s.id === supervisorId) ||
      supervisors.find((s) => s.id === teacher.assignedSupervisorId) ||
      supervisors[0];

    const resolvedMentor =
      activeMentor ||
      resolveRecordMentor({ teacherId: teacher.id, teacherName: teacher.fullName }, teachers, mentors);

    if (editingPlan) {
      updateLessonPlan(editingPlan.id, {
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        department: teacher.department,
        supervisorId: targetSupervisor ? targetSupervisor.id : teacher.assignedSupervisorId,
        supervisorName: targetSupervisor ? targetSupervisor.fullName : 'Assigned Instructional Supervisor',
        mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : (editingPlan.mentorId || resolvedMentor?.id),
        mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : (editingPlan.mentorName || resolvedMentor?.fullName),
        evaluatorRole: isMentor ? 'mentor' : editingPlan.evaluatorRole,
        weekNumber,
        quarterTerm,
        subjectGrade,
        lessonTitle: lessonTitle || 'Lesson Plan Unit',
        driveUrl:
          driveUrl.trim() ||
          targetSupervisor?.driveUrl ||
          'https://drive.google.com/drive/folders/1bnhs-sup-santos-dll-archive',
        uploadedFileName: uploadedFileName || undefined,
        driveFileId: driveFileId || undefined,
        uploadedFileDataUrl: uploadedFileDataUrl || undefined,
        uploadedFileSize: uploadedFileSize || undefined,
      });
    } else {
      addLessonPlan({
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        department: teacher.department,
        supervisorId: targetSupervisor ? targetSupervisor.id : teacher.assignedSupervisorId,
        supervisorName: targetSupervisor ? targetSupervisor.fullName : 'Assigned Instructional Supervisor',
        mentorId: isMentor ? (resolvedMentor?.id || currentUser?.mentorId || currentUser?.id) : resolvedMentor?.id,
        mentorName: isMentor ? (resolvedMentor?.fullName || currentUser?.fullName) : resolvedMentor?.fullName,
        evaluatorRole: isMentor ? 'mentor' : isSupervisor ? 'supervisor' : undefined,
        dateSubmitted: new Date().toISOString().slice(0, 10),
        dateChecked: 'Pending',
        weekNumber,
        quarterTerm,
        subjectGrade,
        lessonTitle: lessonTitle || 'Lesson Plan Unit',
        driveUrl:
          driveUrl.trim() ||
          targetSupervisor?.driveUrl ||
          'https://drive.google.com/drive/folders/1bnhs-sup-santos-dll-archive',
        uploadedFileName: uploadedFileName || undefined,
        driveFileId: driveFileId || undefined,
        uploadedFileDataUrl: uploadedFileDataUrl || undefined,
        uploadedFileSize: uploadedFileSize || undefined,
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
    }

    setIsSubmitModalOpen(false);
    setEditingPlan(null);
    setLessonTitle('');
    setDriveUrl('');
    setUploadedFileName('');
    setDriveFileId('');
    setUploadedFileDataUrl('');
    setUploadedFileSize(undefined);
    setSelectedFile(null);
    setPendingReplaceFile(null);
  };

  const handlePrintLessonPlansTable = () => {
    printTableReportToPdf({
      title: 'Daily Lesson Log (DLL) & Detailed Lesson Plan Verification Table',
      subtitle: `DepEd Order No. 42, s. 2016 · Status Filter: ${selectedStatus}`,
      schoolName: schoolProfile.schoolName,
      schoolId: schoolProfile.schoolId,
      address: schoolProfile.address,
      preparedBy: currentUser?.fullName || 'Instructional Supervisor',
      headers: [
        'Code / Week',
        'Teacher',
        'Subject & Lesson Topic',
        'Supervisor / Mentor',
        'Submitted / Checked',
        'Status',
        'Remarks & Feedback',
      ],
      rows: filteredPlans.map((lp) => {
        const supName = resolveRecordSupervisorName(lp, teachers, supervisors);
        const mentorName =
          lp.mentorName || resolveRecordMentor(lp, teachers, mentors)?.fullName;
        const evaluatorText =
          lp.evaluatorRole === 'mentor' && mentorName
            ? `Mentor: ${mentorName}\nSupervisor: ${supName}`
            : `Supervisor: ${supName}${mentorName ? `\nMentor: ${mentorName}` : ''}`;
        return [
          `${lp.checkCode || 'DLL'}\n${formatWeekOrCo(lp.weekNumber)} (${lp.quarterTerm})`,
          `${lp.teacherName}\n${lp.department}`,
          `${lp.subjectGrade}\n${lp.lessonTitle}`,
          evaluatorText,
          `Submitted: ${lp.dateSubmitted}\nChecked: ${lp.dateChecked}`,
          lp.status,
          `${lp.remarks || '—'}\n${lp.supervisorFeedback || ''}`.trim(),
        ];
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
            <span>DepEd Order No. 42, s. 2016</span>
            <span aria-hidden="true">·</span>
            <span>Policy Guidelines on Daily Lesson Preparation</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">
            Daily Lesson Log (DLL) & Detailed Lesson Plan (DLP) Verification
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Weekly supervisory checking of curriculum alignment, pedagogical sequencing, and formative reflection with direct Google Drive repository access
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={handleOpenSubmitModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>{isTeacher ? 'Submit DLL for Checking' : 'Submit / Log Weekly Lesson Plan'}</span>
          </button>
          {!isTeacher && (
            <>
              <button
                onClick={handleOpenAddPmcf}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>PMCF for Lesson Plan</span>
              </button>
              <button
                onClick={handleOpenAddFar}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>FAR for Lesson Plan</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Instructional Supervisor Output Scope Banner / Filter */}
      <SupervisionScopeBanner
        selectedSupervisorFilterId={selectedSupervisorFilterId}
        onChangeSupervisorFilterId={setSelectedSupervisorFilterId}
        currentUser={currentUser}
        teachers={teachers}
        supervisors={supervisors}
        mentors={mentors}
        moduleLabel="Daily Lesson Log (DLL), PMCF & FAR for Lesson Plan Tables"
      />

      {/* Filter and Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search teacher, week, topic, or supervisor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#701628]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">Filter Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-stone-300 rounded-lg px-3 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#701628] font-medium"
          >
            <option value="All">All Statuses ({scopedLessonPlans.length})</option>
            <option value="Approved">Approved</option>
            <option value="Needs Revision">Needs Revision</option>
            <option value="Pending Inspection">Pending Inspection</option>
          </select>
        </div>
      </div>

      {/* Lesson Plans Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Daily Lesson Log (DLL) &amp; Detailed Lesson Plan Table
            </h3>
            <p className="text-[11px] text-stone-500">
              Weekly Lesson Plan Checking · Aligned with ILAW &amp; DepEd Order No. 42, s. 2016
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#701628]/10 text-[#701628]">
              {filteredPlans.length} {filteredPlans.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              onClick={handlePrintLessonPlansTable}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Print / Export Daily Lesson Log Table to PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print to PDF</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Code / Week</th>
                <th className="py-3.5 px-4">Teacher</th>
                <th className="py-3.5 px-4">Subject & Topic</th>
                <th className="py-3.5 px-4">Assigned Supervisor & Drive</th>
                <th className="py-3.5 px-4">Submitted / Checked</th>
                <th className="py-3.5 px-4 text-center">DepEd Checklist</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-500">
                    No lesson plan checking records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((lp) => {
                  const checkCount = [
                    lp.checklist.melcAligned,
                    lp.checklist.clearObjectives,
                    lp.checklist.learningResourcesAdequate,
                    lp.checklist.pedagogicalProceduresSequenced,
                    lp.checklist.formativeAssessmentIncluded,
                  ].filter(Boolean).length;
                  const planSupervisor =
                    supervisors.find((s) => s.id === lp.supervisorId) ||
                    supervisors.find((s) => s.fullName === lp.supervisorName);
                  const effectiveDriveLink =
                    lp.driveUrl ||
                    planSupervisor?.driveUrl ||
                    'https://drive.google.com/drive/folders/1bnhs-sup-santos-dll-archive';

                  return (
                    <tr key={lp.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-[#701628]">{lp.checkCode}</div>
                        <div className="text-[11px] text-stone-500 font-medium">
                          {formatWeekOrCo(lp.weekNumber)} · {lp.quarterTerm}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{lp.teacherName}</div>
                        <div className="text-[11px] text-stone-500">{lp.department}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-stone-800">{lp.subjectGrade}</div>
                        <div className="text-[11px] text-stone-600 truncate">{lp.lessonTitle}</div>
                      </td>

                      {/* Assigned Supervisor & Direct Google Drive View Button */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">
                          {planSupervisor ? planSupervisor.fullName : lp.supervisorName}
                        </div>
                        <div className="text-[10px] text-stone-500 mb-1.5 font-medium">
                          {planSupervisor ? `${planSupervisor.position} · ${planSupervisor.department}` : 'Instructional Supervisor'}
                        </div>
                        {(lp.mentorName || lp.evaluatorRole === 'mentor') && (
                          <div className="text-[10px] text-violet-800 font-semibold mb-1">
                            Mentor: {lp.mentorName || resolveRecordMentor(lp, teachers, mentors)?.fullName}
                          </div>
                        )}
                        {lp.uploadedFileName && (
                          <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 mb-1 inline-flex items-center gap-1 max-w-[190px] truncate">
                            <FileText className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span className="truncate">{lp.uploadedFileName}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {lp.uploadedFileDataUrl && (
                            <a
                              href={lp.uploadedFileDataUrl}
                              download={lp.uploadedFileName || 'Weekly_Lesson_Plan'}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
                              title="Download uploaded lesson plan file"
                            >
                              <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Download File</span>
                            </a>
                          )}
                          {effectiveDriveLink ? (
                            <a
                              href={effectiveDriveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
                              title={`Open lesson plan uploaded in Google Drive of ${planSupervisor?.fullName || 'Assigned Supervisor'}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                              <span>View in Drive</span>
                            </a>
                          ) : (
                            <span className="text-stone-400 text-[10px] italic">No Drive Link</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-stone-600">
                        <div>Sub: {lp.dateSubmitted}</div>
                        <div className="text-[10px] text-stone-400 font-medium">
                          {lp.dateChecked !== 'Pending' ? `Chk: ${lp.dateChecked}` : 'Pending check'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            checkCount === 5
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {checkCount} / 5 Criteria
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {lp.status === 'Approved' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved
                          </span>
                        )}
                        {lp.status === 'Needs Revision' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Needs Revision
                          </span>
                        )}
                        {lp.status === 'Pending Inspection' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Clock className="w-3.5 h-3.5" />
                            Pending Review
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {!isTeacher ? (
                            <button
                              type="button"
                              onClick={() => handleOpenReview(lp)}
                              className="px-2.5 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                            >
                              Inspect & Sign
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenReview(lp)}
                              className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg text-xs transition-colors border border-stone-200 cursor-pointer whitespace-nowrap"
                            >
                              View Feedback
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(lp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap"
                            title="Edit Weekly Lesson Plan (DLL)"
                          >
                            <Pencil className="w-3.5 h-3.5 text-amber-700" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPlanToDelete(lp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap"
                            title="Delete Weekly Lesson Plan (DLL)"
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

      {/* Table: PMCF for Lesson Plan Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              PMCF for Lesson Plan Table
            </h3>
            <p className="text-[11px] text-stone-500">
              Performance Monitoring and Coaching Form (PMCF) · Coaching Interventions for Lesson Plan
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
              title="Export PMCF for Lesson Plan Table to PDF"
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
                <span>Add PMCF for Lesson Plan</span>
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
                    No PMCF for Lesson Plan records found. Click &ldquo;PMCF for Lesson Plan&rdquo; to add a record.
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
                      {(r.mentorName || r.evaluatorRole === 'mentor') && (
                        <div className="text-[10px] font-semibold text-violet-800 mt-0.5">
                          Mentor: {r.mentorName || resolveRecordMentor(r, teachers, mentors)?.fullName}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table: FAR for Lesson Plan Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-amber-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              FAR for Lesson Plan Table
            </h3>
            <p className="text-[11px] text-stone-600">
              Findings, Analysis and Recommendations (FAR) · Lesson Plan Supervision Records
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
              title="Export FAR for Lesson Plan Table to PDF"
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
                <span>Add FAR for Lesson Plan</span>
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
                    No FAR for Lesson Plan records found. Click &ldquo;FAR for Lesson Plan&rdquo; to add a record.
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
                          <div className="text-[10px] font-semibold text-violet-800 mt-0.5">
                            Mentor: {r.mentorName || resolveRecordMentor(r, teachers, mentors)?.fullName}
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
                              title="Edit FAR for Lesson Plan"
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

      {/* Review & Inspection Modal */}
      {activeReviewPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 rounded-lg text-amber-300">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Lesson Plan Verification (DepEd Order 42 Checklist)
                  </h3>
                  <p className="text-xs text-amber-200/90 font-mono">
                    {activeReviewPlan.checkCode} · {activeReviewPlan.teacherName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveReviewPlan(null)}
                className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Plan Header Info */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div className="font-bold text-stone-900 text-sm">
                  {activeReviewPlan.subjectGrade} — {activeReviewPlan.lessonTitle}
                </div>
                <div className="text-stone-500 text-[11px] mt-0.5 font-medium">
                  Submitted: {activeReviewPlan.dateSubmitted} · {formatWeekOrCo(activeReviewPlan.weekNumber)} ({activeReviewPlan.quarterTerm}) · Teacher: {activeReviewPlan.teacherName}
                </div>
              </div>

              {/* Google Drive Link & Viewer Box */}
              {(() => {
                const reviewSupervisor =
                  supervisors.find((s) => s.id === activeReviewPlan.supervisorId) ||
                  supervisors.find((s) => s.fullName === activeReviewPlan.supervisorName);
                const activeDriveUrl =
                  activeReviewPlan.driveUrl ||
                  reviewSupervisor?.driveUrl ||
                  'https://drive.google.com/drive/folders/1bnhs-sup-santos-dll-archive';

                return (
                  <div className="p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-stone-50 rounded-xl border border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                        <FolderOpen className="w-4 h-4 text-amber-700" />
                        <span>Lesson Plan Document in Google Drive</span>
                      </div>
                      <div className="text-[11px] text-stone-600 mt-0.5">
                        Assigned Instructional Supervisor:{' '}
                        <span className="font-bold text-[#701628]">
                          {reviewSupervisor?.fullName || activeReviewPlan.supervisorName}
                        </span>{' '}
                        ({reviewSupervisor?.position || 'Supervisor'})
                      </div>
                    </div>

                    <a
                      href={activeDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#701628] hover:bg-[#580e1c] text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                      <span>View in Google Drive ↗</span>
                    </a>
                  </div>
                );
              })()}

              {/* Instructional Supervision Verification Criteria */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <h4 className="font-bold text-stone-800 uppercase tracking-wider">
                    Instructional Supervision Verification Criteria (DepEd Order 42):
                  </h4>
                  <span className="text-[11px] font-bold text-[#701628]">
                    E=Evident · NE=Not Evident
                  </span>
                </div>
                <div className="space-y-2.5 bg-white border border-stone-200 p-3.5 rounded-xl">
                  {[
                    {
                      key: 'melcAligned',
                      label:
                        '1. Maintains a documented schedule or system for the regular checking of teachers’ lesson plans',
                      indicator: 'Indicator: School Memorandum, DLP Checklist',
                    },
                    {
                      key: 'clearObjectives',
                      label:
                        '2. Inspects the adherence of lesson plan to ILAW (Intentions, Learning Experience, Assessment, Ways Forward) framework and ensure its constructive alignment',
                      indicator: 'Indicator: FAR, DLP Checklist',
                    },
                    {
                      key: 'learningResourcesAdequate',
                      label:
                        '3. Provides timely and constructive feedback, comments, and recommendations after lesson plan review.',
                      indicator: 'Indicator: Annotated lesson plans, PMCF',
                    },
                    {
                      key: 'pedagogicalProceduresSequenced',
                      label:
                        '4. Conducts coaching, mentoring, or technical assistance based on lesson plan review findings',
                      indicator: 'Indicator: PMCF',
                    },
                    {
                      key: 'formativeAssessmentIncluded',
                      label:
                        '5. Monitors teachers’ compliance with the revisions and recommendations provided during lesson plan review',
                      indicator: 'Indicator: Revised lesson plans, FAR',
                    },
                  ].map((item) => {
                    const isEvident = Boolean((reviewChecklist as any)[item.key]);
                    return (
                      <div
                        key={item.key}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                          isEvident
                            ? 'bg-emerald-50/50 border-emerald-200/80'
                            : 'bg-rose-50/40 border-rose-200/80'
                        }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="font-bold text-stone-800 leading-snug">{item.label}</div>
                          {item.indicator && (
                            <div className="text-[11px] font-semibold text-[#701628]">
                              {item.indicator}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            disabled={isTeacher}
                            onClick={() =>
                              setReviewChecklist((prev) => ({
                                ...prev,
                                [item.key]: true,
                              }))
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              isTeacher ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              isEvident
                                ? 'bg-[#701628] text-white border-[#701628] shadow-xs ring-2 ring-amber-400/80'
                                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                            }`}
                            title="Evident (E)"
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center border text-[10px] ${
                                isEvident
                                  ? 'bg-amber-400 border-amber-300 text-stone-950 font-extrabold'
                                  : 'border-stone-400 bg-white text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                            <span>E=Evident</span>
                          </button>

                          <button
                            type="button"
                            disabled={isTeacher}
                            onClick={() =>
                              setReviewChecklist((prev) => ({
                                ...prev,
                                [item.key]: false,
                              }))
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              isTeacher ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              !isEvident
                                ? 'bg-rose-700 text-white border-rose-700 shadow-xs ring-2 ring-amber-400/80'
                                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                            }`}
                            title="Not Evident (NE)"
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center border text-[10px] ${
                                !isEvident
                                  ? 'bg-white border-white text-rose-700 font-extrabold'
                                  : 'border-stone-400 bg-white text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                            <span>NE=Not Evident</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Supervisor Decision */}
              {!isTeacher && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Supervisory Decision</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setReviewStatus('Approved')}
                        className={`flex-1 py-2 rounded-lg font-bold border transition-colors ${
                          reviewStatus === 'Approved'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        ✓ Approve Lesson Plan
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewStatus('Needs Revision')}
                        className={`flex-1 py-2 rounded-lg font-bold border transition-colors ${
                          reviewStatus === 'Needs Revision'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        ✕ Needs Revision
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Inspection Remarks</label>
                    <input
                      type="text"
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                      placeholder="e.g. Approved. Thorough sequencing and clear formative check."
                      className="w-full border border-stone-300 rounded-lg p-2 text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Instructional Feedback & Coaching Notes to Teacher
                    </label>
                    <textarea
                      rows={2}
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      placeholder="Provide constructive suggestions, pacing guidance, or praise..."
                      className="w-full border border-stone-300 rounded-lg p-2 text-stone-900"
                    />
                  </div>
                </div>
              )}

              {isTeacher && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                  <div className="font-bold text-amber-900">Supervisor Feedback:</div>
                  <div className="text-stone-800 italic">
                    "{activeReviewPlan.supervisorFeedback || 'No additional remarks.'}"
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 bg-stone-50 border-t border-stone-200 shrink-0">
              <button
                type="button"
                onClick={() => setActiveReviewPlan(null)}
                className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-100 font-semibold"
              >
                Close
              </button>
              {!isTeacher && (
                <button
                  type="button"
                  onClick={handleSaveReview}
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-xl shadow-xs"
                >
                  Save Supervisory Inspection
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit / Edit Weekly Lesson Plan (DLL) Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 rounded-lg text-amber-300">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingPlan
                      ? `Edit Weekly Lesson Plan (${editingPlan.checkCode})`
                      : 'Submit / Log Weekly Lesson Plan (DLL)'}
                  </h3>
                  <p className="text-xs text-amber-200/90">Barobo National High School OMES</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  setEditingPlan(null);
                }}
                className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewPlan} className="p-6 space-y-4 text-xs">
              {/* Teacher Field: ONLY Teacher Name is shown, NO subject included */}
              {!isTeacher && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Teacher</label>
                  <select
                    value={teacherId}
                    onChange={(e) => {
                      setTeacherId(e.target.value);
                      const t = teachers.find((tch) => tch.id === e.target.value);
                      if (t && t.subject) {
                        setSubjectGrade(`${t.subject} (${t.gradeLevels[0] || 'Grade 9'})`);
                      }
                      const sup = t
                        ? supervisors.find((s) => s.id === t.assignedSupervisorId) || supervisors[0]
                        : supervisors[0];
                      if (sup) {
                        setSupervisorId(sup.id);
                      }
                      if (sup?.driveUrl) {
                        setDriveUrl(sup.driveUrl);
                      }
                    }}
                    className="w-full border border-stone-300 rounded-xl p-2.5 bg-white text-stone-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#701628]"
                  >
                    {scopedTeachers.map((t) => (
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
                  {assignedSupervisor?.driveUrl && (
                    <a
                      href={assignedSupervisor.driveUrl}
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
                  value={supervisorId}
                  onChange={(e) => {
                    const newSupId = e.target.value;
                    setSupervisorId(newSupId);
                    const sup = supervisors.find((s) => s.id === newSupId);
                    if (sup?.driveUrl) {
                      setDriveUrl(sup.driveUrl);
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
                {assignedSupervisor && (
                  <p className="text-[10px] text-stone-500 mt-1">
                    Selected Supervisor: <span className="font-semibold text-[#701628]">{assignedSupervisor.fullName}</span> · {assignedSupervisor.position} ({assignedSupervisor.department})
                  </p>
                )}
              </div>

              {/* Subject & Grade Level */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Subject & Grade Level</label>
                <input
                  type="text"
                  required
                  value={subjectGrade}
                  onChange={(e) => setSubjectGrade(e.target.value)}
                  placeholder="e.g. Science 9 or English 10"
                  className="w-full border border-stone-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                />
              </div>

              {/* Week Number and Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Lesson Plan Week</label>
                  <select
                    value={weekNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWeekNumber(/^\d+$/.test(val) ? Number(val) : val);
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
                    value={quarterTerm}
                    onChange={(e) => setQuarterTerm(e.target.value as any)}
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
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
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
                    {driveUrl.trim() && (
                      <a
                        href={driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#701628] font-bold hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3 text-amber-700" />
                        <span>Open Drive Link ↗</span>
                      </a>
                    )}
                    {assignedSupervisor?.driveUrl && driveUrl !== assignedSupervisor.driveUrl && (
                      <button
                        type="button"
                        onClick={() => setDriveUrl(assignedSupervisor.driveUrl || '')}
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
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder={
                      assignedSupervisor?.driveUrl ||
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
                  onClick={() => {
                    setIsSubmitModalOpen(false);
                    setEditingPlan(null);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingToDrive}
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] disabled:opacity-60 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingPlan ? 'Save Changes' : 'Submit Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Lesson Plan Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-rose-200" />
                <h3 className="text-base font-bold">Delete Weekly Lesson Plan</h3>
              </div>
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="p-1 rounded-lg text-rose-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs text-stone-700">
              <p className="text-sm font-semibold text-stone-900">
                Are you sure you want to delete this Weekly Lesson Plan (DLL) record?
              </p>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <div className="font-mono font-bold text-[#701628]">{planToDelete.checkCode}</div>
                <div className="font-bold text-stone-900">
                  {planToDelete.teacherName} — {planToDelete.subjectGrade}
                </div>
                <div className="text-stone-600">{planToDelete.lessonTitle}</div>
                <div className="text-[11px] text-stone-500">
                  {formatWeekOrCo(planToDelete.weekNumber)} · {planToDelete.quarterTerm}
                </div>
              </div>
              <p className="text-[11px] text-rose-600 font-medium">
                This action will permanently remove the lesson plan record from the verification table.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-stone-50 border-t border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 font-semibold hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteLessonPlan(planToDelete.id);
                  setPlanToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: PMCF for Lesson Plan */}
      {isPmcfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingPmcf
                    ? `Edit PMCF for Lesson Plan (${editingPmcf.recordNo})`
                    : 'PMCF for Lesson Plan'}
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

      {/* Modal: FAR for Lesson Plan */}
      {isFarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingFar
                    ? `Edit FAR for Lesson Plan (${editingFar.farCode})`
                    : 'FAR for Lesson Plan'}
                </h3>
                <p className="text-[11px] text-amber-200">
                  Findings, Analysis and Recommendation · Lesson Plan Evaluation
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
