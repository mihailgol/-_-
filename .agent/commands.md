# Команды ExamHub

Все команды из корня проекта.

## Установка зависимостей
```
npm install
npx playwright install chromium
```

## Разработка
Локальный сервер (обязателен, т.к. `index.html` — ES-модуль, `fetch` не работает по `file://`):
```
npm run dev          # или: node server/index.js
```
→ открыть http://localhost:8000

Конфигурация через `.env` (см. `.env.example`): `PORT`, `HOST`, `DB_PATH`, `SESSION_TTL_DAYS`, `NODE_ENV`.

## Качество кода
```
npm run lint          # ESLint (eslint.config.mjs)
npm run format        # Prettier — форматировать файлы
npm run format:check  # Prettier --check (проверка форматирования)
npm run build         # node scripts/validate-project.mjs — валидатор целостности проекта
```

## Тесты и UX-аудит
```
npm run test          # Vitest: unit-тесты (tests/unit)
npm run test:e2e      # Playwright: E2E (tests/e2e)
npm run audit:ux      # Автономный UX-бот: сквозной обход всех 10 разделов с видео, трейсами и Zero-Error Guard
npm run audit:report  # Открыть интерактивный визуальный HTML-отчет аудита в браузере
npm run check         # Всё сразу: lint → build → unit → e2e
```

## Прочее
- `npm run audit:ux` — интеллектуальный бот, эмулирующий реального пользователя (клики, ввод, решение Части 1 и 2, прикрепление фото, проверка репетитором, админка, проверка контраста и адаптивности) с жестким отловом любых консольных и сетевых ошибок.
- `npm run build` — валидатор проекта (scripts/validate-project.mjs): проверяет целостность структуры, синтаксис JS и контента.
- E2E (`playwright.config.js`) поднимает сервер `node server/index.js` с `NODE_ENV=test` (чистая БД на каждый запуск), `workers: 3` (ограничено из-за памяти машины).
