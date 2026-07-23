const MONGO_OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i

function readableText(value) {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  return text && !MONGO_OBJECT_ID_PATTERN.test(text) ? text : ''
}

export function getPersonDisplayName(person, fallback = '—') {
  if (typeof person === 'string') return readableText(person) || fallback
  if (!person || typeof person !== 'object') return fallback

  const profiles = [
    person,
    person.profile,
    person.userProfile,
    person.employeeProfile,
    person.account?.profile,
    person.account,
  ].filter(Boolean)

  for (const profile of profiles) {
    for (const field of ['fullName', 'displayName', 'name']) {
      const label = readableText(profile[field])
      if (label) return label
    }
  }

  for (const profile of profiles) {
    for (const field of ['employeeCode', 'email']) {
      const label = readableText(profile[field])
      if (label) return label
    }
  }

  return fallback
}
