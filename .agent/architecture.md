# Карта проекта: ExamHub (сайт подготовки к ЕГЭ/ОГЭ)

## Статус и стек
- **Статус:** продакшн-прототип с реальным бэкендом: авторизация, контент-API, прогресс и Premium привязаны к серверу (SQLite).
- **Стек фронтенда:** чистые HTML/CSS/JS (без фреймворков и сборщиков), иконки — `js/lucide.min.js`, данные — через API сервера. Тесты: Vitest (unit), Playwright (E2E).
- **Стек бэкенда:** Node.js (>=18, ES-модули) + Express + `node:sqlite` (`DatabaseSync`, WAL). Пароли — bcryptjs, сессии — куки в таблице `sessions`. Платежи — mock-заглушка.
- **Язык интерфейса и данных:** русский. Код, имена переменных, CSS-классы — английские.

## Структура файлов
| Файл | Роль |
|---|---|
| `index.html` | Единственная страница (SPA). Все экраны-`<section id="view-*">`, модалки, сайдбар, мобильная навигация. `js/data.js` в HTML **не подключается** — данные приходят с API. |
| `css/style.css` | Все стили. Переменные в `:root`. Брейкпоинт мобильной навигации: 600px. |
| `js/app.js` | Точка входа фронтенда (ES-модуль): `loadAppData()` (API), инициализация всех модулей на `DOMContentLoaded`, восстановление вью из hash, fallback картинок, `lucide.createIcons()`. |
| `js/modules/profile.js` | Управление личным кабинетом: переключение вкладок (прогресс, история, курсы, настройки), обновление имени и аватара, видимость кнопки админки. |
| `js/modules/*.js` | Нативные ES-модули фронтенда (см. «Логика по модулям» ниже). |
| `js/data.js` | Источник сидов контента (загружается только сервером через `vm`). |
| `js/lucide.min.js` | Библиотека иконок (vendored, не трогать). |
| `server/index.js` | Точка входа сервера: Express, роуты API, статика из корня, обработчик ошибок. |
| `server/config.js` | Конфиг из env: `PORT`, `HOST`, `DB_PATH`, `SESSION_TTL_DAYS`, `NODE_ENV`. |
| `server/db.js` | Схема SQLite (`initSchema`), `initDb`, `resetDb` (для тестов), обёртка `transaction(fn)` (в `node:sqlite` нет `db.transaction()`). |
| `server/seed.js` | Сид БД из `js/data.js` (через `vm`), `INSERT OR IGNORE`, в транзакции. |
| `server/middleware/auth.js` | `optionalAuth`, `requireAuth`, `getUserByToken`, сериализация пользователя. |
| `server/routes/auth.js` | `register` / `login` / `logout` / `me`. bcrypt, сессии, 409 на дубликат email. |
| `server/routes/catalog.js` | Subjects + topics + video + theory + questions с премиум-блокировкой на сервере. |
| `server/routes/progress.js` | `attempt` (сохранение попытки), `stats`, `attempts`. |
| `server/routes/premium.js` | `plans`, `subscribe` (mock-оплата, продление `premium_until`). |
| `scripts/validate-project.mjs` | Скрипт-валидатор проекта (целостность, синтаксис JS, EXAM_DATA). |
| `tests/unit/*.test.mjs` | Модульные тесты (esm, node env). |
| `tests/e2e/smoke.spec.js` | E2E smoke-тесты Playwright. |
| `playwright.config.js`, `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `package.json` | Конфигурация инструментов. |

## API (основные эндпоинты)
- `GET /api/health` — проверка живости (используется Playwright webServer).
- `POST /api/auth/register` `{email, password}` → 201 `{user}`; 409 — email занят; 400 — невалидные данные.
- `POST /api/auth/login` `{email, password}` → `{user}`; ставит httpOnly-куку `examhub_session`.
- `POST /api/auth/logout` → удаляет сессию и куку.
- `GET /api/auth/me` → `{user}` или `{user: null}` (optionalAuth).
- `GET /api/catalog/subjects` → `{subjects, otherSubjects}` (теория/вопросы премиум-тем — `null`, если нет подписки).
- `POST /api/progress/attempt` `{topicId, score, total, title}` → `{percent, testsSolved, avgPercent}` (только для авторизованных).
- `GET /api/progress/stats`, `GET /api/progress/attempts`.
- `GET /api/premium/plans`, `POST /api/premium/subscribe` `{planId}` → продлевает `premium_until`.

## Виды (views), порядок навигации
`switchView(name)` показывает нужную секцию. Список `view-*` секций в `index.html`:
`subjects` (главная) → `subject-detail` → `notes` → `videos` → `tests` → `cart` → `support` → `plan` → `analytics` → `admin` → `note-reader` → `quiz-player` → `quiz-results`.

Порядок навигации в сайдбаре (`data-view`): subjects, notes, videos, tests, plan, analytics, cart, support.

## Навигация и история (back/forward)
- Обычные вью (в `HASH_VIEWS`): `switchView` пишет запись истории `history.pushState({view}, "", "#<view>")`; при `{replace: true}` — `replaceState(null, ...)`.
- Sub-view (subject-detail, note-reader, quiz-player, quiz-results) не входят в `HASH_VIEWS` — они пушатся через `pushSubView(state, hash)` с **уникальным hash-URL**: `#subject-detail:<id>`, `#note-reader:<subjectId>:<noteId>`, `#quiz-player`, `#quiz-results`.
  - Уникальный URL обязателен: Chromium схлопывает соседние same-document записи истории с одинаковым URL (см. `.agent/bugs.md` #7).
- `popstate` → `restoreView(state)`: по `e.state` восстанавливает sub-view (`loadSubjectDetail`/`loadNoteReader` с `{replace:true}`) или обычную вью; fallback — восстановление по `location.hash`.
- `hashchange` обрабатывается только когда `currentView` в `HASH_VIEWS` (guard), чтобы не перебивать уже восстановленный sub-view.
- Семантика истории стандартная: новый `history.pushState()` обрезает forward-записи (E2E-тест навигации учитывает это).

## Логика по модулям (js/modules/*)
- **state.js** — `appState`, `GUEST_USER`, `HASH_VIEWS`, `loadStateFromStorage()` / `saveStateToStorage()` (localStorage `examhub_state`).
- **utils.js** — `api()` (fetch + разбор ошибок), `formatNumber()`, `parseDuration()`.
- **ui.js** — `showToast`, `openModal`, `closeModal`, `initGlobalUIEvents()` (хуки `window.closeModal/openModal/showToast`).
- **navigation.js** — `pushSubView()`, `switchView(view, {replace})`, `restoreView(state)`, `initRouter()` (сайдбар, mobile-nav, hero, feature-card, поддержка, уведомления, глобальный поиск, `popstate`, `hashchange`).
- **catalog.js** — `renderSubjects`, `renderAllSubjectsModal`, `loadSubjectDetail(subjectId, {replace})`, `renderSubjectNotes/Videos/Quizzes`, `loadNoteReader(subjectId, noteId, {replace})`, `renderGeneralNotes`, `renderGeneralVideos`. Табы предмета — через делегирование (один listener на `.subject-tabs`).
- **quiz.js** — `startQuiz`, `renderQuizQuestion`, `checkQuizAnswer`, `goToNextQuestion`, `finishQuiz`, `returnFromQuiz`.
- **ai.js** — `initAIEvents`, `handleAIGeneration`, `buildAIQuestions`, `simulateStepCompletion`, `resetChecklistElements` (ИИ-генерация — симуляция).
- **video.js** — `initVideoPlayerEvents`, `openVideoPlayer`, `toggleMockVideoPlay`, `updateVideoProgressUI`.
- **auth.js** — `renderAuthHeader()` (guard `lastAuthSignature`), `initAuthEvents`, `toggleAuthMode`, `handleSocialLogin`, `handleManualLogin`, `handleLogout`.
- **premium.js** — `initPremiumEvents` (mock-подписка, снятие блюра, ре-рендер).
- **plan.js** — `initPlanEvents`, `calculatePlanProgress`, `updatePlanUI`.
- **analytics.js** — `updateAnalyticsUI`.
- **admin.js** — `initAdminEvents` (создание темы, `customTopics` в localStorage).
- **render.js** — `updateUIFromState` (бейджи корзины, статистика, Premium-состояние).

### Данные и авторизация
- На `DOMContentLoaded` `js/app.js` вызывает `loadAppData()` → `GET /api/catalog/subjects`, `GET /api/auth/me`, при авторизации — `/api/progress/stats`.
- `renderAuthHeader()` перерисовывает блок в сайдбаре (бейдж с именем + «Выйти» или кнопка «Войти»). `handleManualLogin` ходит на `/api/auth/register` или `/api/auth/login`, `handleLogout` — на `/api/auth/logout`. Соцсети — заглушка «Скоро».
- Premium: проверка `appState.user.isPremium`; подписка `POST /api/premium/subscribe`; блокировка теории на сервере.
- Поиск: `#globalSearch` → результаты в `#searchDropdown`; переход на тему/лекцию.
- Корзина: `#view-cart`, добавление товаров/услуг, расчёт суммы.
- Поддержка: форма → тост `#toastMessage`.

## БД (SQLite)
Таблицы: `users`, `sessions`, `subjects`, `topics`, `videos`, `questions`, `attempts`, `payments`.
- Файл БД: `data/examhub.db` (по умолчанию), при `NODE_ENV=test` — `data/examhub.test.db`.
- В тестовом режиме (`NODE_ENV=test`) при старте сервера БД сбрасывается (`resetDb`) и заново сидится — E2E всегда начинают с чистой базы.
- Платежи mock: провайдер `mock`, статус `paid`.

## Известные ограничения
- Платежи — заглушка (без реального провайдера).
- Фронтенд — нативные ES-модули без сборщика/bundler; `js/app.js` и `index.html` исключены из Prettier (`.prettierignore`).
- Sub-view не восстанавливаются при перезагрузке страницы (deep-link на `#subject-detail:<id>` открывает subjects) — данные и состояние не сохраняются в URL.
- Содержимое конспектов/вопросов — учебный контент, требует проверки и наполнения.
