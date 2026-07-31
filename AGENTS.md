# AGENTS.md

Инструкции для ИИ-агентов, работающих в репозитории ExamHub.

## Проект

ExamHub — SPA для подготовки к ЕГЭ/ОГЭ. Чистые HTML/CSS/JS без сборщиков на фронте + Node.js/Express/SQLite бэкенд (`server/`). Контент приходит через API (`/api/catalog/subjects`), `js/data.js` — только источник сидов для сервера.

## Старт

- Зависимости: `npm install` + `npx playwright install chromium`.
- Dev-сервер: `npm run dev` (Node + Express, ES-модули не работают по `file://`).
- URL: http://localhost:8000

## Команды (обязательные перед завершением задачи)

```
npm run check
```

Это полная проверка: ESLint → валидатор проекта → unit-тесты (Vitest) → E2E-тесты (Playwright). Все шаги должны быть зелёными.

Одиночные команды: `npm run lint`, `npm run format`, `npm run format:check`, `npm run build`, `npm run test`, `npm run test:e2e`.

## Память проекта

Подробности читать в `.agent/`:

- `.agent/architecture.md` — карта проекта: файлы, views, логика по модулям, ограничения.
- `.agent/testing.md` — как устроено и как добавлять тесты.
- `.agent/commands.md` — все команды.
- `.agent/bugs.md` — лог багов. Добавляй сюда каждый найденный/исправленный баг.

## Соглашения

- **Интерфейс и контент — на русском.** Имена переменных/классов/файлов — английские.
- **Не добавлять комментарии в код** без явного запроса.
- **Не хардкодить данные из `data.js` в тестах** — проверять по реальному DOM.
- **Локаторы в E2E:** сначала `id`, затем `data-view`, классы — в крайнем случае.
- **Новые экраны/функции** — добавлять E2E-тест в `tests/e2e/smoke.spec.js` и unit-тест при необходимости.
- **Vendored:** `js/lucide.min.js` не менять.
- **Форматирование:** `js/app.js` и `index.html` исключены из Prettier (см. `.prettierignore`) — не пытаться форматировать их вручную на всю длину строк.
- **Порядок навигации** в сайдбаре: subjects → notes → videos → tests → plan → analytics → cart → support (менять согласованно с `data-view` и `view-*` секциями).

## Версии

Node-проект с `"type": "module"`. Node >= 18 (используются `fetch`, ES-модули). ESLint 10, Prettier 3, Vitest 4, Playwright 1.62, @eslint/js 10.
