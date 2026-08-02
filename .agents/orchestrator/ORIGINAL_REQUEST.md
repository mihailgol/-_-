# Original User Request

## Initial Request — 2026-08-01T12:01:44+03:00

You are the Project Orchestrator for ExamHub Multi-Agent System.

Your working directory is: `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\orchestrator`
The target project root is: `c:\Users\мишка\Desktop\сайтик_бахчасарай`

## Instructions:
1. Read `ORIGINAL_REQUEST.md`, `AGENTS.md`, and `DEVELOPMENT_RULES.md` in the project root.
2. Initialize `.agents/orchestrator/plan.md` and `.agents/orchestrator/progress.md`.
3. Create architecture plan and break down the project into clear milestones based on requirements R1-R5 and acceptance criteria:
   - R1: Design system & styling variants in `css/style.css` (Glassmorphism, dark/light themes, WCAG tokens).
   - R2: Social Auth (VK ID + Yandex ID) in `server/routes/*`, HTTP-only `examhub_session` cookies, SQLite sessions.
   - R3: OpenRouter / DeepSeek API integration (`/api/ai/generate-quiz`).
   - R4: Mock Exam mode ("Пробники"), timer 3.5-4h, primary to secondary score conversion, Free/Premium access rules.
   - R5: Teacher / Tutor module (custom test constructor, homework sharing links/QR codes, student progress dashboard).
4. Spawn and manage specialized subagents (Architect, Backend Dev, UI/UX Designer, Frontend Dev, QA Tester, User Personas) to execute each milestone.
5. Strictly adhere to project conventions:
   - No external bundlers on frontend (pure native ES modules).
   - Backend: Node.js Express + `node:sqlite`.
   - No code comments without explicit request.
   - Do NOT format `js/app.js` or `index.html` via Prettier.
   - Maintain `.agent/architecture.md` and `.agent/bugs.md`.
   - Ensure 100% green `npm run check` (ESLint, build validator, Vitest, Playwright E2E).
6. Continuously update `.agents/orchestrator/progress.md`.
7. When all requirements and acceptance criteria are completely satisfied and verified, report victory claim back to the Project Sentinel.

## Generation 2 Handoff Request — 2026-08-01T12:28:00+03:00

Resume work at `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\orchestrator`.
Parent conversation ID: `5144a890-ce40-4816-927c-b25d5dccb3e7`.
Remaining Milestones:
- Milestone 4 (R4: Mock Exam Mode "Пробники")
- Milestone 5 (R5: Teacher / Tutor Module)
- Final Quality Gate & Victory Claim

## Follow-up — 2026-08-02T19:34:06Z

Разработка и добавление в учебную платформу ExamHub полного комплекса обучающих материалов для подготовки к ЕГЭ и ОГЭ по всем ключевым предметам каталога с использованием спецификаций ФИПИ.

Working directory: c:\Users\мишка\Desktop\сайтик_бахчасарай
Integrity mode: development

### Requirements
- R1. Генерация и актуализация контента по предметам (ЕГЭ / ОГЭ)
  Сформировать структурированные обучающие материалы по предметам каталога ExamHub (Биология, Химия, Математика, Русский язык, Обществознание, Физика, Информатика, История):
  - Подробные теоретические конспекты с HTML-форматированием (таблицы, выделенные информационные блоки, термины).
  - Варианты тестовых заданий с вариантами ответов, указанием верного ответа и подробными объяснениями/разборами.
  - Метаданные учебных видеоуроков (названия, длительность, лекторы, описание).
- R2. Соблюдение формата данных ExamHub
  Все материалы должны строго соответствовать структуре объектов EXAM_DATA в js/data.js и схеме данных в server/ (поля id, title, icon, topics, theory, video, questions).
- R3. Прямая интеграция в проект
  Обновить сид-данные в js/data.js и базу данных сервера server/database.sqlite, чтобы новые темы, теория и тесты были доступны через API /api/catalog/subjects и корректно отображались в интерфейсе приложения.
- R4. Проверка целостности и качества
  Гарантировать отсутствие ошибок в синтаксисе, валидность HTML-разметки теорий и прохождение автоматических проверок проекта (npm run check).

