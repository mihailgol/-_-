# Handoff Report — Challenger 2: Social Auth (VK ID & Yandex ID)

## 1. Observation

Direct empirical observations from source code inspection and test execution:

- **Source Code Files Inspected**:
  - `server/routes/auth.js`:
    - Line 15-21 (`createSession`):
      ```javascript
      res.cookie(config.cookieName, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProd,
        maxAge: config.sessionTtlDays * 864e5,
        path: "/",
      });
      ```
    - Line 92-102 (`setOAuthState`):
      ```javascript
      res.cookie("oauth_state", state, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProd,
        maxAge: 10 * 60 * 1000,
        path: "/",
      });
      ```
    - Line 104-117 (`validateOAuthState`):
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
    - Line 171-173 & 216-218 (`/api/auth/vk/callback` and `/api/auth/yandex/callback`):
      ```javascript
      if (!validateOAuthState(req, res)) {
        return res.status(400).json({ error: "Неверное состояние CSRF" });
      }
      ```
    - Line 119-154 (`handleAccountLinking`):
      Handles account resolution in order:
      1) Lookup by `colName` (`vk_id` / `yandex_id`)
      2) If not found & `currentUser.id` exists (active session): link `colName` to `currentUser.id`
      3) If not found & `email` exists: link `colName` to existing email user record
      4) If not found: create new user with `colName`, `email`, `name`, `avatar_url`

- **Test Execution Results**:
  1. `npx vitest run --fileParallelism=false`:
     ```
     ✓ tests/unit/social_auth_stress.test.mjs (13 tests) 564ms
     ✓ tests/unit/social_auth.test.mjs (5 tests) 405ms
     ✓ tests/unit/theme_stress.test.js (31 tests) 120ms
     ✓ tests/unit/theme.test.js (5 tests) 35ms
     ✓ tests/unit/app.test.js (6 tests) 8ms
     ✓ tests/unit/data.test.js (6 tests) 6ms

     Test Files  6 passed (6)
          Tests  66 passed (66)
     ```
  2. `npx playwright test`:
     ```
     Running 17 tests using 3 workers

     ok  1 [chromium] › tests\e2e\smoke.spec.js:15:3 › ExamHub — smoke tests › работает боковая навигация по всем разделам (5.5s)
     ...
     ok  9 [chromium] › tests\e2e\smoke.spec.js:86:3 › ExamHub — smoke tests › авторизация: регистрация, вход, выход (7.0s)
     ...
     17 passed (41.4s)
     ```

## 2. Logic Chain

1. **CSRF State Validation**:
   - Observations show `validateOAuthState` checks `req.cookies?.oauth_state === req.query?.state`.
   - On mismatch or missing state parameter/cookie, callback endpoints return `400 Bad Request` with `{ "error": "Неверное состояние CSRF" }`.
   - Empirically verified across 4 stress test scenarios (missing state param, missing cookie, mismatched values, Yandex callback).

2. **Account Linking Scenarios**:
   - `handleAccountLinking` was stress-tested across 5 scenarios:
     - *Scenario A (New User)*: Social login with unrecognised social ID & email creates new user in `users` table with correct attributes.
     - *Scenario B (Returning User)*: Subsequent logins with same social ID return existing user record without database duplication.
     - *Scenario C (Unauthenticated Email Linking)*: Login via social provider matching an existing email-registered user links `vk_id`/`yandex_id` to that account.
     - *Scenario D (Session Account Linking)*: Authenticated user initiating social login links the social ID to the current active `examhub_session` user.
     - *Scenario E (Mock Fallback Behavior)*: In test mock mode, omitting `mock_email` defaults email to `vk_12345@examhub.ru`, successfully handling missing provider attributes.

3. **Cookie Attributes Verification**:
   - Set-Cookie headers for `examhub_session` and `oauth_state` were captured and analyzed:
     - `HttpOnly`: Confirmed present (`httponly`).
     - `SameSite`: Confirmed set to `lax`.
     - `Path`: Confirmed set to `/`.
     - `Secure`: Evaluates to `config.isProd` (true in production, false in local dev/test environment).

4. **Test Suite Health**:
   - Vitest unit tests pass 66/66 (100%).
   - Playwright E2E tests pass 17/17 (100%).
   - When running Vitest and Playwright sequentially (`npm run check` sequence), all tests succeed with zero failures.

## 3. Caveats

- `validateOAuthState` relies on client-side cookie clearing (`res.clearCookie("oauth_state")`). In stateless cookie-based CSRF state validation without server-side state tracking, if a client explicitly re-sends the original `oauth_state` header, state clearing relies on browser compliance with `Set-Cookie: oauth_state=; Max-Age=0`.
- In mock mode (`config.isTest` or `mock=true`), social credentials are mocked via URL parameters (`mock_id`, `mock_email`). Real OAuth flow requires production client secrets (`VK_CLIENT_ID`, `YANDEX_CLIENT_ID`).

## 4. Conclusion

The Social Auth implementation (VK ID & Yandex ID) for Milestone 2 meets all security and functional requirements:
- **CSRF State Validation**: Fully rejects missing or mismatched state parameters with HTTP 400.
- **Account Linking**: Works reliably for new user creation, returning users, email matching, and active session linking.
- **Cookie Security**: `examhub_session` and `oauth_state` strictly set `HttpOnly`, `SameSite=Lax`, and `Path=/`.
- **Test Integrity**: Full unit test suite (66 tests) and Playwright E2E smoke test suite (17 tests) pass cleanly.

## 5. Verification Method

To independently verify these results:

1. Run unit test suite:
   ```bash
   npx vitest run --fileParallelism=false
   ```
   *Expected output*: 6 test files passed, 66 tests passed.

2. Run Playwright E2E test suite:
   ```bash
   npx playwright test
   ```
   *Expected output*: 17 tests passed.

3. Run full verification command:
   ```bash
   npm run check
   ```
   *Expected output*: Zero failures across lint, build, unit tests, and E2E tests.
