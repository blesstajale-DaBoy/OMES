import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Teacher, Supervisor } from '../types';
import {
  DEPED_POSITION_GROUPS,
  DEPED_TEACHER_POSITION_GROUPS,
  DEPED_SUPERVISOR_POSITION_GROUPS,
} from '../data/initialData';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  X,
  Mail,
  Phone,
  Building2,
  BookOpen,
  GraduationCap,
  Table,
  Printer,
  Download,
  UserCheck,
  Plus,
  AlertTriangle,
  ChevronDown,
  Filter,
  Eye,
  Check,
  SearchX,
  Sparkles,
  RotateCcw,
  Cloud,
} from 'lucide-react';

// Helper component to highlight search matches in real-time
const HighlightMatch: React.FC<{ text: string; query: string; className?: string }> = ({
  text,
  query,
  className = '',
}) => {
  if (!query || !query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  const cleanQuery = query.trim();
  const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-stone-950 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

interface UnifiedPersonnelItem {
  id: string;
  employeeId: string;
  fullName: string;
  position: string;
  department: string;
  subject?: string;
  email: string;
  phone?: string;
  roleType: 'Instructional Supervisor' | 'Teaching Personnel';
  assignedSupervisorName?: string;
  menteeCount?: number;
  originalTeacher?: Teacher;
  originalSupervisor?: Supervisor;
}

export const SupervisoryRosterView: React.FC = () => {
  const {
    teachers,
    supervisors,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    assignTeacherToSupervisor,
    addSupervisor,
    updateSupervisor,
    deleteSupervisor,
    schoolProfile,
    cloudSyncStatus,
    syncToCloudNow,
  } = useData();
  const { isAdmin } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'all' | 'assignments-report' | 'teachers' | 'supervisors'>('all');

  // Real-time Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [positionFilter, setPositionFilter] = useState('All');
  const [quickFilter, setQuickFilter] = useState<
    'all' | 'junior-high' | 'senior-high' | 'school-principal' | 'instructional-supervisor' | 'head-teachers' | 'master-teachers'
  >('all');
  const [reportViewStyle, setReportViewStyle] = useState<'grouped' | 'unified'>('grouped');

  // Teacher Add/Edit Modal State
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [position, setPosition] = useState('Teacher I');
  const [department, setDepartment] = useState<string>('Junior High School');
  const [subject, setSubject] = useState('Science');
  const [gradeLevels, setGradeLevels] = useState('Grade 9, Grade 10');
  const [assignedSupervisorId, setAssignedSupervisorId] = useState(supervisors[0]?.id || '');
  const [email, setEmail] = useState('');
  const [teacherModalRoleType, setTeacherModalRoleType] = useState<'Teaching Personnel' | 'Instructional Supervisor'>('Teaching Personnel');

  // Toast and Highlight State for instant visual confirmation of save/update
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);

  // Supervisor Add/Edit Modal State
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [supFullName, setSupFullName] = useState('');
  const [supEmployeeId, setSupEmployeeId] = useState('');
  const [supPosition, setSupPosition] = useState('Head Teacher VI');
  const [supDepartment, setSupDepartment] = useState<string>('Junior High School');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supModalRoleType, setSupModalRoleType] = useState<'Teaching Personnel' | 'Instructional Supervisor'>('Instructional Supervisor');

  // Quick Assign Teacher to Supervisor Modal State
  const [isQuickAssignModalOpen, setIsQuickAssignModalOpen] = useState(false);
  const [targetSupervisorForAssign, setTargetSupervisorForAssign] = useState<Supervisor | null>(null);
  const [selectedTeacherIdToAssign, setSelectedTeacherIdToAssign] = useState<string>('');

  // Delete Confirmation Modals State
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [supervisorToDelete, setSupervisorToDelete] = useState<Supervisor | null>(null);

  // Smart Real-Time Matching Functions for Name, Position, Department, ID, Subject
  const matchesSearch = (textToMatch: string, query: string) => {
    if (!query) return true;
    return textToMatch.toLowerCase().includes(query.toLowerCase());
  };

  // Position classification helpers
  const isPrincipalPosition = (pos?: string) => (pos || '').toLowerCase().includes('principal');
  const isMasterTeacherPosition = (pos?: string) => (pos || '').toLowerCase().includes('master teacher');
  const isHeadTeacherPosition = (pos?: string) => (pos || '').toLowerCase().includes('head teacher');

  // Helper to determine if a teacher is assigned to a supervisor
  // In accordance with DepEd RPMS policy, all Master Teachers (MT I to MT V) are assigned to and rated directly by the School Principal
  const isTeacherAssignedToSupervisor = (teacher: Teacher, supervisor: Supervisor) => {
    if (isPrincipalPosition(teacher.position)) return false;

    const isPrincipal =
      supervisor.id === 'sup-principal' ||
      supervisor.position.toLowerCase().includes('principal') ||
      supervisor.department.toLowerCase().includes('principal') ||
      supervisor.department.toLowerCase().includes('school head');

    // DepEd Policy: Master Teachers are ALWAYS mentees of the School Principal
    if (isPrincipal && teacher.position.toLowerCase().includes('master teacher')) {
      return true;
    }

    // Direct ID or Full Name match
    if (teacher.assignedSupervisorId === supervisor.id || teacher.assignedSupervisorId === supervisor.fullName) {
      return true;
    }

    // Direct assignment to sup-principal
    if (isPrincipal && teacher.assignedSupervisorId === 'sup-principal') {
      return true;
    }

    // Included in supervisor's assignedTeacherIds array
    if (supervisor.assignedTeacherIds && supervisor.assignedTeacherIds.includes(teacher.id)) {
      return true;
    }

    return false;
  };

  // 1. Separate Faculty with Principal Position vs. Teaching Faculty
  // - If Principal position + Faculty -> belongs to School Principal table
  // - Regular Teaching Faculty (Teachers, Master Teachers, SPET, Special Science) -> belongs to Faculty table
  const principalFacultyTeachers = useMemo(() => {
    return teachers.filter((t) => isPrincipalPosition(t.position));
  }, [teachers]);

  const eligibleFacultyTeachers = useMemo(() => {
    return teachers.filter((t) => !isPrincipalPosition(t.position));
  }, [teachers]);

  // 2. Accurate Counts for Quick Filters
  // Faculty count (all non-Principal Faculty members)
  const allPersonnelCount = eligibleFacultyTeachers.length;

  // Junior High Faculty count (Type is Faculty, excluding Principal position)
  const juniorHighFacultyCount = useMemo(() => {
    return eligibleFacultyTeachers.filter((t) => t.department === 'Junior High School').length;
  }, [eligibleFacultyTeachers]);

  // Senior High Faculty count (Type is Faculty, excluding Principal position)
  const seniorHighFacultyCount = useMemo(() => {
    return eligibleFacultyTeachers.filter((t) => t.department === 'Senior High School').length;
  }, [eligibleFacultyTeachers]);

  // School Principal table count:
  // "if principal position belong to School principal table... If A Principal position then Instructional Supervisor belongs to Instructional Supervisor table. If Principal position then faculty belongs to School Principal table"
  const schoolPrincipalCount = principalFacultyTeachers.length;

  // Instructional Supervisor table count:
  // Includes all Instructional Supervisors (including Principal + Instructional Supervisor, Master Teacher + Instructional Supervisor, and Head Teachers + Instructional Supervisor)
  const instructionalSupervisorCount = supervisors.length;

  // Head Teachers count
  const headTeachersCount = useMemo(() => {
    const supHeadCount = supervisors.filter((s) => isHeadTeacherPosition(s.position)).length;
    const facHeadCount = eligibleFacultyTeachers.filter((t) => isHeadTeacherPosition(t.position)).length;
    return supHeadCount + facHeadCount;
  }, [supervisors, eligibleFacultyTeachers]);

  // Master Teachers table count:
  // "If Master Teacher position and Instructional Supervisor belongs to Instructional Supervisor table, if Master Teacher position then faculty belongs to Master Teacher table."
  const masterTeachersSupervisorCount = useMemo(() => {
    return eligibleFacultyTeachers.filter((t) => isMasterTeacherPosition(t.position)).length;
  }, [eligibleFacultyTeachers]);

  // Filtered teachers list (for Tab 2: Teaching Personnel Directory)
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim();

    // If filtered by instructional-supervisor, teachers tab returns []
    if (quickFilter === 'instructional-supervisor') {
      return [];
    }

    // If School Principal filter is active, show Faculty with Principal position
    if (
      quickFilter === 'school-principal' ||
      positionFilter === 'Principal' ||
      departmentFilter === 'School Principal' ||
      departmentFilter === 'School Head'
    ) {
      return principalFacultyTeachers.filter((t) => {
        return (
          !q ||
          matchesSearch(t.fullName, q) ||
          matchesSearch(t.position, q) ||
          matchesSearch(t.department, q) ||
          matchesSearch(t.employeeId, q) ||
          (t.subject && matchesSearch(t.subject, q)) ||
          (t.email && matchesSearch(t.email, q))
        );
      });
    }

    return eligibleFacultyTeachers.filter((t) => {
      const matchesQuery =
        !q ||
        matchesSearch(t.fullName, q) ||
        matchesSearch(t.position, q) ||
        matchesSearch(t.department, q) ||
        matchesSearch(t.employeeId, q) ||
        (t.subject && matchesSearch(t.subject, q)) ||
        (t.email && matchesSearch(t.email, q));

      let matchesDept = true;
      if (quickFilter === 'junior-high' || departmentFilter === 'Junior High School') {
        matchesDept = t.department === 'Junior High School';
      } else if (quickFilter === 'senior-high' || departmentFilter === 'Senior High School') {
        matchesDept = t.department === 'Senior High School';
      } else if (departmentFilter !== 'All') {
        matchesDept = t.department === departmentFilter;
      }

      let matchesPos = true;
      if (quickFilter === 'master-teachers' || positionFilter === 'Master Teacher') {
        matchesPos = isMasterTeacherPosition(t.position);
      } else if (quickFilter === 'head-teachers' || positionFilter === 'Head Teacher') {
        matchesPos = isHeadTeacherPosition(t.position);
      } else if (positionFilter !== 'All') {
        matchesPos = t.position.toLowerCase().includes(positionFilter.toLowerCase());
      }

      return matchesQuery && matchesDept && matchesPos;
    });
  }, [eligibleFacultyTeachers, principalFacultyTeachers, searchQuery, departmentFilter, positionFilter, quickFilter]);

  // Filtered supervisors list (for Tab 3: Instructional Supervisors Directory)
  const filteredSupervisors = useMemo(() => {
    const q = searchQuery.trim();

    // Junior High, Senior High, School Principal (Faculty), and Master Teachers (Faculty) are Faculty tables
    if (
      quickFilter === 'junior-high' ||
      quickFilter === 'senior-high' ||
      quickFilter === 'school-principal' ||
      quickFilter === 'master-teachers'
    ) {
      return [];
    }

    return supervisors.filter((s) => {
      const matchesQuery =
        !q ||
        matchesSearch(s.fullName, q) ||
        matchesSearch(s.position, q) ||
        matchesSearch(s.department, q) ||
        matchesSearch(s.employeeId, q) ||
        (s.email && matchesSearch(s.email, q));

      let matchesFilter = true;
      if (quickFilter === 'instructional-supervisor') {
        matchesFilter = true;
      } else if (quickFilter === 'head-teachers' || positionFilter === 'Head Teacher') {
        matchesFilter = isHeadTeacherPosition(s.position);
      } else {
        const matchesDept = departmentFilter === 'All' || s.department === departmentFilter;
        const matchesPos =
          positionFilter === 'All' ||
          s.position.toLowerCase().includes(positionFilter.toLowerCase());
        matchesFilter = matchesDept && matchesPos;
      }

      return matchesQuery && matchesFilter;
    });
  }, [supervisors, searchQuery, departmentFilter, positionFilter, quickFilter]);

  // For the Grouped Supervisory Table Report:
  const reportSupervisors = useMemo(() => {
    const q = searchQuery.trim();

    if (quickFilter === 'junior-high') {
      return supervisors.filter((s) =>
        eligibleFacultyTeachers.some(
          (t) => isTeacherAssignedToSupervisor(t, s) && t.department === 'Junior High School'
        )
      );
    }
    if (quickFilter === 'senior-high') {
      return supervisors.filter((s) =>
        eligibleFacultyTeachers.some(
          (t) => isTeacherAssignedToSupervisor(t, s) && t.department === 'Senior High School'
        )
      );
    }

    return supervisors.filter((s) => {
      let matchesFilter = true;
      if (
        quickFilter === 'school-principal' ||
        departmentFilter === 'School Principal' ||
        departmentFilter === 'School Head' ||
        positionFilter === 'Principal'
      ) {
        matchesFilter =
          isPrincipalPosition(s.position) ||
          s.department.toLowerCase().includes('principal') ||
          s.department.toLowerCase().includes('school head');
      } else if (quickFilter === 'instructional-supervisor') {
        matchesFilter = true;
      } else if (quickFilter === 'head-teachers' || positionFilter === 'Head Teacher') {
        matchesFilter = isHeadTeacherPosition(s.position);
      } else if (quickFilter === 'master-teachers' || positionFilter === 'Master Teacher') {
        matchesFilter =
          isMasterTeacherPosition(s.position) ||
          eligibleFacultyTeachers.some(
            (t) => isTeacherAssignedToSupervisor(t, s) && isMasterTeacherPosition(t.position)
          );
      }

      if (!matchesFilter) return false;

      if (!q) return true;

      const supDirectMatch =
        matchesSearch(s.fullName, q) ||
        matchesSearch(s.position, q) ||
        matchesSearch(s.department, q) ||
        matchesSearch(s.employeeId, q);

      const hasMatchingTeacher = eligibleFacultyTeachers.some((t) => {
        if (!isTeacherAssignedToSupervisor(t, s)) return false;
        return (
          matchesSearch(t.fullName, q) ||
          matchesSearch(t.position, q) ||
          matchesSearch(t.department, q) ||
          matchesSearch(t.employeeId, q) ||
          (t.subject && matchesSearch(t.subject, q))
        );
      });

      return supDirectMatch || hasMatchingTeacher;
    });
  }, [supervisors, eligibleFacultyTeachers, searchQuery, departmentFilter, positionFilter, quickFilter]);

  // Master Table Rows (for reportViewStyle === 'unified')
  const masterTableRows = useMemo(() => {
    const q = searchQuery.trim();
    const rows: {
      id: string;
      supervisor?: Supervisor;
      teacher?: Teacher;
    }[] = [];

    // 1. Build supervisory pairing rows
    supervisors.forEach((s) => {
      const assigned = eligibleFacultyTeachers.filter((t) => isTeacherAssignedToSupervisor(t, s));
      if (assigned.length === 0) {
        rows.push({
          id: `sup-${s.id}-none`,
          supervisor: s,
        });
      } else {
        assigned.forEach((t) => {
          rows.push({
            id: `pair-${s.id}-${t.id}`,
            supervisor: s,
            teacher: t,
          });
        });
      }
    });

    // 2. Add unassigned eligible faculty
    const unassigned = eligibleFacultyTeachers.filter(
      (t) => !supervisors.some((s) => isTeacherAssignedToSupervisor(t, s))
    );
    unassigned.forEach((t) => {
      rows.push({
        id: `unassigned-${t.id}`,
        teacher: t,
      });
    });

    // 3. Filter rows based on query, quickFilter, department, position
    return rows.filter((r) => {
      const s = r.supervisor;
      const t = r.teacher;

      if (q) {
        const supMatch =
          s &&
          (matchesSearch(s.fullName, q) ||
            matchesSearch(s.position, q) ||
            matchesSearch(s.department, q) ||
            matchesSearch(s.employeeId, q));
        const teacherMatch =
          t &&
          (matchesSearch(t.fullName, q) ||
            matchesSearch(t.position, q) ||
            matchesSearch(t.department, q) ||
            matchesSearch(t.employeeId, q) ||
            (t.subject && matchesSearch(t.subject, q)));
        if (!supMatch && !teacherMatch) return false;
      }

      if (quickFilter === 'junior-high' || departmentFilter === 'Junior High School') {
        return t !== undefined && t.department === 'Junior High School';
      }

      if (quickFilter === 'senior-high' || departmentFilter === 'Senior High School') {
        return t !== undefined && t.department === 'Senior High School';
      }

      if (
        quickFilter === 'school-principal' ||
        departmentFilter === 'School Principal' ||
        departmentFilter === 'School Head' ||
        positionFilter === 'Principal'
      ) {
        return (
          s !== undefined &&
          (isPrincipalPosition(s.position) ||
            s.department.toLowerCase().includes('principal') ||
            s.department.toLowerCase().includes('school head'))
        );
      }

      if (quickFilter === 'instructional-supervisor') {
        return s !== undefined;
      }

      if (quickFilter === 'head-teachers' || positionFilter === 'Head Teacher') {
        return s !== undefined && isHeadTeacherPosition(s.position);
      }

      if (quickFilter === 'master-teachers' || positionFilter === 'Master Teacher') {
        return t !== undefined && isMasterTeacherPosition(t.position);
      }

      if (departmentFilter !== 'All') {
        const matchTeacherDept = t && t.department === departmentFilter;
        const matchSupDept = s && s.department === departmentFilter;
        if (!matchTeacherDept && !matchSupDept) return false;
      }

      if (positionFilter !== 'All') {
        const posLower = positionFilter.toLowerCase();
        const matchTeacherPos = t && t.position.toLowerCase().includes(posLower);
        const matchSupPos = s && s.position.toLowerCase().includes(posLower);
        if (!matchTeacherPos && !matchSupPos) return false;
      }

      return true;
    });
  }, [supervisors, eligibleFacultyTeachers, searchQuery, quickFilter, departmentFilter, positionFilter]);

  // Unified Personnel list for Tab 0 (Faculty, Junior High, Senior High, School Principal, Instructional Supervisor, Head Teachers, Master Teachers)
  const filteredAllPersonnel = useMemo(() => {
    const q = searchQuery.trim();

    const supervisorItems: UnifiedPersonnelItem[] = supervisors.map((s) => {
      const assignedCount = eligibleFacultyTeachers.filter((t) => isTeacherAssignedToSupervisor(t, s)).length;
      return {
        id: s.id,
        employeeId: s.employeeId,
        fullName: s.fullName,
        position: s.position,
        department: s.department,
        email: s.email,
        phone: s.phone,
        roleType: 'Instructional Supervisor',
        menteeCount: assignedCount,
        originalSupervisor: s,
      };
    });

    const teacherItems: UnifiedPersonnelItem[] = teachers.map((t) => {
      const isPrincipal = isPrincipalPosition(t.position);
      const isMasterTeacher = isMasterTeacherPosition(t.position);
      const principal = supervisors.find(
        (s) => s.id === 'sup-principal' || isPrincipalPosition(s.position)
      );
      const sup = isPrincipal
        ? undefined
        : isMasterTeacher
        ? principal || supervisors.find((s) => s.id === t.assignedSupervisorId)
        : supervisors.find((s) => isTeacherAssignedToSupervisor(t, s));

      return {
        id: t.id,
        employeeId: t.employeeId,
        fullName: t.fullName,
        position: t.position,
        department: t.department,
        subject: t.subject,
        email: t.email,
        roleType: 'Teaching Personnel',
        assignedSupervisorName: sup?.fullName,
        originalTeacher: t,
      };
    });

    const combined = [...supervisorItems, ...teacherItems];

    return combined.filter((p) => {
      const matchesQuery =
        !q ||
        matchesSearch(p.fullName, q) ||
        matchesSearch(p.position, q) ||
        matchesSearch(p.department, q) ||
        matchesSearch(p.employeeId, q) ||
        (p.subject && matchesSearch(p.subject, q)) ||
        (p.email && matchesSearch(p.email, q));

      if (!matchesQuery) return false;

      // 1. School Principal Table:
      // "if principal position belong to School principal table... If A Principal position then Instructional Supervisor belongs to Instructional Supervisor table. If Principal position then faculty belongs to School Principal table"
      if (
        quickFilter === 'school-principal' ||
        departmentFilter === 'School Principal' ||
        departmentFilter === 'School Head' ||
        positionFilter === 'Principal'
      ) {
        return p.roleType === 'Teaching Personnel' && isPrincipalPosition(p.position);
      }

      // 2. Instructional Supervisor Table:
      // "If Master Teacher position and Instructional Supervisor belongs to Instructional Supervisor table... If A Principal position then Instructional Supervisor belongs to Instructional Supervisor table."
      if (quickFilter === 'instructional-supervisor') {
        return p.roleType === 'Instructional Supervisor';
      }

      // 3. Master Teacher Table:
      // "if Master Teacher position then faculty belongs to Master Teacher table."
      if (quickFilter === 'master-teachers' || positionFilter === 'Master Teacher') {
        return p.roleType === 'Teaching Personnel' && isMasterTeacherPosition(p.position);
      }

      // 4. Head Teachers Table:
      if (quickFilter === 'head-teachers' || positionFilter === 'Head Teacher') {
        return isHeadTeacherPosition(p.position);
      }

      // 5. Junior High Faculty Table:
      if (quickFilter === 'junior-high' || departmentFilter === 'Junior High School') {
        return (
          p.roleType === 'Teaching Personnel' &&
          !isPrincipalPosition(p.position) &&
          p.department === 'Junior High School'
        );
      }

      // 6. Senior High Faculty Table:
      if (quickFilter === 'senior-high' || departmentFilter === 'Senior High School') {
        return (
          p.roleType === 'Teaching Personnel' &&
          !isPrincipalPosition(p.position) &&
          p.department === 'Senior High School'
        );
      }

      // 7. Default "Faculty" Table (quickFilter === 'all'):
      // Shows all Faculty (Teaching Personnel) except Principal position (which belongs to School Principal table)
      if (p.roleType !== 'Teaching Personnel' || isPrincipalPosition(p.position)) {
        return false;
      }

      if (departmentFilter !== 'All' && p.department !== departmentFilter) {
        return false;
      }

      if (positionFilter !== 'All') {
        return p.position.toLowerCase().includes(positionFilter.toLowerCase());
      }

      return true;
    });
  }, [teachers, eligibleFacultyTeachers, supervisors, searchQuery, quickFilter, departmentFilter, positionFilter]);

  // Unassigned eligible teachers (excludes Principal position faculty)
  const unassignedTeachers = useMemo(() => {
    return eligibleFacultyTeachers.filter(
      (t) => !supervisors.some((s) => isTeacherAssignedToSupervisor(t, s))
    );
  }, [eligibleFacultyTeachers, supervisors]);

  // Count totals for stats
  const totalObservationsCount = eligibleFacultyTeachers.reduce((acc, t) => acc + (t.observationsCompleted || 0), 0);
  const totalPersonnelCount = supervisors.length + teachers.length;
  const filteredPersonnelCount = filteredAllPersonnel.length;
  const isFilterActive =
    searchQuery.trim() !== '' ||
    departmentFilter !== 'All' ||
    positionFilter !== 'All' ||
    quickFilter !== 'all';

  // Reset all search and filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('All');
    setPositionFilter('All');
    setQuickFilter('all');
  };

  // Open Teacher Modal
  const handleOpenAddTeacher = () => {
    const principal = supervisors.find(
      (s) => s.id === 'sup-principal' || isPrincipalPosition(s.position)
    );
    setEditingTeacher(null);
    setFullName('');
    setEmployeeId(`BNHS-T-${100 + teachers.length + 1}`);
    setPosition('Teacher I');
    setDepartment('Junior High School');
    setSubject('');
    setGradeLevels('Grade 7, Grade 8');
    setAssignedSupervisorId(supervisors[0]?.id || principal?.id || '');
    setEmail('');
    setTeacherModalRoleType('Teaching Personnel');
    setIsAddTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (t: Teacher) => {
    setEditingTeacher(t);
    setFullName(t.fullName);
    setEmployeeId(t.employeeId);
    setPosition(t.position);
    setDepartment(t.department || 'Junior High School');
    setSubject(t.subject || '');
    setGradeLevels(t.gradeLevels.join(', '));
    const isMt = isMasterTeacherPosition(t.position);
    const principal = supervisors.find(
      (s) => s.id === 'sup-principal' || isPrincipalPosition(s.position)
    );
    if (isMt && principal) {
      setAssignedSupervisorId(principal.id);
    } else {
      const foundSup = supervisors.find(
        (s) => s.id === t.assignedSupervisorId || s.fullName === t.assignedSupervisorId
      );
      setAssignedSupervisorId(foundSup ? foundSup.id : (t.assignedSupervisorId || ''));
    }
    setEmail(t.email);
    setTeacherModalRoleType('Teaching Personnel');
    setIsAddTeacherModalOpen(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (!trimmedName) return;

    const trimmedEmpId = employeeId.trim() || `BNHS-T-${Date.now().toString().slice(-4)}`;
    const gradesArray = gradeLevels.split(',').map((g) => g.trim()).filter(Boolean);
    const validGrades = gradesArray.length > 0 ? gradesArray : ['Grade 7', 'Grade 8'];
    const trimmedSubject =
      subject.trim() ||
      (isPrincipalPosition(position)
        ? 'School Administration & Instructional Leadership'
        : 'General');
    const finalEmail =
      email.trim() || `${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@deped.gov.ph`;

    // If user selected Type = "Instructional Supervisor" inside the modal, save to supervisors table!
    if (teacherModalRoleType === 'Instructional Supervisor') {
      if (editingTeacher) {
        deleteTeacher(editingTeacher.id);
      }
      addSupervisor({
        employeeId: trimmedEmpId,
        fullName: trimmedName,
        position,
        department: isPrincipalPosition(position) ? 'School Principal' : department,
        email: finalEmail,
        phone: '',
        assignedTeacherIds: [],
      });
      setRecentlyUpdatedId(trimmedEmpId);
      setToastMessage({
        text: `Saved ${trimmedName} (${position}) as Instructional Supervisor — routed to Instructional Supervisor Table.`,
        type: 'success',
      });
      setSearchQuery('');
      setDepartmentFilter('All');
      setPositionFilter('All');
      setQuickFilter('instructional-supervisor');
      setActiveTab('all');
      setIsAddTeacherModalOpen(false);
      setEditingTeacher(null);
      setTimeout(() => setToastMessage(null), 4500);
      setTimeout(() => setRecentlyUpdatedId(null), 6000);
      return;
    }

    const isPrincipal = isPrincipalPosition(position);
    const isMasterTeacher = isMasterTeacherPosition(position);
    const principal = supervisors.find(
      (s) => s.id === 'sup-principal' || isPrincipalPosition(s.position)
    );
    const effectiveSupervisorId = isPrincipal
      ? 'sup-principal'
      : isMasterTeacher
      ? (principal?.id || 'sup-principal')
      : assignedSupervisorId;
    const effectiveDepartment = isPrincipal && department !== 'School Principal' && department !== 'School Head'
      ? 'School Principal'
      : department;

    if (editingTeacher) {
      updateTeacher(editingTeacher.id, {
        fullName: trimmedName,
        employeeId: trimmedEmpId,
        position,
        department: effectiveDepartment,
        subject: trimmedSubject,
        gradeLevels: validGrades,
        assignedSupervisorId: effectiveSupervisorId,
        email: finalEmail,
      });
      if (!isPrincipal && effectiveSupervisorId && effectiveSupervisorId !== editingTeacher.assignedSupervisorId) {
        assignTeacherToSupervisor(editingTeacher.id, effectiveSupervisorId);
      }
      setRecentlyUpdatedId(editingTeacher.id);
      setToastMessage({
        text: `Updated faculty record for ${trimmedName} (${position}) — routed to ${
          isPrincipal ? 'School Principal Table' : isMasterTeacher ? 'Master Teacher Table' : 'Faculty Table'
        }.`,
        type: 'success',
      });
    } else {
      const newTeacherId = `t-${Date.now()}`;
      addTeacher({
        fullName: trimmedName,
        employeeId: trimmedEmpId,
        position,
        department: effectiveDepartment,
        subject: trimmedSubject,
        gradeLevels: validGrades,
        assignedSupervisorId: effectiveSupervisorId,
        email: finalEmail,
        status: 'Active',
      });
      setRecentlyUpdatedId(newTeacherId);
      setToastMessage({
        text: `Registered ${trimmedName} (${position}) as Faculty — routed to ${
          isPrincipal ? 'School Principal Table' : isMasterTeacher ? 'Master Teacher Table' : 'Faculty Table'
        }.`,
        type: 'success',
      });
    }

    // Automatically open the target table based on Position + Type (Faculty):
    // - Principal + Faculty -> School Principal Table
    // - Master Teacher + Faculty -> Master Teacher Table
    // - Other Faculty -> Faculty Table
    setSearchQuery('');
    setDepartmentFilter('All');
    setPositionFilter('All');
    if (isPrincipal) {
      setQuickFilter('school-principal');
    } else if (isMasterTeacher) {
      setQuickFilter('master-teachers');
    } else {
      setQuickFilter('all');
    }
    setActiveTab('all');
    setIsAddTeacherModalOpen(false);
    setEditingTeacher(null);

    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    setTimeout(() => {
      setRecentlyUpdatedId(null);
    }, 6000);
  };

  // Open Supervisor Modal
  const handleOpenAddSupervisor = () => {
    setEditingSupervisor(null);
    setSupFullName('');
    setSupEmployeeId(`DEPED-${48200 + supervisors.length + 1}`);
    setSupPosition('Head Teacher I');
    setSupDepartment('Junior High School');
    setSupEmail('');
    setSupPhone('');
    setSupModalRoleType('Instructional Supervisor');
    setIsSupervisorModalOpen(true);
  };

  const handleOpenEditSupervisor = (s: Supervisor) => {
    setEditingSupervisor(s);
    setSupFullName(s.fullName);
    setSupEmployeeId(s.employeeId);
    setSupPosition(s.position);
    setSupDepartment(s.department || 'Junior High School');
    setSupEmail(s.email);
    setSupPhone(s.phone || '');
    setSupModalRoleType('Instructional Supervisor');
    setIsSupervisorModalOpen(true);
  };

  const handleSaveSupervisor = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = supFullName.trim();
    if (!trimmedName) return;
    const finalEmail =
      supEmail.trim() || `${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@deped.gov.ph`;

    // If user switched Type to "Faculty" inside the Supervisor modal:
    // - Principal + Faculty -> School Principal Table
    // - Master Teacher + Faculty -> Master Teacher Table
    // - Other + Faculty -> Faculty Table
    if (supModalRoleType === 'Teaching Personnel') {
      if (editingSupervisor) {
        deleteSupervisor(editingSupervisor.id);
      }
      const isPrin = isPrincipalPosition(supPosition);
      const isMt = isMasterTeacherPosition(supPosition);
      addTeacher({
        fullName: trimmedName,
        employeeId: supEmployeeId,
        position: supPosition,
        department: isPrin ? 'School Principal' : (supDepartment === 'Senior High School' ? 'Senior High School' : 'Junior High School'),
        subject: isPrin ? 'School Administration & Instructional Leadership' : 'General',
        gradeLevels: ['Grades 7-12'],
        assignedSupervisorId: 'sup-principal',
        email: finalEmail,
        status: 'Active',
      });
      setRecentlyUpdatedId(supEmployeeId);
      setToastMessage({
        text: `Saved ${trimmedName} (${supPosition}) as Faculty — routed to ${
          isPrin ? 'School Principal Table' : isMt ? 'Master Teacher Table' : 'Faculty Table'
        }.`,
        type: 'success',
      });
      setSearchQuery('');
      setDepartmentFilter('All');
      setPositionFilter('All');
      setQuickFilter(isPrin ? 'school-principal' : isMt ? 'master-teachers' : 'all');
      setActiveTab('all');
      setIsSupervisorModalOpen(false);
      setEditingSupervisor(null);
      setTimeout(() => setToastMessage(null), 4500);
      setTimeout(() => setRecentlyUpdatedId(null), 6000);
      return;
    }

    if (editingSupervisor) {
      updateSupervisor(editingSupervisor.id, {
        fullName: trimmedName,
        employeeId: supEmployeeId,
        position: supPosition,
        department: supDepartment,
        email: finalEmail,
        phone: supPhone,
      });
      setRecentlyUpdatedId(editingSupervisor.id);
    } else {
      addSupervisor({
        employeeId: supEmployeeId,
        fullName: trimmedName,
        position: supPosition,
        department: supDepartment,
        email: finalEmail,
        phone: supPhone,
        assignedTeacherIds: [],
      });
      setRecentlyUpdatedId(supEmployeeId);
    }
    setToastMessage({
      text: `Saved ${trimmedName} (${supPosition}) as Instructional Supervisor — routed to Instructional Supervisor Table.`,
      type: 'success',
    });
    setSearchQuery('');
    setDepartmentFilter('All');
    setPositionFilter('All');
    setQuickFilter('instructional-supervisor');
    setActiveTab('all');
    setIsSupervisorModalOpen(false);
    setEditingSupervisor(null);
    setTimeout(() => setToastMessage(null), 4500);
    setTimeout(() => setRecentlyUpdatedId(null), 6000);
  };

  const handleDeleteSupervisor = (s: Supervisor) => {
    const assignedCount = teachers.filter((t) => t.assignedSupervisorId === s.id).length;
    let message = `Are you sure you want to delete Instructional Supervisor ${s.fullName}?`;
    if (assignedCount > 0) {
      message += `\n\nNote: ${assignedCount} teacher(s) are currently assigned to this supervisor and will be unassigned.`;
    }
    if (confirm(message)) {
      deleteSupervisor(s.id);
    }
  };

  // Quick Assign Teacher to Supervisor Handler
  const handleOpenQuickAssign = (supervisor: Supervisor) => {
    setTargetSupervisorForAssign(supervisor);
    setSelectedTeacherIdToAssign(unassignedTeachers[0]?.id || teachers[0]?.id || '');
    setIsQuickAssignModalOpen(true);
  };

  const handleExecuteQuickAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetSupervisorForAssign && selectedTeacherIdToAssign) {
      assignTeacherToSupervisor(selectedTeacherIdToAssign, targetSupervisorForAssign.id);
      setIsQuickAssignModalOpen(false);
    }
  };

  // Quick In-Row Reassignment
  const handleInlineReassign = (teacherId: string, newSupervisorId: string) => {
    assignTeacherToSupervisor(teacherId, newSupervisorId);
  };

  // Export Table Format Report as CSV
  const handleExportTableReportCsv = () => {
    const headers = [
      'Item No.',
      'Instructional Supervisor',
      'Supervisor ID',
      'Supervisor Position',
      'Supervisor Department',
      'Supervisor Email',
      'Assigned Teacher Name',
      'Teacher Employee ID',
      'Teacher Position',
      'Teacher Department',
      'Subject Taught',
      'Grade Levels',
      'Completed COT Observations',
      'Teacher Status',
    ];

    let itemNo = 1;
    const rows: (string | number)[][] = [];

    supervisors.forEach((s) => {
      const assigned = teachers.filter((t) => t.assignedSupervisorId === s.id);
      if (assigned.length === 0) {
        rows.push([
          itemNo++,
          `"${s.fullName}"`,
          s.employeeId,
          `"${s.position}"`,
          `"${s.department}"`,
          s.email,
          '"(No assigned teacher)"',
          '-',
          '-',
          '-',
          '-',
          '-',
          0,
          '-',
        ]);
      } else {
        assigned.forEach((t) => {
          rows.push([
            itemNo++,
            `"${s.fullName}"`,
            s.employeeId,
            `"${s.position}"`,
            `"${s.department}"`,
            s.email,
            `"${t.fullName}"`,
            t.employeeId,
            `"${t.position}"`,
            `"${t.department}"`,
            `"${t.subject || 'General'}"`,
            `"${t.gradeLevels.join(', ')}"`,
            t.observationsCompleted || 0,
            t.status,
          ]);
        });
      }
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `BNHS_Instructional_Supervisors_And_Assigned_Teachers_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Table Report Handler
  const handlePrintTableReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 relative">
      {/* Real-time Save & Update Success Notification Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-[#701628] text-white rounded-xl shadow-2xl border border-amber-400/40 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
          <div className="text-xs font-bold">{toastMessage.text}</div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-md ml-1 cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with Dual Add Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#701628] uppercase tracking-wider">
            <span>Personnel & Supervisory Roster</span>
            <span aria-hidden="true">·</span>
            <span>Faculty Management</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">
            Teacher Accounts & Instructional Supervisor Assignments
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed">
            Manage teaching personnel, department assignments (Junior & Senior High School), subjects taught, and designated instructional supervisors with full mentoring records.
          </p>
        </div>

        {/* Dual Add Buttons: Add New Faculty Member AND Add Instructional Supervisor */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
          <button
            onClick={handleOpenAddTeacher}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-[#701628]/30 active:scale-95"
            title="Register a new faculty member / teacher account"
          >
            <UserPlus className="w-4 h-4 text-amber-300" />
            <span>Add New Faculty Member</span>
          </button>

          <button
            onClick={handleOpenAddSupervisor}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all border border-emerald-600/40 hover:border-emerald-500 focus:ring-2 focus:ring-emerald-700/30 active:scale-95 cursor-pointer"
            title="Register an instructional supervisor / school head"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-200" />
            <span>Add Instructional Supervisor</span>
          </button>
        </div>
      </div>

      {/* Tabs: Faculty, Table Format Report, Teaching Personnel, Instructional Supervisors */}
      <div className="flex border-b border-stone-200 bg-white px-4 sm:px-6 rounded-t-2xl gap-2 sm:gap-6 text-xs font-bold overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            setActiveTab('all');
            if (quickFilter === 'instructional-supervisor') {
              setQuickFilter('all');
            }
          }}
          className={`py-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'all'
              ? 'border-[#701628] text-[#701628] font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4 text-[#701628]" />
          <span>Faculty ({allPersonnelCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('assignments-report')}
          className={`py-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'assignments-report'
              ? 'border-[#701628] text-[#701628] font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Table className="w-4 h-4 text-[#701628]" />
          <span>Supervisory Assignments Report (Table Format)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 border border-amber-200">
            Official Report
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('teachers');
            if (quickFilter === 'instructional-supervisor') {
              setQuickFilter('all');
            }
          }}
          className={`py-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'teachers'
              ? 'border-[#701628] text-[#701628] font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Teaching Personnel Directory ({eligibleFacultyTeachers.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('supervisors');
            setQuickFilter('instructional-supervisor');
          }}
          className={`py-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'supervisors'
              ? 'border-[#701628] text-[#701628] font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Instructional Supervisors Directory ({supervisors.length})</span>
        </button>
      </div>

      {/* GLOBAL REAL-TIME SEARCH & FILTER CONSOLE */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Main Real-Time Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search personnel by Name, Position, or Department (e.g., Santos, Master Teacher, Junior High)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium border border-stone-300 rounded-xl bg-stone-50/50 hover:bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#701628] focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 p-1 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-200 transition-colors"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Select Filters: Department & Position */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 text-xs">
              <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="font-semibold text-stone-500 hidden sm:inline">Dept:</span>
              <select
                value={departmentFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setDepartmentFilter(val);
                  if (val === 'School Principal' || val === 'School Head') {
                    setQuickFilter('school-principal');
                  } else if (val === 'Junior High School') {
                    setQuickFilter('junior-high');
                  } else if (val === 'Senior High School') {
                    setQuickFilter('senior-high');
                  } else if (val === 'All' && (quickFilter === 'junior-high' || quickFilter === 'senior-high' || quickFilter === 'school-principal')) {
                    setQuickFilter('all');
                  }
                }}
                className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
              >
                <option value="All">All Departments</option>
                <option value="Junior High School">Junior High School</option>
                <option value="Senior High School">Senior High School</option>
                <option value="School Head">School Head</option>
                <option value="School Principal">School Principal</option>
              </select>
            </div>

            {/* Position Filter */}
            <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 text-xs">
              <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="font-semibold text-stone-500 hidden sm:inline">Position:</span>
              <select
                value={positionFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setPositionFilter(val);
                  if (val === 'Principal') {
                    setQuickFilter('school-principal');
                  } else if (val === 'Master Teacher') {
                    setQuickFilter('master-teachers');
                  } else if (val === 'Head Teacher') {
                    setQuickFilter('head-teachers');
                  } else if (val === 'All' && (quickFilter === 'school-principal' || quickFilter === 'master-teachers' || quickFilter === 'head-teachers')) {
                    setQuickFilter('all');
                  }
                }}
                className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="All">All Positions</option>
                <option value="Principal">Principals (I - IV)</option>
                <option value="Head Teacher">Head Teachers (I - VI)</option>
                <option value="Master Teacher">Master Teachers (I - V)</option>
                <option value="Teacher III">Teacher III</option>
                <option value="Teacher II">Teacher II</option>
                <option value="Teacher I">Teacher I</option>
                <option value="Special">Special Science / SPET</option>
              </select>
            </div>

            {/* Clear All Button (shows when active) */}
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors shrink-0"
                title="Reset all active search and department/position filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Filter Tags & Result Count Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-stone-500">Quick Filters:</span>
            <button
              type="button"
              onClick={() => {
                setQuickFilter('all');
                setDepartmentFilter('All');
                setPositionFilter('All');
                setSearchQuery('');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                quickFilter === 'all' && departmentFilter === 'All' && positionFilter === 'All'
                  ? 'bg-stone-900 text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Faculty ({allPersonnelCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickFilter('junior-high');
                setDepartmentFilter('Junior High School');
                setPositionFilter('All');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                quickFilter === 'junior-high' || departmentFilter === 'Junior High School'
                  ? 'bg-[#701628] text-white font-bold shadow-xs'
                  : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              Junior High ({juniorHighFacultyCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickFilter('senior-high');
                setDepartmentFilter('Senior High School');
                setPositionFilter('All');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                quickFilter === 'senior-high' || departmentFilter === 'Senior High School'
                  ? 'bg-[#701628] text-white font-bold shadow-xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              Senior High ({seniorHighFacultyCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickFilter('school-principal');
                setDepartmentFilter('All');
                setPositionFilter('All');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                quickFilter === 'school-principal' ||
                departmentFilter === 'School Principal' ||
                departmentFilter === 'School Head' ||
                positionFilter === 'Principal'
                  ? 'bg-[#701628] text-white font-bold shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200/60'
              }`}
            >
              School Principal ({schoolPrincipalCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickFilter('instructional-supervisor');
                setDepartmentFilter('All');
                setPositionFilter('All');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                quickFilter === 'instructional-supervisor'
                  ? 'bg-[#701628] text-white font-bold shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              Instructional Supervisor ({instructionalSupervisorCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickFilter('head-teachers');
                setPositionFilter('Head Teacher');
                setDepartmentFilter('All');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                quickFilter === 'head-teachers' || positionFilter === 'Head Teacher'
                  ? 'bg-[#701628] text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Head Teachers ({headTeachersCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickFilter('master-teachers');
                setPositionFilter('Master Teacher');
                setDepartmentFilter('All');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                quickFilter === 'master-teachers' || positionFilter === 'Master Teacher'
                  ? 'bg-[#701628] text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Master Teachers ({masterTeachersSupervisorCount})
            </button>
          </div>

          {/* Real-time Match Count Indicator */}
          <div className="flex items-center gap-2 text-stone-500 font-medium text-[11px]">
            {isFilterActive ? (
              <span className="flex items-center gap-1.5 font-bold text-[#701628]">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Showing {filteredPersonnelCount} record(s) in current table
                </span>
              </span>
            ) : (
              <span>Faculty Table: {allPersonnelCount} faculty members</span>
            )}
          </div>
        </div>
      </div>

      {/* TAB 0: FACULTY & FILTERED PERSONNEL TABLES */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-stone-800">
                  {quickFilter === 'school-principal' || positionFilter === 'Principal'
                    ? `School Principal Table (${filteredAllPersonnel.length} Principal Faculty)`
                    : quickFilter === 'instructional-supervisor'
                    ? `Instructional Supervisor Table (${filteredAllPersonnel.length} Instructional Supervisors)`
                    : quickFilter === 'master-teachers' || positionFilter === 'Master Teacher'
                    ? `Master Teacher Table (${filteredAllPersonnel.length} Master Teacher Faculty)`
                    : quickFilter === 'head-teachers' || positionFilter === 'Head Teacher'
                    ? `Head Teachers Table (${filteredAllPersonnel.length} Head Teachers)`
                    : quickFilter === 'junior-high' || departmentFilter === 'Junior High School'
                    ? `Junior High Faculty Table (${filteredAllPersonnel.length} Faculty)`
                    : quickFilter === 'senior-high' || departmentFilter === 'Senior High School'
                    ? `Senior High Faculty Table (${filteredAllPersonnel.length} Faculty)`
                    : `Faculty Table (${filteredAllPersonnel.length} Faculty Members)`}
                </span>
                <span className="text-[10px] bg-rose-50 text-[#701628] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                  {allPersonnelCount} Faculty
                </span>
                <span className="text-[10px] bg-purple-50 text-purple-900 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                  {schoolPrincipalCount} School Principal (Faculty)
                </span>
                <span className="text-[10px] bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  {masterTeachersSupervisorCount} Master Teacher (Faculty)
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  {supervisors.length} Instructional Supervisors
                </span>
              </div>
              <div className="text-[11px] text-stone-500 font-medium">
                Barobo National High School · Active Staff Roster
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4">Employee ID</th>
                    <th className="py-3.5 px-4">Personnel Name</th>
                    <th className="py-3.5 px-4">Position / Rank</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Subject / Assignment</th>
                    <th className="py-3.5 px-4">Official Contact</th>
                    <th className="py-3.5 px-4 text-center">Type</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredAllPersonnel.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-stone-500">
                        <div className="space-y-2">
                          <SearchX className="w-6 h-6 mx-auto text-stone-400" />
                          <div className="font-bold text-stone-700">No personnel records match your search criteria.</div>
                          <p className="text-[11px] text-stone-400">
                            No faculty member or instructional supervisor found under current filters.
                          </p>
                          <button
                            onClick={handleResetFilters}
                            className="mt-1 px-3 py-1.5 bg-[#701628] text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Reset Search & Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAllPersonnel.map((p, pIdx) => {
                      const isRecentlyUpdated =
                        recentlyUpdatedId &&
                        (p.id === recentlyUpdatedId ||
                          p.employeeId === recentlyUpdatedId ||
                          p.originalTeacher?.id === recentlyUpdatedId ||
                          p.originalSupervisor?.id === recentlyUpdatedId);
                      return (
                        <tr
                          key={`${p.roleType}-${p.id}`}
                          className={`transition-colors ${
                            isRecentlyUpdated
                              ? 'bg-amber-100/90 ring-2 ring-inset ring-amber-500'
                              : 'hover:bg-amber-50/40'
                          }`}
                        >
                        <td className="py-3 px-4 text-center font-mono text-stone-400 font-semibold">
                          {pIdx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-700">
                          <HighlightMatch text={p.employeeId} query={searchQuery} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            {p.roleType === 'Instructional Supervisor' ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            ) : (
                              <GraduationCap className="w-3.5 h-3.5 text-[#701628] shrink-0" />
                            )}
                            <HighlightMatch text={p.fullName} query={searchQuery} />
                          </div>
                          <div className="text-[11px] text-stone-500">{p.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                            <HighlightMatch text={p.position} query={searchQuery} />
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
                              p.department === 'Senior High School'
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : p.department === 'Junior High School'
                                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            <HighlightMatch text={p.department} query={searchQuery} />
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {p.roleType === 'Instructional Supervisor' ? (
                            <span className="text-[11px] font-semibold text-emerald-800">
                              {p.menteeCount || 0} Assigned Mentee(s)
                            </span>
                          ) : (
                            <div className="text-[11px]">
                              <span className="font-semibold text-[#701628]">{p.subject || 'General'}</span>
                              {p.assignedSupervisorName && (
                                <div className="text-stone-500 text-[10px] flex items-center gap-1 mt-0.5">
                                  <span>Sup: {p.assignedSupervisorName.split(',')[0]}</span>
                                  {p.position.toLowerCase().includes('master teacher') && (
                                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      Principal's Mentee
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-stone-600 font-mono text-[11px]">
                          {p.phone || p.email}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.roleType === 'Instructional Supervisor'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                : 'bg-rose-50 text-[#701628] border border-rose-200'
                            }`}
                          >
                            {p.roleType === 'Instructional Supervisor' ? 'Instructional Supervisor' : 'Faculty'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {p.roleType === 'Instructional Supervisor' ? (
                              <>
                                <button
                                  onClick={() => handleOpenEditSupervisor(p.originalSupervisor!)}
                                  className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                  title={`Edit ${p.fullName}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSupervisorToDelete(p.originalSupervisor!)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title={`Delete ${p.fullName}`}
                                  aria-label={`Delete ${p.fullName}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenEditTeacher(p.originalTeacher!)}
                                  className="p-1.5 text-stone-600 hover:text-[#701628] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                  title={`Edit ${p.fullName}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setTeacherToDelete(p.originalTeacher!)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title={`Delete ${p.fullName}`}
                                  aria-label={`Delete ${p.fullName}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
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
      )}

      {/* TAB 1: LIST OF INSTRUCTIONAL SUPERVISORS AND THEIR ASSIGNED TEACHERS (TABLE FORMAT REPORT) */}
      {activeTab === 'assignments-report' && (
        <div className="space-y-6">
          {/* Official DepEd Report Banner & Metrics */}
          <div className="bg-gradient-to-r from-[#701628] via-[#851b32] to-[#4d0c18] rounded-2xl p-6 text-white shadow-md border border-amber-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/15 pb-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Department of Education · Caraga Administrative Region XIII
                </div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight mt-0.5">
                  Instructional Supervisors & Assigned Teachers Roster Report
                </h3>
                <p className="text-xs text-amber-100/80 mt-0.5">
                  {schoolProfile.schoolName} (School ID: {schoolProfile.schoolId}) · School Year 2025–2026
                </p>
              </div>

              {/* Action Buttons for Report: Print & Export CSV */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportTableReportCsv}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/20 shadow-xs"
                  title="Download complete assignment table as CSV / Excel"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handlePrintTableReport}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-xl text-xs font-bold transition-colors shadow-md"
                  title="Print official supervisory table report"
                >
                  <Printer className="w-4 h-4 text-stone-950" />
                  <span>Print Table Report</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
              <div className="p-3 bg-black/20 rounded-xl border border-white/10">
                <div className="text-[10px] text-amber-200/80 uppercase font-semibold">Total Supervisors</div>
                <div className="text-xl font-bold text-white mt-0.5">{supervisors.length}</div>
                <div className="text-[10px] text-stone-300">Registered Instructional Supervisors</div>
              </div>

              <div className="p-3 bg-black/20 rounded-xl border border-white/10">
                <div className="text-[10px] text-amber-200/80 uppercase font-semibold">Total Faculty</div>
                <div className="text-xl font-bold text-white mt-0.5">{eligibleFacultyTeachers.length}</div>
                <div className="text-[10px] text-stone-300">JHS & SHS Personnel</div>
              </div>

              <div className="p-3 bg-black/20 rounded-xl border border-white/10">
                <div className="text-[10px] text-amber-200/80 uppercase font-semibold">Assigned Teachers</div>
                <div className="text-xl font-bold text-emerald-300 mt-0.5">
                  {eligibleFacultyTeachers.length - unassignedTeachers.length}
                </div>
                <div className="text-[10px] text-stone-300">
                  {unassignedTeachers.length > 0 ? (
                    <span className="text-amber-300 font-semibold">{unassignedTeachers.length} unassigned</span>
                  ) : (
                    '100% paired with supervisors'
                  )}
                </div>
              </div>

              <div className="p-3 bg-black/20 rounded-xl border border-white/10">
                <div className="text-[10px] text-amber-200/80 uppercase font-semibold">Total COTs Done</div>
                <div className="text-xl font-bold text-amber-300 mt-0.5">{totalObservationsCount}</div>
                <div className="text-[10px] text-stone-300">Classroom observations</div>
              </div>
            </div>
          </div>

          {/* View Mode Controls for Table Report */}
          <div className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-xl border border-stone-200 shadow-xs text-xs">
            <div className="text-stone-600 font-medium">
              Displaying <span className="font-bold text-[#701628]">{reportSupervisors.length}</span> supervisor record(s) under current filter
            </div>

            {/* View Toggle: Grouped by Supervisor vs Unified Continuous Table */}
            <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-0.5 font-semibold">
              <button
                type="button"
                onClick={() => setReportViewStyle('grouped')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  reportViewStyle === 'grouped'
                    ? 'bg-white text-[#701628] font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                By Supervisor
              </button>
              <button
                type="button"
                onClick={() => setReportViewStyle('unified')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  reportViewStyle === 'unified'
                    ? 'bg-white text-[#701628] font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Master Table
              </button>
            </div>
          </div>

          {/* Unassigned Teachers Callout (if any) */}
          {unassignedTeachers.length > 0 && (
            <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">
                      Unassigned Faculty Members ({unassignedTeachers.length})
                    </h4>
                    <p className="text-[11px] text-amber-900/80">
                      These teachers are not yet linked to an instructional supervisor. Use the dropdown in each row to pair them immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-xl border border-amber-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-100/60 text-amber-950 font-bold uppercase text-[10px] tracking-wider border-b border-amber-200">
                    <tr>
                      <th className="py-2.5 px-3">Employee ID</th>
                      <th className="py-2.5 px-3">Teacher Name</th>
                      <th className="py-2.5 px-3">Position</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Assign Instructional Supervisor</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {unassignedTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-amber-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-stone-700">
                          <HighlightMatch text={t.employeeId} query={searchQuery} />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-stone-900">
                          <HighlightMatch text={t.fullName} query={searchQuery} />
                        </td>
                        <td className="py-2.5 px-3 text-stone-700">
                          <HighlightMatch text={t.position} query={searchQuery} />
                        </td>
                        <td className="py-2.5 px-3 text-stone-700">
                          <HighlightMatch text={t.department} query={searchQuery} />
                        </td>
                        <td className="py-2.5 px-3 text-[#701628] font-semibold">{t.subject || 'General'}</td>
                        <td className="py-2.5 px-3">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleInlineReassign(t.id, e.target.value);
                              }
                            }}
                            defaultValue=""
                            className="p-1.5 text-xs border border-amber-300 rounded-lg bg-white text-stone-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#701628]"
                          >
                            <option value="" disabled>
                              Select Supervisor to Assign...
                            </option>
                            {supervisors.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.fullName} ({s.position})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditTeacher(t)}
                              className="p-1.5 text-stone-500 hover:text-[#701628] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                              title={`Edit ${t.fullName}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setTeacherToDelete(t)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={`Delete ${t.fullName}`}
                              aria-label={`Delete ${t.fullName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW STYLE A: GROUPED TABLE FORMAT REPORT BY SUPERVISOR */}
          {reportViewStyle === 'grouped' && (
            <div className="space-y-6">
              {reportSupervisors.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs space-y-3">
                  <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
                    <SearchX className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-stone-800">No matching personnel or supervisory records</h4>
                  <p className="text-stone-500 max-w-sm mx-auto">
                    No supervisors or assigned teachers matched "{searchQuery}" in {departmentFilter} / {positionFilter}.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-[#701628] text-white rounded-xl font-bold text-xs hover:bg-[#580e1c] shadow-xs"
                  >
                    Reset Search & Filters
                  </button>
                </div>
              ) : (
                reportSupervisors.map((s, idx) => {
                  // Show teachers matching the current search, or all under this supervisor if supervisor itself was matched
                  const supervisorMatched =
                    matchesSearch(s.fullName, searchQuery) ||
                    matchesSearch(s.position, searchQuery) ||
                    matchesSearch(s.department, searchQuery);

                  const assignedList = eligibleFacultyTeachers.filter((t) => {
                    if (!isTeacherAssignedToSupervisor(t, s)) return false;

                    // "To ensure that the data count is accurate, the table only appears in Junior and Senior High if the Type is Faculty."
                    if (quickFilter === 'junior-high' && t.department !== 'Junior High School') return false;
                    if (quickFilter === 'senior-high' && t.department !== 'Senior High School') return false;

                    if (!searchQuery && departmentFilter === 'All' && positionFilter === 'All') return true;

                    // If supervisor matched directly, show all their teachers unless a specific dept/pos filter narrows them
                    const matchesPos = positionFilter === 'All' || t.position.toLowerCase().includes(positionFilter.toLowerCase());
                    const matchesDept = departmentFilter === 'All' || t.department === departmentFilter;

                    if (supervisorMatched && matchesPos && matchesDept) return true;

                    // Otherwise check teacher fields
                    return (
                      matchesSearch(t.fullName, searchQuery) ||
                      matchesSearch(t.position, searchQuery) ||
                      matchesSearch(t.department, searchQuery) ||
                      matchesSearch(t.employeeId, searchQuery) ||
                      (t.subject && matchesSearch(t.subject, searchQuery))
                    ) && matchesDept && matchesPos;
                  });

                  const totalCots = assignedList.reduce((acc, t) => acc + (t.observationsCompleted || 0), 0);
                  const isPrincipal = s.id === 'sup-principal' || s.position.toLowerCase().includes('principal');

                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden transition-all hover:border-amber-400/80"
                    >
                      {/* Supervisor Header Section */}
                      <div className="bg-gradient-to-r from-stone-50 to-amber-50/40 p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#701628] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-bold text-stone-900">
                                <HighlightMatch text={s.fullName} query={searchQuery} />
                              </h4>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#701628] text-white">
                                <HighlightMatch text={s.position} query={searchQuery} />
                              </span>
                              {isPrincipal && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-stone-950 shadow-xs flex items-center gap-1">
                                  <span>⭐</span>
                                  <span>Direct Rater of Master Teachers</span>
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-200 text-stone-700 font-mono">
                                <HighlightMatch text={s.employeeId} query={searchQuery} />
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 mt-1">
                              <span className="flex items-center gap-1 font-medium">
                                <Building2 className="w-3.5 h-3.5 text-stone-400" />
                                <HighlightMatch text={s.department} query={searchQuery} />
                              </span>
                              <span className="flex items-center gap-1 text-stone-500">
                                <Mail className="w-3.5 h-3.5 text-stone-400" />
                                {s.email}
                              </span>
                              {s.phone && (
                                <span className="flex items-center gap-1 text-stone-500">
                                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                                  {s.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Supervisor Badges & Action */}
                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          <div className="text-right hidden sm:block mr-2">
                            <div className="text-xs font-bold text-[#701628]">
                              {assignedList.length} Assigned Mentees
                            </div>
                            <div className="text-[11px] text-stone-500 font-mono">
                              {totalCots} COTs Finished
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenQuickAssign(s)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#701628] hover:bg-[#580e1c] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                            title="Assign a faculty member to this supervisor"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign Teacher</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditSupervisor(s)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                            title={`Edit ${s.fullName}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSupervisorToDelete(s)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={`Delete ${s.fullName}`}
                            aria-label={`Delete ${s.fullName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Table of Assigned Teachers for this Supervisor */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 px-4 w-12 text-center">#</th>
                              <th className="py-2.5 px-4">Employee ID</th>
                              <th className="py-2.5 px-4">Assigned Teacher Name</th>
                              <th className="py-2.5 px-4">Position / Rank</th>
                              <th className="py-2.5 px-4">Department</th>
                              <th className="py-2.5 px-4">Subject / Learning Area</th>
                              <th className="py-2.5 px-4">Grade Levels</th>
                              <th className="py-2.5 px-4 text-center">COTs Completed</th>
                              <th className="py-2.5 px-4">Status</th>
                              <th className="py-2.5 px-4 text-right">Reassign & Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {assignedList.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="py-6 text-center text-stone-500 italic">
                                  No faculty members currently matching filters under {s.fullName}. Click{' '}
                                  <span className="font-semibold text-[#701628] underline cursor-pointer" onClick={() => handleOpenQuickAssign(s)}>
                                    "Assign Teacher"
                                  </span>{' '}
                                  to pair teachers with this supervisor.
                                </td>
                              </tr>
                            ) : (
                              assignedList.map((t, tIdx) => {
                                const isRecentlyUpdated =
                                  recentlyUpdatedId && (t.id === recentlyUpdatedId || t.employeeId === recentlyUpdatedId);
                                return (
                                  <tr
                                    key={t.id}
                                    className={`transition-colors ${
                                      isRecentlyUpdated
                                        ? 'bg-amber-100/90 ring-2 ring-inset ring-amber-500 font-medium'
                                        : 'hover:bg-amber-50/40'
                                    }`}
                                  >
                                  <td className="py-3 px-4 text-center font-mono text-stone-400 font-semibold">
                                    {tIdx + 1}
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-stone-700">
                                    <HighlightMatch text={t.employeeId} query={searchQuery} />
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-stone-900">
                                      <HighlightMatch text={t.fullName} query={searchQuery} />
                                    </div>
                                    <div className="text-[11px] text-stone-500">{t.email}</div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                                        <HighlightMatch text={t.position} query={searchQuery} />
                                      </span>
                                      {t.position.toLowerCase().includes('master teacher') && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                          Principal's Mentee
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
                                        t.department === 'Senior High School'
                                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                          : 'bg-blue-50 text-blue-900 border border-blue-200'
                                      }`}
                                    >
                                      <HighlightMatch text={t.department} query={searchQuery} />
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-[#701628]">
                                    <div className="flex items-center gap-1.5">
                                      <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                                      <span>
                                        <HighlightMatch text={t.subject || 'General'} query={searchQuery} />
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-stone-600">
                                    {t.gradeLevels.join(', ')}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 font-mono">
                                      {t.observationsCompleted} COTs
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      {t.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <select
                                        value={t.assignedSupervisorId}
                                        onChange={(e) => handleInlineReassign(t.id, e.target.value)}
                                        className="text-[11px] border border-stone-200 rounded-lg p-1 bg-white text-stone-700 font-medium focus:ring-1 focus:ring-[#701628] max-w-[130px] truncate"
                                        title="Reassign to another supervisor"
                                      >
                                        {supervisors.map((otherSup) => (
                                          <option key={otherSup.id} value={otherSup.id}>
                                            {otherSup.fullName.split(',')[0]}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => handleOpenEditTeacher(t)}
                                        className="p-1.5 text-stone-500 hover:text-[#701628] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                        title={`Edit ${t.fullName}`}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setTeacherToDelete(t)}
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title={`Delete ${t.fullName}`}
                                        aria-label={`Delete ${t.fullName}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
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
                  );
                })
              )}
            </div>
          )}

          {/* VIEW STYLE B: UNIFIED CONTINUOUS MASTER TABLE */}
          {reportViewStyle === 'unified' && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3 text-center">#</th>
                      <th className="py-3 px-4">Instructional Supervisor</th>
                      <th className="py-3 px-4">Supervisor Dept & Title</th>
                      <th className="py-3 px-4">Teacher Name & ID</th>
                      <th className="py-3 px-4">Position</th>
                      <th className="py-3 px-4">Teacher Dept</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4 text-center">COTs</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Reassign & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {masterTableRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-stone-500">
                          No personnel records found matching current search and filters.
                        </td>
                      </tr>
                    ) : (
                      masterTableRows.map((row, idx) => {
                        const supervisor = row.supervisor;
                        const t = row.teacher;
                        return (
                          <tr key={row.id} className="hover:bg-amber-50/50 transition-colors">
                            <td className="py-3 px-3 text-center font-mono text-stone-400 font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              {supervisor ? (
                                <div>
                                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                    <HighlightMatch text={supervisor.fullName} query={searchQuery} />
                                  </div>
                                  <div className="text-[10px] font-mono text-stone-400">
                                    <HighlightMatch text={supervisor.employeeId} query={searchQuery} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-rose-600 font-bold italic">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {supervisor ? (
                                <div>
                                  <span className="font-semibold text-stone-800">
                                    <HighlightMatch text={supervisor.position} query={searchQuery} />
                                  </span>
                                  <div className="text-[10px] text-stone-500">
                                    <HighlightMatch text={supervisor.department} query={searchQuery} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-stone-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {t ? (
                                <div>
                                  <div className="font-bold text-[#701628]">
                                    <HighlightMatch text={t.fullName} query={searchQuery} />
                                  </div>
                                  <div className="text-[10px] font-mono text-stone-500">
                                    <HighlightMatch text={t.employeeId} query={searchQuery} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-stone-500 italic text-[11px] font-medium">
                                  {supervisor?.position.toLowerCase().includes('principal')
                                    ? 'Executive Oversight / School Head'
                                    : '(No Assigned Mentees)'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {t ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                                    <HighlightMatch text={t.position} query={searchQuery} />
                                  </span>
                                  {t.position.toLowerCase().includes('master teacher') && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      Principal's Mentee
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-stone-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-stone-700">
                              {t ? (
                                <HighlightMatch text={t.department} query={searchQuery} />
                              ) : (
                                <span className="text-stone-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-semibold text-stone-800">
                              {t ? (
                                <HighlightMatch text={t.subject || 'General'} query={searchQuery} />
                              ) : (
                                <span className="text-stone-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-amber-900">
                              {t ? t.observationsCompleted : '—'}
                            </td>
                            <td className="py-3 px-4">
                              {t ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {t.status}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  Active Oversight
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {t ? (
                                  <>
                                    <select
                                      value={t.assignedSupervisorId || ''}
                                      onChange={(e) => handleInlineReassign(t.id, e.target.value)}
                                      aria-label={`Reassign ${t.fullName}`}
                                      className="text-[11px] border border-stone-200 rounded-lg p-1 bg-white text-stone-700 font-medium focus:ring-1 focus:ring-[#701628] max-w-[130px] truncate"
                                    >
                                      <option value="">(None / Unassigned)</option>
                                      {supervisors.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.fullName.split(',')[0]}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleOpenEditTeacher(t)}
                                      className="p-1.5 text-stone-500 hover:text-[#701628] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                      title={`Edit ${t.fullName}`}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setTeacherToDelete(t)}
                                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title={`Delete ${t.fullName}`}
                                      aria-label={`Delete ${t.fullName}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : supervisor ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuickAssign(supervisor)}
                                      className="px-2 py-1 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-semibold transition-colors cursor-pointer"
                                      title="Assign teachers to this supervisor"
                                    >
                                      Assign Mentees
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditSupervisor(supervisor)}
                                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                      title={`Edit ${supervisor.fullName}`}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setSupervisorToDelete(supervisor)}
                                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title={`Delete ${supervisor.fullName}`}
                                      aria-label={`Delete ${supervisor.fullName}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-stone-400">—</span>
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
          )}
        </div>
      )}

      {/* TAB 2: TEACHING PERSONNEL (ALL TEACHERS TABLE) */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          {/* Table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Employee ID</th>
                    <th className="py-3.5 px-4">Teacher Name</th>
                    <th className="py-3.5 px-4">Position / Rank</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4">Assigned Supervisor</th>
                    <th className="py-3.5 px-4 text-center">COT Progress</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-stone-500">
                        <div className="space-y-2">
                          <SearchX className="w-6 h-6 mx-auto text-stone-400" />
                          <div className="font-bold text-stone-700">No faculty records match your search criteria.</div>
                          <p className="text-[11px] text-stone-400">
                            Check for spelling errors or try resetting filters.
                          </p>
                          <button
                            onClick={handleResetFilters}
                            className="mt-1 px-3 py-1.5 bg-[#701628] text-white rounded-lg text-xs font-semibold"
                          >
                            Reset Search & Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((t) => {
                      const isMasterTeacher = t.position.toLowerCase().includes('master teacher');
                      const principal = supervisors.find(
                        (s) => s.id === 'sup-principal' || s.position.toLowerCase().includes('principal')
                      );
                      const supervisor = isMasterTeacher
                        ? principal || supervisors.find((s) => s.id === t.assignedSupervisorId)
                        : supervisors.find((s) => isTeacherAssignedToSupervisor(t, s));
                      const isRecentlyUpdated =
                        recentlyUpdatedId && (t.id === recentlyUpdatedId || t.employeeId === recentlyUpdatedId);
                      return (
                        <tr
                          key={t.id}
                          className={`transition-colors ${
                            isRecentlyUpdated
                              ? 'bg-amber-100/90 ring-2 ring-inset ring-amber-500 font-medium'
                              : 'hover:bg-stone-50/80'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-stone-700">
                            <HighlightMatch text={t.employeeId} query={searchQuery} />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-stone-900">
                              <HighlightMatch text={t.fullName} query={searchQuery} />
                            </div>
                            <div className="text-[11px] text-stone-500">{t.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                                <HighlightMatch text={t.position} query={searchQuery} />
                              </span>
                              {isMasterTeacher && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Principal's Mentee
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
                                t.department === 'Senior High School'
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                  : 'bg-blue-50 text-blue-900 border border-blue-200'
                              }`}
                            >
                              <HighlightMatch text={t.department} query={searchQuery} />
                            </span>
                            <div className="text-[10px] text-stone-400 mt-0.5">{t.gradeLevels.join(', ')}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#701628]">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                              <span>
                                <HighlightMatch text={t.subject || 'General'} query={searchQuery} />
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {supervisor ? (
                              <div>
                                <div className="font-medium text-stone-800 flex items-center gap-1.5">
                                  <HighlightMatch text={supervisor.fullName} query={searchQuery} />
                                  {isMasterTeacher && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      Principal's Mentee
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-stone-400">
                                  {supervisor.position} {isMasterTeacher ? '(Direct Rater)' : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-amber-700 font-bold italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                              {t.observationsCompleted} COTs
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditTeacher(t)}
                                className="p-1.5 text-stone-600 hover:text-[#701628] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Teacher Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setTeacherToDelete(t)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title={`Delete ${t.fullName} from roster`}
                                aria-label={`Delete ${t.fullName}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* TAB 3: SUPERVISORS DIRECTORY (CARD VIEW) */}
      {activeTab === 'supervisors' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSupervisors.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs space-y-2">
                <SearchX className="w-6 h-6 mx-auto text-stone-400" />
                <div className="font-bold text-stone-700">No instructional supervisors match your search criteria.</div>
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 bg-[#701628] text-white rounded-lg text-xs font-semibold"
                >
                  Reset Search & Filters
                </button>
              </div>
            ) : (
              filteredSupervisors.map((s) => {
                const assignedList = eligibleFacultyTeachers.filter((t) => isTeacherAssignedToSupervisor(t, s));
                const isPrincipal = s.id === 'sup-principal' || s.position.toLowerCase().includes('principal');
                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-3 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-[#701628] border border-amber-200 px-2 py-0.5 rounded">
                            <HighlightMatch text={s.position} query={searchQuery} />
                          </span>
                          {isPrincipal && (
                            <span className="text-[9px] font-bold bg-amber-500 text-stone-950 px-2 py-0.5 rounded shadow-xs">
                              Direct Rater of MTs
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-stone-400">
                          <HighlightMatch text={s.employeeId} query={searchQuery} />
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-stone-900">
                        <HighlightMatch text={s.fullName} query={searchQuery} />
                      </h3>
                      <div className="text-xs text-stone-600 mt-0.5 font-medium flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          <HighlightMatch text={s.department} query={searchQuery} />
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-stone-400" />
                        <span className="truncate">{s.email}</span>
                      </div>
                      {s.phone && (
                        <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span>{s.phone}</span>
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-stone-100">
                        <div className="flex justify-between items-center text-xs font-bold text-stone-800 mb-2">
                          <span>Assigned Mentees ({assignedList.length}):</span>
                          <button
                            onClick={() => handleOpenQuickAssign(s)}
                            className="text-[11px] text-[#701628] hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Assign</span>
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {assignedList.map((t) => {
                            const isMT = t.position.toLowerCase().includes('master teacher');
                            return (
                              <div
                                key={t.id}
                                className="text-[11px] p-2 bg-stone-50 rounded-lg border border-stone-100 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-stone-800">{t.fullName}</span>
                                    {isMT && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        Principal's Mentee
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-stone-500 truncate">
                                    {t.position} • {t.department}
                                  </div>
                                </div>
                                <span className="font-mono text-emerald-700 font-bold shrink-0">
                                  {t.observationsCompleted} COTs
                                </span>
                              </div>
                            );
                          })}
                          {assignedList.length === 0 && (
                            <div className="text-[11px] text-stone-400 italic">No teachers currently assigned.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-400 flex justify-between items-center">
                      <span className="font-medium text-stone-500">Barobo NHS Instructional Roster</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditSupervisor(s)}
                          className="p-1.5 text-stone-600 hover:text-[#701628] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Supervisor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSupervisorToDelete(s)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Delete ${s.fullName}`}
                          aria-label={`Delete ${s.fullName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT TEACHER MODAL */}
      {isAddTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 rounded-lg text-amber-300">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingTeacher ? `Edit Faculty Member: ${editingTeacher.fullName}` : 'Add New Faculty Member'}
                  </h3>
                  <p className="text-xs text-amber-200/90">
                    {editingTeacher
                      ? 'Update personnel credentials, rank, department, and instructional supervisor assignment.'
                      : 'Barobo National High School OMES · Faculty Management'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTeacherModalOpen(false)}
                className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Full Name (with Middle Initial)</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maria Teresa L. Castro"
                    className="w-full border border-stone-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Employee ID Number</label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  />
                </div>

                {/* Position / Rank Dropdown with full DepEd categories */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Position / Rank</label>
                  <select
                    value={position}
                    onChange={(e) => {
                      const newPos = e.target.value;
                      setPosition(newPos);
                      if (newPos.toLowerCase().includes('principal')) {
                        setDepartment('School Principal');
                        if (!subject || subject === 'Science') {
                          setSubject('School Administration & Instructional Leadership');
                        }
                      } else if (newPos.toLowerCase().includes('master teacher')) {
                        const principal = supervisors.find(
                          (s) => s.id === 'sup-principal' || s.position.toLowerCase().includes('principal')
                        );
                        if (principal) {
                          setAssignedSupervisorId(principal.id);
                        }
                      }
                    }}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium focus:ring-2 focus:ring-[#701628] focus:outline-none cursor-pointer"
                  >
                    {DEPED_TEACHER_POSITION_GROUPS.map((group) => (
                      <optgroup key={group.category} label={group.category}>
                        {group.positions.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Personnel Type (Faculty vs. Instructional Supervisor) */}
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    Personnel Type (Table Classification)
                  </label>
                  <select
                    value={teacherModalRoleType}
                    onChange={(e) =>
                      setTeacherModalRoleType(
                        e.target.value as 'Teaching Personnel' | 'Instructional Supervisor'
                      )
                    }
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-bold text-stone-900 focus:ring-2 focus:ring-[#701628] focus:outline-none cursor-pointer"
                  >
                    <option value="Teaching Personnel">Faculty</option>
                    <option value="Instructional Supervisor">Instructional Supervisor</option>
                  </select>
                  <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#701628] shrink-0" />
                    <span>
                      Target Table:{' '}
                      <strong className="text-[#701628]">
                        {teacherModalRoleType === 'Instructional Supervisor'
                          ? 'Instructional Supervisor Table'
                          : isPrincipalPosition(position)
                          ? 'School Principal Table (Principal + Faculty)'
                          : isMasterTeacherPosition(position)
                          ? 'Master Teacher Table (Master Teacher + Faculty)'
                          : 'Faculty Table'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Informative DepEd note when Master Teacher is selected */}
                {position.toLowerCase().includes('master teacher') && teacherModalRoleType === 'Teaching Personnel' && (
                  <div className="col-span-2 p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2 text-[11px] text-amber-950 animate-in fade-in">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Master Teacher (Faculty) Assignment:</span> Personnel with <strong>Master Teacher</strong> position and <strong>Faculty</strong> type are listed in the <strong>Master Teacher Table</strong> and supervised by the <strong>School Principal ({supervisors.find((s) => s.id === 'sup-principal' || s.position.toLowerCase().includes('principal'))?.fullName || 'Dr. Edwin G. Dela Cruz, EdD'})</strong>.
                    </div>
                  </div>
                )}

                {/* Department: Junior High School, Senior High School, or School Principal */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  >
                    <option value="Junior High School">Junior High School</option>
                    <option value="Senior High School">Senior High School</option>
                    <option value="School Principal">School Principal</option>
                    <option value="School Head">School Head</option>
                  </select>
                </div>

                {/* Subject Taught */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Subject / Specialization Taught
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Science, Mathematics, English..."
                    className="w-full border border-stone-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Grade Levels Taught</label>
                  <input
                    type="text"
                    required
                    value={gradeLevels}
                    onChange={(e) => setGradeLevels(e.target.value)}
                    placeholder="e.g. Grade 9, Grade 10"
                    className="w-full border border-stone-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-400">Separate grade levels with commas</span>
                </div>

                {/* Assigned Instructional Supervisor */}
                {teacherModalRoleType === 'Teaching Personnel' && !isPrincipalPosition(position) && (
                  <div className="col-span-2">
                    <label className="block font-bold text-stone-700 mb-1">
                      Designated Instructional Supervisor
                    </label>
                    {position.toLowerCase().includes('master teacher') ? (
                      <div className="space-y-1">
                        <select
                          value={assignedSupervisorId}
                          disabled
                          className="w-full border border-amber-400 bg-amber-50/70 rounded-lg p-2 font-bold text-amber-950 cursor-not-allowed shadow-inner"
                        >
                          {supervisors
                            .filter((s) => s.id === 'sup-principal' || s.position.toLowerCase().includes('principal'))
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.fullName} ({s.position} - {s.department})
                              </option>
                            ))}
                          {supervisors.filter((s) => s.id === 'sup-principal' || s.position.toLowerCase().includes('principal')).length === 0 && (
                            <option value="sup-principal">Dr. Edwin G. Dela Cruz, EdD (Principal IV - School Head / Principal)</option>
                          )}
                        </select>
                        <span className="text-[10px] text-amber-800 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          Automatically assigned to the School Principal per DepEd policy for Master Teachers.
                        </span>
                      </div>
                    ) : (
                      <select
                        value={assignedSupervisorId}
                        onChange={(e) => setAssignedSupervisorId(e.target.value)}
                        className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium focus:ring-2 focus:ring-[#701628] focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {supervisors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} ({s.position} - {s.department})
                          </option>
                        ))}
                        {supervisors.length === 0 && (
                          <option disabled value="">No registered instructional supervisors</option>
                        )}
                      </select>
                    )}
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Official DepEd Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher.name@deped.gov.ph"
                    className="w-full border border-stone-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  {editingTeacher ? 'Update Record' : 'Save Personnel Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT SUPERVISOR MODAL */}
      {isSupervisorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 rounded-lg text-amber-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingSupervisor
                      ? 'Edit Instructional Supervisor Record'
                      : 'Add New Instructional Supervisor'}
                  </h3>
                  <p className="text-xs text-amber-200/90">Barobo National High School OMES</p>
                </div>
              </div>
              <button
                onClick={() => setIsSupervisorModalOpen(false)}
                className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupervisor} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    Full Name (with Title / Degree)
                  </label>
                  <input
                    type="text"
                    required
                    value={supFullName}
                    onChange={(e) => setSupFullName(e.target.value)}
                    placeholder="e.g. Dr. Arthur M. Ramos, EdD"
                    className="w-full border border-stone-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Employee ID Number</label>
                  <input
                    type="text"
                    required
                    value={supEmployeeId}
                    onChange={(e) => setSupEmployeeId(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  />
                </div>

                {/* Position / Rank Dropdown */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Position / Rank</label>
                  <select
                    value={supPosition}
                    onChange={(e) => setSupPosition(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  >
                    {DEPED_SUPERVISOR_POSITION_GROUPS.map((group) => (
                      <optgroup key={group.category} label={group.category}>
                        {group.positions.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Personnel Type (Instructional Supervisor vs. Faculty) */}
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    Personnel Type (Table Classification)
                  </label>
                  <select
                    value={supModalRoleType}
                    onChange={(e) =>
                      setSupModalRoleType(
                        e.target.value as 'Teaching Personnel' | 'Instructional Supervisor'
                      )
                    }
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-bold text-stone-900 focus:ring-2 focus:ring-[#701628] focus:outline-none cursor-pointer"
                  >
                    <option value="Instructional Supervisor">Instructional Supervisor</option>
                    <option value="Teaching Personnel">Faculty</option>
                  </select>
                  <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>
                      Target Table:{' '}
                      <strong className="text-emerald-900">
                        {supModalRoleType === 'Instructional Supervisor'
                          ? 'Instructional Supervisor Table'
                          : isPrincipalPosition(supPosition)
                          ? 'School Principal Table (Principal + Faculty)'
                          : isMasterTeacherPosition(supPosition)
                          ? 'Master Teacher Table (Master Teacher + Faculty)'
                          : 'Faculty Table'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Department: Junior High School, Senior High School, School Head, School Principal */}
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Department</label>
                  <select
                    value={supDepartment}
                    onChange={(e) => setSupDepartment(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg p-2 bg-white font-medium focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  >
                    <option value="Junior High School">Junior High School</option>
                    <option value="Senior High School">Senior High School</option>
                    <option value="School Head">School Head</option>
                    <option value="School Principal">School Principal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Official DepEd Email</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="supervisor@deped.gov.ph"
                    className="w-full border border-stone-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Mobile / Phone Contact</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+63 9xx xxx xxxx"
                    className="w-full border border-stone-300 rounded-lg p-2 focus:ring-2 focus:ring-[#701628] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-stone-600 text-[11px]">
                <div className="font-bold text-stone-800 mb-0.5">Instructional Supervisor Account Note</div>
                The default account password is set to <span className="font-mono font-bold text-[#701628]">omes123</span>. The supervisor can customize and reset their password using the secure OTP recovery tool.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsSupervisorModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-sm"
                >
                  {editingSupervisor ? 'Update Supervisor' : 'Save Instructional Supervisor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK ASSIGN TEACHER TO SUPERVISOR */}
      {isQuickAssignModalOpen && targetSupervisorForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#701628] px-6 py-4 text-white flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 rounded-lg text-amber-300">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Assign Faculty Member</h3>
                  <p className="text-xs text-amber-200/90">{targetSupervisorForAssign.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickAssignModalOpen(false)}
                className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteQuickAssign} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-[10px] uppercase font-bold text-stone-400">Designated Supervisor</div>
                <div className="text-sm font-bold text-[#701628] mt-0.5">{targetSupervisorForAssign.fullName}</div>
                <div className="text-stone-600 text-xs">{targetSupervisorForAssign.position} · {targetSupervisorForAssign.department}</div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  Select Member to Assign
                </label>
                <select
                  value={selectedTeacherIdToAssign}
                  onChange={(e) => setSelectedTeacherIdToAssign(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold border border-stone-300 rounded-xl bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#701628]"
                >
                  <option value="" disabled>-- Select Teacher --</option>
                  {eligibleFacultyTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.position} - {t.department})
                    </option>
                  ))}
                  {eligibleFacultyTeachers.length === 0 && (
                    <option disabled value="">No eligible faculty members available</option>
                  )}
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  Assigning this teacher will update their mentoring record and supervisory COT linkage immediately.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsQuickAssignModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#701628] hover:bg-[#580e1c] text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE TEACHER CONFIRMATION MODAL */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden my-4">
            <div className="bg-rose-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Delete Teaching Personnel</h3>
                  <p className="text-xs text-rose-100">Barobo National High School OMES</p>
                </div>
              </div>
              <button
                onClick={() => setTeacherToDelete(null)}
                className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-stone-800">
                <p className="font-semibold text-rose-950 text-sm">
                  Are you sure you want to delete this faculty member?
                </p>
                <div className="mt-2.5 space-y-1 text-xs">
                  <div>
                    <span className="font-bold text-stone-600">Faculty Name:</span>{' '}
                    <strong className="text-stone-900">{teacherToDelete.fullName}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-stone-600">Employee ID:</span>{' '}
                    <span className="font-mono text-stone-800">{teacherToDelete.employeeId}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-600">Position & Dept:</span>{' '}
                    <span>{teacherToDelete.position} · {teacherToDelete.department}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-600">Subject:</span>{' '}
                    <span className="text-[#701628] font-semibold">{teacherToDelete.subject || 'General'}</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed">
                Deleting this faculty member will remove them from the active Teaching Personnel Directory and unassign them from their designated instructional supervisor.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setTeacherToDelete(null)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteTeacher(teacherToDelete.id);
                    setTeacherToDelete(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Faculty Member</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE SUPERVISOR CONFIRMATION MODAL */}
      {supervisorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden my-4">
            <div className="bg-rose-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Delete Instructional Supervisor</h3>
                  <p className="text-xs text-rose-100">Barobo National High School OMES</p>
                </div>
              </div>
              <button
                onClick={() => setSupervisorToDelete(null)}
                className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-stone-800">
                <p className="font-semibold text-rose-950 text-sm">
                  Are you sure you want to delete this supervisor?
                </p>
                <div className="mt-2.5 space-y-1 text-xs">
                  <div>
                    <span className="font-bold text-stone-600">Supervisor Name:</span>{' '}
                    <strong className="text-stone-900">{supervisorToDelete.fullName}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-stone-600">Position:</span>{' '}
                    <span>{supervisorToDelete.position}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-600">Department:</span>{' '}
                    <span>{supervisorToDelete.department}</span>
                  </div>
                </div>
              </div>

              {teachers.filter((t) => t.assignedSupervisorId === supervisorToDelete.id).length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                  <strong>Notice:</strong>{' '}
                  {teachers.filter((t) => t.assignedSupervisorId === supervisorToDelete.id).length} faculty member(s) currently assigned to this supervisor will become unassigned.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setSupervisorToDelete(null)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteSupervisor(supervisorToDelete.id);
                    setSupervisorToDelete(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Supervisor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
