# SmartMonitor

[English](./README.en.md)

Україномовний вебінтерфейс для моніторингу IoT-пристроїв, телеметрії та сповіщень. Застосунок побудовано на Vite, Lit і TypeScript. Підтримує демо-режим із локальними даними, Firebase Authentication, REST API, MQTT over WebSocket та Firebase Web Push.

## Основні можливості

- Дашборд зі станом пристроїв, останніми сповіщеннями та графіком телеметрії.
- Перегляд пристроїв, сторінка деталей, історія показань, пошук і фільтри.
- Адміністрування пристроїв і зон: створення, редагування та видалення; налаштування порогів пристроїв.
- Список сповіщень із фільтрами, підтвердженням опрацювання та автоматичним оновленням.
- Адміністрування користувачів і ролей, сторінка профілю та налаштування push-сповіщень.
- Рольові обмеження для адміністративних розділів.

## Вимоги

- Node.js 22 або новіший і npm.
- Docker із Docker Compose — лише якщо плануєте запуск у контейнері.
- Для повної інтеграції потрібні доступні REST API, MQTT-брокер із WebSocket і, за потреби, проєкт Firebase.

## Локальний запуск

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Після запуску відкрийте адресу, показану Vite (типово `http://localhost:5173`).

Якщо параметри Firebase залишити порожніми, доступний локальний демо-режим: введіть будь-яку електронну адресу та пароль щонайменше з 6 символів і виберіть демо-роль. Дані демо-режиму зберігаються в `localStorage` браузера. Це режим для ознайомлення, а не заміна production-автентифікації.

## Змінні середовища

Скопіюйте `.env.example` у `.env` і налаштуйте потрібні значення. Vite читає змінні `VITE_*` під час запуску або збірки.

| Змінна | Призначення | Типове значення |
| --- | --- | --- |
| `VITE_API_URL` | Базова адреса REST API; клієнт додає до неї префікс `/api`. | `http://localhost:8080` |
| `VITE_MQTT_WS_URL` | URL MQTT-брокера з підтримкою WebSocket. | `ws://localhost:8083/mqtt` |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key. | порожньо |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain. | порожньо |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID. | порожньо |
| `VITE_FIREBASE_APP_ID` | Firebase app ID. | порожньо |
| `VITE_FIREBASE_VAPID_KEY` | Web Push VAPID key для Firebase Messaging. | порожньо |
| `VITE_FIREBASE_AUTH_EMULATOR_URL` | Необов’язкова адреса Firebase Auth Emulator. | порожньо |

Для ввімкнення Firebase Authentication мають бути задані всі чотири значення `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` і `VITE_FIREBASE_APP_ID`. Push-сповіщення додатково потребують VAPID-ключа, дозволу браузера та secure context (HTTPS або localhost).

> Значення `VITE_*` вбудовуються у клієнтський код і доступні браузеру. Не зберігайте в них секрети або приватні ключі.

## Запуск через Docker Compose

За потреби спочатку створіть `.env`, як описано вище, потім виконайте:

```powershell
docker compose up --build
```

Dev-контейнер буде доступний на `http://localhost:5173`. Compose використовує ціль `development` і монтує вихідний код для локальної розробки. У `Dockerfile` також є цілі `build` і `production` для збирання статичного застосунку та його роздачі через nginx.

## Перевірки та production-збірка

```powershell
npm run format:check
npm run lint
npm run build
npm run preview
```

`npm run build` виконує перевірку TypeScript і створює production-файли у `dist/`. Перед розгортанням production перевірте налаштування змінних середовища та сумісність REST/MQTT контрактів із сервером.

## Інтеграційні контракти

- REST-запити виконуються відносно `${VITE_API_URL}/api` і використовують Firebase ID token як Bearer-токен.
- Інтерфейс очікує API для профілю й користувачів (`/users/me`, `/users`, `/users/{uid}/role`, `/users/me/fcm-token`), зон (`/zones`), пристроїв (`/devices`) та сповіщень (`/alerts`). Для історії використовується `/devices/{id}/history` з параметрами `from`, `to` і `limit`.
- Live-дані надходять напряму через MQTT over WebSocket із топіків `devices/+/telemetry` та `devices/+/status`.
- MQTT telemetry очікує JSON із числовим `value`; timestamp передається в `ts`. Статус підтримує звичайний текст або JSON із полем `status`.
- Для зміни доступу в реальному середовищі роль користувача має бути підтверджена бекендом/Firebase custom claims. Роль, вибрана на демо-екрані, призначена лише для локального перегляду інтерфейсу.

Фактичні формати відповідей REST і payload-и MQTT слід звірити з контрактами серверної частини. Демо-режим не перевіряє доступність зовнішніх сервісів.
