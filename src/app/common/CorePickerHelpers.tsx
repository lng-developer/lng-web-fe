/* eslint-disable react-refresh/only-export-components -- các helper picker được gom chung có chủ đích. */
import type { CSSProperties, ReactNode } from 'react'
import { useContext } from 'react'
import { ConfigProvider, theme as antdTheme, type ThemeConfig } from 'antd'
import type { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'

import { ThemePreferenceContext } from '@/shared/theme/themeContext'

// Tạo token Ant Design riêng cho picker theo giao diện sáng/tối của ứng dụng.
export function createCorePickerTheme(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      borderRadius: 6,
      colorBgContainer: isDark ? '#141A22' : '#ffffff',
      colorBorder: isDark ? '#3A3B4D' : '#E8EBF1',
      colorPrimary: '#316AFF',
      colorPrimaryActive: '#2755cc',
      colorPrimaryHover: '#2a5ad9',
      colorText: isDark ? '#E5E7EB' : '#1F2A44',
      colorTextPlaceholder: isDark ? '#94A3B8' : '#97A1C0',
      controlHeight: 40,
      fontSize: 14,
    },
    components: {
      DatePicker: {
        activeBorderColor: '#316AFF',
        activeShadow: '0 0.1rem 0.3rem 0 rgba(49, 106, 255, 0.2), 0 0 0 1px #316AFF',
        cellActiveWithRangeBg: isDark ? '#1F2937' : '#eaf0ff',
        cellHeight: 28,
        cellHoverBg: isDark ? '#1F2937' : '#eaf0ff',
        cellHoverWithRangeBg: isDark ? '#1F2937' : '#eaf0ff',
        cellRangeBorderColor: '#316AFF',
        cellWidth: 38,
        hoverBorderColor: '#316AFF',
        inputFontSize: 14,
        paddingBlock: 8,
        paddingInline: 18,
      },
    },
  }
}

// Popup được render qua portal nên cần style global theo trạng thái sáng/tối.
function CorePickerGxonStyles({ isDark }: Readonly<{ isDark: boolean }>) {
  const elevatedBackground = isDark ? '#111827' : '#FBFCFD'
  const border = isDark ? '#3A3B4D' : '#E8EBF1'
  const text = isDark ? '#E5E7EB' : '#1F2A44'
  const mutedText = isDark ? '#94A3B8' : '#97A1C0'
  const rangeBackground = isDark ? '#1F2937' : '#EAF0FF'

  return (
    <style>{`
      .core-picker.ant-picker { padding-inline: 19px; }
      .core-picker.ant-picker .ant-picker-input > input { color: ${text}; font-size: 14px; font-weight: 500; }
      .core-picker.ant-picker .ant-picker-suffix, .core-picker.ant-picker .ant-picker-clear { color: ${mutedText}; }
      .core-picker-popup.ant-picker-dropdown .ant-picker-panel-container { background: ${elevatedBackground}; border: 1px solid ${border}; border-radius: 6px; box-shadow: 0 8px 24px rgba(0, 0, 0, ${isDark ? '0.34' : '0.12'}); overflow: hidden; }
      .core-picker-popup.ant-picker-dropdown { min-width: 0 !important; width: fit-content !important; }
      .core-picker-popup--compact-calendar.ant-picker-dropdown .ant-picker-panel-container { width: 308px; }
      .core-time-picker-popup .ant-picker-panel-container { width: fit-content; }
      .core-picker-popup .ant-picker-panel { border: 0; }
      .core-picker-popup--custom-header .ant-picker-header { display: none; }
      .core-picker-popup--custom-header .ant-picker-body { padding-bottom: 0; }
      .core-picker-panel-header { align-items: center; display: grid; gap: 6px; grid-template-columns: 24px 1fr 1fr 24px; padding: 8px 10px 2px; }
      .core-picker-panel-header button { background: transparent; border: 0; color: ${mutedText}; cursor: pointer; font-size: 24px; line-height: 1; padding: 0; }
      .core-picker-panel-header select { appearance: auto; background: ${rangeBackground}; border: 0; border-radius: 4px; color: ${mutedText}; font-size: 13px; font-weight: 600; height: 32px; padding: 0 12px; }
      .core-picker-popup .ant-picker-content th { color: ${text}; font-size: 12px; font-weight: 600; padding-bottom: 10px; }
      .core-picker-popup .ant-picker-cell { color: ${text}; font-size: 13px; }
      .core-picker-popup .ant-picker-cell .ant-picker-cell-inner { border-radius: 50%; }
      .core-picker-popup .ant-picker-cell:hover .ant-picker-cell-inner { background: ${rangeBackground}; border-color: #316AFF; }
      .core-picker-popup .ant-picker-cell-in-view.ant-picker-cell-today .ant-picker-cell-inner { background: #316AFF; color: #FFFFFF; }
      .core-picker-popup .ant-picker-cell-in-view.ant-picker-cell-today .ant-picker-cell-inner::before { border: 0; }
      .core-picker-popup .ant-picker-cell-selected .ant-picker-cell-inner, .core-picker-popup .ant-picker-cell-range-start .ant-picker-cell-inner, .core-picker-popup .ant-picker-cell-range-end .ant-picker-cell-inner { background: #316AFF; color: #ffffff; }
      .core-picker-popup .ant-picker-cell-in-range::before { background: ${rangeBackground}; }
      .core-picker-popup .ant-picker-time-panel-cell-selected .ant-picker-time-panel-cell-inner { background: ${rangeBackground}; color: #316AFF; font-weight: 600; }
      .core-picker-popup .ant-picker-footer { border-top-color: ${border}; }
    `}</style>
  )
}

