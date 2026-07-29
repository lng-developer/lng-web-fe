# Staff Provisioning and Self-Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision a staff account, HR profile, access assignments, and current-year annual leave balance atomically; then require the staff member to change the default password and complete their own personal profile before using the system.

**Architecture:** The HR module owns the `POST /api/hr/staff-provisioning` command and orchestrates one MongoDB transaction through narrow Auth write ports. Auth owns password hashes, `mustChangePassword`, and login/session DTOs. HR owns company and personal profile fields plus `isProfileUpdated`. A shared post-auth setup gate enforces the two setup stages on the server; FE mirrors its state for navigation only.

**Tech Stack:** Node.js, Express 5, Mongoose transactions, Joi, Jest, React 19, React Router 7, TanStack Query 5, Zustand 5, MUI 9, react-hook-form, zod.

## Global Constraints

- Keep `employeeCode` as the only non-email login identifier; do not introduce `username`.
- The client never sends or receives the default password; Auth hashes `123456` server-side and sets `mustChangePassword: true`.
- Provision Account, AccessAssignment, HrEmployeeProfile, and current-year ANNUAL LeaveBalance in one transaction or write none of them.
- HR writes company fields only; the self-service endpoint accepts only personal fields and never compensation fields.
- The server, not FE routing, is the authorization boundary for onboarding state.
- Preserve existing `POST /api/auth/accounts` and profile endpoints for compatibility until their callers are deliberately migrated.
- Do not create attendance, schedule, payroll, leave-request, or overtime placeholders.
- Keep the existing MUI/Tailwind/API-client conventions and use `npm run lint` and `npm run build` for FE validation.

---

## File Structure

### Backend: `C:\lng_system\lng-web\lng-web-be`

- Modify `src/modules/auth/models/account.model.js`: persist `mustChangePassword` with a safe default for existing accounts.
- Modify `src/modules/auth/dtos/auth.dto.js`, `services/authManager.service.js`, `controllers/auth.controller.js`, `validators/auth.validator.js`, and `routes/index.js`: expose setup flags and support an authenticated own-password transition.
- Modify `src/modules/auth/public.js`: expose focused transaction-aware account/access creation functions used by HR; do not export repositories.
- Create `src/modules/hr/services/staffProvisioning.service.js`, `validators/staffProvisioning.validator.js`, `dtos/staffProvisioning.dto.js`, and `controllers/staffProvisioning.controller.js`: implement the HR command without making internal HTTP calls.
- Modify `src/modules/hr/routes/index.js`, `public.js`, `services/employeeProfile.service.js`, `validators/employeeProfile.validator.js`, `controllers/employeeProfile.controller.js`, and `dtos/employeeProfile.dto.js`: add self-profile completion and setup status.
- Modify `src/modules/auth/middlewares/authenticate.js` and create `src/modules/auth/middlewares/requireAccountSetupComplete.js`: derive setup state after authentication and block business endpoints with an explicit allow-list.
- Modify `src/modules/hr/public.js`: expose the internal `isProfileUpdated` setup flag to Auth without exposing personal data.
- Add focused Jest suites under `src/test/auth/...` and `src/test/hr/...` beside the existing auth-manager and employee-profile test families.

### Frontend: `C:\lng_system\lng-web\lng-web-fe`

- Modify `src/services/endpoints.js`, `src/constants/routes.js`, auth query/mutation files, and `src/store/useAuthStore.js`: carry the new session/setup contract.
- Modify `src/routes/index.jsx` and `src/routes/ProtectedRoute.jsx`: apply the FE setup redirect order.
- Create `src/features/auth/pages/ChangeInitialPasswordPage.jsx` and a small form component: only valid when Auth requires a password change.
- Create `src/features/profile/pages/CompleteProfilePage.jsx` and feature-local personal-profile form helpers: submit only self-owned fields.
- Modify `src/features/profile/pages/ProfilePage.jsx`: remove fake data and reuse the real self-profile query for the normal profile surface.
- Modify `src/features/hr-time/pages/PeoplePage.jsx`, `components/EmployeeProfileDialog.jsx`, queries/mutations, and i18n files: replace separate Account/Profile creation with Create Staff and show onboarding state.
- Add focused node/component-composition tests in the existing `src/features/auth`, `src/features/profile`, and `src/features/hr-time` test style.

