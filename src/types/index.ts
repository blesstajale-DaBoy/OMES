export type UserRole = 'admin' | 'supervisor' | 'mentor' | 'teacher';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  title: string;
  department?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  assignedTeacherIds?: string[];
  supervisorId?: string; // Links to Supervisor record if role is supervisor
  mentorId?: string; // Links to Mentor record if role is mentor
  teacherId?: string; // Links to Teacher record if role is teacher
}

export type SchoolDepartment = 'Junior High School' | 'Senior High School';

export interface Teacher {
  id: string;
  employeeId: string;
  fullName: string;
  position: string; // Principal I-IV, Head Teacher I-VI, Master Teacher I-V, Teacher I-VII, SPET I-V, Special Science Teacher I-V
  department: 'Junior High School' | 'Senior High School' | string;
  subject: string; // User encodes the subject (e.g., Science, Mathematics, English, etc.)
  gradeLevels: string[];
  assignedSupervisorId: string;
  assignedMentorId?: string;
  email: string;
  password?: string; // Personal account password (default: omes123)
  status: 'Active' | 'On Leave' | 'Official Travel';
  observationsCompleted: number;
  lastObservationDate?: string;
  driveUrl?: string; // Direct Google Drive folder or file link for Supervisor/Mentor access
}

export interface Supervisor {
  id: string;
  employeeId: string;
  fullName: string;
  position: string;
  department: string;
  email: string;
  phone?: string;
  password?: string; // Each supervisor has their own password and can change it
  assignedTeacherIds: string[];
  totalObservationsThisTerm: number;
  driveUrl?: string; // Google Drive folder repository for instructional supervision & DLLs
}

export interface Mentor {
  id: string;
  employeeId: string;
  fullName: string;
  position: string;
  department: string;
  subjectArea?: string;
  email: string;
  phone?: string;
  password?: string;
  assignedTeacherIds: string[];
  totalEvaluationsThisTerm?: number;
  driveUrl?: string;
}

export interface CotIndicatorRating {
  indicatorId: number;
  title: string;
  score: number; // 3 to 7
  evidentStatus?: 'E' | 'NE'; // E = Evident, NE = Not Evident for Classroom Observation
  comments?: string;
}

export interface ClassroomObservation {
  id: string;
  observationNo: string; // e.g. "COT-2026-Q1-001"
  evaluationType?: 'cot-pmes' | 'classroom';
  teacherId: string;
  teacherName: string;
  department: string;
  supervisorId: string;
  supervisorName: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  quarterTerm: 'Term 1' | 'Term 2' | 'Term 3' | string;
  schoolYear: string;
  gradeAndSection: string;
  subjectTaught: string;
  topicTitle: string;
  ratings: CotIndicatorRating[];
  generalObservations: string;
  strengths: string;
  areasForDevelopment: string;
  preConferenceNotes: string;
  postConferenceNotes: string;
  averageScore: number;
  overallRating: 'Outstanding' | 'Very Satisfactory' | 'Satisfactory' | 'Unsatisfactory' | 'Evident' | 'Not Evident' | string;
  status: 'Completed' | 'Pending Post-Conference' | 'Scheduled';
  acknowledgedByTeacher: boolean;
  teacherSignatureDate?: string;
}

export interface LessonPlanCheck {
  id: string;
  checkCode: string;
  teacherId: string;
  teacherName: string;
  department: string;
  supervisorId: string;
  supervisorName: string;
  mentorId?: string;
  mentorName?: string;
  evaluatorRole?: 'admin' | 'supervisor' | 'mentor';
  dateSubmitted: string;
  dateChecked: string;
  weekNumber: number | string;
  quarterTerm: 'Term 1' | 'Term 2' | 'Term 3' | 'CO1' | 'CO2' | 'CO3' | string;
  subjectGrade: string;
  lessonTitle: string;
  checklist: {
    melcAligned: boolean;
    clearObjectives: boolean;
    learningResourcesAdequate: boolean;
    pedagogicalProceduresSequenced: boolean;
    formativeAssessmentIncluded: boolean;
    reflectionCompleted: boolean;
  };
  status: 'Approved' | 'Needs Revision' | 'Pending Inspection';
  remarks: string;
  supervisorFeedback: string;
  driveUrl?: string; // Link to uploaded lesson plan in Google Drive
  uploadedFileName?: string;
  driveFileId?: string;
  uploadedFileDataUrl?: string;
  uploadedFileSize?: number;
}

export interface FleetingObservation {
  id: string;
  visitCode: string;
  teacherId: string;
  teacherName: string;
  supervisorId: string;
  supervisorName: string;
  date: string;
  time: string;
  durationMinutes: number; // 5 to 15 mins
  gradeAndSection: string;
  subject: string;
  learnerEngagementLevel: 'High (80-100%)' | 'Moderate (50-79%)' | 'Low (<50%)';
  classroomAtmosphere: 'Conducive & Orderly' | 'Lively & Interactive' | 'Needs Classroom Management Support';
  boardWorkQuality: 'Well-Structured' | 'Adequate' | 'Needs Clarity';
  timeOnTask: 'On-schedule' | 'Transitioning' | 'Lagging';
  monitoringRatings?: Record<string, 'E' | 'NE'>;
  rapidCommendation: string;
  quickCoachingTip: string;
}

