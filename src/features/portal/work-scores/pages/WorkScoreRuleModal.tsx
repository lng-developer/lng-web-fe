import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckOutlined,
  EditOutlined,
  PictureOutlined,
  PlusOutlined,
  ScissorOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Form,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

import { useFeedbackToast } from '@/shared/ui'
import {
  upsertWorkScoreRule,
  type WorkScoreRule,
  type WorkScoreRuleFormInput,
  type WorkScoreRuleInput,
  type WorkScoreSourceType,
} from '../api/workScoreApi'
import { workScoreKeys } from '../api/workScoreKeys'
import { useWorkScoreRulesQuery } from '../hooks'

const RULE_TASK_TYPES = ['PSD_TEMPLATE', 'MOCKUP', 'PNG_ASSET', 'IDEA', 'CLONE']
const RULE_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
const SCALE_DIFFICULTIES = ['NORMAL', 'HARD', 'SPECIAL']
const RULE_STATUSES = ['ACTIVE', 'INACTIVE']

function getPriorityColor(priority?: string | null) {
  switch (priority) {
    case 'URGENT':
      return 'red'
    case 'HIGH':
      return 'orange'
    case 'NORMAL':
      return 'blue'
    case 'LOW':
      return 'default'
    default:
      return 'default'
  }
}

function getDifficultyColor(level?: string | null) {
  switch (level) {
    case 'SPECIAL':
      return 'purple'
    case 'HARD':
      return 'orange'
    case 'NORMAL':
      return 'blue'
    default:
      return 'default'
  }
}

function normalizeRuleInput(
  input: WorkScoreRuleFormInput,
  sourceType: WorkScoreSourceType,
): WorkScoreRuleInput {
  const common = {
    sourceType,
    points: input.points,
    status: input.status,
  }
  if (sourceType === 'DESIGN_SUBMISSION') {
    return {
      ...common,
      taskType: input.taskType || null,
      priority: input.priority || null,
      scaleDifficultyLevel: null,
    }
  }
  return {
    ...common,
    taskType: null,
    priority: null,
    scaleDifficultyLevel: input.scaleDifficultyLevel || null,
  }
}

interface WorkScoreRuleModalProps {
  readonly open: boolean
  readonly onClose: () => void
}