## Task 1: Auth account setup state and own-password change

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\auth\models\account.model.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\auth\dtos\auth.dto.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\auth\validators\auth.validator.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\auth\services\authManager.service.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\auth\controllers\auth.controller.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\auth\routes\index.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\auth\services\authManager.service.test.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\auth\controllers\auth.controller.test.js`

**Consumes:** Existing `hashPassword`, `verifyPassword`, account repository session update functions, authentication middleware, and auth audit port.

**Produces:** `account.mustChangePassword`, safe session DTO field `mustChangePassword`, and `POST /api/auth/me/change-password` accepting `{ currentPassword, newPassword }`.

- [ ] **Step 1: Add failing Auth service tests for the setup transition.**

```js
test('login returns mustChangePassword for a provisioned account', async () => {
  accountRepository.findAuthAccountById.mockResolvedValue(authModel({ mustChangePassword: true }))
  await expect(authManager.login('EMP-0241', '123456')).resolves.toMatchObject({
    account: { mustChangePassword: true },
  })
})

test('changeOwnPassword clears the required flag only after current password verification', async () => {
  await authManager.changeOwnPassword('account-1', {
    currentPassword: '123456',
    newPassword: 'NewStrongPassword1!',
  })
  expect(accountRepository.updatePassword).toHaveBeenCalledWith(
    'account-1',
    expect.objectContaining({
      mustChangePassword: false,
    }),
    expect.anything(),
  )
})
```

- [ ] **Step 2: Run the focused Auth tests and confirm they fail because the field and command do not exist.**

Run: `npm test -- --runInBand src/test/auth/services/authManager.service.test.js src/test/auth/controllers/auth.controller.test.js`

Expected: FAIL with missing `mustChangePassword` DTO property and missing `changeOwnPassword` service function.

- [ ] **Step 3: Implement the smallest Account/Auth contract.**

```js
// account.model.js
mustChangePassword: { type: Boolean, required: true, default: false },

// auth.validator.js
const changeOwnPasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

// authManager.service.js
async function changeOwnPassword(accountId, { currentPassword, newPassword }, httpContext = {}) {
  const account = await accountRepository.findByIdWithPassword(accountId);
  if (!account || !(await verifyPassword(currentPassword, account.passwordHash, account.passwordSalt))) {
    throw authenticationError('Current password is incorrect');
  }
  const { passwordHash, passwordSalt } = await hashPassword(newPassword);
  return accountRepository.updatePassword(accountId, {
    passwordHash, passwordSalt, mustChangePassword: false,
  });
}
```

Add a controller that validates `req.body`, invokes this command with `req.auth.accountId`, and returns a safe account DTO. Register `POST /me/change-password` after `authenticate`.

- [ ] **Step 4: Update safe auth DTO/session responses.**

Add `mustChangePassword: Boolean(account.mustChangePassword)` to the account/session DTO. Keep password hashes, salts, and refresh-session data excluded. Do not change identifier lookup: non-email identifiers continue to resolve through HR `employeeCode`.

- [ ] **Step 5: Re-run focused Auth tests and static checks.**

Run: `npm test -- --runInBand src/test/auth/services/authManager.service.test.js src/test/auth/controllers/auth.controller.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the independently testable Auth state change.**

```powershell
git add src/modules/auth/models/account.model.js src/modules/auth/dtos/auth.dto.js src/modules/auth/validators/auth.validator.js src/modules/auth/services/authManager.service.js src/modules/auth/controllers/auth.controller.js src/modules/auth/routes/index.js src/test/auth/services/authManager.service.test.js src/test/auth/controllers/auth.controller.test.js
git commit -m "feat(auth): require initial password change"
```

## Task 2: Transactional HR staff provisioning

**Files:**