// Bọc picker bằng ConfigProvider riêng để token và popup luôn đồng bộ với app.
export function CorePickerTheme({ children }: Readonly<{ children: ReactNode }>) {
  const isDark = useContext(ThemePreferenceContext)?.resolved === 'dark'

  return (
    <ConfigProvider theme={createCorePickerTheme(isDark)}>
      <CorePickerGxonStyles isDark={isDark} />
      {children}
    </ConfigProvider>
  )
}

const monthIndexes = Array.from({ length: 12 }, (_, index) => index)

// Header thay thế header mặc định để người dùng chọn nhanh tháng và năm.
export function CorePickerPanelHeader({ value, onChange }: Readonly<{ value: Dayjs; onChange: (value: Dayjs) => void }>) {
  const { t } = useTranslation()
  const years = Array.from({ length: 11 }, (_, index) => value.year() - 5 + index)

  return (
    <div className="core-picker-panel-header">
      <button aria-label={t('foundation.controls.previousMonth')} type="button" onClick={() => onChange(value.subtract(1, 'month'))}>‹</button>
      <select aria-label={t('foundation.controls.month')} value={value.month()} onChange={(event) => onChange(value.month(Number(event.target.value)))}>
        {monthIndexes.map((monthIndex) => <option key={monthIndex} value={monthIndex}>{value.month(monthIndex).format('MMMM')}</option>)}
      </select>
      <select aria-label={t('foundation.controls.year')} value={value.year()} onChange={(event) => onChange(value.year(Number(event.target.value)))}>
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
      <button aria-label={t('foundation.controls.nextMonth')} type="button" onClick={() => onChange(value.add(1, 'month'))}>›</button>
    </div>
  )
}

// Style khung input và popup được truyền trực tiếp vào các component Ant Design.
export function getCorePickerRootStyle(isDark: boolean): CSSProperties {
  return {
    backgroundColor: isDark ? '#141A22' : '#ffffff',
    borderColor: isDark ? '#3A3B4D' : '#E8EBF1',
    borderRadius: 6,
    minHeight: 40,
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
  }
}

export function getCorePickerPopupStyle(isDark: boolean): CSSProperties {
  return {
    backgroundColor: isDark ? '#111827' : '#FBFCFD',
    border: `1px solid ${isDark ? '#3A3B4D' : '#E8EBF1'}`,
    borderRadius: 6,
    boxShadow: `0 8px 24px rgba(0, 0, 0, ${isDark ? '0.34' : '0.12'})`,
  }
}
