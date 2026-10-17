importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

const parameters = new URL(self.location.href).searchParams;
self.firebase.initializeApp({
  apiKey: parameters.get('apiKey') || '',
  authDomain: parameters.get('authDomain') || '',
  projectId: parameters.get('projectId') || '',
  appId: parameters.get('appId') || '',
});

const messaging = self.firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Нове сповіщення SmartMonitor';
  const options = {
    body: payload.notification?.body || 'Перевірте список сповіщень.',
    icon: '/favicon.svg',
  };
  self.registration.showNotification(title, options);
});