- Create: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\validators\staffProvisioning.validator.js`
- Create: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\dtos\staffProvisioning.dto.js`
- Create: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\services\staffProvisioning.service.js`
- Create: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\controllers\staffProvisioning.controller.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\routes\index.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\auth\public.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\auth\services\authAdmin.service.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\repositories\employeeProfile.repository.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\repositories\leave.repository.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\hr\services\staffProvisioning.service.test.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\hr\routes\staffProvisioning.routes.test.js`

**Consumes:** Task 1 `mustChangePassword`; existing organization resolution, HR scope checks, Auth role/scope validation, account/access repositories, and `leaveRepository.ensureBalance(profileId, year, 'ANNUAL', { session })`.

**Produces:** `POST /api/hr/staff-provisioning` and `provisionStaff(payload, authContext, httpContext)` with an atomic result DTO.

- [ ] **Step 1: Write failing service tests for success and rollback.**

```js
test('provisions account, access, profile, and annual balance in one transaction', async () => {
  const result = await provisionStaff(validPayload, hrWriterContext, requestContext)
  expect(result).toMatchObject({
    accountId: expect.any(String),
    mustChangePassword: true,
    isProfileUpdated: false,
  })
  expect(leaveRepository.ensureBalance).toHaveBeenCalledWith(
    expect.anything(),
    new Date().getUTCFullYear(),
    'ANNUAL',
    expect.objectContaining({ session: expect.anything() }),
  )
})

test('rolls back when annual leave initialization fails', async () => {
  leaveRepository.ensureBalance.mockRejectedValueOnce(new Error('write failed'))
  await expect(provisionStaff(validPayload, hrWriterContext, requestContext)).rejects.toThrow(
    'write failed',
  )
  expect(transaction.abortTransaction).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the provisioning tests and confirm they fail.**

Run: `npm test -- --runInBand src/test/hr/services/staffProvisioning.service.test.js src/test/hr/routes/staffProvisioning.routes.test.js`

Expected: FAIL because the command, route, validator, and DTO do not exist.

- [ ] **Step 3: Define the validator and safe result DTO.**

```js
const staffProvisioningSchema = Joi.object({
  employeeCode: Joi.string().trim().uppercase().min(1).max(80).required(),
  workEmail: Joi.string().trim().lowercase().email().required(),
  fullName: Joi.string().trim().min(1).max(160).required(),
  departmentId: objectId.allow(null),
  teamId: objectId.allow(null),
  jobTitle: Joi.string().trim().max(160).allow(null, ''),
  jobLevel: Joi.string().trim().max(80).allow(null, ''),
  employmentType: Joi.string()
    .valid(...Object.values(hrEmploymentTypes))
    .required(),
  workMode: Joi.string()
    .valid(...Object.values(hrWorkModes))
    .required(),
  startDate: Joi.date().iso().required(),
  probationEndDate: Joi.date().iso().allow(null),
  status: Joi.string()
    .valid(...Object.values(hrEmployeeStatuses))
    .required(),
  assignments: Joi.array().items(accountAssignmentSchema).min(1).required(),
})
```

Return only `{ accountId, profile, mustChangePassword: true, isProfileUpdated: false, leaveBalance: { year, leaveType: 'ANNUAL' } }`.

- [ ] **Step 4: Implement one orchestration service transaction.**

```js
await session.withTransaction(async () => {
  account = await authPublic.createProvisionedAccount({
    email: payload.workEmail,
    assignments: payload.assignments,
    session,
    authContext,
    httpContext,
  })
  profile = await employeeProfileRepository.create(
    {
      ...companyFields(payload),
      accountId: account._id,
      isProfileUpdated: false,
    },
    { session },
  )
  await leaveRepository.ensureBalance(profile._id, currentYear, 'ANNUAL', { session })
  await recordProfileAudit('HR_STAFF_PROVISIONED', profile, authContext, {}, { required: true })
})
```

`createProvisionedAccount` applies and hashes Auth's server-owned `123456` initial password and sets `mustChangePassword: true`; HR never receives that raw value. Expose only this focused command from Auth public, keep repository access module-private, and reuse Auth's existing role/scope validation. Reuse HR organization/scope checks before writes. Mount the new route behind `requireEmployeeWrite`.

- [ ] **Step 5: Add route-contract assertions and run the focused suite.**

Run: `npm test -- --runInBand src/test/hr/services/staffProvisioning.service.test.js src/test/hr/routes/staffProvisioning.routes.test.js src/test/hr/routes/hrModule.contract.test.js`

Expected: PASS; success creates all four records, and each failure leaves no partial profile/account/balance.

- [ ] **Step 6: Commit the provisioning command.**

```powershell
git add src/modules/hr/validators/staffProvisioning.validator.js src/modules/hr/dtos/staffProvisioning.dto.js src/modules/hr/services/staffProvisioning.service.js src/modules/hr/controllers/staffProvisioning.controller.js src/modules/hr/routes/index.js src/modules/auth/public.js src/modules/auth/services/authAdmin.service.js src/modules/hr/repositories/employeeProfile.repository.js src/modules/hr/repositories/leave.repository.js src/test/hr/services/staffProvisioning.service.test.js src/test/hr/routes/staffProvisioning.routes.test.js
git commit -m "feat(hr): provision staff atomically"
```

## Task 3: Self-profile completion and server-side setup gate

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\validators\employeeProfile.validator.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\services\employeeProfile.service.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\controllers\employeeProfile.controller.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\routes\index.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\dtos\employeeProfile.dto.js`
- Create: `C:\lng_system\lng-web\lng-web-be\src\modules\auth\middlewares\requireAccountSetupComplete.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\auth\middlewares\authenticate.js`
- Modify: `C:\lng_system\lng-web\lng-web-be\src\modules\hr\public.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\hr\services\employeeProfile.service.test.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\hr\routes\employeeProfile.routes.test.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\auth\routes\index.test.js`

