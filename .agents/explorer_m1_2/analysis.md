# Analysis & Technical Proposal for Requirement R2: Social Auth (VK ID & Yandex ID)

## 1. Objective & Scope
Requirement R2 adds OAuth 2.0 social authentication via VK ID and Yandex ID to the ExamHub web platform. The scope includes:
- Backend OAuth endpoints: `GET /api/auth/vk`, `GET /api/auth/vk/callback`, `GET /api/auth/yandex`, `GET /api/auth/yandex/callback`.
- Cryptographic OAuth state parameter validation for CSRF protection.
- Database schema migration for `users` table: adding `vk_id`, `yandex_id`, and `avatar_url` columns.
- Account creation and linking strategy (linking social profile to logged-in session or matching email).
- Session management: issuing standard HTTP-only `examhub_session` cookies backed by SQLite `sessions` table upon successful OAuth callback.
- UI updates: wiring social login buttons (`#authVkBtn`, `#authYandexBtn`) in `js/modules/auth.js` and `index.html`.
- Testability strategy: built-in deterministic mock OAuth handling for unit and Playwright E2E tests.

---

## 2. Current Architecture & Code Base Observations

### A. Database Schema (`server/db.js`)
Existing `users` schema definition (lines 16-27):
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Ученик',
  avatar TEXT NOT NULL DEFAULT '',
  is_premium INTEGER NOT NULL DEFAULT 0,
  premium_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
Observations:
- Column `password_hash` is currently `NOT NULL`. OAuth users created without local passwords require a default value (e.g. `''` or `'OAUTH_USER'`) or changing table definition to allow `DEFAULT ''`.
- Missing columns: `vk_id`, `yandex_id`, `avatar_url`.

### B. Middleware & User Serialization (`server/middleware/auth.js`)
Existing `serializeUser` (lines 4-15):
```javascript
export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    isPremium: !!row.is_premium,
    premiumUntil: row.premium_until || null,
  };
}
```
Observations:
- Does not expose `avatarUrl`, `vkId`, or `yandexId` fields.
- `row.avatar` should fallback to `row.avatar_url` if set.

### C. Backend Auth Routes (`server/routes/auth.js`)
Existing session creation (lines 11-26):
```javascript
function createSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 864e5).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    maxAge: config.sessionTtlDays * 864e5,
    path: "/",
  });
}
```
Observations:
- `createSession` helper is already available and sets HTTP-only cookie with `sameSite: "lax"`, `path: "/"`. This logic is reusable for social auth callbacks.

### D. Frontend Auth Logic (`js/modules/auth.js` & `index.html`)
Existing `handleSocialLogin` (lines 80-82):
```javascript
export function handleSocialLogin(provider) {
  showToast("🔜 Скоро", `Вход через ${provider} будет доступен позже. Пока используйте вход по email.`);
}
```
Existing modal buttons in `index.html` (lines 1429-1434):
```html
<button class="auth-option-btn vk-btn" id="authVkBtn">
  <span>Войти через ВКонтакте</span>
</button>
<button class="auth-option-btn yandex-btn" id="authYandexBtn">
  <span>Войти через Яндекс Почту</span>
</button>
```
Observations:
- Front-end social login buttons currently trigger placeholder toast notifications.
- Modal structure and styling are already in place and ready for integration.

---

## 3. Detailed Technical Proposal

### 3.1 Database Schema Extensions (`server/db.js`)
1. Extend `CREATE TABLE IF NOT EXISTS users` in `initSchema()`:
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Ученик',
  avatar TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  vk_id TEXT UNIQUE,
  yandex_id TEXT UNIQUE,
  is_premium INTEGER NOT NULL DEFAULT 0,
  premium_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
2. Safe migrations for existing SQLite databases:
```javascript
try { db.exec("ALTER TABLE users ADD COLUMN vk_id TEXT UNIQUE;"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN yandex_id TEXT UNIQUE;"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';"); } catch {}
```

### 3.2 User Serializer Update (`server/middleware/auth.js`)
Update `serializeUser(row)`:
```javascript
export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatar: row.avatar || row.avatar_url || "",
    avatarUrl: row.avatar_url || row.avatar || "",
    vkId: row.vk_id || null,
    yandexId: row.yandex_id || null,
    isPremium: !!row.is_premium,
    premiumUntil: row.premium_until || null,
  };
}
```

### 3.3 Config Extensions (`server/config.js`)
Add OAuth settings to `server/config.js`:
```javascript
export const config = {
  // ... existing config properties ...
  vkClientId: process.env.VK_CLIENT_ID || "mock_vk_client_id",
  vkClientSecret: process.env.VK_CLIENT_SECRET || "mock_vk_client_secret",
  vkRedirectUri: process.env.VK_REDIRECT_URI || "http://localhost:8000/api/auth/vk/callback",
  yandexClientId: process.env.YANDEX_CLIENT_ID || "mock_yandex_client_id",
  yandexClientSecret: process.env.YANDEX_CLIENT_SECRET || "mock_yandex_client_secret",
  yandexRedirectUri: process.env.YANDEX_REDIRECT_URI || "http://localhost:8000/api/auth/yandex/callback",
};
```

### 3.4 OAuth Endpoints Implementation Specification (`server/routes/auth.js`)

