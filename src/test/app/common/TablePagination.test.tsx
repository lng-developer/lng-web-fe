import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { CommonTablePagination } from '@/app/common/TablePagination'
import i18n from '@/shared/i18n/i18n'

describe('CommonTablePagination', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('navigates to the page entered in Jump to page', () => {
    const onChange = vi.fn()

    render(
      <AppProviders>
        <CommonTablePagination
          pagination={{ current: 1, pageSize: 10, total: 100, showQuickJumper: true, onChange }}
        />
      </AppProviders>,
    )

    const jumpInput = screen.getByRole('spinbutton', { name: 'Jump to page' })
    fireEvent.change(jumpInput, { target: { value: '6' } })
    fireEvent.keyDown(jumpInput, { key: 'Enter', code: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(6, 10)
  })

  it('keeps the jump value in sync when the current page changes externally', () => {
    const onChange = vi.fn()
    const view = render(
      <AppProviders>
        <CommonTablePagination
          pagination={{ current: 1, pageSize: 10, total: 100, showQuickJumper: true, onChange }}
        />
      </AppProviders>,
    )

    view.rerender(
      <AppProviders>
        <CommonTablePagination
          pagination={{ current: 4, pageSize: 10, total: 100, showQuickJumper: true, onChange }}
        />
      </AppProviders>,
    )

    expect(screen.getByRole('spinbutton', { name: 'Jump to page' })).toHaveValue('4')
  })
})