**Consumes:** Task 1 account setup state and Task 2 provisioned profile `isProfileUpdated: false`.

**Produces:** `PATCH /api/hr/employee-profiles/me/personal`, `profileSetupRequired` in safe authenticated state, and `ACCOUNT_SETUP_REQUIRED` responses for blocked business routes.

- [ ] **Step 1: Write failing tests for personal-field ownership and the two setup states.**

```js
test('self completion accepts personal fields and rejects company or compensation fields', async () => {
  await expect(
    updateMyPersonalProfile(
      accountId,
      {
        phoneNumber: '0900000000',
        address: 'HCM',
        personalEmail: 'me@example.com',
        emergencyContact: { name: 'A', phone: '0900000001', relation: 'PARENT' },
        departmentId: 'forbidden',
        baseSalary: 1,
      },
      authContext,
    ),
  ).rejects.toMatchObject({ statusCode: 400 })
})

test('blocks business access until initial password and profile completion are both finished', () => {
  expect(
    requireAccountSetupComplete({ mustChangePassword: true, profileSetupRequired: true }),
  ).toMatchObject({ code: 'ACCOUNT_SETUP_REQUIRED' })
})
```

- [ ] **Step 2: Run the focused tests and confirm they fail.**

Run: `npm test -- --runInBand src/test/hr/services/employeeProfile.service.test.js src/test/hr/routes/employeeProfile.routes.test.js src/test/auth/routes/index.test.js`

Expected: FAIL because the self route, whitelist service, and setup middleware do not exist.

- [ ] **Step 3: Implement a separate self-personal validator and service.**

```js
const completeMyPersonalProfileSchema = Joi.object({
  avatarUrl: Joi.string().uri().allow(null, ''),
  gender: Joi.string().uppercase().allow(null, ''),
  birthDate: isoDate,
  phoneNumber: Joi.string().trim().max(40).required(),
  address: optionalString.required(),
  personalEmail: Joi.string().email().required(),
  emergencyContact: Joi.object({
    name: Joi.string().trim().max(160).required(),
    phone: Joi.string().trim().max(40).required(),
    relation: Joi.string().trim().max(80).required(),
  }).required(),
  dependantDetails: Joi.array().items(dependantSchema),
  identityCard: optionalString,
  taxIdentification: optionalString,
  socialInsuranceNumber: optionalString,
  bankAccount: Joi.object({ bankName: optionalString, accountNumber: optionalString }),
})
```

