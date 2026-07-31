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
| `js/app.js` | Логика приложения: рендер, навигация, auth-вызовы API, тесты, аналитика. Монолит ~1900 строк. |
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

## Логика по модулям (js/app.js)
- **Состояние:** `appState` + сохранение в `localStorage("examhub_state")`. `GUEST_USER` — гость по умолчанию.
- **Данные:** на `DOMContentLoaded` вызывается `loadAppData()` → `GET /api/catalog/subjects`, `GET /api/auth/me`, при авторизации — `/api/progress/stats`. Обёртка `api()` для fetch с `credentials: "same-origin"` и разбором ошибок.
- **Авторизация:** `renderAuthHeader()` перерисовывает блок в сайдбаре (бейдж с именем + «Выйти» или кнопка «Войти»). `handleManualLogin` ходит на `/api/auth/register` или `/api/auth/login`, `handleLogout` — на `/api/auth/logout`. Соцсети — заглушка «Скоро».
- **Premium:** проверка `appState.user.isPremium`; подписка `POST /api/premium/subscribe`; блокировка теории на сервере.
- **Поиск:** глобальный поиск `#globalSearch`, результаты в `#searchDropdown`; переход на тему.
- **Конспекты:** `renderSubjectNotes()` — карточки `note-item-card`; клик → `view-note-reader`.
- **Видео:** встроенный плеер (уроки в `data.js`, на сервере — из сида).
- **Тесты:** из `questions` тем; плеер `#view-quiz-player`, объяснения `#quizExplanationBox`, итог `#view-quiz-results`; результат сохраняется через `/api/progress/attempt` (если пользователь авторизован). «AI-генерация» — заглушка.
- **Корзина:** `#view-cart`, добавление товаров/услуг, расчёт суммы.
- **Поддержка:** форма → тост `#toastMessage`.
- **План обучения:** `#view-plan` (персональный план).
- **Аналитика:** `#view-analytics` (прогресс, диаграммы).
- **Админка:** `#view-admin` — локальная панель редактирования контента.

## БД (SQLite)
Таблицы: `users`, `sessions`, `subjects`, `topics`, `videos`, `questions`, `attempts`, `payments`.
- Файл БД: `data/examhub.db` (по умолчанию), при `NODE_ENV=test` — `data/examhub.test.db`.
- В тестовом режиме (`NODE_ENV=test`) при старте сервера БД сбрасывается (`resetDb`) и заново сидится — E2E всегда начинают с чистой базы.
- Платежи mock: провайдер `mock`, статус `paid`.

## Известные ограничения
- Платежи — заглушка (без реального провайдера).
- `js/app.js` — монолит: логика рендера, состояния и обработчиков в одном файле.
- Содержимое конспектов/вопросов — учебный контент, требует проверки и наполнения.
