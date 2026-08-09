import { useState } from 'react'
import { Avatar, type AvatarProps } from 'antd'

import { AuthenticatedMediaImage } from '@/shared/media'

export type EmployeeAvatarProps = Pick<AvatarProps, 'size' | 'className'> & {
  name?: string | null
  avatarUrl?: string | null
}

export function EmployeeAvatar({ name, avatarUrl, size = 32, className }: EmployeeAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string>()
  const label = name?.trim() || '?'
  const initials = label
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <Avatar
      className={className}
      size={size}
      src={
        avatarUrl && failedUrl !== avatarUrl ? (
          <AuthenticatedMediaImage
            alt={label}
            downloadUrl={avatarUrl}
            onError={() => setFailedUrl(avatarUrl)}
          />
        ) : undefined
      }
    >
      {initials}
    </Avatar>
  )
}
