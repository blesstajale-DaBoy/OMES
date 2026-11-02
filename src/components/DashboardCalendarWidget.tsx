import React, { useState, useMemo, useEffect } from 'react';
import { ClassroomObservation, LessonPlanCheck, Teacher, Supervisor } from '../types';
import { NavTab } from './Header';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardCheck,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  User,
  Plus,
  BookOpen,
  CalendarDays,
  ExternalLink,
  Megaphone,
  Bell,
  Sparkles,
  X,
  Trash2,
  CheckSquare,
  ListTodo,
  AlignLeft,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  type: 'observation' | 'deadline' | 'announcement' | 'task';
  dateStr: string; // YYYY-MM-DD
  title: string;
  subtitle: string;
  shortLabel?: string;
  time?: string;
  department?: string;
  status?: string;
  teacherName?: string;
  supervisorName?: string;
  subject?: string;
  gradeAndSection?: string;
  weekNumber?: number | string;
  obsId?: string;
  planId?: string;
}

interface DashboardCalendarWidgetProps {
  observations: ClassroomObservation[];
  lessonPlans: LessonPlanCheck[];
  teachers: Teacher[];
  supervisors: Supervisor[];
  onNavigate: (tab: NavTab) => void;
  onSelectObservationForPrint?: (obsId: string) => void;
}

