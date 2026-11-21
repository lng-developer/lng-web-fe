import { describe, expect, it } from 'vitest'

import { compactParams, unwrapResponse } from '@/shared/api'

describe('api helpers', () => {
  describe('compactParams', () => {
    it('removes null, undefined and empty string values', () => {
      const params = {
        page: 1,
        limit: 20,
        search: '',
        tab: 'ALL',
        filterNull: null,
        filterUndefined: undefined,
        active: false,
        zero: 0,
      }

      const result = compactParams(params)

      expect(result).toEqual({
        page: 1,
        limit: 20,
        tab: 'ALL',
        active: false,
        zero: 0,
      })
      expect('search' in result).toBe(false)
      expect('filterNull' in result).toBe(false)
      expect('filterUndefined' in result).toBe(false)
    })

    it('returns empty object when all values are null, undefined or empty', () => {
      expect(compactParams({ a: '', b: null, c: undefined })).toEqual({})
    })
  })

  describe('unwrapResponse', () => {
    it('extracts data field when present in an ApiResponse object', () => {
      const response = { success: true, data: { items: [1, 2, 3], total: 3 } }
      expect(unwrapResponse(response)).toEqual({ items: [1, 2, 3], total: 3 })
    })

    it('returns response directly if data field is not present', () => {
      const directData = { id: 'abc', name: 'Test' }
      expect(unwrapResponse(directData)).toEqual(directData)
    })

    it('handles primitive values safely', () => {
      expect(unwrapResponse('string-token')).toBe('string-token')
      expect(unwrapResponse(null)).toBeNull()
      expect(unwrapResponse(undefined)).toBeUndefined()
    })
  })
})