`updateMyPersonalProfile(payload, authContext)` finds by `authContext.accountId`, updates only this whitelist with `includeSensitive: true`, sets `isProfileUpdated: true`, and records an audit event whose metadata contains field names only.

- [ ] **Step 4: Implement the server gate inside the shared authentication path.**

```js
function requireAccountSetupComplete(req, res, next) {
  if (req.auth.mustChangePassword || req.auth.profileSetupRequired) {
    return next(new AppError('Account setup required', 403, true, 'ACCOUNT_SETUP_REQUIRED'))
  }
  return next()
}
```

After `authenticate` loads the account, it lazily asks `hrPublic.getEmployeeProfileByAccountId(accountId)` for its internal `isProfileUpdated` flag, assigns `req.auth.mustChangePassword` and `req.auth.profileSetupRequired`, and invokes `requireAccountSetupComplete(req, res, next)`. Its exact allow-list is `POST /api/auth/me/change-password`, `GET /api/hr/employee-profiles/me`, `PATCH /api/hr/employee-profiles/me/personal`, and authenticated logout. Refresh stays outside `authenticate`. If no HR profile exists, `profileSetupRequired` is false to preserve existing non-HR accounts. This shared middleware placement covers every protected module route; do not try to mount a second gate router-by-router.

- [ ] **Step 5: Run gate, self-profile, and route tests.**

Run: `npm test -- --runInBand src/test/hr/services/employeeProfile.service.test.js src/test/hr/routes/employeeProfile.routes.test.js src/test/auth/routes/index.test.js`

Expected: PASS; staff can only reach the exact setup actions until both flags are false, while HR still receives normal scope checks after setup.

- [ ] **Step 6: Commit the self-service and gate changes.**

```powershell
git add src/modules/hr/validators/employeeProfile.validator.js src/modules/hr/services/employeeProfile.service.js src/modules/hr/controllers/employeeProfile.controller.js src/modules/hr/routes/index.js src/modules/hr/dtos/employeeProfile.dto.js src/modules/hr/public.js src/modules/auth/middlewares/authenticate.js src/modules/auth/middlewares/requireAccountSetupComplete.js src/test/hr/services/employeeProfile.service.test.js src/test/hr/routes/employeeProfile.routes.test.js src/test/auth/routes/index.test.js
git commit -m "feat(hr): require staff profile completion"
```

## Task 4: Frontend session contract, password-change page, and setup redirects

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-fe\src\services\endpoints.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\constants\routes.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\features\auth\api\auth.mutations.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\store\useAuthStore.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\routes\ProtectedRoute.jsx`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\routes\index.jsx`
- Create: `C:\lng_system\lng-web\lng-web-fe\src\features\auth\pages\ChangeInitialPasswordPage.jsx`
- Create: `C:\lng_system\lng-web\lng-web-fe\src\features\auth\components\ChangeInitialPasswordForm.jsx`
- Test: `C:\lng_system\lng-web\lng-web-fe\src\features\auth\authSetupFlow.test.js`

**Consumes:** Task 1 response field `account.mustChangePassword`; Task 3 `profileSetupRequired`, `POST /api/auth/me/change-password`, and server error code `ACCOUNT_SETUP_REQUIRED`.

**Produces:** FE redirect order, initial-password route, and session update after successful password change.

- [ ] **Step 1: Write failing redirect and mutation tests.**

```js
test('redirects a default-password session to initial password change before profile completion', () => {
  assert.equal(
    resolveSetupRoute({ mustChangePassword: true, profileSetupRequired: true }),
    ROUTES.CHANGE_INITIAL_PASSWORD,
  )
})

test('redirects a password-ready incomplete profile to profile completion', () => {
  assert.equal(
    resolveSetupRoute({ mustChangePassword: false, profileSetupRequired: true }),
    ROUTES.COMPLETE_PROFILE,
  )
})
```

- [ ] **Step 2: Run the focused FE test and confirm it fails.**

