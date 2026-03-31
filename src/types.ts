export type Role = 'SUPER_ADMIN' | 'CHURCH_ADMIN' | 'BRANCH_ADMIN' | 'DEPT_HEAD' | 'STEWARD';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  churchId?: string;
  branchId?: string;
  departmentId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Church {
  id: string;
  name: string;
  logo?: string;
  hqAddress?: string;
  foundedDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Branch {
  id: string;
  churchId: string;
  name: string;
  branchCode?: string;
  address?: string;
  city?: string;
  state?: string;
  pastorName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Department {
  id: string;
  branchId: string;
  churchId: string;
  name: string;
  headUserId?: string;
  description?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  churchId: string;
  branchId: string;
  departmentId?: string;
  fullName: string;
  phone?: string;
  email?: string;
  gender: 'MALE' | 'FEMALE';
  dateJoined?: string;
  memberType: 'MEMBER' | 'STEWARD' | 'LEADER';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Attendance {
  id: string;
  memberId: string;
  churchId: string;
  branchId: string;
  departmentId?: string;
  serviceType: string;
  attendanceDate: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  checkinTime?: string;
}

export interface Report {
  id: string;
  churchId: string;
  branchId?: string;
  totalMembers: number;
  totalStewards: number;
  totalAttendance: number;
  reportMonth: string;
  createdAt: string;
}
