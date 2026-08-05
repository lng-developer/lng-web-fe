import { describe, expect, it } from 'vitest'

import { parseJsonObject } from '@/features/portal/vendors/pages/vendorEditorHelpers'

describe('parseJsonObject', () => {
  it.each(['[]', '[{"key":"value"}]', 'null', 'true', '42', '"text"'])(
    'rejects non-object JSON: %s',
    (value) => {
      expect(() => parseJsonObject(value)).toThrow()
    },
  )

  it('accepts an object and treats blank input as omitted', () => {
    expect(parseJsonObject('{"key":"value"}')).toEqual({ key: 'value' })
    expect(parseJsonObject('  ')).toBeUndefined()
  })
})
