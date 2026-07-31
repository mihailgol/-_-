# Тестирование ExamHub

## Два уровня тестов
1. **Unit (Vitest)** — `tests/unit/*.test.mjs`, среда node, ES модули, глобальный `vitest`.
2. **E2E (Playwright)** — `tests/e2e/smoke.spec.js`, Chromium, `baseURL: http://localhost:8000`.

## Команды
- `npm run test` — unit-тесты (Vitest, run mode).
- `npm run test:e2e` — E2E-тесты (Playwright; через `webServer` сам поднимает `node server/index.js`, если порт свободен, иначе переиспользует запущенный).
- `npm run check` — полная проверка: lint → build → unit → E2E.

## Запуск одного теста
```
npx playwright test tests/e2e/smoke.spec.js -g "поиск"
npx vitest run tests/unit/app.test.mjs
```

## Важные правила
- **E2E требует Node-сервер** (`node server/index.js`), Playwright запускает его автоматически с `NODE_ENV=test` → БД `data/examhub.test.db` сбрасывается и сидится заново при каждом старте (см. `resetDb` в `server/db.js`). `reuseExistingServer: true` — если сервер уже запущен вручную, он переиспользуется.
- **`workers: 3`** в `playwright.config.js` — на машине 8 ГБ RAM, больше воркеров приводят к зависанию браузеров.
- **Не хардкодить данные из `data.js` в тестах** — используем проверки по реальному содержимому страницы (например, количество вопросов читаем из `#quizProgressText`).
- **Локаторы**: приоритет `id`/`data-view`, так как они стабильны в SPA.
- После добавления нового экрана/функции — добавить E2E-тест в `smoke.spec.js` и unit-тест.

## Установка Playwright-браузеров
```
npx playwright install chromium
```
