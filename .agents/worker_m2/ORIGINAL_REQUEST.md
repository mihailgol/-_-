## 2026-08-01T12:13:51Z

<USER_REQUEST>
You are Worker 3 for ExamHub Milestone 2 (R2: Social Auth VK ID & Yandex ID).

Your working directory is: `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\worker_m2`
The project root is: `c:\Users\мишка\Desktop\сайтик_бахчасарай`

## Task Instructions:
Implement Requirement R2 (Social Auth VK ID & Yandex ID):

1. **Database Migration (`server/db.js`)**:
   - Update `users` table schema definition to include `vk_id TEXT UNIQUE`, `yandex_id TEXT UNIQUE`, `avatar_url TEXT NOT NULL DEFAULT ''`.
   - Add try-catch migration statements for existing databases:
     `ALTER TABLE users ADD COLUMN vk_id TEXT UNIQUE;`
     `ALTER TABLE users ADD COLUMN yandex_id TEXT UNIQUE;`
     `ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';`
   - Ensure default `password_hash` allows empty string `''` for passwordless social accounts.

2. **User Serializer (`server/middleware/auth.js`)**:
   - Update `serializeUser(row)` to include `vkId: row.vk_id || null`, `yandexId: row.yandex_id || null`, and `avatarUrl: row.avatar_url || row.avatar || ''`.

3. **OAuth Server Routes (`server/routes/auth.js`)**:
   - Implement `GET /api/auth/vk` & `GET /api/auth/vk/callback`.
   - Implement `GET /api/auth/yandex` & `GET /api/auth/yandex/callback`.
   - Generate random cryptographic `state` and store in short-lived HTTP-only `oauth_state` cookie for CSRF protection.
   - Account linking logic: search by `vk_id`/`yandex_id` -> link to current user if session exists -> link by email -> create new user.
   - Issue `examhub_session` cookie via `createSession(res, user.id)`.
   - Deterministic test mocking: if `config.isTest` or `mock=true` query param or test code is passed, simulate OAuth user payload (`vk_12345` / `yandex_67890`) and return session redirect to `/?auth=success` without hitting external network APIs.

4. **Frontend Integration (`js/modules/auth.js`)**:
   - Update `handleSocialLogin(provider)`: navigate `window.location.href = "/api/auth/vk"` or `"/api/auth/yandex"`.
   - Handle `/?auth=success` query parameter on startup: show welcome toast and clean up URL.

5. **Testing & Quality Gate**:
   - Add unit tests in `tests/unit/social_auth.test.mjs` verifying OAuth endpoints, CSRF state validation, and account linking.
   - Strictly NO CODE COMMENTS without explicit request.
   - Execute `npm run check` and ensure 100% green passing status across ESLint, validate-project, Vitest, and Playwright E2E.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff report to `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\worker_m2\handoff.md`.
When done, use `send_message` to report your summary back to the parent orchestrator (conversation ID: `2b276051-2697-46e6-8823-70b590d0e555`).
</USER_REQUEST>
