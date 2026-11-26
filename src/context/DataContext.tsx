import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  SchoolProfile,
  Teacher,
  Supervisor,
  Mentor,
  ClassroomObservation,
  LessonPlanCheck,
  FleetingObservation,
  PMCFRecord,
  FarRecord,
  InstructionalMaterialQA,
  AssessmentRecord,
  FormativeAssessmentRecord,
  SummativeAssessmentRecord,
  ResourceLink,
  AuditLog,
  AppNotification,
  SupervisionCategory,
  AiGeneratedPmcfPayload,
  AiGeneratedFarPayload,
  AiPmcfFarDraftSession,
} from '../types';
import {
  INITIAL_SCHOOL_PROFILE,
  INITIAL_SUPERVISORS,
  INITIAL_MENTORS,
  INITIAL_TEACHERS,
  INITIAL_OBSERVATIONS,
  INITIAL_LESSON_PLANS,
  INITIAL_FLEETING_OBSERVATIONS,
  INITIAL_PMCF_RECORDS,
  INITIAL_FAR_RECORDS,
  INITIAL_IMS_QA,
  INITIAL_ASSESSMENTS,
  INITIAL_FORMATIVE_RECORDS,
  INITIAL_SUMMATIVE_RECORDS,
  INITIAL_RESOURCE_LINKS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../data/initialData';

interface DataContextType {
  schoolProfile: SchoolProfile;
  updateSchoolProfile: (profile: Partial<SchoolProfile>) => void;

  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id' | 'observationsCompleted'>) => void;
  updateTeacher: (id: string, updates: Partial<Teacher>) => void;
  updateTeacherPassword: (id: string, newPass: string) => void;
  deleteTeacher: (id: string) => void;

  supervisors: Supervisor[];
  addSupervisor: (supervisor: Omit<Supervisor, 'id' | 'totalObservationsThisTerm'>) => void;
  updateSupervisor: (id: string, updates: Partial<Supervisor>) => void;
  updateSupervisorPassword: (id: string, newPass: string) => void;
  deleteSupervisor: (id: string) => void;
  assignTeacherToSupervisor: (teacherId: string, supervisorId: string) => void;

  mentors: Mentor[];
  addMentor: (mentor: Omit<Mentor, 'id' | 'totalEvaluationsThisTerm'>) => void;
  updateMentor: (id: string, updates: Partial<Mentor>) => void;
  updateMentorPassword: (id: string, newPass: string) => void;
  deleteMentor: (id: string) => void;
  assignTeacherToMentor: (teacherId: string, mentorId: string) => void;

  observations: ClassroomObservation[];
  addObservation: (obs: Omit<ClassroomObservation, 'id' | 'observationNo'>) => ClassroomObservation;
  updateObservation: (id: string, updates: Partial<ClassroomObservation>) => void;
  deleteObservation: (id: string) => void;

  lessonPlans: LessonPlanCheck[];
  addLessonPlan: (plan: Omit<LessonPlanCheck, 'id' | 'checkCode'>) => void;
  updateLessonPlan: (id: string, updates: Partial<LessonPlanCheck>) => void;
  deleteLessonPlan: (id: string) => void;

  fleetingObservations: FleetingObservation[];
  addFleetingObservation: (obs: Omit<FleetingObservation, 'id' | 'visitCode'>) => void;
  updateFleetingObservation: (id: string, updates: Partial<FleetingObservation>) => void;
  deleteFleetingObservation: (id: string) => void;

  pmcfRecords: PMCFRecord[];
  addPMCFRecord: (record: Omit<PMCFRecord, 'id' | 'recordNo'>) => void;
  updatePMCFRecord: (id: string, updates: Partial<PMCFRecord>) => void;
  deletePMCFRecord: (id: string) => void;

  farRecords: FarRecord[];
  addFarRecord: (record: Omit<FarRecord, 'id' | 'farCode' | 'date' | 'status' | 'actionTaken'>) => void;
  updateFarRecord: (id: string, updates: Partial<FarRecord>) => void;
  verifyFarRecord: (id: string) => void;
  deleteFarRecord: (id: string) => void;

  imsQA: InstructionalMaterialQA[];
  addIMQA: (im: Omit<InstructionalMaterialQA, 'id'>) => void;
  updateIMQA: (id: string, updates: Partial<InstructionalMaterialQA>) => void;
  deleteIMQA: (id: string) => void;

  assessments: AssessmentRecord[];
  addAssessment: (assessment: Omit<AssessmentRecord, 'id'>) => void;
  updateAssessment: (id: string, updates: Partial<AssessmentRecord>) => void;
  deleteAssessment: (id: string) => void;

  formativeRecords: FormativeAssessmentRecord[];
  addFormativeRecord: (record: Omit<FormativeAssessmentRecord, 'id' | 'code'>) => FormativeAssessmentRecord;
  updateFormativeRecord: (id: string, updates: Partial<FormativeAssessmentRecord>) => void;
  deleteFormativeRecord: (id: string) => void;

  summativeRecords: SummativeAssessmentRecord[];
  addSummativeRecord: (record: Omit<SummativeAssessmentRecord, 'id' | 'code'>) => SummativeAssessmentRecord;
  updateSummativeRecord: (id: string, updates: Partial<SummativeAssessmentRecord>) => void;
  deleteSummativeRecord: (id: string) => void;

  resourceLinks: ResourceLink[];
  addResourceLink: (link: Omit<ResourceLink, 'id'>) => void;
  updateResourceLink: (id: string, updates: Partial<ResourceLink>) => void;
  deleteResourceLink: (id: string) => void;

  auditLogs: AuditLog[];
  logAuditEvent: (event: Omit<AuditLog, 'id' | 'timestamp' | 'formattedDate'>) => void;
  clearAuditLogs: () => void;
  exportAuditLogsCsv: (logsToExport?: AuditLog[]) => void;

  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'formattedDate' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (teacherName?: string) => void;
  deleteNotification: (id: string) => void;

  exportAllCsv: (
    type: 'cot' | 'dll' | 'pmcf' | 'mps' | 'far' | 'audit',
    scopedRecords?: {
      observations?: ClassroomObservation[];
      lessonPlans?: LessonPlanCheck[];
      assessments?: AssessmentRecord[];
      pmcfRecords?: PMCFRecord[];
      farRecords?: FarRecord[];
      auditLogs?: AuditLog[];
    }
  ) => void;
  exportDatabaseJson: () => void;
  importDatabaseJson: (jsonString: string) => boolean;
  resetToDefaults: () => void;

  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastCloudSyncTime: string | null;
  syncToCloudNow: () => Promise<boolean>;

  activeAiDraft: AiPmcfFarDraftSession | null;
  dismissAiDraft: () => void;
  regenerateAiDraft: () => Promise<void>;
  saveReviewedAiPmcfFar: (
    editedPmcf: AiGeneratedPmcfPayload,
    editedFar: AiGeneratedFarPayload,
    pmcfStatus?: PMCFRecord['status']
  ) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(`bnhs_omes_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() =>
    loadFromStorage('school_profile', INITIAL_SCHOOL_PROFILE)
  );
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const loaded = loadFromStorage('teachers', INITIAL_TEACHERS);
    // Ensure all initial teachers (including newly added master teachers t-8, t-9 and t-principal) are included even if localStorage had older data
    const existingIds = new Set(loaded.map((t) => t.id));
    const hasCustomPrincipalFaculty = loaded.some((t) =>
      t.position.toLowerCase().includes('principal')
    );
    const missingInitials = INITIAL_TEACHERS.filter((it) => {
      if (it.id === 't-principal' && hasCustomPrincipalFaculty) return false;
      return !existingIds.has(it.id);
    });
    const combined = [...loaded, ...missingInitials];

    return combined.map((t) => {
      // Auto-assign any Master Teacher rank/position to the School Principal
      if (t.position.toLowerCase().includes('master teacher')) {
        return {
          ...t,
          assignedSupervisorId: 'sup-principal',
        };
      }
      return t;
    });
  });
  const [supervisors, setSupervisors] = useState<Supervisor[]>(() => {
    const loaded = loadFromStorage('supervisors', INITIAL_SUPERVISORS);
    const list = loaded.filter((s) => s.id !== 'sup-admin');
    const withPrincipal = list.some(
      (s) =>
        s.id === 'sup-principal' ||
        s.position.toLowerCase().includes('principal') ||
        s.department === 'School Principal'
    )
      ? list
      : [INITIAL_SUPERVISORS[0], ...list];

    const masterTeacherIds = INITIAL_TEACHERS.filter((t) =>
      t.position.toLowerCase().includes('master teacher')
    ).map((t) => t.id);

    return withPrincipal.map((s) => {
      if (
        s.id === 'sup-principal' ||
        s.position.toLowerCase().includes('principal') ||
        s.department.toLowerCase().includes('principal')
      ) {
        const currentIds = s.assignedTeacherIds || [];
        const uniqueIds = Array.from(new Set([...currentIds, ...masterTeacherIds, 't-6', 't-8', 't-9']));
        return {
          ...s,
          assignedTeacherIds: uniqueIds,
        };
      }
      if (s.id === 'sup-3') {
        return {
          ...s,
          assignedTeacherIds: (s.assignedTeacherIds || []).filter(
            (id) => !masterTeacherIds.includes(id) && id !== 't-6' && id !== 't-8' && id !== 't-9'
          ),
        };
      }
      return s;
    });
  });
  const mergeInitialById = <T extends { id: string }>(loaded: T[], initials: T[]): T[] => {
    const existingIds = new Set(loaded.map((item) => item.id));
    const missing = initials.filter((init) => !existingIds.has(init.id));
    return [...loaded, ...missing];
  };

  const [mentors, setMentors] = useState<Mentor[]>(() =>
    mergeInitialById(loadFromStorage('mentors', INITIAL_MENTORS), INITIAL_MENTORS)
  );
  const [observations, setObservations] = useState<ClassroomObservation[]>(() =>
    mergeInitialById(loadFromStorage('observations', INITIAL_OBSERVATIONS), INITIAL_OBSERVATIONS)
  );
  const [lessonPlans, setLessonPlans] = useState<LessonPlanCheck[]>(() =>
    mergeInitialById(loadFromStorage('lesson_plans', INITIAL_LESSON_PLANS), INITIAL_LESSON_PLANS)
  );
  const [fleetingObservations, setFleetingObservations] = useState<FleetingObservation[]>(() =>
    mergeInitialById(
      loadFromStorage('fleeting_obs', INITIAL_FLEETING_OBSERVATIONS),
      INITIAL_FLEETING_OBSERVATIONS
    )
  );
  const [pmcfRecords, setPmcfRecords] = useState<PMCFRecord[]>(() =>
    mergeInitialById(loadFromStorage('pmcf_records', INITIAL_PMCF_RECORDS), INITIAL_PMCF_RECORDS)
  );
  const [farRecords, setFarRecords] = useState<FarRecord[]>(() =>
    mergeInitialById(loadFromStorage('far_records', INITIAL_FAR_RECORDS), INITIAL_FAR_RECORDS)
  );
  const [imsQA, setImsQA] = useState<InstructionalMaterialQA[]>(() =>
    mergeInitialById(loadFromStorage('ims_qa', INITIAL_IMS_QA), INITIAL_IMS_QA)
  );
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(() =>
    mergeInitialById(loadFromStorage('assessments', INITIAL_ASSESSMENTS), INITIAL_ASSESSMENTS)
  );
  const [formativeRecords, setFormativeRecords] = useState<FormativeAssessmentRecord[]>(() => {
    const savedV4 = loadFromStorage<FormativeAssessmentRecord[]>('formative_records_v4', []);
    if (savedV4.length > 0) return mergeInitialById(savedV4, INITIAL_FORMATIVE_RECORDS);
    const savedV3 = loadFromStorage<FormativeAssessmentRecord[]>('formative_records_v3', []);
    const customOnly = savedV3.filter((r) => !['form-1', 'form-2', 'form-3', 'form-4'].includes(r.id));
    return [...customOnly, ...INITIAL_FORMATIVE_RECORDS];
  });
  const [summativeRecords, setSummativeRecords] = useState<SummativeAssessmentRecord[]>(() => {
    const savedV5 = loadFromStorage<SummativeAssessmentRecord[]>('summative_records_v5', []);
    if (savedV5.length > 0) return mergeInitialById(savedV5, INITIAL_SUMMATIVE_RECORDS);
    const savedV4 = loadFromStorage<SummativeAssessmentRecord[]>('summative_records_v4', []);
    const customOnly = savedV4.filter((r) => !['sum-1', 'sum-2', 'sum-3', 'sum-4'].includes(r.id));
    return [...customOnly, ...INITIAL_SUMMATIVE_RECORDS];
  });
  const normalizeResourceLinks = (links: ResourceLink[]): ResourceLink[] =>
    links.map((link) => ({
      ...link,
      category: (link.category === 'COT-RPMS Forms & Rubrics'
        ? 'COT-PMES Forms & Rubrics'
        : link.category.replace(/COT-RPMS/g, 'COT-PMES')) as ResourceLink['category'],
      title: link.title.replace(/COT-RPMS/g, 'COT-PMES'),
      description: link.description.replace(/COT-RPMS/g, 'COT-PMES'),
    }));

  const [resourceLinks, setResourceLinks] = useState<ResourceLink[]>(() =>
    normalizeResourceLinks(loadFromStorage('resource_links', INITIAL_RESOURCE_LINKS))
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadFromStorage('audit_logs', INITIAL_AUDIT_LOGS)
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadFromStorage('notifications', INITIAL_NOTIFICATIONS)
  );
  const [activeAiDraft, setActiveAiDraft] = useState<AiPmcfFarDraftSession | null>(null);
  const activeAiRequestIdRef = useRef<number>(0);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('bnhs_omes_school_profile', JSON.stringify(schoolProfile));
  }, [schoolProfile]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_teachers', JSON.stringify(teachers));
  }, [teachers]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_supervisors', JSON.stringify(supervisors));
  }, [supervisors]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_mentors', JSON.stringify(mentors));
  }, [mentors]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_observations', JSON.stringify(observations));
  }, [observations]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_lesson_plans', JSON.stringify(lessonPlans));
  }, [lessonPlans]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_fleeting_obs', JSON.stringify(fleetingObservations));
  }, [fleetingObservations]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_pmcf_records', JSON.stringify(pmcfRecords));
  }, [pmcfRecords]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_far_records', JSON.stringify(farRecords));
  }, [farRecords]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_ims_qa', JSON.stringify(imsQA));
  }, [imsQA]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_assessments', JSON.stringify(assessments));
  }, [assessments]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_formative_records_v4', JSON.stringify(formativeRecords));
  }, [formativeRecords]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_summative_records_v5', JSON.stringify(summativeRecords));
  }, [summativeRecords]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_resource_links', JSON.stringify(resourceLinks));
  }, [resourceLinks]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);
  useEffect(() => {
    localStorage.setItem('bnhs_omes_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Cloud Persistence via Firebase Firestore
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('syncing');
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);
  const isRemoteSyncRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialFetchDoneRef = useRef(false);

  // 1. Initial Listen to Firestore
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const docRef = doc(db, 'appData', 'liveState');

    try {
      unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            isRemoteSyncRef.current = true;
            if (data.schoolProfile) setSchoolProfile(data.schoolProfile);
            if (data.teachers && Array.isArray(data.teachers)) setTeachers(data.teachers);
            if (data.supervisors && Array.isArray(data.supervisors)) setSupervisors(data.supervisors);
            if (data.mentors && Array.isArray(data.mentors)) setMentors(data.mentors);
            if (data.observations && Array.isArray(data.observations)) setObservations(data.observations);
            if (data.lessonPlans && Array.isArray(data.lessonPlans)) setLessonPlans(data.lessonPlans);
            if (data.fleetingObservations && Array.isArray(data.fleetingObservations)) setFleetingObservations(data.fleetingObservations);
            if (data.pmcfRecords && Array.isArray(data.pmcfRecords)) setPmcfRecords(data.pmcfRecords);
            if (data.farRecords && Array.isArray(data.farRecords)) setFarRecords(data.farRecords);
            if (data.imsQA && Array.isArray(data.imsQA)) setImsQA(data.imsQA);
            if (data.assessments && Array.isArray(data.assessments)) setAssessments(data.assessments);
            if (data.formativeRecords && Array.isArray(data.formativeRecords)) setFormativeRecords(data.formativeRecords);
            if (data.summativeRecords && Array.isArray(data.summativeRecords)) setSummativeRecords(data.summativeRecords);
            if (data.resourceLinks && Array.isArray(data.resourceLinks)) setResourceLinks(normalizeResourceLinks(data.resourceLinks));
            if (data.auditLogs && Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
            setCloudSyncStatus('synced');
            setLastCloudSyncTime(new Date().toLocaleTimeString());
            initialFetchDoneRef.current = true;
            setTimeout(() => {
              isRemoteSyncRef.current = false;
            }, 500);
          } else {
            // Document doesn't exist yet: seed cloud with current state
            const currentPayload = {
              schoolProfile,
              teachers,
              supervisors,
              mentors,
              observations,
              lessonPlans,
              fleetingObservations,
              pmcfRecords,
              farRecords,
              imsQA,
              assessments,
              formativeRecords,
              summativeRecords,
              resourceLinks,
              auditLogs,
              lastUpdated: new Date().toISOString(),
            };
            setDoc(docRef, currentPayload)
              .then(() => {
                setCloudSyncStatus('synced');
                setLastCloudSyncTime(new Date().toLocaleTimeString());
                initialFetchDoneRef.current = true;
              })
              .catch((err) => {
                handleFirestoreError(err, OperationType.WRITE, 'appData/liveState');
                setCloudSyncStatus('error');
              });
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'appData/liveState');
          setCloudSyncStatus('offline');
        }
      );
    } catch {
      setCloudSyncStatus('offline');
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Manual & Automated Cloud Sync
  const syncToCloudNow = useCallback(async (): Promise<boolean> => {
    setCloudSyncStatus('syncing');
    try {
      const docRef = doc(db, 'appData', 'liveState');
      const payload = {
        schoolProfile,
        teachers,
        supervisors,
        mentors,
        observations,
        lessonPlans,
        fleetingObservations,
        pmcfRecords,
        farRecords,
        imsQA,
        assessments,
        formativeRecords,
        summativeRecords,
        resourceLinks,
        auditLogs,
        lastUpdated: new Date().toISOString(),
      };
      await setDoc(docRef, payload, { merge: true });
      setCloudSyncStatus('synced');
      setLastCloudSyncTime(new Date().toLocaleTimeString());
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'appData/liveState');
      setCloudSyncStatus('error');
      return false;
    }
  }, [
    schoolProfile,
    teachers,
    supervisors,
    mentors,
    observations,
    lessonPlans,
    fleetingObservations,
    pmcfRecords,
    farRecords,
    imsQA,
    assessments,
    formativeRecords,
    summativeRecords,
    resourceLinks,
    auditLogs,
  ]);

  // 3. Auto-save to cloud when state changes
  useEffect(() => {
    if (!initialFetchDoneRef.current || isRemoteSyncRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      syncToCloudNow();
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    schoolProfile,
    teachers,
    supervisors,
    mentors,
    observations,
    lessonPlans,
    fleetingObservations,
    pmcfRecords,
    farRecords,
    imsQA,
    assessments,
    formativeRecords,
    summativeRecords,
    resourceLinks,
    auditLogs,
    syncToCloudNow,
  ]);

  const getActor = () => {
    if (currentUser?.fullName) {
      return {
        id: (currentUser.id || '') as string,
        mentorId: (currentUser.mentorId || '') as string,
        supervisorId: (currentUser.supervisorId || '') as string,
        name: currentUser.fullName as string,
        role: (currentUser.role || 'admin') as 'admin' | 'supervisor' | 'mentor' | 'teacher',
      };
    }
    return { id: 'user-admin', mentorId: '', supervisorId: '', name: 'Administrator', role: 'admin' as const };
  };

  const logAuditEvent = (event: Omit<AuditLog, 'id' | 'timestamp' | 'formattedDate'>) => {
    const now = new Date();
    const formattedDate = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const newLog: AuditLog = {
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      formattedDate,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
  };

  const addNotification = (
    notif: Omit<AppNotification, 'id' | 'timestamp' | 'formattedDate' | 'read'>
  ) => {
    const now = new Date();
    const formattedDate = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      formattedDate,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = (teacherName?: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        !teacherName || n.recipientTeacherName === teacherName
          ? { ...n, read: true }
          : n
      )
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const updateSchoolProfile = (profile: Partial<SchoolProfile>) => {
    setSchoolProfile((prev) => ({ ...prev, ...profile }));
  };

  const addTeacher = (teacher: Omit<Teacher, 'id' | 'observationsCompleted'>) => {
    const newId = `t-${Date.now()}`;
    const isMasterTeacher = teacher.position.toLowerCase().includes('master teacher');
    const effectiveSupervisorId = isMasterTeacher ? 'sup-principal' : (teacher.assignedSupervisorId || '');
    const newTeacher: Teacher = {
      ...teacher,
      id: newId,
      assignedSupervisorId: effectiveSupervisorId,
      password: teacher.password || 'omes123',
      observationsCompleted: 0,
    };
    setTeachers((prev) => [newTeacher, ...prev]);

    // Update assigned supervisor
    if (effectiveSupervisorId) {
      setSupervisors((prev) =>
        prev.map((s) => {
          const isTarget =
            s.id === effectiveSupervisorId ||
            (isMasterTeacher &&
              (s.id === 'sup-principal' || s.position.toLowerCase().includes('principal')));
          if (isTarget) {
            return {
              ...s,
              assignedTeacherIds: [
                ...(s.assignedTeacherIds || []).filter((id) => id !== newId),
                newId,
              ],
            };
          }
          return s;
        })
      );
    }

    // Update assigned mentor
    if (teacher.assignedMentorId) {
      setMentors((prev) =>
        prev.map((m) =>
          m.id === teacher.assignedMentorId
            ? {
                ...m,
                assignedTeacherIds: [
                  ...(m.assignedTeacherIds || []).filter((id) => id !== newId),
                  newId,
                ],
              }
            : m
        )
      );
    }

    const actor = getActor();
    const assignedSup = supervisors.find((s) => s.id === teacher.assignedSupervisorId);
    logAuditEvent({
      category: 'Roster / Teaching Personnel',
      action: 'CREATE',
      targetId: newId,
      targetName: teacher.fullName,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Added new faculty member ${teacher.fullName} (${teacher.position}, ${teacher.department}). Assigned Supervisor: ${assignedSup ? assignedSup.fullName : 'None'}.`,
      severity: 'info',
      changesSummary: [
        { field: 'Full Name', previousValue: 'None', newValue: teacher.fullName },
        { field: 'Employee ID', previousValue: 'None', newValue: teacher.employeeId || 'N/A' },
        { field: 'Position / Rank', previousValue: 'None', newValue: teacher.position },
        { field: 'Department', previousValue: 'None', newValue: teacher.department },
        { field: 'Subject / Specialization Taught', previousValue: 'None', newValue: teacher.subject || 'General' },
      ],
    });
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    const oldTeacher = teachers.find((t) => t.id === id);
    const resolvedPosition = updates.position || oldTeacher?.position || '';
    if (
      (updates.position !== undefined || updates.assignedSupervisorId !== undefined) &&
      resolvedPosition.toLowerCase().includes('master teacher')
    ) {
      updates.assignedSupervisorId = 'sup-principal';
    }
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    const actor = getActor();
    const changes: { field: string; previousValue?: string; newValue?: string }[] = [];
    if (oldTeacher) {
      if (updates.fullName && updates.fullName !== oldTeacher.fullName) {
        changes.push({ field: 'Full Name', previousValue: oldTeacher.fullName, newValue: updates.fullName });
      }
      if (updates.position && updates.position !== oldTeacher.position) {
        changes.push({ field: 'Position', previousValue: oldTeacher.position, newValue: updates.position });
      }
      if (updates.department && updates.department !== oldTeacher.department) {
        changes.push({ field: 'Department', previousValue: oldTeacher.department, newValue: updates.department });
      }
      if (updates.subject !== undefined && updates.subject !== oldTeacher.subject) {
        changes.push({ field: 'Subject / Specialization Taught', previousValue: oldTeacher.subject || 'None', newValue: updates.subject || 'None' });
      }
      if (updates.assignedSupervisorId !== undefined && updates.assignedSupervisorId !== oldTeacher.assignedSupervisorId) {
        const oldSup = supervisors.find((s) => s.id === oldTeacher.assignedSupervisorId);
        const newSup = supervisors.find((s) => s.id === updates.assignedSupervisorId);
        changes.push({
          field: 'Instructional Supervisor',
          previousValue: oldSup ? oldSup.fullName : 'Unassigned',
          newValue: newSup ? newSup.fullName : 'Unassigned',
        });
      }
      if (updates.assignedMentorId !== undefined && updates.assignedMentorId !== oldTeacher.assignedMentorId) {
        const oldMentor = mentors.find((m) => m.id === oldTeacher.assignedMentorId);
        const newMentor = mentors.find((m) => m.id === updates.assignedMentorId);
        changes.push({
          field: 'Assigned Mentor',
          previousValue: oldMentor ? oldMentor.fullName : 'Unassigned',
          newValue: newMentor ? newMentor.fullName : 'Unassigned',
        });
      }
      if (updates.email && updates.email !== oldTeacher.email) {
        changes.push({ field: 'Email', previousValue: oldTeacher.email, newValue: updates.email });
      }
      if (updates.status && updates.status !== oldTeacher.status) {
        changes.push({ field: 'Status', previousValue: oldTeacher.status, newValue: updates.status });
      }
      if (updates.driveUrl !== undefined && updates.driveUrl !== oldTeacher.driveUrl) {
        changes.push({
          field: 'Google Drive Link',
          previousValue: oldTeacher.driveUrl || 'None',
          newValue: updates.driveUrl || 'Cleared',
        });
      }
    }

    // Synchronize supervisor assignments if assignedSupervisorId was updated
    if (updates.assignedSupervisorId !== undefined) {
      const newSupId = updates.assignedSupervisorId;
      setSupervisors((prev) =>
        prev.map((s) => {
          const cleanIds = (s.assignedTeacherIds || []).filter((tId) => tId !== id);
          if (s.id === newSupId) {
            return { ...s, assignedTeacherIds: [...cleanIds, id] };
          }
          return { ...s, assignedTeacherIds: cleanIds };
        })
      );
    }

    // Synchronize mentor assignments if assignedMentorId was updated
    if (updates.assignedMentorId !== undefined) {
      const newMentorId = updates.assignedMentorId;
      setMentors((prev) =>
        prev.map((m) => {
          const cleanIds = (m.assignedTeacherIds || []).filter((tId) => tId !== id);
          if (m.id === newMentorId) {
            return { ...m, assignedTeacherIds: [...cleanIds, id] };
          }
          return { ...m, assignedTeacherIds: cleanIds };
        })
      );
    }

    logAuditEvent({
      category: 'Roster / Teaching Personnel',
      action: 'UPDATE',
      targetId: id,
      targetName: updates.fullName || oldTeacher?.fullName || id,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Updated faculty roster profile for ${oldTeacher?.fullName || id}. ${changes.length > 0 ? `Modified: ${changes.map((c) => c.field).join(', ')}.` : ''}`,
      severity: 'notice',
      changesSummary: changes.length > 0 ? changes : undefined,
    });
  };

  const updateTeacherPassword = (id: string, newPass: string) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, password: newPass } : t))
    );
  };

  const deleteTeacher = (id: string) => {
    const oldTeacher = teachers.find((t) => t.id === id);
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    // Remove from supervisor and mentor assignments
    setSupervisors((prev) =>
      prev.map((s) => ({
        ...s,
        assignedTeacherIds: s.assignedTeacherIds.filter((tId) => tId !== id),
      }))
    );
    setMentors((prev) =>
      prev.map((m) => ({
        ...m,
        assignedTeacherIds: (m.assignedTeacherIds || []).filter((tId) => tId !== id),
      }))
    );

    const actor = getActor();
    logAuditEvent({
      category: 'Roster / Teaching Personnel',
      action: 'DELETE',
      targetId: id,
      targetName: oldTeacher ? oldTeacher.fullName : id,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Removed faculty member ${oldTeacher ? oldTeacher.fullName : id} (${oldTeacher ? oldTeacher.position : 'Teacher'}) from active school roster.`,
      severity: 'warning',
      changesSummary: oldTeacher
        ? [
            { field: 'Employee ID', previousValue: oldTeacher.employeeId, newValue: 'Archived' },
            { field: 'Position', previousValue: oldTeacher.position, newValue: 'Archived' },
            { field: 'Roster Status', previousValue: 'Active', newValue: 'Deleted' },
          ]
        : undefined,
    });
  };

  const addSupervisor = (sup: Omit<Supervisor, 'id' | 'totalObservationsThisTerm'>) => {
    const newId = `sup-${Date.now()}`;
    const newSupervisor: Supervisor = {
      ...sup,
      id: newId,
      password: sup.password || 'omes123',
      totalObservationsThisTerm: 0,
    };
    setSupervisors((prev) => [newSupervisor, ...prev]);

    const actor = getActor();
    logAuditEvent({
      category: 'Roster / Instructional Supervisor',
      action: 'CREATE',
      targetId: newId,
      targetName: sup.fullName,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Appointed Instructional Supervisor ${sup.fullName} (${sup.position}, ${sup.department}).`,
      severity: 'info',
      changesSummary: [
        { field: 'Supervisor Name', previousValue: 'None', newValue: sup.fullName },
        { field: 'Position / Rank', previousValue: 'None', newValue: sup.position },
        { field: 'Department / Sector', previousValue: 'None', newValue: sup.department },
      ],
    });
  };

  const updateSupervisor = (id: string, updates: Partial<Supervisor>) => {
    const oldSup = supervisors.find((s) => s.id === id);
    setSupervisors((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );

    const actor = getActor();
    const changes: { field: string; previousValue?: string; newValue?: string }[] = [];
    if (oldSup) {
      if (updates.fullName && updates.fullName !== oldSup.fullName) {
        changes.push({ field: 'Full Name', previousValue: oldSup.fullName, newValue: updates.fullName });
      }
      if (updates.position && updates.position !== oldSup.position) {
        changes.push({ field: 'Position', previousValue: oldSup.position, newValue: updates.position });
      }
      if (updates.department && updates.department !== oldSup.department) {
        changes.push({ field: 'Department / Sector', previousValue: oldSup.department, newValue: updates.department });
      }
      if (updates.email && updates.email !== oldSup.email) {
        changes.push({ field: 'Email', previousValue: oldSup.email, newValue: updates.email });
      }
      if (updates.phone && updates.phone !== oldSup.phone) {
        changes.push({ field: 'Phone', previousValue: oldSup.phone, newValue: updates.phone });
      }
    }

    logAuditEvent({
      category: 'Roster / Instructional Supervisor',
      action: 'UPDATE',
      targetId: id,
      targetName: updates.fullName || oldSup?.fullName || id,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Updated Instructional Supervisor profile for ${oldSup?.fullName || id}.`,
      severity: 'notice',
      changesSummary: changes.length > 0 ? changes : undefined,
    });
  };

  const updateSupervisorPassword = (id: string, newPass: string) => {
    setSupervisors((prev) =>
      prev.map((s) => (s.id === id ? { ...s, password: newPass } : s))
    );
  };

  const deleteSupervisor = (id: string) => {
    const oldSup = supervisors.find((s) => s.id === id);
    setSupervisors((prev) => prev.filter((s) => s.id !== id));
    // Clear assigned supervisor from teachers assigned to this supervisor
    setTeachers((prev) =>
      prev.map((t) => (t.assignedSupervisorId === id ? { ...t, assignedSupervisorId: '' } : t))
    );

    const actor = getActor();
    logAuditEvent({
      category: 'Roster / Instructional Supervisor',
      action: 'DELETE',
      targetId: id,
      targetName: oldSup ? oldSup.fullName : id,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Removed Instructional Supervisor ${oldSup ? oldSup.fullName : id} and unlinked ${oldSup?.assignedTeacherIds?.length || 0} mentee(s).`,
      severity: 'warning',
      changesSummary: [
        { field: 'Supervisory Status', previousValue: 'Active', newValue: 'De-registered' },
      ],
    });
  };

  const assignTeacherToSupervisor = (teacherId: string, supervisorId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    const oldSup = teacher?.assignedSupervisorId ? supervisors.find((s) => s.id === teacher.assignedSupervisorId) : null;
    const newSup = supervisors.find((s) => s.id === supervisorId);

    setTeachers((prev) =>
      prev.map((t) => (t.id === teacherId ? { ...t, assignedSupervisorId: supervisorId } : t))
    );
    setSupervisors((prev) =>
      prev.map((s) => {
        const withoutTeacher = s.assignedTeacherIds.filter((id) => id !== teacherId);
        if (s.id === supervisorId) {
          return { ...s, assignedTeacherIds: [...withoutTeacher, teacherId] };
        }
        return { ...s, assignedTeacherIds: withoutTeacher };
      })
    );

    const actor = getActor();
    logAuditEvent({
      category: 'Roster / Instructional Supervisor',
      action: 'ASSIGNMENT',
      targetId: teacherId,
      targetName: teacher ? teacher.fullName : teacherId,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Assigned faculty member ${teacher ? teacher.fullName : teacherId} to Instructional Supervisor ${newSup ? newSup.fullName : (supervisorId || 'Unassigned')}.`,
      severity: 'notice',
      changesSummary: [
        {
          field: 'Supervisor Assignment',
          previousValue: oldSup ? oldSup.fullName : 'Unassigned',
          newValue: newSup ? newSup.fullName : (supervisorId ? 'Supervisor ID: ' + supervisorId : 'Unassigned'),
        },
      ],
    });
  };

  const addMentor = (mentor: Omit<Mentor, 'id' | 'totalEvaluationsThisTerm'>) => {
    const newId = `mentor-${Date.now()}`;
    const newMentor: Mentor = {
      ...mentor,
      id: newId,
      password: mentor.password || 'omes123',
      totalEvaluationsThisTerm: 0,
    };
    setMentors((prev) => [newMentor, ...prev]);

    const actor = getActor();
    logAuditEvent({
      category: 'Roster / Mentor',
      action: 'CREATE',
      targetId: newId,
      targetName: mentor.fullName,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Designated Mentor ${mentor.fullName} (${mentor.position}, ${mentor.department}) for Lesson Plans, Assessments, and IMs & LMs.`,
      severity: 'info',
    });
  };

  const updateMentor = (id: string, updates: Partial<Mentor>) => {
    const oldMentor = mentors.find((m) => m.id === id);
    setMentors((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));

    const actor = getActor();
    logAuditEvent({
      category: 'Roster / Mentor',
      action: 'UPDATE',
      targetId: id,
      targetName: updates.fullName || oldMentor?.fullName || id,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Updated Mentor profile for ${oldMentor?.fullName || id}.`,
      severity: 'notice',
    });
  };

  const updateMentorPassword = (id: string, newPass: string) => {
    setMentors((prev) => prev.map((m) => (m.id === id ? { ...m, password: newPass } : m)));
  };

  const deleteMentor = (id: string) => {
    const oldMentor = mentors.find((m) => m.id === id);
    setMentors((prev) => prev.filter((m) => m.id !== id));
    setTeachers((prev) =>
      prev.map((t) => (t.assignedMentorId === id ? { ...t, assignedMentorId: '' } : t))
    );

    const actor = getActor();
    logAuditEvent({
      category: 'Roster / Mentor',
      action: 'DELETE',
      targetId: id,
      targetName: oldMentor ? oldMentor.fullName : id,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Removed Mentor ${oldMentor ? oldMentor.fullName : id} from mentorship directory.`,
      severity: 'warning',
    });
  };

  const assignTeacherToMentor = (teacherId: string, mentorId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    const oldMentor = teacher?.assignedMentorId
      ? mentors.find((m) => m.id === teacher.assignedMentorId)
      : null;
    const newMentor = mentors.find((m) => m.id === mentorId);

    setTeachers((prev) =>
      prev.map((t) => (t.id === teacherId ? { ...t, assignedMentorId: mentorId } : t))
    );
    setMentors((prev) =>
      prev.map((m) => {
        const withoutTeacher = (m.assignedTeacherIds || []).filter((id) => id !== teacherId);
        if (m.id === mentorId) {
          return { ...m, assignedTeacherIds: [...withoutTeacher, teacherId] };
        }
        return { ...m, assignedTeacherIds: withoutTeacher };
      })
    );

    const actor = getActor();
    logAuditEvent({
      category: 'Roster / Mentor',
      action: 'ASSIGNMENT',
      targetId: teacherId,
      targetName: teacher ? teacher.fullName : teacherId,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Assigned faculty member ${teacher ? teacher.fullName : teacherId} to Mentor ${newMentor ? newMentor.fullName : mentorId || 'Unassigned'}.`,
      severity: 'notice',
      changesSummary: [
        {
          field: 'Mentor Assignment',
          previousValue: oldMentor ? oldMentor.fullName : 'Unassigned',
          newValue: newMentor ? newMentor.fullName : 'Unassigned',
        },
      ],
    });
  };

  const addObservation = (obs: Omit<ClassroomObservation, 'id' | 'observationNo'>): ClassroomObservation => {
    const count = observations.length + 1;
    const observationNo = `COT-2026-Q1-${String(count).padStart(3, '0')}`;
    const newObs: ClassroomObservation = {
      ...obs,
      id: `obs-${Date.now()}`,
      observationNo,
    };
    setObservations((prev) => [newObs, ...prev]);

    // increment teacher completed count
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === obs.teacherId
          ? {
              ...t,
              observationsCompleted: (t.observationsCompleted || 0) + 1,
              lastObservationDate: obs.date,
            }
          : t
      )
    );

    // increment supervisor count
    setSupervisors((prev) =>
      prev.map((s) =>
        s.id === obs.supervisorId
          ? {
              ...s,
              totalObservationsThisTerm: (s.totalObservationsThisTerm || 0) + 1,
            }
          : s
      )
    );

    const actor = getActor();
    const avgScore = typeof obs.averageScore === 'number'
      ? obs.averageScore.toFixed(2)
      : (obs.ratings && obs.ratings.length > 0
          ? (obs.ratings.reduce((acc, c) => acc + c.score, 0) / obs.ratings.length).toFixed(2)
          : 'N/A');

    logAuditEvent({
      category: 'Classroom Observation (COT)',
      action: 'CREATE',
      targetId: newObs.id,
      targetName: `${observationNo} (${obs.teacherName})`,
      actorName: obs.supervisorName || actor.name,
      actorRole: 'supervisor',
      details: `Recorded official Classroom Observation ${observationNo} for ${obs.teacherName} in Grade ${obs.gradeAndSection || 'N/A'} (${obs.subjectTaught}). Overall Rating: ${avgScore}.`,
      severity: 'info',
      changesSummary: [
        { field: 'Observation Code', previousValue: 'N/A', newValue: observationNo },
        { field: 'Teacher Evaluated', previousValue: 'N/A', newValue: obs.teacherName },
        { field: 'Instructional Supervisor', previousValue: 'N/A', newValue: obs.supervisorName },
        { field: 'Average Score', previousValue: 'N/A', newValue: String(avgScore) },
        { field: 'Observation Date', previousValue: 'N/A', newValue: obs.date },
      ],
    });

    // Trigger in-app notification alerting the teacher about the scheduled/recorded observation
    addNotification({
      recipientTeacherId: obs.teacherId,
      recipientTeacherName: obs.teacherName,
      type: 'observation_scheduled',
      title: `Classroom Observation Scheduled (${observationNo})`,
      message: `A new ${obs.evaluationType === 'classroom' ? 'Classroom Observation Monitoring' : 'COT-PMES Classroom Observation'} (${observationNo}) for ${obs.subjectTaught || 'Subject'} (${obs.gradeAndSection || 'Class'}) has been scheduled on ${obs.date}${obs.timeStart ? ` at ${obs.timeStart}` : ''} with Instructional Supervisor ${obs.supervisorName}.`,
      targetTab: 'observation',
      referenceCode: observationNo,
      supervisorName: obs.supervisorName,
      statusBadge: obs.status || 'Scheduled',
    });

    // Automatically invoke Gemini Structured Outputs for PMCF & 4-Column FAR review
    const ratingSummaryLines =
      obs.ratings && obs.ratings.length > 0
        ? obs.ratings.map((r) => {
            const val = r.evidentStatus
              ? r.evidentStatus === 'E'
                ? 'Evident (E)'
                : 'Not Evident (NE)'
              : `Score ${r.score}/7`;
            return `- ${r.title}: ${val}${r.comments ? ` | Note: ${r.comments}` : ''}`;
          })
        : [];
    ratingSummaryLines.push(`- Overall Rating: ${obs.overallRating} (Average Score: ${avgScore})`);

    const obsNotesParts = [
      obs.topicTitle ? `Lesson Topic: ${obs.topicTitle}` : '',
      obs.generalObservations ? `General Observations: ${obs.generalObservations}` : '',
      obs.strengths ? `Strengths / Commendations: ${obs.strengths}` : '',
      obs.areasForDevelopment ? `Areas for Development: ${obs.areasForDevelopment}` : '',
      obs.preConferenceNotes ? `Pre-Conference Notes: ${obs.preConferenceNotes}` : '',
      obs.postConferenceNotes ? `Post-Conference Notes: ${obs.postConferenceNotes}` : '',
      obs.starEvidenceNotes ? `STAR Brief Evidence/Notes: ${obs.starEvidenceNotes}` : '',
    ].filter(Boolean);

    startAiPmcfFarGeneration({
      sourceRecordId: newObs.id,
      sourceCode: observationNo,
      evaluationType: obs.evaluationType === 'classroom' ? 'Classroom Observation' : 'COT-PMES',
      category: obs.evaluationType === 'classroom' ? 'classroom' : 'cot-pmes',
      coachingMechanism: obs.evaluationType === 'classroom' ? 'Classroom Observation' : 'COT-PMES',
      teacherId: obs.teacherId,
      teacherName: obs.teacherName,
      subjectGrade: `${obs.subjectTaught} (${obs.gradeAndSection})`,
      supervisorId: obs.supervisorId,
      supervisorName: obs.supervisorName,
      date: obs.date,
      term: obs.quarterTerm || schoolProfile.currentTerm || 'Term 1',
      weekLabel: `${obs.quarterTerm || 'Term 1'} · ${observationNo}`,
      indicatorScoresList: ratingSummaryLines.join('\n'),
      observerNotes: obsNotesParts.join('\n'),
      resolved: obs.status === 'Completed',
      explicitRole: 'supervisor',
    });

    return newObs;
  };

  const updateObservation = (id: string, updates: Partial<ClassroomObservation>) => {
    const oldObs = observations.find((o) => o.id === id);
    setObservations((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );

    const actor = getActor();
    const changes: { field: string; previousValue?: string; newValue?: string }[] = [];
    if (oldObs) {
      if (updates.subjectTaught && updates.subjectTaught !== oldObs.subjectTaught) {
        changes.push({ field: 'Subject Taught', previousValue: oldObs.subjectTaught, newValue: updates.subjectTaught });
      }
      if (updates.gradeAndSection && updates.gradeAndSection !== oldObs.gradeAndSection) {
        changes.push({ field: 'Grade & Section', previousValue: oldObs.gradeAndSection, newValue: updates.gradeAndSection });
      }
      if (updates.date && updates.date !== oldObs.date) {
        changes.push({ field: 'Date', previousValue: oldObs.date, newValue: updates.date });
      }
      if (updates.postConferenceNotes && updates.postConferenceNotes !== oldObs.postConferenceNotes) {
        changes.push({ field: 'Post-Conference Notes', previousValue: 'Previous Note', newValue: 'Updated Note' });
      }

      if (updates.date !== oldObs.date || updates.status !== oldObs.status) {
        const effectiveDate = updates.date || oldObs.date;
        const effectiveSup = updates.supervisorName || oldObs.supervisorName;
        addNotification({
          recipientTeacherId: updates.teacherId || oldObs.teacherId,
          recipientTeacherName: updates.teacherName || oldObs.teacherName,
          type: 'observation_scheduled',
          title: `Classroom Observation Updated (${oldObs.observationNo})`,
          message: `Classroom Observation ${oldObs.observationNo} (${updates.subjectTaught || oldObs.subjectTaught}) has been updated for ${effectiveDate} with ${effectiveSup}. Status: ${updates.status || oldObs.status}.`,
          targetTab: 'observation',
          referenceCode: oldObs.observationNo,
          supervisorName: effectiveSup,
          statusBadge: updates.status || oldObs.status,
        });
      }
    }

    logAuditEvent({
      category: 'Classroom Observation (COT)',
      action: 'UPDATE',
      targetId: id,
      targetName: oldObs ? `${oldObs.observationNo} (${oldObs.teacherName})` : id,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Updated Classroom Observation record ${oldObs ? oldObs.observationNo : id} for ${oldObs ? oldObs.teacherName : id}.`,
      severity: 'notice',
      changesSummary: changes.length > 0 ? changes : undefined,
    });
  };

  const deleteObservation = (id: string) => {
    const oldObs = observations.find((o) => o.id === id);
    setObservations((prev) => prev.filter((o) => o.id !== id));

    const actor = getActor();
    logAuditEvent({
      category: 'Classroom Observation (COT)',
      action: 'DELETE',
      targetId: id,
      targetName: oldObs ? `${oldObs.observationNo} (${oldObs.teacherName})` : id,
      actorName: actor.name,
      actorRole: actor.role,
      details: `Deleted Classroom Observation ${oldObs ? oldObs.observationNo : id} for ${oldObs ? oldObs.teacherName : id}.`,
      severity: 'warning',
      changesSummary: oldObs
        ? [
            { field: 'Observation Code', previousValue: oldObs.observationNo, newValue: 'Deleted' },
            { field: 'Teacher Name', previousValue: oldObs.teacherName, newValue: 'Archived' },
          ]
        : undefined,
    });
  };

  // Centralized Persistence Helper for PMCF & FAR Reports
  const persistPmcfAndFar = (params: {
    sourceRecordId: string;
    sourceCode: string;
    category: SupervisionCategory;
    coachingMechanism: PMCFRecord['coachingMechanism'];
    teacherId?: string;
    teacherName: string;
    farTeacherDisplay?: string;
    supervisorId?: string;
    supervisorName?: string;
    mentorId?: string;
    mentorName?: string;
    explicitRole?: 'admin' | 'supervisor' | 'mentor';
    date?: string;
    term?: string;
    weekLabel: string;
    criticalIncident: string;
    actionPlan: string;
    impact: string;
    findings: string;
    analysis: string;
    recommendations: string;
    pmcfStatusOverride?: PMCFRecord['status'];
    resolved?: boolean;
  }) => {
    const actor = getActor();
    const matchedTeacher = teachers.find(
      (t) =>
        (params.teacherId && t.id === params.teacherId) ||
        t.fullName.trim().toLowerCase() === params.teacherName.trim().toLowerCase()
    );
    const resolvedTeacherId = params.teacherId || matchedTeacher?.id || '';
    const resolvedSupId = params.supervisorId || matchedTeacher?.assignedSupervisorId || '';
    const matchedSup = supervisors.find((s) => s.id === resolvedSupId);
    const resolvedSupName = params.supervisorName || matchedSup?.fullName || '';

    const evaluatorRole: 'admin' | 'supervisor' | 'mentor' =
      params.explicitRole ||
      (actor.role === 'mentor' ? 'mentor' : actor.role === 'supervisor' ? 'supervisor' : 'admin');

    const resolvedMentorId =
      params.mentorId ||
      (evaluatorRole === 'mentor' ? actor.mentorId || actor.id : matchedTeacher?.assignedMentorId || '');
    const matchedMentor = mentors.find((m) => m.id === resolvedMentorId);
    const resolvedMentorName =
      params.mentorName ||
      (evaluatorRole === 'mentor' ? actor.name : matchedMentor?.fullName || '');

    const reportDate = params.date || new Date().toISOString().slice(0, 10);
    const reportTerm = params.term || schoolProfile.currentTerm || 'Term 1';
    const year = new Date().getFullYear();

    setPmcfRecords((prev) => {
      const existingIndex = prev.findIndex((r) => r.sourceRecordId === params.sourceRecordId);
      const pmcfStatus: PMCFRecord['status'] =
        params.pmcfStatusOverride || (params.resolved ? 'Resolved' : 'In Progress');
      if (existingIndex >= 0) {
        return prev.map((r, idx) =>
          idx === existingIndex
            ? {
                ...r,
                date: reportDate,
                criticalIncidentDescription: params.criticalIncident,
                actionPlanOutput: params.actionPlan,
                impactOnJobPerformance: params.impact,
                status: pmcfStatus,
                evaluatorRole,
                mentorId: resolvedMentorId || r.mentorId,
                mentorName: resolvedMentorName || r.mentorName,
              }
            : r
        );
      }
      const nextNum = prev.length + 1;
      const newPmcf: PMCFRecord = {
        id: `pmcf-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        recordNo: `PMCF-${year}-${String(nextNum).padStart(3, '0')}`,
        category: params.category,
        teacherId: resolvedTeacherId,
        teacherName: params.teacherName,
        supervisorId: resolvedSupId,
        supervisorName: resolvedSupName || actor.name,
        mentorId: resolvedMentorId || undefined,
        mentorName: resolvedMentorName || undefined,
        evaluatorRole,
        sourceRecordId: params.sourceRecordId,
        sourceCode: params.sourceCode,
        date: reportDate,
        quarterTerm: reportTerm,
        criticalIncidentDescription: params.criticalIncident,
        coachingMechanism: params.coachingMechanism,
        actionPlanOutput: params.actionPlan,
        impactOnJobPerformance: params.impact,
        status: pmcfStatus,
      };
      return [newPmcf, ...prev];
    });

    setFarRecords((prev) => {
      const existingIndex = prev.findIndex((r) => r.sourceRecordId === params.sourceRecordId);
      const farResolved =
        params.pmcfStatusOverride === 'Resolved' || Boolean(params.resolved);
      const farStatus: FarRecord['status'] = farResolved ? 'Verified' : 'In Progress';
      const farTeacherName = params.farTeacherDisplay?.trim() || params.teacherName;
      if (existingIndex >= 0) {
        return prev.map((r, idx) =>
          idx === existingIndex
            ? {
                ...r,
                date: reportDate,
                teacherName: farTeacherName,
                findings: params.findings,
                analysis: params.analysis,
                recommendations: params.recommendations,
                status: farStatus,
                actionTaken: farResolved,
                evaluatorRole,
                mentorId: resolvedMentorId || r.mentorId,
                mentorName: resolvedMentorName || r.mentorName,
              }
            : r
        );
      }
      const nextNum = prev.length + 1;
      const newFar: FarRecord = {
        id: `far-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        farCode: `FAR-${year}-${String(nextNum).padStart(3, '0')}`,
        category: params.category,
        date: reportDate,
        teacherId: resolvedTeacherId,
        teacherName: farTeacherName,
        supervisorId: resolvedSupId,
        supervisorName: resolvedSupName || actor.name,
        mentorId: resolvedMentorId || undefined,
        mentorName: resolvedMentorName || undefined,
        evaluatorRole,
        sourceRecordId: params.sourceRecordId,
        sourceCode: params.sourceCode,
        term: reportTerm,
        lessonPlanWeek: params.weekLabel,
        findings: params.findings,
        analysis: params.analysis,
        recommendations: params.recommendations,
        status: farStatus,
        actionTaken: farResolved,
      };
      return [newFar, ...prev];
    });

    if (evaluatorRole === 'mentor' && resolvedMentorId) {
      setMentors((prev) =>
        prev.map((m) =>
          m.id === resolvedMentorId
            ? { ...m, totalEvaluationsThisTerm: (m.totalEvaluationsThisTerm || 0) + 1 }
            : m
        )
      );
    }

    if (resolvedTeacherId || params.teacherName) {
      addNotification({
        recipientTeacherId: resolvedTeacherId,
        recipientTeacherName: params.teacherName,
        type: 'pmcf_far_generated',
        category: params.category,
        evaluatorRole,
        title: `PMCF & FAR Generated (${params.sourceCode})`,
        message: `${evaluatorRole === 'mentor' ? `Mentor ${resolvedMentorName || actor.name}` : `Instructional Supervisor ${resolvedSupName || actor.name}`} evaluated your ${params.coachingMechanism} (${params.sourceCode}) and published PMCF & FAR reports in your account.`,
        targetTab: 'far-pmcf',
        referenceCode: params.sourceCode,
        supervisorName: evaluatorRole === 'mentor' ? resolvedMentorName || actor.name : resolvedSupName || actor.name,
        statusBadge: params.pmcfStatusOverride === 'Resolved' || params.resolved ? 'Verified' : 'In Progress',
      });
    }
  };

  // Call backend POST /api/generate-pmcf-far (Gemini Structured Outputs)
  const fetchGeminiPmcfAndFar = async (draft: AiPmcfFarDraftSession) => {
    const requestId = ++activeAiRequestIdRef.current;
    try {
      const response = await fetch('/api/generate-pmcf-far', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationType: draft.evaluationType,
          date: draft.date,
          teacherName: draft.teacherName,
          careerStage: draft.careerStage,
          subjectGrade: draft.subjectGrade,
          indicatorScoresList: draft.indicatorScoresList,
          observerNotes: draft.observerNotes,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (activeAiRequestIdRef.current !== requestId) return;

      if (!response.ok) {
        const errMsg =
          typeof payload?.error === 'string' && payload.error.trim()
            ? payload.error
            : `Gemini API request failed with status ${response.status}.`;
        setActiveAiDraft((prev) =>
          prev && prev.sourceRecordId === draft.sourceRecordId
            ? { ...prev, loading: false, error: errMsg, generated: null }
            : prev
        );
        return;
      }

      if (!payload?.pmcf || !payload?.far) {
        setActiveAiDraft((prev) =>
          prev && prev.sourceRecordId === draft.sourceRecordId
            ? {
                ...prev,
                loading: false,
                error: 'Server returned an incomplete PMCF/FAR JSON structure.',
                generated: null,
              }
            : prev
        );
        return;
      }

      setActiveAiDraft((prev) =>
        prev && prev.sourceRecordId === draft.sourceRecordId
          ? {
              ...prev,
              loading: false,
              error: null,
              generated: {
                pmcf: payload.pmcf,
                far: payload.far,
              },
            }
          : prev
      );
    } catch (err) {
      if (activeAiRequestIdRef.current !== requestId) return;
      const errMsg =
        err instanceof Error
          ? `Could not connect to the Gemini generation endpoint: ${err.message}`
          : 'Network error while generating PMCF and FAR.';
      setActiveAiDraft((prev) =>
        prev && prev.sourceRecordId === draft.sourceRecordId
          ? { ...prev, loading: false, error: errMsg, generated: null }
          : prev
      );
    }
  };

  const startAiPmcfFarGeneration = (params: {
    sourceRecordId: string;
    sourceCode: string;
    evaluationType: string;
    category: SupervisionCategory;
    coachingMechanism: PMCFRecord['coachingMechanism'];
    teacherId?: string;
    teacherName: string;
    subjectGrade: string;
    supervisorId?: string;
    supervisorName?: string;
    mentorId?: string;
    mentorName?: string;
    explicitRole?: 'admin' | 'supervisor' | 'mentor';
    date?: string;
    term?: string;
    weekLabel: string;
    indicatorScoresList: string;
    observerNotes: string;
    resolved?: boolean;
  }) => {
    const actor = getActor();
    if (actor.role === 'teacher') {
      return;
    }

    const matchedTeacher = teachers.find(
      (t) =>
        (params.teacherId && t.id === params.teacherId) ||
        t.fullName.trim().toLowerCase() === params.teacherName.trim().toLowerCase()
    );
    const resolvedTeacherId = params.teacherId || matchedTeacher?.id || '';
    const resolvedSupId = params.supervisorId || matchedTeacher?.assignedSupervisorId || '';
    const matchedSup = supervisors.find((s) => s.id === resolvedSupId);
    const resolvedSupName = params.supervisorName || matchedSup?.fullName || actor.name;

    const evaluatorRole: 'admin' | 'supervisor' | 'mentor' =
      params.explicitRole ||
      (actor.role === 'mentor' ? 'mentor' : actor.role === 'supervisor' ? 'supervisor' : 'admin');

    const resolvedMentorId =
      params.mentorId ||
      (evaluatorRole === 'mentor' ? actor.mentorId || actor.id : matchedTeacher?.assignedMentorId || '');
    const matchedMentor = mentors.find((m) => m.id === resolvedMentorId);
    const resolvedMentorName =
      params.mentorName ||
      (evaluatorRole === 'mentor' ? actor.name : matchedMentor?.fullName || '');

    const posLower = (matchedTeacher?.position || '').toLowerCase();
    const careerStage =
      posLower.includes('master teacher') || posLower.includes('head teacher') || posLower.includes('principal')
        ? `Highly Proficient (${matchedTeacher?.position})`
        : matchedTeacher?.position
        ? `Proficient (${matchedTeacher.position})`
        : 'Proficient';

    const draft: AiPmcfFarDraftSession = {
      sourceRecordId: params.sourceRecordId,
      sourceCode: params.sourceCode,
      evaluationType: params.evaluationType,
      category: params.category,
      coachingMechanism: params.coachingMechanism,
      teacherId: resolvedTeacherId,
      teacherName: params.teacherName,
      careerStage,
      subjectGrade: params.subjectGrade,
      supervisorId: resolvedSupId,
      supervisorName: resolvedSupName,
      mentorId: resolvedMentorId || undefined,
      mentorName: resolvedMentorName || undefined,
      evaluatorRole,
      date: params.date || new Date().toISOString().slice(0, 10),
      term: params.term || schoolProfile.currentTerm || 'Term 1',
      weekLabel: params.weekLabel,
      indicatorScoresList: params.indicatorScoresList,
      observerNotes: params.observerNotes,
      resolved: params.resolved,
      loading: true,
      error: null,
      generated: null,
    };

    setActiveAiDraft(draft);
    void fetchGeminiPmcfAndFar(draft);
  };

  const dismissAiDraft = () => {
    activeAiRequestIdRef.current++;
    setActiveAiDraft(null);
  };

  const regenerateAiDraft = async () => {
    if (!activeAiDraft) return;
    const refreshed: AiPmcfFarDraftSession = {
      ...activeAiDraft,
      loading: true,
      error: null,
    };
    setActiveAiDraft(refreshed);
    await fetchGeminiPmcfAndFar(refreshed);
  };

  const saveReviewedAiPmcfFar = (
    editedPmcf: AiGeneratedPmcfPayload,
    editedFar: AiGeneratedFarPayload,
    pmcfStatus?: PMCFRecord['status']
  ) => {
    if (!activeAiDraft) return;
    persistPmcfAndFar({
      sourceRecordId: activeAiDraft.sourceRecordId,
      sourceCode: activeAiDraft.sourceCode,
      category: activeAiDraft.category,
      coachingMechanism: activeAiDraft.coachingMechanism,
      teacherId: activeAiDraft.teacherId,
      teacherName: activeAiDraft.teacherName,
      farTeacherDisplay: editedFar.teacher || activeAiDraft.teacherName,
      supervisorId: activeAiDraft.supervisorId,
      supervisorName: activeAiDraft.supervisorName,
      mentorId: activeAiDraft.mentorId,
      mentorName: activeAiDraft.mentorName,
      explicitRole: activeAiDraft.evaluatorRole,
      date: editedPmcf.date || activeAiDraft.date,
      term: activeAiDraft.term,
      weekLabel: activeAiDraft.weekLabel,
      criticalIncident: editedPmcf.critical_incidents_and_outputs,
      actionPlan: editedPmcf.action_plan_intervention,
      impact: editedPmcf.expected_output,
      findings: editedFar.findings,
      analysis: editedFar.analysis,
      recommendations: editedFar.recommendations,
      pmcfStatusOverride: pmcfStatus,
      resolved: pmcfStatus ? pmcfStatus === 'Resolved' : activeAiDraft.resolved,
    });
  };

  const addLessonPlan = (plan: Omit<LessonPlanCheck, 'id' | 'checkCode'>) => {
    const actor = getActor();
    const weekTag = String(plan.weekNumber).toUpperCase().startsWith('CO')
      ? String(plan.weekNumber).toUpperCase()
      : `W${String(plan.weekNumber).padStart(2, '0')}`;
    const code = `DLL-2026-${weekTag}-${String(lessonPlans.length + 1).padStart(2, '0')}`;
    const resolvedEvaluatorRole =
      plan.evaluatorRole || (actor.role === 'mentor' ? 'mentor' : actor.role === 'supervisor' ? 'supervisor' : undefined);
    const newPlan: LessonPlanCheck = {
      ...plan,
      id: `lp-${Date.now()}`,
      checkCode: code,
      evaluatorRole: resolvedEvaluatorRole,
      mentorId: plan.mentorId || (actor.role === 'mentor' ? actor.mentorId || actor.id : undefined),
      mentorName: plan.mentorName || (actor.role === 'mentor' ? actor.name : undefined),
    };
    setLessonPlans((prev) => [newPlan, ...prev]);

    if (
      newPlan.status === 'Approved' ||
      newPlan.status === 'Needs Revision' ||
      (actor.role !== 'teacher' && Boolean(newPlan.starEvidenceNotes?.trim()))
    ) {
      const checklistLines = [
        `- MELC Aligned: ${newPlan.checklist.melcAligned ? 'Evident' : 'Not Evident'}`,
        `- Clear Objectives: ${newPlan.checklist.clearObjectives ? 'Evident' : 'Not Evident'}`,
        `- Learning Resources Adequate: ${newPlan.checklist.learningResourcesAdequate ? 'Evident' : 'Not Evident'}`,
        `- Pedagogical Procedures Sequenced (ILAW): ${newPlan.checklist.pedagogicalProceduresSequenced ? 'Evident' : 'Not Evident'}`,
        `- Formative Assessment Included: ${newPlan.checklist.formativeAssessmentIncluded ? 'Evident' : 'Not Evident'}`,
        `- Reflection Completed: ${newPlan.checklist.reflectionCompleted ? 'Evident' : 'Not Evident'}`,
        `- Overall Inspection Status: ${newPlan.status} (Week ${newPlan.weekNumber}, ${newPlan.quarterTerm})`,
      ];
      const lpNotes = [
        `Lesson Title: ${newPlan.lessonTitle}`,
        newPlan.remarks ? `Remarks: ${newPlan.remarks}` : '',
        newPlan.supervisorFeedback ? `Supervisor/Mentor Feedback: ${newPlan.supervisorFeedback}` : '',
        newPlan.starEvidenceNotes ? `STAR Brief Evidence/Notes: ${newPlan.starEvidenceNotes}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      startAiPmcfFarGeneration({
        sourceRecordId: newPlan.id,
        sourceCode: code,
        evaluationType: 'Lesson Plan (DLL / DLP)',
        category: 'lesson-plan',
        coachingMechanism: 'Lesson Plan',
        teacherId: newPlan.teacherId,
        teacherName: newPlan.teacherName,
        subjectGrade: newPlan.subjectGrade,
        supervisorId: newPlan.supervisorId,
        supervisorName: newPlan.supervisorName,
        mentorId: newPlan.mentorId,
        mentorName: newPlan.mentorName,
        explicitRole: newPlan.evaluatorRole || (actor.role === 'mentor' ? 'mentor' : 'supervisor'),
        date: newPlan.dateChecked !== 'Pending' ? newPlan.dateChecked : newPlan.dateSubmitted,
        term: newPlan.quarterTerm || 'Term 1',
        weekLabel: `Week ${newPlan.weekNumber}`,
        indicatorScoresList: checklistLines.join('\n'),
        observerNotes: lpNotes,
        resolved: newPlan.status === 'Approved',
      });
    }
  };

  const updateLessonPlan = (id: string, updates: Partial<LessonPlanCheck>) => {
    const oldPlan = lessonPlans.find((p) => p.id === id);
    const actor = getActor();
    const evaluatorRole =
      updates.evaluatorRole ||
      oldPlan?.evaluatorRole ||
      (actor.role === 'mentor' ? 'mentor' : actor.role === 'supervisor' ? 'supervisor' : undefined);
    const enrichedUpdates: Partial<LessonPlanCheck> = {
      ...updates,
      evaluatorRole,
      ...(actor.role === 'mentor'
        ? { mentorId: updates.mentorId || actor.mentorId || actor.id, mentorName: updates.mentorName || actor.name }
        : {}),
    };

    setLessonPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...enrichedUpdates } : p))
    );

    if (oldPlan) {
      const merged = { ...oldPlan, ...enrichedUpdates };
      logAuditEvent({
        category: 'Lesson Plan (DLL / DLP)',
        action: 'UPDATE',
        targetId: id,
        targetName: `${oldPlan.checkCode} (${merged.teacherName})`,
        actorName: actor.name,
        actorRole: actor.role,
        details: `Updated Weekly Lesson Plan ${oldPlan.checkCode} for ${merged.teacherName} (${merged.subjectGrade}).`,
        severity: 'notice',
      });

      // Trigger in-app notification & auto-generate PMCF/FAR when verified by supervisor/mentor/admin
      const isVerifiedUpdate =
        (merged.status === 'Approved' || merged.status === 'Needs Revision') &&
        (updates.status !== undefined || updates.dateChecked !== undefined || updates.supervisorFeedback !== undefined);

      if (isVerifiedUpdate) {
        const verStatus = merged.status;
        const verEvaluator = evaluatorRole === 'mentor' ? (merged.mentorName || actor.name) : (merged.supervisorName || actor.name);
        const feedbackSnippet = merged.supervisorFeedback || '';

        const checklistLines = [
          `- MELC Aligned: ${merged.checklist.melcAligned ? 'Evident' : 'Not Evident'}`,
          `- Clear Objectives: ${merged.checklist.clearObjectives ? 'Evident' : 'Not Evident'}`,
          `- Learning Resources Adequate: ${merged.checklist.learningResourcesAdequate ? 'Evident' : 'Not Evident'}`,
          `- Pedagogical Procedures Sequenced (ILAW): ${merged.checklist.pedagogicalProceduresSequenced ? 'Evident' : 'Not Evident'}`,
          `- Formative Assessment Included: ${merged.checklist.formativeAssessmentIncluded ? 'Evident' : 'Not Evident'}`,
          `- Reflection Completed: ${merged.checklist.reflectionCompleted ? 'Evident' : 'Not Evident'}`,
          `- Verification Status: ${verStatus} (Week ${merged.weekNumber}, ${merged.quarterTerm})`,
        ];
        const lpNotes = [
          `Lesson Title: ${merged.lessonTitle}`,
          merged.remarks ? `Remarks: ${merged.remarks}` : '',
          feedbackSnippet ? `Evaluator Feedback: ${feedbackSnippet}` : '',
          merged.starEvidenceNotes ? `STAR Brief Evidence/Notes: ${merged.starEvidenceNotes}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        startAiPmcfFarGeneration({
          sourceRecordId: oldPlan.id,
          sourceCode: oldPlan.checkCode,
          evaluationType: 'Lesson Plan (DLL / DLP)',
          category: 'lesson-plan',
          coachingMechanism: 'Lesson Plan',
          teacherId: merged.teacherId,
          teacherName: merged.teacherName,
          subjectGrade: merged.subjectGrade,
          supervisorId: merged.supervisorId,
          supervisorName: merged.supervisorName,
          mentorId: merged.mentorId,
          mentorName: merged.mentorName,
          explicitRole: evaluatorRole === 'mentor' ? 'mentor' : 'supervisor',
          date: merged.dateChecked !== 'Pending' ? merged.dateChecked : merged.dateSubmitted,
          term: merged.quarterTerm || 'Term 1',
          weekLabel: `Week ${merged.weekNumber}`,
          indicatorScoresList: checklistLines.join('\n'),
          observerNotes: lpNotes,
          resolved: verStatus === 'Approved',
        });

        addNotification({
          recipientTeacherId: merged.teacherId,
          recipientTeacherName: merged.teacherName,
          type: 'lesson_plan_verified',
          title: `Weekly Lesson Plan Verified (${verStatus})`,
          message: `Your Weekly Lesson Plan ${oldPlan.checkCode} (${merged.subjectGrade} — ${merged.lessonTitle}) has been verified by ${verEvaluator} with status "${verStatus}".${feedbackSnippet ? ` Feedback: "${feedbackSnippet}"` : ''}`,
          targetTab: 'lesson-plans',
          referenceCode: oldPlan.checkCode,
          supervisorName: verEvaluator,
          statusBadge: verStatus,
        });
      }
    }
  };

  const deleteLessonPlan = (id: string) => {
    const oldPlan = lessonPlans.find((p) => p.id === id);
    setLessonPlans((prev) => prev.filter((p) => p.id !== id));

    const actor = getActor();
    if (oldPlan) {
      logAuditEvent({
        category: 'Lesson Plan (DLL / DLP)',
        action: 'DELETE',
        targetId: id,
        targetName: `${oldPlan.checkCode} (${oldPlan.teacherName})`,
        actorName: actor.name,
        actorRole: actor.role,
        details: `Deleted Weekly Lesson Plan record ${oldPlan.checkCode} (${oldPlan.lessonTitle}) for ${oldPlan.teacherName}.`,
        severity: 'warning',
      });
    }
  };

  const addFleetingObservation = (obs: Omit<FleetingObservation, 'id' | 'visitCode'>) => {
    const code = `FLT-2026-${String(fleetingObservations.length + 101)}`;
    const newObs: FleetingObservation = {
      ...obs,
      id: `fl-${Date.now()}`,
      visitCode: code,
    };
    setFleetingObservations((prev) => [newObs, ...prev]);

    const fleetingRatingLines = [
      `- Walkthrough Duration: ${newObs.durationMinutes} minutes`,
      `- Learner Engagement Level: ${newObs.learnerEngagementLevel}`,
      `- Classroom Atmosphere: ${newObs.classroomAtmosphere}`,
      `- Boardwork Quality: ${newObs.boardWorkQuality}`,
      `- Time-on-Task: ${newObs.timeOnTask}`,
      ...Object.entries(newObs.monitoringRatings || {}).map(
        ([k, v]) => `- Walkthrough Indicator ${k}: ${v === 'E' ? 'Evident (E)' : 'Not Evident (NE)'}`
      ),
    ];
    const fleetingNotes = [
      newObs.rapidCommendation ? `Rapid Commendation: ${newObs.rapidCommendation}` : '',
      newObs.quickCoachingTip ? `Quick Coaching Tip: ${newObs.quickCoachingTip}` : '',
      newObs.starEvidenceNotes ? `STAR Brief Evidence/Notes: ${newObs.starEvidenceNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    startAiPmcfFarGeneration({
      sourceRecordId: newObs.id,
      sourceCode: code,
      evaluationType: 'Fleeting & Walkthrough Observation',
      category: 'fleeting',
      coachingMechanism: 'Walkthrough/Fleeting Observations',
      teacherId: newObs.teacherId,
      teacherName: newObs.teacherName,
      subjectGrade: `${newObs.subject} (${newObs.gradeAndSection})`,
      supervisorId: newObs.supervisorId,
      supervisorName: newObs.supervisorName,
      explicitRole: 'supervisor',
      date: newObs.date,
      term: newObs.quarterTerm || schoolProfile.currentTerm || 'Term 1',
      weekLabel: `Walkthrough · ${code}`,
      indicatorScoresList: fleetingRatingLines.join('\n'),
      observerNotes: fleetingNotes,
      resolved: true,
    });
  };

  const updateFleetingObservation = (id: string, updates: Partial<FleetingObservation>) => {
    setFleetingObservations((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const deleteFleetingObservation = (id: string) => {
    setFleetingObservations((prev) => prev.filter((f) => f.id !== id));
  };

  const addPMCFRecord = (record: Omit<PMCFRecord, 'id' | 'recordNo'>) => {
    const actor = getActor();
    const code = `PMCF-2026-${String(pmcfRecords.length + 1).padStart(3, '0')}`;
    const newRecord: PMCFRecord = {
      ...record,
      id: `pmcf-${Date.now()}`,
      recordNo: code,
      evaluatorRole: record.evaluatorRole || (actor.role === 'mentor' ? 'mentor' : actor.role === 'supervisor' ? 'supervisor' : 'admin'),
      mentorId: record.mentorId || (actor.role === 'mentor' ? actor.mentorId || actor.id : undefined),
      mentorName: record.mentorName || (actor.role === 'mentor' ? actor.name : undefined),
    };
    setPmcfRecords((prev) => [newRecord, ...prev]);
  };

  const updatePMCFRecord = (id: string, updates: Partial<PMCFRecord>) => {
    setPmcfRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const deletePMCFRecord = (id: string) => {
    setPmcfRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const addFarRecord = (record: Omit<FarRecord, 'id' | 'farCode' | 'date' | 'status' | 'actionTaken'>) => {
    const actor = getActor();
    const year = new Date().getFullYear();
    const count = farRecords.length + 1;
    const code = `FAR-${year}-${String(count).padStart(3, '0')}`;
    const newRecord: FarRecord = {
      ...record,
      id: `far-${Date.now()}`,
      farCode: code,
      date: new Date().toISOString().slice(0, 10),
      status: 'In Progress',
      actionTaken: false,
      evaluatorRole: record.evaluatorRole || (actor.role === 'mentor' ? 'mentor' : actor.role === 'supervisor' ? 'supervisor' : 'admin'),
      mentorId: record.mentorId || (actor.role === 'mentor' ? actor.mentorId || actor.id : undefined),
      mentorName: record.mentorName || (actor.role === 'mentor' ? actor.name : undefined),
    };
    setFarRecords((prev) => [newRecord, ...prev]);
  };

  const updateFarRecord = (id: string, updates: Partial<FarRecord>) => {
    setFarRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const verifyFarRecord = (id: string) => {
    setFarRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'Verified', actionTaken: true } : r
      )
    );
  };

  const deleteFarRecord = (id: string) => {
    setFarRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const addIMQA = (im: Omit<InstructionalMaterialQA, 'id'>) => {
    const actor = getActor();
    const evaluatorRole =
      im.evaluatorRole || (actor.role === 'mentor' ? 'mentor' : actor.role === 'supervisor' ? 'supervisor' : 'admin');
    const newIm: InstructionalMaterialQA = {
      ...im,
      id: `im-${Date.now()}`,
      evaluatorRole,
      mentorId: im.mentorId || (actor.role === 'mentor' ? actor.mentorId || actor.id : undefined),
      mentorName: im.mentorName || (actor.role === 'mentor' ? actor.name : undefined),
    };
    setImsQA((prev) => [newIm, ...prev]);

    const kindLabel = newIm.materialKind === 'LM' ? "Learner's Material (LM) QA" : 'Instructional Material (IM) QA';
    const imScoreLines = [
      `- Material Title: ${newIm.title} (${newIm.type})`,
      `- QA Status: ${newIm.status}`,
      `- Alignment to MELC: ${newIm.alignmentToMELC ? 'Evident' : 'Not Evident'}`,
      `- Content Accuracy Verified: ${newIm.contentAccuracyVerified ? 'Evident' : 'Not Evident'}`,
      `- Copyright Compliant: ${newIm.copyrightCompliant ? 'Evident' : 'Not Evident'}`,
      `- Visual Clarity & Layout: ${newIm.visualClarity ? 'Evident' : 'Not Evident'}`,
    ];
    const imNotes = [
      newIm.evaluatorNotes ? `Evaluator QA Notes: ${newIm.evaluatorNotes}` : '',
      newIm.starEvidenceNotes ? `STAR Brief Evidence/Notes: ${newIm.starEvidenceNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    startAiPmcfFarGeneration({
      sourceRecordId: newIm.id,
      sourceCode: newIm.id.toUpperCase(),
      evaluationType: kindLabel,
      category: 'ims-lms',
      coachingMechanism: 'IMs & LMs',
      teacherId: newIm.teacherId,
      teacherName: newIm.teacherName,
      subjectGrade: newIm.gradeSubject,
      supervisorId: newIm.supervisorId,
      supervisorName: newIm.supervisorName,
      mentorId: newIm.mentorId,
      mentorName: newIm.mentorName,
      explicitRole: evaluatorRole,
      date: newIm.dateSubmitted,
      term: newIm.quarterTerm || schoolProfile.currentTerm || 'Term 1',
      weekLabel: `IM/LM QA · ${newIm.gradeSubject}`,
      indicatorScoresList: imScoreLines.join('\n'),
      observerNotes: imNotes,
      resolved: newIm.status === 'Approved for Use',
    });
  };

  const updateIMQA = (id: string, updates: Partial<InstructionalMaterialQA>) => {
    const oldItem = imsQA.find((item) => item.id === id);
    const actor = getActor();
    setImsQA((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    if (oldItem) {
      const merged = { ...oldItem, ...updates };
      if (updates.status || updates.evaluatorNotes || updates.title) {
        const kindLabel = merged.materialKind === 'LM' ? "Learner's Material (LM) QA" : 'Instructional Material (IM) QA';
        const imScoreLines = [
          `- Material Title: ${merged.title} (${merged.type})`,
          `- Updated QA Status: ${merged.status}`,
          `- Alignment to MELC: ${merged.alignmentToMELC ? 'Evident' : 'Not Evident'}`,
          `- Content Accuracy Verified: ${merged.contentAccuracyVerified ? 'Evident' : 'Not Evident'}`,
          `- Copyright Compliant: ${merged.copyrightCompliant ? 'Evident' : 'Not Evident'}`,
          `- Visual Clarity & Layout: ${merged.visualClarity ? 'Evident' : 'Not Evident'}`,
        ];
        const imNotes = [
          merged.evaluatorNotes ? `Evaluator QA Notes: ${merged.evaluatorNotes}` : '',
          merged.starEvidenceNotes ? `STAR Brief Evidence/Notes: ${merged.starEvidenceNotes}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        startAiPmcfFarGeneration({
          sourceRecordId: merged.id,
          sourceCode: merged.id.toUpperCase(),
          evaluationType: kindLabel,
          category: 'ims-lms',
          coachingMechanism: 'IMs & LMs',
          teacherId: merged.teacherId,
          teacherName: merged.teacherName,
          subjectGrade: merged.gradeSubject,
          supervisorId: merged.supervisorId,
          supervisorName: merged.supervisorName,
          mentorId: merged.mentorId || (actor.role === 'mentor' ? actor.mentorId || actor.id : undefined),
          mentorName: merged.mentorName || (actor.role === 'mentor' ? actor.name : undefined),
          explicitRole: merged.evaluatorRole || (actor.role === 'mentor' ? 'mentor' : 'supervisor'),
          date: merged.dateSubmitted,
          term: merged.quarterTerm || schoolProfile.currentTerm || 'Term 1',
          weekLabel: `IM/LM QA · ${merged.gradeSubject}`,
          indicatorScoresList: imScoreLines.join('\n'),
          observerNotes: imNotes,
          resolved: merged.status === 'Approved for Use',
        });
      }
    }
  };

  const deleteIMQA = (id: string) => {
    setImsQA((prev) => prev.filter((item) => item.id !== id));
  };

  const addAssessment = (assessment: Omit<AssessmentRecord, 'id'>) => {
    const actor = getActor();
    const evaluatorRole =
      assessment.evaluatorRole || (actor.role === 'mentor' ? 'mentor' : actor.role === 'supervisor' ? 'supervisor' : 'admin');
    const newRec: AssessmentRecord = {
      ...assessment,
      id: `as-${Date.now()}`,
      evaluatorRole,
      mentorId: assessment.mentorId || (actor.role === 'mentor' ? actor.mentorId || actor.id : undefined),
      mentorName: assessment.mentorName || (actor.role === 'mentor' ? actor.name : undefined),
    };
    setAssessments((prev) => [newRec, ...prev]);

    const mpsScoreLines = [
      `- Assessment Type: ${newRec.assessmentType}`,
      `- Total Takers: ${newRec.totalTakers}`,
      `- Mean Score / HPS: ${newRec.meanScore} / ${newRec.highestPossibleScore}`,
      `- Mean Percentage Score (MPS): ${newRec.mps}% (${newRec.targetMet ? 'Met >=75% Target' : 'Below 75% Target'})`,
      `- Least Mastered Competencies: ${(newRec.leastMasteredCompetencies || []).join('; ') || 'None specified'}`,
    ];

    startAiPmcfFarGeneration({
      sourceRecordId: newRec.id,
      sourceCode: `${newRec.subject} MPS`,
      evaluationType: `Assessment (${newRec.assessmentType})`,
      category: 'assessment',
      coachingMechanism: 'Assessment',
      teacherId: newRec.teacherId,
      teacherName: newRec.teacherName,
      subjectGrade: `${newRec.subject} (${newRec.gradeLevel} - ${newRec.section})`,
      supervisorId: newRec.supervisorId,
      supervisorName: newRec.supervisorName,
      mentorId: newRec.mentorId,
      mentorName: newRec.mentorName,
      explicitRole: evaluatorRole,
      term: newRec.quarterTerm || 'Term 1',
      weekLabel: `${newRec.quarterTerm} · ${newRec.subject}`,
      indicatorScoresList: mpsScoreLines.join('\n'),
      observerNotes: newRec.remediationPlan || 'Review least mastered competencies and execute remediation plan.',
      resolved: newRec.targetMet,
    });
  };

  const updateAssessment = (id: string, updates: Partial<AssessmentRecord>) => {
    setAssessments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const deleteAssessment = (id: string) => {
    setAssessments((prev) => prev.filter((a) => a.id !== id));
  };

  const addFormativeRecord = (record: Omit<FormativeAssessmentRecord, 'id' | 'code'>): FormativeAssessmentRecord => {
    const actor = getActor();
    const evaluatorRole =
      record.evaluatorRole || (actor.role === 'mentor' ? 'mentor' : actor.role === 'supervisor' ? 'supervisor' : 'admin');
    const code = `FA-${new Date().getFullYear()}-${String(formativeRecords.length + 1).padStart(3, '0')}`;
    const newRec: FormativeAssessmentRecord = {
      ...record,
      id: `form-${Date.now()}`,
      code,
      evaluatorRole,
      mentorId: record.mentorId || (actor.role === 'mentor' ? actor.mentorId || actor.id : undefined),
      mentorName: record.mentorName || (actor.role === 'mentor' ? actor.name : undefined),
    };
    setFormativeRecords((prev) => [newRec, ...prev]);

    const formativeScoreLines = [
      `- Formative Assessment Type: ${newRec.formativeType}`,
      `- Competency / Lesson Topic: ${newRec.competencyTopic}`,
      `- Total Learners: ${newRec.totalLearners}`,
      `- Learners Achieving Mastery (>=75%): ${newRec.masteryCount}/${newRec.totalLearners}`,
      `- Mean Score / HPS: ${newRec.meanScore} / ${newRec.highestPossibleScore}`,
      `- Mean Percentage Score (MPS): ${newRec.mps.toFixed(1)}% (${newRec.status})`,
    ];
    const formativeNotes = [
      newRec.feedbackNotes ? `Instructional Feedback / Remediation Notes: ${newRec.feedbackNotes}` : '',
      newRec.starEvidenceNotes ? `STAR Brief Evidence/Notes: ${newRec.starEvidenceNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    startAiPmcfFarGeneration({
      sourceRecordId: newRec.id,
      sourceCode: code,
      evaluationType: 'Formative Assessment',
      category: 'assessment',
      coachingMechanism: 'Assessment',
      teacherId: newRec.teacherId,
      teacherName: newRec.teacherName,
      subjectGrade: `${newRec.subject} (${newRec.gradeLevel} - ${newRec.section})`,
      supervisorId: newRec.supervisorId,
      supervisorName: newRec.supervisorName,
      mentorId: newRec.mentorId,
      mentorName: newRec.mentorName,
      explicitRole: evaluatorRole,
      date: newRec.date,
      term: newRec.term,
      weekLabel: `${newRec.term} · ${code}`,
      indicatorScoresList: formativeScoreLines.join('\n'),
      observerNotes: formativeNotes,
      resolved: newRec.status === 'Mastery Achieved',
    });

    return newRec;
  };

  const updateFormativeRecord = (id: string, updates: Partial<FormativeAssessmentRecord>) => {
    setFormativeRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const deleteFormativeRecord = (id: string) => {
    setFormativeRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const addSummativeRecord = (record: Omit<SummativeAssessmentRecord, 'id' | 'code'>): SummativeAssessmentRecord => {
    const actor = getActor();
    const evaluatorRole =
      record.evaluatorRole || (actor.role === 'mentor' ? 'mentor' : actor.role === 'supervisor' ? 'supervisor' : 'admin');
    const code = `SA-${new Date().getFullYear()}-${String(summativeRecords.length + 1).padStart(3, '0')}`;
    const newRec: SummativeAssessmentRecord = {
      ...record,
      id: `sum-${Date.now()}`,
      code,
      evaluatorRole,
      mentorId: record.mentorId || (actor.role === 'mentor' ? actor.mentorId || actor.id : undefined),
      mentorName: record.mentorName || (actor.role === 'mentor' ? actor.name : undefined),
    };
    setSummativeRecords((prev) => [newRec, ...prev]);

    const summativeScoreLines = [
      `- Summative Type: ${newRec.summativeType}${newRec.examinationPeriod ? ` (${newRec.examinationPeriod})` : ''}`,
      `- Competency Coverage: ${newRec.competencyCoverage}`,
      `- TOS & Answer Key Status: ${newRec.tosVerified}${newRec.tosAlignment ? ` | ${newRec.tosAlignment}` : ''}`,
      `- Quality Sign-Off: ${newRec.qualitySignOff || 'Standard Review'}`,
      `- Passed / Total Learners: ${newRec.passedCount}/${newRec.totalLearners}`,
      `- Mean Score / HPS: ${newRec.meanScore} / ${newRec.highestPossibleScore} (MPS: ${newRec.mps.toFixed(1)}% — ${newRec.status})`,
      ...(newRec.bloomRemember !== undefined
        ? [
            `- Bloom's Cognitive Distribution: Remember=${newRec.bloomRemember}, Understand=${newRec.bloomUnderstand ?? 0}, Apply=${newRec.bloomApply ?? 0}, Analyze=${newRec.bloomAnalyze ?? 0}, Evaluate=${newRec.bloomEvaluate ?? 0}, Create=${newRec.bloomCreate ?? 0}`,
          ]
        : []),
      ...Object.entries(newRec.monitoringRatings || {}).map(
        ([k, v]) => `- Summative Monitoring Indicator ${k}: ${v === 'E' ? 'Evident (E)' : 'Not Evident (NE)'}`
      ),
    ];
    const summativeNotes = [
      newRec.leastMasteredNotes ? `Least Mastered Competencies / Remediation: ${newRec.leastMasteredNotes}` : '',
      newRec.itemQualityRemarks ? `Item Quality Remarks / Distracter Analysis: ${newRec.itemQualityRemarks}` : '',
      newRec.starEvidenceNotes ? `STAR Brief Evidence/Notes: ${newRec.starEvidenceNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    startAiPmcfFarGeneration({
      sourceRecordId: newRec.id,
      sourceCode: code,
      evaluationType: 'Summative Assessment',
      category: 'assessment',
      coachingMechanism: 'Assessment',
      teacherId: newRec.teacherId,
      teacherName: newRec.teacherName,
      subjectGrade: `${newRec.subject} (${newRec.gradeLevel} - ${newRec.section})`,
      supervisorId: newRec.supervisorId,
      supervisorName: newRec.supervisorName,
      mentorId: newRec.mentorId,
      mentorName: newRec.mentorName,
      explicitRole: evaluatorRole,
      date: newRec.date,
      term: newRec.term,
      weekLabel: `${newRec.term} · ${code}`,
      indicatorScoresList: summativeScoreLines.join('\n'),
      observerNotes: summativeNotes,
      resolved: newRec.status === 'Mastery Achieved',
    });

    return newRec;
  };

  const updateSummativeRecord = (id: string, updates: Partial<SummativeAssessmentRecord>) => {
    setSummativeRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const deleteSummativeRecord = (id: string) => {
    setSummativeRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const addResourceLink = (link: Omit<ResourceLink, 'id'>) => {
    const newLink: ResourceLink = {
      ...link,
      id: `link-${Date.now()}`,
    };
    setResourceLinks((prev) => [newLink, ...prev]);
  };

  const updateResourceLink = (id: string, updates: Partial<ResourceLink>) => {
    setResourceLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const deleteResourceLink = (id: string) => {
    setResourceLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const exportAllCsv = (
    type: 'cot' | 'dll' | 'pmcf' | 'mps' | 'far' | 'audit',
    scopedRecords?: {
      observations?: ClassroomObservation[];
      lessonPlans?: LessonPlanCheck[];
      assessments?: AssessmentRecord[];
      pmcfRecords?: PMCFRecord[];
      farRecords?: FarRecord[];
      auditLogs?: AuditLog[];
    }
  ) => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    const obsSource = scopedRecords?.observations ?? observations;
    const lpSource = scopedRecords?.lessonPlans ?? lessonPlans;
    const pmcfSource = scopedRecords?.pmcfRecords ?? pmcfRecords;
    const assessSource = scopedRecords?.assessments ?? assessments;
    const farSource = scopedRecords?.farRecords ?? farRecords;

    if (type === 'cot') {
      filename = `BNHS_OMES_Classroom_Observations_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Observation No',
        'Date',
        'Teacher Name',
        'Department',
        'Supervisor / Observer',
        'Subject',
        'Grade & Section',
        'Average Score',
        'Overall Rating',
        'Status',
      ];
      rows = obsSource.map((o) => [
        o.observationNo,
        o.date,
        `"${o.teacherName}"`,
        `"${o.department}"`,
        `"${o.supervisorName}"`,
        `"${o.subjectTaught}"`,
        `"${o.gradeAndSection}"`,
        o.averageScore.toFixed(2),
        o.overallRating,
        o.status,
      ]);
    } else if (type === 'dll') {
      filename = `BNHS_OMES_Lesson_Plan_Checks_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Check Code',
        'Week No',
        'Date Checked',
        'Teacher Name',
        'Department',
        'Subject Grade',
        'Status',
        'Remarks',
      ];
      rows = lpSource.map((lp) => [
        lp.checkCode,
        lp.weekNumber,
        lp.dateChecked,
        `"${lp.teacherName}"`,
        `"${lp.department}"`,
        `"${lp.subjectGrade}"`,
        lp.status,
        `"${lp.remarks.replace(/"/g, '""')}"`,
      ]);
    } else if (type === 'pmcf') {
      filename = `BNHS_OMES_PMCF_Coaching_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Record No',
        'Date',
        'Teacher Name',
        'Supervisor / Mentor',
        'Coaching Mechanism',
        'Status',
        'Critical Incident',
        'Action Plan Output',
      ];
      rows = pmcfSource.map((r) => [
        r.recordNo,
        r.date,
        `"${r.teacherName}"`,
        `"${r.evaluatorRole === 'mentor' && r.mentorName ? r.mentorName : r.supervisorName}"`,
        `"${r.coachingMechanism}"`,
        r.status,
        `"${r.criticalIncidentDescription.replace(/"/g, '""')}"`,
        `"${r.actionPlanOutput.replace(/"/g, '""')}"`,
      ]);
    } else if (type === 'mps') {
      filename = `BNHS_OMES_Quarterly_MPS_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Subject',
        'Grade Level',
        'Section',
        'Teacher',
        'Takers',
        'Mean Score',
        'Highest Possible',
        'MPS %',
        'Target Met (>=75%)',
      ];
      rows = assessSource.map((a) => [
        `"${a.subject}"`,
        `"${a.gradeLevel}"`,
        `"${a.section}"`,
        `"${a.teacherName}"`,
        a.totalTakers,
        a.meanScore,
        a.highestPossibleScore,
        `${a.mps}%`,
        a.targetMet ? 'YES' : 'NO',
      ]);
    } else if (type === 'far') {
      filename = `BNHS_OMES_FAR_Findings_Analysis_Recommendations_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'FAR Code',
        'Date',
        'Teacher',
        'Term',
        'Lesson Plan Week',
        'Status',
        'Findings',
        'Analysis',
        'Recommendations',
      ];
      rows = farSource.map((f) => [
        f.farCode,
        f.date,
        `"${f.teacherName}"`,
        `"${f.term}"`,
        `"${f.lessonPlanWeek}"`,
        f.status,
        `"${f.findings.replace(/"/g, '""')}"`,
        `"${f.analysis.replace(/"/g, '""')}"`,
        `"${f.recommendations.replace(/"/g, '""')}"`,
      ]);
    } else if (type === 'audit') {
      exportAuditLogsCsv(scopedRecords?.auditLogs);
      return;
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAuditLogsCsv = (logsToExport?: AuditLog[]) => {
    const records = logsToExport || auditLogs;
    const filename = `BNHS_OMES_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`;
    const headers = [
      'Log ID',
      'Timestamp (ISO)',
      'Date & Time',
      'Category',
      'Action Type',
      'Target ID',
      'Target Entity / Personnel',
      'Authorized Actor',
      'Actor Role',
      'Severity',
      'Event Details',
      'Changes / Payload Summary',
    ];
    const rows = records.map((log) => [
      `"${log.id}"`,
      `"${log.timestamp}"`,
      `"${log.formattedDate}"`,
      `"${log.category}"`,
      `"${log.action}"`,
      `"${log.targetId}"`,
      `"${(log.targetName || '').replace(/"/g, '""')}"`,
      `"${(log.actorName || '').replace(/"/g, '""')}"`,
      `"${log.actorRole}"`,
      `"${log.severity}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${(log.changesSummary ? log.changesSummary.map((c) => `${c.field}: [${c.previousValue ?? 'None'} -> ${c.newValue ?? 'None'}]`).join('; ') : '').replace(/"/g, '""')}"`,
    ]);

    const csvString = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportDatabaseJson = () => {
    const fullState = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      schoolProfile,
      teachers,
      supervisors,
      mentors,
      observations,
      lessonPlans,
      fleetingObservations,
      pmcfRecords,
      farRecords,
      imsQA,
      assessments,
      formativeRecords,
      summativeRecords,
      resourceLinks,
      auditLogs,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullState, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `BNHS_OMES_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  const importDatabaseJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.schoolProfile) setSchoolProfile(parsed.schoolProfile);
      if (parsed.teachers) setTeachers(parsed.teachers);
      if (parsed.supervisors) setSupervisors(parsed.supervisors);
      if (parsed.mentors) setMentors(parsed.mentors);
      if (parsed.observations) setObservations(parsed.observations);
      if (parsed.lessonPlans) setLessonPlans(parsed.lessonPlans);
      if (parsed.fleetingObservations) setFleetingObservations(parsed.fleetingObservations);
      if (parsed.pmcfRecords) setPmcfRecords(parsed.pmcfRecords);
      if (parsed.farRecords) setFarRecords(parsed.farRecords);
      if (parsed.imsQA) setImsQA(parsed.imsQA);
      if (parsed.assessments) setAssessments(parsed.assessments);
      if (parsed.formativeRecords) setFormativeRecords(parsed.formativeRecords);
      if (parsed.summativeRecords) setSummativeRecords(parsed.summativeRecords);
      if (parsed.resourceLinks) setResourceLinks(parsed.resourceLinks);
      if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
      return true;
    } catch {
      return false;
    }
  };

  const resetToDefaults = () => {
    setSchoolProfile(INITIAL_SCHOOL_PROFILE);
    setTeachers(INITIAL_TEACHERS);
    setSupervisors(INITIAL_SUPERVISORS);
    setMentors(INITIAL_MENTORS);
    setObservations(INITIAL_OBSERVATIONS);
    setLessonPlans(INITIAL_LESSON_PLANS);
    setFleetingObservations(INITIAL_FLEETING_OBSERVATIONS);
    setPmcfRecords(INITIAL_PMCF_RECORDS);
    setFarRecords(INITIAL_FAR_RECORDS);
    setImsQA(INITIAL_IMS_QA);
    setAssessments(INITIAL_ASSESSMENTS);
    setFormativeRecords(INITIAL_FORMATIVE_RECORDS);
    setSummativeRecords(INITIAL_SUMMATIVE_RECORDS);
    setResourceLinks(INITIAL_RESOURCE_LINKS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
  };

  return (
    <DataContext.Provider
      value={{
        schoolProfile,
        updateSchoolProfile,
        teachers,
        addTeacher,
        updateTeacher,
        updateTeacherPassword,
        deleteTeacher,
        supervisors,
        addSupervisor,
        updateSupervisor,
        updateSupervisorPassword,
        deleteSupervisor,
        assignTeacherToSupervisor,
        mentors,
        addMentor,
        updateMentor,
        updateMentorPassword,
        deleteMentor,
        assignTeacherToMentor,
        observations,
        addObservation,
        updateObservation,
        deleteObservation,
        lessonPlans,
        addLessonPlan,
        updateLessonPlan,
        deleteLessonPlan,
        fleetingObservations,
        addFleetingObservation,
        updateFleetingObservation,
        deleteFleetingObservation,
        pmcfRecords,
        addPMCFRecord,
        updatePMCFRecord,
        deletePMCFRecord,
        farRecords,
        addFarRecord,
        updateFarRecord,
        verifyFarRecord,
        deleteFarRecord,
        imsQA,
        addIMQA,
        updateIMQA,
        deleteIMQA,
        assessments,
        addAssessment,
        updateAssessment,
        deleteAssessment,
        formativeRecords,
        addFormativeRecord,
        updateFormativeRecord,
        deleteFormativeRecord,
        summativeRecords,
        addSummativeRecord,
        updateSummativeRecord,
        deleteSummativeRecord,
        resourceLinks,
        addResourceLink,
        updateResourceLink,
        deleteResourceLink,
        auditLogs,
        logAuditEvent,
        clearAuditLogs,
        exportAuditLogsCsv,
        notifications,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        exportAllCsv,
        exportDatabaseJson,
        importDatabaseJson,
        resetToDefaults,
        cloudSyncStatus,
        lastCloudSyncTime,
        syncToCloudNow,
        activeAiDraft,
        dismissAiDraft,
        regenerateAiDraft,
        saveReviewedAiPmcfFar,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