export const DashboardCalendarWidget: React.FC<DashboardCalendarWidgetProps> = ({
  observations,
  lessonPlans,
  teachers,
  supervisors,
  onNavigate,
  onSelectObservationForPrint,
}) => {
  // Current reference date (Oct 29, 2026)
  const currentDateStr = '2026-10-29';
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(9); // 0-indexed: 9 = October
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-30'); // Default selected to upcoming deadline
  const [filterType, setFilterType] = useState<'all' | 'observation' | 'deadline' | 'announcement' | 'task'>('all');
  const [scheduleDisplayMode, setScheduleDisplayMode] = useState<'timeline' | 'list'>('timeline');
  const [scheduleCategoryFilter, setScheduleCategoryFilter] = useState<'all' | 'announcement' | 'deadline' | 'task' | 'observation'>('all');

  // Helper to check if a 'deadline' item has passed its due date without being completed
  const isDeadlineOverdue = (ev: CalendarEvent): boolean => {
    if (ev.type !== 'deadline') return false;
    const isDone =
      ev.status === 'Completed' ||
      ev.status === 'Approved' ||
      ev.status === 'Conducted' ||
      ev.status === 'Verified';
    return !isDone && ev.dateStr < currentDateStr;
  };

  // Default seeded custom Schedules & Deadlines (Announcement, Deadline, Task)
  const defaultCustomSchedules: CalendarEvent[] = [
    {
      id: 'custom-deadline-seed-overdue',
      type: 'deadline',
      dateStr: '2026-10-26',
      title: 'Submission of Term 1 Table of Specifications (TOS) & Test Questions',
      shortLabel: 'TOS Due (Overdue)',
      subtitle: 'Mandatory quality assurance submission of Quarterly Examination TOS and Answer Keys.',
      time: '05:00 PM',
      department: 'All Departments',
      status: 'Pending Submission',
    },
    {
      id: 'custom-task-seed-1',
      type: 'task',
      dateStr: '2026-10-28',
      title: 'Consolidate Term 1 TOS & Quarterly Exam Item Analysis',
      shortLabel: 'Task: TOS QA',
      subtitle: 'Verify Table of Specifications (TOS) and least-mastered competencies across JHS & SHS departments.',
      time: '04:00 PM',
      department: 'Master Teachers & Head Teachers',
      status: 'In Progress',
    },
    {
      id: 'custom-deadline-seed-2',
      type: 'deadline',
      dateStr: '2026-10-30',
      title: 'Submission of Checked DLLs & PMCF Coaching Logs',
      shortLabel: 'DLL & PMCF Due',
      subtitle: 'All department heads and master teachers must submit verified Week 10 DLLs and PMCF forms.',
      time: '05:00 PM',
      department: 'All Departments',
      status: 'Upcoming',
    },
    {
      id: 'custom-announcement-seed-3',
      type: 'announcement',
      dateStr: '2026-11-03',
      title: 'Division Instructional Supervision & LAC Calibration',
      shortLabel: 'LAC Calibration',
      subtitle: 'School-wide conference on COT-PMES rubric calibration and classroom walkthrough tools.',
      time: '01:30 PM - 04:30 PM',
      department: 'School-Wide',
      status: 'Official Memo',
    },
  ];

  // Custom Deadlines, Announcements & Tasks created by user
  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem('bnhs_omes_custom_calendar_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return defaultCustomSchedules;
    } catch {
      return defaultCustomSchedules;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bnhs_omes_custom_calendar_events', JSON.stringify(customEvents));
    } catch {
      // Ignore storage quota errors
    }
  }, [customEvents]);

  // Modal state for creating a new Schedule & Deadline (Announcement, Deadline, Task)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventModalType, setEventModalType] = useState<'announcement' | 'deadline' | 'task'>('deadline');
  const [eventDate, setEventDate] = useState<string>('2026-10-30');
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventShortLabel, setEventShortLabel] = useState<string>('');
  const [eventSubtitle, setEventSubtitle] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('05:00 PM');
  const [eventDepartment, setEventDepartment] = useState<string>('All Departments');
  const [eventStatus, setEventStatus] = useState<string>('Scheduled');

  const openAddEventModal = (type: 'announcement' | 'deadline' | 'task' = 'deadline', defaultDate?: string) => {
    const targetDate = defaultDate || selectedDate || '2026-10-30';
    setEventModalType(type);
    setEventDate(targetDate);
    setEventTitle('');
    setEventShortLabel('');
    setEventSubtitle('');
    setEventTime(type === 'deadline' ? '05:00 PM' : type === 'task' ? '04:00 PM' : '08:00 AM - 05:00 PM');
    setEventDepartment('All Departments');
    setEventStatus(type === 'deadline' ? 'Upcoming' : type === 'task' ? 'In Progress' : 'Official Memo');
    setIsEventModalOpen(true);
  };

  const handleSaveCustomEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;

    const newEvent: CalendarEvent = {
      id: `custom-${eventModalType}-${Date.now()}`,
      type: eventModalType,
      dateStr: eventDate,
      title: eventTitle.trim(),
      shortLabel: eventShortLabel.trim() || eventTitle.trim().slice(0, 18),
      subtitle:
        eventSubtitle.trim() ||
        (eventModalType === 'deadline'
          ? 'Supervisory Submission Deadline'
          : eventModalType === 'task'
          ? 'Supervisory Monitoring Task'
          : 'School / Division Announcement'),
      time: eventTime.trim() || (eventModalType === 'deadline' ? '05:00 PM' : 'All Day'),
      department: eventDepartment.trim() || 'All Departments',
      status: eventStatus.trim() || 'Scheduled',
    };

    setCustomEvents((prev) => [newEvent, ...prev]);
    setSelectedDate(eventDate);

    // Jump calendar view to the month/year of the newly created event
    const [y, m] = eventDate.split('-').map(Number);
    if (y && m) {
      setCurrentYear(y);
      setCurrentMonth(m - 1);
    }

    setIsEventModalOpen(false);
  };

  const handleToggleEventComplete = (id: string) => {
    setCustomEvents((prev) =>
      prev.map((ev) =>
        ev.id === id
          ? { ...ev, status: ev.status === 'Completed' ? 'Upcoming' : 'Completed' }
          : ev
      )
    );
  };

  const handleDeleteCustomEvent = (id: string) => {
    setCustomEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  // DepEd Official Weekly Lesson Plan (DLL) Deadlines (Fridays 5:00 PM for upcoming teaching week)
  const scheduledDllDeadlines: CalendarEvent[] = useMemo(() => {
    return [
      {
        id: 'dll-deadline-w8',
        type: 'deadline',
        dateStr: '2026-10-16',
        title: 'Week 8 DLL Submission Deadline',
        shortLabel: 'DLL W8 Due',
        subtitle: 'DepEd Order No. 42 s. 2016 · Weekly Lesson Log Submission',
        time: '05:00 PM',
        weekNumber: 8,
        status: 'Completed',
        department: 'All Departments',
      },
      {
        id: 'dll-deadline-w9',
        type: 'deadline',
        dateStr: '2026-10-23',
        title: 'Week 9 DLL Submission Deadline',
        shortLabel: 'DLL W9 Due',
        subtitle: 'DepEd Order No. 42 s. 2016 · Weekly Lesson Log Submission',
        time: '05:00 PM',
        weekNumber: 9,
        status: 'Completed',
        department: 'All Departments',
      },
      {
        id: 'dll-deadline-w10',
        type: 'deadline',
        dateStr: '2026-10-30',
        title: 'Week 10 DLL Submission Deadline',
        shortLabel: 'DLL W10 Due (5PM)',
        subtitle: 'DepEd Order No. 42 s. 2016 · Weekly Lesson Log Submission',
        time: '05:00 PM',
        weekNumber: 10,
        status: 'Upcoming Deadline',
        department: 'All Departments',
      },
      {
        id: 'dll-deadline-w11',
        type: 'deadline',
        dateStr: '2026-11-06',
        title: 'Week 11 DLL Submission Deadline',
        shortLabel: 'DLL W11 Due',
        subtitle: 'DepEd Order No. 42 s. 2016 · Mid-Quarter Lesson Log Submission',
        time: '05:00 PM',
        weekNumber: 11,
        status: 'Upcoming Deadline',
        department: 'All Departments',
      },
      {
        id: 'dll-deadline-w12',
        type: 'deadline',
        dateStr: '2026-11-13',
        title: 'Week 12 DLL Submission Deadline',
        shortLabel: 'DLL W12 Due',
        subtitle: 'DepEd Order No. 42 s. 2016 · Weekly Lesson Log Submission',
        time: '05:00 PM',
        weekNumber: 12,
        status: 'Upcoming Deadline',
        department: 'All Departments',
      },
      {
        id: 'dll-deadline-w13',
        type: 'deadline',
        dateStr: '2026-11-20',
        title: 'Week 13 DLL Submission Deadline',
        shortLabel: 'DLL W13 Due',
        subtitle: 'DepEd Order No. 42 s. 2016 · Weekly Lesson Log Submission',
        time: '05:00 PM',
        weekNumber: 13,
        status: 'Upcoming Deadline',
        department: 'All Departments',
      },
    ];
  }, []);

  // DepEd Official School Calendar Announcements & Academic Milestones
  const depEdAnnouncements: CalendarEvent[] = useMemo(() => {
    return [
      {
        id: 'ann-1',
        type: 'announcement',
        dateStr: '2026-10-05',
        title: 'World Teachers Day Celebration',
        shortLabel: 'World Teachers Day',
        subtitle: 'Honoring Barobo National High School teaching and non-teaching personnel.',
        time: 'All Day',
        department: 'All Departments',
        status: 'Celebration',
      },
      {
        id: 'ann-2',
        type: 'announcement',
        dateStr: '2026-10-14',
        title: 'Division Supervisory Monitoring & Evaluation',
        shortLabel: 'Division M&E Visit',
        subtitle: 'Schools Division of Surigao del Sur curriculum audit & evaluation.',
        time: '08:00 AM - 04:00 PM',
        department: 'Division Level',
        status: 'Official Activity',
      },
      {
        id: 'ann-3',
        type: 'announcement',
        dateStr: '2026-10-21',
        title: 'School-Based LAC Session (PPST Domain Alignment)',
        shortLabel: 'School LAC Session',
        subtitle: 'Learning Action Cell: Formative Assessment and Higher-Order Thinking Skills (HOTS).',
        time: '03:00 PM - 05:00 PM',
        department: 'Faculty-Wide',
        status: 'Professional Dev',
      },
      {
        id: 'ann-4',
        type: 'announcement',
        dateStr: '2026-10-26',
        title: 'Term 1 COT-PMES Observation Period Open',
        shortLabel: 'COT-PMES Window Open',
        subtitle: 'Instructional Supervisors begin scheduled formal classroom observation visits.',
        time: 'Cycle Active',
        department: 'Supervisory Staff',
        status: 'Supervision Window',
      },
      {
        id: 'ann-5',
        type: 'announcement',
        dateStr: '2026-10-28',
        title: 'Mid-Quarter Assessment Period (Day 1)',
        shortLabel: 'Mid-Quarter Exams Day 1',
        subtitle: 'First Quarter Evaluative Examinations & student MPS records verification.',
        time: '07:30 AM - 04:30 PM',
        department: 'JHS & SHS',
        status: 'Exam Window',
      },
      {
        id: 'ann-6',
        type: 'announcement',
        dateStr: '2026-10-29',
        title: 'Mid-Quarter Assessment Period (Day 2)',
        shortLabel: 'Mid-Quarter Exams Day 2',
        subtitle: 'Continuation of examinations & Item Analysis tabulation.',
        time: '07:30 AM - 04:30 PM',
        department: 'JHS & SHS',
        status: 'Exam Window',
      },
      {
        id: 'ann-7',
        type: 'announcement',
        dateStr: '2026-11-02',
        title: 'All Souls Day Break',
        shortLabel: 'All Souls Holiday',
        subtitle: 'Special Non-Working Holiday across all public schools.',
        time: 'All Day',
        department: 'National Holiday',
        status: 'Holiday',
      },
      {
        id: 'ann-8',
        type: 'announcement',
        dateStr: '2026-11-18',
        title: 'Monthly Master Teachers & Mentors Assembly',
        shortLabel: 'Master Teachers Assembly',
        subtitle: 'Monthly consultative meeting with Secondary School Principal IV.',
        time: '01:00 PM - 03:00 PM',
        department: 'Master Teachers',
        status: 'Institutional Meeting',
      },
      {
        id: 'ann-9',
        type: 'announcement',
        dateStr: '2026-11-25',
        title: 'DepEd Regional Mid-Year INSET Training',
        shortLabel: 'Regional INSET Training',
        subtitle: 'In-Service Training for Teachers on 21st Century Pedagogical Approaches.',
        time: '08:00 AM - 05:00 PM',
        department: 'Regional DepEd',
        status: 'INSET Training',
      },
      {
        id: 'ann-10',
        type: 'announcement',
        dateStr: '2026-11-30',
        title: 'Bonifacio Day (Regular National Holiday)',
        shortLabel: 'Bonifacio Day (Holiday)',
        subtitle: 'Official national holiday - No classes or supervisory activities.',
        time: 'All Day',
        department: 'National Holiday',
        status: 'Holiday',
      },
    ];
  }, []);

  // Standard Scheduled Observations (incorporating existing observations + planned upcoming dates)
  const scheduledObservations: CalendarEvent[] = useMemo(() => {
    // 1. From real observations in context
    const contextObs: CalendarEvent[] = observations.map((obs) => ({
      id: `obs-${obs.id}`,
      type: 'observation',
      dateStr: obs.date,
      title: `COT: ${obs.teacherName}`,
      shortLabel: `COT: ${obs.teacherName.split(',')[0]}`,
      subtitle: `${obs.subjectTaught} (${obs.gradeAndSection}) · ${obs.topicTitle || 'Classroom Observation'}`,
      time: `${obs.timeStart} - ${obs.timeEnd}`,
      department: obs.department,
      status: obs.status === 'Completed' ? 'Conducted' : 'Scheduled',
      teacherName: obs.teacherName,
      supervisorName: obs.supervisorName,
      subject: obs.subjectTaught,
      gradeAndSection: obs.gradeAndSection,
      obsId: obs.id,
    }));

    // 2. Default upcoming observation schedules for teachers to ensure rich upcoming visibility
    const defaultUpcoming: CalendarEvent[] = [
      {
        id: 'upcoming-obs-1',
        type: 'observation',
        dateStr: '2026-10-27',
        title: 'COT Schedule: Rhea Mae V. Bautista',
        shortLabel: 'COT: Rhea Bautista',
        subtitle: 'Araling Panlipunan 9 · Supply and Demand Curves & Market Equilibrium',
        time: '09:00 AM - 10:00 AM',
        department: 'Junior High School',
        status: 'Scheduled',
        teacherName: 'Rhea Mae V. Bautista',
        supervisorName: 'Dr. Maria Fe Santos, PhD',
        subject: 'Araling Panlipunan 9',
        gradeAndSection: 'Grade 9 - Sapphire',
      },
      {
        id: 'upcoming-obs-2',
        type: 'observation',
        dateStr: '2026-10-29',
        title: 'COT Schedule: Grace D. Olarte',
        shortLabel: 'COT: Grace Olarte',
        subtitle: 'Mathematics 10 · Solving Quadratic Equations by Completing the Square',
        time: '10:30 AM - 11:30 AM',
        department: 'Junior High School',
        status: 'Scheduled',
        teacherName: 'Grace D. Olarte',
        supervisorName: 'Mr. Roberto V. Mendoza, MAEd',
        subject: 'Mathematics 10',
        gradeAndSection: 'Grade 10 - Emerald',
      },
      {
        id: 'upcoming-obs-3',
        type: 'observation',
        dateStr: '2026-11-04',
        title: 'COT Schedule: Eduardo J. Montero',
        shortLabel: 'COT: Eduardo Montero',
        subtitle: 'TLE/TVL SMAW · Welding Joint Preparation & Occupational Safety',
        time: '01:30 PM - 02:30 PM',
        department: 'Senior High School',
        status: 'Scheduled',
        teacherName: 'Eduardo J. Montero',
        supervisorName: 'Mrs. Clarissa M. Alcantara',
        subject: 'TVL SMAW',
        gradeAndSection: 'Grade 12 - SMAW Workshop',
      },
      {
        id: 'upcoming-obs-4',
        type: 'observation',
        dateStr: '2026-11-09',
        title: 'COT Schedule: Mark Kenneth L. Rivera',
        shortLabel: 'COT: Mark Rivera',
        subtitle: 'Science 9 · Genetics, Punnett Squares & Non-Mendelian Patterns',
        time: '08:00 AM - 09:00 AM',
        department: 'Junior High School',
        status: 'Scheduled',
        teacherName: 'Mark Kenneth L. Rivera',
        supervisorName: 'Dr. Edwin G. Dela Cruz, EdD',
        subject: 'Science 9',
        gradeAndSection: 'Grade 9 - Ruby',
      },
      {
        id: 'upcoming-obs-5',
        type: 'observation',
        dateStr: '2026-11-12',
        title: 'COT Schedule: Geraldine B. Cuenca',
        shortLabel: 'COT: Geraldine Cuenca',
        subtitle: 'Practical Research 2 · Experimental Design & Data Collection Instrumentation',
        time: '09:45 AM - 10:45 AM',
        department: 'Senior High School',
        status: 'Scheduled',
        teacherName: 'Geraldine B. Cuenca',
        supervisorName: 'Mrs. Clarissa M. Alcantara',
        subject: 'Practical Research 2',
        gradeAndSection: 'Grade 12 - Curie',
      },
    ];

    // Combine avoiding duplicate IDs
    const existingDatesAndTeachers = new Set(
      contextObs.map((o) => `${o.dateStr}-${o.teacherName}`)
    );
    const filteredDefault = defaultUpcoming.filter(
      (u) => !existingDatesAndTeachers.has(`${u.dateStr}-${u.teacherName}`)
    );

    return [...contextObs, ...filteredDefault];
  }, [observations]);

  // Lesson Plan Events (from submitted lesson plans)
  const submittedLessonPlanEvents: CalendarEvent[] = useMemo(() => {
    return lessonPlans.map((lp) => ({
      id: `lp-check-${lp.id}`,
      type: 'deadline',
      dateStr: lp.dateSubmitted,
      title: `DLL Submission: ${lp.teacherName}`,
      shortLabel: `DLL: ${lp.teacherName.split(',')[0]}`,
      subtitle: `${lp.subjectGrade} (${String(lp.weekNumber).toUpperCase().startsWith('CO') ? lp.weekNumber : `Week ${lp.weekNumber}`}) · ${lp.lessonTitle}`,
      time: 'Submitted',
      department: lp.department,
      status: lp.status,
      teacherName: lp.teacherName,
      supervisorName: lp.supervisorName,
      subject: lp.subjectGrade,
      planId: lp.id,
      weekNumber: lp.weekNumber,
    }));
  }, [lessonPlans]);

  // Combined All Events (Observations, Deadlines, DepEd Announcements, and Custom Events)
  const allEvents: CalendarEvent[] = useMemo(() => {
    return [
      ...customEvents,
      ...scheduledObservations,
      ...scheduledDllDeadlines,
      ...submittedLessonPlanEvents,
      ...depEdAnnouncements,
    ];
  }, [customEvents, scheduledObservations, scheduledDllDeadlines, submittedLessonPlanEvents, depEdAnnouncements]);

  // Filtered by selected category
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return allEvents;
    return allEvents.filter((e) => e.type === filterType);
  }, [allEvents, filterType]);

  // Events map by date string YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((ev) => {
      const existing = map.get(ev.dateStr) || [];
      existing.push(ev);
      map.set(ev.dateStr, existing);
    });
    return map;
  }, [filteredEvents]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleResetToCurrent = () => {
    setCurrentYear(2026);
    setCurrentMonth(9);
    setSelectedDate('2026-10-30');
  };

  // Month names
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      hasEvents: boolean;
      events: CalendarEvent[];
      hasObservations: boolean;
      hasDeadlines: boolean;
      hasAnnouncements: boolean;
    }[] = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayEvents = eventsByDate.get(dateStr) || [];
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        hasEvents: dayEvents.length > 0,
        events: dayEvents,
        hasObservations: dayEvents.some((e) => e.type === 'observation'),
        hasDeadlines: dayEvents.some((e) => e.type === 'deadline'),
        hasAnnouncements: dayEvents.some((e) => e.type === 'announcement'),
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayEvents = eventsByDate.get(dateStr) || [];
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: true,
        hasEvents: dayEvents.length > 0,
        events: dayEvents,
        hasObservations: dayEvents.some((e) => e.type === 'observation'),
        hasDeadlines: dayEvents.some((e) => e.type === 'deadline'),
        hasAnnouncements: dayEvents.some((e) => e.type === 'announcement'),
      });
    }

    // Next month filler days to complete grid (42 cells: 6 rows of 7)
    const remaining = 42 - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayEvents = eventsByDate.get(dateStr) || [];
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        hasEvents: dayEvents.length > 0,
        events: dayEvents,
        hasObservations: dayEvents.some((e) => e.type === 'observation'),
        hasDeadlines: dayEvents.some((e) => e.type === 'deadline'),
        hasAnnouncements: dayEvents.some((e) => e.type === 'announcement'),
      });
    }

    return days;
  }, [currentYear, currentMonth, eventsByDate]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return allEvents.filter((ev) => ev.dateStr === selectedDate);
  }, [allEvents, selectedDate]);

  // Upcoming priority schedule items (next 14 days from Oct 24)
  const upcomingPriorityItems = useMemo(() => {
    const todayStr = '2026-10-24';
    return allEvents
      .filter((ev) => ev.dateStr >= todayStr)
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .slice(0, 6);
  }, [allEvents]);

  // Summary counts for current month view
  const monthStats = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthEvents = allEvents.filter((e) => e.dateStr.startsWith(monthPrefix));
    const observationsCount = monthEvents.filter((e) => e.type === 'observation').length;
    const deadlinesCount = monthEvents.filter((e) => e.type === 'deadline').length;
    const announcementsCount = monthEvents.filter((e) => e.type === 'announcement').length;
    const tasksCount = monthEvents.filter((e) => e.type === 'task').length;
    return {
      total: monthEvents.length,
      observationsCount,
      deadlinesCount,
      announcementsCount,
      tasksCount,
    };
  }, [allEvents, currentYear, currentMonth]);

  // Organized Schedules & Deadlines sorted chronologically for Timeline / List View
  const organizedScheduleItems = useMemo(() => {
    const base =
      scheduleCategoryFilter === 'all'
        ? allEvents
        : allEvents.filter((e) => e.type === scheduleCategoryFilter);
    return [...base].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [allEvents, scheduleCategoryFilter]);

  // All overdue deadlines across the calendar
  const overdueDeadlines = useMemo(() => {
    return allEvents.filter((ev) => isDeadlineOverdue(ev));
  }, [allEvents]);

  // Format date readable
  const formatReadableDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Top Header & Context */}
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-gradient-to-r from-stone-50 via-white to-amber-50/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#701628] text-amber-300 flex items-center justify-center shadow-xs shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900">
                Supervisory Schedules & Deadlines Calendar
              </h3>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                DepEd Sy 2026-2027
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Classroom Observation Tool (COT) schedules & Weekly Lesson Plan (DLL) submission deadlines
            </p>
          </div>
        </div>

        {/* Filter Buttons & Month Stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex flex-wrap items-center bg-stone-100 p-1 rounded-xl border border-stone-200 gap-1">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-stone-900 text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All ({allEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('observation')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'observation'
                  ? 'bg-[#701628] text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>COT Observations</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('deadline')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'deadline'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-300"></span>
              <span>DLL Deadlines</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('announcement')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'announcement'
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Megaphone className="w-3 h-3 text-sky-200" />
              <span>Announcements</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('task')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'task'
                  ? 'bg-emerald-700 text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CheckSquare className="w-3 h-3 text-emerald-200" />
              <span>Tasks</span>
            </button>
          </div>

          {/* Primary Schedules & Deadlines Modal Trigger + Quick Category Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => openAddEventModal('deadline')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#701628] hover:bg-[#580e1c] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Open Schedules & Deadlines Modal (Add Announcement, Deadline, or Task)"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>+ Schedules & Deadlines</span>
            </button>
            <button
              type="button"
              onClick={() => openAddEventModal('announcement')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              title="Add a new Announcement"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Announcement</span>
            </button>
            <button
              type="button"
              onClick={() => openAddEventModal('task')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              title="Add a new Supervisory Task"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Calendar Matrix on Left, Agenda on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-100">
        {/* Left Side: Calendar Month View (8 cols for spacious date cells) */}
        <div className="lg:col-span-8 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div>
            {/* Month & Year Navigation Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-stone-900">
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <span className="text-[11px] text-stone-500 font-medium hidden sm:inline">
                  ({monthStats.observationsCount} COTs, {monthStats.deadlinesCount} Deadlines, {monthStats.announcementsCount} Announcements)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetToCurrent}
                  className="px-2.5 py-1 text-[11px] font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                  title="Jump to current supervision term"
                >
                  Current Term
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
              <span className="text-rose-700/80">Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span className="text-amber-700">Fri</span>
              <span>Sat</span>
            </div>

            {/* 7-Column Days Grid with Event Schedules & Announcements appearing directly on date cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((dayItem, idx) => {
                const isSelected = dayItem.dateStr === selectedDate;
                const isToday = dayItem.dateStr === currentDateStr;
                const hasOverdueDeadline = dayItem.events.some((ev) => isDeadlineOverdue(ev));

                return (
                  <button
                    key={`${dayItem.dateStr}-${idx}`}
                    type="button"
                    onClick={() => setSelectedDate(dayItem.dateStr)}
                    className={`group relative min-h-[76px] sm:min-h-[86px] xl:min-h-[92px] p-1 sm:p-1.5 rounded-xl text-left transition-all flex flex-col justify-between border cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'border-[#701628] bg-rose-50/50 shadow-xs ring-2 ring-[#701628]/40'
                        : hasOverdueDeadline
                        ? 'border-rose-400 bg-rose-50/35 hover:bg-rose-50/60 ring-1 ring-rose-300/70'
                        : dayItem.hasEvents
                        ? 'border-stone-200/90 bg-white hover:bg-stone-50 hover:border-amber-400/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                        : 'border-stone-100 bg-stone-50/20 hover:bg-white hover:border-stone-200'
                    } ${!dayItem.isCurrentMonth ? 'opacity-35 text-stone-400 bg-stone-100/30' : 'text-stone-800'}`}
                  >
                    {/* Top Row: Date Number and Overdue / Count Badge */}
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <span
                        className={`text-xs font-mono font-bold leading-none ${
                          isToday
                            ? 'w-5 h-5 rounded-full bg-[#701628] text-white flex items-center justify-center text-[10px] shadow-xs'
                            : isSelected
                            ? 'text-[#701628] font-extrabold'
                            : hasOverdueDeadline
                            ? 'text-rose-700 font-extrabold'
                            : 'text-stone-700'
                        }`}
                      >
                        {dayItem.dayNum}
                      </span>

                      <div className="flex items-center gap-1">
                        {hasOverdueDeadline && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-rose-600 text-white text-[8px] font-extrabold uppercase tracking-tight shadow-2xs"
                            title="Contains overdue deadline(s) past due date"
                          >
                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                            <span className="hidden sm:inline">Overdue</span>
                          </span>
                        )}
                        {/* Small badge count if more than 2 events */}
                        {dayItem.events.length > 2 && (
                          <span className="text-[9px] font-mono font-bold px-1 rounded-full bg-stone-100 border border-stone-200 text-stone-600">
                            +{dayItem.events.length - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Events, Schedules & Announcements appearing directly on the calendar dates */}
                    <div className="flex-1 flex flex-col gap-1 w-full overflow-hidden">
                      {dayItem.events.slice(0, 2).map((ev) => {
                        const isDone = ev.status === 'Completed' || ev.status === 'Conducted' || ev.status === 'Approved';
                        const isOverdue = isDeadlineOverdue(ev);
                        let pillClass = '';
                        let dotClass = '';

                        if (ev.type === 'observation') {
                          pillClass = isDone
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200/90 hover:bg-emerald-100'
                            : 'bg-rose-50 text-[#701628] border-rose-200/90 hover:bg-rose-100';
                          dotClass = isDone ? 'bg-emerald-600' : 'bg-[#701628]';
                        } else if (ev.type === 'deadline') {
                          if (isOverdue) {
                            pillClass = 'bg-rose-100 text-rose-950 border-rose-400 font-bold hover:bg-rose-200/80';
                            dotClass = 'bg-rose-600';
                          } else {
                            pillClass = 'bg-amber-50 text-amber-950 border-amber-300/80 hover:bg-amber-100';
                            dotClass = 'bg-amber-600';
                          }
                        } else if (ev.type === 'task') {
                          pillClass = 'bg-emerald-50 text-emerald-950 border-emerald-300/80 hover:bg-emerald-100';
                          dotClass = 'bg-emerald-600';
                        } else {
                          // DepEd announcement / school activity
                          pillClass = 'bg-sky-50 text-sky-950 border-sky-200/90 hover:bg-sky-100';
                          dotClass = 'bg-sky-600';
                        }

                        return (
                          <div
                            key={ev.id}
                            className={`w-full px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold border truncate flex items-center gap-1 transition-colors leading-tight ${pillClass}`}
                            title={`${isOverdue ? '[OVERDUE - PAST DUE DATE] ' : ''}${ev.title}${ev.time ? ` (${ev.time})` : ''} · ${ev.subtitle}`}
                          >
                            {isOverdue ? (
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                            )}
                            <span className="truncate">
                              {isOverdue ? `Overdue: ${ev.shortLabel || ev.title}` : ev.shortLabel || ev.title}
                            </span>
                          </div>
                        );
                      })}

                      {dayItem.events.length > 2 && (
                        <div className="text-[8px] sm:text-[9px] font-semibold text-stone-500 pl-0.5 truncate leading-none">
                          +{dayItem.events.length - 2} more activity
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend Strip with Overdue Deadline Warning Indicator */}
          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-stone-500">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#701628]"></span>
                <span className="font-semibold text-stone-700">COT-PMES Observation</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="font-semibold text-stone-700">Lesson Plan Deadline</span>
              </span>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-bold text-rose-700">Overdue Deadline (Past Due)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                <span className="font-semibold text-stone-700">DepEd Announcement / Activity</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span className="font-semibold text-stone-700">Conducted / Completed</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-400">
              <Clock className="w-3.5 h-3.5" />
              <span>DepEd Division Supervision Calendar</span>
            </div>
          </div>
        </div>

        {/* Right Side: Selected Date Details & Upcoming Agenda (4 cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 flex flex-col justify-between bg-stone-50/40 space-y-4">
          <div>
            {/* Selected Date Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Selected Date Events
                </div>
                <h4 className="text-sm font-bold text-stone-900 mt-0.5">
                  {formatReadableDate(selectedDate)}
                </h4>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-700">
                {selectedDateEvents.length} Event{selectedDateEvents.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* List of Events on Selected Date */}
            <div className="space-y-2.5 mt-3">
              {selectedDateEvents.length === 0 ? (
                <div className="py-6 px-4 bg-white rounded-xl border border-dashed border-stone-200 text-center">
                  <CalendarIcon className="w-6 h-6 mx-auto text-stone-300 mb-1" />
                  <p className="text-xs font-bold text-stone-700">No scheduled activities on this date</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Click a button below to schedule a Deadline or Announcement for {formatReadableDate(selectedDate)}.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAddEventModal('deadline', selectedDate)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Deadline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddEventModal('announcement', selectedDate)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Megaphone className="w-3 h-3" />
                      <span>Add Announcement</span>
                    </button>
                  </div>
                </div>
              ) : (
                selectedDateEvents.map((ev) => {
                  const isOverdue = isDeadlineOverdue(ev);
                  return (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isOverdue
                        ? 'bg-rose-50/80 border-rose-400 ring-1 ring-rose-300/60'
                        : ev.type === 'observation'
                        ? 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/80'
                        : ev.type === 'deadline'
                        ? 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/80'
                        : ev.type === 'task'
                        ? 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50/80'
                        : 'bg-sky-50/40 border-sky-200/80 hover:bg-sky-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {isOverdue ? (
                          <span className="p-1 rounded bg-rose-600 text-white">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </span>
                        ) : ev.type === 'observation' ? (
                          <span className="p-1 rounded bg-[#701628] text-white">
                            <ClipboardCheck className="w-3.5 h-3.5" />
                          </span>
                        ) : ev.type === 'deadline' ? (
                          <span className="p-1 rounded bg-amber-500 text-white">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </span>
                        ) : ev.type === 'task' ? (
                          <span className="p-1 rounded bg-emerald-600 text-white">
                            <CheckSquare className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 rounded bg-sky-600 text-white">
                            <Megaphone className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isOverdue
                              ? 'text-rose-800'
                              : ev.type === 'observation'
                              ? 'text-[#701628]'
                              : ev.type === 'deadline'
                              ? 'text-amber-800'
                              : ev.type === 'task'
                              ? 'text-emerald-900'
                              : 'text-sky-900'
                          }`}
                        >
                          {isOverdue
                            ? 'Overdue Deadline · Past Due'
                            : ev.type === 'observation'
                            ? 'Classroom Observation'
                            : ev.type === 'deadline'
                            ? 'Deadline'
                            : ev.type === 'task'
                            ? 'Supervisory Task'
                            : 'Announcement'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                            isOverdue
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : ev.status === 'Completed' || ev.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ev.type === 'announcement'
                              ? 'bg-sky-100 text-sky-900 border border-sky-200'
                              : ev.type === 'task'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {isOverdue && <AlertCircle className="w-2.5 h-2.5" />}
                          <span>{isOverdue ? 'OVERDUE' : ev.status || 'Active'}</span>
                        </span>
                        {ev.id.startsWith('custom-') && (
                          <button
                            type="button"
                            onClick={() => handleToggleEventComplete(ev.id)}
                            className="p-1 rounded text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Toggle Completed status"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {ev.id.startsWith('custom-') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomEvent(ev.id)}
                            className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete this custom calendar entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h5 className="text-xs font-bold text-stone-900 mt-2">{ev.title}</h5>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">{ev.subtitle}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-stone-500 mt-2.5 pt-2 border-t border-stone-200/50">
                      {ev.time && (
                        <span className="flex items-center gap-1 font-mono font-medium">
                          <Clock className="w-3 h-3 text-stone-400" />
                          {ev.time}
                        </span>
                      )}
                      {ev.supervisorName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-stone-400" />
                          Sup: {ev.supervisorName.split(',')[0]}
                        </span>
                      )}
                      {ev.department && <span>{ev.department}</span>}
                    </div>

                    {/* Direct Action Link */}
                    <div className="mt-2 text-right">
                      {ev.type === 'observation' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (ev.obsId && onSelectObservationForPrint) {
                              onSelectObservationForPrint(ev.obsId);
                            } else {
                              onNavigate('observation');
                            }
                          }}
                          className="text-[11px] font-bold text-[#701628] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{ev.obsId ? 'View COT Record' : 'Go to COT Observation'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {ev.type === 'deadline' && (
                        <button
                          type="button"
                          onClick={() => onNavigate('lesson-plans')}
                          className="text-[11px] font-bold text-amber-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Check Lesson Plans</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {ev.type === 'announcement' && (
                        <span className="text-[10px] font-semibold text-sky-800 italic">
                          Official School Calendar Milestone
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            {/* Upcoming Priority Deadlines Feed (Next 14 Days) */}
            <div className="mt-4 pt-3 border-t border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Upcoming 14-Day Priority Feed
                </span>
                <span className="text-[10px] text-stone-400">Next Scheduled</span>
              </div>

              <div className="space-y-1.5">
                {upcomingPriorityItems.map((item) => (
                  <button
                    key={`feed-${item.id}`}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className="w-full text-left p-2 rounded-lg bg-white border border-stone-200 hover:border-amber-400 transition-colors flex items-center justify-between gap-2 text-xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.type === 'observation'
                            ? 'bg-[#701628]'
                            : item.type === 'deadline'
                            ? 'bg-amber-500'
                            : 'bg-sky-600'
                        }`}
                      />
                      <div className="truncate">
                        <div className="font-semibold text-stone-800 truncate group-hover:text-[#701628]">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {formatReadableDate(item.dateStr)} {item.time ? `· ${item.time}` : ''}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-stone-400 shrink-0 group-hover:text-stone-700">
                      View →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Schedule / Submit Actions */}
          <div className="pt-3 border-t border-stone-200 space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => openAddEventModal('deadline', selectedDate)}
                className="py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg font-bold text-center transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Deadline</span>
              </button>
              <button
                type="button"
                onClick={() => openAddEventModal('announcement', selectedDate)}
                className="py-1.5 px-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-center transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Announce</span>
              </button>
              <button
                type="button"
                onClick={() => openAddEventModal('task', selectedDate)}
                className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-center transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Task</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('observation')}
                className="py-1.5 px-3 bg-[#701628] hover:bg-[#580e1c] text-white rounded-lg font-bold text-center transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Schedule COT</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('lesson-plans')}
                className="py-1.5 px-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-bold text-center transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Inspect DLLs</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Organized Schedules & Deadlines List / Timeline View within the Dashboard */}
      <div className="border-t border-stone-200 bg-stone-50/40 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#701628]/10 text-[#701628] border border-[#701628]/20">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">
                Schedules & Deadlines Directory ({organizedScheduleItems.length})
              </h4>
              <p className="text-xs text-stone-500">
                Organized timeline and list view of Announcements, Deadlines, Tasks, and Observations
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center bg-white p-1 rounded-xl border border-stone-200 gap-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'announcement', label: 'Announcements' },
                  { id: 'deadline', label: 'Deadlines' },
                  { id: 'task', label: 'Tasks' },
                  { id: 'observation', label: 'Observations' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setScheduleCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    scheduleCategoryFilter === cat.id
                      ? 'bg-[#701628] text-white font-bold shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* View Switcher: Timeline vs Organized List */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-stone-200 gap-1">
              <button
                type="button"
                onClick={() => setScheduleDisplayMode('timeline')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  scheduleDisplayMode === 'timeline'
                    ? 'bg-stone-900 text-white font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Timeline View</span>
              </button>
              <button
                type="button"
                onClick={() => setScheduleDisplayMode('list')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  scheduleDisplayMode === 'list'
                    ? 'bg-stone-900 text-white font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Organized List</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => openAddEventModal('deadline')}
              className="px-3 py-1.5 rounded-xl font-bold bg-[#701628] hover:bg-[#580e1c] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Add Schedule / Deadline</span>
            </button>
          </div>
        </div>

        {/* Overdue Deadlines Warning Banner if any deadline has passed its due date */}
        {overdueDeadlines.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-rose-950">
                  {overdueDeadlines.length} Deadline{overdueDeadlines.length === 1 ? '' : 's'} Past Due Date
                </div>
                <div className="text-[11px] text-rose-800">
                  Action required: Review overdue submissions or mark completed deadlines as done.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setScheduleCategoryFilter('deadline');
                if (overdueDeadlines[0]) {
                  setSelectedDate(overdueDeadlines[0].dateStr);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors self-start sm:self-auto cursor-pointer shrink-0"
            >
              Filter Overdue Deadlines
            </button>
          </div>
        )}

        {organizedScheduleItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-stone-300 p-8 text-center">
            <CalendarIcon className="w-7 h-7 text-stone-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-stone-700">No schedules or deadlines found in this category</p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Click "Add Schedule / Deadline" to create an Announcement, Deadline, or Task.
            </p>
          </div>
        ) : scheduleDisplayMode === 'timeline' ? (
          /* Chronological Timeline View */
          <div className="relative pl-6 border-l-2 border-stone-200 space-y-3 ml-2 max-h-96 overflow-y-auto pr-2">
            {organizedScheduleItems.map((item) => {
              const isCompleted = item.status === 'Completed' || item.status === 'Conducted' || item.status === 'Approved';
              const isOverdue = isDeadlineOverdue(item);
              const badgeColor = isOverdue
                ? 'bg-rose-100 text-rose-900 border-rose-300'
                : item.type === 'announcement'
                ? 'bg-sky-100 text-sky-900 border-sky-200'
                : item.type === 'deadline'
                ? 'bg-amber-100 text-amber-950 border-amber-300'
                : item.type === 'task'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-rose-100 text-[#701628] border-rose-200';
              const dotColor = isOverdue
                ? 'bg-rose-600 ring-2 ring-rose-200'
                : item.type === 'announcement'
                ? 'bg-sky-600'
                : item.type === 'deadline'
                ? 'bg-amber-500'
                : item.type === 'task'
                ? 'bg-emerald-600'
                : 'bg-[#701628]';

              return (
                <div
                  key={`timeline-${item.id}`}
                  onClick={() => setSelectedDate(item.dateStr)}
                  className={`relative rounded-xl border p-3.5 shadow-2xs transition-all cursor-pointer ${
                    isOverdue
                      ? 'bg-rose-50/50 border-rose-300 hover:border-rose-500'
                      : 'bg-white border-stone-200 hover:border-[#701628]/40'
                  }`}
                >
                  <span
                    className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${dotColor}`}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColor}`}>
                        {item.type === 'announcement'
                          ? 'Announcement'
                          : item.type === 'deadline'
                          ? 'Deadline'
                          : item.type === 'task'
                          ? 'Task'
                          : 'Observation'}
                      </span>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                          <AlertCircle className="w-3 h-3" />
                          <span>Overdue · Past Due Date</span>
                        </span>
                      )}
                      <span className={`text-xs font-mono font-bold ${isOverdue ? 'text-rose-700' : 'text-stone-700'}`}>
                        Due: {formatReadableDate(item.dateStr)}
                      </span>
                      {item.time && (
                        <span className="text-[11px] font-mono text-stone-500">
                          · {item.time}
                        </span>
                      )}
                      {item.department && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                          {item.department}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : isCompleted
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        {isOverdue ? 'Past Due' : item.status || 'Scheduled'}
                      </span>
                      {item.id.startsWith('custom-') && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEventComplete(item.id);
                            }}
                            className="p-1 rounded text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Mark as Completed / Active"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomEvent(item.id);
                            }}
                            className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h5 className={`text-xs sm:text-sm font-bold mt-1.5 ${isOverdue ? 'text-rose-950' : 'text-stone-900'} ${isCompleted ? 'line-through opacity-70' : ''}`}>
                    {item.title}
                  </h5>
                  <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          /* Organized Table / List View */
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3.5">Category</th>
                    <th className="py-2.5 px-3.5">Title & Description</th>
                    <th className="py-2.5 px-3.5">Due Date & Time</th>
                    <th className="py-2.5 px-3.5">Department</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {organizedScheduleItems.map((item) => {
                    const isCompleted = item.status === 'Completed' || item.status === 'Conducted' || item.status === 'Approved';
                    const isOverdue = isDeadlineOverdue(item);
                    return (
                      <tr
                        key={`list-${item.id}`}
                        onClick={() => setSelectedDate(item.dateStr)}
                        className={`transition-colors cursor-pointer ${
                          isOverdue
                            ? 'bg-rose-50/50 hover:bg-rose-50/90'
                            : 'hover:bg-stone-50/80'
                        }`}
                      >
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : item.type === 'announcement'
                                ? 'bg-sky-50 text-sky-900 border-sky-200'
                                : item.type === 'deadline'
                                ? 'bg-amber-50 text-amber-950 border-amber-300'
                                : item.type === 'task'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : 'bg-rose-50 text-[#701628] border-rose-200'
                            }`}
                          >
                            {isOverdue && <AlertCircle className="w-3 h-3 text-rose-600" />}
                            {item.type === 'announcement'
                              ? 'Announcement'
                              : item.type === 'deadline'
                              ? 'Deadline'
                              : item.type === 'task'
                              ? 'Task'
                              : 'Observation'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 max-w-md">
                          <div className={`font-bold ${isOverdue ? 'text-rose-950' : 'text-stone-900'} ${isCompleted ? 'line-through opacity-70' : ''}`}>
                            {item.title}
                          </div>
                          <div className="text-[11px] text-stone-500 line-clamp-1">
                            {item.subtitle}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-mono">
                          <div className={`font-bold flex items-center gap-1 ${isOverdue ? 'text-rose-700' : 'text-stone-800'}`}>
                            {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                            <span>{formatReadableDate(item.dateStr)}</span>
                          </div>
                          {item.time && <div className="text-[10px] text-stone-500">{item.time}</div>}
                        </td>
                        <td className="py-2.5 px-3.5 text-stone-600 whitespace-nowrap">
                          {item.department || 'All Departments'}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-600 text-white shadow-2xs">
                              <AlertCircle className="w-3 h-3" />
                              <span>OVERDUE</span>
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                              }`}
                            >
                              {item.status || 'Scheduled'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          {item.id.startsWith('custom-') ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleEventComplete(item.id);
                                }}
                                className="p-1 rounded text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Toggle Completed"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomEvent(item.id);
                                }}
                                className="p-1 rounded text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-400 font-medium">System</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal for 'Schedules & Deadlines' (Announcement, Deadline, Task) */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                eventModalType === 'deadline'
                  ? 'bg-amber-50 border-amber-200'
                  : eventModalType === 'task'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-sky-50 border-sky-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                    eventModalType === 'deadline'
                      ? 'bg-amber-500'
                      : eventModalType === 'task'
                      ? 'bg-emerald-600'
                      : 'bg-sky-600'
                  }`}
                >
                  {eventModalType === 'deadline' ? (
                    <FileSpreadsheet className="w-5 h-5" />
                  ) : eventModalType === 'task' ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Megaphone className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Schedules & Deadlines · Add {eventModalType === 'deadline' ? 'Deadline' : eventModalType === 'task' ? 'Task' : 'Announcement'}
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Add a title, due date, description, and category to the Dashboard calendar & timeline
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-white/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomEvent} className="p-5 space-y-4 text-xs">
              {/* Category Selector (Announcement, Deadline, Task) */}
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  Category <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEventModalType('announcement');
                      setEventStatus('Official Memo');
                      setEventTime('08:00 AM - 05:00 PM');
                    }}
                    className={`py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      eventModalType === 'announcement'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Announcement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEventModalType('deadline');
                      setEventStatus('Upcoming');
                      setEventTime('05:00 PM');
                    }}
                    className={`py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      eventModalType === 'deadline'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Deadline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEventModalType('task');
                      setEventStatus('In Progress');
                      setEventTime('04:00 PM');
                    }}
                    className={`py-1.5 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      eventModalType === 'task'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Task</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder={
                    eventModalType === 'deadline'
                      ? 'e.g., Week 11 DLL & Assessment Matrix Submission'
                      : eventModalType === 'task'
                      ? 'e.g., Consolidate Quarterly TOS & Item Analysis Reports'
                      : 'e.g., School-Based LAC Session on Differentiated Instruction'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Due Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#701628] bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Time / Cut-off
                  </label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder={
                      eventModalType === 'deadline'
                        ? 'e.g., 05:00 PM'
                        : eventModalType === 'task'
                        ? 'e.g., 04:00 PM'
                        : 'e.g., 08:00 AM - 12:00 NN'
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Short Calendar Badge Label
                  </label>
                  <input
                    type="text"
                    value={eventShortLabel}
                    onChange={(e) => setEventShortLabel(e.target.value)}
                    placeholder={
                      eventModalType === 'deadline'
                        ? 'e.g., DLL W11 Due'
                        : eventModalType === 'task'
                        ? 'e.g., Task: TOS QA'
                        : 'e.g., School LAC'
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Target Department / Group
                  </label>
                  <select
                    value={eventDepartment}
                    onChange={(e) => setEventDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#701628] bg-white"
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="Junior High School">Junior High School</option>
                    <option value="Senior High School">Senior High School</option>
                    <option value="Master Teachers & Head Teachers">Master Teachers & Head Teachers</option>
                    <option value="School-Wide">School-Wide</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Description <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={eventSubtitle}
                  onChange={(e) => setEventSubtitle(e.target.value)}
                  placeholder="Enter description, DepEd memo reference, task deliverables, or submission instructions..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                />
              </div>

              <div className="pt-2 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-semibold hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg font-bold shadow-xs transition-colors cursor-pointer ${
                    eventModalType === 'deadline'
                      ? 'bg-amber-500 hover:bg-amber-600 text-stone-950'
                      : eventModalType === 'task'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                  }`}
                >
                  {eventModalType === 'deadline'
                    ? 'Save Deadline'
                    : eventModalType === 'task'
                    ? 'Save Task'
                    : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
