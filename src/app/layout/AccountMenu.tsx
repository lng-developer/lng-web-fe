import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { IdcardOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Button, Dropdown } from 'antd'

import { type CurrentAccount, logout } from '@/features/auth/api/authApi'
import { loadEmployeeAvatar, loadMyEmployeeProfile } from '@/features/hr/api/hrApi'

import styles from './AppShell.module.scss'

const loadMyProfileModal = () => import('./MyProfileModal')
const MyProfileModal = lazy(() =>
  loadMyProfileModal().then(({ MyProfileModal }) => ({ default: MyProfileModal })),
)

export function AccountMenu({ account }: { account: CurrentAccount }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profile = useQuery({
    queryKey: ['hr', 'employee-profiles', 'me', account.account.id],
    queryFn: loadMyEmployeeProfile,
  })
  const avatar = useQuery({
    queryKey: [
      'hr',
      'employee-profiles',
      'me',
      'avatar',
      account.account.id,
      profile.data?.avatarAssetId,
    ],
    queryFn: () => loadEmployeeAvatar(profile.data!.avatarUrl!),
    enabled: Boolean(profile.data?.avatarAssetId && profile.data.avatarUrl),
  })

  const accessSummary = useMemo(() => {
    const roles = [
      ...new Set([...account.roles, ...account.scopes.flatMap((scope) => scope.roles)]),
    ]
    const scopes = [
      ...new Set(account.scopes.map((scope) => t(`shell.account.scopes.${scope.scopeType}`))),
    ]
    return [...roles, ...scopes].join(' \u00b7 ') || t('shell.account.noAccess')
  }, [account.roles, account.scopes, t])

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }, [navigate])

  const menuItems = useMemo(
    () => [
      { key: 'profile', icon: <IdcardOutlined />, label: t('shell.account.myProfile') },
      { type: 'divider' as const },
      {
        key: 'logout',
        danger: true,
        disabled: isLoggingOut,
        icon: <LogoutOutlined />,
        label: t('shell.logout'),
      },
    ],
    [isLoggingOut, t],
  )

  const handleMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === 'profile') setIsProfileOpen(true)
      else void handleLogout()
    },
    [handleLogout],
  )

  return (
    <div className={styles.accountWrapper}>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: menuItems,
          onClick: handleMenuClick,
        }}
        popupRender={(menu) => (
          <div className={styles.accountPopup}>
            <div className={styles.accountSummary}>
              <strong>{account.account.email}</strong>
              <span>{accessSummary}</span>
            </div>
            {menu}
          </div>
        )}
      >
        <Button
          className={styles.accountButton}
          type="text"
          aria-label={t('shell.account.openMenu')}
          loading={isLoggingOut}
          onFocus={() => void loadMyProfileModal()}
          onMouseEnter={() => void loadMyProfileModal()}
        >
          <Avatar
            size={30}
            src={
              avatar.data ?? (!profile.data?.avatarAssetId ? profile.data?.avatarUrl : undefined)
            }
            icon={<UserOutlined />}
          />
        </Button>
      </Dropdown>
      {isProfileOpen && (
        <Suspense fallback={null}>
          <MyProfileModal open onClose={() => setIsProfileOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
