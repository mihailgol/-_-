# Review & Critical Findings Report: Milestone 2 (R2: Social Auth VK ID & Yandex ID)

## Executive Summary

- **Verdict**: **REQUEST_CHANGES**
- **Primary Reason**: Critical Integrity Violation (Facade OAuth implementation in production routes), Security Vulnerability (CSRF State Replay), Database Migration Incompatibility, and Quality Gate Failure (`npm run check` failed with 3 test failures).

---

## Review Summary & Verdict

| Metric / Dimension | Status | Notes |
|---|---|---|
| **Quality Gate (`npm run check`)** | ❌ **FAIL** | 3 unit tests failed in `social_auth.test.mjs` and `social_auth_stress.test.mjs` |
| **Real OAuth Logic** | ❌ **FACADE** | Production OAuth callback routes lack token exchange and hardcode fallback IDs |
| **CSRF & Security** | ❌ **FAIL** | Stateless state validation allows CSRF state replay attacks |
| **Database Migration Safety** | ⚠️ **WARN** | `ALTER TABLE ... ADD COLUMN ... UNIQUE` throws in SQLite and is silently swallowed |
| **Account Linking & Edge Cases** | ❌ **FAIL** | `info.lastInsertRowid` BigInt handling causes `FOREIGN KEY constraint failed` |
| **Frontend Integration (`js/modules/auth.js`)** | ✅ **PASS** | Clean redirect and URL parameter cleanup (`/?auth=success`) |

---

## 1. Observations

### Observation 1.1: Quality Gate Execution (`npm run check`)
Executing `npm run check` resulted in exit code 1 with 3 failing unit test cases:

```
FAIL tests/unit/social_auth.test.mjs > Social Auth VK & Yandex > links social account to existing logged in session
TypeError: Cannot read properties of null (reading 'email')
 ❯ tests/unit/social_auth.test.mjs:143:24

FAIL tests/unit/social_auth_stress.test.mjs > Empirical Social Auth Stress & Cookie Verification > 1. CSRF State Validation & Replay Prevention > prevents CSRF state replay attacks (state cleared after single use)
AssertionError: expected 302 to be 400

FAIL tests/unit/social_auth_stress.test.mjs > Empirical Social Auth Stress & Cookie Verification > 2. Account Linking Scenarios > Scenario E: Social account fallback for missing email and name
AssertionError: expected 'vk_12345@examhub.ru' to be 'vk_no_email_505@examhub.ru'
```

### Observation 1.2: Facade / Dummy Implementation in `server/routes/auth.js`
In `server/routes/auth.js` (lines 170–195 and 215–240):

```javascript
router.get("/vk/callback", optionalAuth, (req, res) => {
  if (!validateOAuthState(req, res)) {
    return res.status(400).json({ error: "Неверное состояние CSRF" });
  }

  const isMock = config.isTest || req.query.mock === "true" || req.query.code === "mock_code";
  let socialId = "vk_12345";
  let email = "vk_12345@examhub.ru";
  let name = "VK Пользователь";
  let avatarUrl = "https://vk.com/avatar.jpg";

  if (isMock) {
    if (req.query.mock_id) socialId = String(req.query.mock_id);
    if (req.query.mock_email) email = String(req.query.mock_email);
    if (req.query.mock_name) name = String(req.query.mock_name);
    if (req.query.mock_avatar) avatarUrl = String(req.query.mock_avatar);
  }

  const user = handleAccountLinking({
    provider: "vk",
    socialId,
    email,
    name,
    avatarUrl,
    currentUser: req.user,
  });

  createSession(res, user.id);
  res.redirect("/?auth=success");
});
```

*Direct Code Observation*: In non-test mode (`isMock` is `false`), when a real user authorizes via VK or Yandex and returns with an OAuth code (e.g. `?code=real_vk_code`), the backend makes **zero API requests** to `https://oauth.vk.com/access_token` or `https://api.vk.com/method/users.get` (and similarly for Yandex). Instead, it falls back to hardcoded `socialId = "vk_12345"` / `yandex_67890`. Every user in production logging in via VK or Yandex is authenticated as the identical hardcoded user account.

