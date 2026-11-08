import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/media', () => ({
  AuthenticatedMediaImage: ({ alt, onError }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={alt} onError={onError} />
  ),
}))

import { EmployeeAvatar, EmployeeIdentity } from '@/shared/ui/EmployeeAvatar'

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

  it('renders direct data uri without authenticated media wrapper', () => {
    render(<EmployeeAvatar name="Nguyen Van An" avatarUrl="data:image/png;base64,YXZhdGFy" />)

    const img = screen.getByRole('img', { name: 'Nguyen Van An' })
    expect(img).toHaveAttribute('src', 'data:image/png;base64,YXZhdGFy')
  })

  it('falls back to initials when authenticated media fails', () => {
    render(<EmployeeAvatar name="Nguyen Van An" avatarUrl="/api/hr/employee-profiles/p1/avatar" />)

    fireEvent.error(screen.getByRole('img', { name: 'Nguyen Van An' }))

    expect(screen.queryByRole('img', { name: 'Nguyen Van An' })).not.toBeInTheDocument()
    expect(screen.getByText('VA')).toBeVisible()
  })

  it.each(['/hr/default-avatar.jpg', '/portal/default-avatar.jpg'])(
    'ignores the legacy default avatar URL %s',
    (avatarUrl) => {
      render(<EmployeeAvatar name="Nguyen Van An" avatarUrl={avatarUrl} />)

      expect(screen.queryByRole('img', { name: 'Nguyen Van An' })).not.toBeInTheDocument()
      expect(screen.getByText('VA')).toBeVisible()
    },
  )
})

describe('EmployeeIdentity', () => {
  afterEach(cleanup)

  it('renders mode="code" with avatar and employee code only', () => {
    render(<EmployeeIdentity name="Truc Nguyen" employeeCode="J2617" mode="code" />)

    expect(screen.getByText('TN')).toBeVisible()
    expect(screen.getByText('J2617')).toBeVisible()
    expect(screen.queryByText('Truc Nguyen')).not.toBeInTheDocument()
  })

  it('renders mode="name" with avatar and name only', () => {
    render(<EmployeeIdentity name="Truc Nguyen" employeeCode="J2617" mode="name" />)

    expect(screen.getByText('TN')).toBeVisible()
    expect(screen.getByText('Truc Nguyen')).toBeVisible()
    expect(screen.queryByText('J2617')).not.toBeInTheDocument()
  })

  it('renders mode="inline" with avatar, name, and employee code badge', () => {
    render(<EmployeeIdentity name="Truc Nguyen" employeeCode="J2617" mode="inline" />)

    expect(screen.getByText('TN')).toBeVisible()
    expect(screen.getByText('Truc Nguyen')).toBeVisible()
    expect(screen.getByText('J2617')).toBeVisible()
  })

  it('renders mode="stacked" with avatar and subtitle/code stacked', () => {
    render(
      <EmployeeIdentity
        name="Truc Nguyen"
        employeeCode="J2617"
        mode="stacked"
        subtitle="Designer"
      />,
    )

    expect(screen.getByText('TN')).toBeVisible()
    expect(screen.getByText('Truc Nguyen')).toBeVisible()
    expect(screen.getByText('Designer')).toBeVisible()
  })
})
