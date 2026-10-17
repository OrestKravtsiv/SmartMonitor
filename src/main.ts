import './components/app-shell';
import './components/dashboard-page';
import './components/device-list';
import './components/device-card';
import './components/device-form';
import './components/zone-manager';
import './components/login-page';
import './components/live-chart';
import './components/alert-list';
import './components/history-view';
import './components/user-admin';
import './components/device-detail-page';
import './components/profile-page';
import { initializeAuth } from './auth';
import { configureRouter } from './router';
import { connectMqtt, disconnectMqtt } from './mqtt-client';
import { isFirebaseConfigured, signOutUser } from './auth';
import { store } from './store';
import './index.css';

const outlet = document.querySelector<HTMLElement>('#app');

if (!outlet) {
  throw new Error('Не знайдено кореневий елемент #app');
}

let mqttUid: string | undefined;
const syncMqtt = () => {
  const uid = isFirebaseConfigured ? store.user?.uid : undefined;
  if (uid === mqttUid) return;
  mqttUid = uid;
  if (uid) void connectMqtt();
  else disconnectMqtt();
};
store.addEventListener('change', syncMqtt);
window.addEventListener('smartmonitor-auth-required', () => {
  void signOutUser().finally(() => {
    window.location.assign('/login');
  });
});

void initializeAuth()
  .then(() => {
    configureRouter(outlet);
    syncMqtt();
  })
  .catch((error: unknown) => {
    console.error('Не вдалося ініціалізувати автентифікацію', error);
    outlet.textContent =
      'Не вдалося запустити SmartMonitor. Перевірте конфігурацію Firebase.';
  });