### Observation 1.3: CSRF State Replay Vulnerability in `server/routes/auth.js`
In `server/routes/auth.js` (lines 104–117):

```javascript
function validateOAuthState(req, res) {
  const cookieState = req.cookies?.oauth_state;
  const paramState = req.query?.state;
  res.clearCookie("oauth_state", {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    path: "/",
  });
  if (!cookieState || !paramState || cookieState !== paramState) {
    return false;
  }
  return true;
}
```

*Direct Code Observation*: `validateOAuthState` reads `req.cookies?.oauth_state` sent by the client HTTP headers. Clearing the cookie via `res.clearCookie` only attaches a `Set-Cookie` header to the HTTP response. It does not store or invalidate the state on the server. Consequently, any client that resends the `oauth_state` HTTP cookie header alongside the `state` URL parameter can replay OAuth logins infinitely.

### Observation 1.4: Migration Flaw in `server/db.js`
In `server/db.js` (lines 33–47):

```javascript
  try {
    db.exec("ALTER TABLE users ADD COLUMN vk_id TEXT UNIQUE;");
  } catch (err) {
    void err;
  }
  try {
    db.exec("ALTER TABLE users ADD COLUMN yandex_id TEXT UNIQUE;");
  } catch (err) {
    void err;
  }
```

*Direct Code Observation*: SQLite does not permit adding `UNIQUE` constraints via `ALTER TABLE ADD COLUMN`. Executing `ALTER TABLE users ADD COLUMN vk_id TEXT UNIQUE;` on an existing database throws an SQLite syntax/schema error (`Cannot add a UNIQUE column`). Because this error is swallowed in `catch (err) { void err; }`, existing SQLite database files will never receive the `vk_id` and `yandex_id` columns during application startup.

### Observation 1.5: BigInt / Foreign Key Constraint Bug in `server/routes/auth.js`
In `server/routes/auth.js` (lines 147–151):

```javascript
    const info = db
      .prepare(`INSERT INTO users (email, password_hash, name, ${colName}, avatar_url) VALUES (?, '', ?, ?, ?)`)
      .run(finalEmail, finalName, socialId, avatarUrl);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
```

*Direct Code Observation*: `info.lastInsertRowid` in Node's `node:sqlite` (`DatabaseSync`) returns a `bigint`. `db.prepare(...).get(info.lastInsertRowid)` in certain SQLite wrapper contexts does not coerce `1n` to number, resulting in `user` evaluating to `undefined`. Passing `user.id` to `createSession(res, user.id)` triggers `FOREIGN KEY constraint failed` (SQLite error 787).

---

## 2. Logic Chain

1. **From Observation 1.2 to Conclusion**:
   - Requirement R2 mandates social authentication integration for VK ID and Yandex ID.
   - The implementation provides mock logic for test execution, but the non-mock path contains no OAuth client implementation (no token exchange, no profile fetch, hardcoded mock constants).
   - Per reviewer guidelines, a facade implementation that bypasses real logic and hardcodes user data constitutes an **INTEGRITY VIOLATION**.

2. **From Observation 1.1 and 1.3 to Conclusion**:
   - `validateOAuthState` relies purely on `res.clearCookie` without server-side nonce tracking.
   - Stress test `prevents CSRF state replay attacks (state cleared after single use)` fails because the server accepts replayed request cookies.
   - This represents a security vulnerability (CSRF token replay).

3. **From Observation 1.1, 1.4, and 1.5 to Conclusion**:
   - Database migrations silently fail on existing databases due to SQLite `ALTER TABLE ADD COLUMN ... UNIQUE` constraints being rejected and silently caught.
   - BigInt coercion issues in `handleAccountLinking` cause unhandled database exceptions during user creation.
   - These bugs cause `npm run check` to fail 3 test cases, failing the mandatory quality gate.

---

## 3. Findings

### [Critical] Finding 1: INTEGRITY VIOLATION — Facade / Dummy OAuth Implementation
- **Where**: `server/routes/auth.js` (lines 156–244)
- **Why**: Production OAuth callback endpoints `/api/auth/vk/callback` and `/api/auth/yandex/callback` lack real OAuth code-for-token exchange and user profile retrieval. In non-test mode, any user authenticating via VK or Yandex is authenticated under the static ID `vk_12345` or `yandex_67890`.
- **Suggestion**: Implement proper OAuth 2.0 token exchange (`https://oauth.vk.com/access_token`, `https://oauth.yandex.ru/token`) and profile retrieval when `isMock` is false, or cleanly isolate real vs. mock handlers.

