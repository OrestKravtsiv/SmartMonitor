import { isFirebaseConfigured, getFirebaseIdToken, refreshFirebaseIdToken } from './auth';
import type { Alert, Device, ManagedUser, Reading, UserRole, Zone } from './model';
import { store } from './store';
import { appConfig } from './config';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function apiPath(path: string) {
  return `${appConfig.apiUrl.replace(/\/$/, '')}/api${path}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = await getFirebaseIdToken();
  if (!token) {
    throw new ApiError('Сеанс завершено. Увійдіть до системи знову.', 401);
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(apiPath(path), { ...options, headers });
  } catch (error) {
    console.error(`Помилка з’єднання з API: ${path}`, error);
    throw new ApiError('Не вдалося з’єднатися із сервером. Перевірте мережу.', 0);
  }

  if (response.status === 401 && !retried) {
    await refreshFirebaseIdToken();
    return request<T>(path, options, true);
  }
  if (response.status === 401) {
    window.dispatchEvent(new Event('smartmonitor-auth-required'));
    throw new ApiError('Сеанс завершено. Увійдіть до системи знову.', 401);
  }
  if (response.status === 403) {
    throw new ApiError('У вас недостатньо прав для цієї дії.', 403);
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      detail?: string;
      title?: string;
    } | null;
    throw new ApiError(
      problem?.detail ?? problem?.title ?? `Помилка сервера (${response.status}).`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function unwrap<T>(value: T | { content: T } | { items: T }): T {
  if (typeof value === 'object' && value !== null) {
    if ('content' in value) return value.content;
    if ('items' in value) return value.items;
  }
  return value as T;
}

export async function listDevices(zoneId?: string): Promise<Device[]> {
  if (!isFirebaseConfigured) {
    return store.devices.filter((device) => !zoneId || device.zoneId === zoneId);
  }
  const query = zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : '';
  const devices = unwrap(
    await request<DeviceDto[] | { items: DeviceDto[] }>(`/devices${query}`),
  ).map(normalizeDevice);
  store.setDevices(
    zoneId ? [...devices, ...store.devices.filter((d) => d.zoneId !== zoneId)] : devices,
  );
  return devices;
}

export async function getDevice(deviceId: string): Promise<Device | undefined> {
  if (!isFirebaseConfigured)
    return store.devices.find((device) => device.id === deviceId);
  const device = normalizeDevice(
    await request<DeviceDto>(`/devices/${encodeURIComponent(deviceId)}`),
  );
  store.upsertDevice(device);
  return device;
}

export async function createDevice(
  device: Omit<Device, 'status' | 'lastSeen'>,
): Promise<{ device: Device; deviceSecret: string }> {
  if (!isFirebaseConfigured) {
    store.addDevice(device);
    const secret = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
    );
    return { device: store.devices[0], deviceSecret: secret };
  }
  const created = await request<DeviceDto & { deviceSecret: string }>('/devices', {
    method: 'POST',
    body: JSON.stringify({
      id: device.id,
      name: device.name,
      sensorType: device.sensorType ?? device.type,
      zoneId: device.zoneId,
      thresholdMin: device.thresholdMin,
      thresholdMax: device.thresholdMax,
    }),
  });
  const { deviceSecret } = created;
  const saved = normalizeDevice(created);
  store.upsertDevice(saved);
  return { device: saved, deviceSecret };
}

export async function updateDevice(device: Device): Promise<Device> {
  if (!isFirebaseConfigured) {
    store.updateDevice(device.id, device);
    return device;
  }
  const response = await request<DeviceDto | undefined>(
    `/devices/${encodeURIComponent(device.id)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        name: device.name,
        zoneId: device.zoneId,
        thresholdMin: device.thresholdMin,
        thresholdMax: device.thresholdMax,
      }),
    },
  );
  const saved = response ? normalizeDevice(response) : device;
  store.upsertDevice(saved);
  return saved;
}

