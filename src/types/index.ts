export type UserRole = 'employee' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId: string;
  photoUrl?: string;
  createdAt: string;
}

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
}

export interface TimeRecord {
  id?: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  type: 'entry' | 'exit';
  timestamp: string;
  photoUrl: string;
  location: LocationData;
  status: 'approved' | 'divergent';
  auditNotes?: string;
}

export interface Geofence {
  id?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius: number;
}
