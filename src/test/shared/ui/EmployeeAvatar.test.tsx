import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/media', () => ({
  AuthenticatedMediaImage: ({ alt, onError }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={alt} onError={onError} />
  ),
}))

import { EmployeeAvatar } from '@/shared/ui/EmployeeAvatar'

describe('EmployeeAvatar', () => {
  afterEach(cleanup)

  it('renders authenticated media and falls back to initials', () => {
    const view = render(
      <EmployeeAvatar name="Nguyen Van An" avatarUrl="/api/hr/employee-profiles/p1/avatar" />,
    )

    expect(screen.getByRole('img', { name: 'Nguyen Van An' })).toBeVisible()

    view.rerender(<EmployeeAvatar name="Nguyen Van An" avatarUrl={null} />)
    expect(screen.getByText('VA')).toBeVisible()
  })

  it('falls back to initials when authenticated media fails', () => {
    render(<EmployeeAvatar name="Nguyen Van An" avatarUrl="/api/hr/employee-profiles/p1/avatar" />)

    fireEvent.error(screen.getByRole('img', { name: 'Nguyen Van An' }))

    expect(screen.queryByRole('img', { name: 'Nguyen Van An' })).not.toBeInTheDocument()
    expect(screen.getByText('VA')).toBeVisible()
  })
})
