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

## Firebase та локальні емулятори

Firebase CLI входить у dev-залежності проєкту та встановлюється командою `npm ci`. Конфігурація Firebase зберігається у `firebase.json`, локальний проєкт-аліас — у `.firebaserc`, а правила й складені індекси — у `firestore.rules` та `firestore.indexes.json`.

Для Firebase Emulator Suite потрібен JDK 21 або новіший.

Запустіть Auth і Firestore Emulator Suite:

```powershell
Copy-Item .env.emulator.example .env
npm run firebase:emulators
```

Емулятори доступні на `127.0.0.1:9099` (Auth), `127.0.0.1:8085` (Firestore) та `http://127.0.0.1:4000` (панель емуляторів). Порт Firestore змінено на `8085`, щоб не конфліктувати з типовим портом REST backend `8080`. В іншому терміналі запустіть фронтенд через `npm run dev`. Файл `.env.emulator.example` налаштовує Firebase Auth SDK на локальний Auth Emulator.

Щоб графічно переглядати локальну базу, відкрийте `http://127.0.0.1:4000` і перейдіть до розділу **Firestore**. Це Emulator UI, а не сайт Firebase Console: локальні дані зберігаються на цьому комп’ютері й не з’являються у хмарному проєкті.

Правила доступу можна перевірити автоматично на Firestore Emulator:

```powershell
npm run firebase:emulators:exec -- "npm run test:firestore"
```

Тести перевіряють заборону читання та запису для анонімного й автентифікованого клієнтів, а також привілейований доступ бекенду в режимі обходу правил.

Правило Firestore блокує всі клієнтські читання й записи відповідно до ADR-4. Серверна частина має використовувати Firebase Admin SDK, який обходить Firestore Security Rules.

## Мінімальний backend і початкові дані Firestore

Тека `backend/` містить Spring Boot утиліту, а не REST API. Вона під’єднує Firebase Admin SDK до Firestore, описує сутності та за явним прапорцем додає початкові демонстраційні дані. Потрібні JDK 21 і Maven 3.9 або новіший.

1. В одному терміналі запустіть емулятори (`npm run firebase:emulators`).
2. В іншому терміналі з кореня проєкту виконайте:

```powershell
$env:FIREBASE_PROJECT_ID = "smartmonitor-2006"
$env:FIREBASE_EMULATOR_HOST = "127.0.0.1:8085"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
$env:SMARTMONITOR_SEED_ENABLED = "true"
# Необов'язково: створити seed-admin і seed-operator в Auth Emulator.
$env:SMARTMONITOR_SEED_AUTH_PASSWORD = "ChangeThisLocalPassword123!"
mvn -f backend/pom.xml spring-boot:run
```

Пароль потрібен лише для створення двох користувачів у **Auth Emulator**; якщо змінну не задати, записи профілів у Firestore створяться, але Auth-користувачі не додаються. Не використовуйте демо-пароль у production.

Seeder додає 3 зони, тестові профілі користувачів, 8 пристроїв із різними типами сенсорів, 168 погодинних показань на пристрій за останні 7 днів, 4 активні/підтверджені сповіщення та приклади журналу аудиту. Для кожного показання `expireAt` встановлюється на 180 днів після його часу `ts`. Запуск ідемпотентний: документи з такими ID, що вже існують, пропускаються без перезапису. Емулятори імпортують/експортують стан у `emulator-data/`, щоб зберігати його між запусками на цій машині.

Для хмарного Firestore **не** задавайте `FIREBASE_EMULATOR_HOST`; вкажіть `FIREBASE_PROJECT_ID`, шлях `GOOGLE_APPLICATION_CREDENTIALS` до service-account JSON і `SMARTMONITOR_SEED_ENABLED=true`. Seeder не запускається автоматично без прапорця. Перед запуском у хмарі перевірте ID проєкту: операції Admin SDK обходять Security Rules. Не додавайте service-account ключ у Git.

Щоб пізніше показати цей самий демонстраційний набір у Firebase Console, можна запустити seeder для вибраного хмарного проєкту: він створить там ті самі тестові документи, але локальна база автоматично не синхронізується й не копіюється. Перенесення інших, уже наявних локальних даних потребуватиме окремого експорту/імпорту.

Цей модуль лише заповнює дані й завершує роботу. Він не надає REST-ендпоїнтів, тому не замінює окремий backend API, потрібний фронтенду.

### TTL для історії показань

Політика TTL для collection group `readings` налаштовується на рівні Google Cloud проєкту, а не Firebase Emulator Suite чи `firestore.indexes.json`. Щоб застосувати 180-денне зберігання до cloud Firestore, встановіть Google Cloud CLI, автентифікуйте його та виконайте:

```powershell
gcloud firestore fields ttls update expireAt --collection-group=readings --enable-ttl --project=<firebase-project-id>
```

Backend має записувати у кожен документ показання поле `expireAt` типу Firestore Timestamp, що дорівнює часу показання плюс 180 днів. Видалення TTL асинхронне: прострочені документи можуть залишатися доступними до 24 годин. Команда вимагає прав Google Cloud для зміни TTL-політики й не запускається локальним Firebase Emulator.

### Розгортання правил та індексів у Firebase

Поточний `.firebaserc` навмисно використовує demo project `smartmonitor-2006`, щоб уникнути випадкового розгортання в production. Після прив’язки реального Firebase-проєкту можна розгорнути лише правила та індекси:

```powershell
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

Перевірте вибраний проєкт перед `deploy`. Застосування правил та індексів вимагає автентифікації Firebase CLI й доступу до відповідного проєкту.

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
