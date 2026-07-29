# Staff provisioning and self-onboarding

## Goal

Replace the current split account/profile creation with one HR command that provisions a usable staff identity. HR owns company data; staff owns personal data. A staff member cannot use business features until they change the default password and complete their personal profile.

## Existing gap

`POST /api/auth/accounts` currently creates an account and access assignments only. `POST /api/hr/employee-profiles` creates a profile separately. The HR profile API has no self-service write route, and the existing profile update requires HR write permission. Therefore the current frontend cannot safely implement the intended flow.

## Ownership

| Owner  | Fields                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HR     | `employeeCode`, `workEmail`, `fullName`, department/team, job title/level, employment type, work mode, start/probation dates, status, role assignments, compensation fields when authorized |
| Staff  | avatar, gender, birth date, phone, address, personal email, emergency contact, dependant details, identity card, tax identification, social insurance number, bank account                  |
| System | account status, password hash/salt, `mustChangePassword`, access assignments, `isProfileUpdated`, leave-balance records, audit events                                                       |

`employeeCode` remains the login name. The existing login path already resolves a non-email identifier through `employeeCode`; a separate `username` field is out of scope.

## Backend contract

### Provision staff

Add `POST /api/hr/staff-provisioning`, authorized by `HR_EMPLOYEES:WRITE` with the same global/scoped department/team checks as employee-profile creation.

Request body:

```json
{
  "employeeCode": "EMP-0241",
  "workEmail": "staff@lng.vn",
  "fullName": "Nguyen Minh Anh",
  "departmentId": "...",
  "teamId": "...",
  "jobTitle": "Fulfillment Specialist",
  "jobLevel": "L2",
  "employmentType": "FULL_TIME",
  "workMode": "ONSITE",
  "startDate": "2026-08-01",
  "probationEndDate": "2026-10-30",
  "status": "PROBATION",
  "assignments": [{ "roleId": "...", "scopeType": "TEAM", "scopeId": "..." }]
}
```

The password is never accepted from the client. The service hashes the configured initial value `123456` server-side and sets `mustChangePassword: true`.

Run the following in one MongoDB transaction, passing the same session through the dedicated Auth and HR public ports:

1. Create `Account` with `email = workEmail`, active status, default-password hash, and `mustChangePassword = true`.
2. Create the requested `AccessAssignment` records.
3. Create `HrEmployeeProfile` with company-owned fields, `accountId`, and `isProfileUpdated = false`.
4. Create/ensure the current-year `ANNUAL` `LeaveBalance` for that profile. The initial entitlement is zero until the existing leave-accrual/admin flow sets it; do not invent a quota policy here.
5. Write one provisioning audit event.

Any validation, duplicate, scope, role, or leave-balance error rolls back all five writes. Do not call the existing account and profile HTTP endpoints from this service.

Return a DTO containing the safe directory profile, `accountId`, `mustChangePassword: true`, `isProfileUpdated: false`, and the initialized leave-balance identifier/year. Never return the initial password hash, salt, or balance internals.

### First-login password change

Add `mustChangePassword` to the Account model and safe session/account DTO. Add authenticated `POST /api/auth/me/change-password` with `{ "currentPassword": "123456", "newPassword": "..." }`.

It verifies the current password, enforces the normal password validation, writes a new hash/salt, clears `mustChangePassword`, revokes existing refresh sessions except the current session as supported by the current session model, and records an audit event. The initial-password UI always asks for a new password and confirmation; it never displays `123456` after login.

### Self personal profile

Add authenticated `GET /api/hr/employee-profiles/me` (existing) and `PATCH /api/hr/employee-profiles/me/personal` (new). The patch resolves the profile from `req.auth.accountId`, not from a URL profile ID.

The new validator accepts only staff-owned fields from the ownership table. It rejects company fields, account/access fields, and compensation fields. The service loads sensitive fields only for the caller's own profile, updates the allowed values, sets `isProfileUpdated = true` only after the required first-login fields pass validation, and records an audit event without writing PII values to audit metadata.

Required completion fields: `phoneNumber`, `address`, `personalEmail`, `emergencyContact.name`, `emergencyContact.phone`, and `emergencyContact.relation`. Identity, dependant, and bank information remain optional unless a later HR policy explicitly requires them.

### Server-side onboarding gate

Add a centralized post-authentication gate for business routes. It returns a stable `ACCOUNT_SETUP_REQUIRED` error instead of relying on frontend routing alone.

| Account state                                   | Allowed authenticated actions                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `mustChangePassword = true`                     | change own password, logout, refresh session, read own account/setup status             |
| password changed and `isProfileUpdated = false` | read/patch own personal profile, logout, refresh session, read own account/setup status |
| ready                                           | normal permission and scope checks                                                      |

The login/session response includes `mustChangePassword` and a lightweight `profileSetupRequired` derived from the linked HR profile. These flags guide FE redirects but do not replace the server gate.

## Frontend flow

1. Replace the current People-page Add Employee dialog with **Create staff**. It submits one provisioning mutation; it does not collect personal fields or password.
2. Extend auth session state with `mustChangePassword` and `profileSetupRequired`.
3. After login, redirect in this order: `/auth/change-initial-password`, then `/profile/complete`, then the intended route.
4. Add an authenticated initial-password page backed by `POST /api/auth/me/change-password`.
5. Replace the fake ProfilePage data with `GET /api/hr/employee-profiles/me`. Add a first-login completion page backed by `PATCH /api/hr/employee-profiles/me/personal`.
6. Add a route guard that mirrors the server state and restricts navigation during setup. The API remains the authority.
7. In the HR directory, expose onboarding state (`PASSWORD_CHANGE_REQUIRED`, `PROFILE_INCOMPLETE`, `READY`) and allow HR to view company data. HR cannot edit personal fields through this flow.

## Error and retry behavior

- Duplicate email or employee code: return a field-level conflict; create nothing.
- Invalid team/department or assignment outside HR scope: return validation/forbidden; create nothing.
- Provisioning transaction failure: show a single retryable error; do not compensate with manual partial cleanup.
- Initial password incorrect or weak: keep the staff locked in the password-change route.
- Personal-profile validation failure: show only field errors; retain entered values locally.
- A `ACCOUNT_SETUP_REQUIRED` API response redirects the FE to the matching setup route and preserves no protected business action.

## Verification

- Unit tests for the provisioning transaction success and rollback cases.
- Unit tests for employee-code login with `mustChangePassword`.
- Unit tests for change-password state transition and session revocation behavior.
- Contract tests for self-profile whitelist: own personal fields accepted; HR/company/compensation fields rejected.
- API gate tests for every setup state.
- FE tests for redirect order and self-profile submission.
- Narrow lint/build checks in both repositories after implementation.

## Out of scope

- Email invitations or password-reset links.
- A second `username` identifier.
- Placeholder attendance, schedule assignment, leave request, overtime, or payroll records.
- A new leave entitlement policy.