Run: `node --test src/features/auth/authSetupFlow.test.js`

Expected: FAIL because routes, resolver, and mutation do not exist.

- [ ] **Step 3: Add endpoint constants, session state, and route resolver.**

```js
export const ROUTES = {
  // existing routes
  CHANGE_INITIAL_PASSWORD: '/auth/change-initial-password',
  COMPLETE_PROFILE: '/profile/complete',
}

export function resolveSetupRoute({ mustChangePassword, profileSetupRequired }) {
  if (mustChangePassword) return ROUTES.CHANGE_INITIAL_PASSWORD
  if (profileSetupRequired) return ROUTES.COMPLETE_PROFILE
  return null
}
```

Persist only safe account/setup flags in `useAuthStore`. Add an auth mutation that posts `{ currentPassword, newPassword }`; on success replace the account state with the returned safe account and route to profile completion when required.

- [ ] **Step 4: Implement the password-change page using existing form primitives.**

The form has current password, new password, confirmation, client-side equality validation, loading state, API error snackbar, and no back-to-app action. Route guards redirect a ready account away from this page and redirect an incomplete account to it before any other protected route.

- [ ] **Step 5: Run focused FE test, lint, and build.**

Run: `node --test src/features/auth/authSetupFlow.test.js; npm run lint; npm run build`

Expected: all commands PASS.

- [ ] **Step 6: Commit the FE authentication gate.**

```powershell
git add src/services/endpoints.js src/constants/routes.js src/features/auth/api/auth.mutations.js src/store/useAuthStore.js src/routes/ProtectedRoute.jsx src/routes/index.jsx src/features/auth/pages/ChangeInitialPasswordPage.jsx src/features/auth/components/ChangeInitialPasswordForm.jsx src/features/auth/authSetupFlow.test.js
git commit -m "feat(auth): gate initial staff setup"
```

## Task 5: Staff self-profile completion UI and real profile data

**Files:**

- Create: `C:\lng_system\lng-web\lng-web-fe\src\features\profile\api\profile.keys.js`
- Create: `C:\lng_system\lng-web\lng-web-fe\src\features\profile\api\profile.queries.js`
- Create: `C:\lng_system\lng-web\lng-web-fe\src\features\profile\api\profile.mutations.js`
- Create: `C:\lng_system\lng-web\lng-web-fe\src\features\profile\components\PersonalProfileForm.jsx`
- Create: `C:\lng_system\lng-web\lng-web-fe\src\features\profile\pages\CompleteProfilePage.jsx`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\features\profile\pages\ProfilePage.jsx`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\routes\index.jsx`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\i18n\locales\vi\common.json`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\i18n\locales\en\common.json`
- Test: `C:\lng_system\lng-web\lng-web-fe\src\features\profile\profileCompletion.test.js`

**Consumes:** Task 3 own-profile GET/PATCH contract and Task 4 `ROUTES.COMPLETE_PROFILE`.

**Produces:** A staff-only completion screen and an actual My Profile surface with no fake data.

- [ ] **Step 1: Write a failing contract/composition test.**

```js
test('completion UI uses only the own-profile endpoints and never HR directory mutation', async () => {
  const source = await readFile('src/features/profile/api/profile.mutations.js', 'utf8')
  assert.match(source, /ENDPOINTS\.HR\.MY_EMPLOYEE_PROFILE_PERSONAL/)
  assert.doesNotMatch(source, /EMPLOYEE_PROFILE\(profileId\)/)
})
```

- [ ] **Step 2: Run the test and confirm it fails.**

Run: `node --test src/features/profile/profileCompletion.test.js`

Expected: FAIL because API hooks and completion page do not exist.

- [ ] **Step 3: Implement query and mutation hooks using the shared client.**

```js
export function useMyEmployeeProfileQuery() {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: () => apiClient.get(ENDPOINTS.HR.MY_EMPLOYEE_PROFILE),
  })
}

export function useCompleteMyProfileMutation() {
  return useMutation({
    mutationFn: (payload) => apiClient.patch(ENDPOINTS.HR.MY_EMPLOYEE_PROFILE_PERSONAL, payload),
  })
}
```

