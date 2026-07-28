import {
  getCurrentUserDisplayName,
  getCurrentUserInitials,
  getCurrentUserRole,
} from '../../auth/utils/currentUser.js'

function firstNonEmptyValue(values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() ?? ''
}

function resolveDepartment(user) {
  if (typeof user?.department === 'string') {
    return user.department
  }

  return firstNonEmptyValue([
    user?.department?.name,
    user?.employeeProfile?.department?.name,
    user?.account?.department,
  ])
}

export function buildProfileDetails(user) {
  const displayName = getCurrentUserDisplayName(user)
  const email = firstNonEmptyValue([
    user?.employeeProfile?.workEmail,
    user?.account?.email,
    user?.email,
  ])
  const username = firstNonEmptyValue([
    user?.account?.username,
    user?.username,
    user?.account?.email,
    user?.email,
    email,
  ])

  return {
    displayName,
    email,
    personalEmail: firstNonEmptyValue([user?.employeeProfile?.personalEmail, email]),
    phone: firstNonEmptyValue([user?.employeeProfile?.phone, user?.phone, user?.account?.phone]),
    birthday: firstNonEmptyValue([
      user?.employeeProfile?.dateOfBirth,
      user?.birthday,
      user?.dateOfBirth,
    ]),
    citizenId: firstNonEmptyValue([
      user?.employeeProfile?.citizenId,
      user?.citizenId,
      user?.identityNumber,
    ]),
    address: firstNonEmptyValue([
      user?.employeeProfile?.address,
      user?.address,
    ]),
    username,
    role: getCurrentUserRole(user),
    department: resolveDepartment(user),
    initials: getCurrentUserInitials(displayName || email),
    status:
      user?.account?.isActive === true
        ? 'active'
        : user?.account?.isActive === false
          ? 'inactive'
          : '',
    createdAt: firstNonEmptyValue([user?.account?.createdAt, user?.createdAt]),
    createdBy: firstNonEmptyValue([
      user?.account?.createdBy,
      user?.account?.createdByName,
      user?.createdBy,
      user?.createdByName,
    ]),
  }
}
