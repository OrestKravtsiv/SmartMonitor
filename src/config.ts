const env = import.meta.env;

export const appConfig = {
  apiUrl: env.VITE_API_URL ?? 'http://localhost:8080',
  mqttWsUrl: env.VITE_MQTT_WS_URL ?? 'ws://localhost:8083/mqtt',
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
    appId: env.VITE_FIREBASE_APP_ID ?? '',
  },
  firebaseAuthEmulatorUrl: env.VITE_FIREBASE_AUTH_EMULATOR_URL ?? '',
  firebaseVapidKey: env.VITE_FIREBASE_VAPID_KEY ?? '',
};
