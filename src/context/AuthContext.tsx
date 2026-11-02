import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Supervisor, Teacher } from '../types';

interface AuthContextType {
  currentUser: User;
  currentRole: UserRole;
  login: (username: string, password: string) => { success: boolean; message?: string };
  loginAsAdmin: (passwordAttempt: string) => { success: boolean; message?: string };
  loginAsSupervisor: (supervisor: Supervisor, passwordAttempt: string) => { success: boolean; message?: string };
  loginAsTeacher: (teacher: Teacher, passwordAttempt: string) => { success: boolean; message?: string };
  updateCurrentUserName: (fullName: string) => void;
  switchRoleQuick: (role: UserRole) => void;
  switchToSupervisor: (supervisor: Supervisor) => void;
  switchToTeacher: (teacher: Teacher) => void;
  logout: () => void;
  isAdmin: boolean;
  isSupervisor: boolean;
  isTeacher: boolean;
}

const DEFAULT_USERS: Record<UserRole, User> = {
  admin: {
    id: 'user-admin',
    username: 'admin',
    fullName: 'Administrator',
    role: 'admin',
    title: 'System Administrator',
    department: 'Administration',
    email: 'admin@bnhs.deped.gov.ph',
  },
  supervisor: {
    id: 'sup-1',
    username: 'DEPED-48201',
    fullName: 'Dr. Maria Fe Santos, PhD',
    role: 'supervisor',
    title: 'Head Teacher VI',
    department: 'Junior High School',
    email: 'mariafe.santos@deped.gov.ph',
    phone: '+63 928 554 3110',
    supervisorId: 'sup-1',
    assignedTeacherIds: ['t-1', 't-2', 't-5'],
  },
  teacher: {
    id: 't-1',
    username: 'BNHS-T-101',
    fullName: 'Mark Kenneth L. Rivera',
    role: 'teacher',
    title: 'Teacher III',
    department: 'Junior High School',
    email: 'mark.rivera@deped.gov.ph',
    phone: '+63 949 220 7819',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('bnhs_omes_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure Administrator displays "Administrator", not Principal name
        if (parsed.role === 'admin' && parsed.fullName !== 'Administrator') {
          return DEFAULT_USERS.admin;
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_USERS.admin;
  });

  useEffect(() => {
    localStorage.setItem('bnhs_omes_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const loginAsAdmin = (passwordAttempt: string) => {
    const adminPass = localStorage.getItem('bnhs_omes_admin_pass') || 'omes123';
    if (passwordAttempt.trim() !== adminPass) {
      return { success: false, message: 'Invalid Administrator password.' };
    }
    setCurrentUser(DEFAULT_USERS.admin);
    return { success: true };
  };

  const loginAsSupervisor = (supervisor: Supervisor, passwordAttempt: string) => {
    const correctPassword = supervisor.password || 'omes123';
    if (passwordAttempt.trim() !== correctPassword) {
      return {
        success: false,
        message: `Incorrect password for ${supervisor.fullName}. Default password is: omes123`,
      };
    }

    const supUser: User = {
      id: supervisor.id,
      username: supervisor.employeeId,
      fullName: supervisor.fullName,
      role: 'supervisor',
      title: supervisor.position,
      department: supervisor.department,
      email: supervisor.email,
      phone: supervisor.phone,
      supervisorId: supervisor.id,
      assignedTeacherIds: supervisor.assignedTeacherIds,
    };
    setCurrentUser(supUser);
    return { success: true };
  };

  const loginAsTeacher = (teacher: Teacher, passwordAttempt: string) => {
    if (passwordAttempt.trim() !== 'omes123') {
      return { success: false, message: 'Invalid password. Default password is: omes123' };
    }
    const teacherUser: User = {
      id: teacher.id,
      username: teacher.employeeId,
      fullName: teacher.fullName,
      role: 'teacher',
      title: `${teacher.position} - ${teacher.subject || 'Faculty'}`,
      department: teacher.department,
      email: teacher.email,
    };
    setCurrentUser(teacherUser);
    return { success: true };
  };

  const login = (username: string, password: string) => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanPass !== 'omes123') {
      return { success: false, message: 'Invalid password. Default password is: omes123' };
    }

    if (cleanUser === 'admin') {
      setCurrentUser(DEFAULT_USERS.admin);
      return { success: true };
    } else if (cleanUser === 'supervisor') {
      setCurrentUser(DEFAULT_USERS.supervisor);
      return { success: true };
    } else if (cleanUser === 'teacher') {
      setCurrentUser(DEFAULT_USERS.teacher);
      return { success: true };
    } else {
      return { success: false, message: 'Unknown username. Try "admin", "supervisor", or "teacher"' };
    }
  };

  const updateCurrentUserName = (fullName: string) => {
    setCurrentUser((prev) => ({ ...prev, fullName }));
  };

  const switchRoleQuick = (role: UserRole) => {
    setCurrentUser(DEFAULT_USERS[role]);
  };

  const switchToSupervisor = (supervisor: Supervisor) => {
    const supUser: User = {
      id: supervisor.id,
      username: supervisor.employeeId,
      fullName: supervisor.fullName,
      role: 'supervisor',
      title: supervisor.position,
      department: supervisor.department,
      email: supervisor.email,
      phone: supervisor.phone,
      supervisorId: supervisor.id,
      assignedTeacherIds: supervisor.assignedTeacherIds,
    };
    setCurrentUser(supUser);
  };

  const switchToTeacher = (teacher: Teacher) => {
    const teacherUser: User = {
      id: teacher.id,
      username: teacher.employeeId,
      fullName: teacher.fullName,
      role: 'teacher',
      title: `${teacher.position} - ${teacher.subject || 'Faculty'}`,
      department: teacher.department,
      email: teacher.email,
    };
    setCurrentUser(teacherUser);
  };

  const logout = () => {
    setCurrentUser(DEFAULT_USERS.admin);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser.role,
        login,
        loginAsAdmin,
        loginAsSupervisor,
        loginAsTeacher,
        updateCurrentUserName,
        switchRoleQuick,
        switchToSupervisor,
        switchToTeacher,
        logout,
        isAdmin: currentUser.role === 'admin',
        isSupervisor: currentUser.role === 'supervisor',
        isTeacher: currentUser.role === 'teacher',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
