import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  GraduationCap,
  ClipboardCheck,
  FileSpreadsheet,
  Users,
  Compass,
  FileText,
  BookOpen,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  UserCheck,
  LogOut,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Cloud,
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'observation'
  | 'lesson-plans'
  | 'fleeting'
  | 'far-pmcf'
  | 'ims-assessments'
  | 'roster'
  | 'audit-logs'
  | 'reports'
  | 'settings';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenLoginModal: () => void;
  onOpenChangePasswordModal: () => void;
  onOpenForgotPassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenLoginModal,
  onOpenChangePasswordModal,
  onOpenForgotPassword,
}) => {
  const {
    currentUser,
    currentRole,
    switchRoleQuick,
    switchToSupervisor,
    switchToTeacher,
    logout,
  } = useAuth();
  const {
    schoolProfile,
    supervisors,
    teachers,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    cloudSyncStatus,
    lastCloudSyncTime,
    syncToCloudNow,
  } = useData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [notifTypeFilter, setNotifTypeFilter] = useState<'all' | 'observation_scheduled' | 'lesson_plan_verified'>('all');
  const [liveToastId, setLiveToastId] = useState<string | null>(null);
  const prevNotifCountRef = useRef<number>(notifications.length);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const navScrollRef = useRef<HTMLDivElement>(null);

  // Detect newly created notifications during the session to show an immediate toast alert
  useEffect(() => {
    if (notifications.length > prevNotifCountRef.current && notifications[0]) {
      const latest = notifications[0];
      if (currentRole !== 'teacher' || latest.recipientTeacherName === currentUser.fullName) {
        setLiveToastId(latest.id);
        const timer = setTimeout(() => {
          setLiveToastId(null);
        }, 6500);
        prevNotifCountRef.current = notifications.length;
        return () => clearTimeout(timer);
      }
    }
    prevNotifCountRef.current = notifications.length;
  }, [notifications, currentRole, currentUser.fullName]);

  const roleFilteredNotifications = notifications.filter((n) => {
    if (currentRole === 'teacher') {
      return n.recipientTeacherName === currentUser.fullName || n.recipientTeacherId === currentUser.id;
    }
    return true;
  });

  const visibleNotifications = roleFilteredNotifications.filter((n) => {
    if (notifTypeFilter === 'all') return true;
    return n.type === notifTypeFilter;
  });

  const unreadCount = roleFilteredNotifications.filter((n) => !n.read).length;
  const activeToastNotif = liveToastId ? notifications.find((n) => n.id === liveToastId) : null;

  const navItems: {
    id: NavTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', sublabel: 'Overview', icon: GraduationCap },
    { id: 'observation', label: 'COT-PMES', sublabel: 'Observations', icon: ClipboardCheck },
    { id: 'lesson-plans', label: 'Lesson Plans', sublabel: 'DLL / DLP Check', icon: FileSpreadsheet },
    { id: 'fleeting', label: 'Classroom Observation', sublabel: 'Fleeting Visits', icon: Compass },
    { id: 'far-pmcf', label: 'Assessment', sublabel: 'FAR & Coaching', icon: FileText },
    { id: 'ims-assessments', label: 'IMs & LMs', sublabel: 'QA & Scores', icon: BookOpen },
    { id: 'roster', label: 'Personnel & Roster', sublabel: 'Faculty Directory', icon: Users },
    { id: 'reports', label: 'Reports & Links', sublabel: 'Exports & Drive', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', sublabel: 'School Setup', icon: Settings },
  ];

  // Check scroll capability
  const updateScrollButtons = () => {
    if (navScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const el = navScrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateScrollButtons, { passive: true });
      window.addEventListener('resize', updateScrollButtons);

      // Support mouse-wheel horizontal scrolling for laptops and desktop mice
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      };
      el.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        el.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
        el.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      navScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#701628] border-b border-amber-500/20 shadow-lg">
      {/* Primary Top Bar */}
      <div className="w-full mx-auto px-2 sm:px-3 lg:px-4 xl:px-6">
        <div className="flex items-center justify-between h-14 sm:h-15 gap-1 xl:gap-2">
          {/* Left Scroll Arrow (shows if content overflows on smaller screens) */}
          {canScrollLeft && (
            <button
              onClick={() => handleScroll('left')}
              className="flex items-center justify-center w-6 h-7 rounded-lg bg-black/50 hover:bg-black/75 text-amber-300 hover:text-amber-200 border border-amber-400/40 hover:border-amber-400 transition-all shrink-0 shadow-sm cursor-pointer z-10 active:scale-95"
              title="Scroll menus left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Navigation Links occupying the horizontal space with all 9 menus visible on desktop & laptop */}
          <div
            ref={navScrollRef}
            className="flex-1 flex items-center justify-start lg:justify-center gap-1 sm:gap-1 lg:gap-1 xl:gap-1.5 2xl:gap-2 overflow-x-auto py-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={`${item.label} (${item.sublabel})`}
                  className={`group relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2 lg:px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-xl text-[11px] xl:text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-stone-950 font-bold shadow-md ring-2 ring-amber-300/70 scale-[1.01]'
                      : 'text-amber-100 bg-black/20 hover:bg-black/35 hover:text-white border border-white/10 hover:border-amber-400/40 hover:shadow-xs'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-stone-950' : 'text-amber-300'
                    }`}
                  />
                  <span className="tracking-tight">
                    {item.id === 'roster' ? (
                      <>
                        <span className="hidden 2xl:inline">Personnel & </span>Roster
                      </>
                    ) : item.id === 'reports' ? (
                      <>
                        Reports<span className="hidden xl:inline"> & Links</span>
                      </>
                    ) : (
                      item.label
                    )}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#701628] animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Scroll Arrow (shows if content overflows) */}
          {canScrollRight && (
            <button
              onClick={() => handleScroll('right')}
              className="flex items-center justify-center w-6 h-7 rounded-lg bg-black/50 hover:bg-black/75 text-amber-300 hover:text-amber-200 border border-amber-400/40 hover:border-amber-400 transition-all shrink-0 shadow-sm cursor-pointer z-10 active:scale-95"
              title="Scroll menus right"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Zone 3: User Role Switcher & Account Access */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Cloud Persistence Status & Instant Sync */}
            <button
              onClick={async () => {
                await syncToCloudNow();
              }}
              className="flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 border border-emerald-400/40 text-white text-xs font-medium transition-all shadow-xs cursor-pointer group"
              title={`Cloud Database: ${
                cloudSyncStatus === 'synced'
                  ? 'All changes saved & synced to Google Cloud Firestore (Intact for publishing)'
                  : cloudSyncStatus === 'syncing'
                  ? 'Saving changes to cloud...'
                  : 'Cloud ready'
              }. Click to sync now.`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  cloudSyncStatus === 'synced'
                    ? 'bg-emerald-400 ring-2 ring-emerald-400/40'
                    : cloudSyncStatus === 'syncing'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-300'
                }`}
              />
              <Cloud className="w-3.5 h-3.5 text-emerald-300 group-hover:scale-110 transition-transform" />
              <span className="hidden xl:inline text-[11px] font-semibold text-emerald-200">
                {cloudSyncStatus === 'synced'
                  ? 'Cloud Synced'
                  : cloudSyncStatus === 'syncing'
                  ? 'Saving...'
                  : 'Cloud'}
              </span>
            </button>

            {/* In-App Teacher Notification Bell & Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotifDropdownOpen(!isNotifDropdownOpen);
                  setIsRoleDropdownOpen(false);
                }}
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/30 hover:bg-black/45 border border-amber-400/30 text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
                title="Teacher Alerts: Scheduled Classroom Observations & Verified Lesson Plans"
                aria-label="Open notifications"
              >
                <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-300' : 'text-amber-100/80'}`} />
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-amber-400 text-stone-950 rounded-full shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 text-stone-800 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setIsNotifDropdownOpen(false)}
                >
                  <div className="px-4 py-3 bg-[#701628] text-white flex items-center justify-between border-b border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-300" />
                      <div>
                        <div className="text-xs font-bold">
                          {currentRole === 'teacher' ? 'My Teacher Alerts' : 'Teacher Notification Center'}
                        </div>
                        <div className="text-[10px] text-amber-200/90">
                          Scheduled Observations & Verified Lesson Plans
                        </div>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() =>
                          markAllNotificationsAsRead(
                            currentRole === 'teacher' ? currentUser.fullName : undefined
                          )
                        }
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[10px] font-bold text-amber-200 transition-colors cursor-pointer"
                        title="Mark all notifications as read"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 p-2 bg-stone-100 border-b border-stone-200 text-[11px]">
                    <button
                      onClick={() => setNotifTypeFilter('all')}
                      className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                        notifTypeFilter === 'all'
                          ? 'bg-white text-[#701628] shadow-2xs font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      All ({roleFilteredNotifications.length})
                    </button>
                    <button
                      onClick={() => setNotifTypeFilter('observation_scheduled')}
                      className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                        notifTypeFilter === 'observation_scheduled'
                          ? 'bg-white text-[#701628] shadow-2xs font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Observations
                    </button>
                    <button
                      onClick={() => setNotifTypeFilter('lesson_plan_verified')}
                      className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                        notifTypeFilter === 'lesson_plan_verified'
                          ? 'bg-white text-[#701628] shadow-2xs font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Lesson Plans
                    </button>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                    {visibleNotifications.length === 0 ? (
                      <div className="py-8 px-4 text-center text-xs text-stone-500">
                        No notifications found for this filter.
                      </div>
                    ) : (
                      visibleNotifications.map((notif) => {
                        const isObs = notif.type === 'observation_scheduled';
                        const isNeedsRevision = notif.statusBadge === 'Needs Revision';
                        return (
                          <div
                            key={notif.id}
                            className={`p-3.5 transition-colors hover:bg-stone-50 ${
                              !notif.read ? 'bg-amber-50/40' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                onClick={() => {
                                  markNotificationAsRead(notif.id);
                                  onTabChange(notif.targetTab);
                                  setIsNotifDropdownOpen(false);
                                }}
                                className="flex items-start gap-2.5 text-left flex-1 cursor-pointer"
                              >
                                <div
                                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                    isObs
                                      ? 'bg-amber-100 text-[#701628]'
                                      : isNeedsRevision
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {isObs ? (
                                    <Calendar className="w-4 h-4" />
                                  ) : isNeedsRevision ? (
                                    <AlertCircle className="w-4 h-4" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-stone-900 leading-snug">
                                      {notif.title}
                                    </span>
                                    {!notif.read && (
                                      <span className="w-2 h-2 rounded-full bg-[#701628] shrink-0" />
                                    )}
                                  </div>
                                  <div className="text-[11px] font-semibold text-[#701628] mt-0.5">
                                    Teacher: {notif.recipientTeacherName}
                                  </div>
                                  <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                                    {notif.message}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-1.5">
                                    <span>{notif.formattedDate}</span>
                                    {notif.referenceCode && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-mono font-semibold text-stone-600">
                                          {notif.referenceCode}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </button>

                              <button
                                onClick={() => deleteNotification(notif.id)}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded-lg transition-colors shrink-0 cursor-pointer"
                                title="Dismiss notification"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Role Indicator & Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsRoleDropdownOpen(!isRoleDropdownOpen);
                  setIsNotifDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/30 hover:bg-black/45 border border-amber-400/30 text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
                title="Account Settings & Quick Switch"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 shrink-0" />
                <div className="text-left hidden md:block">
                  <div className="font-bold text-[10px] leading-tight text-amber-300 capitalize">
                    {currentRole === 'admin'
                      ? 'Administrator'
                      : currentRole === 'supervisor'
                      ? 'Supervisor'
                      : 'Teacher'}
                  </div>
                  <div className="text-[10px] text-white/80 truncate max-w-[80px] xl:max-w-[105px] font-medium">
                    {currentUser.fullName.split(',')[0]}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-amber-300 ml-0.5 shrink-0" />
              </button>

              {/* Role & Account Dropdown with Vertical Scrollbar */}
              {isRoleDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-84 max-h-[calc(100vh-4.5rem)] overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 text-stone-800 animate-in fade-in slide-in-from-top-2 duration-150 [scrollbar-width:thin]"
                >
                  <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50/90 sticky top-0 z-10 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                        Currently Authenticated
                      </div>
                      <div className="text-xs font-bold text-[#701628] truncate mt-0.5">
                        {currentUser.fullName}
                      </div>
                      <div className="text-[11px] text-stone-500 font-medium">{currentUser.title}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer shrink-0"
                      title="Close menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="py-1">
                    <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Switch Role & Access Control
                    </div>

                    {/* Administrator Option */}
                    <button
                      onClick={() => {
                        switchRoleQuick('admin');
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-amber-50 transition-colors cursor-pointer ${
                        currentRole === 'admin' ? 'font-bold text-[#701628] bg-amber-50/70 border-l-3 border-[#701628]' : 'text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
                        <div>
                          <div className="font-semibold">Administrator</div>
                          <div className="text-[10px] text-stone-500">Full system & personnel control</div>
                        </div>
                      </div>
                      {currentRole === 'admin' && <span className="text-xs text-[#701628] font-bold">●</span>}
                    </button>

                    {/* Quick Access to Administrator Console & Personnel Control Buttons */}
                    {currentRole === 'admin' && (
                      <div className="border-t border-dashed border-stone-200 bg-rose-50/30 divide-y divide-stone-100">
                        <button
                          onClick={() => {
                            onTabChange('dashboard');
                            setIsRoleDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-1.5 text-[11px] flex items-center justify-between hover:bg-rose-50 text-[#701628] font-medium transition-colors cursor-pointer"
                          title="Open Administrator Master Console and view Audit Logs"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#701628]" />
                            <span>Console · Audit Logs & Transparency</span>
                          </div>
                          <span className="text-[9px] font-bold bg-[#701628] text-white px-1.5 py-0.2 rounded-full">
                            Open
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            onTabChange('roster');
                            setIsRoleDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-1.5 text-[11px] flex items-center justify-between hover:bg-rose-50 text-[#701628] font-medium transition-colors cursor-pointer"
                          title="Open Personnel & Roster Control"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-[#701628]" />
                            <span>Personnel & Roster Control</span>
                          </div>
                          <span className="text-[9px] font-bold bg-amber-400 text-stone-950 px-1.5 py-0.2 rounded-full">
                            Manage
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Registered Instructional Supervisors Section */}
                    <div className="mt-1 pt-1 border-t border-stone-100">
                      <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50/70 flex items-center justify-between">
                        <span>Instructional Supervisors ({supervisors.length})</span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Registered
                        </span>
                      </div>
                      <div className="max-h-40 overflow-y-auto divide-y divide-stone-100/70 [scrollbar-width:thin]">
                        {supervisors.length === 0 ? (
                          <div className="px-4 py-2 text-[11px] text-stone-400 italic">
                            No registered supervisors found.
                          </div>
                        ) : (
                          supervisors.map((s) => {
                            const isCurrentSupervisor =
                              currentRole === 'supervisor' &&
                              (currentUser.id === s.id || currentUser.fullName === s.fullName);
                            return (
                              <button
                                key={s.id}
                                onClick={() => {
                                  switchToSupervisor(s);
                                  setIsRoleDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-emerald-50/80 transition-colors cursor-pointer ${
                                  isCurrentSupervisor
                                    ? 'font-bold text-emerald-950 bg-emerald-50 border-l-3 border-[#701628]'
                                    : 'text-stone-700'
                                }`}
                                title={`Switch to ${s.fullName} (${s.position})`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <ShieldCheck
                                    className={`w-4 h-4 shrink-0 ${
                                      isCurrentSupervisor ? 'text-emerald-700' : 'text-stone-400'
                                    }`}
                                  />
                                  <div className="truncate">
                                    <div className="font-semibold text-stone-900 truncate">
                                      {s.fullName}
                                    </div>
                                    <div className="text-[10px] text-stone-500 truncate">
                                      {s.position} · {s.department}
                                    </div>
                                  </div>
                                </div>
                                {isCurrentSupervisor ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                                    Active
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-stone-400 shrink-0">
                                    Switch
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Registered Teaching Personnel Section */}
                    <div className="mt-1 pt-1 border-t border-stone-100">
                      <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50/70 flex items-center justify-between">
                        <span>Teaching Personnel ({teachers.length})</span>
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                          Registered
                        </span>
                      </div>
                      <div className="max-h-40 overflow-y-auto divide-y divide-stone-100/70 [scrollbar-width:thin]">
                        {teachers.map((t) => {
                          const isCurrentTeacher =
                            currentRole === 'teacher' &&
                            (currentUser.id === t.id || currentUser.fullName === t.fullName);
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                switchToTeacher(t);
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-1.5 text-xs flex items-center justify-between hover:bg-blue-50/80 transition-colors cursor-pointer ${
                                isCurrentTeacher
                                  ? 'font-bold text-blue-950 bg-blue-50 border-l-3 border-[#701628]'
                                  : 'text-stone-700'
                              }`}
                              title={`Switch to Teacher ${t.fullName}`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <GraduationCap
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isCurrentTeacher ? 'text-blue-700' : 'text-stone-400'
                                  }`}
                                />
                                <div className="truncate">
                                  <div className="font-semibold text-stone-900 truncate text-[11px]">
                                    {t.fullName}
                                  </div>
                                  <div className="text-[10px] text-stone-500 truncate">
                                    {t.position} - {t.subject || 'Faculty'}
                                  </div>
                                </div>
                              </div>
                              {isCurrentTeacher ? (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full shrink-0">
                                  Active
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400 shrink-0">
                                  Switch
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Cloud Storage & Publish Integrity Card */}
                  <div className="mx-2 mb-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center justify-between text-emerald-900 font-bold mb-1">
                      <span className="flex items-center gap-1">
                        <Cloud className="w-3.5 h-3.5 text-emerald-700" />
                        Cloud Firestore Active
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono font-bold">
                        {cloudSyncStatus === 'synced' ? 'Synced' : cloudSyncStatus}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-800 leading-snug">
                      Personnel roster, supervisory assignments, and COT records are permanently saved to Google Cloud Firestore. When you publish, your modifications remain 100% intact.
                    </p>
                    {lastCloudSyncTime && (
                      <div className="text-[9px] text-emerald-700 mt-1 font-mono">
                        Last synced: {lastCloudSyncTime}
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        await syncToCloudNow();
                      }}
                      className="mt-2 w-full py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Cloud className="w-3 h-3" />
                      <span>Sync Now to Cloud</span>
                    </button>
                  </div>

                  {/* Security & Password Button Menu */}
                  <div className="border-t border-stone-200 pt-2 mt-1 px-2 pb-1 space-y-1 bg-white">
                    <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Account & Security Menu
                    </div>
                    <button
                      onClick={() => {
                        setIsRoleDropdownOpen(false);
                        onOpenChangePasswordModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-stone-500" />
                      <span>Change Account Password</span>
                    </button>

                    {onOpenForgotPassword && (
                      <button
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          onOpenForgotPassword();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-amber-900 bg-amber-50 hover:bg-amber-100/80 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-700" />
                        <span>Supervisor Password Reset (OTP)</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsRoleDropdownOpen(false);
                        onOpenLoginModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Switch Account / Portal Sign In</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsRoleDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle (for small screens) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-amber-100 hover:text-white hover:bg-black/30 border border-amber-400/20 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#580e1c] border-t border-amber-500/20 px-4 py-3 space-y-2 animate-in fade-in duration-150">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80 pb-1">
            System Modules & Tools
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isActive
                      ? 'bg-amber-400 text-stone-900 font-bold shadow-sm'
                      : 'text-amber-100 hover:bg-[#430814] hover:text-white bg-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 text-amber-300" />
                    <div>
                      <div className="font-bold">{item.label}</div>
                      <div className="text-[10px] opacity-75">{item.sublabel}</div>
                    </div>
                  </div>
                  {isActive && <span className="text-xs font-bold">●</span>}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200">
            <span>School ID: {schoolProfile.schoolId}</span>
            <div className="flex items-center gap-3">
              {onOpenForgotPassword && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenForgotPassword();
                  }}
                  className="font-bold underline text-amber-300 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Reset Supervisor Password</span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenLoginModal();
                }}
                className="font-bold underline text-amber-300"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Real-Time Toast Banner when a new Observation is Scheduled or Lesson Plan is Verified */}
      {activeToastNotif && (
        <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-[#701628] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#701628] px-4 py-2 text-white flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <Bell className="w-3.5 h-3.5 text-amber-300" />
              <span>New Teacher Alert · {activeToastNotif.recipientTeacherName}</span>
            </div>
            <button
              onClick={() => setLiveToastId(null)}
              className="text-amber-200 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3.5 text-xs space-y-2">
            <div className="font-bold text-stone-900">{activeToastNotif.title}</div>
            <p className="text-[11px] text-stone-600 leading-relaxed">{activeToastNotif.message}</p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-stone-400">{activeToastNotif.formattedDate}</span>
              <button
                onClick={() => {
                  markNotificationAsRead(activeToastNotif.id);
                  onTabChange(activeToastNotif.targetTab);
                  setLiveToastId(null);
                }}
                className="px-3 py-1 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg text-[11px] cursor-pointer"
              >
                View Record →
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
