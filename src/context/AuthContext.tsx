import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Supervisor, Mentor, Teacher } from '../types';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  loginAsAdmin: (passwordAttempt: string) => { success: boolean; message?: string };
  loginAsSupervisor: (supervisor: Supervisor, passwordAttempt: string) => { success: boolean; message?: string };
  loginAsMentor: (mentor: Mentor, passwordAttempt: string) => { success: boolean; message?: string };
  loginAsTeacher: (teacher: Teacher, passwordAttempt: string) => { success: boolean; message?: string };
  updateCurrentUserName: (fullName: string) => void;
  logout: () => void;
  isAdmin: boolean;
  isSupervisor: boolean;
  isMentor: boolean;
  isTeacher: boolean;
}

const ADMIN_USER: User = {
  id: 'user-admin',
  username: 'admin',
  fullName: 'Administrator',
  role: 'admin',
  title: 'System Administrator / School Head',
  department: 'Administration',
  email: 'admin@bnhs.deped.gov.ph',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always start unauthenticated on portal load so the Login Workspace gate is displayed automatically
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      localStorage.removeItem('bnhs_omes_current_user');
    } catch {
      // ignore
    }
  }, []);

  const loginAsAdmin = (passwordAttempt: string) => {
    const adminPass = localStorage.getItem('bnhs_omes_admin_pass') || 'omes123';
    if (passwordAttempt.trim() !== adminPass) {
      return { success: false, message: 'Invalid Administrator password.' };
    }
    setCurrentUser(ADMIN_USER);
    return { success: true };
  };

  const loginAsSupervisor = (supervisor: Supervisor, passwordAttempt: string) => {
    const correctPassword = supervisor.password || 'omes123';
    if (passwordAttempt.trim() !== correctPassword) {
      return {
        success: false,
        message: `Incorrect password for ${supervisor.fullName}.`,
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

  const loginAsMentor = (mentor: Mentor, passwordAttempt: string) => {
    const correctPassword = mentor.password || 'omes123';
    if (passwordAttempt.trim() !== correctPassword) {
      return {
        success: false,
        message: `Incorrect password for Mentor ${mentor.fullName}.`,
      };
    }

    const mentorUser: User = {
      id: mentor.id,
      username: mentor.employeeId,
      fullName: mentor.fullName,
      role: 'mentor',
      title: mentor.position,
      department: mentor.department,
      email: mentor.email,
      phone: mentor.phone,
      mentorId: mentor.id,
      assignedTeacherIds: mentor.assignedTeacherIds,
    };
    setCurrentUser(mentorUser);
    return { success: true };
  };

  const loginAsTeacher = (teacher: Teacher, passwordAttempt: string) => {
    const correctPassword = teacher.password || 'omes123';
    if (passwordAttempt.trim() !== correctPassword) {
      return {
        success: false,
        message: `Incorrect password for ${teacher.fullName}.`,
      };
    }
    const teacherUser: User = {
      id: teacher.id,
      username: teacher.employeeId,
      fullName: teacher.fullName,
      role: 'teacher',
      title: `${teacher.position} - ${teacher.subject || 'Faculty'}`,
      department: teacher.department,
      email: teacher.email,
      teacherId: teacher.id,
    };
    setCurrentUser(teacherUser);
    return { success: true };
  };

  const updateCurrentUserName = (fullName: string) => {
    setCurrentUser((prev) => (prev ? { ...prev, fullName } : prev));
  };

  const logout = () => {
    localStorage.removeItem('bnhs_omes_current_user');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role || null,
        isAuthenticated: Boolean(currentUser),
        loginAsAdmin,
        loginAsSupervisor,
        loginAsMentor,
        loginAsTeacher,
        updateCurrentUserName,
        logout,
        isAdmin: currentUser?.role === 'admin',
        isSupervisor: currentUser?.role === 'supervisor',
        isMentor: currentUser?.role === 'mentor',
        isTeacher: currentUser?.role === 'teacher',
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