export function WorkScoreRuleModal({ open, onClose }: WorkScoreRuleModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useFeedbackToast()
  const [activeTab, setActiveTab] = useState<WorkScoreSourceType>('DESIGN_SUBMISSION')
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  const [designForm] = Form.useForm<WorkScoreRuleFormInput>()
  const [scaleForm] = Form.useForm<WorkScoreRuleFormInput>()

  const rules = useWorkScoreRulesQuery(open)

  const designRules = useMemo(
    () => (rules.data ?? []).filter((r) => r.sourceType === 'DESIGN_SUBMISSION'),
    [rules.data],
  )
  const scaleRules = useMemo(
    () => (rules.data ?? []).filter((r) => r.sourceType === 'PRODUCTION_SCALE'),
    [rules.data],
  )

  const ruleMutation = useMutation({
    mutationFn: (input: { values: WorkScoreRuleFormInput; sourceType: WorkScoreSourceType }) =>
      upsertWorkScoreRule(normalizeRuleInput(input.values, input.sourceType)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...workScoreKeys.all, 'rules'] })
      toast('success', t('portal.workScores.updated'))
      handleCancelEdit()
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : t('portal.workScores.actionFailed'))
    },
  })

  const handleCancelEdit = useCallback(() => {
    setEditingRuleId(null)
    designForm.resetFields()
    scaleForm.resetFields()
    designForm.setFieldsValue({ status: 'ACTIVE' })
    scaleForm.setFieldsValue({ status: 'ACTIVE' })
  }, [designForm, scaleForm])

  const handleEdit = useCallback(
    (rule: WorkScoreRule) => {
      setEditingRuleId(rule.id)
      if (rule.sourceType === 'DESIGN_SUBMISSION') {
        designForm.setFieldsValue({
          taskType: rule.taskType,
          priority: rule.priority,
          points: rule.points,
          status: rule.status,
        })
      } else {
        scaleForm.setFieldsValue({
          scaleDifficultyLevel: rule.scaleDifficultyLevel,
          points: rule.points,
          status: rule.status,
        })
      }
    },
    [designForm, scaleForm],
  )

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTab(key as WorkScoreSourceType)
      handleCancelEdit()
    },
    [handleCancelEdit],
  )

  const sourceLabel = useCallback(
    (value: string) => t(`portal.workScores.sources.${value}`, { defaultValue: value }),
    [t],
  )
  const taskTypeLabel = useCallback(
    (value?: string | null) =>
      value ? t(`portal.workScores.taskTypes.${value}`, { defaultValue: value }) : '-',
    [t],
  )
  const scaleDifficultyLabel = useCallback(
    (value?: string | null) =>
      value ? t(`portal.workScores.scaleDifficulties.${value}`, { defaultValue: value }) : '-',
    [t],
  )
  const priorityLabel = useCallback(
    (value?: string | null) =>
      value ? t(`portal.workScores.priorities.${value}`, { defaultValue: value }) : '-',
    [t],
  )
  const statusLabel = useCallback(
    (value: string) => t(`portal.workScores.statuses.${value}`, { defaultValue: value }),
    [t],
  )

  const designColumns: TableColumnsType<WorkScoreRule> = useMemo(
    () => [
      {
        title: t('portal.workScores.rules.taskType'),
        key: 'taskType',
        width: '28%',
        render: (_, row) => (
          <Tag color="blue" style={{ fontWeight: 500 }}>
            {taskTypeLabel(row.taskType)}
          </Tag>
        ),
      },
      {
        title: t('portal.workScores.rules.priority'),
        key: 'priority',
        width: '24%',
        render: (_, row) =>
          row.priority ? (
            <Tag color={getPriorityColor(row.priority)}>{priorityLabel(row.priority)}</Tag>
          ) : (
            <Typography.Text type="secondary">
              {t('portal.workScores.rules.allPriorities')}
            </Typography.Text>
          ),
      },
      {
        title: t('portal.workScores.rules.points'),
        dataIndex: 'points',
        key: 'points',
        width: '24%',
        render: (pts: number) => (
          <span style={{ fontWeight: 700, color: 'var(--ant-color-primary)' }}>
            {t('portal.workScores.units.points', { count: pts })}
          </span>
        ),
      },
      {
        title: t('portal.workScores.rules.status'),
        key: 'status',
        width: '24%',
        render: (_, row) => (
          <Badge
            status={row.status === 'ACTIVE' ? 'success' : 'default'}
            text={statusLabel(row.status)}
          />
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 50,
        render: (_, row) => (
          <Tooltip title={t('portal.workScores.rules.editRule')}>
            <Button
              aria-label={t('portal.workScores.rules.editRule')}
              icon={<EditOutlined />}
              size="small"
              type="text"
              onClick={() => handleEdit(row)}
            />
          </Tooltip>
        ),
      },
    ],
    [handleEdit, priorityLabel, statusLabel, t, taskTypeLabel],
  )

  const scaleColumns: TableColumnsType<WorkScoreRule> = useMemo(
    () => [
      {
        title: t('portal.workScores.rules.scaleDifficulty'),
        key: 'scaleDifficulty',
        width: '40%',
        render: (_, row) =>
          row.scaleDifficultyLevel ? (
            <Tag color={getDifficultyColor(row.scaleDifficultyLevel)} style={{ fontWeight: 500 }}>
              {scaleDifficultyLabel(row.scaleDifficultyLevel)}
            </Tag>
          ) : (
            <Typography.Text type="secondary">
              {t('portal.workScores.rules.allDifficulties')}
            </Typography.Text>
          ),
      },
      {
        title: t('portal.workScores.rules.points'),
        dataIndex: 'points',
        key: 'points',
        width: '28%',
        render: (pts: number) => (
          <span style={{ fontWeight: 700, color: 'var(--ant-color-primary)' }}>
            {t('portal.workScores.units.points', { count: pts })}
          </span>
        ),
      },
      {
        title: t('portal.workScores.rules.status'),
        key: 'status',
        width: '24%',
        render: (_, row) => (
          <Badge
            status={row.status === 'ACTIVE' ? 'success' : 'default'}
            text={statusLabel(row.status)}
          />
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 50,
        render: (_, row) => (
          <Tooltip title={t('portal.workScores.rules.editRule')}>
            <Button
              aria-label={t('portal.workScores.rules.editRule')}
              icon={<EditOutlined />}
              size="small"
              type="text"
              onClick={() => handleEdit(row)}
            />
          </Tooltip>
        ),
      },
    ],
    [handleEdit, scaleDifficultyLabel, statusLabel, t],
  )

  const tabItems = [
    {
      key: 'DESIGN_SUBMISSION',
      label: (
        <Space size={6}>
          <PictureOutlined />
          <span>{sourceLabel('DESIGN_SUBMISSION')}</span>
          <Badge
            count={designRules.length}
            overflowCount={99}
            style={{
              backgroundColor: 'var(--ant-color-fill-secondary)',
              color: 'var(--ant-color-text-secondary)',
            }}
          />
        </Space>
      ),
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 8 }}>
          <Card
            size="small"
            style={{
              background: 'var(--ant-color-bg-container)',
              border: '1px solid var(--ant-color-border-secondary)',
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Typography.Text strong style={{ fontSize: 13 }}>
                {editingRuleId
                  ? t('portal.workScores.rules.editRule')
                  : t('portal.workScores.rules.addRule')}
              </Typography.Text>
              {editingRuleId ? (
                <Button size="small" type="link" onClick={handleCancelEdit}>
                  {t('portal.workScores.rules.cancelEdit')}
                </Button>
              ) : null}
            </div>
            <Form
              form={designForm}
              initialValues={{ status: 'ACTIVE' }}
              layout="vertical"
              onFinish={(values) =>
                ruleMutation.mutate({ values, sourceType: 'DESIGN_SUBMISSION' })
              }
            >
              <Row align="bottom" gutter={[16, 0]}>
                <Col sm={6} xs={24}>
                  <Form.Item
                    label={t('portal.workScores.rules.taskType')}
                    name="taskType"
                    rules={[{ required: true }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      options={RULE_TASK_TYPES.map((value) => ({
                        value,
                        label: taskTypeLabel(value),
                      }))}
                      placeholder={t('portal.workScores.rules.taskType')}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col sm={5} xs={24}>
                  <Form.Item
                    label={t('portal.workScores.rules.priority')}
                    name="priority"
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      allowClear
                      options={RULE_PRIORITIES.map((value) => ({
                        value,
                        label: priorityLabel(value),
                      }))}
                      placeholder={t('portal.workScores.rules.allPriorities')}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col sm={4} xs={12}>
                  <Form.Item
                    label={t('portal.workScores.rules.points')}
                    name="points"
                    rules={[{ required: true }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      placeholder={t('portal.workScores.rules.points')}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col sm={4} xs={12}>
                  <Form.Item
                    label={t('portal.workScores.rules.status')}
                    name="status"
                    rules={[{ required: true }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      options={RULE_STATUSES.map((value) => ({
                        value,
                        label: statusLabel(value),
                      }))}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col sm={5} xs={24}>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      block
                      htmlType="submit"
                      icon={editingRuleId ? <CheckOutlined /> : <PlusOutlined />}
                      loading={ruleMutation.isPending}
                      type="primary"
                    >
                      {editingRuleId
                        ? t('portal.workScores.rules.update')
                        : t('portal.workScores.rules.save')}
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Typography.Text strong style={{ fontSize: 13 }}>
                {t('portal.workScores.rules.rulesList')} ({designRules.length})
              </Typography.Text>
            </div>
            <Table
              columns={designColumns}
              dataSource={designRules}
              loading={rules.isLoading}
              locale={{
                emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />,
              }}
              pagination={
                designRules.length > 5
                  ? { pageSize: 5, size: 'small', showSizeChanger: false }
                  : false
              }
              rowKey="id"
              size="small"
            />
          </div>
        </Space>
      ),
    },
    {
      key: 'PRODUCTION_SCALE',
      label: (
        <Space size={6}>
          <ScissorOutlined />
          <span>{sourceLabel('PRODUCTION_SCALE')}</span>
          <Badge
            count={scaleRules.length}
            overflowCount={99}
            style={{
              backgroundColor: 'var(--ant-color-fill-secondary)',
              color: 'var(--ant-color-text-secondary)',
            }}
          />
        </Space>
      ),
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 8 }}>
          <Card
            size="small"
            style={{
              background: 'var(--ant-color-bg-container)',
              border: '1px solid var(--ant-color-border-secondary)',
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Typography.Text strong style={{ fontSize: 13 }}>
                {editingRuleId
                  ? t('portal.workScores.rules.editRule')
                  : t('portal.workScores.rules.addRule')}
              </Typography.Text>
              {editingRuleId ? (
                <Button size="small" type="link" onClick={handleCancelEdit}>
                  {t('portal.workScores.rules.cancelEdit')}
                </Button>
              ) : null}
            </div>
            <Form
              form={scaleForm}
              initialValues={{ status: 'ACTIVE' }}
              layout="vertical"
              onFinish={(values) => ruleMutation.mutate({ values, sourceType: 'PRODUCTION_SCALE' })}
            >
              <Row align="bottom" gutter={[16, 0]}>
                <Col sm={8} xs={24}>
                  <Form.Item
                    label={t('portal.workScores.rules.scaleDifficulty')}
                    name="scaleDifficultyLevel"
                    rules={[{ required: true }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      options={SCALE_DIFFICULTIES.map((value) => ({
                        value,
                        label: scaleDifficultyLabel(value),
                      }))}
                      placeholder={t('portal.workScores.rules.allDifficulties')}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col sm={5} xs={12}>
                  <Form.Item
                    label={t('portal.workScores.rules.points')}
                    name="points"
                    rules={[{ required: true }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      placeholder={t('portal.workScores.rules.points')}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col sm={5} xs={12}>
                  <Form.Item
                    label={t('portal.workScores.rules.status')}
                    name="status"
                    rules={[{ required: true }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      options={RULE_STATUSES.map((value) => ({
                        value,
                        label: statusLabel(value),
                      }))}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col sm={6} xs={24}>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      block
                      htmlType="submit"
                      icon={editingRuleId ? <CheckOutlined /> : <PlusOutlined />}
                      loading={ruleMutation.isPending}
                      type="primary"
                    >
                      {editingRuleId
                        ? t('portal.workScores.rules.update')
                        : t('portal.workScores.rules.save')}
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Typography.Text strong style={{ fontSize: 13 }}>
                {t('portal.workScores.rules.rulesList')} ({scaleRules.length})
              </Typography.Text>
            </div>
            <Table
              columns={scaleColumns}
              dataSource={scaleRules}
              loading={rules.isLoading}
              locale={{
                emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />,
              }}
              pagination={
                scaleRules.length > 5
                  ? { pageSize: 5, size: 'small', showSizeChanger: false }
                  : false
              }
              rowKey="id"
              size="small"
            />
          </div>
        </Space>
      ),
    },
  ]

  return (
    <Modal
      destroyOnHidden
      footer={null}
      open={open}
      title={
        <Space align="center" size={8}>
          <SettingOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <span>{t('portal.workScores.rules.title')}</span>
        </Space>
      }
      width={820}
      onCancel={() => {
        handleCancelEdit()
        onClose()
      }}
    >
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        style={{ marginTop: 4 }}
        onChange={handleTabChange}
      />
    </Modal>
  )
}
