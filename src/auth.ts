import { initializeApp, type FirebaseApp } from '@firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from '@firebase/auth';
import type { AppUser, UserRole } from './model';
import { store } from './store';
import { appConfig } from './config';

const firebaseEnabled = Object.values(appConfig.firebase).every(Boolean);
let auth: Auth | undefined;
let app: FirebaseApp | undefined;

function fromFirebase(user: User, role: UserRole): AppUser {
  return { uid: user.uid, email: user.email ?? 'Користувач', role };
}

async function resolveFirebaseUser(user: User | null) {
  if (!user) {
    store.setUser(null);
    return;
  }
  const token = await getIdTokenResult(user);
  const claimRole = token.claims.role;
  const role: UserRole =
    String(claimRole).toLowerCase() === 'admin' ? 'admin' : 'operator';
  store.setUser(fromFirebase(user, role));
}

export async function initializeAuth(): Promise<void> {
  if (!firebaseEnabled) {
    try {
      const stored = localStorage.getItem('smartmonitor.user');
      store.setUser(stored ? (JSON.parse(stored) as AppUser) : null);
    } catch (error) {
      console.error('Не вдалося відновити демо-сеанс', error);
      store.setUser(null);
    }
    return Promise.resolve();
  }

  app = initializeApp(appConfig.firebase);
  const firebaseAuth = getAuth(app);
  auth = firebaseAuth;
  if (appConfig.firebaseAuthEmulatorUrl) {
    connectAuthEmulator(firebaseAuth, appConfig.firebaseAuthEmulatorUrl, {
      disableWarnings: true,
    });
  }
  return new Promise((resolve, reject) => {
    let firstChange = true;
    onAuthStateChanged(
      firebaseAuth,
      (user) => {
        void resolveFirebaseUser(user)
          .then(() => {
            if (firstChange) {
              firstChange = false;
              resolve();
            }
          })
          .catch(reject);
      },
      reject,
    );
  });
}

export async function signIn(email: string, password: string, demoRole: UserRole) {
  if (!auth) {
    const user = {
      uid: demoRole === 'admin' ? 'demo-admin' : 'demo-operator',
      email,
      role: demoRole,
    };
    localStorage.setItem('smartmonitor.user', JSON.stringify(user));
    store.setUser(user);
    return;
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await getIdTokenResult(credential.user);
  const role: UserRole =
    String(token.claims.role).toLowerCase() === 'admin' ? 'admin' : 'operator';
  store.setUser(fromFirebase(credential.user, role));
}

export async function register(email: string, password: string) {
  if (!auth) {
    const user = { uid: 'demo-operator', email, role: 'operator' as const };
    localStorage.setItem('smartmonitor.user', JSON.stringify(user));
    store.setUser(user);
    return;
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  store.setUser(fromFirebase(credential.user, 'operator'));
}

export async function signOutUser() {
  if (auth) {
    await signOut(auth);
  } else {
    localStorage.removeItem('smartmonitor.user');
    store.setUser(null);
  }
}

export async function getFirebaseIdToken() {
  const user = auth?.currentUser;
  return user ? user.getIdToken() : null;
}

export async function refreshFirebaseIdToken() {
  const user = auth?.currentUser;
  return user ? user.getIdToken(true) : null;
}

export async function getMqttCredentials() {
  const user = auth?.currentUser;
  if (!user) return null;
  return { uid: user.uid, token: await user.getIdToken(true) };
}

export async function refreshCurrentUserRole() {
  const user = auth?.currentUser;
  if (!user) return;
  const token = await getIdTokenResult(user, true);
  store.setUser(
    fromFirebase(
      user,
      String(token.claims.role).toLowerCase() === 'admin' ? 'admin' : 'operator',
    ),
  );
}

export const isFirebaseConfigured = firebaseEnabled;
