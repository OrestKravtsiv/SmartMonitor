# SmartMonitor

[Українська](./README.md)

An English-language web interface for monitoring IoT devices, telemetry, and alerts. Built with Vite, Lit, and TypeScript, the app supports a local demo mode, Firebase Authentication, a REST API, MQTT over WebSocket, and Firebase Web Push.

## Features

- Dashboard with device status, recent alerts, and telemetry charts.
- Device list and detail pages, reading history, search, and filters.
- Device and zone administration: create, edit, and delete; configure device thresholds.
- Alert list with filters, acknowledgement, and automatic refresh.
- User and role administration, a profile page, and push notification settings.
- Role-based access restrictions for administrative sections.

## Requirements

- Node.js 22 or newer and npm.
- Docker with Docker Compose if you want to run the app in a container.
- Full integration requires an available REST API and MQTT broker with WebSocket support; Firebase is required for Firebase features.

## Run locally

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open the address printed by Vite (typically `http://localhost:5173`).

When Firebase settings are left blank, local demo mode is available. Enter any email address, a password of at least 6 characters, and choose a demo role. Demo data is stored in the browser's `localStorage`. This mode is for trying the interface and is not a replacement for production authentication.

## Environment variables

Copy `.env.example` to `.env` and configure the values you need. Vite reads `VITE_*` variables at startup or build time.

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | REST API base URL; the client appends the `/api` prefix. | `http://localhost:8080` |
| `VITE_MQTT_WS_URL` | URL of an MQTT broker with WebSocket support. | `ws://localhost:8083/mqtt` |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key. | empty |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain. | empty |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID. | empty |
| `VITE_FIREBASE_APP_ID` | Firebase app ID. | empty |
| `VITE_FIREBASE_VAPID_KEY` | Web Push VAPID key for Firebase Messaging. | empty |
| `VITE_FIREBASE_AUTH_EMULATOR_URL` | Optional Firebase Auth Emulator URL. | empty |

Firebase Authentication is enabled only when all four values are set: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`. Push notifications additionally require a VAPID key, browser permission, and a secure context (HTTPS or localhost).

> `VITE_*` values are bundled into client-side code and are visible to browsers. Do not put secrets or private keys in them.

## Firebase and local emulators

The Firebase CLI is included as a project dev dependency and is installed by `npm ci`. Firebase configuration is in `firebase.json`, the local project alias is in `.firebaserc`, and Firestore rules and composite indexes are in `firestore.rules` and `firestore.indexes.json`.

The Firebase Emulator Suite requires JDK 21 or newer.

Start the Auth and Firestore Emulator Suite:

```powershell
Copy-Item .env.emulator.example .env
npm run firebase:emulators
```

The emulators listen on `127.0.0.1:9099` (Auth), `127.0.0.1:8085` (Firestore), and `http://127.0.0.1:4000` (Emulator UI). Firestore uses port `8085` to avoid conflicting with the REST backend's default port `8080`. In a separate terminal, start the frontend with `npm run dev`. The `.env.emulator.example` file configures the Firebase Auth SDK to use the local Auth Emulator.

To browse the local database graphically, open `http://127.0.0.1:4000` and select **Firestore**. This is the Emulator UI, not the Firebase Console website: local data stays on this computer and does not appear in the cloud project.

Automatically verify the Firestore rules using the Firestore Emulator:

```powershell
npm run firebase:emulators:exec -- "npm run test:firestore"
```

The tests verify that anonymous and authenticated clients cannot read or write, and that privileged backend access can operate with rules disabled.

Firestore rules deny all client reads and writes as required by ADR-4. The server must access Firestore through Firebase Admin SDK, which bypasses Firestore Security Rules.

## Minimal backend and Firestore seed data

The `backend/` directory contains a Spring Boot utility, not a REST API. It connects Firebase Admin SDK to Firestore, defines the entities, and inserts initial demo data only when explicitly enabled. It requires JDK 21 and Maven 3.9 or newer.

1. Start the emulators in one terminal (`npm run firebase:emulators`).
2. In another terminal, from the repository root, run:

```powershell
$env:FIREBASE_PROJECT_ID = "smartmonitor-2006"
$env:FIREBASE_EMULATOR_HOST = "127.0.0.1:8085"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
$env:SMARTMONITOR_SEED_ENABLED = "true"
# Optional: create seed-admin and seed-operator in the Auth Emulator.
$env:SMARTMONITOR_SEED_AUTH_PASSWORD = "ChangeThisLocalPassword123!"
mvn -f backend/pom.xml spring-boot:run
```

The password is only used to create the two users in the **Auth Emulator**. If it is omitted, Firestore profile documents are seeded, but Auth users are not created. Do not use the demo password in production.

The seeder inserts 3 zones, demo user profiles, 8 devices with different sensor types, 168 hourly readings per device covering the last 7 days, 4 active/acknowledged alerts, and sample audit log entries. Each reading's `expireAt` is set to 180 days after its `ts`. Seeding is idempotent: documents whose IDs already exist are skipped and not overwritten. The emulator imports/exports its state to `emulator-data/` to preserve it between runs on this machine.

For cloud Firestore, do **not** set `FIREBASE_EMULATOR_HOST`; set `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` to the service-account JSON path, and `SMARTMONITOR_SEED_ENABLED=true`. The seeder is disabled by default. Verify the project ID before running in the cloud: Admin SDK operations bypass Security Rules. Never commit a service-account key.

To later show the same demo dataset in Firebase Console, run the seeder against the selected cloud project; it creates the same sample documents there, but the local database is not automatically synchronized or copied. Moving other existing local data would require a separate export/import step.

This module only seeds data and exits. It does not expose REST endpoints and does not replace the separate backend API required by the frontend.

### TTL for reading history

The TTL policy for the `readings` collection group is configured on the Google Cloud project, not through the Firebase Emulator Suite or `firestore.indexes.json`. To enable 180-day retention in cloud Firestore, install Google Cloud CLI, authenticate it, and run:

```powershell
gcloud firestore fields ttls update expireAt --collection-group=readings --enable-ttl --project=<firebase-project-id>
```

The backend must write an `expireAt` field of Firestore Timestamp type on each reading document, set to the reading time plus 180 days. TTL deletion is asynchronous: expired documents may remain available for up to 24 hours. The command requires Google Cloud permissions to change TTL policies and is not run by the local Firebase Emulator.

### Deploy Firestore rules and indexes

The current `.firebaserc` intentionally points to the demo project `smartmonitor-2006` to prevent accidental production deployment. After linking a real Firebase project, deploy only the rules and indexes:

```powershell
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

Verify the selected project before deploying. Applying rules and indexes requires Firebase CLI authentication and access to the project.

## Run with Docker Compose

Optionally create `.env` as described above, then run:

```powershell
docker compose up --build
```

The development container is available at `http://localhost:5173`. Compose uses the `development` target and mounts the source code for local development. The `Dockerfile` also defines `build` and `production` targets to build the static app and serve it with nginx.

## Checks and production build

```powershell
npm run format:check
npm run lint
npm run build
npm run preview
```

`npm run build` runs the TypeScript check and creates production files in `dist/`. Before deploying to production, verify the environment settings and compatibility of the REST and MQTT contracts with the server.

## Integration contracts

- REST requests use `${VITE_API_URL}/api` as their base and send the Firebase ID token as a Bearer token.
- The interface expects APIs for user profiles and administration (`/users/me`, `/users`, `/users/{uid}/role`, `/users/me/fcm-token`), zones (`/zones`), devices (`/devices`), and alerts (`/alerts`). Device history uses `/devices/{id}/history` with `from`, `to`, and `limit` parameters.
- Live data is received directly over MQTT WebSocket from the `devices/+/telemetry` and `devices/+/status` topics.
- MQTT telemetry messages are expected to be JSON with a numeric `value`; the timestamp is provided in `ts`. Status messages may be plain text or JSON with a `status` field.
- In a real deployment, user roles must be enforced by the backend/Firebase custom claims. The role selected on the demo login screen is only for local UI exploration.

Verify actual REST response formats and MQTT payloads against the server-side contracts. Demo mode does not validate the availability of external services.
