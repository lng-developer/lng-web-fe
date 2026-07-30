import type { ReactNode } from 'react'
import { Flex, Typography } from 'antd'

const { Paragraph, Title } = Typography

export interface PageHeaderProps {
  readonly title: string
  readonly description?: string
  readonly actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Flex justify="space-between" align="flex-start" gap={24}>
      <div>
        <Title level={1}>{title}</Title>
        {description && <Paragraph type="secondary">{description}</Paragraph>}
      </div>
      {actions}
    </Flex>
  )
}