export type SupervisionCategory =
  | 'cot-pmes'
  | 'lesson-plan'
  | 'classroom'
  | 'fleeting'
  | 'assessment'
  | 'ims-lms';

export interface PMCFRecord {
  id: string;
  recordNo: string;
  category?: SupervisionCategory;
  teacherId: string;
  teacherName: string;
  supervisorId: string;
  supervisorName: string;
  mentorId?: string;
  mentorName?: string;
  evaluatorRole?: 'admin' | 'supervisor' | 'mentor';
  sourceRecordId?: string;
  sourceCode?: string;
  date: string;
  quarterTerm: 'Term 1' | 'Term 2' | 'Term 3' | string;
  criticalIncidentDescription: string;
  coachingMechanism:
    | 'Individual Conference'
    | 'LAC Session'
    | 'Peer Mentoring'
    | 'Demonstration Teaching'
    | 'Written Feedback'
    | 'Classroom Observation'
    | 'Walkthrough/Fleeting Observations'
    | 'Lesson Plan'
    | 'Assessment'
    | 'COT-PMES'
    | 'IMs & LMs';
  actionPlanOutput: string;
  impactOnJobPerformance: string;
  status: 'Resolved' | 'In Progress' | 'Scheduled Follow-up';
}

export interface FarRecord {
  id: string;
  farCode: string; // Auto-generated: e.g. FAR-2026-001
  category?: SupervisionCategory;
  date: string; // Auto-generated: e.g. 2026-10-23
  teacherId: string;
  teacherName: string;
  supervisorId?: string;
  supervisorName?: string;
  mentorId?: string;
  mentorName?: string;
  evaluatorRole?: 'admin' | 'supervisor' | 'mentor';
  sourceRecordId?: string;
  sourceCode?: string;
  term: 'Term 1' | 'Term 2' | 'Term 3' | string;
  lessonPlanWeek: string; // Encoded week, e.g. Week 4
  findings: string;
  analysis: string;
  recommendations: string;
  status: 'In Progress' | 'Verified'; // Auto In Progress, becomes Verified once action is taken
  actionTaken?: boolean; // When true, action column is blank
}

export function getPmcfCategory(r: PMCFRecord): SupervisionCategory {
  if (r.category) return r.category;
  switch (r.coachingMechanism) {
    case 'IMs & LMs':
      return 'ims-lms';
    case 'Assessment':
      return 'assessment';
    case 'Lesson Plan':
      return 'lesson-plan';
    case 'COT-PMES':
      return 'cot-pmes';
    case 'Walkthrough/Fleeting Observations':
      return 'fleeting';
    case 'Classroom Observation':
    default:
      return 'classroom';
  }
}

export function getFarCategory(r: FarRecord): SupervisionCategory {
  if (r.category) return r.category;
  if (r.id === 'far-1' || r.id === 'far-2') return 'lesson-plan';
  return 'classroom';
}

export interface InstructionalMaterialQA {
  id: string;
  title: string;
  materialKind?: 'IM' | 'LM'; // Instructional Material (IM) vs Learner's Material (LM)
  type:
    | 'Learner\'s Material (LM)'
    | 'Self-Learning Module (SLM)'
    | 'Learner Activity Sheet (LAS)'
    | 'Localized / Contextualized IM'
    | 'Digitized Slide / Video'
    | 'Manipulative / Kit';
  teacherId: string;
  teacherName: string;
  supervisorId?: string;
  supervisorName?: string;
  mentorId?: string;
  mentorName?: string;
  evaluatorRole?: 'admin' | 'supervisor' | 'mentor';
  gradeSubject: string;
  dateSubmitted: string;
  fileUrl?: string; // Google Drive link or valid web link
  alignmentToMELC: boolean;
  contentAccuracyVerified: boolean;
  copyrightCompliant: boolean;
  visualClarity: boolean;
  status: 'Approved for Use' | 'For Revision' | 'Under Review';
  evaluatorNotes: string;
}

export interface AssessmentRecord {
  id: string;
  subject: string;
  gradeLevel: string;
  section: string;
  teacherId?: string;
  teacherName: string;
  supervisorId?: string;
  supervisorName?: string;
  mentorId?: string;
  mentorName?: string;
  evaluatorRole?: 'admin' | 'supervisor' | 'mentor';
  quarterTerm: 'Term 1' | 'Term 2' | 'Term 3' | string;
  assessmentType: 'Quarterly Examination' | 'Summative Test' | 'Diagnostic Test';
  totalTakers: number;
  meanScore: number;
  highestPossibleScore: number;
  mps: number; // Mean Percentage Score (e.g. 78.4%)
  targetMet: boolean; // >= 75%
  leastMasteredCompetencies: string[];
  remediationPlan: string;
  googleDriveLink?: string;
}

export type FormativeTerm = 'Term 1' | 'Term 2' | 'Term 3';