### [Critical] Finding 2: Security Vulnerability — CSRF State Replay Attack
- **Where**: `server/routes/auth.js` (lines 104–117)
- **Why**: `validateOAuthState` does not store used state tokens in server memory or a database table. An attacker who intercepts a valid `oauth_state` cookie can replay the callback request multiple times.
- **Suggestion**: Store generated `oauth_state` tokens in a short-lived server memory map or session store and delete the state entry upon first validation attempt.

### [Major] Finding 3: Database Migration Incompatibility with SQLite
- **Where**: `server/db.js` (lines 33–47)
- **Why**: SQLite rejects `ALTER TABLE ... ADD COLUMN ... UNIQUE`. Swallowing this error in `try { ... } catch` prevents columns from being added to pre-existing SQLite databases.
- **Suggestion**: Execute `ALTER TABLE users ADD COLUMN vk_id TEXT;` and `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_vk_id ON users(vk_id);` (and similarly for `yandex_id`).

### [Major] Finding 4: BigInt Coercion & Foreign Key Constraint Error
- **Where**: `server/routes/auth.js` (line 150)
- **Why**: `info.lastInsertRowid` is a BigInt. Passing `info.lastInsertRowid` directly into `.get()` can lead to `undefined` query result and `FOREIGN KEY constraint failed` in `createSession`.
- **Suggestion**: Use `Number(info.lastInsertRowid)` explicitly, matching line 61.

### [Major] Finding 5: Empty `mock_email` Query String Bug
- **Where**: `server/routes/auth.js` (lines 159, 204)
- **Why**: `if (req.query.mock_email)` evaluates to false when `mock_email=""`. The callback then defaults `email` to `"vk_12345@examhub.ru"` instead of falling back to `${socialId}@examhub.ru`.
- **Suggestion**: Use `req.query.mock_email !== undefined` check when forwarding query parameters.

---

## 4. Verified Claims

| Claim | Verification Method | Result |
|---|---|---|
| Frontend URL parameter cleanup (`/?auth=success`) | Code review of `js/modules/auth.js` lines 67–75 | ✅ **PASS** |
| Cookie attributes (`HttpOnly`, `SameSite=Lax`, `Path=/`) | Code review of `server/routes/auth.js` and unit test assertions | ✅ **PASS** |
| `serializeUser` schema mapping | Code review of `server/middleware/auth.js` lines 4–18 | ✅ **PASS** |
| Mandatory Quality Gate (`npm run check`) | Executed `npm run check` via `run_command` | ❌ **FAIL** (3 failed tests) |

---

## 5. Caveats

- **External OAuth Testing**: Because this environment operates under `CODE_ONLY` network restrictions, actual network requests to `https://oauth.vk.com` and `https://oauth.yandex.ru` were not executed against live remote servers; logic analysis was conducted via local code inspection and unit tests.

---

## 6. Conclusion

The implementation of Requirement R2 cannot be approved in its current state. The presence of a facade OAuth implementation in production routes represents an **INTEGRITY VIOLATION**. Additionally, security vulnerabilities (CSRF state replay) and implementation defects cause `npm run check` to fail.

**Verdict**: **REQUEST_CHANGES**

---

## 7. Verification Method (For Re-Testing)

To verify resolution after fixes are applied:

1. Run the full quality gate suite:
   ```bash
   npm run check
   ```
   *Expected output*: `BUILD OK`, ESLint passed with 0 errors, Vitest unit tests 100% green, Playwright E2E tests 100% green.

2. Run social auth unit & stress tests specifically:
   ```bash
   npx vitest run tests/unit/social_auth.test.mjs tests/unit/social_auth_stress.test.mjs
   ```
   *Expected output*: All 18 tests passing.

3. Inspect `server/routes/auth.js` to ensure production OAuth endpoints perform real token exchange or properly structure production vs. mock execution.