export async function removeDevice(deviceId: string) {
  if (!isFirebaseConfigured) {
    store.deleteDevice(deviceId);
    return;
  }
  await request<void>(`/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
  });
  store.deleteDevice(deviceId);
}

export async function listZones(): Promise<Zone[]> {
  if (!isFirebaseConfigured) return store.zones;
  const zones = unwrap(await request<Zone[] | { items: Zone[] }>('/zones'));
  store.setZones(zones);
  return zones;
}

export async function createZone(zone: Omit<Zone, 'id'>): Promise<Zone> {
  if (!isFirebaseConfigured) {
    store.addZone(zone);
    return store.zones[0];
  }
  const created = await request<Zone>('/zones', {
    method: 'POST',
    body: JSON.stringify(zone),
  });
  store.upsertZone(created);
  return created;
}

export async function updateZone(zoneId: string, zone: Omit<Zone, 'id'>): Promise<Zone> {
  if (!isFirebaseConfigured) {
    store.updateZone(zoneId, zone);
    return { id: zoneId, ...zone };
  }
  const updated = await request<Zone | undefined>(
    `/zones/${encodeURIComponent(zoneId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(zone),
    },
  );
  const saved = updated ?? { id: zoneId, ...zone };
  store.upsertZone(saved);
  return saved;
}

export async function removeZone(zoneId: string) {
  if (!isFirebaseConfigured) {
    store.deleteZone(zoneId);
    return;
  }
  await request<void>(`/zones/${encodeURIComponent(zoneId)}`, {
    method: 'DELETE',
  });
  store.deleteZone(zoneId);
}

export async function listAlerts(status?: 'active' | 'acknowledged'): Promise<Alert[]> {
  if (!isFirebaseConfigured) {
    return store.alerts.filter(
      (alert) => !status || (alert.acknowledged ? 'acknowledged' : 'active') === status,
    );
  }
  const query = status ? `?status=${status}&page=0&size=100` : '?page=0&size=100';
  const alerts = unwrap(
    await request<Alert[] | { items: Alert[] }>(`/alerts${query}`),
  ).map(normalizeAlert);
  store.setAlerts(alerts);
  return alerts;
}

export async function acknowledgeAlert(alertId: string) {
  if (!isFirebaseConfigured) {
    store.acknowledgeAlert(alertId);
    return;
  }
  await request<void>(`/alerts/${encodeURIComponent(alertId)}/ack`, {
    method: 'POST',
  });
  store.acknowledgeAlert(alertId);
}

export async function getDeviceHistory(
  deviceId: string,
  from: string,
  to: string,
): Promise<Reading[]> {
  if (!isFirebaseConfigured) {
    const saved = store.readings[deviceId] ?? [];
    if (saved.length) {
      return saved.filter((reading) => reading.ts >= from && reading.ts <= to);
    }
    const device = store.devices.find((item) => item.id === deviceId);
    if (!device) return [];
    const current = device.currentValue ?? device.temperature;
    return Array.from({ length: 36 }, (_, index) => {
      const ts = new Date(
        Date.parse(from) + ((Date.parse(to) - Date.parse(from)) * index) / 35,
      );
      const value = current + Math.sin(index / 3) * (device.unit === '%' ? 3 : 1.7);
      return {
        ts: ts.toISOString(),
        value: Number(value.toFixed(1)),
        min: Number((value - 0.3).toFixed(1)),
        max: Number((value + 0.3).toFixed(1)),
        count: 12,
      };
    });
  }
  const query = new URLSearchParams({ from, to, limit: '1000' });
  return unwrap(
    await request<ReadingDto[] | { items: ReadingDto[] }>(
      `/devices/${encodeURIComponent(deviceId)}/history?${query}`,
    ),
  ).map(normalizeReading);
}

export async function listUsers(): Promise<ManagedUser[]> {
  if (!isFirebaseConfigured) return store.users;
  const users = unwrap(
    await request<ManagedUser[] | { items: ManagedUser[] }>('/users'),
  ).map((user) => ({
    ...user,
    role: (String(user.role).toLowerCase() === 'admin'
      ? 'admin'
      : 'operator') as UserRole,
  }));
  store.setUsers(users);
  return users;
}

export async function updateUserRole(uid: string, role: UserRole) {
  if (!isFirebaseConfigured) {
    store.setUserRole(uid, role);
    if (store.user?.uid === uid) {
      store.setUser({ ...store.user, role });
    }
    return;
  }
  await request<void>(`/users/${encodeURIComponent(uid)}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role: role === 'admin' ? 'ADMIN' : 'OPERATOR' }),
  });
  store.setUserRole(uid, role);
}

export async function getCurrentUserProfile(): Promise<ManagedUser | undefined> {
  if (!isFirebaseConfigured) {
    const current = store.user;
    return current
      ? {
          uid: current.uid ?? 'demo-user',
          email: current.email,
          role: current.role,
        }
      : undefined;
  }
  return request<ManagedUser>('/users/me');
}

export async function registerPushToken(token: string) {
  if (!isFirebaseConfigured) {
    throw new ApiError('Push-сповіщення доступні після налаштування Firebase.', 400);
  }
  await request<void>('/users/me/fcm-token', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function ensureUserProfile() {
  if (!isFirebaseConfigured) return;
  await request<void>('/users/me', { method: 'POST' });
}

interface DeviceDto extends Omit<Partial<Device>, 'status'> {
  id: string;
  name: string;
  sensorType?: string;
  status?: string;
  latestValue?: number;
  lastSeenAt?: string;
}

interface ReadingDto extends Partial<Reading> {
  avg?: number;
  average?: number;
  timestamp?: string;
}

function normalizeDevice(device: DeviceDto): Device {
  const sensorType = device.sensorType ?? device.type ?? 'Датчик';
  const isHumidity = /humid|moist|волог|ґрунт/iu.test(sensorType);
  const unit = device.unit ?? (isHumidity ? '%' : '°C');
  const currentValue = device.latestValue ?? device.currentValue ?? 0;
  const status = device.status?.toLowerCase();
  return {
    ...device,
    type: sensorType,
    sensorType,
    zoneId: device.zoneId ?? '',
    status:
      status === 'online' || status === 'offline' || status === 'inactive'
        ? status
        : 'inactive',
    temperature: device.temperature ?? (unit === '%' ? 0 : currentValue),
    humidity: device.humidity ?? (unit === '%' ? currentValue : 0),
    lastSeen: device.lastSeen ?? device.lastSeenAt ?? 'ще не підключався',
    currentValue,
    unit,
  };
}

function normalizeReading(reading: ReadingDto): Reading {
  return {
    value: reading.value ?? reading.avg ?? reading.average ?? 0,
    ts: reading.ts ?? reading.timestamp ?? '',
    min: reading.min,
    max: reading.max,
    count: reading.count,
  };
}

function normalizeAlert(alert: Alert): Alert {
  const backendAlert = alert as Alert & {
    status?: string;
    triggeredAt?: string;
    acknowledgedAt?: string;
  };
  return {
    ...backendAlert,
    acknowledged:
      backendAlert.acknowledged || backendAlert.status?.toLowerCase() === 'acknowledged',
    message:
      backendAlert.message ??
      `Показник ${backendAlert.direction === 'below' ? 'нижче' : 'вище'} допустимого порогу`,
    time: backendAlert.time ?? backendAlert.triggeredAt ?? '',
  };
}
