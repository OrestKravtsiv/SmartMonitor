import { getApp } from '@firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from '@firebase/messaging';
import { appConfig } from './config';
import { registerPushToken } from './api';

let listenerAttached = false;

export async function enablePushNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Цей браузер не підтримує push-сповіщення.');
  }
  if (!appConfig.firebaseVapidKey) {
    throw new Error('Для push-сповіщень потрібно вказати VITE_FIREBASE_VAPID_KEY.');
  }
  if (!(await isSupported())) {
    throw new Error('Push-сповіщення не підтримуються в цьому середовищі.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Дозвіл на сповіщення не надано.');
  }

  const workerUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
  for (const [key, value] of Object.entries(appConfig.firebase)) {
    workerUrl.searchParams.set(key, value);
  }
  const registration = await navigator.serviceWorker.register(workerUrl);
  const messaging = getMessaging(getApp());
  const token = await getToken(messaging, {
    vapidKey: appConfig.firebaseVapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error('Firebase не повернув push-токен.');

  await registerPushToken(token);
  if (!listenerAttached) {
    onMessage(messaging, showForegroundNotification);
    listenerAttached = true;
  }
}

function showForegroundNotification(payload: MessagePayload) {
  const title = payload.notification?.title ?? 'Нове сповіщення SmartMonitor';
  const body = payload.notification?.body ?? 'Перевірте список сповіщень.';
  new Notification(title, { body, icon: '/favicon.svg' });
}
