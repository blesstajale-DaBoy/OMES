import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { NavTab } from '../components/Header';
import { DashboardOverviewCharts } from '../components/DashboardOverviewCharts';
import { DashboardCalendarWidget } from '../components/DashboardCalendarWidget';
import { AdminMeConsolidatedGraphs } from '../components/AdminMeConsolidatedGraphs';
import { AuditLogsView } from './AuditLogsView';
import { AssignedTeacherDriveTaskList } from '../components/AssignedTeacherDriveTaskList';
import { getPmcfCategory, getFarCategory } from '../types';
import {
  matchesRoleSupervisionScope,
  resolveActiveSupervisorForUser,
  resolveActiveMentorForUser,
  resolveActiveTeacherForUser,
  isMentorAllowedCategory,
} from '../utils/supervisionScope';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Users,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Eye,
  Plus,
  ShieldCheck,
  LayoutDashboard,
  BarChart3,
  Bell,
  CheckCheck,
  AlertCircle,
  BookOpen,
  BookMarked,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onSelectObservationForPrint: (obsId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectObservationForPrint,
}) => {
  const {
    schoolProfile,
    teachers,
    supervisors,
    mentors,
    observations,
    fleetingObservations,
    lessonPlans,
    pmcfRecords,
    farRecords,
    assessments,
    formativeRecords,
    summativeRecords,
    imsQA,
    auditLogs,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useData();
  const { currentUser, isAdmin, isSupervisor, isMentor, isTeacher } = useAuth();

  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'audit-logs'>('overview');
  const [monthlyChartMode, setMonthlyChartMode] = useState<'bar' | 'area'>('bar');
  const [monthlyDeptFilter, setMonthlyDeptFilter] = useState<'All' | 'JHS' | 'SHS'>('All');

  const activeSupervisor = useMemo(
    () => resolveActiveSupervisorForUser(currentUser, teachers, supervisors),
    [currentUser, teachers, supervisors]
  );
  const activeMentor = useMemo(
    () => resolveActiveMentorForUser(currentUser, teachers, mentors),
    [currentUser, teachers, mentors]
  );
  const activeTeacher = useMemo(
    () => resolveActiveTeacherForUser(currentUser, teachers),
    [currentUser, teachers]
  );

  const teacherAssignedSupervisor = useMemo(() => {
    if (!activeTeacher) return undefined;
    return supervisors.find(
      (s) =>
        s.id === activeTeacher.assignedSupervisorId ||
        (s.assignedTeacherIds && s.assignedTeacherIds.includes(activeTeacher.id))
    );
  }, [activeTeacher, supervisors]);

  const teacherAssignedMentor = useMemo(() => {
    if (!activeTeacher) return undefined;
    return mentors.find(
      (m) =>
        m.id === activeTeacher.assignedMentorId ||
        (m.assignedTeacherIds && m.assignedTeacherIds.includes(activeTeacher.id))
    );
  }, [activeTeacher, mentors]);

  const scopedTeachers = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return teachers;
    if (isSupervisor) {
      if (!activeSupervisor) return [];
      return teachers.filter(
        (t) =>
          t.assignedSupervisorId === activeSupervisor.id ||
          (activeSupervisor.assignedTeacherIds && activeSupervisor.assignedTeacherIds.includes(t.id))
      );
    }
    if (isMentor) {
      if (!activeMentor) return [];
      return teachers.filter(
        (t) =>
          t.assignedMentorId === activeMentor.id ||
          (activeMentor.assignedTeacherIds && activeMentor.assignedTeacherIds.includes(t.id))
      );
    }
    return activeTeacher ? [activeTeacher] : [];
  }, [currentUser, isAdmin, isSupervisor, isMentor, teachers, activeSupervisor, activeMentor, activeTeacher]);

  const scopedObservations = useMemo(
    () =>
      observations.filter((o) =>
        matchesRoleSupervisionScope(o, currentUser, teachers, supervisors, 'All', mentors)
      ),
    [observations, currentUser, teachers, supervisors, mentors]
  );

  const scopedLessonPlans = useMemo(
    () =>
      lessonPlans.filter((lp) =>
        matchesRoleSupervisionScope(lp, currentUser, teachers, supervisors, 'All', mentors)
      ),
    [lessonPlans, currentUser, teachers, supervisors, mentors]
  );

  const scopedAssessments = useMemo(
    () =>
      assessments.filter((a) =>
        matchesRoleSupervisionScope(a, currentUser, teachers, supervisors, 'All', mentors)
      ),
    [assessments, currentUser, teachers, supervisors, mentors]
  );

  const scopedFormative = useMemo(
    () =>
      formativeRecords.filter((f) =>
        matchesRoleSupervisionScope(f, currentUser, teachers, supervisors, 'All', mentors)
      ),
    [formativeRecords, currentUser, teachers, supervisors, mentors]
  );

  const scopedSummative = useMemo(
    () =>
      summativeRecords.filter((s) =>
        matchesRoleSupervisionScope(s, currentUser, teachers, supervisors, 'All', mentors)
      ),
    [summativeRecords, currentUser, teachers, supervisors, mentors]
  );

  const scopedImsQA = useMemo(
    () =>
      imsQA.filter((im) =>
        matchesRoleSupervisionScope(im, currentUser, teachers, supervisors, 'All', mentors)
      ),
    [imsQA, currentUser, teachers, supervisors, mentors]
  );

  const scopedPmcfRecords = useMemo(
    () =>
      pmcfRecords.filter((r) => {
        if (!matchesRoleSupervisionScope(r, currentUser, teachers, supervisors, 'All', mentors)) {
          return false;
        }
        if (isMentor) {
          return isMentorAllowedCategory(getPmcfCategory(r));
        }
        return true;
      }),
    [pmcfRecords, currentUser, teachers, supervisors, mentors, isMentor]
  );

  const scopedFarRecords = useMemo(
    () =>
      farRecords.filter((r) => {
        if (!matchesRoleSupervisionScope(r, currentUser, teachers, supervisors, 'All', mentors)) {
          return false;
        }
        if (isMentor) {
          return isMentorAllowedCategory(getFarCategory(r));
        }
        return true;
      }),
    [farRecords, currentUser, teachers, supervisors, mentors, isMentor]
  );

  const dashboardNotifications = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return notifications;
    if (isTeacher) {
      const normName = currentUser.fullName.trim().toLowerCase();
      return notifications.filter(
        (n) =>
          (activeTeacher && n.recipientTeacherId === activeTeacher.id) ||
          n.recipientTeacherId === currentUser.id ||
          n.recipientTeacherName.trim().toLowerCase() === normName
      );
    }
    const allowedIds = new Set(scopedTeachers.map((t) => t.id));
    const allowedNames = new Set(scopedTeachers.map((t) => t.fullName.trim().toLowerCase()));
    return notifications.filter((n) => {
      if (n.type === 'pmcf_far_generated' && isMentor && n.evaluatorRole !== 'mentor') {
        return false;
      }
      return (
        allowedIds.has(n.recipientTeacherId) ||
        allowedNames.has(n.recipientTeacherName.trim().toLowerCase())
      );
    });
  }, [notifications, currentUser, isAdmin, isTeacher, isMentor, activeTeacher, scopedTeachers]);

  const unreadDashboardNotifications = dashboardNotifications.filter((n) => !n.read);

  // Scoped metrics calculation
  const totalTeachers = scopedTeachers.length;
  const completedObservations = scopedObservations.filter((o) => o.status === 'Completed').length;
  const pendingLessonPlans = scopedLessonPlans.filter((lp) => lp.status === 'Pending Inspection').length;
  const approvedLessonPlans = scopedLessonPlans.filter((lp) => lp.status === 'Approved').length;
  const totalCoachingSessions = scopedPmcfRecords.length;

  const avgCotScore =
    completedObservations > 0
      ? (
          scopedObservations
            .filter((o) => o.status === 'Completed')
            .reduce((acc, o) => acc + (o.averageScore || 0), 0) / completedObservations
        ).toFixed(1)
      : '—';

  const totalMpsSum = scopedAssessments.reduce((acc, curr) => acc + curr.mps, 0);
  const averageMps =
    scopedAssessments.length > 0 ? (totalMpsSum / scopedAssessments.length).toFixed(1) : '78.8';

  // Monthly volume of completed classroom observations for Recharts (strictly scoped)
  const monthlyObservationChartData = useMemo(() => {
    const syMonths = [
      { monthKey: '06', label: 'Jun', fullMonth: 'June' },
      { monthKey: '07', label: 'Jul', fullMonth: 'July' },
      { monthKey: '08', label: 'Aug', fullMonth: 'August' },
      { monthKey: '09', label: 'Sep', fullMonth: 'September' },
      { monthKey: '10', label: 'Oct', fullMonth: 'October' },
      { monthKey: '11', label: 'Nov', fullMonth: 'November' },
      { monthKey: '12', label: 'Dec', fullMonth: 'December' },
      { monthKey: '01', label: 'Jan', fullMonth: 'January' },
      { monthKey: '02', label: 'Feb', fullMonth: 'February' },
      { monthKey: '03', label: 'Mar', fullMonth: 'March' },
      { monthKey: '04', label: 'Apr', fullMonth: 'April' },
      { monthKey: '05', label: 'May', fullMonth: 'May' },
    ];

    const filteredCompleted = scopedObservations.filter((obs) => {
      if (obs.status !== 'Completed') return false;
      if (monthlyDeptFilter === 'JHS') {
        return obs.department !== 'Senior High School';
      }
      if (monthlyDeptFilter === 'SHS') {
        return obs.department === 'Senior High School';
      }
      return true;
    });

    let runningTotal = 0;
    return syMonths.map((m) => {
      const monthObs = filteredCompleted.filter((obs) => {
        if (!obs.date) return false;
        const parts = obs.date.split('-');
        return parts.length >= 2 && parts[1] === m.monthKey;
      });

      const cotPmesCount = monthObs.filter((o) => o.evaluationType !== 'classroom').length;
      const classroomMonitoringCount = monthObs.filter((o) => o.evaluationType === 'classroom').length;
      const completedCount = monthObs.length;
      runningTotal += completedCount;

      const avgScore =
        completedCount > 0
          ? Number(
              (
                monthObs.reduce((sum, item) => sum + (item.averageScore || 0), 0) / completedCount
              ).toFixed(2)
            )
          : 0;

      return {
        month: m.label,
        fullMonth: m.fullMonth,
        completed: completedCount,
        cotPmes: cotPmesCount,
        classroomMonitoring: classroomMonitoringCount,
        cumulative: runningTotal,
        avgScore,
      };
    });
  }, [scopedObservations, monthlyDeptFilter]);

  const peakMonitoringMonth = useMemo(() => {
    const active = monthlyObservationChartData.filter((d) => d.completed > 0);
    if (active.length === 0) return { fullMonth: 'None', completed: 0 };
    return active.reduce((best, curr) => (curr.completed > best.completed ? curr : best), active[0]);
  }, [monthlyObservationChartData]);

  if (isAdmin && adminSubTab === 'audit-logs') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
              <span>{schoolProfile.schoolName}</span>
              <span aria-hidden="true">·</span>
              <span>{schoolProfile.currentTerm}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-stone-900 mt-1">
              Administrator Master Console · {currentUser?.fullName}
            </h2>
            <p className="text-xs md:text-sm text-stone-600 mt-0.5">
              DepEd Results-Based Performance Management System (RPMS-PPST) &amp; System Governance
            </p>
          </div>

          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 gap-1 self-start md:self-auto shrink-0">
            <button
              onClick={() => setAdminSubTab('overview')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Operations Overview</span>
            </button>
            <button
              onClick={() => setAdminSubTab('audit-logs')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#701628] text-white shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Audit Logs &amp; Transparency</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-stone-950 font-bold font-mono">
                {auditLogs.length}
              </span>
            </button>
          </div>
        </div>

        <AuditLogsView
          isEmbedded={true}
          onBackToOverview={() => setAdminSubTab('overview')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Context Bar & Welcome */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
            <span>{schoolProfile.schoolName}</span>
            <span aria-hidden="true">·</span>
            <span>{schoolProfile.currentTerm}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 mt-1">
            {isTeacher
              ? `Welcome, Teacher ${currentUser?.fullName}!`
              : isMentor
              ? `Mentor Workspace · ${currentUser?.fullName}`
              : isSupervisor
              ? `Instructional Supervision Console · ${currentUser?.fullName}`
              : `Administrator Master Console · ${currentUser?.fullName}`}
          </h2>
          <p className="text-xs md:text-sm text-stone-600 mt-0.5">
            {isTeacher
              ? 'Private Teacher Account — Only your personal evaluations, Lesson Plans, Assessments, IMs/LMs, and PMCF / FAR reports are displayed.'
              : isMentor
              ? 'Authorized Mentor Scope: Lesson Plans, Assessments (Formative & Summative), IMs & LMs, and Auto-Generated PMCF / FAR for your assigned mentees.'
              : isSupervisor
              ? 'Instructional Supervisor Scope — Monitoring & Evaluation records and auto-generated PMCF / FAR for your assigned teachers only.'
              : 'DepEd Results-Based Performance Management System (RPMS-PPST) & Consolidated Institutional Oversight'}
          </p>
        </div>

        {/* Role Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 gap-1 mr-1">
              <button
                onClick={() => setAdminSubTab('overview')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#701628] shadow-xs transition-all cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#701628]" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => {
                  setAdminSubTab('audit-logs');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:text-[#701628] transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                <span>Audit Logs</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 text-stone-700 font-mono">
                  {auditLogs.length}
                </span>
              </button>
            </div>
          )}

          {(isAdmin || isSupervisor) && (
            <>
              <button
                onClick={() => onNavigate('observation')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New COT Observation</span>
              </button>
              <button
                onClick={() => onNavigate('lesson-plans')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-900 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Check Lesson Plans</span>
              </button>
            </>
          )}

          {isMentor && (
            <>
              <button
                onClick={() => onNavigate('lesson-plans')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Check Lesson Plans</span>
              </button>
              <button
                onClick={() => onNavigate('far-pmcf')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-900 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Assessments &amp; PMCF/FAR</span>
              </button>
              <button
                onClick={() => onNavigate('ims-assessments')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>IMs &amp; LMs QA</span>
              </button>
            </>
          )}

          {isTeacher && (
            <>
              <button
                onClick={() => onNavigate('observation')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>My COT Evaluations</span>
              </button>
              <button
                onClick={() => onNavigate('far-pmcf')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-900 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>My PMCF &amp; FAR Reports</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Role Privacy Strip for Non-Admin Users */}
      {!isAdmin && (
        <div className="bg-stone-900 text-stone-100 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>
              {isTeacher
                ? `Strict Account Privacy Active: Displaying only records evaluated for ${currentUser?.fullName}. Other teachers' data is hidden.`
                : isMentor
                ? `Mentor Privacy Scope: Viewing ${scopedTeachers.length} assigned mentee(s) across Lesson Plans, Assessments, and IMs/LMs.`
                : `Supervisor Privacy Scope: Viewing ${scopedTeachers.length} assigned teacher(s) under ${activeSupervisor?.fullName || currentUser?.fullName}.`}
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-300 shrink-0">
            {scopedPmcfRecords.length} PMCF · {scopedFarRecords.length} FAR
          </span>
        </div>
      )}

      {/* In-App Notification & Alert Feed */}
      {dashboardNotifications.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-[#701628] border border-amber-200">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900">
                    {isTeacher
                      ? 'My In-App Alerts: Observations, Lesson Plans & Generated PMCF/FAR'
                      : isMentor
                      ? 'Mentee Alerts: Lesson Plans, Assessments, IMs/LMs & PMCF/FAR'
                      : 'In-App Notification Feed (Observations, Verified DLLs & PMCF/FAR)'}
                  </h3>
                  {unreadDashboardNotifications.length > 0 && (
                    <span className="text-xs font-bold text-[#701628]">
                      · {unreadDashboardNotifications.length} Unread
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  Real-time alerts when observations, lesson plan reviews, or PMCF/FAR reports are posted
                </p>
              </div>
            </div>
            {unreadDashboardNotifications.length > 0 && (
              <button
                onClick={() =>
                  markAllNotificationsAsRead(isTeacher ? currentUser?.fullName : undefined)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#701628]" />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
            {dashboardNotifications.slice(0, 3).map((notif) => {
              const isObs = notif.type === 'observation_scheduled';
              const isNeedsRevision = notif.statusBadge === 'Needs Revision';
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    markNotificationAsRead(notif.id);
                    onNavigate(notif.targetTab);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    !notif.read
                      ? 'bg-amber-50/40 border-amber-300/80 hover:border-[#701628]'
                      : 'bg-stone-50/50 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                        {isObs ? (
                          <Calendar className="w-3.5 h-3.5 text-[#701628] shrink-0" />
                        ) : isNeedsRevision ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span className="line-clamp-1">{notif.title}</span>
                      </div>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-[#701628] shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-[#701628]">
                      Teacher: {notif.recipientTeacherName}
                    </div>
                    <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500 pt-2 border-t border-stone-200/60">
                    <span>{notif.formattedDate}</span>
                    <span className="font-bold text-[#701628] flex items-center gap-0.5">
                      <span>Open Record</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 High-Density Key Indicator Metric Tiles (Scoped Per Role) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tile 1 */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              {isTeacher
                ? 'My Assigned Evaluators'
                : isMentor
                ? 'Assigned Mentees'
                : isSupervisor
                ? 'My Assigned Teachers'
                : 'Teachers Monitored'}
            </span>
            <Users className="w-4 h-4 text-[#701628]" />
          </div>
          {isTeacher ? (
            <>
              <div className="text-sm font-bold text-stone-900 truncate">
                {teacherAssignedSupervisor?.fullName || 'Assigned Supervisor'}
              </div>
              <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between border-t border-stone-100 pt-2 truncate">
                <span>Mentor: {teacherAssignedMentor?.fullName || 'Not Assigned'}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
                  {totalTeachers}
                </span>
                <span className="text-xs text-emerald-600 font-medium">
                  {isAdmin ? '100% Rostered' : 'In Your Scope'}
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
                <span>
                  {isAdmin
                    ? `${supervisors.length} Supervisors · ${mentors.length} Mentors`
                    : isMentor
                    ? 'LP, Assessment & IM/LM'
                    : activeSupervisor?.department || 'Assigned Dept'}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => onNavigate('roster')}
                    className="text-[#701628] font-bold hover:underline cursor-pointer"
                  >
                    Roster →
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Tile 2 */}
        {isMentor ? (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                IMs &amp; LMs QA
              </span>
              <BookOpen className="w-4 h-4 text-violet-700" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
                {scopedImsQA.length}
              </span>
              <span className="text-xs text-emerald-600 font-medium">
                {scopedImsQA.filter((i) => i.status === 'Approved for Use').length} Approved
              </span>
            </div>
            <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
              <span>Instructional &amp; Learner Materials</span>
              <button
                onClick={() => onNavigate('ims-assessments')}
                className="text-violet-700 font-bold hover:underline cursor-pointer"
              >
                IMs/LMs →
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                {isTeacher ? 'My COT Observations' : 'COT Observations'}
              </span>
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
                {completedObservations}
              </span>
              <span className="text-xs text-stone-500 font-medium">
                of {Math.max(totalTeachers, 1) * 2} Target
              </span>
            </div>
            <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
              <span>Avg Rating: {avgCotScore} / 7.0</span>
              <button
                onClick={() => onNavigate('observation')}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                Records →
              </button>
            </div>
          </div>
        )}

        {/* Tile 3 */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              {isTeacher ? 'My Lesson Plans (DLL)' : 'Lesson Plans (DLL)'}
            </span>
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
              {approvedLessonPlans}
            </span>
            <span className="text-xs text-amber-700 font-medium">Approved</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>{pendingLessonPlans} Pending Review</span>
            <button
              onClick={() => onNavigate('lesson-plans')}
              className="text-amber-800 font-bold hover:underline cursor-pointer"
            >
              Inspect →
            </button>
          </div>
        </div>

        {/* Tile 4 */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              {isTeacher
                ? 'My MPS & PMCF / FAR'
                : isMentor
                ? 'Mentee MPS & Reports'
                : isSupervisor
                ? 'Supervised MPS & Reports'
                : 'School-Wide MPS & Reports'}
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
              {averageMps}%
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              {scopedFormative.length + scopedSummative.length} F/S Logs
            </span>
          </div>
          <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>
              {totalCoachingSessions} PMCF · {scopedFarRecords.length} FAR
            </span>
            <button
              onClick={() => onNavigate('far-pmcf')}
              className="text-blue-700 font-bold hover:underline cursor-pointer"
            >
              Reports →
            </button>
          </div>
        </div>
      </div>

      {/* Administrator Consolidated Report Graphs */}
      {isAdmin && (
        <AdminMeConsolidatedGraphs
          supervisors={supervisors}
          observations={observations}
          fleetingObservations={fleetingObservations}
          lessonPlans={lessonPlans}
          assessments={assessments}
          onNavigate={onNavigate}
        />
      )}

      {/* Recharts Monthly Volume of Completed Classroom Observations (Hidden for Mentors) */}
      {!isMentor && (
        <div className="bg-white rounded-xl border border-stone-200 p-3.5 sm:p-5 lg:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5 text-[#701628]" />
                <span>
                  {isTeacher
                    ? 'My Classroom Observation Activity'
                    : isSupervisor
                    ? 'Supervised Classroom Observation Overview'
                    : 'Instructional Monitoring Activity Overview'}
                </span>
                <span aria-hidden="true">·</span>
                <span>SY {schoolProfile.currentSchoolYear}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 mt-0.5">
                Monthly Volume of Completed Classroom Observations
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {isTeacher
                  ? 'Your personal completed COT-PMES and Classroom Observation evaluations by month'
                  : 'Completed COT-PMES and Classroom Observation evaluations within your authorized scope'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isTeacher && (
                <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
                  {(['All', 'JHS', 'SHS'] as const).map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setMonthlyDeptFilter(dept)}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        monthlyDeptFilter === dept
                          ? 'bg-white text-[#701628] shadow-2xs font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {dept === 'All' ? 'All Departments' : dept}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
                <button
                  type="button"
                  onClick={() => setMonthlyChartMode('bar')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    monthlyChartMode === 'bar'
                      ? 'bg-[#701628] text-white shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Bar Chart
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyChartMode('area')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    monthlyChartMode === 'area'
                      ? 'bg-[#701628] text-white shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Area Trend
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 my-3 sm:my-4">
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
              <div className="text-[11px] font-medium text-stone-500">Total Completed Visits</div>
              <div className="text-xl font-bold font-mono text-stone-900 tabular-nums mt-0.5">
                {monthlyObservationChartData.reduce((acc, d) => acc + d.completed, 0)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
              <div className="text-[11px] font-medium text-stone-500">Peak Activity Month</div>
              <div className="text-sm font-bold text-[#701628] mt-1">
                {peakMonitoringMonth.fullMonth}{' '}
                <span className="font-mono text-stone-700 tabular-nums">
                  ({peakMonitoringMonth.completed} completed)
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
              <div className="text-[11px] font-medium text-stone-500">COT-PMES Evaluations</div>
              <div className="text-xl font-bold font-mono text-[#701628] tabular-nums mt-0.5">
                {monthlyObservationChartData.reduce((acc, d) => acc + d.cotPmes, 0)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80">
              <div className="text-[11px] font-medium text-stone-500">Classroom Monitoring Tool</div>
              <div className="text-xl font-bold font-mono text-amber-700 tabular-nums mt-0.5">
                {monthlyObservationChartData.reduce((acc, d) => acc + d.classroomMonitoring, 0)}
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {monthlyChartMode === 'bar' ? (
                <BarChart
                  data={monthlyObservationChartData}
                  margin={{ top: 10, right: 12, left: -16, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#57534e', fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: '#d6d3d1' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#57534e', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#44403c',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#fde68a', fontWeight: 600 }}
                    labelFormatter={(_label, payload) =>
                      payload && payload[0]
                        ? `${payload[0].payload.fullMonth} (SY ${schoolProfile.currentSchoolYear})`
                        : _label
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <ReferenceLine
                    y={2}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Monthly Target',
                      position: 'insideTopRight',
                      fill: '#b45309',
                      fontSize: 10,
                    }}
                  />
                  <Bar
                    dataKey="cotPmes"
                    name="Completed COT-PMES"
                    stackId="completedObs"
                    fill="#701628"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={42}
                  />
                  <Bar
                    dataKey="classroomMonitoring"
                    name="Completed Classroom Observation"
                    stackId="completedObs"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={42}
                  />
                </BarChart>
              ) : (
                <AreaChart
                  data={monthlyObservationChartData}
                  margin={{ top: 10, right: 12, left: -16, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="completedObsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#701628" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#701628" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="cumulativeObsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#57534e', fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: '#d6d3d1' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#57534e', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#44403c',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    labelFormatter={(_label, payload) =>
                      payload && payload[0]
                        ? `${payload[0].payload.fullMonth} (SY ${schoolProfile.currentSchoolYear})`
                        : _label
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Monthly Completed Observations"
                    stroke="#701628"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#completedObsGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative Completed (SY)"
                    stroke="#d97706"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cumulativeObsGradient)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* D3 Charts Summary Widget (Scoped per role) */}
      <DashboardOverviewCharts
        teachers={scopedTeachers}
        supervisors={isTeacher ? (teacherAssignedSupervisor ? [teacherAssignedSupervisor] : []) : supervisors}
        observations={isMentor ? [] : scopedObservations}
        lessonPlans={scopedLessonPlans}
        onNavigate={onNavigate}
      />

      {/* Calendar Widget (Scoped per role) */}
      <DashboardCalendarWidget
        observations={isMentor ? [] : scopedObservations}
        lessonPlans={scopedLessonPlans}
        teachers={scopedTeachers}
        supervisors={supervisors}
        onNavigate={onNavigate}
        onSelectObservationForPrint={onSelectObservationForPrint}
      />

      {/* Main 2-Column Split: Principal's Statement & Term Monitoring Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Principal's Corner Card */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-3">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Office of the Secondary School Principal</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="relative shrink-0">
                <img
                  src={
                    schoolProfile.principalPhotoUrl ||
                    '/src/assets/images/bnhs_principal_portrait_1792741601071.jpg'
                  }
                  alt={schoolProfile.principalName}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover border-2 border-amber-500/40 shadow-sm"
                />
                <div className="absolute -bottom-1 -right-1 bg-[#701628] text-amber-300 p-1 rounded-full shadow-xs">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  {schoolProfile.principalName}
                </h3>
                <div className="text-xs font-semibold text-[#701628]">
                  {schoolProfile.principalTitle} · Barobo National High School
                </div>
                <div className="text-xs text-stone-500">
                  Barobo I District · Schools Division of Surigao del Sur
                </div>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed pt-2 italic">
                  "{schoolProfile.principalMessage}"
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500">Instructional Leadership &amp; Supervision Mandate</span>
            {isAdmin && (
              <button
                onClick={() => onNavigate('settings')}
                className="text-[#701628] font-bold hover:underline cursor-pointer"
              >
                Edit Principal Statement &amp; Banner →
              </button>
            )}
          </div>
        </div>

        {/* Term Activity Progress & Auto-Generated Reports Summary */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                SY {schoolProfile.currentSchoolYear} Generated Reports Summary
              </h3>
              <span className="text-xs bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded">
                {schoolProfile.currentTerm}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-stone-900">PMCF Coaching Records</div>
                  <div className="text-[11px] text-stone-500">
                    Auto-generated &amp; encoded interventions in your scope
                  </div>
                </div>
                <span className="text-lg font-mono font-bold text-[#701628]">{scopedPmcfRecords.length}</span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-stone-900">FAR Supervision Reports</div>
                  <div className="text-[11px] text-stone-600">
                    Findings, Analysis &amp; Recommendations in your scope
                  </div>
                </div>
                <span className="text-lg font-mono font-bold text-amber-900">{scopedFarRecords.length}</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-stone-900">Formative &amp; Summative Checks</div>
                  <div className="text-[11px] text-stone-600">
                    {scopedFormative.length} Formative · {scopedSummative.length} Summative
                  </div>
                </div>
                <span className="text-lg font-mono font-bold text-emerald-800">
                  {scopedFormative.length + scopedSummative.length}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>DepEd Order No. 42 &amp; RPMS PPST</span>
            <button
              onClick={() => onNavigate('far-pmcf')}
              className="text-[#701628] font-bold hover:underline cursor-pointer"
            >
              View PMCF &amp; FAR Reports →
            </button>
          </div>
        </div>
      </div>

      {/* Assigned Teachers Google Drive Link Task List (Supervisor & Mentor Pages) */}
      {(isSupervisor || isMentor) && (
        <AssignedTeacherDriveTaskList
          teachersToList={scopedTeachers}
          roleLabel={isMentor ? 'Mentor' : 'Instructional Supervisor'}
          accent={isMentor ? 'teal' : 'maroon'}
        />
      )}

      {/* Supervisory / Mentee Roster & Recent Evaluations (Strictly Scoped) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Personnel / Assignment Scope */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                {isTeacher
                  ? 'My Assigned Evaluators'
                  : isMentor
                  ? 'My Assigned Mentees'
                  : isSupervisor
                  ? 'My Assigned Teachers'
                  : 'Supervisory & Mentor Roster'}
              </h3>
              <p className="text-xs text-stone-500">
                {isTeacher
                  ? 'Your designated Instructional Supervisor and Mentor'
                  : isMentor
                  ? 'Teachers assigned to you for Lesson Plans, Assessments & IMs/LMs'
                  : isSupervisor
                  ? 'Teachers assigned to your instructional supervision'
                  : 'Instructional Supervisors and Mentors overview'}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => onNavigate('roster')}
                className="text-xs text-[#701628] font-bold hover:underline cursor-pointer"
              >
                Full Roster →
              </button>
            )}
          </div>

          <div className="divide-y divide-stone-100">
            {isTeacher ? (
              <>
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#701628]">
                      Instructional Supervisor
                    </div>
                    <div className="text-xs font-bold text-stone-900 mt-0.5">
                      {teacherAssignedSupervisor?.fullName || 'Not Yet Assigned'}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {teacherAssignedSupervisor
                        ? `${teacherAssignedSupervisor.position} · ${teacherAssignedSupervisor.department}`
                        : 'Pending supervisor assignment'}
                    </div>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-[#701628] shrink-0" />
                </div>
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-violet-800">
                      Assigned Mentor
                    </div>
                    <div className="text-xs font-bold text-stone-900 mt-0.5">
                      {teacherAssignedMentor?.fullName || 'Not Yet Assigned'}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {teacherAssignedMentor
                        ? `${teacherAssignedMentor.position} · ${teacherAssignedMentor.subjectArea}`
                        : 'Pending mentor assignment'}
                    </div>
                  </div>
                  <BookMarked className="w-5 h-5 text-violet-700 shrink-0" />
                </div>
              </>
            ) : isSupervisor || isMentor ? (
              scopedTeachers.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-500">
                  No teachers are currently assigned to your account.
                </div>
              ) : (
                scopedTeachers.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-800 truncate">{t.fullName}</div>
                      <div className="text-[11px] text-stone-500 truncate">
                        {t.position} · {t.department} ·{' '}
                        <span className="font-semibold text-stone-700">{t.subject}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-1.5 shrink-0">
                      {t.driveUrl && (
                        <a
                          href={/^https?:\/\//i.test(t.driveUrl) ? t.driveUrl : `https://${t.driveUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-[#701628] bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded inline-flex items-center gap-1 transition-colors"
                          title={`Open ${t.fullName}'s Google Drive file`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Drive</span>
                        </a>
                      )}
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {isMentor
                          ? `${scopedLessonPlans.filter((lp) => lp.teacherId === t.id).length} DLLs`
                          : `${t.observationsCompleted} COTs`}
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : (
              supervisors.slice(0, 4).map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-stone-800">{s.fullName}</div>
                    <div className="text-[11px] text-stone-500">
                      {s.position} · {s.department}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-stone-700">
                      {s.assignedTeacherIds.length} Teachers
                    </div>
                    <div className="text-[10px] text-stone-400">
                      {s.totalObservationsThisTerm} COTs Completed
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent COT Observations (or Mentor PMCF & FAR Reports) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
          {isMentor ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Mentor Generated PMCF &amp; FAR Reports
                  </h3>
                  <p className="text-xs text-stone-500">
                    Generated from Lesson Plan, Formative/Summative Assessment, and IM/LM evaluations for assigned mentees
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('far-pmcf')}
                  className="text-xs text-[#701628] font-bold hover:underline cursor-pointer"
                >
                  Open Full Reports ({scopedPmcfRecords.length + scopedFarRecords.length}) →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-semibold bg-stone-50/60">
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Mentee</th>
                      <th className="py-2 px-3">Domain</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {scopedPmcfRecords.length === 0 && scopedFarRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-stone-500">
                          Evaluate a mentee&apos;s Lesson Plan, Assessment, or IM/LM to auto-generate PMCF &amp; FAR reports.
                        </td>
                      </tr>
                    ) : (
                      [
                        ...scopedPmcfRecords.slice(0, 3).map((r) => ({
                          id: r.id,
                          code: r.recordNo,
                          kind: 'PMCF',
                          teacher: r.teacherName,
                          domain: getPmcfCategory(r),
                          status: r.status,
                        })),
                        ...scopedFarRecords.slice(0, 3).map((r) => ({
                          id: r.id,
                          code: r.farCode,
                          kind: 'FAR',
                          teacher: r.teacherName,
                          domain: getFarCategory(r),
                          status: r.status,
                        })),
                      ].map((row) => (
                        <tr key={row.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-[#701628]">{row.code}</td>
                          <td className="py-2 px-3 font-bold text-stone-800">{row.kind}</td>
                          <td className="py-2 px-3 text-stone-800">{row.teacher}</td>
                          <td className="py-2 px-3 uppercase text-[10px] font-semibold text-violet-800">
                            {row.domain}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {isTeacher ? 'My Recent COT-PMES Observations' : 'Recent COT-PMES Observations'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Official classroom observation records &amp; ratings in your scope
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('observation')}
                  className="text-xs text-[#701628] font-bold hover:underline cursor-pointer"
                >
                  View All ({scopedObservations.length}) →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-semibold bg-stone-50/60">
                      <th className="py-2 px-3">COT Code</th>
                      <th className="py-2 px-3">Teacher</th>
                      <th className="py-2 px-3">Subject</th>
                      <th className="py-2 px-3 text-center">Score</th>
                      <th className="py-2 px-3">Rating</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {scopedObservations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-stone-500">
                          No classroom observation records found in your scope.
                        </td>
                      </tr>
                    ) : (
                      scopedObservations.slice(0, 4).map((obs) => (
                        <tr key={obs.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-[#701628]">
                            {obs.observationNo}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-stone-900">{obs.teacherName}</div>
                            <div className="text-[10px] text-stone-500">{obs.gradeAndSection}</div>
                          </td>
                          <td className="py-2 px-3 text-stone-700">{obs.subjectTaught}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-stone-800">
                            {obs.averageScore.toFixed(2)}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {obs.overallRating}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => onSelectObservationForPrint(obs.id)}
                              className="px-2 py-1 text-xs font-semibold text-[#701628] hover:bg-stone-100 rounded inline-flex items-center gap-1 cursor-pointer"
                              title="Print official DepEd form"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Administrative Transparency & Audit Registry Strip (Admin Only) */}
      {isAdmin && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-[#701628] rounded-lg border border-rose-200 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-900">
                Institutional Audit &amp; Transparency Registry
              </div>
              <div className="text-[11px] text-stone-500">
                Track real-time teacher roster modifications, supervisor/mentor appointments, and observation ratings with CSV export.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setAdminSubTab('audit-logs');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-3.5 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Audit Logs in Console ({auditLogs.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

