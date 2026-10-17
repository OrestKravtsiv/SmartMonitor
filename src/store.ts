import type { Alert, AppUser, Device, ManagedUser, Reading, Zone } from './model';

const initialZones: Zone[] = [
  { id: 'zone-1', name: 'Склад №1', description: 'Зона зберігання продукції' },
  { id: 'zone-2', name: 'Серверна', description: 'Технічне приміщення' },
  { id: 'zone-3', name: 'Оранжерея', description: 'Теплиця та зона вирощування' },
];

const initialDevices: Device[] = [
  {
    id: 'SM-1042',
    name: 'Датчик температури 01',
    type: 'Температура та вологість',
    zoneId: 'zone-1',
    status: 'online',
    temperature: 21.4,
    humidity: 46,
    lastSeen: 'щойно',
    thresholdMin: 10,
    thresholdMax: 35,
    currentValue: 21.4,
    unit: '°C',
  },
  {
    id: 'SM-1043',
    name: 'Датчик температури 02',
    type: 'Температура та вологість',
    zoneId: 'zone-2',
    status: 'online',
    temperature: 19.8,
    humidity: 39,
    lastSeen: 'щойно',
    thresholdMin: 10,
    thresholdMax: 35,
    currentValue: 19.8,
    unit: '°C',
  },
  {
    id: 'SM-1044',
    name: 'Контроль вологості',
    type: 'Датчик вологості ґрунту',
    zoneId: 'zone-3',
    status: 'offline',
    temperature: 25.2,
    humidity: 72,
    lastSeen: '12 хв тому',
    thresholdMin: 15,
    thresholdMax: 80,
    currentValue: 72,
    unit: '%',
  },
  {
    id: 'SM-1045',
    name: 'Датчик мікроклімату',
    type: 'Температура та вологість',
    zoneId: 'zone-1',
    status: 'inactive',
    temperature: 22.1,
    humidity: 51,
    lastSeen: '2 дні тому',
    thresholdMin: 10,
    thresholdMax: 35,
    currentValue: 22.1,
    unit: '°C',
  },
];

const initialAlerts: Alert[] = [
  {
    id: 'alert-1',
    deviceName: 'Контроль вологості',
    deviceId: 'SM-1044',
    message: 'Пристрій не надсилає дані',
    time: '12 хв тому',
    acknowledged: false,
    direction: 'below',
    actualValue: 72,
    thresholdValue: 80,
  },
  {
    id: 'alert-2',
    deviceName: 'Датчик температури 01',
    deviceId: 'SM-1042',
    message: 'Температура повернулася до норми',
    time: 'сьогодні, 09:42',
    acknowledged: true,
    direction: 'above',
    actualValue: 37.2,
    thresholdValue: 35,
  },
];

const initialReadings: Record<string, Reading[]> = Object.fromEntries(
  initialDevices.map((device, deviceIndex) => [
    device.id,
    Array.from({ length: 36 }, (_, index) => {
      const base =
        device.currentValue ??
        (device.unit === '%' ? device.humidity : device.temperature);
      const value =
        base + Math.sin(index / 3 + deviceIndex) * (device.unit === '%' ? 2 : 1);
      return {
        value: Number(value.toFixed(1)),
        ts: new Date(Date.now() - (35 - index) * 5 * 60_000).toISOString(),
        min: Number((value - 0.2).toFixed(1)),
        max: Number((value + 0.2).toFixed(1)),
        count: 5,
      };
    }),
  ]),
);

function readList<T>(key: string, fallback: T[]): T[] {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T[]) : fallback;
  } catch (error) {
    console.error(`Не вдалося прочитати локальні дані "${key}"`, error);
    return fallback;
  }
}

function readRecord<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (error) {
    console.error(`Не вдалося прочитати локальні дані "${key}"`, error);
    return fallback;
  }
}

class AppStore extends EventTarget {
  user: AppUser | null = null;
  devices = readList('smartmonitor.devices', initialDevices);
  zones = readList('smartmonitor.zones', initialZones);
  alerts = readList('smartmonitor.alerts', initialAlerts);
  users = readList<ManagedUser>('smartmonitor.users', [
    {
      uid: 'demo-admin',
      email: 'admin@smartmonitor.local',
      role: 'admin',
      createdAt: '2026-10-01T09:00:00.000Z',
    },
    {
      uid: 'demo-operator',
      email: 'operator@smartmonitor.local',
      role: 'operator',
      createdAt: '2026-10-02T10:30:00.000Z',
    },
  ]);
  readings = readRecord<Record<string, Reading[]>>(
    'smartmonitor.readings',
    initialReadings,
  );
  mqttConnected = false;

