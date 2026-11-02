import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { NavTab } from '../components/Header';
import { DashboardOverviewCharts } from '../components/DashboardOverviewCharts';
import { DashboardCalendarWidget } from '../components/DashboardCalendarWidget';
import { AdminMeConsolidatedGraphs } from '../components/AdminMeConsolidatedGraphs';
import { AuditLogsView } from './AuditLogsView';
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
  Clock,
  ArrowRight,
  Eye,
  Plus,
  BookOpen,
  ShieldCheck,
  LayoutDashboard,
  BarChart3,
  Bell,
  CheckCheck,
  AlertCircle,
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
    observations,
    fleetingObservations,
    lessonPlans,
    pmcfRecords,
    assessments,
    auditLogs,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useData();
  const { currentUser, currentRole, isAdmin, isSupervisor, isTeacher } = useAuth();

  const dashboardNotifications = notifications.filter((n) => {
    if (isTeacher) {
      return n.recipientTeacherName === currentUser.fullName || n.recipientTeacherId === currentUser.id;
    }
    return true;
  });
  const unreadDashboardNotifications = dashboardNotifications.filter((n) => !n.read);

  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'audit-logs'>('overview');
  const [monthlyChartMode, setMonthlyChartMode] = useState<'bar' | 'area'>('bar');
  const [monthlyDeptFilter, setMonthlyDeptFilter] = useState<'All' | 'JHS' | 'SHS'>('All');

  // Metrics calculation
  const totalTeachers = teachers.length;
  const completedObservations = observations.filter((o) => o.status === 'Completed').length;
  const pendingLessonPlans = lessonPlans.filter((lp) => lp.status === 'Pending Inspection').length;
  const approvedLessonPlans = lessonPlans.filter((lp) => lp.status === 'Approved').length;
  const totalCoachingSessions = pmcfRecords.length;

  const totalMpsSum = assessments.reduce((acc, curr) => acc + curr.mps, 0);
  const averageMps = assessments.length > 0 ? (totalMpsSum / assessments.length).toFixed(1) : '78.8';

  // Monthly volume of completed classroom observations for Recharts
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

    const filteredCompleted = observations.filter((obs) => {
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
  }, [observations, monthlyDeptFilter]);

  const peakMonitoringMonth = useMemo(() => {
    const active = monthlyObservationChartData.filter((d) => d.completed > 0);
    if (active.length === 0) return { fullMonth: 'None', completed: 0 };
    return active.reduce((best, curr) => (curr.completed > best.completed ? curr : best), active[0]);
  }, [monthlyObservationChartData]);

  // Supervisor-specific view filter
  const supervisorAssignedTeachers = isSupervisor
    ? teachers.filter((t) => t.assignedSupervisorId === 'sup-1')
    : teachers;

  if (isAdmin && adminSubTab === 'audit-logs') {
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
              Administrator Master Console · {currentUser.fullName}
            </h2>
            <p className="text-xs md:text-sm text-stone-600 mt-0.5">
              DepEd Results-Based Performance Management System (RPMS-PPST) & System Governance
            </p>
          </div>

          {/* Sub-Tab Navigation for Administrator Master Console */}
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
              <span>Audit Logs & Transparency</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-stone-950 font-bold font-mono">
                {auditLogs.length}
              </span>
            </button>
          </div>
        </div>

        {/* Embedded Audit Logs Section */}
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
              ? `Welcome, Teacher ${currentUser.fullName}!`
              : isSupervisor
              ? `Instructional Supervision Console · ${currentUser.fullName}`
              : `Administrator Master Console · ${currentUser.fullName}`}
          </h2>
          <p className="text-xs md:text-sm text-stone-600 mt-0.5">
            DepEd Results-Based Performance Management System (RPMS-PPST) & Instructional Monitoring
          </p>
        </div>

        {/* Administrator Mode View Switcher or Quick Action Buttons */}
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

          {!isTeacher && (
            <>
              <button
                onClick={() => onNavigate('observation')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New COT Observation</span>
              </button>
              <button
                onClick={() => onNavigate('lesson-plans')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-900 text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Check Lesson Plans</span>
              </button>
            </>
          )}
          {isTeacher && (
            <button
              onClick={() => onNavigate('observation')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>View My COT Evaluations</span>
            </button>
          )}
        </div>
      </div>

      {/* In-App Teacher Notification & Alert Feed (Scheduled Observations & Verified Lesson Plans) */}
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
                      ? 'My In-App Alerts: Scheduled Observations & Verified Lesson Plans'
                      : 'In-App Teacher Notification Feed (Observations & Verified DLLs)'}
                  </h3>
                  {unreadDashboardNotifications.length > 0 && (
                    <span className="text-xs font-bold text-[#701628]">
                      · {unreadDashboardNotifications.length} Unread
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  Real-time alerts when a classroom observation is scheduled or a weekly lesson plan (DLL/DLP) is verified
                </p>
              </div>
            </div>
            {unreadDashboardNotifications.length > 0 && (
              <button
                onClick={() =>
                  markAllNotificationsAsRead(isTeacher ? currentUser.fullName : undefined)
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
                      <span>{isObs ? 'Open Observation' : 'Open Lesson Plan'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 High-Density Key Indicator Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1 */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Teachers Monitored
            </span>
            <Users className="w-4 h-4 text-[#701628]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
              {totalTeachers}
            </span>
            <span className="text-xs text-emerald-600 font-medium">100% Rostered</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>{supervisors.length} Instructional Supervisors</span>
            <button
              onClick={() => onNavigate('roster')}
              className="text-[#701628] font-bold hover:underline"
            >
              Roster →
            </button>
          </div>
        </div>

        {/* Tile 2 */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              COT Observations
            </span>
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
              {completedObservations}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              of {totalTeachers * 2} Target (Q1-Q2)
            </span>
          </div>
          <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>Avg Rating: 5.8 / 7.0</span>
            <button
              onClick={() => onNavigate('observation')}
              className="text-emerald-700 font-bold hover:underline"
            >
              Records →
            </button>
          </div>
        </div>

        {/* Tile 3 */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Lesson Plans (DLL)
            </span>
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
              {approvedLessonPlans}
            </span>
            <span className="text-xs text-amber-700 font-medium">Approved this Week</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>{pendingLessonPlans} Pending Review</span>
            <button
              onClick={() => onNavigate('lesson-plans')}
              className="text-amber-800 font-bold hover:underline"
            >
              Inspect →
            </button>
          </div>
        </div>

        {/* Tile 4 */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              School-Wide MPS
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
              {averageMps}%
            </span>
            <span className="text-xs text-emerald-600 font-medium">Target Met (&ge;75%)</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>{totalCoachingSessions} PMCF Sessions Conducted</span>
            <button
              onClick={() => onNavigate('ims-assessments')}
              className="text-blue-700 font-bold hover:underline"
            >
              Analysis →
            </button>
          </div>
        </div>
      </div>

      {/* Administrator Consolidated Report Graphs for All 4 DepEd M & E Monitoring Tools (% of Indicators & by Terms) */}
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

      {/* Recharts Monthly Volume of Completed Classroom Observations */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
              <BarChart3 className="w-3.5 h-3.5 text-[#701628]" />
              <span>Instructional Monitoring Activity Overview</span>
              <span aria-hidden="true">·</span>
              <span>SY {schoolProfile.currentSchoolYear}</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 mt-0.5">
              Monthly Volume of Completed Classroom Observations
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Completed COT-PMES and Classroom Observation evaluations aggregated by month across the academic year
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
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

            {/* Chart Type Switcher */}
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

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
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

        {/* Recharts Canvas */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {monthlyChartMode === 'bar' ? (
              <BarChart
                data={monthlyObservationChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
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
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
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

      {/* D3 Charts Summary Widget: Total Lesson Plans, Observations Conducted & Active Faculty */}
      <DashboardOverviewCharts
        teachers={teachers}
        supervisors={supervisors}
        observations={observations}
        lessonPlans={lessonPlans}
        onNavigate={onNavigate}
      />

      {/* Calendar Widget: Upcoming Observation Schedules & Lesson Plan Deadlines */}
      <DashboardCalendarWidget
        observations={observations}
        lessonPlans={lessonPlans}
        teachers={teachers}
        supervisors={supervisors}
        onNavigate={onNavigate}
        onSelectObservationForPrint={onSelectObservationForPrint}
      />

      {/* Main 2-Column Split: Principal's Statement & Term Monitoring Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Principal's Corner Card (Feature 1 & 4) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-3">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Office of the Secondary School Principal</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Photo */}
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

              {/* Bio & Statement */}
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

          {/* Quick link to Banner & Bio settings if admin */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500">Instructional Leadership & Supervision Mandate</span>
            {isAdmin && (
              <button
                onClick={() => onNavigate('settings')}
                className="text-[#701628] font-bold hover:underline"
              >
                Edit Principal Statement & Banner →
              </button>
            )}
          </div>
        </div>

        {/* Term Activity Progress & DepEd Targets */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                SY 2026-2027 Supervision Cycle
              </h3>
              <span className="text-xs bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded">
                Active: Term 1
              </span>
            </div>

            <div className="space-y-4">
              {/* Term 1 */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                  <span>Term 1 / Q1 (August - October)</span>
                  <span className="font-mono text-[#701628]">82% Completed</span>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#701628] h-full rounded-full" style={{ width: '82%' }} />
                </div>
                <div className="flex justify-between text-[11px] text-stone-500 mt-0.5">
                  <span>Observations: 14 / 16 done</span>
                  <span>DLL Weekly Reviews: 94%</span>
                </div>
              </div>

              {/* Term 2 */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                  <span>Term 2 / Q2 (November - January)</span>
                  <span className="font-mono text-stone-500">Upcoming (15%)</span>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '15%' }} />
                </div>
                <div className="flex justify-between text-[11px] text-stone-500 mt-0.5">
                  <span>Pre-observation conferences scheduled</span>
                </div>
              </div>

              {/* Term 3 */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                  <span>Term 3 / Q3-Q4 (February - May)</span>
                  <span className="font-mono text-stone-400">Scheduled (0%)</span>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-stone-300 h-full rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>DepEd Order No. 42 & RPMS PPST</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-[#701628] font-bold hover:underline"
            >
              View Term Reports →
            </button>
          </div>
        </div>
      </div>

      {/* Supervisory Roster & Recent Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Supervisory Roster Overview */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                {isSupervisor ? 'My Assigned Teachers' : 'Supervisory Roster'}
              </h3>
              <p className="text-xs text-stone-500">
                {isSupervisor
                  ? 'Teachers assigned to your department supervision'
                  : 'Instructional Supervisors and Department Heads'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('roster')}
              className="text-xs text-[#701628] font-bold hover:underline"
            >
              Full Roster →
            </button>
          </div>

          <div className="divide-y divide-stone-100">
            {isSupervisor
              ? supervisorAssignedTeachers.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-stone-800">{t.fullName}</div>
                      <div className="text-[11px] text-stone-500">
                        {t.position} · {t.department} · <span className="font-semibold text-stone-700">{t.subject}</span> ({t.gradeLevels.join(', ')})
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {t.observationsCompleted} COTs
                      </span>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {t.lastObservationDate ? `Obs: ${t.lastObservationDate}` : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))
              : supervisors.slice(0, 3).map((s) => (
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
                ))}
          </div>
        </div>

        {/* Recent Classroom Observations Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Recent COT-PMES Observations</h3>
              <p className="text-xs text-stone-500">Official classroom observation records & ratings</p>
            </div>
            <button
              onClick={() => onNavigate('observation')}
              className="text-xs text-[#701628] font-bold hover:underline"
            >
              View All ({observations.length}) →
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
                {observations.slice(0, 4).map((obs) => (
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
                        className="px-2 py-1 text-xs font-semibold text-[#701628] hover:bg-stone-100 rounded inline-flex items-center gap-1"
                        title="Print official DepEd form"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Administrative Transparency & Audit Registry Strip */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-[#701628] rounded-lg border border-rose-200 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-900">Institutional Audit & Transparency Registry</div>
            <div className="text-[11px] text-stone-500">
              Track real-time teacher roster modifications, supervisor appointments, and observation ratings with CSV export.
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            if (isAdmin) {
              setAdminSubTab('audit-logs');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              onNavigate('audit-logs');
            }
          }}
          className="px-3.5 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span>Open Audit Logs in Console ({auditLogs.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
