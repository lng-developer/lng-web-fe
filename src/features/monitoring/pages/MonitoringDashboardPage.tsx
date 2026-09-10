import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ClockCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  HddOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
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
  Table,
  type TableColumnsType,
  Typography,
} from 'antd'

import { hasAnyPermission } from '@/shared/auth/permissions'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { MetricCard, PageHeader, SectionCard, StatusTag, UiTabLabel, UiTabs } from '@/shared/ui'

import {
  type MongoIndexUsageSnapshot,
  type SystemLogProcess,
  type SystemLogStream,
} from '../api/monitoringApi'
import { useMongoIndexSnapshotsQuery, useSystemHealthQuery, useSystemLogsQuery } from '../hooks'
import { getIndexReview } from '../utils/indexUsageReview'
import styles from './MonitoringDashboardPage.module.scss'

const statusTone = (status?: string) => {
  if (status === 'ok' || status === 'running' || status === 'CONNECTED' || status === 'ENABLED')
    return 'operational' as const
  if (status === 'external') return 'processing' as const
  if (status === 'disabled' || status === 'DISABLED') return 'draft' as const
  return 'critical' as const
}

type IndexRow = MongoIndexUsageSnapshot['collections'][number]['indexes'][number] & {
  collection: string
  usageAvailable: boolean
  classification: string
  idleDays: number
  candidate: boolean
}

function formatBytes(value = 0) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

