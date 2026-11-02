import { beforeEach, describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api'
import i18n from '@/shared/i18n/i18n'
import {
  formatProductionError,
  formatSlotLabel,
  validateScaledOutputFile,
} from '@/features/portal/production/utils/productionFeedback'

describe('productionFeedback', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi')
  })

  describe('formatSlotLabel', () => {
    it('formats preset slot keys to human readable labels in Vietnamese', async () => {
      await i18n.changeLanguage('vi')
      expect(formatSlotLabel('FRONT')).toBe('Mặt trước')
      expect(formatSlotLabel('BACK')).toBe('Mặt sau')
      expect(formatSlotLabel('LEFT_CHEST')).toBe('Ngực trái')
      expect(formatSlotLabel('LEFT_SLEEVE')).toBe('Tay trái')
      expect(formatSlotLabel('RIGHT_SLEEVE')).toBe('Tay phải')
    })

    it('formats preset slot keys to human readable labels in English', async () => {
      await i18n.changeLanguage('en')
      expect(formatSlotLabel('FRONT')).toBe('Front')
      expect(formatSlotLabel('BACK')).toBe('Back')
      expect(formatSlotLabel('LEFT_CHEST')).toBe('Left chest')
      expect(formatSlotLabel('LEFT_SLEEVE')).toBe('Left sleeve')
      expect(formatSlotLabel('RIGHT_SLEEVE')).toBe('Right sleeve')
    })

    it('formats custom slot keys and preserves provided slotLabel', () => {
      expect(formatSlotLabel('CUSTOM_VIEN_CO', 'Viền cổ')).toBe('Viền cổ')
      expect(formatSlotLabel('CUSTOM_VIEN_CO')).toBe('VIEN CO')
    })
  })

  describe('validateScaledOutputFile', () => {
    it('accepts valid scale files under 20MB', () => {
      const validPng = new File(['hello'], 'front.png', { type: 'image/png' })
      expect(validateScaledOutputFile(validPng)).toEqual({ valid: true })

      const validPsd = new File(['hello'], 'front.psd')
      expect(validateScaledOutputFile(validPsd)).toEqual({ valid: true })
    })

    it('rejects unsupported file extensions with i18n message', async () => {
      await i18n.changeLanguage('vi')
      const exeFile = new File(['evil'], 'script.exe')
      const result = validateScaledOutputFile(exeFile)
      expect(result.valid).toBe(false)
      expect(result.errorTitle).toBe('Định dạng file không hỗ trợ')
      expect(result.errorDescription).toContain('.png, .psd, .jpg, .jpeg, .pdf')

      await i18n.changeLanguage('en')
      const resultEn = validateScaledOutputFile(exeFile)
      expect(resultEn.errorTitle).toBe('Unsupported file format')
    })

    it('rejects files larger than 20MB with i18n message', async () => {
      await i18n.changeLanguage('vi')
      const largeFile = new File([''], 'huge.png')
      Object.defineProperty(largeFile, 'size', { value: 25 * 1024 * 1024 })
      const result = validateScaledOutputFile(largeFile)
      expect(result.valid).toBe(false)
      expect(result.errorTitle).toBe('File vượt quá kích thước cho phép')
      expect(result.errorDescription).toContain('25.0 MB')
      expect(result.errorDescription).toContain('20MB')

      await i18n.changeLanguage('en')
      const resultEn = validateScaledOutputFile(largeFile)
      expect(resultEn.errorTitle).toBe('File size exceeds limit')
    })
  })

  describe('formatProductionError', () => {
    it('formats missing required scaled outputs with slot details in Vietnamese', async () => {
      await i18n.changeLanguage('vi')
      const error = new ApiError('Conflict', {
        status: 409,
        rawMessage: 'All required scaled outputs must be uploaded before QC submit',
        details: { missingSlots: ['FRONT', 'BACK'] },
      })
      const result = formatProductionError(error)
      expect(result.title).toBe('Chưa thể gửi QC')
      expect(result.description).toContain('Mặt trước, Mặt sau')
    })

    it('formats missing required scaled outputs with slot details in English', async () => {
      await i18n.changeLanguage('en')
      const error = new ApiError('Conflict', {
        status: 409,
        rawMessage: 'All required scaled outputs must be uploaded before QC submit',
        details: { missingSlots: ['FRONT', 'BACK'] },
      })
      const result = formatProductionError(error)
      expect(result.title).toBe('Cannot submit for QC')
      expect(result.description).toContain('Front, Back')
    })

    it('formats file size too large error', async () => {
      await i18n.changeLanguage('vi')
      const error = new ApiError('Payload too large', {
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
        rawMessage: 'File size too large. Got 22000000. Maximum is 10485760',
      })
      const result = formatProductionError(error)
      expect(result.title).toBe('File vượt quá kích thước cho phép')
      expect(result.description).toContain('20MB')
    })

    it('formats existing slotKey conflict', async () => {
      await i18n.changeLanguage('vi')
      const error = new ApiError('Conflict', {
        status: 409,
        rawMessage: 'Production file check already exists for slotKey',
        details: { slotKey: 'FRONT' },
      })
      const result = formatProductionError(error)
      expect(result.title).toBe('Vị trí in đã tồn tại')
      expect(result.description).toContain('"Mặt trước"')
    })

    it('formats concurrent modification conflict', async () => {
      await i18n.changeLanguage('vi')
      const error = new ApiError('Conflict', {
        status: 409,
        rawMessage: 'Production task changed concurrently',
      })
      const result = formatProductionError(error)
      expect(result.title).toBe('Dữ liệu vừa được cập nhật')
      expect(result.description).toContain('làm mới danh sách')
    })

    it('formats QC passed mutation lock', async () => {
      await i18n.changeLanguage('vi')
      const error = new ApiError('Conflict', {
        status: 409,
        rawMessage: 'Scaled outputs cannot be changed after QC has passed',
      })
      const result = formatProductionError(error)
      expect(result.title).toBe('Không thể chỉnh sửa file scale')
      expect(result.description).toContain('duyệt QC Đạt')
    })

    it('formats missing QC decision for slots', async () => {
      await i18n.changeLanguage('vi')
      const error = new ApiError('Conflict', {
        status: 409,
        rawMessage: 'QC decision is required for every scaled output',
      })
      const result = formatProductionError(error)
      expect(result.title).toBe('Chưa hoàn tất đánh giá QC')
      expect(result.description).toContain('Đạt (Pass) hoặc Từ chối (Reject)')
    })

    it('includes requestId for server errors', async () => {
      await i18n.changeLanguage('vi')
      const error = new ApiError('Internal Error', {
        status: 500,
        requestId: 'req-999',
      })
      const result = formatProductionError(error)
      expect(result.title).toBe('Lỗi máy chủ')
      expect(result.description).toContain('req-999')
    })
  })
})
