export type UserRole = 'admin' | 'employee';

export type PunchType = 'entry' | 'lunch_start' | 'lunch_end' | 'exit' | 'custom';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department?: string;
  cpf?: string;
  password?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

export interface PunchRecord {
  id: string;
  userId: string;
  userName: string;
  userDepartment?: string;
  type: PunchType;
  typeLabel: string;
  timestamp: string; // ISO string
  timestampSaoPaulo: string; // Formatted in SP Time
  dateKey: string; // YYYY-MM-DD
  photo: string; // Base64 data URL
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
  isOfflineSynced: boolean;
  syncedAt?: string;
  notes?: string;
  deviceInfo?: string;
  hash?: string; // Digital verification receipt hash
}

export interface CompanySettings {
  id?: string;
  companyName: string;
  cnpj?: string;
  allowOffline: boolean;
  requireLocation: boolean;
  timezone: string;
  updatedAt?: string;
}

export interface FilterOptions {
  startDate: string;
  endDate: string;
  userId?: string;
  type?: string;
  department?: string;
  searchQuery?: string;
}

export interface DailySummary {
  totalPunches: number;
  uniqueEmployees: number;
  entriesCount: number;
  exitsCount: number;
  intervalsCount: number;
  offlineCount: number;
}
