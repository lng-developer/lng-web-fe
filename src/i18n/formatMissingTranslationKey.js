const structuralKeyParts = new Set([
  'actions',
  'detail',
  'errors',
  'fields',
  'filters',
  'help',
  'helperText',
  'label',
  'messages',
])

export function formatMissingTranslationKey(key) {
  const parts = String(key).split('.')
  const value = [...parts].reverse().find((part) => !structuralKeyParts.has(part)) || parts.at(-1)

  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase())
}
