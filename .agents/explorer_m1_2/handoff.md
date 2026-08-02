# Handoff Report: Requirement R2 (Social Auth VK ID & Yandex ID)

## 1. Observation
Direct observations from project investigation:
- **`server/db.js` (lines 16-27)**: `users` table currently has `id`, `email`, `password_hash`, `name`, `role`, `avatar`, `is_premium`, `premium_until`, `created_at`, `updated_at`. Lacks `vk_id`, `yandex_id`, and `avatar_url` columns. `password_hash` has `NOT NULL` constraint without default.
- **`server/middleware/auth.js` (lines 4-15)**: `serializeUser(row)` returns `{ id, email, name, role, avatar, isPremium, premiumUntil }`. Does not serialize `vkId`, `yandexId`, or fallback to `avatar_url`.
- **`server/routes/auth.js` (lines 11-26)**: `createSession(res, userId)` generates a 32-byte hex token, saves it to `sessions` table, and sets `examhub_session` cookie (`httpOnly: true`, `sameSite: "lax"`, `path: "/"`). Currently handles `/register`, `/login`, `/logout`, `/me`, `/premium`. Does not handle social OAuth routes.
- **`js/modules/auth.js` (lines 51-57, 80-82)**: Buttons `#authVkBtn` and `#authYandexBtn` call `handleSocialLogin(provider)` which displays a mock toast "Скоро".
- **`index.html` (lines 1429-1434)**: HTML elements `#authVkBtn` and `#authYandexBtn` are present in `authModal`.

## 2. Logic Chain
1. **Observation**: Social auth requires associating external identity IDs (`vk_id`, `yandex_id`) and avatars with internal users.
   **Deduction**: We must extend `users` schema in `server/db.js` with `vk_id TEXT UNIQUE`, `yandex_id TEXT UNIQUE`, `avatar_url TEXT NOT NULL DEFAULT ''`, and set `password_hash` default to `''` for passwordless social accounts.

2. **Observation**: OAuth 2.0 flow involves redirecting to provider and receiving redirect back on a callback endpoint.
   **Deduction**: We need 4 endpoints in `server/routes/auth.js`:
   - `GET /api/auth/vk` -> redirect to `https://oauth.vk.com/authorize` with state cookie `oauth_state`
   - `GET /api/auth/vk/callback` -> validate state, exchange code, link/create user, call `createSession()`, redirect to `/?auth=success`
   - `GET /api/auth/yandex` -> redirect to `https://oauth.yandex.ru/authorize` with state cookie `oauth_state`
   - `GET /api/auth/yandex/callback` -> validate state, exchange code, link/create user, call `createSession()`, redirect to `/?auth=success`

3. **Observation**: OAuth state must prevent CSRF attacks.
   **Deduction**: Endpoint MUST set an HTTP-only short-lived `oauth_state` cookie during authorization redirect and reject callbacks if `req.query.state` does not match `req.cookies.oauth_state`.

4. **Observation**: Tests run in isolated environment without external web access (`NODE_ENV=test` or local execution without live credentials).
   **Deduction**: OAuth handlers in `server/routes/auth.js` must contain deterministic mock fallbacks when running in test mode (`config.isTest` or `mock=true` query param or mock code), enabling Vitest unit tests and Playwright E2E tests to pass without external network calls.

5. **Observation**: Clicking social login buttons in `js/modules/auth.js` currently shows a toast message instead of triggering OAuth flow.
   **Deduction**: Update `handleSocialLogin(provider)` to navigate `window.location.href = "/api/auth/vk"` or `"/api/auth/yandex"`, and handle `/?auth=success` query parameter to display welcome toast and clean up URL.

## 3. Caveats
- No real VK or Yandex Client Secrets are committed in the repository (stored in `.env` or defaults to mock keys).
- In production, real `VK_CLIENT_ID`, `VK_CLIENT_SECRET`, `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` must be set in environment variables.
- Users created purely via social auth will have empty `password_hash`, so they cannot log in via password unless password reset/setting feature is added.

## 4. Conclusion
Requirement R2 implementation strategy is fully formulated, compliant with project rules (Node.js Express + `node:sqlite`, HTTP-only session cookies with `SameSite=Lax`, Russian UI, no code comments). The strategy covers schema migration, state validation, account linking, session cookies, UI triggers, and deterministic test mocking.

## 5. Verification Method
1. **Source inspection**:
   - Inspect `server/db.js` for `vk_id`, `yandex_id`, `avatar_url` columns.
   - Inspect `server/routes/auth.js` for OAuth endpoints (`/api/auth/vk`, `/api/auth/vk/callback`, `/api/auth/yandex`, `/api/auth/yandex/callback`).
   - Inspect `server/middleware/auth.js` for `serializeUser` update.
   - Inspect `js/modules/auth.js` for `handleSocialLogin` logic.
2. **Quality Gate Execution**:
   - Run `npm run check` (all 4 steps: ESLint, project validator, Vitest unit tests, Playwright E2E tests must be green).