- [ ] **Step 4: Build the completion form with only self-owned fields.**

Use react-hook-form + zod, form labels from i18n, and grouped sections: Personal, Contact, Emergency contact, Optional dependants, Optional identity/tax, Optional bank. Render employee code, work email, department/team, and job title as read-only company context. On success invalidate `profileKeys.me()`, update `profileSetupRequired: false`, and navigate to the original intended route. Do not render salary, department/team inputs, role assignments, or HR directory actions.

- [ ] **Step 5: Replace fake ProfilePage state with the same real query.**

Delete `FAKE_PROFILE_USER` and local no-op submit behavior. The regular profile page may reuse `PersonalProfileForm` in edit mode after onboarding, while its company-information card is read-only.

- [ ] **Step 6: Run focused test, lint, and build.**

Run: `node --test src/features/profile/profileCompletion.test.js; npm run lint; npm run build`

Expected: all commands PASS.

- [ ] **Step 7: Commit self-profile FE.**

```powershell
git add src/features/profile src/routes/index.jsx src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(profile): add staff self onboarding"
```

## Task 6: HR Create Staff UI and onboarding-aware directory

**Files:**

- Modify: `C:\lng_system\lng-web\lng-web-fe\src\services\endpoints.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\features\hr-time\api\hrTime.keys.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\features\hr-time\api\hrTime.mutations.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\features\hr-time\pages\PeoplePage.jsx`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\features\hr-time\components\EmployeeProfileDialog.jsx`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\features\hr-time\components\EmployeeProfileDrawer.jsx`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\features\hr-time\utils\hrTimeApi.js`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\i18n\locales\vi\common.json`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\i18n\locales\en\common.json`
- Test: `C:\lng_system\lng-web\lng-web-fe\src\features\hr-time\hrTimeOperations.test.js`
- Test: `C:\lng_system\lng-web\lng-web-fe\src\features\hr-time\hrTimeWorkflowComposition.test.js`

**Consumes:** Task 2 provisioning endpoint/result and Task 3 onboarding fields on employee directory/detail DTOs.

**Produces:** One Create Staff action, onboarding-state display, and HR-safe detail presentation.

- [ ] **Step 1: Write failing HR FE assertions.**

```js
test('People creates staff through the provisioning mutation, not separate account/profile calls', async () => {
  const page = await source('pages/PeoplePage.jsx')
  assert.match(page, /useProvisionStaffMutation/)
  assert.doesNotMatch(page, /useCreateEmployeeProfileMutation/)
})

test('directory maps the server onboarding state without deriving it from client guesses', () => {
  assert.equal(
    mapEmployeeProfileRow({ onboardingStatus: 'PROFILE_INCOMPLETE' }).onboardingStatus,
    'PROFILE_INCOMPLETE',
  )
})
```

- [ ] **Step 2: Run the focused HR FE tests and confirm they fail.**

Run: `node --test src/features/hr-time/hrTimeOperations.test.js src/features/hr-time/hrTimeWorkflowComposition.test.js`

Expected: FAIL because provisioning mutation and onboarding mapping do not exist.

- [ ] **Step 3: Add the provisioning endpoint and mutation.**

```js
export const ENDPOINTS = {
  HR: {
    // existing entries
    STAFF_PROVISIONING: '/api/hr/staff-provisioning',
  },
}

