import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  HddOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Flex,
  Progress,
  Result,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'

import { hasAnyPermission } from '@/shared/auth/permissions'
import { MetricCard, PageHeader, SectionCard, UiTabLabel, UiTabs } from '@/shared/ui'

import {
  getSystemHealth,
  getSystemLogs,
  type SystemHealth,
  type SystemLogProcess,
  type SystemLogs,
  type SystemLogStream,
} from '../api/monitoringApi'
import styles from './MonitoringDashboardPage.module.scss'

const statusColor = (status?: string) => {
  if (status === 'ok' || status === 'running' || status === 'CONNECTED' || status === 'ENABLED')
    return 'success'
  if (status === 'external') return 'processing'
  if (status === 'disabled' || status === 'DISABLED') return 'default'
  return 'error'
}

export function MonitoringDashboardPage() {
  const { t } = useTranslation()
  const canRead = hasAnyPermission(['AUDIT:READ'], { globalOnly: true })
  const [health, setHealth] = useState<SystemHealth>()
  const [error, setError] = useState<string>()
  const [latencyMs, setLatencyMs] = useState(0)
  const [loading, setLoading] = useState(false)
  const [logProcess, setLogProcess] = useState<SystemLogProcess>('lng-web-be')
  const [logStream, setLogStream] = useState<SystemLogStream>('out')
  const [logLines, setLogLines] = useState(200)
  const [logs, setLogs] = useState<SystemLogs>()
  const [logsError, setLogsError] = useState<string>()
  const [logsLoading, setLogsLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!canRead) return
    const startedAt = performance.now()
    setLoading(true)
    setError(undefined)
    try {
      setHealth(await getSystemHealth())
      setLatencyMs(Math.round(performance.now() - startedAt))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'System health check failed')
      setHealth(undefined)
    } finally {
      setLoading(false)
    }
  }, [canRead])

  const refreshLogs = useCallback(async () => {
    if (!canRead) return
    setLogsLoading(true)
    setLogsError(undefined)
    try {
      setLogs(await getSystemLogs({ process: logProcess, stream: logStream, lines: logLines }))
    } catch (cause) {
      setLogsError(cause instanceof Error ? cause.message : 'System logs failed to load')
      setLogs(undefined)
    } finally {
      setLogsLoading(false)
    }
  }, [canRead, logLines, logProcess, logStream])

  useEffect(() => {
    if (!canRead) return undefined
    queueMicrotask(() => void refresh())
    const timer = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(timer)
  }, [canRead, refresh])
  useEffect(() => {
    queueMicrotask(() => void refreshLogs())
  }, [refreshLogs])

  const modules = health?.modules ?? []
  const queues = health?.queues ?? []
  const workers = health?.workers ?? []
  const healthyModules = modules.filter((module) => module.status === 'ok').length
  const totalModules = modules.length
  const isHealthy = health?.status === 'ok' && !error

  if (!canRead) return <Result status="403" title="403" />

  const healthTab = (
    <>
      {error ? (
        <SectionCard title="Health Check Error">
          <Typography.Text type="danger">{error}</Typography.Text>
        </SectionCard>
      ) : null}

      <SectionCard title="Infrastructure">
        <Row gutter={[24, 24]}>
          {[
            ['MongoDB', health?.infrastructure.mongo, <DatabaseOutlined key="mongo" />],
            ['Redis', health?.infrastructure.redis, <HddOutlined key="redis" />],
            ['Metrics', health?.infrastructure.metrics, <CloudServerOutlined key="metrics" />],
            ['Node', health?.nodeVersion, <CloudServerOutlined key="node" />],
          ].map(([label, value, icon]) => (
            <Col xs={24} sm={12} md={6} key={String(label)}>
              <Card size="small">
                <Flex align="center" gap={12}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                      {label}
                    </Typography.Text>
                    <Tag color={statusColor(String(value))}>{String(value ?? 'UNKNOWN')}</Tag>
                  </div>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      </SectionCard>

      <SectionCard title="Realtime Socket">
        <Row gutter={[24, 24]}>
          {[
            ['Status', health?.realtime?.status ?? 'disabled'],
            ['Clients', health?.realtime?.connectedClients ?? 0],
            ['Users', health?.realtime?.authenticatedUsers ?? 0],
            ['Rooms', health?.realtime?.rooms ?? 0],
            ['Auth failed', health?.realtime?.authFailures ?? 0],
            ['Event failed', health?.realtime?.eventFailures ?? 0],
          ].map(([label, value]) => (
            <Col xs={24} sm={12} md={8} lg={4} key={String(label)}>
              <Card size="small">
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {label}
                </Typography.Text>
                {label === 'Status' ? (
                  <Tag color={statusColor(String(value))}>{String(value).toUpperCase()}</Tag>
                ) : (
                  <Typography.Title level={4}>{value}</Typography.Title>
                )}
              </Card>
            </Col>
          ))}
        </Row>
        {health?.realtime?.lastErrorAt ? (
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            Last error: {health.realtime.lastErrorMessage} at {health.realtime.lastErrorAt}
          </Typography.Text>
        ) : null}
      </SectionCard>

      <SectionCard title="Runtime">
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="secondary">Uptime</Typography.Text>
              <Typography.Title level={4}>{health?.uptimeSeconds ?? 0}s</Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="secondary">Heap Used</Typography.Text>
              <Typography.Title level={4}>{health?.memory.heapUsedMb ?? 0} MB</Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="secondary">RSS</Typography.Text>
              <Typography.Title level={4}>{health?.memory.rssMb ?? 0} MB</Typography.Title>
            </Card>
          </Col>
        </Row>
      </SectionCard>

      <SectionCard title={`Module Health (${healthyModules}/${totalModules})`}>
        <Row gutter={[24, 24]}>
          {modules.map((module) => {
            const isOk = module.status === 'ok'
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={module.key}>
                <Card
                  size="small"
                  hoverable
                  className={styles.moduleCard}
                  style={{ borderColor: isOk ? 'var(--ant-color-border-secondary)' : '#ff4d4f' }}
                >
                  <Flex justify="space-between" align="start" style={{ marginBottom: 8 }}>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      {module.name}
                    </Typography.Text>
                    <Tag
                      color={isOk ? 'success' : 'error'}
                      icon={isOk ? <CheckCircleOutlined /> : <WarningOutlined />}
                    >
                      {module.status.toUpperCase()}
                    </Tag>
                  </Flex>
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 11, display: 'block', fontFamily: 'monospace' }}
                  >
                    {module.endpoint}
                  </Typography.Text>
                  <Progress
                    percent={isOk ? 100 : 0}
                    status={isOk ? 'success' : 'exception'}
                    showInfo={false}
                    strokeWidth={4}
                    style={{ marginTop: 12 }}
                  />
                </Card>
              </Col>
            )
          })}
        </Row>
      </SectionCard>
    </>
  )

  const workersTab = (
    <>
      <SectionCard title="Workers">
        <Row gutter={[24, 24]}>
          {workers.map((worker) => (
            <Col xs={24} sm={12} md={8} lg={6} key={worker.key}>
              <Card size="small">
                <Flex justify="space-between" align="start" gap={12}>
                  <div>
                    <Typography.Text strong>{worker.name}</Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 11, display: 'block', fontFamily: 'monospace' }}
                    >
                      {worker.queueName ?? worker.script ?? worker.process}
                    </Typography.Text>
                  </div>
                  <Tag color={statusColor(worker.status)}>{worker.status.toUpperCase()}</Tag>
                </Flex>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {worker.process === 'embedded-api'
                    ? 'Embedded in API process'
                    : 'Separate PM2 process'}
                </Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      </SectionCard>

      <SectionCard title="Queues">
        <Row gutter={[24, 24]}>
          {queues.map((queue) => (
            <Col xs={24} lg={12} key={queue.key}>
              <Card size="small">
                <Flex justify="space-between" align="start" gap={12}>
                  <div>
                    <Typography.Text strong>{queue.name}</Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 11, display: 'block', fontFamily: 'monospace' }}
                    >
                      {queue.queueName}
                    </Typography.Text>
                  </div>
                  <Tag color={statusColor(queue.status)}>{queue.status.toUpperCase()}</Tag>
                </Flex>
                <div className={styles.queueCounts}>
                  {(['waiting', 'active', 'delayed', 'completed', 'failed', 'paused'] as const).map(
                    (key) => (
                      <div key={key}>
                        <Typography.Text type="secondary">{key}</Typography.Text>
                        <Typography.Text strong>{queue.counts[key]}</Typography.Text>
                      </div>
                    ),
                  )}
                </div>
                {queue.error ? (
                  <Typography.Text type="danger">{queue.error}</Typography.Text>
                ) : null}
              </Card>
            </Col>
          ))}
        </Row>
      </SectionCard>
    </>
  )

  const logsTab = (
    <SectionCard title="Server Logs">
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          aria-label="Process"
          style={{ width: 220 }}
          value={logProcess}
          options={[
            { label: 'Backend API', value: 'lng-web-be' },
            { label: 'Import Workers', value: 'lng-web-be-import-workers' },
            { label: 'Dev Tunnel', value: 'lng-web-be-dev-tunnel' },
          ]}
          onChange={setLogProcess}
        />
        <Select
          aria-label="Stream"
          style={{ width: 120 }}
          value={logStream}
          options={[
            { label: 'Output', value: 'out' },
            { label: 'Error', value: 'error' },
          ]}
          onChange={setLogStream}
        />
        <Select
          aria-label="Lines"
          style={{ width: 120 }}
          value={logLines}
          options={[100, 200, 500].map((value) => ({ label: `${value} lines`, value }))}
          onChange={setLogLines}
        />
        <Button
          icon={<ReloadOutlined spin={logsLoading} />}
          loading={logsLoading}
          onClick={() => void refreshLogs()}
        >
          Refresh Logs
        </Button>
        {logs?.filename ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {logs.filename}
          </Typography.Text>
        ) : null}
      </Space>
      {logsError ? (
        <Typography.Text type="danger">{logsError}</Typography.Text>
      ) : (
        <pre className={styles.logViewer}>
          {(logs?.content ?? []).join('\n') || 'No log lines found.'}
        </pre>
      )}
    </SectionCard>
  )

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.monitoring.title', { defaultValue: 'System Monitoring & Observability' })}
        description={t('portal.monitoring.description', {
          defaultValue: 'Live backend health, infrastructure status, and module readiness.',
        })}
        actions={
          <Space>
            {health?.generatedAt ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Updated at {new Date(health.generatedAt).toLocaleTimeString()}
              </Typography.Text>
            ) : null}
          </Space>
        }
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            icon={<SafetyCertificateOutlined />}
            variant={isHealthy ? 'success' : 'danger'}
            label="System Health"
            value={error ? 'UNREACHABLE' : isHealthy ? 'OPERATIONAL' : 'DEGRADED'}
            loading={loading}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            icon={<ClockCircleOutlined />}
            variant="info"
            label="Health API Latency"
            value={`${latencyMs} ms`}
            loading={loading}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            icon={<CloudServerOutlined />}
            variant="neutral"
            label="Modules"
            value={`${healthyModules} / ${totalModules} Healthy`}
            loading={loading}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            icon={<DatabaseOutlined />}
            variant={health?.infrastructure.mongo === 'CONNECTED' ? 'success' : 'danger'}
            label="MongoDB"
            value={health?.infrastructure.mongo ?? 'UNKNOWN'}
            loading={loading}
          />
        </Col>
      </Row>

      <UiTabs
        destroyOnHidden={false}
        items={[
          {
            key: 'health',
            label: <UiTabLabel>Health</UiTabLabel>,
            children: healthTab,
          },
          {
            key: 'workers',
            label: <UiTabLabel>Workers & Queues</UiTabLabel>,
            children: workersTab,
          },
          {
            key: 'logs',
            label: <UiTabLabel>Logs</UiTabLabel>,
            children: logsTab,
          },
        ]}
      />
    </section>
  )
}

export default MonitoringDashboardPage
