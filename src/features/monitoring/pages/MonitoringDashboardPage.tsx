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

export const MonitoringDashboardPage = () => {
  const { t } = useTranslation()
  const statusLabel = (status?: string) => {
    const normalized = String(status ?? 'unknown').toLowerCase()
    return t(`portal.monitoring.statuses.${normalized}`, { defaultValue: String(status ?? '') })
  }
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
      setError(cause instanceof Error ? cause.message : t('portal.monitoring.healthCheckFailed'))
      setHealth(undefined)
    } finally {
      setLoading(false)
    }
  }, [canRead, t])

  const refreshLogs = useCallback(async () => {
    if (!canRead) return
    setLogsLoading(true)
    setLogsError(undefined)
    try {
      setLogs(await getSystemLogs({ process: logProcess, stream: logStream, lines: logLines }))
    } catch (cause) {
      setLogsError(cause instanceof Error ? cause.message : t('portal.monitoring.logsFailed'))
      setLogs(undefined)
    } finally {
      setLogsLoading(false)
    }
  }, [canRead, logLines, logProcess, logStream, t])

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
        <SectionCard title={t('portal.monitoring.healthCheckError')}>
          <Typography.Text type="danger">{error}</Typography.Text>
        </SectionCard>
      ) : null}

      <SectionCard title={t('portal.monitoring.infrastructure')}>
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
                    <Tag color={statusColor(String(value))}>{statusLabel(String(value))}</Tag>
                  </div>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      </SectionCard>

      <SectionCard title={t('portal.monitoring.realtimeSocket')}>
        <Row gutter={[24, 24]}>
          {[
            [t('portal.monitoring.status'), health?.realtime?.status ?? 'disabled'],
            [t('portal.monitoring.clients'), health?.realtime?.connectedClients ?? 0],
            [t('portal.monitoring.users'), health?.realtime?.authenticatedUsers ?? 0],
            [t('portal.monitoring.rooms'), health?.realtime?.rooms ?? 0],
            [t('portal.monitoring.authFailed'), health?.realtime?.authFailures ?? 0],
            [t('portal.monitoring.eventFailed'), health?.realtime?.eventFailures ?? 0],
          ].map(([label, value]) => (
            <Col xs={24} sm={12} md={8} lg={4} key={String(label)}>
              <Card size="small">
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {label}
                </Typography.Text>
                {label === t('portal.monitoring.status') ? (
                  <Tag color={statusColor(String(value))}>{statusLabel(String(value))}</Tag>
                ) : (
                  <Typography.Title level={4}>{value}</Typography.Title>
                )}
              </Card>
            </Col>
          ))}
        </Row>
        {health?.realtime?.lastErrorAt ? (
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            {t('portal.monitoring.lastError', {
              message: health.realtime.lastErrorMessage,
              time: health.realtime.lastErrorAt,
            })}
          </Typography.Text>
        ) : null}
      </SectionCard>

      <SectionCard title={t('portal.monitoring.runtime')}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="secondary">{t('portal.monitoring.uptime')}</Typography.Text>
              <Typography.Title level={4}>
                {t('portal.monitoring.seconds', { count: health?.uptimeSeconds ?? 0 })}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="secondary">{t('portal.monitoring.heapUsed')}</Typography.Text>
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

      <SectionCard
        title={t('portal.monitoring.moduleHealth', {
          healthy: healthyModules,
          total: totalModules,
        })}
      >
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
                      {statusLabel(module.status)}
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
      <SectionCard title={t('portal.monitoring.workers')}>
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
                  <Tag color={statusColor(worker.status)}>{statusLabel(worker.status)}</Tag>
                </Flex>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {worker.process === 'embedded-api'
                    ? t('portal.monitoring.embeddedApiProcess')
                    : t('portal.monitoring.separatePm2Process')}
                </Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      </SectionCard>

      <SectionCard title={t('portal.monitoring.queues')}>
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
                  <Tag color={statusColor(queue.status)}>{statusLabel(queue.status)}</Tag>
                </Flex>
                <div className={styles.queueCounts}>
                  {(['waiting', 'active', 'delayed', 'completed', 'failed', 'paused'] as const).map(
                    (key) => (
                      <div key={key}>
                        <Typography.Text type="secondary">
                          {t(`portal.monitoring.queueCounts.${key}`)}
                        </Typography.Text>
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
    <SectionCard title={t('portal.monitoring.serverLogs')}>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          aria-label={t('portal.monitoring.process')}
          style={{ width: 220 }}
          value={logProcess}
          options={[
            { label: t('portal.monitoring.backendApi'), value: 'lng-web-be' },
            { label: t('portal.monitoring.importWorkers'), value: 'lng-web-be-import-workers' },
            { label: t('portal.monitoring.devTunnel'), value: 'lng-web-be-dev-tunnel' },
          ]}
          onChange={setLogProcess}
        />
        <Select
          aria-label={t('portal.monitoring.stream')}
          style={{ width: 120 }}
          value={logStream}
          options={[
            { label: t('portal.monitoring.output'), value: 'out' },
            { label: t('portal.monitoring.error'), value: 'error' },
          ]}
          onChange={setLogStream}
        />
        <Select
          aria-label={t('portal.monitoring.lines')}
          style={{ width: 120 }}
          value={logLines}
          options={[100, 200, 500].map((value) => ({
            label: t('portal.monitoring.lineCount', { count: value }),
            value,
          }))}
          onChange={setLogLines}
        />
        <Button
          icon={<ReloadOutlined spin={logsLoading} />}
          loading={logsLoading}
          onClick={() => void refreshLogs()}
        >
          {t('portal.monitoring.refreshLogs')}
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
          {(logs?.content ?? []).join('\n') || t('portal.monitoring.noLogLines')}
        </pre>
      )}
    </SectionCard>
  )

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.monitoring.title')}
        description={t('portal.monitoring.description')}
        actions={
          <Space>
            {health?.generatedAt ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('portal.monitoring.updatedAt', {
                  time: new Date(health.generatedAt).toLocaleTimeString(),
                })}
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
            label={t('portal.monitoring.systemHealth')}
            value={statusLabel(error ? 'unreachable' : isHealthy ? 'operational' : 'degraded')}
            loading={loading}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            icon={<ClockCircleOutlined />}
            variant="info"
            label={t('portal.monitoring.healthApiLatency')}
            value={`${latencyMs} ms`}
            loading={loading}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            icon={<CloudServerOutlined />}
            variant="neutral"
            label={t('portal.monitoring.modules')}
            value={t('portal.monitoring.healthyModules', {
              healthy: healthyModules,
              total: totalModules,
            })}
            loading={loading}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            icon={<DatabaseOutlined />}
            variant={health?.infrastructure.mongo === 'CONNECTED' ? 'success' : 'danger'}
            label="MongoDB"
            value={statusLabel(health?.infrastructure.mongo)}
            loading={loading}
          />
        </Col>
      </Row>

      <UiTabs
        destroyOnHidden={false}
        items={[
          {
            key: 'health',
            label: <UiTabLabel>{t('portal.monitoring.health')}</UiTabLabel>,
            children: healthTab,
          },
          {
            key: 'workers',
            label: <UiTabLabel>{t('portal.monitoring.workersAndQueues')}</UiTabLabel>,
            children: workersTab,
          },
          {
            key: 'logs',
            label: <UiTabLabel>{t('portal.monitoring.logs')}</UiTabLabel>,
            children: logsTab,
          },
        ]}
      />
    </section>
  )
}

// export default MonitoringDashboardPage
