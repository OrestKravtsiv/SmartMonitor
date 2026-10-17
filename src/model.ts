export type UserRole = 'admin' | 'operator';

export interface AppUser {
  uid?: string;
  email: string;
  role: UserRole;
}

export type DeviceStatus = 'online' | 'offline' | 'inactive';

export interface Device {
  id: string;
  name: string;
  type: string;
  zoneId: string;
  status: DeviceStatus;
  temperature: number;
  humidity: number;
  lastSeen: string;
  thresholdMin?: number;
  thresholdMax?: number;
  sensorType?: string;
  currentValue?: number;
  unit?: string;
}

export interface Zone {
  id: string;
  name: string;
  description: string;
}

export interface Alert {
  id: string;
  deviceId?: string;
  deviceName: string;
  message: string;
  time: string;
  acknowledged: boolean;
  direction?: 'above' | 'below';
  actualValue?: number;
  thresholdValue?: number;
  acknowledgedBy?: string;
}

export interface Reading {
  value: number;
  ts: string;
  min?: number;
  max?: number;
  count?: number;
}

export interface ManagedUser {
  uid: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}