export function useProvisionStaffMutation() {
  return useMutation({
    mutationFn: (payload) => apiClient.post(ENDPOINTS.HR.STAFF_PROVISIONING, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hrTimeKeys.employeeProfiles() }),
  })
}
```

- [ ] **Step 4: Replace the Add Employee dialog with Create Staff.**

Keep only `employeeCode`, `workEmail`, `fullName`, organization, job, employment, dates, status, and role/scope fields. Remove account selector, personal/contact fields, and any password field. Submit one payload to `useProvisionStaffMutation`; show the server conflict/error message and success notification.

- [ ] **Step 5: Show onboarding state and preserve field ownership in details.**

Map server-owned `onboardingStatus` directly to a `StatusBadge` in the directory. In the drawer, separate Company information from Personal information; HR edit controls target company fields only. Do not add client-derived readiness logic or any HR editor for bank/identity/contact fields.

- [ ] **Step 6: Run focused tests, lint, and build.**

Run: `node --test src/features/hr-time/hrTimeOperations.test.js src/features/hr-time/hrTimeWorkflowComposition.test.js; npm run lint; npm run build`

Expected: all commands PASS.

- [ ] **Step 7: Commit HR staff UI.**

```powershell
git add src/services/endpoints.js src/features/hr-time src/i18n/locales/vi/common.json src/i18n/locales/en/common.json
git commit -m "feat(hr): create and track staff onboarding"
```

## Task 7: Cross-repository verification and contract handoff

**Files:**

- Create: `C:\lng_system\lng-web\lng-web-be\docs\hr\STAFF_PROVISIONING_API.md`
- Modify: `C:\lng_system\lng-web\lng-web-fe\src\features\hr\hrApiCoverage.test.js`
- Test: `C:\lng_system\lng-web\lng-web-be\src\test\hr\routes\hrModule.contract.test.js`

**Consumes:** Tasks 1-6.

**Produces:** Documented public API and cross-layer contract checks.

- [ ] **Step 1: Write failing endpoint coverage assertions.**

```js
test('HR FE coverage includes staff provisioning and self personal profile endpoints', () => {
  assert.match(coverage, /\/api\/hr\/staff-provisioning/)
  assert.match(coverage, /\/api\/hr\/employee-profiles\/me\/personal/)
})
```

- [ ] **Step 2: Run coverage/contract tests and confirm the new paths are initially absent.**

Run: `npm test -- --runInBand src/test/hr/routes/hrModule.contract.test.js; node --test src/features/hr/hrApiCoverage.test.js`

Expected: FAIL until BE routes and FE endpoint coverage are registered.

- [ ] **Step 3: Document request, response, permissions, and setup-state error semantics.**

Document `POST /api/hr/staff-provisioning`, `POST /api/auth/me/change-password`, and `PATCH /api/hr/employee-profiles/me/personal`. Include body examples from the spec, no password in staff-provision request, and `ACCOUNT_SETUP_REQUIRED` behavior.

- [ ] **Step 4: Run the complete relevant gates.**

Run in BE: `npm test -- --runInBand src/test/auth src/test/hr`

Run in FE: `node --test src/features/auth/authSetupFlow.test.js src/features/profile/profileCompletion.test.js src/features/hr/hrApiCoverage.test.js src/features/hr-time/hrTimeOperations.test.js src/features/hr-time/hrTimeWorkflowComposition.test.js; npm run lint; npm run build`

Expected: PASS. Report any pre-existing dirty-worktree failures separately and do not stage unrelated attendance changes.

- [ ] **Step 5: Commit docs and FE coverage only.**

```powershell
git -C C:\lng_system\lng-web\lng-web-be add docs/hr/STAFF_PROVISIONING_API.md
git -C C:\lng_system\lng-web\lng-web-be commit -m "docs(hr): document staff provisioning API"
git -C C:\lng_system\lng-web\lng-web-fe add src/features/hr/hrApiCoverage.test.js
git -C C:\lng_system\lng-web\lng-web-fe commit -m "test(hr): cover staff provisioning contract"
```

## Plan Self-Review

- Spec coverage: Tasks 1-3 implement transaction provisioning, default-password enforcement, self-owned fields, audit behavior, and server gating. Tasks 4-6 implement the matching FE state, pages, and HR UI. Task 7 verifies public routes and documents the contract.
- Placeholder scan: no deferred implementation markers or generic error-handling steps remain; every task names concrete files, contracts, and validation commands.
- Type consistency: `mustChangePassword`, `profileSetupRequired`, `isProfileUpdated`, `ACCOUNT_SETUP_REQUIRED`, `POST /api/hr/staff-provisioning`, `POST /api/auth/me/change-password`, and `PATCH /api/hr/employee-profiles/me/personal` are used consistently throughout.