export const MonitoringDashboardPage = () => {
  const { t } = useTranslation()
  const statusLabel = useCallback(
    (status?: string) => {
      const normalized = String(status ?? 'unknown').toLowerCase()
      return t(`portal.monitoring.statuses.${normalized}`, { defaultValue: String(status ?? '') })
    },
    [t],
  )
  const canRead = hasAnyPermission(['AUDIT:READ'], { globalOnly: true })
  const [logProcess, setLogProcess] = useState<SystemLogProcess>('lng-web-be')
  const [logStream, setLogStream] = useState<SystemLogStream>('out')
  const [logLines, setLogLines] = useState(200)
  const [indexSnapshotDate, setIndexSnapshotDate] = useState<string>()
  const [indexFilter, setIndexFilter] = useState<'ALL' | 'CANDIDATES'>('ALL')

  const {
    data: healthData,
    error: healthQueryError,
    isLoading: healthLoading,
    isFetching: healthFetching,
    refetch: refetchHealth,
  } = useSystemHealthQuery(canRead)
  const health = healthData?.data
  const latencyMs = healthData?.latencyMs ?? 0
  const loading = healthLoading || healthFetching
  const error = healthQueryError
    ? healthQueryError instanceof Error
      ? healthQueryError.message
      : t('portal.monitoring.healthCheckFailed')
    : undefined

  const logParams = useMemo(
    () => ({ process: logProcess, stream: logStream, lines: logLines }),
    [logProcess, logStream, logLines],
  )
  const {
    data: logs,
    error: logsQueryError,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useSystemLogsQuery(logParams, canRead)
  const logsError = logsQueryError
    ? logsQueryError instanceof Error
      ? logsQueryError.message
      : t('portal.monitoring.logsFailed')
    : undefined

  const {
    data: snapshotsData,
    error: snapshotsQueryError,
    isLoading: indexLoading,
    refetch: refetchIndexSnapshots,
  } = useMongoIndexSnapshotsQuery(30, canRead)
  const indexSnapshots = useMemo(() => snapshotsData ?? [], [snapshotsData])
  const indexError = snapshotsQueryError
    ? snapshotsQueryError instanceof Error
      ? snapshotsQueryError.message
      : t('portal.monitoring.indexes.loadFailed')
    : undefined

  const refresh = useCallback(async () => {
    if (!canRead) return
    await refetchHealth()
  }, [canRead, refetchHealth])

  const refreshLogs = useCallback(async () => {
    if (!canRead) return
    await refetchLogs()
  }, [canRead, refetchLogs])

  const refreshIndexSnapshots = useCallback(async () => {
    if (!canRead) return
    await refetchIndexSnapshots()
  }, [canRead, refetchIndexSnapshots])

  const modules = useMemo(() => health?.modules ?? [], [health?.modules])
  const queues = useMemo(() => health?.queues ?? [], [health?.queues])
  const workers = useMemo(() => health?.workers ?? [], [health?.workers])
  const healthyModules = useMemo(
    () => modules.filter((module) => module.status === 'ok').length,
    [modules],
  )
  const totalModules = modules.length
  const isHealthy = health?.status === 'ok' && !error
  const effectiveSnapshotDate = useMemo(() => {
    if (indexSnapshotDate && indexSnapshots.some((s) => s.capturedOn === indexSnapshotDate)) {
      return indexSnapshotDate
    }
    return indexSnapshots[0]?.capturedOn
  }, [indexSnapshotDate, indexSnapshots])

  const selectedIndexSnapshot = useMemo(
    () => indexSnapshots.find((snapshot) => snapshot.capturedOn === effectiveSnapshotDate),
    [indexSnapshots, effectiveSnapshotDate],
  )
  const allIndexRows: IndexRow[] = useMemo(
    () =>
      (selectedIndexSnapshot?.collections ?? []).flatMap((collection) =>
        collection.indexes.map((index) => ({
          ...index,
          collection: collection.name,
          usageAvailable: collection.usageAvailable,
          ...getIndexReview(index, collection.name, indexSnapshots),
        })),
      ),
    [selectedIndexSnapshot, indexSnapshots],
  )
  const indexRows = useMemo(
    () =>
      indexFilter === 'CANDIDATES'
        ? allIndexRows.filter(({ candidate }) => candidate)
        : allIndexRows,
    [allIndexRows, indexFilter],
  )
  const indexColumns = useMemo<TableColumnsType<IndexRow>>(
    () => [
      { title: t('portal.monitoring.indexes.columns.collection'), dataIndex: 'collection' },
      { title: t('portal.monitoring.indexes.columns.index'), dataIndex: 'name' },
      {
        title: t('portal.monitoring.indexes.columns.key'),
        dataIndex: 'key',
        render: (key) => <Typography.Text code>{JSON.stringify(key)}</Typography.Text>,
      },
      {
        title: t('portal.monitoring.indexes.columns.operations'),
        dataIndex: 'operations',
        align: 'right',
        render: (operations, row) =>
          row.usageAvailable && operations !== null ? Number(operations).toLocaleString() : '—',
      },
      {
        title: t('portal.monitoring.indexes.columns.idleDays'),
        dataIndex: 'idleDays',
        align: 'right',
        render: (idleDays, row) =>
          row.usageAvailable
            ? t('portal.monitoring.indexes.idleDaysValue', { count: idleDays })
            : '—',
      },
      {
        title: t('portal.monitoring.indexes.columns.decision'),
        dataIndex: 'classification',
        render: (classification) => (
          <StatusTag status={classification === 'KEEP' ? 'operational' : 'warning'}>
            {classification}
          </StatusTag>
        ),
      },
    ],
    [t],
  )

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
                    <StatusTag status={statusTone(String(value))}>
                      {statusLabel(String(value))}
                    </StatusTag>
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
                  <StatusTag status={statusTone(String(value))}>
                    {statusLabel(String(value))}
                  </StatusTag>
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
                    <StatusTag status={isOk ? 'operational' : 'critical'}>
                      {statusLabel(module.status)}
                    </StatusTag>
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
                  <StatusTag status={statusTone(worker.status)}>
                    {statusLabel(worker.status)}
                  </StatusTag>
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
                  <StatusTag status={statusTone(queue.status)}>
                    {statusLabel(queue.status)}
                  </StatusTag>
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

  const indexesTab = (
    <>
      <SectionCard
        title={t('portal.monitoring.indexes.title')}
        extra={
          <Space wrap>
            <Select
              aria-label={t('portal.monitoring.indexes.snapshotDate')}
              className="min-w-40"
              loading={indexLoading}
              value={effectiveSnapshotDate}
              options={indexSnapshots.map((snapshot) => ({
                label: snapshot.capturedOn,
                value: snapshot.capturedOn,
              }))}
              onChange={setIndexSnapshotDate}
            />
            <Select
              aria-label={t('portal.monitoring.indexes.filter')}
              className="min-w-40"
              value={indexFilter}
              options={[
                { label: t('portal.monitoring.indexes.allIndexes'), value: 'ALL' },
                { label: t('portal.monitoring.indexes.reviewCandidates'), value: 'CANDIDATES' },
              ]}
              onChange={setIndexFilter}
            />
            <Button
              icon={<ReloadOutlined spin={indexLoading} />}
              loading={indexLoading}
              onClick={() => void refreshIndexSnapshots()}
            >
              {t('portal.monitoring.indexes.refresh')}
            </Button>
          </Space>
        }
      >
        {indexError ? <Typography.Text type="danger">{indexError}</Typography.Text> : null}
        {!indexError && !selectedIndexSnapshot ? (
          <Result status="info" title={t('portal.monitoring.indexes.empty')} />
        ) : null}
        {selectedIndexSnapshot ? (
          <>
            <Row gutter={[24, 24]} className="mb-6">
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  icon={<DatabaseOutlined />}
                  variant="info"
                  label={t('portal.monitoring.indexes.database')}
                  value={selectedIndexSnapshot.database}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  icon={<HddOutlined />}
                  variant="neutral"
                  label={t('portal.monitoring.indexes.indexes')}
                  value={selectedIndexSnapshot.totals.indexes.toLocaleString()}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  icon={<DatabaseOutlined />}
                  variant="neutral"
                  label={t('portal.monitoring.indexes.indexSize')}
                  value={formatBytes(selectedIndexSnapshot.totals.indexBytes)}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  icon={<ClockCircleOutlined />}
                  variant="neutral"
                  label={t('portal.monitoring.indexes.capturedAt')}
                  value={new Date(selectedIndexSnapshot.capturedAt).toLocaleString()}
                />
              </Col>
            </Row>
            <Table<IndexRow>
              rowKey={(row) => `${row.collection}:${row.name}`}
              columns={indexColumns}
              dataSource={indexRows}
              loading={indexLoading}
              pagination={{ pageSize: DEFAULT_PAGE_SIZE, showSizeChanger: false }}
              scroll={{ x: 920 }}
              size="small"
            />
          </>
        ) : null}
      </SectionCard>
    </>
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
            <Button
              icon={<ReloadOutlined spin={loading} />}
              loading={loading}
              onClick={() => void refresh()}
            >
              {t('portal.monitoring.indexes.refresh')}
            </Button>
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
          {
            key: 'mongo-indexes',
            label: <UiTabLabel>{t('portal.monitoring.indexes.tab')}</UiTabLabel>,
            children: indexesTab,
          },
        ]}
      />
    </section>
  )
}

// export default MonitoringDashboardPage
