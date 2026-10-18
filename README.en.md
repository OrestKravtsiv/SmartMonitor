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