#### A. Security & State Validation
- Store `oauth_state` in a 10-minute HTTP-only cookie during initial auth redirect:
  `res.cookie("oauth_state", `${provider}:${state}`, { httpOnly: true, sameSite: "lax", maxAge: 600000, path: "/" })`.
- Validate `req.query.state` against `req.cookies.oauth_state` on callback. Clear cookie immediately after check. If invalid, return HTTP 400 `{ error: "Невалидный параметр state" }`.

#### B. VK ID OAuth Authorization & Callback
1. `GET /api/auth/vk`:
   - Generate `state = randomBytes(16).toString("hex")`.
   - Set cookie `oauth_state`.
   - If `config.isTest` or `req.query.mock === "true"`, redirect to `/api/auth/vk/callback?code=mock_vk_code&state=${state}`.
   - Else redirect to:
     `https://oauth.vk.com/authorize?client_id=${config.vkClientId}&redirect_uri=${encodeURIComponent(config.vkRedirectUri)}&response_type=code&scope=email&state=${state}&v=5.131`

2. `GET /api/auth/vk/callback`:
   - Validate state parameter.
   - Exchange code (if mock mode or test env, use mock VK user profile):
     - Mock VK profile: `{ vk_id: "vk_1001", email: "vk_user@example.com", name: "Пользователь VK", avatar: "https://vk.com/avatar.jpg" }`.
     - Real VK profile: `POST https://oauth.vk.com/access_token` -> get `access_token`, `user_id`, `email`. Fetch user via `GET https://api.vk.com/method/users.get`.
   - Link / Create Account in `users` table:
     1. Search user by `vk_id`. If exists, update avatar/name.
     2. Else if current session logged in (`req.user`), update `vk_id` and `avatar_url` for `req.user.id`.
     3. Else if user with matching `email` exists, link `vk_id` and `avatar_url`.
     4. Else, create new user (`email`, `password_hash=''`, `name`, `avatar`, `avatar_url`, `vk_id`).
   - Call `createSession(res, userId)`.
   - Redirect to `/?auth=success`.

#### C. Yandex ID OAuth Authorization & Callback
1. `GET /api/auth/yandex`:
   - Generate `state = randomBytes(16).toString("hex")`.
   - Set cookie `oauth_state`.
   - If `config.isTest` or `req.query.mock === "true"`, redirect to `/api/auth/yandex/callback?code=mock_yandex_code&state=${state}`.
   - Else redirect to:
     `https://oauth.yandex.ru/authorize?client_id=${config.yandexClientId}&redirect_uri=${encodeURIComponent(config.yandexRedirectUri)}&response_type=code&state=${state}`

2. `GET /api/auth/yandex/callback`:
   - Validate state parameter.
   - Exchange code (if mock mode or test env, use mock Yandex user profile):
     - Mock Yandex profile: `{ yandex_id: "yandex_2002", email: "yandex_user@yandex.ru", name: "Пользователь Яндекс", avatar: "https://yandex.ru/avatar.jpg" }`.
     - Real Yandex profile: `POST https://oauth.yandex.ru/token` -> get `access_token`. Fetch profile via `GET https://login.yandex.ru/info?format=json`.
   - Link / Create Account in `users` table:
     1. Search user by `yandex_id`. If exists, update avatar/name.
     2. Else if current session logged in (`req.user`), update `yandex_id` and `avatar_url` for `req.user.id`.
     3. Else if user with matching `email` exists, link `yandex_id` and `avatar_url`.
     4. Else, create new user (`email`, `password_hash=''`, `name`, `avatar`, `avatar_url`, `yandex_id`).
   - Call `createSession(res, userId)`.
   - Redirect to `/?auth=success`.

### 3.5 Frontend Integration Specification (`js/modules/auth.js`)
1. Update `handleSocialLogin(provider)`:
   ```javascript
   export function handleSocialLogin(provider) {
     if (provider === "VK") {
       window.location.href = "/api/auth/vk";
     } else if (provider === "Yandex") {
       window.location.href = "/api/auth/yandex";
     }
   }
   ```
2. Handle successful callback redirect in `initAuthEvents()` / `js/app.js`:
   ```javascript
   if (window.location.search.includes("auth=success")) {
     showToast("🔑 Вход выполнен", "Успешный вход через социальную сеть!");
     window.history.replaceState(null, "", window.location.pathname);
   }
   ```

---

## 4. Verification & Quality Assurance Strategy
1. **Unit Tests (`tests/unit/auth_social.test.mjs`)**:
   - Verify DB table creation and `vk_id` / `yandex_id` / `avatar_url` schema columns.
   - Verify state generation and state mismatch rejection (HTTP 400).
   - Verify VK ID OAuth mock callback creates session and links account.
   - Verify Yandex ID OAuth mock callback creates session and links account.
   - Verify existing user email linking when social auth email matches.

2. **E2E Tests (`tests/e2e/smoke.spec.js`)**:
   - Test clicking `#authVkBtn` redirects and logs user in successfully.
   - Test clicking `#authYandexBtn` redirects and logs user in successfully.

3. **Full Quality Gate Execution**:
   - `npm run check` (ESLint -> Project Validator -> Vitest -> Playwright E2E).