  setUser(user: AppUser | null) {
    this.user = user;
    this.dispatchEvent(new Event('change'));
  }

  setDevices(devices: Device[]) {
    this.devices = devices;
    this.changed();
  }

  setZones(zones: Zone[]) {
    this.zones = zones;
    this.changed();
  }

  setAlerts(alerts: Alert[]) {
    this.alerts = alerts;
    this.changed();
  }

  setUsers(users: ManagedUser[]) {
    this.users = users;
    this.changed();
  }

  upsertDevice(device: Device) {
    this.devices = [
      device,
      ...this.devices.filter((current) => current.id !== device.id),
    ];
    this.changed();
  }

  upsertZone(zone: Zone) {
    this.zones = [zone, ...this.zones.filter((current) => current.id !== zone.id)];
    this.changed();
  }

  addDevice(device: Omit<Device, 'status' | 'lastSeen'>) {
    this.devices = [
      {
        ...device,
        status: 'inactive',
        lastSeen: 'ще не підключався',
      },
      ...this.devices,
    ];
    this.persist('smartmonitor.devices', this.devices);
    this.changed();
  }

  updateDevice(deviceId: string, update: Partial<Device>) {
    this.devices = this.devices.map((device) =>
      device.id === deviceId ? { ...device, ...update, id: deviceId } : device,
    );
    this.persist('smartmonitor.devices', this.devices);
    this.changed();
  }

  deleteDevice(deviceId: string) {
    this.devices = this.devices.filter((device) => device.id !== deviceId);
    delete this.readings[deviceId];
    this.persist('smartmonitor.devices', this.devices);
    this.persist('smartmonitor.readings', this.readings);
    this.changed();
  }

  addZone(zone: Omit<Zone, 'id'>) {
    this.zones = [{ ...zone, id: `zone-${Date.now()}` }, ...this.zones];
    this.persist('smartmonitor.zones', this.zones);
    this.changed();
  }

  updateZone(zoneId: string, update: Omit<Zone, 'id'>) {
    this.zones = this.zones.map((zone) =>
      zone.id === zoneId ? { ...zone, ...update, id: zoneId } : zone,
    );
    this.persist('smartmonitor.zones', this.zones);
    this.changed();
  }

  deleteZone(zoneId: string) {
    this.zones = this.zones.filter((zone) => zone.id !== zoneId);
    this.persist('smartmonitor.zones', this.zones);
    this.changed();
  }

  acknowledgeAlert(id: string) {
    this.alerts = this.alerts.map((alert) =>
      alert.id === id ? { ...alert, acknowledged: true } : alert,
    );
    this.persist('smartmonitor.alerts', this.alerts);
    this.changed();
  }

  setUserRole(uid: string, role: ManagedUser['role']) {
    this.users = this.users.map((user) => (user.uid === uid ? { ...user, role } : user));
    this.persist('smartmonitor.users', this.users);
    this.changed();
  }

  setMqttConnected(connected: boolean) {
    this.mqttConnected = connected;
    this.changed();
  }

  updateDeviceStatus(deviceId: string, status: Device['status']) {
    this.devices = this.devices.map((device) =>
      device.id === deviceId
        ? {
            ...device,
            status,
            lastSeen: status === 'online' ? 'щойно' : device.lastSeen,
          }
        : device,
    );
    this.persist('smartmonitor.devices', this.devices);
    this.changed();
  }

  addReading(deviceId: string, reading: Reading) {
    const points = this.readings[deviceId] ?? [];
    const now = Date.now();
    const lastSaved = points.at(-1);
    if (lastSaved && now - Date.parse(lastSaved.ts) < 250) return;

    this.readings = {
      ...this.readings,
      [deviceId]: [...points, reading].slice(-500),
    };
    this.devices = this.devices.map((device) =>
      device.id === deviceId
        ? {
            ...device,
            currentValue: reading.value,
            temperature:
              (device.unit ?? '°C') === '%' ? device.temperature : reading.value,
            humidity: (device.unit ?? '°C') === '%' ? reading.value : device.humidity,
            lastSeen: 'щойно',
            status: 'online',
          }
        : device,
    );
    this.persist('smartmonitor.readings', this.readings);
    this.persist('smartmonitor.devices', this.devices);
    this.changed();
  }

  zoneName(zoneId: string) {
    return this.zones.find((zone) => zone.id === zoneId)?.name ?? 'Без зони';
  }

  private persist<T>(key: string, value: T) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Не вдалося зберегти локальні дані "${key}"`, error);
    }
  }

  private changed() {
    this.dispatchEvent(new Event('change'));
  }
}

export const store = new AppStore();