export interface FormativeAssessmentRecord {
  id: string;
  code: string;
  date: string;
  term: FormativeTerm;
  teacherId: string;
  teacherName: string;
  subject: string;
  gradeLevel: string;
  section: string;
  formativeType: string;
  competencyTopic: string;
  totalLearners: number;
  masteryCount: number;
  meanScore: number;
  highestPossibleScore: number;
  mps: number;
  feedbackNotes: string;
  status: 'Mastery Achieved' | 'Needs Remediation';
  googleDriveLink?: string;
  supervisorId?: string;
  supervisorName?: string;
  mentorId?: string;
  mentorName?: string;
  evaluatorRole?: 'admin' | 'supervisor' | 'mentor';
}

export type SummativeTerm = 'Term 1' | 'Term 2' | 'Term 3';

export interface SummativeAssessmentRecord {
  id: string;
  code: string;
  date: string;
  term: SummativeTerm;
  teacherId: string;
  teacherName: string;
  subject: string;
  gradeLevel: string;
  section: string;
  summativeType: string;
  tosVerified: 'TOS & Answer Key Verified' | 'Pending TOS Verification';
  competencyCoverage: string;
  totalLearners: number;
  passedCount: number;
  meanScore: number;
  highestPossibleScore: number;
  mps: number;
  leastMasteredNotes: string;
  status: 'Mastery Achieved' | 'Needs Remediation';
  examinationPeriod?: string;
  totalItems?: number;
  qualitySignOff?: string;
  tosAttached?: boolean;
  bloomRemember?: number;
  bloomUnderstand?: number;
  bloomApply?: number;
  bloomAnalyze?: number;
  bloomEvaluate?: number;
  bloomCreate?: number;
  answerKeyVerified?: boolean;
  tosAlignment?: string;
  itemQualityRemarks?: string;
  googleDriveLink?: string;
  supervisorId?: string;
  supervisorName?: string;
  mentorId?: string;
  mentorName?: string;
  evaluatorRole?: 'admin' | 'supervisor' | 'mentor';
}

export interface ResourceLink {
  id: string;
  title: string;
  category:
    | 'DepEd Orders & Memoranda'
    | 'COT-PMES Forms & Rubrics'
    | 'COT-RPMS Forms & Rubrics'
    | 'MELCs & Curriculum Guides'
    | 'DLL/DLP ILAW Templates'
    | 'DLL / DLP Templates'
    | 'Drive Folder'
    | 'Fleeting/Walkthrough Observation Monitoring Tool Term1'
    | 'Fleeting/Walkthrough Observation Monitoring Tool Term2'
    | 'Fleeting/Walkthrough Observation Monitoring Tool Term3'
    | 'Classroom Observation Monitoring Tool Term1'
    | 'Classroom Observation Monitoring Tool Term2'
    | 'Classroom Observation Monitoring Tool Term3'
    | 'Checking The Lesson Plan Monitoring Tool Term1'
    | 'Checking The Lesson Plan Monitoring Tool Term2'
    | 'Checking The Lesson Plan Monitoring Tool Term3'
    | 'Checking The Assessment Monitoring Tool Term1'
    | 'Checking The Assessment Monitoring Tool Term2'
    | 'Checking The Assessment Monitoring Tool Term3'
    | string;
  url: string;
  description: string;
  dateAdded: string;
}

export interface SchoolProfile {
  schoolName: string;
  schoolId: string;
  region: string;
  division: string;
  district: string;
  address: string;
  principalName: string;
  principalTitle: string;
  principalMessage: string;
  principalPhotoUrl: string;
  bannerPhotoUrl: string;
  announcementTicker: string;
  currentSchoolYear: string;
  currentTerm: string;
}

export type AuditLogCategory =
  | 'Roster / Teaching Personnel'
  | 'Roster / Instructional Supervisor'
  | 'Roster / Mentor'
  | 'Classroom Observation (COT)'
  | 'Lesson Plan (DLL / DLP)';

export type AuditLogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGNMENT';

export interface AuditLogChange {
  field: string;
  previousValue?: string;
  newValue?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string; // e.g. "Oct 24, 2026 6:45 PM"
  category: AuditLogCategory;
  action: AuditLogAction;
  targetId: string;
  targetName: string;
  actorName: string;
  actorRole: string;
  details: string;
  changesSummary?: AuditLogChange[];
  severity: 'info' | 'notice' | 'warning' | 'critical';
}

export interface AppNotification {
  id: string;
  recipientTeacherId: string;
  recipientTeacherName: string;
  type: 'observation_scheduled' | 'lesson_plan_verified' | 'pmcf_far_generated';
  category?: SupervisionCategory;
  evaluatorRole?: 'admin' | 'supervisor' | 'mentor';
  title: string;
  message: string;
  timestamp: string;
  formattedDate: string;
  read: boolean;
  targetTab: 'observation' | 'lesson-plans' | 'far-pmcf' | 'ims-assessments';
  referenceCode?: string;
  supervisorName?: string;
  statusBadge?: string;
}
