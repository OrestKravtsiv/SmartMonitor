import mqtt, { type MqttClient } from 'mqtt';
import { getMqttCredentials, isFirebaseConfigured } from './auth';
import { appConfig } from './config';
import { store } from './store';
import type { Device, Reading } from './model';

let client: MqttClient | undefined;
let retryTimer: number | undefined;
let retryDelay = 1000;
let generation = 0;

function updateStatus(deviceId: string, status: string) {
  if (status === 'online' || status === 'offline') {
    store.updateDeviceStatus(deviceId, status);
  }
}

function handleMessage(topic: string, payload: Uint8Array) {
  const parts = topic.split('/');
  const deviceId = parts[1];
  const channel = parts[2];
  if (!deviceId || !channel) return;

  try {
    const body = new TextDecoder().decode(payload);
    if (channel === 'status') {
      let statusValue = body.trim().replace(/^"|"$/g, '');
      try {
        const statusPayload = JSON.parse(body) as { status?: unknown };
        if (typeof statusPayload.status === 'string') {
          statusValue = statusPayload.status;
        }
      } catch {
        // Plain-text status payloads are part of the broker contract too.
      }
      updateStatus(deviceId, statusValue);
      return;
    }

    if (channel !== 'telemetry') return;
    const data = JSON.parse(body) as Partial<Reading>;
    if (typeof data.value !== 'number' || !Number.isFinite(data.value)) {
      throw new Error('Поле value має бути скінченним числом.');
    }
    const reading = {
      value: data.value,
      ts: typeof data.ts === 'string' ? data.ts : new Date().toISOString(),
      min: data.min,
      max: data.max,
      count: data.count,
    };
    store.addReading(deviceId, reading);
  } catch (error) {
    console.error(`Некоректне MQTT-повідомлення в топіку ${topic}`, error);
  }
}

function scheduleReconnect(currentGeneration: number) {
  if (currentGeneration !== generation || retryTimer !== undefined) return;
  store.setMqttConnected(false);
  const delay = retryDelay;
  retryDelay = Math.min(retryDelay * 2, 30_000);
  retryTimer = window.setTimeout(() => {
    retryTimer = undefined;
    void connectMqtt();
  }, delay);
}

export async function connectMqtt() {
  if (!isFirebaseConfigured) return;
  if (retryTimer !== undefined) {
    window.clearTimeout(retryTimer);
    retryTimer = undefined;
  }
  if (client) {
    client.removeAllListeners();
    client.end(true);
    client = undefined;
  }

  const currentGeneration = ++generation;
  let credentials: Awaited<ReturnType<typeof getMqttCredentials>>;
  try {
    credentials = await getMqttCredentials();
  } catch (error) {
    console.error('Не вдалося отримати облікові дані для MQTT', error);
    scheduleReconnect(currentGeneration);
    return;
  }
  if (currentGeneration !== generation) return;
  if (!credentials) {
    store.setMqttConnected(false);
    return;
  }

  let mqttClient: MqttClient;
  try {
    mqttClient = mqtt.connect(appConfig.mqttWsUrl, {
      clientId: `web-${credentials.uid}-${crypto.randomUUID()}`,
      username: credentials.uid,
      password: credentials.token,
      clean: true,
      connectTimeout: 10_000,
      reconnectPeriod: 0,
    });
  } catch (error) {
    console.error('Не вдалося створити MQTT-з’єднання', error);
    scheduleReconnect(currentGeneration);
    return;
  }
  client = mqttClient;

  mqttClient.once('connect', () => {
    if (currentGeneration !== generation) return;
    retryDelay = 1000;
    store.setMqttConnected(true);
    mqttClient.subscribe(['devices/+/telemetry', 'devices/+/status'], (error) => {
      if (error) {
        console.error('Не вдалося підписатися на MQTT-топіки', error);
      }
    });
  });
  mqttClient.on('message', handleMessage);
  mqttClient.on('error', (error) => {
    console.error('Помилка MQTT-з’єднання', error);
    mqttClient.end(true);
    scheduleReconnect(currentGeneration);
  });
  mqttClient.on('close', () => scheduleReconnect(currentGeneration));
  mqttClient.on('offline', () => store.setMqttConnected(false));
}

export function disconnectMqtt() {
  generation += 1;
  if (retryTimer !== undefined) {
    window.clearTimeout(retryTimer);
    retryTimer = undefined;
  }
  if (client) {
    client.removeAllListeners();
    client.end(true);
    client = undefined;
  }
  store.setMqttConnected(false);
}

export function applyDemoReading(device: Device, reading: Reading) {
  store.addReading(device.id, reading);
}
