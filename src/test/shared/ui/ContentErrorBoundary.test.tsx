import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ContentErrorBoundary } from '@/shared/ui/ContentErrorBoundary'

function HealthyChild(): ReactNode {
  return <div>Healthy content</div>
}

function BrokenChild({ message = 'Boom!' }: { message?: string }): ReactNode {
  throw new Error(message)
}

describe('ContentErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  it('renders children normally when no error occurs', () => {
    render(
      <ContentErrorBoundary>
        <HealthyChild />
      </ContentErrorBoundary>,
    )

    expect(screen.getByText('Healthy content')).toBeInTheDocument()
  })

  it('catches errors when children throw, displaying error message and retry button', () => {
    const onCatch = vi.fn()

    render(
      <ContentErrorBoundary onCatch={onCatch}>
        <BrokenChild message="Something crashed" />
      </ContentErrorBoundary>,
    )

    expect(screen.getByText('Không thể tải nội dung')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Đã xảy ra lỗi không mong muốn khi hiển thị khu vực này. Bạn có thể thử tải lại.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument()
    expect(screen.queryByText('Healthy content')).not.toBeInTheDocument()
    expect(onCatch).toHaveBeenCalledTimes(1)
    expect(onCatch.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onCatch.mock.calls[0][0].message).toBe('Something crashed')
  })

  it('displays custom title and description when provided', () => {
    render(
      <ContentErrorBoundary
        title="Tiêu đề lỗi tùy chỉnh"
        description="Mô tả lỗi chi tiết cho người dùng"
      >
        <BrokenChild />
      </ContentErrorBoundary>,
    )

    expect(screen.getByText('Tiêu đề lỗi tùy chỉnh')).toBeInTheDocument()
    expect(screen.getByText('Mô tả lỗi chi tiết cho người dùng')).toBeInTheDocument()
  })

  it('resets state and attempts re-render when clicking retry button', () => {
    let shouldThrow = true

    function FlakyChild(): ReactNode {
      if (shouldThrow) {
        throw new Error('Temporary failure')
      }
      return <div>Recovered successfully</div>
    }

    render(
      <ContentErrorBoundary>
        <FlakyChild />
      </ContentErrorBoundary>,
    )

    expect(screen.getByText('Không thể tải nội dung')).toBeInTheDocument()
    expect(screen.queryByText('Recovered successfully')).not.toBeInTheDocument()

    // Fix the error condition and click retry
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /thử lại/i }))

    expect(screen.queryByText('Không thể tải nội dung')).not.toBeInTheDocument()
    expect(screen.getByText('Recovered successfully')).toBeInTheDocument()
  })

  it('supports custom fallback element', () => {
    render(
      <ContentErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error View</div>}>
        <BrokenChild />
      </ContentErrorBoundary>,
    )

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.getByText('Custom Error View')).toBeInTheDocument()
    expect(screen.queryByText('Không thể tải nội dung')).not.toBeInTheDocument()
  })

  it('supports custom fallback function receiving error and reset callback', () => {
    let shouldThrow = true

    function FlakyChild(): ReactNode {
      if (shouldThrow) {
        throw new Error('Dynamic crash')
      }
      return <div>Dynamic content restored</div>
    }

    render(
      <ContentErrorBoundary
        fallback={(error, reset) => (
          <div>
            <span data-testid="error-message">{error.message}</span>
            <button type="button" onClick={reset}>
              Custom Reset
            </button>
          </div>
        )}
      >
        <FlakyChild />
      </ContentErrorBoundary>,
    )

    expect(screen.getByTestId('error-message')).toHaveTextContent('Dynamic crash')
    expect(screen.getByRole('button', { name: 'Custom Reset' })).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Custom Reset' }))

    expect(screen.getByText('Dynamic content restored')).toBeInTheDocument()
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
  })
})
